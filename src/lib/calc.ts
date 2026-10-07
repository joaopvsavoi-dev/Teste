// Regras de cálculo do §7. Funções puras, com testes em calc.test.ts.
import { addDias, diaSemana, diasDaSemana, diffDias, inicioSemana } from './dates'
import type { Checkin, Ciclo, FechamentoMensal, Habito, Meta, MetaRegistro, Tarefa } from './types'

export const ALFA = 0.05
/** α semanal equivalente a 7 dias de α diário — mesma "memória" em tempo (~3 semanas). */
export const ALFA_SEMANAL = 1 - Math.pow(1 - ALFA, 7)

const EXECUTOU = new Set(['feito', 'minimo'])

/** O hábito diário / dias_semana é esperado neste dia? (x_por_semana não tem dia fixo.) */
export function esperadoNoDia(h: Habito, data: string): boolean {
  if (!h.ativo || data < h.inicio) return false
  if (h.freq === 'diario') return true
  if (h.freq === 'dias_semana') return (h.dias_semana ?? []).includes(diaSemana(data))
  return false
}

/** §7.1 — ocorrências esperadas na semana que começa em `segunda`. */
export function ocorrenciasEsperadas(h: Habito, segunda: string): number {
  if (!h.ativo) return 0
  const dias = diasDaSemana(segunda)
  if (h.freq === 'x_por_semana') {
    const restantes = dias.filter((d) => d >= h.inicio).length
    return Math.min(h.vezes_por_semana ?? 0, restantes)
  }
  return dias.filter((d) => esperadoNoDia(h, d)).length
}

export function checkinsDaSemana(checkins: Checkin[], habitoId: string, segunda: string): Checkin[] {
  const fim = addDias(segunda, 6)
  return checkins.filter((c) => c.habito_id === habitoId && c.data >= segunda && c.data <= fim)
}

export interface ItemScore {
  tipo: 'habito' | 'tarefa'
  id: string
  titulo: string
  planejado: number
  executado: number
}

export interface ScoreSemanal {
  planejado: number
  executado: number
  score: number | null
  itens: ItemScore[]
}

/** §7.3 — score semanal. Dispensado sai do denominador (máx. 1 por hábito por semana). */
export function scoreSemanal(habitos: Habito[], checkins: Checkin[], tarefas: Tarefa[], segunda: string): ScoreSemanal {
  const itens: ItemScore[] = []
  for (const h of habitos) {
    const esperado = ocorrenciasEsperadas(h, segunda)
    if (esperado === 0) continue
    const cs = checkinsDaSemana(checkins, h.id, segunda)
    const dispensados = Math.min(1, cs.filter((c) => c.status === 'dispensado').length)
    const planejado = Math.max(0, esperado - dispensados)
    const feitos = cs.filter((c) => EXECUTOU.has(c.status)).length
    itens.push({ tipo: 'habito', id: h.id, titulo: h.titulo, planejado, executado: Math.min(feitos, planejado) })
  }
  for (const t of tarefas) {
    if (t.semana_inicio !== segunda) continue
    itens.push({ tipo: 'tarefa', id: t.id, titulo: t.titulo, planejado: 1, executado: t.concluida_em ? 1 : 0 })
  }
  const planejado = itens.reduce((s, i) => s + i.planejado, 0)
  const executado = itens.reduce((s, i) => s + i.executado, 0)
  return { planejado, executado, score: planejado > 0 ? executado / planejado : null, itens }
}

export type Faixa = 'verde' | 'amarelo' | 'vermelho'
/** §7.3 — faixas: ≥ 85% verde · 65–84% amarelo · < 65% vermelho. */
export function faixaScore(score: number): Faixa {
  if (score >= 0.85) return 'verde'
  if (score >= 0.65) return 'amarelo'
  return 'vermelho'
}

/**
 * §7.4 — força do hábito (0..1): média móvel exponencial nos dias esperados.
 * O dia de hoje só entra se já houver check-in (o dia ainda não acabou). Dispensado não altera a força.
 * Para x_por_semana, calcula por semana com execução = min(feitos/X, 1); a semana corrente só entra se já foi cumprida.
 */
export function forcaHabito(h: Habito, checkins: Checkin[], ate: string): number {
  const doHabito = checkins.filter((c) => c.habito_id === h.id)
  const porData = new Map(doHabito.map((c) => [c.data, c.status]))
  let f = 0
  if (h.freq === 'x_por_semana') {
    const x = h.vezes_por_semana ?? 0
    if (x <= 0) return 0
    const semanaAtual = inicioSemana(ate)
    for (let s = inicioSemana(h.inicio); s <= semanaAtual; s = addDias(s, 7)) {
      const feitos = checkinsDaSemana(doHabito, h.id, s).filter((c) => c.data <= ate && EXECUTOU.has(c.status)).length
      if (s === semanaAtual && feitos < x) continue
      f = f * (1 - ALFA_SEMANAL) + Math.min(feitos / x, 1) * ALFA_SEMANAL
    }
    return f
  }
  for (let d = h.inicio; d <= ate; d = addDias(d, 1)) {
    if (!esperadoNoDia(h, d)) continue
    const st = porData.get(d)
    if (st === 'dispensado') continue
    if (d === ate && st === undefined) continue
    f = f * (1 - ALFA) + (st && EXECUTOU.has(st) ? 1 : 0) * ALFA
  }
  return f
}

