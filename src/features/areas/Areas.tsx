import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Botao, Campo, Card, CorArea, Folha, Pagina, Vazio } from '@/components/ui'
import { cicloAtual } from '@/lib/calc'
import { hoje } from '@/lib/dates'
import { db } from '@/lib/db'
import { useAcao, useTabela } from '@/lib/queries'
import type { Area } from '@/lib/types'
import { RodaDaVida } from './RodaDaVida'

export function Areas() {
  const areas = useTabela('areas')
  const ciclos = useTabela('ciclos')
  const roda = useTabela('roda_vida')
  const [aberta, setAberta] = useState<Area | 'nova' | null>(null)
  const ciclo = cicloAtual(ciclos, hoje())
  const ordenadas = [...areas].sort((a, b) => a.ordem - b.ordem)
  const salvarNota = useAcao(
    (a: { area_id: string; nota: number }) =>
      db.upsert('roda_vida', { ciclo_id: ciclo!.id, area_id: a.area_id, nota: a.nota, comentario: null }, ['ciclo_id', 'area_id']),
    ['roda_vida'],
  )

  return (
    <Pagina
      titulo="Áreas de vida"
      voltar="/mais"
      acao={
        <Botao variante="primario" onClick={() => setAberta('nova')}>
          <Plus size={16} /> Área
        </Botao>
      }
    >
      <Card titulo="Roda da Vida">
        <RodaDaVida areas={ordenadas} ciclos={ciclos} roda={roda} />
        {ciclo ? (
          <div className="mt-3 space-y-2">
            <div className="text-xs text-slate-400">Notas do {ciclo.nome ?? 'ciclo atual'} (0–10):</div>
            {ordenadas
              .filter((a) => a.ativa)
              .map((a) => {
                const nota = roda.find((r) => r.ciclo_id === ciclo.id && r.area_id === a.id)?.nota
                return (
                  <label key={a.id} className="flex items-center gap-3 text-sm">
                    <CorArea cor={a.cor} />
                    <span className="w-36 truncate">{a.nome}</span>
                    <select
                      className="ml-auto w-20"
                      value={nota ?? ''}
                      onChange={(e) => salvarNota.mutate({ area_id: a.id, nota: Number(e.target.value) })}
                    >
                      <option value="" disabled>
                        –
                      </option>
                      {Array.from({ length: 11 }, (_, n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              })}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500">Crie um ciclo em Metas para registrar as notas.</p>
        )}
      </Card>
      {ordenadas.length === 0 && <Vazio>Nenhuma área.</Vazio>}
      {ordenadas.map((a) => (
        <Card key={a.id} className={a.ativa ? '' : 'opacity-50'}>
          <button className="w-full text-left" onClick={() => setAberta(a)}>
            <div className="flex items-center gap-2 font-medium">
              <CorArea cor={a.cor} /> {a.nome}
            </div>
            <p className="mt-1 text-sm whitespace-pre-line text-slate-400">
              {a.visao || 'Sem visão definida — quem quero ser nesta área em 3–5 anos?'}
            </p>
          </button>
        </Card>
      ))}
      <Folha aberta={aberta !== null} onFechar={() => setAberta(null)} titulo={aberta === 'nova' ? 'Nova área' : 'Área'}>
        {aberta !== null && (
          <FormArea
            key={aberta === 'nova' ? 'n' : aberta.id}
            area={aberta === 'nova' ? null : aberta}
            total={areas.length}
            onFim={() => setAberta(null)}
          />
        )}
      </Folha>
    </Pagina>
  )
}

function FormArea({ area, total, onFim }: { area: Area | null; total: number; onFim: () => void }) {
  const [f, setF] = useState({ nome: area?.nome ?? '', cor: area?.cor ?? '#64748b', visao: area?.visao ?? '', ativa: area?.ativa ?? true })
  const salvar = useAcao(async () => {
    if (area) await db.update('areas', area.id, f)
    else await db.insert('areas', [{ ...f, icone: null, ordem: total }])
    onFim()
  }, ['areas'])
  const excluir = useAcao(async () => {
    await db.remove('areas', area!.id)
    onFim()
  }, ['areas'])
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Campo rotulo="Nome" className="flex-1">
          <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
        </Campo>
        <Campo rotulo="Cor">
          <input type="color" className="h-[38px] w-14 p-1" value={f.cor} onChange={(e) => setF({ ...f, cor: e.target.value })} />
        </Campo>
      </div>
      <Campo rotulo="Visão (3–5 anos)" dica="Quem quero ser nesta área. Revisar uma vez por ano.">
        <textarea rows={4} value={f.visao} onChange={(e) => setF({ ...f, visao: e.target.value })} />
      </Campo>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.ativa} onChange={(e) => setF({ ...f, ativa: e.target.checked })} /> Ativa
      </label>
      <div className="flex gap-2">
        <Botao variante="primario" className="flex-1" disabled={!f.nome.trim()} onClick={() => salvar.mutate(undefined)}>
          Salvar
        </Botao>
        {area && (
          <Botao
            variante="perigo"
            onClick={() => confirm('Excluir área? Metas, hábitos e projetos ficam sem área.') && excluir.mutate(undefined)}
          >
            Excluir
          </Botao>
        )}
      </div>
    </div>
  )
}
