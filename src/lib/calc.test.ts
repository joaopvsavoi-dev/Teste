import { describe, expect, it } from 'vitest'
import {
  ALFA,
  falhouOntem,
  faixaScore,
  forcaHabito,
  habitosDoDia,
  ocorrenciasEsperadas,
  progressoIdeal,
  progressoMeta,
  scoreSemanal,
  taxaPoupanca,
} from './calc'
import type { Checkin, Ciclo, Habito, Meta, Tarefa } from './types'

const SEG = '2026-10-12' // segunda-feira

function hab(p: Partial<Habito> = {}): Habito {
  return {
    id: 'h1',
    area_id: null,
    meta_id: null,
    titulo: 'Hábito',
    gatilho_se: null,
    acao_entao: null,
    versao_minima: null,
    freq: 'diario',
    dias_semana: null,
    vezes_por_semana: null,
    duracao_min: null,
    horario_preferido: null,
    unidade: null,
    valor_alvo: null,
    gerar_bloco: true,
    ativo: true,
    inicio: '2026-01-01',
    ordem: 0,
    ...p,
  }
}
let n = 0
function ck(data: string, status: Checkin['status'], habito_id = 'h1'): Checkin {
  return { id: `c${n++}`, habito_id, data, status, valor: null, nota: null }
}

describe('ocorrências esperadas (§7.1)', () => {
  it('diário = 7, dias da semana = qtd de dias, X por semana = X', () => {
    expect(ocorrenciasEsperadas(hab(), SEG)).toBe(7)
    expect(ocorrenciasEsperadas(hab({ freq: 'dias_semana', dias_semana: [1, 3, 5] }), SEG)).toBe(3)
    expect(ocorrenciasEsperadas(hab({ freq: 'x_por_semana', vezes_por_semana: 3 }), SEG)).toBe(3)
  })
  it('respeita a data de início no meio da semana', () => {
    expect(ocorrenciasEsperadas(hab({ inicio: '2026-10-16' }), SEG)).toBe(3) // sex, sáb, dom
    expect(ocorrenciasEsperadas(hab({ freq: 'x_por_semana', vezes_por_semana: 4, inicio: '2026-10-17' }), SEG)).toBe(2)
  })
  it('hábito inativo não conta', () => {
    expect(ocorrenciasEsperadas(hab({ ativo: false }), SEG)).toBe(0)
  })
})

describe('score semanal (§7.3)', () => {
  it('feito e mínimo contam 1; dispensado sai do denominador; tarefas entram', () => {
    const h = hab()
    const cs = [
      ck('2026-10-12', 'feito'),
      ck('2026-10-13', 'minimo'),
      ck('2026-10-14', 'falhou'),
      ck('2026-10-15', 'dispensado'),
      ck('2026-10-16', 'feito'),
    ]
    const tarefas: Tarefa[] = [
      { id: 't1', projeto_id: 'p', titulo: 'A', estimativa_min: null, semana_inicio: SEG, concluida_em: '2026-10-13T10:00:00Z', ordem: 0 },
      { id: 't2', projeto_id: 'p', titulo: 'B', estimativa_min: null, semana_inicio: SEG, concluida_em: null, ordem: 1 },
      { id: 't3', projeto_id: 'p', titulo: 'C', estimativa_min: null, semana_inicio: '2026-10-19', concluida_em: null, ordem: 2 },
    ]
    const s = scoreSemanal([h], cs, tarefas, SEG)
    // hábito: 7 − 1 dispensado = 6 planejados, 3 executados; tarefas: 2 planejadas, 1 concluída
    expect(s.planejado).toBe(8)
    expect(s.executado).toBe(4)
    expect(s.score).toBeCloseTo(0.5)
  })
  it('limita dispensas a 1 por semana e executado ao esperado', () => {
    const h = hab({ freq: 'x_por_semana', vezes_por_semana: 2 })
    const cs = [
      ck('2026-10-12', 'feito'),
      ck('2026-10-13', 'feito'),
      ck('2026-10-14', 'feito'),
      ck('2026-10-15', 'dispensado'),
      ck('2026-10-16', 'dispensado'),
    ]
    const s = scoreSemanal([h], cs, [], SEG)
    expect(s.planejado).toBe(1)
    expect(s.executado).toBe(1)
  })
  it('ignora check-ins de outras semanas e retorna null sem planejamento', () => {
    expect(scoreSemanal([], [], [], SEG).score).toBeNull()
    const s = scoreSemanal([hab()], [ck('2026-10-11', 'feito')], [], SEG)
    expect(s.executado).toBe(0)
  })
  it('faixas', () => {
    expect(faixaScore(0.85)).toBe('verde')
    expect(faixaScore(0.84)).toBe('amarelo')
    expect(faixaScore(0.65)).toBe('amarelo')
    expect(faixaScore(0.649)).toBe('vermelho')
  })
})

