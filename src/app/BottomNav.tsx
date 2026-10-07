import { CalendarDays, Ellipsis, Repeat, Sun, Target } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { cx } from '@/components/ui'

const ITENS = [
  { to: '/', rotulo: 'Hoje', icone: Sun },
  { to: '/semana', rotulo: 'Semana', icone: CalendarDays },
  { to: '/metas', rotulo: 'Metas', icone: Target },
  { to: '/habitos', rotulo: 'Hábitos', icone: Repeat },
  { to: '/mais', rotulo: 'Mais', icone: Ellipsis },
]
const DO_MAIS = ['/mais', '/projetos', '/leitura', '/financas', '/revisao', '/areas', '/diario', '/painel', '/configuracoes']

export function BottomNav() {
  const { pathname } = useLocation()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-2xl">
        {ITENS.map(({ to, rotulo, icone: Icone }) => {
          const ativo = to === '/mais' ? DO_MAIS.includes(pathname) : pathname === to
          return (
            <NavLink
              key={to}
              to={to}
              className={cx('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]', ativo ? 'text-amber-400' : 'text-slate-400')}
            >
              <Icone size={22} strokeWidth={ativo ? 2.4 : 1.8} />
              {rotulo}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
