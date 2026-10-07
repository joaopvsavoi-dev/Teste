import { CalendarPlus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Abas, Botao, Campo, Card, CorArea, cx, Folha, Pagina, Vazio } from '@/components/ui'
import { addDias, fmt, hoje, inicioSemana } from '@/lib/dates'
import { db } from '@/lib/db'
import { useAcao, useConfig, useTabela } from '@/lib/queries'
import type { Projeto, ProjetoStatus } from '@/lib/types'

const COLUNAS: [ProjetoStatus, string][] = [
  ['ativo', 'Ativos'],
  ['backlog', 'Backlog'],
  ['pausado', 'Pausados'],
  ['concluido', 'Concluídos'],
]

export function Projetos() {
  const projetos = useTabela('projetos')
  const areas = useTabela('areas')
  const cfg = useConfig()
  const [aba, setAba] = useState<ProjetoStatus>('ativo')
  const [aberto, setAberto] = useState<Projeto | 'novo' | null>(null)
  const limite = cfg?.limite_projetos_ativos ?? 2
  const ativos = projetos.filter((p) => p.status === 'ativo').length
  const lista = projetos
    .filter((p) => (aba === 'concluido' ? p.status === 'concluido' || p.status === 'abandonado' : p.status === aba))
    .sort((a, b) => a.ordem - b.ordem)

  return (
    <Pagina
      titulo="Projetos"
      voltar="/mais"
      sub={`${ativos}/${limite} ativos — um novo só entra quando outro sai (P7)`}
      acao={
        <Botao variante="primario" onClick={() => setAberto('novo')}>
          <Plus size={16} /> Novo
        </Botao>
      }
    >
      <Abas
        valor={aba}
        onMudar={setAba}
        opcoes={COLUNAS.map(([s, r]) => [
          s,
          `${r} (${projetos.filter((p) => (s === 'concluido' ? ['concluido', 'abandonado'].includes(p.status) : p.status === s)).length})`,
        ])}
      />
      {lista.length === 0 && <Vazio>Nada aqui.</Vazio>}
      {lista.map((p) => (
        <CardProjeto key={p.id} projeto={p} cor={areas.find((a) => a.id === p.area_id)?.cor} onAbrir={() => setAberto(p)} />
      ))}
      <Folha aberta={aberto !== null} onFechar={() => setAberto(null)} titulo={aberto === 'novo' ? 'Novo projeto' : 'Projeto'}>
        {aberto !== null && (
          <FormProjeto
            key={aberto === 'novo' ? 'n' : aberto.id}
            projeto={aberto === 'novo' ? null : aberto}
            onFim={() => setAberto(null)}
          />
        )}
      </Folha>
    </Pagina>
  )
}

function CardProjeto({ projeto, cor, onAbrir }: { projeto: Projeto; cor?: string | null; onAbrir: () => void }) {
  const tarefas = useTabela('tarefas')
    .filter((t) => t.projeto_id === projeto.id)
    .sort((a, b) => a.ordem - b.ordem)
  const feitas = tarefas.filter((t) => t.concluida_em).length
  return (
    <Card>
      <button onClick={onAbrir} className="w-full text-left">
        <div className="flex items-center gap-2">
          <CorArea cor={cor} />
          <span className="flex-1 font-medium">{projeto.titulo}</span>
          {projeto.prazo && <span className="text-xs text-slate-400">até {fmt(projeto.prazo)}</span>}
        </div>
        <p className="mt-1 text-xs text-slate-400">Pronto quando: {projeto.definicao_de_pronto}</p>
        {tarefas.length > 0 && (
          <p className="mt-1 text-xs text-slate-500">
            {feitas}/{tarefas.length} passos · próximo: {tarefas.find((t) => !t.concluida_em)?.titulo ?? '—'}
          </p>
        )}
      </button>
    </Card>
  )
}

