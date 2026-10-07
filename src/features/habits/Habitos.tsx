import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Barra, Botao, Card, CorArea, cx, Folha, Pagina, Vazio } from '@/components/ui'
import { esperadoNoDia, forcaHabito } from '@/lib/calc'
import { addDias, diasDaSemana, hoje, inicioSemana, NOMES_DIAS } from '@/lib/dates'
import { db } from '@/lib/db'
import { useAcao, useTabela } from '@/lib/queries'
import type { Checkin, Habito } from '@/lib/types'
import { FormHabito, habitoVazio, type HabitoNovo } from './FormHabito'

const FREQ = (h: Habito) =>
  h.freq === 'diario'
    ? 'diário'
    : h.freq === 'x_por_semana'
      ? `${h.vezes_por_semana}x/semana`
      : (h.dias_semana ?? []).map((d) => NOMES_DIAS[d - 1]).join(', ')

export function Habitos() {
  const dia = hoje()
  const habitos = useTabela('habitos')
  const checkins = useTabela('checkins')
  const areas = useTabela('areas')
  const metas = useTabela('metas')
  const [editando, setEditando] = useState<Habito | 'novo' | null>(null)

  const salvar = useAcao(
    async (h: HabitoNovo) => {
      if (editando && editando !== 'novo') await db.update('habitos', editando.id, h)
      else await db.insert('habitos', [{ ...h, ordem: habitos.length }])
      setEditando(null)
    },
    ['habitos'],
  )
  const excluir = useAcao(
    async (id: string) => {
      await db.remove('habitos', id)
      setEditando(null)
    },
    ['habitos', 'checkins'],
  )

  const ordenados = [...habitos].sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.ordem - b.ordem)

  return (
    <Pagina
      titulo="Hábitos"
      sub="Força = média móvel (não zera por um deslize)"
      acao={
        <Botao variante="primario" onClick={() => setEditando('novo')}>
          <Plus size={16} /> Novo
        </Botao>
      }
    >
      {ordenados.length === 0 && <Vazio>Crie seu primeiro hábito com gatilho SE → ação ENTÃO.</Vazio>}
      {ordenados.map((h) => {
        const forca = forcaHabito(h, checkins, dia)
        const area = areas.find((a) => a.id === h.area_id)
        return (
          <Card key={h.id} className={cx(!h.ativo && 'opacity-50')}>
            <button className="w-full text-left" onClick={() => setEditando(h)}>
              <div className="flex items-center gap-2">
                <CorArea cor={area?.cor} />
                <span className="flex-1 font-medium">{h.titulo}</span>
                <span className="text-sm font-semibold tabular-nums text-amber-300">{Math.round(forca * 100)}%</span>
              </div>
              <div className="mt-1 text-xs text-slate-400">
                SE {h.gatilho_se} → ENTÃO {h.acao_entao}
              </div>
              <div className="text-xs text-slate-500">
                {FREQ(h)}
                {h.horario_preferido && ` · ${h.horario_preferido.slice(0, 5)}`}
                {h.duracao_min && ` · ${h.duracao_min} min`} · mínimo: {h.versao_minima}
                {!h.meta_id && ' · manutenção'}
              </div>
              <div className="mt-2">
                <Barra valor={forca} />
              </div>
              <MapaCalor habito={h} checkins={checkins} ate={dia} />
            </button>
          </Card>
        )
      })}
      <Folha aberta={editando !== null} onFechar={() => setEditando(null)} titulo={editando === 'novo' ? 'Novo hábito' : 'Editar hábito'}>
        {editando !== null && (
          <FormHabito
            key={editando === 'novo' ? 'novo' : editando.id}
            inicial={editando === 'novo' ? habitoVazio() : editando}
            areas={areas}
            metas={metas}
            onSalvar={(h) => salvar.mutate(h)}
            onExcluir={editando !== 'novo' ? () => excluir.mutate(editando.id) : undefined}
          />
        )}
      </Folha>
    </Pagina>
  )
}

const COR_ST: Record<string, string> = {
  feito: 'bg-emerald-500',
  minimo: 'bg-sky-500',
  dispensado: 'bg-slate-500',
  falhou: 'bg-red-700',
}

/** Mapa de calor de 12 semanas (colunas = semanas, linhas = seg..dom). */
export function MapaCalor({ habito, checkins, ate }: { habito: Habito; checkins: Checkin[]; ate: string }) {
  const ultimaSeg = inicioSemana(ate)
  const semanas = Array.from({ length: 12 }, (_, i) => addDias(ultimaSeg, -7 * (11 - i)))
  const porData = new Map(checkins.filter((c) => c.habito_id === habito.id).map((c) => [c.data, c.status]))
  return (
    <div className="mt-3 flex gap-[3px]" aria-label="Mapa de calor das últimas 12 semanas">
      {semanas.map((s) => (
        <div key={s} className="flex flex-1 flex-col gap-[3px]">
          {diasDaSemana(s).map((d) => {
            const st = porData.get(d)
            const esperado = habito.freq === 'x_por_semana' ? d >= habito.inicio : esperadoNoDia(habito, d)
            return (
              <div
                key={d}
                title={`${d}${st ? ` · ${st}` : ''}`}
                className={cx(
                  'aspect-square rounded-[3px]',
                  d > ate
                    ? 'bg-transparent'
                    : st
                      ? COR_ST[st]
                      : esperado && habito.freq !== 'x_por_semana' && d < ate
                        ? 'bg-slate-800 ring-1 ring-red-900/60 ring-inset'
                        : 'bg-slate-800/60',
                )}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
