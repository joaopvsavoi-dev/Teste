import { BookOpen, CalendarClock, Check, NotebookPen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Botao, Card, CorArea, Pagina, SeloScore, Vazio } from '@/components/ui'
import { concluirItemPlano, proximoItem } from '@/lib/acoes'
import { cicloAtual, falhouOntem, forcaHabito, habitosDoDia, progressoSemanaX, scoreSemanal, semanaDoCiclo } from '@/lib/calc'
import { dataLocal, fmt, hoje, horaLocal, inicioSemana } from '@/lib/dates'
import { db } from '@/lib/db'
import { useAcao, useTabela } from '@/lib/queries'
import type { PlanoItem, PlanoLeitura, Tarefa } from '@/lib/types'
import { CheckinHabito } from './CheckinHabito'

export function Hoje() {
  const dia = hoje()
  const habitos = useTabela('habitos')
  const checkins = useTabela('checkins')
  const tarefas = useTabela('tarefas')
  const projetos = useTabela('projetos')
  const blocos = useTabela('blocos')
  const ciclos = useTabela('ciclos')
  const planos = useTabela('planos_leitura')
  const itens = useTabela('plano_itens')
  const diario = useTabela('diario')
  const areas = useTabela('areas')

  const ciclo = cicloAtual(ciclos, dia)
  const doDia = habitosDoDia(habitos, checkins, dia)
  const feitosHoje = doDia.filter((h) => checkins.some((c) => c.habito_id === h.id && c.data === dia)).length
  const score = scoreSemanal(habitos, checkins, tarefas, inicioSemana(dia))
  const blocosHoje = blocos.filter((b) => !b.deleted_at && dataLocal(b.inicio) === dia).sort((a, b) => a.inicio.localeCompare(b.inicio))
  const ativos = projetos.filter((p) => p.status === 'ativo')
  const diarioFeito = diario.some((d) => d.data === dia)
  const corArea = (id: string | null) => areas.find((a) => a.id === id)?.cor

  return (
    <Pagina
      titulo="Hoje"
      sub={
        <>
          {fmt(dia, "EEEE, d 'de' MMMM")}
          {ciclo && (semanaDoCiclo(ciclo, dia) >= 1 ? ` · semana ${Math.min(13, semanaDoCiclo(ciclo, dia))} do ciclo` : ` · ${ciclo.nome ?? 'ciclo'} começa em ${fmt(ciclo.inicio)}`)}
        </>
      }
      acao={
        <Link to="/semana" className="text-right">
          <div className="text-[10px] tracking-wide text-slate-500 uppercase">Semana</div>
          <SeloScore score={score.score} />
        </Link>
      }
    >
      <Card titulo={`Hábitos · ${feitosHoje}/${doDia.length}`}>
        {doDia.length === 0 ? (
          <Vazio>
            Nenhum hábito esperado hoje.{' '}
            <Link to="/habitos" className="text-amber-400">
              Criar hábito
            </Link>
          </Vazio>
        ) : (
          <ul className="divide-y divide-slate-800">
            {doDia.map((h) => (
              <CheckinHabito
                key={h.id}
                habito={h}
                data={dia}
                checkin={checkins.find((c) => c.habito_id === h.id && c.data === dia)}
                alertaDuasVezes={falhouOntem(h, checkins, dia)}
                progressoX={h.freq === 'x_por_semana' ? progressoSemanaX(h, checkins, dia) : undefined}
                forca={forcaHabito(h, checkins, dia)}
              />
            ))}
          </ul>
        )}
      </Card>

      {planos.length > 0 && (
        <Card
          titulo="Leitura"
          acao={
            <Link to="/leitura" className="text-xs text-amber-400">
              planos
            </Link>
          }
        >
          <div className="space-y-3">
            {planos.map((p) => (
              <ItemLeitura
                key={p.id}
                plano={p}
                item={proximoItem(itens, p.id)}
                total={itens.filter((i) => i.plano_id === p.id).length}
                dia={dia}
              />
            ))}
          </div>
        </Card>
      )}

      <Card
        titulo="Blocos de hoje"
        acao={
          <Link to="/semana" className="text-xs text-amber-400">
            agenda
          </Link>
        }
      >
        {blocosHoje.length === 0 ? (
          <Vazio>Sem blocos hoje. Os blocos são gerados na revisão semanal.</Vazio>
        ) : (
          <ul className="space-y-1.5">
            {blocosHoje.map((b) => (
              <li key={b.id} className="flex items-center gap-2 text-sm">
                <CalendarClock size={15} className="text-slate-500" />
                <span className="w-24 text-slate-400 tabular-nums">
                  {horaLocal(b.inicio)}–{horaLocal(b.fim)}
                </span>
                <CorArea cor={corArea(b.area_id)} />
                <span className="truncate">{b.titulo}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        titulo="Próximos passos"
        acao={
          <Link to="/projetos" className="text-xs text-amber-400">
            projetos
          </Link>
        }
      >
        {ativos.length === 0 ? (
          <Vazio>Nenhum projeto ativo.</Vazio>
        ) : (
          <ul className="space-y-2">
            {ativos.map((p) => {
              const prox = tarefas.filter((t) => t.projeto_id === p.id && !t.concluida_em).sort((a, b) => a.ordem - b.ordem)[0]
              return (
                <li key={p.id} className="text-sm">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <CorArea cor={corArea(p.area_id)} /> {p.titulo}
                  </div>
                  {prox ? <PassoCheck tarefa={prox} /> : <div className="pl-4 text-slate-500">Defina o próximo passo.</div>}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Link to="/diario" className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <NotebookPen className={diarioFeito ? 'text-emerald-400' : 'text-slate-400'} />
        <div className="flex-1">
          <div className="font-medium">Exame noturno</div>
          <div className="text-xs text-slate-400">{diarioFeito ? 'Registrado hoje ✓' : '2–5 minutos, à noite'}</div>
        </div>
      </Link>
    </Pagina>
  )
}

function PassoCheck({ tarefa }: { tarefa: Tarefa }) {
  const concluir = useAcao(() => db.update('tarefas', tarefa.id, { concluida_em: new Date().toISOString() }), ['tarefas'])
  return (
    <label className="mt-1 flex items-center gap-2 pl-4">
      <input type="checkbox" checked={false} onChange={() => concluir.mutate(undefined)} />
      {tarefa.titulo}
    </label>
  )
}

function ItemLeitura({ plano, item, total, dia }: { plano: PlanoLeitura; item?: PlanoItem; total: number; dia: string }) {
  const concluir = useAcao(() => concluirItemPlano(item!, plano, dia), ['plano_itens', 'checkins'])
  if (!item) return <div className="text-sm text-emerald-400">{plano.titulo}: concluído 🎉</div>
  const pos = `${item.ordem}/${total}`
  if (plano.tipo === 'semanal') {
    return (
      <div className="rounded-xl bg-slate-800/40 p-3 text-sm">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <BookOpen size={14} /> {plano.titulo} · semana {item.semana ?? item.ordem} {item.modulo && `· ${item.modulo}`}
        </div>
        <div className="mt-1 font-medium">{item.titulo}</div>
        {item.leitura && <p className="mt-1 whitespace-pre-line text-slate-300">📖 {item.leitura}</p>}
        {item.pratica && <p className="mt-1 text-slate-300">🛠 {item.pratica}</p>}
        {item.pergunta && <p className="mt-1 text-amber-200">❓ {item.pergunta}</p>}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3">
      <BookOpen size={18} className="text-slate-500" />
      <div className="flex-1">
        <div className="font-medium">
          {item.livro} {item.capitulo}
        </div>
        <div className="text-xs text-slate-500">
          {plano.titulo} · {pos} · {item.fase?.split('—')[0].trim()}
        </div>
      </div>
      <Botao variante="primario" onClick={() => concluir.mutate(undefined)} disabled={concluir.isPending}>
        <Check size={16} /> Li
      </Botao>
    </div>
  )
}
