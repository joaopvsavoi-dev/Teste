// Utilitários compartilhados pelas Edge Functions do Google Agenda (§11).
// Variáveis de ambiente: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

export function admin(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
}

/** Usuário dono do JWT da requisição (chamadas feitas pelo app). */
export async function usuarioDaRequisicao(req: Request): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data } = await admin().auth.getUser(token)
  return data.user?.id ?? null
}

/** Chamada interna (pg_cron) autenticada com a service role key. */
export function ehServiceRole(req: Request): boolean {
  return req.headers.get('Authorization') === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
}

export async function accessToken(sb: SupabaseClient, userId: string): Promise<string> {
  const { data: refresh, error } = await sb.rpc('norte_ler_refresh_token', { p_user: userId })
  if (error || !refresh) throw new Error('Google não conectado: faça login com Google novamente.')
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: refresh as string,
      grant_type: 'refresh_token',
    }),
  })
  const j = await r.json()
  if (!r.ok) throw new Error(`Falha ao renovar o token do Google: ${j.error_description ?? j.error}`)
  return j.access_token as string
}

export async function gcal(token: string, path: string, init: RequestInit = {}) {
  const r = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  const body = r.status === 204 ? null : await r.json().catch(() => null)
  return { ok: r.ok, status: r.status, body }
}

/** Garante a agenda secundária "Norte" e devolve seu id. */
export async function garantirAgenda(sb: SupabaseClient, userId: string, token: string): Promise<string> {
  const { data: est } = await sb.from('gcal_sync_estado').select('calendar_id').eq('user_id', userId).maybeSingle()
  if (est?.calendar_id) return est.calendar_id
  const r = await gcal(token, '/calendars', { method: 'POST', body: JSON.stringify({ summary: 'Norte', timeZone: 'America/Sao_Paulo' }) })
  if (!r.ok) throw new Error(`Não foi possível criar a agenda Norte: ${JSON.stringify(r.body)}`)
  const id = r.body.id as string
  await sb.from('gcal_sync_estado').upsert({ user_id: userId, calendar_id: id })
  await sb.from('configuracoes').upsert({ user_id: userId, gcal_calendar_id: id }, { onConflict: 'user_id' })
  return id
}

/** Registra (ou renova) o canal de notificações push da agenda Norte. */
export async function assistir(sb: SupabaseClient, userId: string, token: string, calendarId: string) {
  const { data: est } = await sb.from('gcal_sync_estado').select('channel_id, resource_id').eq('user_id', userId).maybeSingle()
  if (est?.channel_id && est.resource_id) {
    await gcal(token, '/channels/stop', { method: 'POST', body: JSON.stringify({ id: est.channel_id, resourceId: est.resource_id }) })
  }
  const channelId = crypto.randomUUID()
  const r = await gcal(token, `/calendars/${encodeURIComponent(calendarId)}/events/watch`, {
    method: 'POST',
    body: JSON.stringify({
      id: channelId,
      type: 'web_hook',
      address: `${Deno.env.get('SUPABASE_URL')}/functions/v1/gcal-webhook`,
      token: userId,
    }),
  })
  if (!r.ok) throw new Error(`events.watch falhou: ${JSON.stringify(r.body)}`)
  await sb
    .from('gcal_sync_estado')
    .update({ channel_id: channelId, resource_id: r.body.resourceId, channel_expira_em: new Date(Number(r.body.expiration)).toISOString() })
    .eq('user_id', userId)
}
