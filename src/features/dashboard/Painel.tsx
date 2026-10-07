import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Barra, Card, CorArea, Pagina, Vazio } from '@/components/ui'
import { RodaDaVida } from '@/features/areas/RodaDaVida'
import { cicloAtual, faixaScore, forcaHabito, pct, progressoIdeal, progressoMeta, scoreSemanal, valorAtualMeta } from '@/lib/calc'
import { addDias, fmt, hoje, inicioSemana } from '@/lib/dates'
import { useTabela } from '@/lib/queries'

const COR = { verde: '#10b981', amarelo: '#f59e0b', vermelho: '#ef4444' }

export function Painel() {
  const dia = hoje()
  const habitos = useTabela('habitos')
  const checkins = useTabela('checkins')
  const tarefas = useTabela('tarefas')
  const metas = useTabela('metas')
  const registros = useTabela('meta_registros')
  const ciclos = useTabela('ciclos')
  const areas = useTabela('areas')
  const roda = useTabela('roda_vida')
  const ciclo = cicloAtual(ciclos, dia)
  const semanaAtual = inicioSemana(dia)

  const semanas = Array.from({ length: 12 }, (_, i) => addDias(semanaAtual, -7 * (11 - i))).map((s) => {
    const sc = scoreSemanal(habitos, checkins, tarefas, s).score
    return { semana: fmt(s, 'd/M'), score: sc == null ? null : Math.round(sc * 100), faixa: sc == null ? null : faixaScore(sc) }
  })
  const fechadas = semanas.slice(0, -1).filter((s) => s.score != null)
  const media = fechadas.length ? fechadas.reduce((a, s) => a + s.score!, 0) / fechadas.length / 100 : null
  const forcas = habitos
    .filter((h) => h.ativo)
    .map((h) => ({ h, f: forcaHabito(h, checkins, dia) }))
    .sort((a, b) => a.f - b.f)

  return (
    <Pagina titulo="Painel" voltar="/mais" sub={`Média das semanas fechadas: ${pct(media)} · meta ≥ 85%`}>
      <Card titulo="Score semanal — 12 semanas">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={semanas} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
              <XAxis dataKey="semana" tick={{ fill: '#64748b', fontSize: 10 }} stroke="#334155" />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} stroke="#334155" />
              <ReferenceLine y={85} stroke="#10b981" strokeDasharray="3 3" />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }} formatter={(v) => `${v}%`} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {semanas.map((s, i) => (
                  <Cell key={i} fill={s.faixa ? COR[s.faixa] : '#334155'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card titulo="Força dos hábitos">
        {forcas.length === 0 ? (
          <Vazio>Sem hábitos ativos.</Vazio>
        ) : (
          <ul className="space-y-2">
            {forcas.map(({ h, f }) => (
              <li key={h.id} className="flex items-center gap-3 text-sm">
                <CorArea cor={areas.find((a) => a.id === h.area_id)?.cor} />
                <span className="w-36 truncate">{h.titulo}</span>
                <div className="flex-1">
                  <Barra valor={f} />
                </div>
                <span className="w-10 text-right tabular-nums text-slate-400">{Math.round(f * 100)}%</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card titulo="Metas do ciclo">
        {!ciclo ? (
          <Vazio>Sem ciclo ativo.</Vazio>
        ) : (
          <ul className="space-y-3">
            {metas
              .filter((m) => m.ciclo_id === ciclo.id)
              .map((m) => {
                const p = progressoMeta(m, valorAtualMeta(m, registros))
                const ideal = progressoIdeal(ciclo, dia)
                return (
                  <li key={m.id} className="text-sm">
                    <div className="flex justify-between">
                      <span>{m.titulo}</span>
                      <span className="text-slate-400">
                        {pct(p)} · ideal {pct(ideal)}
                      </span>
                    </div>
                    <div className="mt-1">
                      <Barra valor={p} ideal={ideal} cor={p >= ideal ? 'bg-emerald-500' : 'bg-amber-500'} />
                    </div>
                  </li>
                )
              })}
          </ul>
        )}
      </Card>

      <Card titulo="Roda da Vida">
        <RodaDaVida areas={areas} ciclos={ciclos} roda={roda} />
      </Card>
    </Pagina>
  )
}