describe('força do hábito (§7.4)', () => {
  it('sobe devagar com execução diária e segue a EMA', () => {
    const h = hab({ inicio: '2026-10-01' })
    const cs = ['2026-10-01', '2026-10-02', '2026-10-03'].map((d) => ck(d, 'feito'))
    const esperado = 1 - Math.pow(1 - ALFA, 3)
    expect(forcaHabito(h, cs, '2026-10-03')).toBeCloseTo(esperado)
  })
  it('um deslize isolado não zera (P2) e dispensado não altera', () => {
    const h = hab({ inicio: '2026-09-01' })
    const dias = Array.from({ length: 30 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`)
    const cs = dias.map((d) => ck(d, 'feito'))
    const antes = forcaHabito(h, cs, '2026-09-30')
    const comFalha = forcaHabito(h, [...cs, ck('2026-10-01', 'falhou')], '2026-10-01')
    expect(comFalha).toBeGreaterThan(antes * 0.9)
    expect(forcaHabito(h, [...cs, ck('2026-10-01', 'dispensado')], '2026-10-01')).toBeCloseTo(antes)
  })
  it('hoje sem check-in não penaliza; ontem sem check-in conta como falha', () => {
    const h = hab({ inicio: '2026-10-01' })
    const cs = [ck('2026-10-01', 'feito')]
    expect(forcaHabito(h, cs, '2026-10-02')).toBeCloseTo(ALFA)
    expect(forcaHabito(h, cs, '2026-10-03')).toBeCloseTo(ALFA * (1 - ALFA))
  })
  it('x por semana: calcula por semana', () => {
    const h = hab({ freq: 'x_por_semana', vezes_por_semana: 2, inicio: '2026-10-05' })
    const cs = [ck('2026-10-05', 'feito'), ck('2026-10-07', 'feito'), ck('2026-10-12', 'feito')]
    const f = forcaHabito(h, cs, '2026-10-13') // semana atual incompleta não entra
    expect(f).toBeGreaterThan(0.25)
    expect(f).toBeLessThan(0.35)
  })
})

describe('não falhe duas vezes (P2)', () => {
  it('alerta só quando ontem era esperado e não houve execução', () => {
    const h = hab({ freq: 'dias_semana', dias_semana: [1] })
    expect(falhouOntem(h, [], '2026-10-13')).toBe(true) // ontem = segunda
    expect(falhouOntem(h, [ck('2026-10-12', 'minimo')], '2026-10-13')).toBe(false)
    expect(falhouOntem(h, [ck('2026-10-12', 'dispensado')], '2026-10-13')).toBe(false)
    expect(falhouOntem(h, [], '2026-10-14')).toBe(false) // ontem = terça, não esperado
  })
})

describe('hábitos do dia', () => {
  it('x por semana some depois de cumprida a meta', () => {
    const h = hab({ id: 'x', freq: 'x_por_semana', vezes_por_semana: 1 })
    expect(habitosDoDia([h], [], '2026-10-14')).toHaveLength(1)
    expect(habitosDoDia([h], [ck('2026-10-12', 'feito', 'x')], '2026-10-14')).toHaveLength(0)
    expect(habitosDoDia([h], [ck('2026-10-14', 'feito', 'x')], '2026-10-14')).toHaveLength(1)
  })
})

describe('metas e finanças', () => {
  const meta: Meta = {
    id: 'm',
    ciclo_id: 'c',
    area_id: null,
    titulo: 'Km',
    porque: null,
    unidade: 'km',
    valor_inicial: 10,
    valor_alvo: 30,
    status: 'em_andamento',
    resultado_nota: null,
  }
  const ciclo: Ciclo = { id: 'c', nome: null, inicio: SEG, fim: '2027-01-10', status: 'ativo', tema: null, retrospectiva: null }
  it('progresso e linha ideal', () => {
    expect(progressoMeta(meta, 20)).toBeCloseTo(0.5)
    expect(progressoIdeal(ciclo, SEG)).toBe(0)
    expect(progressoIdeal(ciclo, '2026-11-23')).toBeCloseTo(0.5) // 6 semanas
    expect(progressoIdeal(ciclo, '2027-03-01')).toBe(1)
  })
  it('taxa de poupança', () => {
    expect(taxaPoupanca({ renda: 10000, aporte: 2500 })).toBeCloseTo(0.25)
    expect(taxaPoupanca({ renda: 0, aporte: 100 })).toBeNull()
  })
})
