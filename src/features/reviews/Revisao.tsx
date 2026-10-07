import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Abas, Botao, Campo, Card, cx, num, Pagina, SeloScore, Vazio } from '@/components/ui'
import { FormFechamento } from '@/features/finance/Financas'
import { FormCiclo } from '@/features/goals/Metas'
import { PropostaBlocos } from '@/features/week/PropostaBlocos'
import { proximoItem } from '@/lib/acoes'
import { cicloAtual, forcaHabito, pct, scoreSemanal, valorAtualMeta } from '@/lib/calc'
import { addDias, diaSemana, fmt, hoje, inicioMes, inicioSemana } from '@/lib/dates'
import { db } from '@/lib/db'
import { useAcao, useConfig, useTabela } from '@/lib/queries'
import type { Meta, ProjetoStatus } from '@/lib/types'

type Aba = 'semanal' | 'mensal' | 'ciclo' | 'historico'

export function Revisao() {
  const [aba, setAba] = useState<Aba>('semanal')
  return (
    <Pagina titulo="Revisão" voltar="/mais" sub="A revisão é o motor (P10)">
      <Abas
        valor={aba}
        onMudar={setAba}
        opcoes={[
          ['semanal', 'Semanal'],
          ['mensal', 'Mensal'],
          ['ciclo', 'Ciclo'],
          ['historico', 'Histórico'],
        ]}
      />
      {aba === 'semanal' && <RevisaoSemanal />}
      {aba === 'mensal' && <RevisaoMensal />}
      {aba === 'ciclo' && <RevisaoCiclo />}
      {aba === 'historico' && <Historico />}
    </Pagina>
  )
}

function Passos({ passo, total, titulos }: { passo: number; total: number; titulos: string[] }) {
  return (
    <div>
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={cx('h-1 flex-1 rounded-full', i <= passo ? 'bg-amber-500' : 'bg-slate-800')} />
        ))}
      </div>
      <div className="mt-2 text-xs text-slate-400">
        Passo {passo + 1} de {total} · <b className="text-slate-200">{titulos[passo]}</b>
      </div>
    </div>
  )
}

function Navegacao({
  passo,
  total,
  setPasso,
  onConcluir,
  concluindo,
}: {
  passo: number
  total: number
  setPasso: (n: number) => void
  onConcluir: () => void
  concluindo?: boolean
}) {
  return (
    <div className="flex gap-2">
      <Botao variante="fantasma" onClick={() => setPasso(passo - 1)} disabled={passo === 0}>
        Voltar
      </Botao>
      {passo < total - 1 ? (
        <Botao variante="primario" className="flex-1" onClick={() => setPasso(passo + 1)}>
          Próximo
        </Botao>
      ) : (
        <Botao variante="primario" className="flex-1" onClick={onConcluir} disabled={concluindo}>
          Concluir revisão
        </Botao>
      )}
    </div>
  )
}

// ---------- Semanal (§6.2) ----------

const PASSOS_SEMANA = ['Score da semana', 'Retrospectiva', 'Indicadores (lag)', 'Projetos', 'Plano da próxima semana', 'Agenda']

