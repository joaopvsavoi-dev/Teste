// Importação dos planos de leitura em Markdown (§4.1, §4.2) para plano_itens.
import type { PlanoItem } from './types'

export type ItemNovo = Omit<PlanoItem, 'id' | 'plano_id' | 'concluido_em' | 'resposta_pergunta'>

function celulas(linha: string): string[] {
  return linha
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim())
}

const vazio = {
  semana: null,
  modulo: null,
  titulo: null,
  livro: null,
  capitulo: null,
  fase: null,
  leitura: null,
  pratica: null,
  pergunta: null,
} satisfies Omit<ItemNovo, 'ordem'>

/**
 * Plano bíblico (plano-biblia.md): seções "## Fase N — ..." com tabelas que têm as colunas "Livro" e "Caps.".
 * Cada capítulo vira um item com ordem sequencial.
 */
export function parsePlanoBiblia(md: string): ItemNovo[] {
  const itens: ItemNovo[] = []
  let fase: string | null = null
  let colLivro = -1
  let colCaps = -1
  for (const linha of md.split('\n')) {
    const h = linha.match(/^##\s+(Fase\s+\d+.*)$/i)
    if (h) {
      fase = h[1].trim()
      colLivro = colCaps = -1
      continue
    }
    if (/^##\s/.test(linha)) {
      fase = null
      continue
    }
    if (!fase || !linha.trim().startsWith('|')) continue
    const cs = celulas(linha)
    if (cs.some((c) => /^livro$/i.test(c)) && cs.some((c) => /^caps\.?$/i.test(c))) {
      colLivro = cs.findIndex((c) => /^livro$/i.test(c))
      colCaps = cs.findIndex((c) => /^caps\.?$/i.test(c))
      continue
    }
    if (colLivro < 0 || /^[-:\s|]+$/.test(linha.trim())) continue
    const livro = cs[colLivro]?.replace(/\*/g, '')
    const caps = parseInt(cs[colCaps] ?? '', 10)
    if (!livro || !Number.isFinite(caps)) continue
    for (let c = 1; c <= caps; c++) {
      itens.push({ ...vazio, ordem: itens.length + 1, livro, capitulo: c, fase, titulo: `${livro} ${c}` })
    }
  }
  return itens
}

const RE_SEMANA = /^#{2,4}\s+.*?semana\s+(\d+)\b(.*)$/i
const RE_MODULO = /^#{1,4}\s+(.*m[óo]dulo.*)$/i

function campo(linha: string, nomes: string): string | null {
  const re = new RegExp(
    `^[-*>\\s]*(?:\\*\\*|__)?(?:${nomes})(?:\\*\\*|__)?\\s*(?:da semana)?\\s*(?:\\*\\*|__)?\\s*[:—–-]\\s*(?:\\*\\*|__)?\\s*(.+)$`,
    'i',
  )
  const m = linha.match(re)
  return m ? m[1].replace(/\*\*/g, '').trim() : null
}

/**
 * Plano semanal (ex.: filosofia): cabeçalhos "## Semana N — título" (ou "### Semana N"), opcionalmente
 * agrupados em "## Módulo X — ...". Dentro de cada semana, linhas "Leitura:", "Prática:" e "Pergunta (da semana):".
 * Linhas sem rótulo são acrescentadas à leitura.
 */
export function parsePlanoSemanal(md: string): ItemNovo[] {
  const itens: ItemNovo[] = []
  let modulo: string | null = null
  let atual: ItemNovo | null = null
  const fechar = () => {
    if (atual) itens.push(atual)
    atual = null
  }
  for (const bruta of md.split('\n')) {
    const linha = bruta.trim()
    const s = linha.match(RE_SEMANA)
    if (s) {
      fechar()
      const resto = s[2].replace(/^[\s:—–-]+/, '').trim()
      atual = { ...vazio, ordem: itens.length + 1, semana: parseInt(s[1], 10), modulo, titulo: resto || `Semana ${s[1]}` }
      continue
    }
    const m = linha.match(RE_MODULO)
    if (m && !RE_SEMANA.test(linha)) {
      fechar()
      modulo = m[1].replace(/\*/g, '').trim()
      continue
    }
    if (/^#{1,2}\s/.test(linha)) {
      fechar()
      continue
    }
    if (!atual || !linha) continue
    const cur: ItemNovo = atual
    const leitura = campo(linha, 'leitura|ler')
    const pratica = campo(linha, 'pr[áa]tica|exerc[íi]cio')
    const pergunta = campo(linha, 'pergunta')
    if (leitura) cur.leitura = cur.leitura ? `${cur.leitura}\n${leitura}` : leitura
    else if (pratica) cur.pratica = cur.pratica ? `${cur.pratica}\n${pratica}` : pratica
    else if (pergunta) cur.pergunta = pergunta
    else if (!linha.startsWith('|') && !/^[-*_]{3,}$/.test(linha)) {
      const txt = linha.replace(/^[-*]\s+/, '')
      cur.leitura = cur.leitura ? `${cur.leitura}\n${txt}` : txt
    }
  }
  fechar()
  return itens
}
