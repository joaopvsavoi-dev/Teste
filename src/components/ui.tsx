import { X } from 'lucide-react'
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { faixaScore, pct } from '@/lib/calc'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

export function Pagina({
  titulo,
  sub,
  acao,
  voltar,
  children,
}: {
  titulo: string
  sub?: ReactNode
  acao?: ReactNode
  voltar?: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-safe">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {voltar && (
            <Link to={voltar} className="text-xs text-slate-400 hover:text-slate-200">
              ← voltar
            </Link>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          {sub && <div className="mt-0.5 text-sm text-slate-400">{sub}</div>}
        </div>
        {acao}
      </header>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

export function Card({
  titulo,
  acao,
  children,
  className,
}: {
  titulo?: ReactNode
  acao?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cx('rounded-2xl border border-slate-800 bg-slate-900/60 p-4', className)}>
      {(titulo || acao) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-slate-300 uppercase">{titulo}</h2>
          {acao}
        </div>
      )}
      {children}
    </section>
  )
}

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo'
export function Botao({ variante = 'secundario', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      type="button"
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-40',
        variante === 'primario' && 'bg-amber-500 text-slate-950 hover:bg-amber-400',
        variante === 'secundario' && 'border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700',
        variante === 'fantasma' && 'text-slate-300 hover:bg-slate-800',
        variante === 'perigo' && 'border border-red-900 bg-red-950 text-red-200 hover:bg-red-900',
        className,
      )}
    />
  )
}

export function Campo({ rotulo, dica, children, className }: { rotulo: string; dica?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('flex flex-col gap-1', className)}>
      <span className="text-xs font-medium text-slate-400">{rotulo}</span>
      {children}
      {dica && <span className="text-xs text-slate-500">{dica}</span>}
    </label>
  )
}

export function Folha({
  aberta,
  onFechar,
  titulo,
  children,
}: {
  aberta: boolean
  onFechar: () => void
  titulo: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!aberta) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberta, onFechar])
  if (!aberta) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onFechar}>
      <div
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-900 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{titulo}</h3>
          <button onClick={onFechar} className="rounded p-1 text-slate-400 hover:bg-slate-800" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Barra({ valor, ideal, cor = 'bg-amber-500' }: { valor: number; ideal?: number; cor?: string }) {
  const v = Math.max(0, Math.min(1, valor))
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div className={cx('h-full rounded-full', cor)} style={{ width: `${v * 100}%` }} />
      {ideal !== undefined && (
        <div className="absolute top-0 h-full w-0.5 bg-slate-300" style={{ left: `${Math.min(1, ideal) * 100}%` }} title="Linha ideal" />
      )}
    </div>
  )
}

export const COR_FAIXA = {
  verde: 'text-emerald-400 bg-emerald-500/10 border-emerald-700',
  amarelo: 'text-amber-300 bg-amber-500/10 border-amber-700',
  vermelho: 'text-red-300 bg-red-500/10 border-red-800',
} as const

export function SeloScore({ score, grande }: { score: number | null; grande?: boolean }) {
  if (score == null) return <span className="text-slate-500">—</span>
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold tabular-nums',
        COR_FAIXA[faixaScore(score)],
        grande && 'px-4 py-1 text-2xl',
      )}
    >
      {pct(score)}
    </span>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-sm text-slate-500">{children}</p>
}

export function CorArea({ cor }: { cor?: string | null }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cor ?? '#64748b' }} />
}

export function Abas<T extends string>({ valor, opcoes, onMudar }: { valor: T; opcoes: [T, string][]; onMudar: (v: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-900 p-1">
      {opcoes.map(([v, r]) => (
        <button
          key={v}
          onClick={() => onMudar(v)}
          className={cx(
            'flex-1 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap',
            valor === v ? 'bg-slate-700 text-white' : 'text-slate-400',
          )}
        >
          {r}
        </button>
      ))}
    </div>
  )
}

export function num(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function brl(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
