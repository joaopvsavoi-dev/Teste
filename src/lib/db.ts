// Acesso a dados. Com VITE_SUPABASE_URL/ANON_KEY usa o Supabase; sem elas, "modo local" (localStorage).
// A API é a mesma nos dois modos, então as telas não sabem onde os dados vivem.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Configuracoes, Tabela, Tabelas } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon) : null
export const modoLocal = !supabase

export const CONFIG_PADRAO: Configuracoes = {
  limite_projetos_ativos: 2,
  dia_revisao: 7,
  perguntas_diario: ['O que fiz bem hoje?', 'Onde falhei e por quê?', 'O que farei diferente amanhã?', 'Pelo que sou grato?'],
  gcal_calendar_id: null,
  gcal_ler_agenda_principal: true,
  onboarding_concluido: false,
}

type Row<T extends Tabela> = Tabelas[T]
type Novo<T extends Tabela> = Omit<Row<T>, 'id'> & { id?: string }

export interface Db {
  list<T extends Tabela>(t: T): Promise<Row<T>[]>
  insert<T extends Tabela>(t: T, rows: Novo<T>[]): Promise<Row<T>[]>
  update<T extends Tabela>(t: T, id: string, patch: Partial<Row<T>>): Promise<void>
  upsert<T extends Tabela>(t: T, row: Novo<T>, onConflict: (keyof Row<T>)[]): Promise<Row<T>>
  remove<T extends Tabela>(t: T, id: string): Promise<void>
  getConfig(): Promise<Configuracoes>
  saveConfig(c: Partial<Configuracoes>): Promise<void>
}

// ---------- Erros de regra de negócio compartilhados ----------

export class ErroRegra extends Error {}

// ---------- Local ----------

const PREFIXO = 'norte:'

function ler<T>(chave: string, padrao: T): T {
  try {
    const v = localStorage.getItem(PREFIXO + chave)
    return v ? (JSON.parse(v) as T) : padrao
  } catch {
    return padrao
  }
}

function gravar(chave: string, valor: unknown) {
  localStorage.setItem(PREFIXO + chave, JSON.stringify(valor))
}

function uuid(): string {
  return crypto.randomUUID()
}

// Reproduz no modo local o trigger checar_limite_projetos do Postgres.
async function checarLimiteLocal(db: Db, id: string | undefined, novoStatus: unknown) {
  if (novoStatus !== 'ativo') return
  const [projetos, cfg] = await Promise.all([db.list('projetos'), db.getConfig()])
  const atual = projetos.find((p) => p.id === id)
  if (atual?.status === 'ativo') return
  const ativos = projetos.filter((p) => p.status === 'ativo' && p.id !== id).length
  if (ativos >= cfg.limite_projetos_ativos) {
    throw new ErroRegra(`Limite de ${cfg.limite_projetos_ativos} projetos ativos atingido. Pause ou conclua um projeto antes.`)
  }
}

export const dbLocal: Db = {
  async list(t) {
    return ler(t, [])
  },
  async insert(t, rows) {
    if (t === 'projetos') for (const r of rows) await checarLimiteLocal(dbLocal, undefined, (r as { status?: string }).status)
    const atuais = ler<Row<typeof t>[]>(t, [])
    const novos = rows.map((r) => ({ ...r, id: r.id ?? uuid() })) as Row<typeof t>[]
    gravar(t, [...atuais, ...novos])
    return novos
  },
  async update(t, id, patch) {
    if (t === 'projetos' && 'status' in patch) await checarLimiteLocal(dbLocal, id, (patch as { status?: string }).status)
    const atuais = ler<Row<typeof t>[]>(t, [])
    const extra = t === 'blocos' ? { updated_at: new Date().toISOString() } : {}
    gravar(
      t,
      atuais.map((r) => (r.id === id ? { ...r, ...patch, ...extra } : r)),
    )
  },
  async upsert(t, row, onConflict) {
    const atuais = ler<Row<typeof t>[]>(t, [])
    const rec = row as Record<string, unknown>
    const idx = atuais.findIndex((r) =>
      onConflict.every((k) => (r as unknown as Record<string, unknown>)[k as string] === rec[k as string]),
    )
    if (idx >= 0) {
      const merged = { ...atuais[idx], ...row, id: atuais[idx].id } as Row<typeof t>
      atuais[idx] = merged
      gravar(t, atuais)
      return merged
    }
    const novo = { ...row, id: row.id ?? uuid() } as Row<typeof t>
    gravar(t, [...atuais, novo])
    return novo
  },
  async remove(t, id) {
    gravar(
      t,
      ler<Row<typeof t>[]>(t, []).filter((r) => r.id !== id),
    )
  },
  async getConfig() {
    return { ...CONFIG_PADRAO, ...ler<Partial<Configuracoes>>('configuracoes', {}) }
  },
  async saveConfig(c) {
    gravar('configuracoes', { ...(await dbLocal.getConfig()), ...c })
  },
}

