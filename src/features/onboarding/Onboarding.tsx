import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Botao, Campo, Card, cx, num, Pagina } from '@/components/ui'
import { AREAS_PADRAO } from '@/features/areas/padrao'
import { MAX_METAS } from '@/features/goals/Metas'
import { importarPlano } from '@/lib/acoes'
import { fimDoCiclo } from '@/lib/calc'
import { addDias, fmt, hoje, inicioSemana } from '@/lib/dates'
import { db, modoLocal } from '@/lib/db'
import { useInvalidar, useTabela } from '@/lib/queries'
import type { FreqTipo } from '@/lib/types'
import bibliaMd from '../../../docs/plano-biblia.md?raw'

interface AreaRascunho {
  id?: string
  nome: string
  cor: string
  ativa: boolean
  nota: number
  visao: string
}
interface MetaRascunho {
  titulo: string
  inicial: string
  alvo: string
  unidade: string
}
interface HabitoSugerido {
  on: boolean
  area: string
  titulo: string
  se: string
  entao: string
  minimo: string
  freq: FreqTipo
  vezes?: number
  dias?: number[]
  horario: string
  duracao: number
  unidade?: string
}

// §4 — exemplos de hábitos (lead) por área; o usuário escolhe e ajusta.
const SUGESTOES: HabitoSugerido[] = [
  {
    on: true,
    area: 'Mente & Espírito',
    titulo: 'Leitura bíblica',
    se: 'Terminar o café da manhã',
    entao: 'leio o próximo capítulo',
    minimo: 'ler 1 versículo',
    freq: 'diario',
    horario: '07:30',
    duracao: 10,
  },
  {
    on: true,
    area: 'Mente & Espírito',
    titulo: 'Leitura do plano de filosofia',
    se: 'Chegar em casa à noite',
    entao: 'leio o plano de filosofia por 30 min',
    minimo: 'ler 1 página',
    freq: 'diario',
    horario: '20:30',
    duracao: 30,
    unidade: 'min',
  },
  {
    on: true,
    area: 'Mente & Espírito',
    titulo: 'Exame noturno',
    se: 'Deitar na cama',
    entao: 'respondo o diário',
    minimo: 'escrever 1 linha',
    freq: 'diario',
    horario: '22:30',
    duracao: 10,
  },
  {
    on: true,
    area: 'Idiomas',
    titulo: 'Italiano',
    se: 'Sentar para o almoço',
    entao: 'estudo italiano 20 min',
    minimo: 'revisar 5 palavras',
    freq: 'diario',
    horario: '12:30',
    duracao: 20,
    unidade: 'min',
  },
  {
    on: true,
    area: 'Idiomas',
    titulo: 'Conteúdo em inglês',
    se: 'Começar o deslocamento',
    entao: 'ouço um podcast em inglês',
    minimo: 'ouvir 2 minutos',
    freq: 'x_por_semana',
    vezes: 3,
    horario: '18:00',
    duracao: 30,
  },
  {
    on: true,
    area: 'Saúde',
    titulo: 'Academia',
    se: 'Sair do trabalho',
    entao: 'treino de hipertrofia',
    minimo: 'fazer 1 série',
    freq: 'x_por_semana',
    vezes: 4,
    horario: '06:30',
    duracao: 60,
  },
  {
    on: true,
    area: 'Saúde',
    titulo: 'Corrida',
    se: 'Acordar (ter/qui)',
    entao: 'corro',
    minimo: 'caminhar 10 min',
    freq: 'x_por_semana',
    vezes: 2,
    horario: '06:00',
    duracao: 45,
    unidade: 'km',
  },
  {
    on: false,
    area: 'Saúde',
    titulo: 'Bike',
    se: 'Sábado de manhã',
    entao: 'pedalo',
    minimo: 'pedalar 15 min',
    freq: 'x_por_semana',
    vezes: 1,
    horario: '07:00',
    duracao: 90,
    unidade: 'km',
  },
  {
    on: true,
    area: 'Profissional',
    titulo: 'Trabalho profundo',
    se: 'Abrir o computador de manhã',
    entao: 'bloco de trabalho profundo no projeto ativo',
    minimo: 'trabalhar 15 min no projeto',
    freq: 'x_por_semana',
    vezes: 3,
    horario: '09:00',
    duracao: 90,
  },
]

const PASSOS = ['Boas-vindas', 'Roda da Vida', 'Visão', 'Metas do ciclo', 'Hábitos', 'Projetos']

