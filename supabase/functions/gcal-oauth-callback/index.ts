// Recebe o refresh token do Google (session.provider_refresh_token) logo após o login e o guarda no Vault.
// Em seguida cria a agenda "Norte" e registra o webhook (§11.2, passos 1 e 5).
import { accessToken, admin, assistir, cors, garantirAgenda, json, usuarioDaRequisicao } from '../_shared/google.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const userId = await usuarioDaRequisicao(req)
  if (!userId) return json({ erro: 'não autenticado' }, 401)
  const { refresh_token } = await req.json()
  if (!refresh_token) return json({ erro: 'refresh_token ausente' }, 400)
  const sb = admin()
  const { error } = await sb.rpc('norte_salvar_refresh_token', { p_user: userId, p_token: refresh_token })
  if (error) return json({ erro: error.message }, 500)
  try {
    const token = await accessToken(sb, userId)
    const calendarId = await garantirAgenda(sb, userId, token)
    await assistir(sb, userId, token, calendarId)
    return json({ ok: true, calendarId })
  } catch (e) {
    return json({ erro: (e as Error).message }, 500)
  }
})
