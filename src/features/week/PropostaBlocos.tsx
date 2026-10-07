import { useState } from 'react'
import { Botao, Vazio } from '@/components/ui'
import { horariosOcupados, sincronizarAgenda } from '@/lib/acoes'
import { proporBlocos, type BlocoProposto } from '@/lib/agenda'
import { addDias, dataLocal, fmt, hoje, horaLocal, paraISO } from '@/lib/dates'
import { db, modoLocal } from '@/lib/db'
import { useAcao, useConfig, useTabela } from '@/lib/queries'

/** Passo 6 da revisão semanal: o app propõe blocos, você ajusta e confirma; os blocos vão para o Google. */
export function PropostaBlocos({ segunda, onConfirmar }: { segunda: string; onConfirmar?: () => void }) {
  const habitos = useTabela('habitos')
  const blocos = useTabela('blocos')
  const cfg = useConfig()
  const [propostos, setPropostos] = useState<(BlocoProposto & { on: boolean })[] | null>(null)
  const [semHorario, setSemHorario] = useState<string[]>([])
  const [carregando, setCarregando] = useState(false)

  async function propor() {
    setCarregando(true)
    const ocupados = cfg?.gcal_ler_agenda_principal
      ? await horariosOcupados(paraISO(segunda, '00:00'), paraISO(addDias(segunda, 7), '00:00'))
      : []
    const r = proporBlocos(habitos, segunda, blocos, ocupados, hoje())
    setPropostos(r.propostos.map((p) => ({ ...p, on: true })))
    setSemHorario(r.semHorario)
    setCarregando(false)
  }

  const confirmar = useAcao(async () => {
    const sel = (propostos ?? []).filter((p) => p.on)
    await db.insert(
      'blocos',
      sel.map(({ on: _on, ...p }) => ({
        ...p,
        projeto_id: null,
        tarefa_id: null,
        origem: 'app' as const,
        gcal_event_id: null,
        sync_status: 'pendente' as const,
        deleted_at: null,
      })),
    )
    const erro = await sincronizarAgenda()
    if (erro) alert(erro)
    setPropostos(null)
    onConfirmar?.()
  }, ['blocos'])

  if (!propostos)
    return (
      <div className="space-y-2">
        <Botao variante="primario" className="w-full" onClick={propor} disabled={carregando}>
          {carregando ? 'Calculando…' : 'Propor blocos da semana'}
        </Botao>
        <p className="text-xs text-slate-500">
          Usa o horário preferido e a duração de cada hábito, sem conflito com blocos existentes
          {!modoLocal && cfg?.gcal_ler_agenda_principal && ' nem com a sua agenda principal (free/busy)'}.
        </p>
      </div>
    )

  return (
    <div className="space-y-2">
      {propostos.length === 0 ? (
        <Vazio>Nada a propor — os blocos da semana já existem.</Vazio>
      ) : (
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {propostos.map((p, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={p.on}
                onChange={() => setPropostos(propostos.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}
              />
              <span className="w-20 text-slate-400">{fmt(dataLocal(p.inicio), 'EEE d')}</span>
              <span className="w-24 tabular-nums text-slate-400">
                {horaLocal(p.inicio)}–{horaLocal(p.fim)}
              </span>
              <span className="truncate">{p.titulo}</span>
            </li>
          ))}
        </ul>
      )}
      {semHorario.length > 0 && <p className="text-xs text-amber-300/80">Sem horário/duração definidos: {semHorario.join(', ')}.</p>}
      <div className="flex gap-2">
        <Botao variante="primario" className="flex-1" onClick={() => confirmar.mutate(undefined)} disabled={!propostos.some((p) => p.on)}>
          Confirmar {propostos.filter((p) => p.on).length} blocos
        </Botao>
        <Botao variante="fantasma" onClick={() => setPropostos(null)}>
          Cancelar
        </Botao>
      </div>
    </div>
  )
}