// ---------- Supabase ----------

function sb(): SupabaseClient {
  if (!supabase) throw new Error('Supabase não configurado')
  return supabase
}

function checar<T>(r: { data: T; error: { message: string; code?: string } | null }): T {
  if (r.error) {
    if (r.error.code === '23514' || /Limite de/.test(r.error.message)) throw new ErroRegra(r.error.message)
    throw new Error(r.error.message)
  }
  return r.data
}

const PAGINA = 1000

export const dbSupabase: Db = {
  async list(t) {
    // Paginação: plano_itens da Bíblia tem 1189 linhas, acima do limite padrão do PostgREST.
    const out: Row<typeof t>[] = []
    for (let de = 0; ; de += PAGINA) {
      const rows = checar(
        await sb()
          .from(t)
          .select('*')
          .range(de, de + PAGINA - 1),
      ) as Row<typeof t>[]
      out.push(...rows)
      if (rows.length < PAGINA) return out
    }
  },
  async insert(t, rows) {
    const out: Row<typeof t>[] = []
    for (let i = 0; i < rows.length; i += 500) {
      out.push(
        ...(checar(
          await sb()
            .from(t)
            .insert(rows.slice(i, i + 500))
            .select(),
        ) as Row<typeof t>[]),
      )
    }
    return out
  },
  async update(t, id, patch) {
    checar(
      await sb()
        .from(t)
        .update(patch as never)
        .eq('id', id),
    )
  },
  async upsert(t, row, onConflict) {
    // diario e fechamentos_mensais são únicos por (user_id, …); user_id vem do default auth.uid().
    const porUsuario = t === 'diario' || t === 'fechamentos_mensais'
    const conflito = [...(porUsuario ? ['user_id'] : []), ...onConflict.map(String)].join(',')
    return checar(await sb().from(t).upsert(row, { onConflict: conflito }).select().single()) as Row<typeof t>
  },
  async remove(t, id) {
    checar(await sb().from(t).delete().eq('id', id))
  },
  async getConfig() {
    const r = checar(await sb().from('configuracoes').select('*').maybeSingle())
    return { ...CONFIG_PADRAO, ...((r as Partial<Configuracoes> | null) ?? {}) }
  },
  async saveConfig(c) {
    const { data } = await sb().auth.getUser()
    checar(
      await sb()
        .from('configuracoes')
        .upsert({ user_id: data.user?.id, ...c }, { onConflict: 'user_id' }),
    )
  },
}

export const db: Db = modoLocal ? dbLocal : dbSupabase

// ---------- Backup (modo local) ----------

const TABELAS: Tabela[] = [
  'areas',
  'ciclos',
  'roda_vida',
  'metas',
  'meta_registros',
  'habitos',
  'checkins',
  'projetos',
  'tarefas',
  'blocos',
  'planos_leitura',
  'plano_itens',
  'livros',
  'diario',
  'revisoes',
  'fechamentos_mensais',
  'metas_financeiras',
]

export async function exportarTudo(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { versao: 1, exportado_em: new Date().toISOString(), configuracoes: await db.getConfig() }
  for (const t of TABELAS) out[t] = await db.list(t)
  return out
}

export function importarLocal(dados: Record<string, unknown>) {
  for (const t of TABELAS) if (Array.isArray(dados[t])) gravar(t, dados[t])
  if (dados.configuracoes) gravar('configuracoes', dados.configuracoes)
}
