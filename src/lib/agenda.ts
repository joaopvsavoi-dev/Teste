// Proposta automática de blocos da semana (§6.2 passo 6): horário preferido de cada hábito,
// sem conflito com blocos existentes nem com os horários ocupados da agenda principal.
import { dataLocal, diasDaSemana, paraISO } from './dates'
import { esperadoNoDia } from './calc'
import type { Bloco, Habito } from './types'

export interface Intervalo {
  inicio: string // ISO
  fim: string
}

export interface BlocoProposto {
  inicio: string
  fim: string
  titulo: string
  habito_id: string
  area_id: string | null
}

const PASSO_MIN = 30
const TENTATIVAS = 6 // até 3h depois do horário preferido

function conflita(a: Intervalo, b: Intervalo): boolean {
  const t = (s: string) => new Date(s).getTime()
  return t(a.inicio) < t(b.fim) && t(b.inicio) < t(a.fim)
}

/** Dias (índices 0..6) espalhados para hábitos X por semana: 3x → seg, qua, sex. */
export function diasEspalhados(x: number): number[] {
  if (x <= 0) return []
  if (x >= 7) return [0, 1, 2, 3, 4, 5, 6]
  return Array.from({ length: x }, (_, i) => Math.floor((i * 7) / x))
}

export function proporBlocos(
  habitos: Habito[],
  segunda: string,
  existentes: Pick<Bloco, 'inicio' | 'fim' | 'habito_id' | 'deleted_at'>[],
  ocupados: Intervalo[] = [],
  desde = '0000-01-01', // não propõe blocos para dias anteriores (ex.: hoje)
): { propostos: BlocoProposto[]; semHorario: string[] } {
  const dias = diasDaSemana(segunda)
  const propostos: BlocoProposto[] = []
  const semHorario: string[] = []
  const vivos = existentes.filter((b) => !b.deleted_at)

  for (const h of habitos) {
    if (!h.ativo || !h.gerar_bloco) continue
    if (!h.horario_preferido || !h.duracao_min) {
      semHorario.push(h.titulo)
      continue
    }
    const alvo =
      h.freq === 'x_por_semana'
        ? diasEspalhados(h.vezes_por_semana ?? 0)
            .map((i) => dias[i])
            .filter((d) => d >= h.inicio)
        : dias.filter((d) => esperadoNoDia(h, d))

    for (const d of alvo.filter((x) => x >= desde)) {
      const jaTem = vivos.some((b) => b.habito_id === h.id && dataLocal(b.inicio) === d)
      if (jaTem) continue
      const base = new Date(paraISO(d, h.horario_preferido)).getTime()
      for (let k = 0; k < TENTATIVAS; k++) {
        const ini = new Date(base + k * PASSO_MIN * 60000)
        const cand = { inicio: ini.toISOString(), fim: new Date(ini.getTime() + h.duracao_min * 60000).toISOString() }
        const livre = ![...vivos, ...propostos, ...ocupados].some((o) => conflita(cand, o))
        if (livre) {
          propostos.push({ ...cand, titulo: h.titulo, habito_id: h.id, area_id: h.area_id })
          break
        }
      }
    }
  }
  return { propostos, semHorario }
}
