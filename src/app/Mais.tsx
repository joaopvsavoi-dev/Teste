import { BookOpen, ChartLine, ClipboardCheck, FolderKanban, NotebookPen, Settings, Shapes, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Pagina } from '@/components/ui'
import { modoLocal } from '@/lib/db'

const ITENS = [
  { to: '/projetos', rotulo: 'Projetos', desc: 'Backlog, ativos (com limite), pausados, concluídos', icone: FolderKanban },
  { to: '/revisao', rotulo: 'Revisão', desc: 'Semanal, fechamento mensal e revisão do ciclo', icone: ClipboardCheck },
  { to: '/leitura', rotulo: 'Leitura', desc: 'Planos (filosofia, Bíblia) e livros', icone: BookOpen },
  { to: '/diario', rotulo: 'Diário', desc: 'Exame noturno', icone: NotebookPen },
  { to: '/financas', rotulo: 'Finanças', desc: 'Fechamento mensal e metas financeiras', icone: Wallet },
  { to: '/painel', rotulo: 'Painel', desc: 'Score, força dos hábitos, metas, Roda da Vida', icone: ChartLine },
  { to: '/areas', rotulo: 'Áreas', desc: 'Visão por área e Roda da Vida', icone: Shapes },
  { to: '/configuracoes', rotulo: 'Configurações', desc: 'Google Agenda, limites, diário, backup', icone: Settings },
]

export function Mais() {
  return (
    <Pagina titulo="Mais" sub={modoLocal ? 'Modo local — dados salvos neste navegador' : undefined}>
      <div className="grid gap-2">
        {ITENS.map(({ to, rotulo, desc, icone: Icone }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:bg-slate-800/60"
          >
            <Icone className="text-amber-400" size={22} />
            <div>
              <div className="font-medium">{rotulo}</div>
              <div className="text-xs text-slate-400">{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </Pagina>
  )
}
