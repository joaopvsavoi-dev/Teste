import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Botao, Campo, Card, Pagina } from '@/components/ui'
import { addDias, fmt, hoje } from '@/lib/dates'
import { CONFIG_PADRAO, db } from '@/lib/db'
import { useAcao, useConfig, useTabela } from '@/lib/queries'

/** Diário / exame noturno: perguntas configuráveis, uma entrada por dia. */
export function Diario() {
  const [data, setData] = useState(hoje())
  const entradas = useTabela('diario')
  const cfg = useConfig()
  const perguntas = cfg?.perguntas_diario?.length ? cfg.perguntas_diario : CONFIG_PADRAO.perguntas_diario!
  const entrada = entradas.find((e) => e.data === data)
  const anteriores = [...entradas]
    .filter((e) => e.data < data)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5)

  return (
    <Pagina
      titulo="Exame noturno"
      voltar="/mais"
      sub={fmt(data, "EEEE, d 'de' MMMM")}
      acao={
        <div className="flex">
          <Botao variante="fantasma" onClick={() => setData(addDias(data, -1))} aria-label="Dia anterior">
            <ChevronLeft size={18} />
          </Botao>
          <Botao variante="fantasma" onClick={() => setData(addDias(data, 1))} disabled={data >= hoje()} aria-label="Próximo dia">
            <ChevronRight size={18} />
          </Botao>
        </div>
      }
    >
      <FormDiario key={data + (entrada?.id ?? '')} data={data} perguntas={perguntas} inicial={entrada?.respostas ?? {}} />
      {anteriores.length > 0 && (
        <Card titulo="Entradas anteriores">
          <ul className="space-y-3 text-sm">
            {anteriores.map((e) => (
              <li key={e.id}>
                <button className="text-left" onClick={() => setData(e.data)}>
                  <div className="text-xs text-slate-500">{fmt(e.data, "EEE, d 'de' MMM")}</div>
                  <div className="line-clamp-2 text-slate-300">{Object.values(e.respostas).filter(Boolean).join(' · ')}</div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Pagina>
  )
}

function FormDiario({ data, perguntas, inicial }: { data: string; perguntas: string[]; inicial: Record<string, string> }) {
  const [r, setR] = useState<Record<string, string>>(inicial)
  const [salvo, setSalvo] = useState(false)
  const salvar = useAcao(async () => {
    await db.upsert('diario', { data, respostas: r }, ['data'])
    setSalvo(true)
  }, ['diario'])
  return (
    <Card>
      <div className="space-y-3">
        {perguntas.map((p) => (
          <Campo key={p} rotulo={p}>
            <textarea
              rows={2}
              value={r[p] ?? ''}
              onChange={(e) => {
                setR({ ...r, [p]: e.target.value })
                setSalvo(false)
              }}
            />
          </Campo>
        ))}
        <Botao variante="primario" className="w-full" onClick={() => salvar.mutate(undefined)}>
          {salvo ? 'Salvo ✓' : 'Salvar'}
        </Botao>
      </div>
    </Card>
  )
}
