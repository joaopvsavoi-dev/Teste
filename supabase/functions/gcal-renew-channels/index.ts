// Renova os canais de webhook que vencem nas próximas 48 h (pg_cron, diário) — §11.2 passo 6.
import { accessToken, admin, assistir, ehServiceRole, json } from '../_shared/google.ts'

Deno.serve(async (req) => {
  if (!ehServiceRole(req)) return json({ erro: 'proibido' }, 403)
  const sb = admin()
  const limite = new Date(Date.now() + 48 * 3600e3).toISOString()
  const { data } = await sb
    .from('gcal_sync_estado')
    .select('user_id, calendar_id, channel_expira_em')
    .neq('calendar_id', '')
    .or(`channel_expira_em.is.null,channel_expira_em.lt.${limite}`)
  const res: Record<string, string> = {}
  for (const e of data ?? []) {
    try {
      await assistir(sb, e.user_id, await accessToken(sb, e.user_id), e.calendar_id)
      res[e.user_id] = 'renovado'
    } catch (err) {
      res[e.user_id] = `erro: ${(err as Error).message}`
    }
  }
  return json({ ok: true, res })
})
