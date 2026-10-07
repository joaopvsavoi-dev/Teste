// Operações de domínio que envolvem mais de uma tabela ou regras do §7.
import { checkinsDaSemana } from './calc'
import { inicioSemana } from './dates'
import { db, ErroRegra, supabase } from './db'
import { parsePlanoBiblia, parsePlanoSemanal } from './planos'
import type { CheckinStatus, PlanoItem, PlanoLeitura } from './types'

export async function registrarCheckin(
  habitoId: string,
  data: string,
  status: CheckinStatus,
  extra: { valor?: number | null; nota?: string | null } = {},
) {
  if (status === 'dispensado') {
    if (!extra.nota?.trim()) throw new ErroRegra('Dispensar exige uma nota (ex.: viagem, doença).')
    const checkins = await db.list('checkins')
    const outros = checkinsDaSemana(checkins, habitoId, inicioSemana(data)).filter((c) => c.status === 'dispensado' && c.data !== data)
    if (outros.length >= 1) throw new ErroRegra('Limite de 1 dispensa por hábito por semana.')
  }
  await db.upsert('checkins', { habito_id: habitoId, data, status, valor: extra.valor ?? null, nota: extra.nota ?? null }, [
    'habito_id',
    'data',
  ])
}

export async function limparCheckin(habitoId: string, data: string) {
  const c = (await db.list('checkins')).find((x) => x.habito_id === habitoId && x.data === data)
  if (c) await db.remove('checkins', c.id)
}

/** Conclui um item do plano e marca o check-in do hábito vinculado (§4.2 / plano-biblia.md). */
export async function concluirItemPlano(item: PlanoItem, plano: PlanoLeitura, data: string, resposta?: string) {
  await db.update('plano_itens', item.id, { concluido_em: data, ...(resposta !== undefined ? { resposta_pergunta: resposta } : {}) })
  if (plano.habito_id) {
    const existente = (await db.list('checkins')).find((c) => c.habito_id === plano.habito_id && c.data === data)
    if (!existente || existente.status === 'falhou') await registrarCheckin(plano.habito_id, data, 'feito')
  }
}

export async function desfazerItemPlano(item: PlanoItem) {
  await db.update('plano_itens', item.id, { concluido_em: null })
}

export async function importarPlano(opts: {
  titulo: string
  tipo: 'capitulos' | 'semanal'
  md: string
  area_id: string | null
  habito_id: string | null
  inicio?: string | null
}): Promise<{ id: string; n: number }> {
  const itens = opts.tipo === 'capitulos' ? parsePlanoBiblia(opts.md) : parsePlanoSemanal(opts.md)
  if (!itens.length) throw new ErroRegra('Nenhum item encontrado no Markdown. Confira o formato (veja a ajuda na tela).')
  const [plano] = await db.insert('planos_leitura', [
    {
      titulo: opts.titulo,
      tipo: opts.tipo,
      area_id: opts.area_id,
      habito_id: opts.habito_id,
      inicio: opts.inicio ?? null,
      fonte_md: opts.md,
    },
  ])
  await db.insert(
    'plano_itens',
    itens.map((i) => ({ ...i, plano_id: plano.id, concluido_em: null, resposta_pergunta: null })),
  )
  return { id: plano.id, n: itens.length }
}

/** Para planos semanais: marca como concluídas as semanas anteriores à semana atual informada. */
export async function definirSemanaAtual(planoId: string, semana: number, data: string) {
  const itens = (await db.list('plano_itens')).filter((i) => i.plano_id === planoId)
  for (const i of itens) {
    const deveConcluir = (i.semana ?? i.ordem) < semana
    if (deveConcluir && !i.concluido_em) await db.update('plano_itens', i.id, { concluido_em: data })
    if (!deveConcluir && i.concluido_em) await db.update('plano_itens', i.id, { concluido_em: null })
  }
}

export async function excluirPlano(planoId: string) {
  const itens = (await db.list('plano_itens')).filter((i) => i.plano_id === planoId)
  if (!supabase) for (const i of itens) await db.remove('plano_itens', i.id) // no Supabase, o cascade resolve
  await db.remove('planos_leitura', planoId)
}

/** Próximo item pendente de um plano (plano sequencial, sem datas — P2). */
export function proximoItem(itens: PlanoItem[], planoId: string): PlanoItem | undefined {
  return itens.filter((i) => i.plano_id === planoId && !i.concluido_em).sort((a, b) => a.ordem - b.ordem)[0]
}

// ---------- Google Agenda (Edge Functions, §11) ----------

export async function sincronizarAgenda(): Promise<string | null> {
  if (!supabase) return null
  const push = await supabase.functions.invoke('gcal-push-blocks', { body: {} })
  if (push.error) return `Erro ao enviar blocos: ${push.error.message}`
  const pull = await supabase.functions.invoke('gcal-sync', { body: {} })
  if (pull.error) return `Erro ao receber mudanças: ${pull.error.message}`
  return null
}

export async function horariosOcupados(inicio: string, fim: string): Promise<{ inicio: string; fim: string }[]> {
  if (!supabase) return []
  const r = await supabase.functions.invoke('gcal-freebusy', { body: { inicio, fim } })
  if (r.error) return []
  return (r.data?.ocupados ?? []) as { inicio: string; fim: string }[]
}