function RevisaoSemanal() {
  const dia = hoje()
  const cfg = useConfig()
  const habitos = useTabela('habitos')
  const checkins = useTabela('checkins')
  const tarefas = useTabela('tarefas')
  const projetos = useTabela('projetos')
  const metas = useTabela('metas')
  const registros = useTabela('meta_registros')
  const ciclos = useTabela('ciclos')
  const planos = useTabela('planos_leitura')
  const itens = useTabela('plano_itens')
  const revisoes = useTabela('revisoes')

  // Semana revisada: a atual a partir do dia da revisão; antes disso, a anterior.
  const semana = diaSemana(dia) >= (cfg?.dia_revisao ?? 7) ? inicioSemana(dia) : addDias(inicioSemana(dia), -7)
  const proxima = addDias(semana, 7)
  const [passo, setPasso] = useState(0)
  const [retro, setRetro] = useState({ funcionou: '', travou: '', muda: '', resposta_pergunta: '' })
  const [lag, setLag] = useState<Record<string, string>>({})
  const [feita, setFeita] = useState(false)

  const score = scoreSemanal(habitos, checkins, tarefas, semana)
  const ciclo = cicloAtual(ciclos, dia)
  const metasCiclo = ciclo ? metas.filter((m) => m.ciclo_id === ciclo.id) : []
  const planoSemanal = planos.find((p) => p.tipo === 'semanal')
  const itemSemana = planoSemanal ? proximoItem(itens, planoSemanal.id) : undefined
  const jaFeita = revisoes.some((r) => r.tipo === 'semanal' && r.periodo_inicio === semana)

  const concluir = useAcao(async () => {
    for (const m of metasCiclo) {
      const v = num(lag[m.id] ?? '')
      if (v != null && v !== valorAtualMeta(m, registros))
        await db.insert('meta_registros', [{ meta_id: m.id, data: dia, valor: v, nota: 'revisão semanal' }])
    }
    if (itemSemana && retro.resposta_pergunta) await db.update('plano_itens', itemSemana.id, { resposta_pergunta: retro.resposta_pergunta })
    await db.insert('revisoes', [
      {
        tipo: 'semanal',
        periodo_inicio: semana,
        periodo_fim: addDias(semana, 6),
        score: score.score,
        respostas: {
          ...retro,
          pergunta: itemSemana?.pergunta ?? null,
          faltou: score.itens.filter((i) => i.executado < i.planejado).map((i) => i.titulo),
        },
      },
    ])
    setFeita(true)
  }, ['revisoes', 'meta_registros', 'plano_itens'])

  if (feita) return <Vazio>Revisão semanal concluída ✓ Boa semana!</Vazio>

  return (
    <Card>
      <div className="space-y-4">
        <div className="text-sm text-slate-400">
          Semana de {fmt(semana)} a {fmt(addDias(semana, 6))}{' '}
          {jaFeita && <span className="text-emerald-400">· já revisada (pode refazer)</span>}
        </div>
        <Passos passo={passo} total={PASSOS_SEMANA.length} titulos={PASSOS_SEMANA} />

        {passo === 0 && (
          <div className="space-y-2">
            <SeloScore score={score.score} grande />
            <p className="text-sm text-slate-400">
              {score.executado} de {score.planejado} itens executados.
            </p>
            <ul className="space-y-0.5 text-sm">
              {score.itens
                .filter((i) => i.executado < i.planejado)
                .map((i) => (
                  <li key={i.id} className="text-slate-300">
                    · faltou: {i.titulo} ({i.executado}/{i.planejado})
                  </li>
                ))}
            </ul>
          </div>
        )}

        {passo === 1 && (
          <div className="space-y-3">
            <Campo rotulo="O que funcionou?">
              <textarea rows={2} value={retro.funcionou} onChange={(e) => setRetro({ ...retro, funcionou: e.target.value })} />
            </Campo>
            <Campo rotulo="O que travou?">
              <textarea rows={2} value={retro.travou} onChange={(e) => setRetro({ ...retro, travou: e.target.value })} />
            </Campo>
            <Campo rotulo="O que muda?">
              <textarea rows={2} value={retro.muda} onChange={(e) => setRetro({ ...retro, muda: e.target.value })} />
            </Campo>
            {itemSemana?.pergunta && (
              <Campo rotulo={`Pergunta da semana (${planoSemanal!.titulo}): ${itemSemana.pergunta}`}>
                <textarea
                  rows={3}
                  value={retro.resposta_pergunta || itemSemana.resposta_pergunta || ''}
                  onChange={(e) => setRetro({ ...retro, resposta_pergunta: e.target.value })}
                />
              </Campo>
            )}
          </div>
        )}

        {passo === 2 && (
          <div className="space-y-2">
            {metasCiclo.length === 0 && <Vazio>Sem metas no ciclo atual.</Vazio>}
            {metasCiclo.map((m) => (
              <Campo key={m.id} rotulo={`${m.titulo} — alvo ${m.valor_alvo} ${m.unidade ?? ''}`}>
                <input
                  inputMode="decimal"
                  placeholder={String(valorAtualMeta(m, registros))}
                  value={lag[m.id] ?? ''}
                  onChange={(e) => setLag({ ...lag, [m.id]: e.target.value })}
                />
              </Campo>
            ))}
          </div>
        )}

        {passo === 3 && <PassoProjetos />}

        {passo === 4 && (
          <div className="space-y-3">
            <div className="text-sm text-slate-400">Puxe tarefas para a semana de {fmt(proxima)}:</div>
            {projetos
              .filter((p) => p.status === 'ativo')
              .map((p) => (
                <div key={p.id}>
                  <div className="text-xs font-semibold text-slate-400">{p.titulo}</div>
                  <TarefasParaSemana projetoId={p.id} semana={proxima} />
                </div>
              ))}
            <div className="border-t border-slate-800 pt-3 text-sm">
              <div className="mb-1 text-xs font-semibold text-slate-400">Hábitos da próxima semana</div>
              <HabitosConfirmar />
            </div>
          </div>
        )}

        {passo === 5 && <PropostaBlocos segunda={proxima} />}

        <Navegacao
          passo={passo}
          total={PASSOS_SEMANA.length}
          setPasso={setPasso}
          onConcluir={() => concluir.mutate(undefined)}
          concluindo={concluir.isPending}
        />
      </div>
    </Card>
  )
}

