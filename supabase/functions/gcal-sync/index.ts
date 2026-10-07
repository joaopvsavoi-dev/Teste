// Google → App: sincronização incremental com syncToken (§11.2 passo 5, §11.3).
// Chamada pelo app (JWT), pelo gcal-webhook ou pelo pg_cron a cada 15 min ({"todos": true}, service role).
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { accessToken, admin, cors, ehServiceRole, garantirAgenda, gcal, json, usuarioDaRequisicao } from '../_shared/google.ts'

export async function sincronizar(sb: SupabaseClient, userId: string) {
  const token = await accessToken(sb, userId)
  const calendarId = await garantirAgenda(sb, userId, token)
  const cal = encodeURIComponent(calendarId)
  const { data: est } = await sb.from('gcal_sync_estado').select('sync_token').eq('user_id', userId).maybeSingle()
  let syncToken: string | null = est?.sync_token ?? null
  let pageToken: string | null = null
  let aplicados = 0

  for (;;) {
    const qs = new URLSearchParams({ maxResults: '250', singleEvents: 'true', showDeleted: 'true' })
    if (pageToken) qs.set('pageToken', pageToken)
    else if (syncToken) qs.set('syncToken', syncToken)
    else qs.set('timeMin', new Date(Date.now() - 30 * 864e5).toISOString()) // sync completo: últimos 30 dias em diante
    const r = await gcal(token, `/calendars/${cal}/events?${qs}`)
    if (r.status === 410) {
      // syncToken expirado → sincronização completa
      syncToken = null
      pageToken = null
      continue
    }
    if (!r.ok) throw new Error(`events.list falhou: ${JSON.stringify(r.body)}`)
    for (const ev of r.body.items ?? []) aplicados += await aplicarEvento(sb, userId, ev)
    if (r.body.nextPageToken) {
      pageToken = r.body.nextPageToken
      continue
    }
    syncToken = r.body.nextSyncToken
    break
  }
  await sb.from('gcal_sync_estado').update({ sync_token: syncToken, ultimo_sync: new Date().toISOString() }).eq('user_id', userId)
  return aplicados
}

// deno-lint-ignore no-explicit-any
async function aplicarEvento(sb: SupabaseClient, userId: string, ev: any): Promise<number> {
  const blocoId = ev.extendedProperties?.private?.norte_bloco_id
  const q = sb.from('blocos').select('*').eq('user_id', userId)
  const { data: bloco } = blocoId ? await q.eq('id', blocoId).maybeSingle() : await q.eq('gcal_event_id', ev.id).maybeSingle()

  // Eco: é a mesma versão que o app enviou
  if (bloco && bloco.gcal_etag === ev.etag) return 0

  if (ev.status === 'cancelled') {
    if (bloco && !bloco.deleted_at) {
      await sb.from('blocos').update({ deleted_at: new Date().toISOString(), sync_status: 'sincronizado', gcal_etag: ev.etag }).eq('id', bloco.id)
      return 1
    }
    return 0
  }
  const inicio = ev.start?.dateTime
  const fim = ev.end?.dateTime
  if (!inicio || !fim) return 0 // eventos de dia inteiro não viram blocos

  const dados = { titulo: ev.summary ?? '(sem título)', inicio, fim, gcal_event_id: ev.id, gcal_etag: ev.etag, gcal_updated: ev.updated }
  if (!bloco) {
    await sb.from('blocos').insert({ ...dados, user_id: userId, origem: 'google', sync_status: 'sincronizado' })
    return 1
  }
  // Conflito: alterado no app (pendente) e no Google → vence o updated mais recente (last-write-wins)
  if (bloco.sync_status === 'pendente' && new Date(bloco.updated_at) > new Date(ev.updated)) {
    console.log('conflito: versão do Google descartada', ev.id, ev.updated)
    return 0
  }
  if (bloco.sync_status === 'pendente') console.log('conflito: versão do app descartada', bloco.id, bloco.updated_at)
  await sb.from('blocos').update({ ...dados, sync_status: 'sincronizado', deleted_at: null }).eq('id', bloco.id)
  return 1
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const sb = admin()
  const body = await req.json().catch(() => ({}))
  try {
    if (ehServiceRole(req)) {
      const ids: string[] = body.user_id
        ? [body.user_id]
        : ((await sb.from('gcal_sync_estado').select('user_id').neq('calendar_id', '')).data ?? []).map((r) => r.user_id)
      const res: Record<string, unknown> = {}
      for (const id of ids) res[id] = await sincronizar(sb, id).catch((e) => `erro: ${e.message}`)
      return json({ ok: true, res })
    }
    const userId = await usuarioDaRequisicao(req)
    if (!userId) return json({ erro: 'não autenticado' }, 401)
    return json({ ok: true, aplicados: await sincronizar(sb, userId) })
  } catch (e) {
    return json({ erro: (e as Error).message }, 500)
  }
})
