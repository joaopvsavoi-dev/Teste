import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Barra, Botao, brl, Campo, Card, Folha, num, Pagina, Vazio } from '@/components/ui'
import { pct, taxaPoupanca, variacaoPatrimonio } from '@/lib/calc'
import { fmt, hoje, inicioMes } from '@/lib/dates'
import { db } from '@/lib/db'
import { useAcao, useTabela } from '@/lib/queries'
import type { FechamentoMensal, MetaFinanceira } from '@/lib/types'

// Decisão em aberto (§14.5): categorias macro — sugestão de 8.
export const CATEGORIAS = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Pessoal', 'Outros']

export function Financas() {
  const fechamentos = useTabela('fechamentos_mensais')
  const metasFin = useTabela('metas_financeiras')
  const [aberto, setAberto] = useState<FechamentoMensal | 'novo' | null>(null)
  const [meta, setMeta] = useState<MetaFinanceira | 'nova' | null>(null)
  const ordem = [...fechamentos].sort((a, b) => a.mes.localeCompare(b.mes))
  const ultimo = ordem[ordem.length - 1]
  const dados = ordem.map((f) => ({ mes: fmt(f.mes, 'MMM/yy'), patrimonio: f.patrimonio_investido, taxa: (taxaPoupanca(f) ?? 0) * 100 }))

  return (
    <Pagina
      titulo="Finanças"
      voltar="/mais"
      sub="Fechamento mensal — 1º fim de semana do mês"
      acao={
        <Botao variante="primario" onClick={() => setAberto('novo')}>
          <Plus size={16} /> Fechamento
        </Botao>
      }
    >
      {ultimo && (
        <div className="grid grid-cols-3 gap-2">
          <Kpi rotulo="Patrimônio" valor={brl(ultimo.patrimonio_investido)} />
          <Kpi rotulo="Taxa de poupança" valor={pct(taxaPoupanca(ultimo))} />
          <Kpi rotulo="Variação" valor={brl(variacaoPatrimonio(ultimo, ordem[ordem.length - 2]))} />
        </div>
      )}
      {dados.length > 1 && (
        <Card titulo="Patrimônio e taxa de poupança">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dados} margin={{ top: 5, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 10 }} stroke="#334155" />
                <YAxis
                  yAxisId="r"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  stroke="#334155"
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                />
                <YAxis yAxisId="p" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} stroke="#334155" unit="%" />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }} />
                <Bar yAxisId="p" dataKey="taxa" fill="#334155" name="Poupança %" />
                <Line yAxisId="r" dataKey="patrimonio" stroke="#f59e0b" strokeWidth={2} name="Patrimônio" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card
        titulo="Metas financeiras"
        acao={
          <Botao variante="fantasma" onClick={() => setMeta('nova')}>
            <Plus size={14} />
          </Botao>
        }
      >
        {metasFin.length === 0 ? (
          <Vazio>Ex.: taxa de poupança ≥ 25%, reserva de emergência, aporte acumulado.</Vazio>
        ) : (
          <ul className="space-y-3">
            {metasFin.map((m) => {
              const atual = valorMetaFin(m, ordem)
              return (
                <li key={m.id}>
                  <button className="w-full text-left" onClick={() => setMeta(m)}>
                    <div className="flex justify-between text-sm">
                      <span>{m.titulo}</span>
                      <span className="text-slate-400">
                        {m.tipo === 'taxa_poupanca' ? `${pct(atual)} / ${pct(m.valor_alvo)}` : `${brl(atual)} / ${brl(m.valor_alvo)}`}
                      </span>
                    </div>
                    <div className="mt-1">
                      <Barra valor={atual != null && m.valor_alvo ? atual / m.valor_alvo : 0} />
                    </div>
                    {m.prazo && <div className="mt-0.5 text-xs text-slate-500">prazo {fmt(m.prazo)}</div>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card titulo="Fechamentos">
        {ordem.length === 0 ? (
          <Vazio>Nenhum fechamento ainda.</Vazio>
        ) : (
          <ul className="divide-y divide-slate-800">
            {[...ordem].reverse().map((f) => (
              <li key={f.id}>
                <button className="flex w-full justify-between py-2 text-left text-sm" onClick={() => setAberto(f)}>
                  <span className="capitalize">{fmt(f.mes, 'MMMM yyyy')}</span>
                  <span className="text-slate-400">
                    renda {brl(f.renda)} · aporte {brl(f.aporte)} · {pct(taxaPoupanca(f))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Folha aberta={aberto !== null} onFechar={() => setAberto(null)} titulo="Fechamento mensal">
        {aberto !== null && (
          <FormFechamento
            key={aberto === 'novo' ? 'n' : aberto.id}
            inicial={aberto === 'novo' ? null : aberto}
            onFim={() => setAberto(null)}
          />
        )}
      </Folha>
      <Folha aberta={meta !== null} onFechar={() => setMeta(null)} titulo="Meta financeira">
        {meta !== null && (
          <FormMetaFin key={meta === 'nova' ? 'n' : meta.id} meta={meta === 'nova' ? null : meta} onFim={() => setMeta(null)} />
        )}
      </Folha>
    </Pagina>
  )
}

function Kpi({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="text-[11px] text-slate-400">{rotulo}</div>
      <div className="mt-0.5 font-semibold tabular-nums">{valor}</div>
    </div>
  )
}

export function valorMetaFin(m: MetaFinanceira, ordem: FechamentoMensal[]): number | null {
  const ultimo = ordem[ordem.length - 1]
  if (!ultimo) return null
  if (m.tipo === 'taxa_poupanca') return taxaPoupanca(ultimo)
  if (m.tipo === 'aporte_acumulado') return ordem.reduce((s, f) => s + (f.aporte ?? 0), 0)
  return ultimo.patrimonio_investido
}

export function FormFechamento({ inicial, mesPadrao, onFim }: { inicial: FechamentoMensal | null; mesPadrao?: string; onFim: () => void }) {
  const fechamentos = useTabela('fechamentos_mensais')
  const [mes, setMes] = useState((inicial?.mes ?? mesPadrao ?? inicioMes(hoje())).slice(0, 7))
  const [renda, setRenda] = useState(inicial?.renda?.toString() ?? '')
  const [cats, setCats] = useState<Record<string, string>>(
    Object.fromEntries(CATEGORIAS.map((c) => [c, inicial?.gastos_categorias?.[c]?.toString() ?? ''])),
  )
  const [aporte, setAporte] = useState(inicial?.aporte?.toString() ?? '')
  const [patrimonio, setPatrimonio] = useState(inicial?.patrimonio_investido?.toString() ?? '')
  const [obs, setObs] = useState(inicial?.observacoes ?? '')
  const gastos = Object.values(cats).reduce((s, v) => s + (num(v) ?? 0), 0)
  const taxa = taxaPoupanca({ renda: num(renda), aporte: num(aporte) })
  const anterior = [...fechamentos].filter((f) => f.mes < `${mes}-01`).sort((a, b) => b.mes.localeCompare(a.mes))[0]

  const salvar = useAcao(async () => {
    const dados = {
      mes: `${mes}-01`,
      renda: num(renda),
      gastos_total: gastos,
      gastos_categorias: Object.fromEntries(
        Object.entries(cats)
          .filter(([, v]) => num(v) != null)
          .map(([k, v]) => [k, num(v)!]),
      ),
      aporte: num(aporte),
      patrimonio_investido: num(patrimonio),
      observacoes: obs || null,
    }
    if (inicial) await db.update('fechamentos_mensais', inicial.id, dados)
    else await db.upsert('fechamentos_mensais', dados, ['mes'])
    onFim()
  }, ['fechamentos_mensais'])
  const excluir = useAcao(async () => {
    await db.remove('fechamentos_mensais', inicial!.id)
    onFim()
  }, ['fechamentos_mensais'])

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Campo rotulo="Mês">
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
        </Campo>
        <Campo rotulo="Renda (R$)">
          <input inputMode="decimal" value={renda} onChange={(e) => setRenda(e.target.value)} />
        </Campo>
      </div>
      <div className="text-xs font-semibold text-slate-400 uppercase">Gastos por categoria · total {brl(gastos)}</div>
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIAS.map((c) => (
          <Campo key={c} rotulo={c}>
            <input inputMode="decimal" value={cats[c]} onChange={(e) => setCats({ ...cats, [c]: e.target.value })} />
          </Campo>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Campo rotulo="Aporte (R$)">
          <input inputMode="decimal" value={aporte} onChange={(e) => setAporte(e.target.value)} />
        </Campo>
        <Campo rotulo="Patrimônio investido (R$)">
          <input inputMode="decimal" value={patrimonio} onChange={(e) => setPatrimonio(e.target.value)} />
        </Campo>
      </div>
      <div className="rounded-lg bg-slate-800/60 p-3 text-sm">
        Taxa de poupança: <b>{pct(taxa, 1)}</b>
        {anterior?.patrimonio_investido != null && num(patrimonio) != null && (
          <>
            {' '}
            · variação do patrimônio: <b>{brl(num(patrimonio)! - anterior.patrimonio_investido)}</b>
          </>
        )}
      </div>
      <Campo rotulo="Observações">
        <textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
      </Campo>
      <div className="flex gap-2">
        <Botao variante="primario" className="flex-1" onClick={() => salvar.mutate(undefined)}>
          Salvar fechamento
        </Botao>
        {inicial && (
          <Botao variante="perigo" onClick={() => confirm('Excluir fechamento?') && excluir.mutate(undefined)}>
            Excluir
          </Botao>
        )}
      </div>
    </div>
  )
}

function FormMetaFin({ meta, onFim }: { meta: MetaFinanceira | null; onFim: () => void }) {
  const [f, setF] = useState({
    titulo: meta?.titulo ?? '',
    tipo: meta?.tipo ?? 'taxa_poupanca',
    valor: meta ? (meta.tipo === 'taxa_poupanca' ? String(meta.valor_alvo * 100) : String(meta.valor_alvo)) : '',
    prazo: meta?.prazo ?? '',
  })
  const salvar = useAcao(async () => {
    const v = num(f.valor)!
    const dados = {
      titulo: f.titulo,
      tipo: f.tipo as MetaFinanceira['tipo'],
      valor_alvo: f.tipo === 'taxa_poupanca' ? v / 100 : v,
      prazo: f.prazo || null,
    }
    if (meta) await db.update('metas_financeiras', meta.id, dados)
    else await db.insert('metas_financeiras', [dados])
    onFim()
  }, ['metas_financeiras'])
  const excluir = useAcao(async () => {
    await db.remove('metas_financeiras', meta!.id)
    onFim()
  }, ['metas_financeiras'])
  return (
    <div className="space-y-3">
      <Campo rotulo="Título">
        <input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo rotulo="Tipo">
          <select value={f.tipo ?? ''} onChange={(e) => setF({ ...f, tipo: e.target.value as NonNullable<MetaFinanceira['tipo']> })}>
            <option value="taxa_poupanca">Taxa de poupança</option>
            <option value="aporte_acumulado">Aporte acumulado</option>
            <option value="patrimonio">Patrimônio</option>
            <option value="reserva">Reserva</option>
          </select>
        </Campo>
        <Campo rotulo={f.tipo === 'taxa_poupanca' ? 'Alvo (%)' : 'Alvo (R$)'}>
          <input inputMode="decimal" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} />
        </Campo>
        <Campo rotulo="Prazo">
          <input type="date" value={f.prazo} onChange={(e) => setF({ ...f, prazo: e.target.value })} />
        </Campo>
      </div>
      <div className="flex gap-2">
        <Botao
          variante="primario"
          className="flex-1"
          disabled={!f.titulo.trim() || num(f.valor) == null}
          onClick={() => salvar.mutate(undefined)}
        >
          Salvar
        </Botao>
        {meta && (
          <Botao variante="perigo" onClick={() => excluir.mutate(undefined)}>
            Excluir
          </Botao>
        )}
      </div>
    </div>
  )
}