function PassoProjetos() {
  const projetos = useTabela('projetos')
  const cfg = useConfig()
  const mudar = useAcao(
    (a: { id: string; status: ProjetoStatus }) =>
      db.update('projetos', a.id, { status: a.status, concluido_em: a.status === 'concluido' ? hoje() : null }),
    ['projetos'],
  )
  const vivos = projetos.filter((p) => p.status !== 'concluido' && p.status !== 'abandonado')
  const ativos = projetos.filter((p) => p.status === 'ativo').length
  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400">
        {ativos}/{cfg?.limite_projetos_ativos ?? 2} ativos
      </div>
      {vivos.length === 0 && <Vazio>Sem projetos em andamento.</Vazio>}
      {vivos.map((p) => (
        <div key={p.id} className="rounded-lg border border-slate-800 p-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex-1 font-medium">{p.titulo}</span>
            <select
              value={p.status}
              onChange={(e) => mudar.mutate({ id: p.id, status: e.target.value as ProjetoStatus })}
              className="py-1 text-xs"
            >
              <option value="backlog">backlog</option>
              <option value="ativo">ativo</option>
              <option value="pausado">pausado</option>
              <option value="concluido">concluído</option>
              <option value="abandonado">abandonado</option>
            </select>
          </div>
          {p.status === 'ativo' && <NovoPasso projetoId={p.id} />}
        </div>
      ))}
      <Link to="/projetos" className="text-xs text-amber-400">
        Abrir quadro de projetos →
      </Link>
    </div>
  )
}

function NovoPasso({ projetoId }: { projetoId: string }) {
  const tarefas = useTabela('tarefas').filter((t) => t.projeto_id === projetoId)
  const [t, setT] = useState('')
  const add = useAcao(async () => {
    await db.insert('tarefas', [
      { projeto_id: projetoId, titulo: t, estimativa_min: null, semana_inicio: null, concluida_em: null, ordem: tarefas.length },
    ])
    setT('')
  }, ['tarefas'])
  const prox = tarefas.filter((x) => !x.concluida_em).sort((a, b) => a.ordem - b.ordem)[0]
  return (
    <form
      className="mt-1.5 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (t.trim()) add.mutate(undefined)
      }}
    >
      <input
        className="flex-1 py-1 text-xs"
        placeholder={prox ? `Próximo: ${prox.titulo}` : 'Defina o próximo passo'}
        value={t}
        onChange={(e) => setT(e.target.value)}
      />
      <Botao type="submit" className="py-1 text-xs">
        +
      </Botao>
    </form>
  )
}

function TarefasParaSemana({ projetoId, semana }: { projetoId: string; semana: string }) {
  const tarefas = useTabela('tarefas')
    .filter((t) => t.projeto_id === projetoId && !t.concluida_em)
    .sort((a, b) => a.ordem - b.ordem)
  const toggle = useAcao(
    (a: { id: string; on: boolean }) => db.update('tarefas', a.id, { semana_inicio: a.on ? semana : null }),
    ['tarefas'],
  )
  if (!tarefas.length) return <div className="text-xs text-slate-500">Sem passos pendentes.</div>
  return (
    <ul className="space-y-1">
      {tarefas.map((t) => (
        <li key={t.id}>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={t.semana_inicio === semana}
              onChange={(e) => toggle.mutate({ id: t.id, on: e.target.checked })}
            />
            {t.titulo}
          </label>
        </li>
      ))}
    </ul>
  )
}

