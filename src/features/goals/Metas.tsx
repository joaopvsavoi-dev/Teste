import { Plus } from 'lucide-react'
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Barra, Botao, Campo, Card, CorArea, Folha, num, Pagina, Vazio } from '@/components/ui'
import { cicloAtual, fimDoCiclo, pct, progressoIdeal, progressoMeta, semanaDoCiclo, SEMANAS_CICLO, valorAtualMeta } from '@/lib/calc'
import { addDias, fmt, hoje, inicioSemana } from '@/lib/dates'
import { db } from '@/lib/db'
import { useAcao, useTabela } from '@/lib/queries'
import type { Area, Ciclo, Meta, MetaRegistro } from '@/lib/types'

export const MAX_METAS = 5

export function Metas() {
  const dia = hoje()
  const ciclos = useTabela('ciclos')
  const metas = useTabela('metas')
  const registros = useTabela('meta_registros')
  const areas = useTabela('areas')
  const habitos = useTabela('habitos')
  const projetos = useTabela('projetos')
  const ciclo = cicloAtual(ciclos, dia)
  const [novaMeta, setNovaMeta] = useState(false)
  const [novoCiclo, setNovoCiclo] = useState(false)
  const [registrar, setRegistrar] = useState<Meta | null>(null)

  const doCiclo = ciclo ? metas.filter((m) => m.ciclo_id === ciclo.id) : []

  return (
    <Pagina
      titulo="Metas"
      sub={
        ciclo ? (
          <>
            {ciclo.nome ?? 'Ciclo'} · {fmt(ciclo.inicio)} → {fmt(ciclo.fim)} · semana {Math.min(13, Math.max(1, semanaDoCiclo(ciclo, dia)))}
            /{SEMANAS_CICLO}
            {semanaDoCiclo(ciclo, dia) > SEMANAS_CICLO && ' (revisão)'}
          </>
        ) : (
          'Nenhum ciclo ativo'
        )
      }
      acao={
        ciclo ? (
          <Botao variante="primario" onClick={() => setNovaMeta(true)} disabled={doCiclo.length >= MAX_METAS}>
            <Plus size={16} /> Meta
          </Botao>
        ) : (
          <Botao variante="primario" onClick={() => setNovoCiclo(true)}>
            <Plus size={16} /> Ciclo
          </Botao>
        )
      }
    >
      {!ciclo && <Vazio>Crie um ciclo de 12 semanas (+1 de revisão) para definir até {MAX_METAS} metas.</Vazio>}
      {ciclo?.tema && <p className="text-sm text-slate-300 italic">“{ciclo.tema}”</p>}
      {ciclo && doCiclo.length === 0 && <Vazio>Sem metas. No máximo 1 por área e {MAX_METAS} por ciclo (P6).</Vazio>}
      {ciclo &&
        doCiclo.map((m) => (
          <CardMeta
            key={m.id}
            meta={m}
            ciclo={ciclo}
            area={areas.find((a) => a.id === m.area_id)}
            registros={registros.filter((r) => r.meta_id === m.id)}
            habitos={habitos.filter((h) => h.meta_id === m.id).map((h) => h.titulo)}
            projetos={projetos.filter((p) => p.meta_id === m.id).map((p) => `${p.titulo} (${p.status})`)}
            onRegistrar={() => setRegistrar(m)}
          />
        ))}
      {ciclo && (
        <div className="text-center">
          <Botao variante="fantasma" onClick={() => setNovoCiclo(true)}>
            Planejar próximo ciclo
          </Botao>
        </div>
      )}
      <Folha aberta={novaMeta} onFechar={() => setNovaMeta(false)} titulo="Nova meta do ciclo">
        {ciclo && <FormMeta ciclo={ciclo} areas={areas} existentes={doCiclo} onFim={() => setNovaMeta(false)} />}
      </Folha>
      <Folha aberta={novoCiclo} onFechar={() => setNovoCiclo(false)} titulo="Novo ciclo">
        <FormCiclo ciclos={ciclos} onFim={() => setNovoCiclo(false)} />
      </Folha>
      <Folha aberta={!!registrar} onFechar={() => setRegistrar(null)} titulo={`Atualizar: ${registrar?.titulo ?? ''}`}>
        {registrar && <FormRegistro meta={registrar} atual={valorAtualMeta(registrar, registros)} onFim={() => setRegistrar(null)} />}
      </Folha>
    </Pagina>
  )
}

