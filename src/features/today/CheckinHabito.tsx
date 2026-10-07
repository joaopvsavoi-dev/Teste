import { AlertTriangle, Check, Ellipsis, Minus } from 'lucide-react'
import { useState } from 'react'
import { Botao, Campo, cx, Folha, num } from '@/components/ui'
import { useLongPress } from '@/components/useLongPress'
import { limparCheckin, registrarCheckin } from '@/lib/acoes'
import { useAcao } from '@/lib/queries'
import type { Checkin, CheckinStatus, Habito } from '@/lib/types'

const ESTILO: Record<CheckinStatus | 'nada', string> = {
  nada: 'border-slate-600 text-transparent',
  feito: 'border-emerald-500 bg-emerald-500 text-slate-950',
  minimo: 'border-sky-500 bg-sky-500/20 text-sky-300',
  dispensado: 'border-slate-500 bg-slate-700 text-slate-300',
  falhou: 'border-red-600 bg-red-600/20 text-red-300',
}

const ROTULO: Record<CheckinStatus, string> = { feito: 'feito', minimo: 'mínimo', dispensado: 'dispensado', falhou: 'falhou' }

export function CheckinHabito({
  habito,
  checkin,
  data,
  alertaDuasVezes,
  progressoX,
  forca,
}: {
  habito: Habito
  checkin?: Checkin
  data: string
  alertaDuasVezes: boolean
  progressoX?: { feitos: number; meta: number }
  forca?: number
}) {
  const [menu, setMenu] = useState(false)
  const marcar = useAcao(
    (a: { status: CheckinStatus | null; valor?: number | null; nota?: string | null }) =>
      a.status ? registrarCheckin(habito.id, data, a.status, a) : limparCheckin(habito.id, data),
    ['checkins'],
  )
  const toque = useLongPress(
    () => marcar.mutate({ status: checkin ? null : 'feito' }),
    () => setMenu(true),
  )
  const st = checkin?.status ?? 'nada'

  return (
    <li className="flex items-center gap-3 py-2.5">
      <button
        {...toque}
        aria-label={checkin ? `Desmarcar ${habito.titulo}` : `Marcar ${habito.titulo} como feito`}
        className={cx(
          'grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 transition select-none active:scale-95',
          ESTILO[st],
        )}
      >
        {st === 'minimo' ? <Minus size={20} /> : st === 'falhou' ? <span className="text-lg">×</span> : <Check size={22} strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1" onClick={() => setMenu(true)}>
        <div className="flex flex-wrap items-center gap-x-2">
          <span className={cx('font-medium', checkin && checkin.status !== 'falhou' && 'text-slate-400')}>{habito.titulo}</span>
          {habito.horario_preferido && <span className="text-xs text-slate-500">{habito.horario_preferido.slice(0, 5)}</span>}
          {progressoX && (
            <span className="text-xs text-slate-400">
              {progressoX.feitos}/{progressoX.meta} na semana
            </span>
          )}
          {checkin && checkin.status !== 'feito' && <span className="text-xs text-slate-400">· {ROTULO[checkin.status]}</span>}
          {checkin?.valor != null && (
            <span className="text-xs text-slate-400">
              · {checkin.valor} {habito.unidade}
            </span>
          )}
        </div>
        {alertaDuasVezes && !checkin && (
          <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-medium text-amber-300">
            <AlertTriangle size={12} /> não falhe duas vezes
          </div>
        )}
        {!alertaDuasVezes && habito.gatilho_se && (
          <div className="truncate text-xs text-slate-500">
            SE {habito.gatilho_se.toLowerCase()} → {habito.acao_entao}
          </div>
        )}
      </div>
      {forca !== undefined && <span className="text-xs text-slate-500 tabular-nums">{Math.round(forca * 100)}%</span>}
      <button onClick={() => setMenu(true)} className="rounded p-1.5 text-slate-500 hover:bg-slate-800" aria-label="Mais opções">
        <Ellipsis size={18} />
      </button>
      <MenuCheckin
        key={`${checkin?.id}-${checkin?.status}`}
        aberto={menu}
        onFechar={() => setMenu(false)}
        habito={habito}
        checkin={checkin}
        onMarcar={(a) => marcar.mutate(a, { onSuccess: () => setMenu(false) })}
      />
    </li>
  )
}

function MenuCheckin({
  aberto,
  onFechar,
  habito,
  checkin,
  onMarcar,
}: {
  aberto: boolean
  onFechar: () => void
  habito: Habito
  checkin?: Checkin
  onMarcar: (a: { status: CheckinStatus | null; valor?: number | null; nota?: string | null }) => void
}) {
  const [valor, setValor] = useState(checkin?.valor?.toString() ?? '')
  const [nota, setNota] = useState(checkin?.nota ?? '')
  return (
    <Folha aberta={aberto} onFechar={onFechar} titulo={habito.titulo}>
      <div className="space-y-4">
        {(habito.gatilho_se || habito.acao_entao) && (
          <p className="rounded-lg bg-slate-800/60 p-3 text-sm">
            <b className="text-amber-400">SE</b> {habito.gatilho_se} <b className="text-amber-400">ENTÃO</b> {habito.acao_entao}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Botao variante="primario" onClick={() => onMarcar({ status: 'feito', valor: num(valor), nota: nota || null })}>
            <Check size={16} /> Feito
          </Botao>
          <Botao onClick={() => onMarcar({ status: 'minimo', valor: num(valor), nota: nota || null })} className="border-sky-700">
            <Minus size={16} /> Versão mínima
          </Botao>
        </div>
        {habito.versao_minima && <p className="-mt-2 text-xs text-slate-400">Mínimo: {habito.versao_minima}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Campo rotulo={`Valor${habito.unidade ? ` (${habito.unidade})` : ''}`}>
            <input
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder={habito.valor_alvo?.toString() ?? ''}
            />
          </Campo>
          <Campo rotulo="Nota">
            <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="viagem, doença…" />
          </Campo>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Botao
            onClick={() => onMarcar({ status: 'dispensado', nota })}
            title="Sai do denominador do score. Exige nota. Máx. 1 por semana."
          >
            Dispensar
          </Botao>
          <Botao variante="perigo" onClick={() => onMarcar({ status: 'falhou', nota: nota || null })}>
            Falhou
          </Botao>
          <Botao variante="fantasma" onClick={() => onMarcar({ status: null })} disabled={!checkin}>
            Limpar
          </Botao>
        </div>
        <p className="text-xs text-slate-500">Dica: na lista, 1 toque marca como feito; toque longo abre este menu.</p>
      </div>
    </Folha>
  )
}