function HabitosConfirmar() {
  const habitos = useTabela('habitos')
  const toggle = useAcao((a: { id: string; ativo: boolean }) => db.update('habitos', a.id, { ativo: a.ativo }), ['habitos'])
  return (
    <ul className="space-y-1">
      {habitos.map((h) => (
        <li key={h.id}>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={h.ativo} onChange={(e) => toggle.mutate({ id: h.id, ativo: e.target.checked })} />
            {h.titulo}
          </label>
        </li>
      ))}
    </ul>
  )
}

// ---------- Mensal (§6.3) ----------

function RevisaoMensal() {
  const dia = hoje()
  const habitos = useTabela('habitos')
  const checkins = useTabela('checkins')
  const tarefas = useTabela('tarefas')
  const fechamentos = useTabela('fechamentos_mensais')
  // Fechamento do mês anterior (feito no 1º fim de semana do mês)
  const mes = inicioMes(addDias(inicioMes(dia), -1))
  const fimMes = addDias(inicioMes(dia), -1)
  const existente = fechamentos.find((f) => f.mes === mes) ?? null
  const semanas: string[] = []
  for (let s = inicioSemana(mes); s <= fimMes; s = addDias(s, 7)) if (addDias(s, 6) >= mes) semanas.push(s)
  const scores = semanas.map((s) => scoreSemanal(habitos, checkins, tarefas, s).score).filter((s): s is number => s != null)
  const media = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  const fracos = habitos
    .filter((h) => h.ativo)
    .map((h) => ({ h, f: forcaHabito(h, checkins, fimMes) }))
    .sort((a, b) => a.f - b.f)
    .slice(0, 3)
  const [salvo, setSalvo] = useState(false)
  const concluir = useAcao(async () => {
    await db.insert('revisoes', [
      {
        tipo: 'mensal',
        periodo_inicio: mes,
        periodo_fim: fimMes,
        score: media,
        respostas: { habitos_fracos: fracos.map((x) => x.h.titulo) },
      },
    ])
    setSalvo(true)
  }, ['revisoes'])

  return (
    <>
      <Card titulo={`Fechamento de ${fmt(mes, 'MMMM yyyy')}`}>
        <FormFechamento key={existente?.id ?? mes} inicial={existente} mesPadrao={mes} onFim={() => {}} />
      </Card>
      <Card titulo="Visão rápida do mês">
        <div className="space-y-2 text-sm">
          <div>
            Média do score: <SeloScore score={media} />
          </div>
          <div className="text-slate-400">Hábitos mais fracos: {fracos.map((x) => `${x.h.titulo} (${pct(x.f)})`).join(', ') || '—'}</div>
          <Link to="/financas" className="text-xs text-amber-400">
            Metas financeiras →
          </Link>
        </div>
      </Card>
      <Botao variante="primario" className="w-full" onClick={() => concluir.mutate(undefined)} disabled={salvo}>
        {salvo ? 'Fechamento mensal registrado ✓' : 'Concluir fechamento mensal'}
      </Botao>
    </>
  )
}

// ---------- Ciclo (§6.4) ----------

