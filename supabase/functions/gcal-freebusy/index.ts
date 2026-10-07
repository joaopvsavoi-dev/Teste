// Lê o free/busy da agenda principal (somente leitura) para a proposta de blocos não gerar conflitos (§11.1).
import { accessToken, admin, cors, gcal, json, usuarioDaRequisicao } from '../_shared/google.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const userId = await usuarioDaRequisicao(req)
  if (!userId) return json({ erro: 'não autenticado' }, 401)
  const { inicio, fim } = await req.json()
  try {
    const token = await accessToken(admin(), userId)
    const r = await gcal(token, '/freeBusy', {
      method: 'POST',
      body: JSON.stringify({ timeMin: inicio, timeMax: fim, timeZone: 'America/Sao_Paulo', items: [{ id: 'primary' }] }),
    })
    if (!r.ok) return json({ erro: JSON.stringify(r.body) }, 502)
    const busy = (r.body.calendars?.primary?.busy ?? []) as { start: string; end: string }[]
    return json({ ocupados: busy.map((b) => ({ inicio: b.start, fim: b.end })) })
  } catch (e) {
    return json({ erro: (e as Error).message }, 500)
  }
})
