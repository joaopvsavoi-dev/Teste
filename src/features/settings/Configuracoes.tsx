import { Download, LogOut, Upload } from 'lucide-react'
import { useState } from 'react'
import { entrarComGoogle } from '@/app/Login'
import { Botao, Campo, Card, Pagina } from '@/components/ui'
import { sincronizarAgenda } from '@/lib/acoes'
import { NOMES_DIAS } from '@/lib/dates'
import { CONFIG_PADRAO, db, exportarTudo, importarLocal, modoLocal, supabase } from '@/lib/db'
import { useAcao, useConfig } from '@/lib/queries'
import type { Configuracoes as Cfg } from '@/lib/types'

export function Configuracoes() {
  const cfg = useConfig()
  if (!cfg) return null
  return <Form key={JSON.stringify(cfg)} cfg={cfg} />
}

function Form({ cfg }: { cfg: Cfg }) {
  const [f, setF] = useState({
    limite: String(cfg.limite_projetos_ativos),
    dia: String(cfg.dia_revisao),
    perguntas: (cfg.perguntas_diario ?? CONFIG_PADRAO.perguntas_diario!).join('\n'),
    lerPrincipal: cfg.gcal_ler_agenda_principal,
  })
  const salvar = useAcao(
    () =>
      db.saveConfig({
        limite_projetos_ativos: Math.max(1, Number(f.limite) || 2),
        dia_revisao: Number(f.dia),
        perguntas_diario: f.perguntas
          .split('\n')
          .map((p) => p.trim())
          .filter(Boolean),
        gcal_ler_agenda_principal: f.lerPrincipal,
      }),
    ['configuracoes'],
  )
  const [msg, setMsg] = useState('')

  async function baixar() {
    const dados = await exportarTudo()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }))
    a.download = `norte-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  return (
    <Pagina titulo="Configurações" voltar="/mais">
      <Card titulo="Preferências">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Campo rotulo="Limite de projetos ativos" dica="Decisão em aberto: 2 ou 3?">
              <input type="number" min={1} max={5} value={f.limite} onChange={(e) => setF({ ...f, limite: e.target.value })} />
            </Campo>
            <Campo rotulo="Dia da revisão semanal">
              <select value={f.dia} onChange={(e) => setF({ ...f, dia: e.target.value })}>
                {NOMES_DIAS.map((n, i) => (
                  <option key={n} value={i + 1}>
                    {n}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <Campo rotulo="Perguntas do diário (uma por linha)">
            <textarea rows={5} value={f.perguntas} onChange={(e) => setF({ ...f, perguntas: e.target.value })} />
          </Campo>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.lerPrincipal} onChange={(e) => setF({ ...f, lerPrincipal: e.target.checked })} />
            Evitar conflitos com a agenda principal (free/busy)
          </label>
          <Botao variante="primario" className="w-full" onClick={() => salvar.mutate(undefined)}>
            Salvar
          </Botao>
        </div>
      </Card>

      <Card titulo="Google Agenda">
        {modoLocal ? (
          <p className="text-sm text-slate-400">
            Modo local: a sincronização com o Google exige o Supabase configurado (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) e as Edge
            Functions publicadas. Veja o README.
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-slate-400">
              Agenda dedicada: <b className="text-slate-200">{cfg.gcal_calendar_id ? 'Norte (conectada)' : 'ainda não criada'}</b>
            </p>
            <div className="flex flex-wrap gap-2">
              <Botao onClick={entrarComGoogle}>Reconectar Google</Botao>
              <Botao onClick={async () => setMsg((await sincronizarAgenda()) ?? 'Sincronizado ✓')}>Sincronizar agora</Botao>
            </div>
            {msg && <p className="text-xs text-slate-400">{msg}</p>}
          </div>
        )}
      </Card>

      <Card titulo="Dados">
        <div className="flex flex-wrap gap-2">
          <Botao onClick={baixar}>
            <Download size={16} /> Exportar backup (JSON)
          </Botao>
          {modoLocal && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium">
              <Upload size={16} /> Restaurar backup
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file || !confirm('Substituir todos os dados locais pelo backup?')) return
                  importarLocal(JSON.parse(await file.text()))
                  location.reload()
                }}
              />
            </label>
          )}
          <Botao
            variante="fantasma"
            onClick={async () => {
              await db.saveConfig({ onboarding_concluido: false })
              location.href = '/onboarding'
            }}
          >
            Refazer onboarding
          </Botao>
        </div>
      </Card>

      {supabase && (
        <Botao variante="fantasma" className="w-full" onClick={() => supabase!.auth.signOut()}>
          <LogOut size={16} /> Sair
        </Botao>
      )}
    </Pagina>
  )
}
