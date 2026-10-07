import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts'
import { Vazio } from '@/components/ui'
import type { Area, Ciclo, RodaVida } from '@/lib/types'

const CORES = ['#f59e0b', '#64748b', '#38bdf8']

/** Radar da Roda da Vida — até os 3 ciclos mais recentes com notas. */
export function RodaDaVida({ areas, ciclos, roda }: { areas: Area[]; ciclos: Ciclo[]; roda: RodaVida[] }) {
  const comNotas = ciclos
    .filter((c) => roda.some((r) => r.ciclo_id === c.id))
    .sort((a, b) => b.inicio.localeCompare(a.inicio))
    .slice(0, 3)
  if (!comNotas.length) return <Vazio>Sem notas da Roda da Vida ainda.</Vazio>
  const dados = areas
    .filter((a) => a.ativa)
    .map((a) => ({
      area: a.nome.split(' ')[0],
      ...Object.fromEntries(comNotas.map((c) => [c.id, roda.find((r) => r.ciclo_id === c.id && r.area_id === a.id)?.nota ?? 0])),
    }))
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={dados} outerRadius="70%">
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="area" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
          {comNotas.map((c, i) => (
            <Radar
              key={c.id}
              dataKey={c.id}
              name={c.nome ?? c.inicio}
              stroke={CORES[i]}
              fill={CORES[i]}
              fillOpacity={i === 0 ? 0.3 : 0.05}
            />
          ))}
          {comNotas.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
