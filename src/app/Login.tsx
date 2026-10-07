import { supabase } from '@/lib/db'
import { Botao } from '@/components/ui'

// Escopos do Google Agenda (§11.2): criar/gerenciar a agenda secundária "Norte" e ler o free/busy da principal.
// Confira na documentação atual do Google se os escopos continuam com estes nomes.
export const ESCOPOS_GOOGLE = [
  'https://www.googleapis.com/auth/calendar.app.created',
  'https://www.googleapis.com/auth/calendar.freebusy',
].join(' ')

export function entrarComGoogle() {
  return supabase?.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: ESCOPOS_GOOGLE,
      redirectTo: window.location.origin,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })
}

export function Login() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-sm text-center">
        <img src="/favicon.svg" alt="" className="mx-auto mb-6 h-20 w-20" />
        <h1 className="text-3xl font-semibold">Norte</h1>
        <p className="mt-2 text-slate-400">Visão → metas de 12 semanas → hábitos e blocos na agenda.</p>
        <Botao variante="primario" className="mt-8 w-full py-3" onClick={entrarComGoogle}>
          Entrar com Google
        </Botao>
      </div>
    </div>
  )
}