export function Onboarding() {
  const existentes = useTabela('areas')
  const navegar = useNavigate()
  const invalidar = useInvalidar()
  const [passo, setPasso] = useState(0)
  const [salvando, setSalvando] = useState(false)
  const [areas, setAreas] = useState<AreaRascunho[] | null>(null)
  const listaAreas: AreaRascunho[] =
    areas ??
    (existentes.length
      ? existentes.map((a) => ({ id: a.id, nome: a.nome, cor: a.cor ?? '#64748b', ativa: a.ativa, nota: 5, visao: a.visao ?? '' }))
      : AREAS_PADRAO.map((a) => ({ nome: a.nome, cor: a.cor!, ativa: true, nota: 5, visao: '' })))
  const setArea = (i: number, p: Partial<AreaRascunho>) => setAreas(listaAreas.map((a, j) => (j === i ? { ...a, ...p } : a)))

  const [ciclo, setCiclo] = useState({ inicio: addDias(inicioSemana(hoje()), 7), tema: '' })
  const [metas, setMetas] = useState<Record<string, MetaRascunho>>({})
  const [habitos, setHabitos] = useState(SUGESTOES)
  const [importarBiblia, setImportarBiblia] = useState(true)
  const [projetos, setProjetos] = useState([{ titulo: '', pronto: '', ativo: true }])

  const ativas = listaAreas.filter((a) => a.ativa)
  const nMetas = Object.values(metas).filter((m) => m.titulo.trim() && num(m.alvo) != null).length

  async function concluir() {
    setSalvando(true)
    try {
      // Áreas
      const idPorNome = new Map<string, string>()
      for (const [i, a] of listaAreas.entries()) {
        const dados = { nome: a.nome, cor: a.cor, ativa: a.ativa, visao: a.visao || null, ordem: i }
        if (a.id) {
          await db.update('areas', a.id, dados)
          idPorNome.set(a.nome, a.id)
        } else {
          const [nova] = await db.insert('areas', [{ ...dados, icone: null }])
          idPorNome.set(a.nome, nova.id)
        }
      }
      // Ciclo + Roda da Vida + metas
      const inicio = inicioSemana(ciclo.inicio)
      const [c] = await db.insert('ciclos', [
        {
          nome: 'Ciclo 1',
          inicio,
          fim: fimDoCiclo(inicio),
          status: inicio <= hoje() ? 'ativo' : 'planejado',
          tema: ciclo.tema || null,
          retrospectiva: null,
        },
      ])
      await db.insert(
        'roda_vida',
        ativas.map((a) => ({ ciclo_id: c.id, area_id: idPorNome.get(a.nome)!, nota: a.nota, comentario: null })),
      )
      const metaPorArea = new Map<string, string>()
      for (const a of ativas) {
        const m = metas[a.nome]
        if (!m?.titulo.trim() || num(m.alvo) == null) continue
        const [nova] = await db.insert('metas', [
          {
            ciclo_id: c.id,
            area_id: idPorNome.get(a.nome)!,
            titulo: m.titulo,
            porque: null,
            unidade: m.unidade || null,
            valor_inicial: num(m.inicial) ?? 0,
            valor_alvo: num(m.alvo)!,
            status: 'em_andamento',
            resultado_nota: null,
          },
        ])
        metaPorArea.set(a.nome, nova.id)
      }
      // Hábitos (lead) — ligados à meta da mesma área, quando houver
      const escolhidos = habitos.filter((h) => h.on && idPorNome.has(h.area))
      const criados = await db.insert(
        'habitos',
        escolhidos.map((h, i) => ({
          area_id: idPorNome.get(h.area)!,
          meta_id: metaPorArea.get(h.area) ?? null,
          titulo: h.titulo,
          gatilho_se: h.se,
          acao_entao: h.entao,
          versao_minima: h.minimo,
          freq: h.freq,
          dias_semana: h.dias ?? null,
          vezes_por_semana: h.vezes ?? null,
          duracao_min: h.duracao,
          horario_preferido: h.horario,
          unidade: h.unidade ?? null,
          valor_alvo: null,
          gerar_bloco: true,
          ativo: true,
          inicio: hoje(), // hábitos começam já; o ciclo pode começar na próxima segunda
          ordem: i,
        })),
      )
      if (importarBiblia) {
        const hab = criados.find((h) => h.titulo === 'Leitura bíblica')
        await importarPlano({
          titulo: 'Bíblia — 1 capítulo por dia',
          tipo: 'capitulos',
          md: bibliaMd,
          area_id: idPorNome.get('Mente & Espírito') ?? null,
          habito_id: hab?.id ?? null,
        })
      }
      // Projetos — respeita o limite de ativos
      let ativosCriados = 0
      for (const p of projetos.filter((p) => p.titulo.trim() && p.pronto.trim())) {
        const status = p.ativo && ativosCriados < 2 ? 'ativo' : 'backlog'
        if (status === 'ativo') ativosCriados++
        await db.insert('projetos', [
          {
            titulo: p.titulo,
            definicao_de_pronto: p.pronto,
            status,
            area_id: null,
            meta_id: null,
            prazo: null,
            concluido_em: null,
            ordem: 0,
          },
        ])
      }
      await db.saveConfig({ onboarding_concluido: true })
      await invalidar('areas', 'ciclos', 'roda_vida', 'metas', 'habitos', 'projetos', 'planos_leitura', 'plano_itens', 'configuracoes')
      navegar('/')
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function pular() {
    if (!existentes.length) await db.insert('areas', AREAS_PADRAO)
    await db.saveConfig({ onboarding_concluido: true })
    await invalidar('areas', 'configuracoes')
    navegar('/')
  }

  return (
    <Pagina titulo="Bem-vindo ao Norte" sub={`${passo + 1}/${PASSOS.length} · ${PASSOS[passo]}`}>
      <div className="flex gap-1">
        {PASSOS.map((_, i) => (
          <div key={i} className={cx('h-1 flex-1 rounded-full', i <= passo ? 'bg-amber-500' : 'bg-slate-800')} />
        ))}
      </div>

      {passo === 0 && (
        <Card>
          <div className="space-y-3 text-sm text-slate-300">
            <p>
              O Norte liga <b>quem você quer ser</b> (visão) → <b>o que vai conquistar em 12 semanas</b> (metas) →{' '}
              <b>o que faz esta semana e hoje</b> (hábitos e blocos na agenda).
            </p>
            <ul className="list-disc space-y-1 pl-5 text-slate-400">
              <li>
                Hábito leva meses: medimos a <b>força</b> (média móvel), não a sequência.
              </li>
              <li>
                Um deslize não destrói nada. A regra é <b>nunca falhar duas vezes</b>.
              </li>
              <li>
                Todo hábito tem <b>SE → ENTÃO</b>, horário e uma <b>versão mínima</b>.
              </li>
              <li>
                Meta da execução semanal: <b>≥ 85%</b>.
              </li>
            </ul>
            {modoLocal && (
              <p className="rounded-lg bg-amber-500/10 p-2 text-xs text-amber-200">
                Modo local: os dados ficam neste navegador. Configure o Supabase para login com Google e sincronização.
              </p>
            )}
          </div>
        </Card>
      )}

      {passo === 1 && (
        <Card titulo="Áreas e nota atual (0–10)">
          <div className="space-y-3">
            {listaAreas.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="checkbox" checked={a.ativa} onChange={(e) => setArea(i, { ativa: e.target.checked })} />
                <input type="color" className="h-8 w-9 p-0.5" value={a.cor} onChange={(e) => setArea(i, { cor: e.target.value })} />
                <input className="min-w-0 flex-1" value={a.nome} onChange={(e) => setArea(i, { nome: e.target.value })} />
                <select className="w-16" value={a.nota} onChange={(e) => setArea(i, { nota: Number(e.target.value) })} disabled={!a.ativa}>
                  {Array.from({ length: 11 }, (_, n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <Botao
              variante="fantasma"
              onClick={() => setAreas([...listaAreas, { nome: 'Nova área', cor: '#64748b', ativa: true, nota: 5, visao: '' }])}
            >
              + área
            </Botao>
          </div>
        </Card>
      )}

      {passo === 2 && (
        <Card titulo="Quem quero ser em 3–5 anos">
          <div className="space-y-3">
            {listaAreas.map(
              (a, i) =>
                a.ativa && (
                  <Campo key={i} rotulo={a.nome}>
                    <textarea rows={2} value={a.visao} onChange={(e) => setArea(i, { visao: e.target.value })} />
                  </Campo>
                ),
            )}
          </div>
        </Card>
      )}

      {passo === 3 && (
        <Card titulo={`Ciclo 1 · até ${MAX_METAS} metas, 1 por área (${nMetas}/${MAX_METAS})`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Campo rotulo="Início (segunda)" dica={`Termina em ${fmt(fimDoCiclo(inicioSemana(ciclo.inicio)))}`}>
                <input type="date" value={ciclo.inicio} onChange={(e) => setCiclo({ ...ciclo, inicio: e.target.value })} />
              </Campo>
              <Campo rotulo="Tema (opcional)">
                <input value={ciclo.tema} onChange={(e) => setCiclo({ ...ciclo, tema: e.target.value })} />
              </Campo>
            </div>
            {ativas.map((a) => {
              const m = metas[a.nome] ?? { titulo: '', inicial: '0', alvo: '', unidade: '' }
              const set = (p: Partial<MetaRascunho>) => setMetas({ ...metas, [a.nome]: { ...m, ...p } })
              const bloqueada = nMetas >= MAX_METAS && !(m.titulo.trim() && num(m.alvo) != null)
              return (
                <div key={a.nome} className="space-y-1">
                  <div className="text-xs font-semibold" style={{ color: a.cor }}>
                    {a.nome}
                  </div>
                  <input
                    className="w-full"
                    placeholder="Resultado mensurável (opcional)"
                    value={m.titulo}
                    onChange={(e) => set({ titulo: e.target.value })}
                    disabled={bloqueada}
                  />
                  {m.titulo && (
                    <div className="grid grid-cols-3 gap-1">
                      <input
                        placeholder="inicial"
                        inputMode="decimal"
                        value={m.inicial}
                        onChange={(e) => set({ inicial: e.target.value })}
                      />
                      <input placeholder="alvo" inputMode="decimal" value={m.alvo} onChange={(e) => set({ alvo: e.target.value })} />
                      <input placeholder="unidade" value={m.unidade} onChange={(e) => set({ unidade: e.target.value })} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {passo === 4 && (
        <Card titulo="Hábitos (SE → ENTÃO)">
          <div className="space-y-3">
            {habitos.map((h, i) => {
              const set = (p: Partial<HabitoSugerido>) => setHabitos(habitos.map((x, j) => (j === i ? { ...x, ...p } : x)))
              return (
                <div key={i} className={cx('rounded-lg border p-2', h.on ? 'border-slate-700' : 'border-slate-800 opacity-50')}>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={h.on} onChange={(e) => set({ on: e.target.checked })} />
                    {h.titulo}
                    <span className="ml-auto text-xs font-normal text-slate-500">
                      {h.area} · {h.freq === 'diario' ? 'diário' : `${h.vezes}x/sem`}
                    </span>
                  </label>
                  {h.on && (
                    <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                      <input value={h.se} onChange={(e) => set({ se: e.target.value })} placeholder="SE" />
                      <input value={h.entao} onChange={(e) => set({ entao: e.target.value })} placeholder="ENTÃO" />
                      <input value={h.minimo} onChange={(e) => set({ minimo: e.target.value })} placeholder="versão mínima" />
                      <div className="flex gap-1">
                        <input type="time" className="flex-1" value={h.horario} onChange={(e) => set({ horario: e.target.value })} />
                        <input
                          className="w-14"
                          inputMode="numeric"
                          value={h.duracao}
                          onChange={(e) => set({ duracao: num(e.target.value) ?? 0 })}
                          title="minutos"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={importarBiblia} onChange={(e) => setImportarBiblia(e.target.checked)} />
              Importar o plano bíblico (1 capítulo/dia, 1189 capítulos) vinculado à “Leitura bíblica”
            </label>
            <p className="text-xs text-slate-500">O plano de filosofia (.md) pode ser importado depois em Leitura.</p>
          </div>
        </Card>
      )}

      {passo === 5 && (
        <Card titulo="Projetos ativos (máx. 2)">
          <div className="space-y-3">
            {projetos.map((p, i) => {
              const set = (x: Partial<typeof p>) => setProjetos(projetos.map((y, j) => (j === i ? { ...y, ...x } : y)))
              return (
                <div key={i} className="space-y-1 rounded-lg border border-slate-800 p-2">
                  <input className="w-full" placeholder="Projeto" value={p.titulo} onChange={(e) => set({ titulo: e.target.value })} />
                  <input
                    className="w-full"
                    placeholder="Definição de pronto (obrigatória)"
                    value={p.pronto}
                    onChange={(e) => set({ pronto: e.target.value })}
                  />
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={p.ativo} onChange={(e) => set({ ativo: e.target.checked })} /> ativo (senão vai para o
                    backlog)
                  </label>
                </div>
              )
            })}
            <Botao variante="fantasma" onClick={() => setProjetos([...projetos, { titulo: '', pronto: '', ativo: false }])}>
              + projeto
            </Botao>
          </div>
        </Card>
      )}

      <div className="flex gap-2">
        {passo === 0 ? (
          <Botao variante="fantasma" onClick={pular}>
            Pular
          </Botao>
        ) : (
          <Botao variante="fantasma" onClick={() => setPasso(passo - 1)}>
            Voltar
          </Botao>
        )}
        {passo < PASSOS.length - 1 ? (
          <Botao variante="primario" className="flex-1" onClick={() => setPasso(passo + 1)}>
            Próximo
          </Botao>
        ) : (
          <Botao variante="primario" className="flex-1" onClick={concluir} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Começar'}
          </Botao>
        )}
      </div>
    </Pagina>
  )
}
