import type { Session } from '@supabase/supabase-js'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/db'
import { useConfig } from '@/lib/queries'
import { Login } from './Login'
import { BottomNav } from './BottomNav'
import { Hoje } from '@/features/today/Hoje'
import { Mais } from './Mais'

const Semana = lazy(() => import('@/features/week/Semana').then((m) => ({ default: m.Semana })))
const Metas = lazy(() => import('@/features/goals/Metas').then((m) => ({ default: m.Metas })))
const Habitos = lazy(() => import('@/features/habits/Habitos').then((m) => ({ default: m.Habitos })))
const Projetos = lazy(() => import('@/features/projects/Projetos').then((m) => ({ default: m.Projetos })))
const Leitura = lazy(() => import('@/features/reading/Leitura').then((m) => ({ default: m.Leitura })))
const Financas = lazy(() => import('@/features/finance/Financas').then((m) => ({ default: m.Financas })))
const Revisao = lazy(() => import('@/features/reviews/Revisao').then((m) => ({ default: m.Revisao })))
const Areas = lazy(() => import('@/features/areas/Areas').then((m) => ({ default: m.Areas })))
const Configuracoes = lazy(() => import('@/features/settings/Configuracoes').then((m) => ({ default: m.Configuracoes })))
const Diario = lazy(() => import('@/features/journal/Diario').then((m) => ({ default: m.Diario })))
const Painel = lazy(() => import('@/features/dashboard/Painel').then((m) => ({ default: m.Painel })))
const Onboarding = lazy(() => import('@/features/onboarding/Onboarding').then((m) => ({ default: m.Onboarding })))

export function App() {
  const [sessao, setSessao] = useState<Session | null | undefined>(supabase ? undefined : null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      setSessao(s)
      // O Supabase não guarda o refresh token do Google: a Edge Function o grava no Vault (§11.2).
      if (evento === 'SIGNED_IN' && s?.provider_refresh_token) {
        supabase!.functions.invoke('gcal-oauth-callback', { body: { refresh_token: s.provider_refresh_token } })
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (sessao === undefined) return <div className="grid min-h-dvh place-items-center text-slate-500">Carregando…</div>
  if (supabase && !sessao) return <Login />
  return <Rotas />
}

function Rotas() {
  const cfg = useConfig()
  const { pathname } = useLocation()
  if (!cfg) return null
  if (!cfg.onboarding_concluido && pathname !== '/onboarding') return <Navigate to="/onboarding" replace />

  return (
    <>
      <Suspense fallback={<div className="p-8 text-center text-slate-500">Carregando…</div>}>
        <Routes>
          <Route path="/" element={<Hoje />} />
          <Route path="/semana" element={<Semana />} />
          <Route path="/metas" element={<Metas />} />
          <Route path="/habitos" element={<Habitos />} />
          <Route path="/mais" element={<Mais />} />
          <Route path="/projetos" element={<Projetos />} />
          <Route path="/leitura" element={<Leitura />} />
          <Route path="/financas" element={<Financas />} />
          <Route path="/revisao" element={<Revisao />} />
          <Route path="/areas" element={<Areas />} />
          <Route path="/diario" element={<Diario />} />
          <Route path="/painel" element={<Painel />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {pathname !== '/onboarding' && <BottomNav />}
    </>
  )
}