/** P2 — "nunca falhar duas vezes": o hábito era esperado ontem e não foi executado. */
export function falhouOntem(h: Habito, checkins: Checkin[], hojeData: string): boolean {
  const ontem = addDias(hojeData, -1)
  if (!esperadoNoDia(h, ontem)) return false
  const c = checkins.find((x) => x.habito_id === h.id && x.data === ontem)
  return !c || c.status === 'falhou'
}

/** Hábitos que aparecem na tela Hoje. x_por_semana aparece enquanto a meta da semana não foi cumprida (ou se já houver check-in hoje). */
export function habitosDoDia(habitos: Habito[], checkins: Checkin[], data: string): Habito[] {
  return habitos
    .filter((h) => {
      if (!h.ativo || data < h.inicio) return false
      if (h.freq !== 'x_por_semana') return esperadoNoDia(h, data)
      const temHoje = checkins.some((c) => c.habito_id === h.id && c.data === data)
      const feitos = checkinsDaSemana(checkins, h.id, inicioSemana(data)).filter((c) => EXECUTOU.has(c.status)).length
      return temHoje || feitos < (h.vezes_por_semana ?? 0)
    })
    .sort((a, b) => (a.horario_preferido ?? '99').localeCompare(b.horario_preferido ?? '99') || a.ordem - b.ordem)
}

/** Feitos / meta da semana para x_por_semana. */
export function progressoSemanaX(h: Habito, checkins: Checkin[], data: string): { feitos: number; meta: number } {
  const feitos = checkinsDaSemana(checkins, h.id, inicioSemana(data)).filter((c) => EXECUTOU.has(c.status)).length
  return { feitos, meta: h.vezes_por_semana ?? 0 }
}

// ---------- Metas (§7.5) ----------

export function valorAtualMeta(meta: Meta, registros: MetaRegistro[]): number {
  const rs = registros.filter((r) => r.meta_id === meta.id).sort((a, b) => a.data.localeCompare(b.data))
  return rs.length ? rs[rs.length - 1].valor : meta.valor_inicial
}

export function progressoMeta(meta: Meta, atual: number): number {
  const total = meta.valor_alvo - meta.valor_inicial
  if (total === 0) return atual >= meta.valor_alvo ? 1 : 0
  return (atual - meta.valor_inicial) / total
}

export const SEMANAS_CICLO = 12

/** Fração ideal do ciclo (linha linear ao longo das 12 semanas). */
export function progressoIdeal(ciclo: Ciclo, data: string): number {
  return Math.min(1, Math.max(0, diffDias(data, ciclo.inicio) / (SEMANAS_CICLO * 7)))
}

/** Semana do ciclo (1..13). */
export function semanaDoCiclo(ciclo: Ciclo, data: string): number {
  return Math.floor(diffDias(data, ciclo.inicio) / 7) + 1
}

export function fimDoCiclo(inicio: string): string {
  // 12 semanas de execução + 1 de revisão
  return addDias(inicio, (SEMANAS_CICLO + 1) * 7 - 1)
}

// ---------- Finanças (§7.6) ----------

export function taxaPoupanca(f: Pick<FechamentoMensal, 'aporte' | 'renda'>): number | null {
  if (!f.renda) return null
  return (f.aporte ?? 0) / f.renda
}

export function variacaoPatrimonio(atual: FechamentoMensal, anterior?: FechamentoMensal): number | null {
  if (!anterior || atual.patrimonio_investido == null || anterior.patrimonio_investido == null) return null
  return atual.patrimonio_investido - anterior.patrimonio_investido
}

export function pct(v: number | null | undefined, casas = 0): string {
  if (v == null || Number.isNaN(v)) return '—'
  return `${(v * 100).toFixed(casas)}%`
}

/** Ciclo vigente na data: o que contém a data (preferindo ativo/revisão); senão, o próximo planejado. */
export function cicloAtual(ciclos: Ciclo[], data: string): Ciclo | undefined {
  const contem = ciclos.filter((c) => c.inicio <= data && data <= c.fim && c.status !== 'encerrado')
  return (
    contem.find((c) => c.status === 'ativo' || c.status === 'revisao') ??
    contem[0] ??
    ciclos.filter((c) => c.status === 'planejado' && c.inicio > data).sort((a, b) => a.inicio.localeCompare(b.inicio))[0]
  )
}