function RevisaoCiclo() {
  const dia = hoje()
  const ciclos = useTabela('ciclos')
  const metas = useTabela('metas')
  const registros = useTabela('meta_registros')
  const habitos = useTabela('habitos')
  const checkins = useTabela('checkins')
  const ciclo = cicloAtual(ciclos, dia)
  const [resultado, setResultado] = useState<Record<string, { status: Meta['status']; nota: string }>>({})
  const [licoes, setLicoes] = useState('')
  const [decisoes, setDecisoes] = useState<Record<string, 'manter' | 'ajustar' | 'aposentar'>>({})
  const [feito, setFeito] = useState(false)
  if (!ciclo) return <Vazio>Nenhum ciclo ativo para revisar.</Vazio>
  const doCiclo = metas.filter((m) => m.ciclo_id === ciclo.id)

  const concluir = async () => {
    for (const m of doCiclo) {
      const r = resultado[m.id]
      if (r) await db.update('metas', m.id, { status: r.status, resultado_nota: r.nota || null })
    }
    for (const [id, d] of Object.entries(decisoes)) if (d === 'aposentar') await db.update('habitos', id, { ativo: false })
    await db.update('ciclos', ciclo.id, { status: 'encerrado', retrospectiva: { licoes, decisoes } })
    await db.insert('revisoes', [
      { tipo: 'ciclo', periodo_inicio: ciclo.inicio, periodo_fim: ciclo.fim, score: null, respostas: { licoes, resultado, decisoes } },
    ])
    setFeito(true)
  }
  const salvar = useAcao(concluir, ['metas', 'habitos', 'ciclos', 'revisoes'])

  if (feito)
    return (
      <Card titulo="Próximo ciclo">
        <p className="mb-3 text-sm text-slate-400">
          Ciclo encerrado. Atualize a Roda da Vida em{' '}
          <Link className="text-amber-400" to="/areas">
            Áreas
          </Link>{' '}
          e crie o próximo ciclo:
        </p>
        <FormCiclo ciclos={ciclos} onFim={() => setFeito(false)} />
      </Card>
    )

  return (
    <>
      <Card titulo={`1. Resultado das metas — ${ciclo.nome ?? ''}`}>
        <div className="space-y-3">
          {doCiclo.map((m) => {
            const atual = valorAtualMeta(m, registros)
            const r = resultado[m.id] ?? { status: atual >= m.valor_alvo ? 'atingida' : 'parcial', nota: '' }
            return (
              <div key={m.id} className="space-y-1">
                <div className="text-sm">
                  {m.titulo}{' '}
                  <span className="text-slate-400">
                    ({atual}/{m.valor_alvo} {m.unidade})
                  </span>
                </div>
                <div className="flex gap-2">
                  <select
                    value={r.status}
                    onChange={(e) => setResultado({ ...resultado, [m.id]: { ...r, status: e.target.value as Meta['status'] } })}
                  >
                    <option value="atingida">atingida</option>
                    <option value="parcial">parcial</option>
                    <option value="nao_atingida">não atingida</option>
                  </select>
                  <input
                    className="flex-1"
                    placeholder="Lição"
                    value={r.nota}
                    onChange={(e) => setResultado({ ...resultado, [m.id]: { ...r, nota: e.target.value } })}
                  />
                </div>
              </div>
            )
          })}
          <Campo rotulo="Lições do ciclo">
            <textarea rows={3} value={licoes} onChange={(e) => setLicoes(e.target.value)} />
          </Campo>
        </div>
      </Card>
      <Card titulo="2. Roda da Vida">
        <Link to="/areas" className="text-sm text-amber-400">
          Dar novas notas por área →
        </Link>
      </Card>
      <Card titulo="3. Hábitos">
        <ul className="space-y-2">
          {habitos
            .filter((h) => h.ativo)
            .map((h) => (
              <li key={h.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1">
                  {h.titulo} <span className="text-xs text-slate-500">força {pct(forcaHabito(h, checkins, dia))}</span>
                </span>
                <select
                  value={decisoes[h.id] ?? 'manter'}
                  onChange={(e) => setDecisoes({ ...decisoes, [h.id]: e.target.value as 'manter' })}
                  className="py-1 text-xs"
                >
                  <option value="manter">manter</option>
                  <option value="ajustar">ajustar</option>
                  <option value="aposentar">aposentar</option>
                </select>
              </li>
            ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">Hábitos consolidados podem virar “manutenção” (sem meta) em Hábitos.</p>
      </Card>
      <Botao variante="primario" className="w-full" onClick={() => confirm('Encerrar o ciclo?') && salvar.mutate(undefined)}>
        Encerrar ciclo e criar o próximo
      </Botao>
    </>
  )
}

function Historico() {
  const revisoes = [...useTabela('revisoes')].sort((a, b) => b.periodo_inicio.localeCompare(a.periodo_inicio))
  if (!revisoes.length) return <Vazio>Nenhuma revisão registrada.</Vazio>
  return (
    <Card>
      <ul className="divide-y divide-slate-800">
        {revisoes.map((r) => {
          const resp = (r.respostas ?? {}) as Record<string, unknown>
          return (
            <li key={r.id} className="py-2 text-sm">
              <div className="flex justify-between">
                <span className="capitalize">
                  {r.tipo} · {fmt(r.periodo_inicio)}–{fmt(r.periodo_fim)}
                </span>
                {r.score != null && <SeloScore score={r.score} />}
              </div>
              {typeof resp.muda === 'string' && resp.muda && <div className="text-xs text-slate-400">Muda: {resp.muda}</div>}
              {typeof resp.licoes === 'string' && resp.licoes && <div className="text-xs text-slate-400">Lições: {resp.licoes}</div>}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
