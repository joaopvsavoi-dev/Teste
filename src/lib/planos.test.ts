import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parsePlanoBiblia, parsePlanoSemanal } from './planos'

describe('plano bíblico', () => {
  const itens = parsePlanoBiblia(readFileSync(new URL('../../docs/plano-biblia.md', import.meta.url), 'utf8'))
  it('gera os 1189 capítulos em ordem sequencial', () => {
    expect(itens).toHaveLength(1189)
    expect(itens.map((i) => i.ordem)).toEqual(Array.from({ length: 1189 }, (_, i) => i + 1))
  })
  it('começa por Marcos 1 e termina em Apocalipse 22', () => {
    expect(itens[0]).toMatchObject({ livro: 'Marcos', capitulo: 1 })
    expect(itens[16]).toMatchObject({ livro: 'Provérbios', capitulo: 1 })
    expect(itens[1188]).toMatchObject({ livro: 'Apocalipse', capitulo: 22 })
  })
  it('respeita os totais por fase', () => {
    const porFase = new Map<string, number>()
    for (const i of itens) {
      const f = i.fase!.match(/Fase \d/)![0]
      porFase.set(f, (porFase.get(f) ?? 0) + 1)
    }
    expect(Object.fromEntries(porFase)).toEqual({ 'Fase 1': 137, 'Fase 2': 129, 'Fase 3': 210, 'Fase 4': 150, 'Fase 5': 563 })
  })
})

describe('plano semanal', () => {
  it('lê módulos, semanas, leitura, prática e pergunta', () => {
    const md = `# Plano de Filosofia
## Módulo 1 — Estoicos
### Semana 1 — Sêneca
- **Leitura:** Cartas 1–5
- **Prática:** premeditação dos males
- **Pergunta da semana:** O que está sob meu controle?
### Semana 2: Epicteto
Leitura: Enchiridion 1–10
Prática: dicotomia do controle
Pergunta: Do que estou com medo?
## Módulo 2 — Aristóteles
### Semana 3
- Ética a Nicômaco, livro I
`
    const itens = parsePlanoSemanal(md)
    expect(itens).toHaveLength(3)
    expect(itens[0]).toMatchObject({
      semana: 1,
      modulo: 'Módulo 1 — Estoicos',
      titulo: 'Sêneca',
      leitura: 'Cartas 1–5',
      pratica: 'premeditação dos males',
      pergunta: 'O que está sob meu controle?',
    })
    expect(itens[1]).toMatchObject({ semana: 2, titulo: 'Epicteto', leitura: 'Enchiridion 1–10', pergunta: 'Do que estou com medo?' })
    expect(itens[2]).toMatchObject({
      semana: 3,
      modulo: 'Módulo 2 — Aristóteles',
      titulo: 'Semana 3',
      leitura: 'Ética a Nicômaco, livro I',
    })
  })
})