function FormProjeto({ projeto, onFim }: { projeto: Projeto | null; onFim: () => void }) {
  const areas = useTabela('areas')
  const metas = useTabela('metas')
  const todasTarefas = useTabela('tarefas')
  const tarefas = projeto ? todasTarefas.filter((t) => t.projeto_id === projeto.id).sort((a, b) => a.ordem - b.ordem) : []
  const [f, setF] = useState({
    titulo: projeto?.titulo ?? '',
    definicao_de_pronto: projeto?.definicao_de_pronto ?? '',
    area_id: projeto?.area_id ?? '',
    meta_id: projeto?.meta_id ?? '',
    prazo: projeto?.prazo ?? '',
    status: projeto?.status ?? ('backlog' as ProjetoStatus),
  })
  const [passo, setPasso] = useState('')
  const semanaAtual = inicioSemana(hoje())

  const salvar = useAcao(async () => {
    const dados = {
      titulo: f.titulo,
      definicao_de_pronto: f.definicao_de_pronto,
      area_id: f.area_id || null,
      meta_id: f.meta_id || null,
      prazo: f.prazo || null,
      status: f.status,
      concluido_em: f.status === 'concluido' ? (projeto?.concluido_em ?? hoje()) : null,
    }
    if (projeto) await db.update('projetos', projeto.id, dados)
    else await db.insert('projetos', [{ ...dados, ordem: Date.now() % 100000 }])
    onFim()
  }, ['projetos'])
  const excluir = useAcao(async () => {
    if (!projeto) return
    for (const t of tarefas) await db.remove('tarefas', t.id)
    await db.remove('projetos', projeto.id)
    onFim()
  }, ['projetos', 'tarefas'])
  const addPasso = useAcao(async () => {
    await db.insert('tarefas', [
      { projeto_id: projeto!.id, titulo: passo, estimativa_min: null, semana_inicio: null, concluida_em: null, ordem: tarefas.length },
    ])
    setPasso('')
  }, ['tarefas'])
  const togglePasso = useAcao(
    (a: { id: string; patch: Partial<{ concluida_em: string | null; semana_inicio: string | null }> }) =>
      db.update('tarefas', a.id, a.patch),
    ['tarefas'],
  )
  const remPasso = useAcao((id: string) => db.remove('tarefas', id), ['tarefas'])

  return (
    <div className="space-y-3">
      <Campo rotulo="Projeto">
        <input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} autoFocus={!projeto} />
      </Campo>
      <Campo rotulo="Definição de pronto (obrigatória)">
        <textarea
          rows={2}
          value={f.definicao_de_pronto}
          onChange={(e) => setF({ ...f, definicao_de_pronto: e.target.value })}
          placeholder="Está pronto quando…"
        />
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo rotulo="Status">
          <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ProjetoStatus })}>
            <option value="backlog">Backlog</option>
            <option value="ativo">Ativo</option>
            <option value="pausado">Pausado</option>
            <option value="concluido">Concluído</option>
            <option value="abandonado">Abandonado</option>
          </select>
        </Campo>
        <Campo rotulo="Prazo">
          <input type="date" value={f.prazo} onChange={(e) => setF({ ...f, prazo: e.target.value })} />
        </Campo>
        <Campo rotulo="Área">
          <select value={f.area_id} onChange={(e) => setF({ ...f, area_id: e.target.value })}>
            <option value="">—</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Meta">
          <select value={f.meta_id} onChange={(e) => setF({ ...f, meta_id: e.target.value })}>
            <option value="">—</option>
            {metas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.titulo}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <div className="flex gap-2">
        <Botao
          variante="primario"
          className="flex-1"
          disabled={!f.titulo.trim() || !f.definicao_de_pronto.trim()}
          onClick={() => salvar.mutate(undefined)}
        >
          Salvar
        </Botao>
        {projeto && (
          <Botao variante="perigo" onClick={() => confirm('Excluir projeto e passos?') && excluir.mutate(undefined)}>
            Excluir
          </Botao>
        )}
      </div>

      {projeto && (
        <div className="border-t border-slate-800 pt-3">
          <h4 className="mb-2 text-sm font-semibold text-slate-300">Próximos passos</h4>
          <ul className="space-y-1.5">
            {tarefas.map((t) => {
              const naSemana = t.semana_inicio === semanaAtual
              return (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!t.concluida_em}
                    onChange={() =>
                      togglePasso.mutate({ id: t.id, patch: { concluida_em: t.concluida_em ? null : new Date().toISOString() } })
                    }
                  />
                  <span className={cx('flex-1', t.concluida_em && 'text-slate-500 line-through')}>{t.titulo}</span>
                  <button
                    title={naSemana ? 'Tirar do plano desta semana' : 'Puxar para o plano desta semana'}
                    className={cx('rounded p-1', naSemana ? 'text-amber-400' : 'text-slate-500')}
                    onClick={() => togglePasso.mutate({ id: t.id, patch: { semana_inicio: naSemana ? null : semanaAtual } })}
                  >
                    <CalendarPlus size={16} />
                  </button>
                  <button className="rounded p-1 text-slate-600 hover:text-red-400" onClick={() => remPasso.mutate(t.id)}>
                    <Trash2 size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (passo.trim()) addPasso.mutate(undefined)
            }}
          >
            <input className="flex-1" value={passo} onChange={(e) => setPasso(e.target.value)} placeholder="Novo passo concreto" />
            <Botao type="submit">Adicionar</Botao>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            <CalendarPlus size={12} className="inline" /> puxa o passo para o plano da semana ({fmt(semanaAtual)}–
            {fmt(addDias(semanaAtual, 6))}).
          </p>
        </div>
      )}
    </div>
  )
}