function CardMeta({
  meta,
  ciclo,
  area,
  registros,
  habitos,
  projetos,
  onRegistrar,
}: {
  meta: Meta
  ciclo: Ciclo
  area?: Area
  registros: MetaRegistro[]
  habitos: string[]
  projetos: string[]
  onRegistrar: () => void
}) {
  const dia = hoje()
  const atual = valorAtualMeta(meta, registros)
  const prog = progressoMeta(meta, atual)
  const ideal = progressoIdeal(ciclo, dia)
  const ordenados = [...registros].sort((a, b) => a.data.localeCompare(b.data))
  // Gráfico: real × ideal por semana do ciclo
  const pontos = Array.from({ length: SEMANAS_CICLO + 1 }, (_, s) => {
    const data = addDias(ciclo.inicio, s * 7)
    const ate = ordenados.filter((r) => r.data <= data)
    const real = data <= dia ? (ate.length ? ate[ate.length - 1].valor : meta.valor_inicial) : null
    return { semana: s, ideal: meta.valor_inicial + (meta.valor_alvo - meta.valor_inicial) * (s / SEMANAS_CICLO), real }
  })
  return (
    <Card>
      <div className="flex items-start gap-2">
        <CorArea cor={area?.cor} />
        <div className="flex-1">
          <div className="font-medium">{meta.titulo}</div>
          <div className="text-xs text-slate-400">
            {area?.nome} · {atual} / {meta.valor_alvo} {meta.unidade} · {pct(prog)} (ideal {pct(ideal)})
          </div>
        </div>
        <Botao onClick={onRegistrar}>Atualizar</Botao>
      </div>
      <div className="mt-3">
        <Barra valor={prog} ideal={ideal} cor={prog >= ideal ? 'bg-emerald-500' : 'bg-amber-500'} />
      </div>
      <div className="mt-3 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pontos} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis dataKey="semana" tick={{ fill: '#64748b', fontSize: 10 }} stroke="#334155" />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} stroke="#334155" domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }}
              labelFormatter={(s) => `Semana ${s}`}
            />
            <Line dataKey="ideal" stroke="#64748b" strokeDasharray="4 4" dot={false} name="Ideal" />
            <Line dataKey="real" stroke="#f59e0b" strokeWidth={2} connectNulls={false} dot={{ r: 2 }} name="Real" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {meta.porque && <p className="mt-2 text-xs text-slate-400">Por quê: {meta.porque}</p>}
      {(habitos.length > 0 || projetos.length > 0) && (
        <div className="mt-2 space-y-0.5 text-xs text-slate-400">
          {habitos.length > 0 && <div>Hábitos (lead): {habitos.join(', ')}</div>}
          {projetos.length > 0 && <div>Projetos: {projetos.join(', ')}</div>}
        </div>
      )}
    </Card>
  )
}

