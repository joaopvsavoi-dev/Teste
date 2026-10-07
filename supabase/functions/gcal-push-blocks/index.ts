// App → Google: envia os blocos com sync_status = 'pendente' (criar, editar ou excluir) — §11.2 passo 4.
import { accessToken, admin, cors, garantirAgenda, gcal, json, usuarioDaRequisicao } from '../_shared/google.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const userId = await usuarioDaRequisicao(req)
  if (!userId) return json({ erro: 'não autenticado' }, 401)
  const sb = admin()
  try {
    const token = await accessToken(sb, userId)
    const cal = encodeURIComponent(await garantirAgenda(sb, userId, token))
    const { data: blocos } = await sb.from('blocos').select('*').eq('user_id', userId).eq('sync_status', 'pendente')
    let enviados = 0
    for (const b of blocos ?? []) {
      let r
      if (b.deleted_at) {
        r = b.gcal_event_id ? await gcal(token, `/calendars/${cal}/events/${b.gcal_event_id}`, { method: 'DELETE' }) : { ok: true, status: 204, body: null }
        if (r.ok || r.status === 404 || r.status === 410) {
          await sb.from('blocos').update({ sync_status: 'sincronizado' }).eq('id', b.id)
          enviados++
        } else await sb.from('blocos').update({ sync_status: 'erro' }).eq('id', b.id)
        continue
      }
      const evento = {
        summary: b.titulo,
        start: { dateTime: b.inicio, timeZone: 'America/Sao_Paulo' },
        end: { dateTime: b.fim, timeZone: 'America/Sao_Paulo' },
        extendedProperties: { private: { norte_bloco_id: b.id } },
      }
      r = b.gcal_event_id
        ? await gcal(token, `/calendars/${cal}/events/${b.gcal_event_id}`, { method: 'PATCH', body: JSON.stringify(evento) })
        : await gcal(token, `/calendars/${cal}/events`, { method: 'POST', body: JSON.stringify(evento) })
      if (r.ok) {
        await sb
          .from('blocos')
          .update({ gcal_event_id: r.body.id, gcal_etag: r.body.etag, gcal_updated: r.body.updated, sync_status: 'sincronizado' })
          .eq('id', b.id)
        enviados++
      } else {
        console.error('push falhou', b.id, r.status, JSON.stringify(r.body))
        await sb.from('blocos').update({ sync_status: 'erro' }).eq('id', b.id)
      }
    }
    return json({ ok: true, enviados })
  } catch (e) {
    return json({ erro: (e as Error).message }, 500)
  }
})
