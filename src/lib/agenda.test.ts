import { describe, expect, it } from 'vitest'
import { diasEspalhados, proporBlocos } from './agenda'
import { horaLocal, paraISO } from './dates'
import type { Habito } from './types'

const SEG = '2026-10-12'
function hab(p: Partial<Habito>): Habito {
  return {
    id: 'h',
    area_id: null,
    meta_id: null,
    titulo: 'Italiano',
    gatilho_se: null,
    acao_entao: null,
    versao_minima: null,
    freq: 'diario',
    dias_semana: null,
    vezes_por_semana: null,
    duracao_min: 30,
    horario_preferido: '07:00',
    unidade: null,
    valor_alvo: null,
    gerar_bloco: true,
    ativo: true,
    inicio: '2026-01-01',
    ordem: 0,
    ...p,
  }
}

describe('proposta de blocos', () => {
  it('cria um bloco por dia esperado no horário preferido (fuso de SP)', () => {
    const { propostos } = proporBlocos([hab({})], SEG, [])
    expect(propostos).toHaveLength(7)
    expect(horaLocal(propostos[0].inicio)).toBe('07:00')
    expect(propostos[0].inicio).toBe('2026-10-12T10:00:00.000Z')
  })
  it('desvia de horários ocupados e de blocos já existentes', () => {
    const ocupado = { inicio: paraISO(SEG, '07:00'), fim: paraISO(SEG, '07:45') }
    const existente = { inicio: paraISO('2026-10-13', '07:00'), fim: paraISO('2026-10-13', '07:30'), habito_id: 'h', deleted_at: null }
    const { propostos } = proporBlocos([hab({})], SEG, [existente], [ocupado])
    expect(propostos).toHaveLength(6)
    expect(horaLocal(propostos[0].inicio)).toBe('08:00')
  })
  it('espalha hábitos X por semana e lista os sem horário', () => {
    expect(diasEspalhados(3)).toEqual([0, 2, 4])
    const r = proporBlocos(
      [hab({ freq: 'x_por_semana', vezes_por_semana: 3 }), hab({ id: 'b', titulo: 'Sem hora', horario_preferido: null })],
      SEG,
      [],
    )
    expect(r.propostos).toHaveLength(3)
    expect(r.semHorario).toEqual(['Sem hora'])
  })
})

describe('proposta a partir de hoje', () => {
  it('não propõe blocos para dias anteriores', () => {
    const { propostos } = proporBlocos([hab({})], SEG, [], [], '2026-10-15')
    expect(propostos).toHaveLength(4)
  })
})
