import { ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Botao, Campo, Card, CorArea, cx, Folha, Pagina, SeloScore, Vazio } from '@/components/ui'
import { sincronizarAgenda } from '@/lib/acoes'
import { scoreSemanal } from '@/lib/calc'
import { addDias, dataLocal, diasDaSemana, fmt, hoje, horaLocal, inicioSemana, paraISO } from '@/lib/dates'
import { db, modoLocal } from '@/lib/db'
import { useAcao, useInvalidar, useTabela } from '@/lib/queries'
import type { Bloco } from '@/lib/types'
import { PropostaBlocos } from './PropostaBlocos'

export function Semana() {
  const dia = hoje()
  const [segunda, setSegunda] = useState(inicioSemana(dia))
  const habitos = useTabela('habitos')
  const checkins = useTabela('checkins')
  const tarefas = useTabela('tarefas')
  const projetos = useTabela('projetos')
  const blocos = useTabela('blocos')
  const areas = useTabela('areas')
  const [bloco, setBloco] = useState<Bloco | { data: string } | null>(null)
  const [sincronizando, setSincronizando] = useState(false)
  const invalidar = useInvalidar()

  const score = scoreSemanal(habitos, checkins, tarefas, segunda)
  const faltando = score.itens.filter((i) => i.executado < i.planejado)
  const doPlano = tarefas.filter((t) => t.semana_inicio === segunda)
  const vivos = blocos.filter((b) => !b.deleted_at)
  const toggle = useAcao(
    (t: { id: string; feita: boolean }) => db.update('tarefas', t.id, { concluida_em: t.feita ? null : new Date().toISOString() }),
    ['tarefas'],
  )

  async function sincronizar() {
    setSincronizando(true)
    const erro = await sincronizarAgenda()
    setSincronizando(false)
    if (erro) alert(erro)
    invalidar('blocos')
  }

  return (
    <Pagina
      titulo="Semana"
      sub={`${fmt(segunda)} – ${fmt(addDias(segunda, 6))}`}
      acao={
        <div className="flex items-center gap-1">
          <Botao variante="fantasma" onClick={() => setSegunda(addDias(segunda, -7))} aria-label="Semana anterior">
            <ChevronLeft size={18} />
          </Botao>
          <Botao variante="fantasma" onClick={() => setSegunda(inicioSemana(dia))} disabled={segunda === inicioSemana(dia)}>
            Hoje
          </Botao>
          <Botao variante="fantasma" onClick={() => setSegunda(addDias(segunda, 7))} aria-label="Próxima semana">
            <ChevronRight size={18} />
          </Botao>
        </div>
      }
    >
      <Card titulo="Score de execução">
        <div className="flex items-center gap-4">
          <SeloScore score={score.score} grande />
          <div className="text-sm text-slate-400">
            {score.executado} de {score.planejado} itens planejados
            <div className="text-xs text-slate-500">verde ≥ 85% · amarelo 65–84% · vermelho &lt; 65%</div>
          </div>
        </div>
        {faltando.length > 0 && (
          <ul className="mt-3 space-y-0.5 text-sm text-slate-400">
            {faltando.map((i) => (
              <li key={i.id}>
                · {i.titulo}{' '}
                <span className="text-slate-500">
                  ({i.executado}/{i.planejado})
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card titulo="Plano da semana (tarefas)">
        {doPlano.length === 0 ? (
          <Vazio>Puxe próximos passos dos projetos para esta semana (em Projetos ou na revisão semanal).</Vazio>
        ) : (
          <ul className="space-y-1.5">
            {doPlano.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!t.concluida_em} onChange={() => toggle.mutate({ id: t.id, feita: !!t.concluida_em })} />
                <span className={cx('flex-1', t.concluida_em && 'text-slate-500 line-through')}>{t.titulo}</span>
                <span className="text-xs text-slate-500">{projetos.find((p) => p.id === t.projeto_id)?.titulo}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        titulo="Agenda"
        acao={
          !modoLocal && (
            <Botao variante="fantasma" onClick={sincronizar} disabled={sincronizando}>
              <RefreshCw size={14} className={cx(sincronizando && 'animate-spin')} /> Google
            </Botao>
          )
        }
      >
        <div className="space-y-3">
          {diasDaSemana(segunda).map((d) => {
            const doDia = vivos.filter((b) => dataLocal(b.inicio) === d).sort((a, b) => a.inicio.localeCompare(b.inicio))
            return (
              <div key={d}>
                <div className="mb-1 flex items-center justify-between">
                  <span className={cx('text-xs font-semibold uppercase', d === dia ? 'text-amber-400' : 'text-slate-400')}>
                    {fmt(d, 'EEEE d')}
                  </span>
                  <button
                    className="rounded p-1 text-slate-500 hover:bg-slate-800"
                    onClick={() => setBloco({ data: d })}
                    aria-label="Novo bloco"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {doDia.length === 0 ? (
                  <div className="text-xs text-slate-600">—</div>
                ) : (
                  doDia.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setBloco(b)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm hover:bg-slate-800"
                    >
                      <span className="w-24 text-xs tabular-nums text-slate-400">
                        {horaLocal(b.inicio)}–{horaLocal(b.fim)}
                      </span>
                      <CorArea cor={areas.find((a) => a.id === b.area_id)?.cor} />
                      <span className="flex-1 truncate">{b.titulo}</span>
                      {!modoLocal && (
                        <span
                          className={cx(
                            'h-1.5 w-1.5 rounded-full',
                            b.sync_status === 'sincronizado' ? 'bg-emerald-500' : b.sync_status === 'erro' ? 'bg-red-500' : 'bg-amber-500',
                          )}
                          title={b.sync_status}
                        />
                      )}
                      {b.origem === 'google' && <span className="text-[10px] text-slate-500">G</span>}
                    </button>
                  ))
                )}
              </div>
            )
          })}
        </div>
      </Card>

      <Card titulo="Gerar blocos">
        <PropostaBlocos segunda={segunda} />
      </Card>

      <Folha aberta={bloco !== null} onFechar={() => setBloco(null)} titulo={bloco && 'id' in bloco ? 'Editar bloco' : 'Novo bloco'}>
        {bloco && <FormBloco key={'id' in bloco ? bloco.id : bloco.data} inicial={bloco} onFim={() => setBloco(null)} />}
      </Folha>
    </Pagina>
  )
}

function FormBloco({ inicial, onFim }: { inicial: Bloco | { data: string }; onFim: () => void }) {
  const areas = useTabela('areas')
  const habitos = useTabela('habitos')
  const projetos = useTabela('projetos')
  const existente = 'id' in inicial ? inicial : null
  const [f, setF] = useState({
    titulo: existente?.titulo ?? '',
    data: existente ? dataLocal(existente.inicio) : (inicial as { data: string }).data,
    ini: existente ? horaLocal(existente.inicio) : '09:00',
    fim: existente ? horaLocal(existente.fim) : '10:00',
    area_id: existente?.area_id ?? '',
    habito_id: existente?.habito_id ?? '',
    projeto_id: existente?.projeto_id ?? '',
  })
  const salvar = useAcao(async () => {
    const dados = {
      titulo: f.titulo,
      inicio: paraISO(f.data, f.ini),
      fim: paraISO(f.data, f.fim),
      area_id: f.area_id || null,
      habito_id: f.habito_id || null,
      projeto_id: f.projeto_id || null,
      sync_status: 'pendente' as const,
    }
    if (existente) await db.update('blocos', existente.id, dados)
    else await db.insert('blocos', [{ ...dados, tarefa_id: null, origem: 'app', gcal_event_id: null, deleted_at: null }])
    await sincronizarAgenda()
    onFim()
  }, ['blocos'])
  const excluir = useAcao(async () => {
    // Exclusão lógica: a exclusão também é sincronizada com o Google (§11.3)
    await db.update('blocos', existente!.id, { deleted_at: new Date().toISOString(), sync_status: 'pendente' })
    await sincronizarAgenda()
    onFim()
  }, ['blocos'])
  return (
    <div className="space-y-3">
      <Campo rotulo="Título">
        <input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
      </Campo>
      <div className="grid grid-cols-3 gap-2">
        <Campo rotulo="Dia">
          <input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} />
        </Campo>
        <Campo rotulo="Início">
          <input type="time" value={f.ini} onChange={(e) => setF({ ...f, ini: e.target.value })} />
        </Campo>
        <Campo rotulo="Fim">
          <input type="time" value={f.fim} onChange={(e) => setF({ ...f, fim: e.target.value })} />
        </Campo>
      </div>
      <div className="grid grid-cols-3 gap-2">
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
        <Campo rotulo="Hábito">
          <select value={f.habito_id} onChange={(e) => setF({ ...f, habito_id: e.target.value })}>
            <option value="">—</option>
            {habitos.map((h) => (
              <option key={h.id} value={h.id}>
                {h.titulo}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Projeto">
          <select value={f.projeto_id} onChange={(e) => setF({ ...f, projeto_id: e.target.value })}>
            <option value="">—</option>
            {projetos
              .filter((p) => p.status === 'ativo')
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.titulo}
                </option>
              ))}
          </select>
        </Campo>
      </div>
      {existente?.origem === 'google' && (
        <p className="text-xs text-slate-500">Criado no Google Agenda — vincule a uma área, hábito ou projeto.</p>
      )}
      <div className="flex gap-2">
        <Botao
          variante="primario"
          className="flex-1"
          disabled={!f.titulo.trim() || f.fim <= f.ini}
          onClick={() => salvar.mutate(undefined)}
        >
          Salvar
        </Botao>
        {existente && (
          <Botao variante="perigo" onClick={() => excluir.mutate(undefined)}>
            Excluir
          </Botao>
        )}
      </div>
    </div>
  )
}