export function FormMeta({ ciclo, areas, existentes, onFim }: { ciclo: Ciclo; areas: Area[]; existentes: Meta[]; onFim: () => void }) {
  const livres = areas.filter((a) => !existentes.some((m) => m.area_id === a.id))
  const [f, setF] = useState({ titulo: '', porque: '', area_id: livres[0]?.id ?? '', unidade: '', valor_inicial: '0', valor_alvo: '' })
  const criar = useAcao(async () => {
    await db.insert('metas', [
      {
        ciclo_id: ciclo.id,
        area_id: f.area_id || null,
        titulo: f.titulo,
        porque: f.porque || null,
        unidade: f.unidade || null,
        valor_inicial: num(f.valor_inicial) ?? 0,
        valor_alvo: num(f.valor_alvo)!,
        status: 'em_andamento',
        resultado_nota: null,
      },
    ])
    onFim()
  }, ['metas'])
  const ok = f.titulo.trim() && num(f.valor_alvo) != null && existentes.length < MAX_METAS
  return (
    <div className="space-y-3">
      <Campo rotulo="Resultado mensurável (lag)">
        <input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Correr 200 km no ciclo" />
      </Campo>
      <Campo rotulo="Área" dica="No máximo 1 meta por área.">
        <select value={f.area_id} onChange={(e) => setF({ ...f, area_id: e.target.value })}>
          {livres.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      </Campo>
      <div className="grid grid-cols-3 gap-2">
        <Campo rotulo="Inicial">
          <input inputMode="decimal" value={f.valor_inicial} onChange={(e) => setF({ ...f, valor_inicial: e.target.value })} />
        </Campo>
        <Campo rotulo="Alvo">
          <input inputMode="decimal" value={f.valor_alvo} onChange={(e) => setF({ ...f, valor_alvo: e.target.value })} />
        </Campo>
        <Campo rotulo="Unidade">
          <input value={f.unidade} onChange={(e) => setF({ ...f, unidade: e.target.value })} placeholder="km" />
        </Campo>
      </div>
      <Campo rotulo="Por quê?">
        <textarea rows={2} value={f.porque} onChange={(e) => setF({ ...f, porque: e.target.value })} />
      </Campo>
      <Botao variante="primario" className="w-full" disabled={!ok || !livres.length} onClick={() => criar.mutate(undefined)}>
        Criar meta
      </Botao>
    </div>
  )
}

export function FormCiclo({ ciclos, onFim }: { ciclos: Ciclo[]; onFim: () => void }) {
  const dia = hoje()
  const proxSeg = addDias(inicioSemana(dia), 7)
  const [f, setF] = useState({ nome: `Ciclo ${ciclos.length + 1}`, inicio: proxSeg, tema: '' })
  const criar = useAcao(async () => {
    const inicio = inicioSemana(f.inicio)
    await db.insert('ciclos', [
      {
        nome: f.nome,
        inicio,
        fim: fimDoCiclo(inicio),
        tema: f.tema || null,
        status: inicio <= dia ? 'ativo' : 'planejado',
        retrospectiva: null,
      },
    ])
    onFim()
  }, ['ciclos'])
  return (
    <div className="space-y-3">
      <Campo rotulo="Nome">
        <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      </Campo>
      <Campo rotulo="Início (segunda-feira)" dica={`12 semanas + 1 de revisão → termina em ${fmt(fimDoCiclo(inicioSemana(f.inicio)))}`}>
        <input type="date" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} />
      </Campo>
      <Campo rotulo="Tema (opcional)">
        <input value={f.tema} onChange={(e) => setF({ ...f, tema: e.target.value })} />
      </Campo>
      <Botao variante="primario" className="w-full" onClick={() => criar.mutate(undefined)}>
        Criar ciclo
      </Botao>
    </div>
  )
}

export function FormRegistro({ meta, atual, onFim }: { meta: Meta; atual: number; onFim: () => void }) {
  const [valor, setValor] = useState(String(atual))
  const [nota, setNota] = useState('')
  const salvar = useAcao(async () => {
    await db.insert('meta_registros', [{ meta_id: meta.id, data: hoje(), valor: num(valor)!, nota: nota || null }])
    onFim()
  }, ['meta_registros'])
  return (
    <div className="space-y-3">
      <Campo rotulo={`Valor atual (${meta.unidade ?? ''})`}>
        <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
      </Campo>
      <Campo rotulo="Nota">
        <input value={nota} onChange={(e) => setNota(e.target.value)} />
      </Campo>
      <Botao variante="primario" className="w-full" disabled={num(valor) == null} onClick={() => salvar.mutate(undefined)}>
        Registrar
      </Botao>
    </div>
  )
}
