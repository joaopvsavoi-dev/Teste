// Recebe as notificações push do Google (events.watch) e dispara o gcal-sync do usuário.
// Publicar com --no-verify-jwt: o Google não envia JWT. O canal é validado pelo channel_id salvo.
import { admin, json } from '../_shared/google.ts'

Deno.serve(async (req) => {
  const channelId = req.headers.get('X-Goog-Channel-ID')
  const userId = req.headers.get('X-Goog-Channel-Token')
  const estado = req.headers.get('X-Goog-Resource-State')
  if (!channelId || !userId) return json({ erro: 'cabeçalhos ausentes' }, 400)
  const sb = admin()
  const { data } = await sb.from('gcal_sync_estado').select('user_id').eq('user_id', userId).eq('channel_id', channelId).maybeSingle()
  if (!data) return json({ ok: false }, 200) // canal antigo/desconhecido: ignora
  if (estado === 'sync') return json({ ok: true }) // mensagem inicial do canal
  const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/gcal-sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
  return json({ ok: r.ok })
})
