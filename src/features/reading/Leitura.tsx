import { Plus, Upload } from 'lucide-react'
import { useState } from 'react'
import { Abas, Barra, Botao, Campo, Card, cx, Folha, num, Pagina, Vazio } from '@/components/ui'
import { concluirItemPlano, definirSemanaAtual, desfazerItemPlano, excluirPlano, importarPlano, proximoItem } from '@/lib/acoes'
import { hoje } from '@/lib/dates'
import { db } from '@/lib/db'
import { useAcao, useTabela } from '@/lib/queries'
import type { Livro, PlanoItem, PlanoLeitura } from '@/lib/types'
import bibliaMd from '../../../docs/plano-biblia.md?raw'

export function Leitura() {
  const [aba, setAba] = useState<'planos' | 'livros'>('planos')
  return (
    <Pagina titulo="Leitura" voltar="/mais">
      <Abas
        valor={aba}
        onMudar={setAba}
        opcoes={[
          ['planos', 'Planos'],
          ['livros', 'Livros'],
        ]}
      />
      {aba === 'planos' ? <Planos /> : <Livros />}
    </Pagina>
  )
}

function Planos() {
  const planos = useTabela('planos_leitura')
  const itens = useTabela('plano_itens')
  const [importar, setImportar] = useState(false)
  const [aberto, setAberto] = useState<PlanoLeitura | null>(null)
  return (
    <>
      {planos.length === 0 && <Vazio>Nenhum plano importado.</Vazio>}
      {planos.map((p) => {
        const doPlano = itens.filter((i) => i.plano_id === p.id)
        const feitos = doPlano.filter((i) => i.concluido_em).length
        const prox = proximoItem(itens, p.id)
        return (
          <Card key={p.id}>
            <button className="w-full text-left" onClick={() => setAberto(p)}>
              <div className="flex justify-between">
                <span className="font-medium">{p.titulo}</span>
                <span className="text-sm text-slate-400 tabular-nums">
                  {feitos}/{doPlano.length}
                </span>
              </div>
              <div className="mt-2">
                <Barra valor={doPlano.length ? feitos / doPlano.length : 0} />
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Próximo:{' '}
                {prox
                  ? p.tipo === 'semanal'
                    ? `semana ${prox.semana ?? prox.ordem} — ${prox.titulo}`
                    : `${prox.livro} ${prox.capitulo}`
                  : 'concluído'}
                {p.tipo === 'capitulos' && doPlano.length > feitos && ` · faltam ~${doPlano.length - feitos} dias`}
              </div>
            </button>
          </Card>
        )
      })}
      <Botao variante="primario" className="w-full" onClick={() => setImportar(true)}>
        <Upload size={16} /> Importar plano
      </Botao>
      <Folha aberta={importar} onFechar={() => setImportar(false)} titulo="Importar plano de leitura">
        <FormImportar
          onFim={() => setImportar(false)}
          temBiblia={planos.some((p) => p.tipo === 'capitulos' && /b[íi]blia/i.test(p.titulo))}
        />
      </Folha>
      <Folha aberta={!!aberto} onFechar={() => setAberto(null)} titulo={aberto?.titulo ?? ''}>
        {aberto && (
          <DetalhePlano
            plano={aberto}
            itens={itens.filter((i) => i.plano_id === aberto.id).sort((a, b) => a.ordem - b.ordem)}
            onExcluido={() => setAberto(null)}
          />
        )}
      </Folha>
    </>
  )
}

function FormImportar({ onFim, temBiblia }: { onFim: () => void; temBiblia: boolean }) {
  const areas = useTabela('areas')
  const habitos = useTabela('habitos')
  const espirito = areas.find((a) => /esp[íi]rito/i.test(a.nome))
  const [f, setF] = useState({
    titulo: 'Plano de Filosofia — 12 meses',
    tipo: 'semanal' as 'semanal' | 'capitulos',
    md: '',
    area_id: espirito?.id ?? '',
    habito_id: habitos.find((h) => /filosofia/i.test(h.titulo))?.id ?? '',
    semana_atual: '1',
  })
  const importar = useAcao(
    async (biblia: boolean) => {
      if (biblia) {
        const hab = habitos.find((h) => /b[íi]bli/i.test(h.titulo))
        const { n } = await importarPlano({
          titulo: 'Bíblia — 1 capítulo por dia',
          tipo: 'capitulos',
          md: bibliaMd,
          area_id: espirito?.id ?? null,
          habito_id: hab?.id ?? null,
        })
        alert(
          `Plano bíblico importado: ${n} capítulos.${hab ? ` Vinculado ao hábito "${hab.titulo}".` : ' Crie o hábito "Leitura bíblica" e vincule-o no detalhe do plano.'}`,
        )
      } else {
        const { id, n } = await importarPlano({
          titulo: f.titulo,
          tipo: f.tipo,
          md: f.md,
          area_id: f.area_id || null,
          habito_id: f.habito_id || null,
          inicio: hoje(),
        })
        const semana = num(f.semana_atual)
        if (f.tipo === 'semanal' && semana && semana > 1) await definirSemanaAtual(id, semana, hoje())
        alert(`${n} itens importados.`)
      }
      onFim()
    },
    ['planos_leitura', 'plano_itens'],
  )
  return (
    <div className="space-y-4">
      {!temBiblia && (
        <div className="rounded-xl border border-amber-700/50 bg-amber-500/5 p-3">
          <div className="font-medium">Plano bíblico (incluído)</div>
          <p className="text-xs text-slate-400">
            1189 capítulos, 1 por dia, em 5 fases por impacto (Marcos → Provérbios → …). Sequencial, sem datas.
          </p>
          <Botao variante="primario" className="mt-2 w-full" onClick={() => importar.mutate(true)} disabled={importar.isPending}>
            Importar plano bíblico
          </Botao>
        </div>
      )}
      <div className="space-y-3">
        <div className="text-sm font-semibold text-slate-300">Outro plano (.md)</div>
        <div className="grid grid-cols-2 gap-2">
          <Campo rotulo="Título" className="col-span-2">
            <input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
          </Campo>
          <Campo rotulo="Formato">
            <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as 'semanal' | 'capitulos' })}>
              <option value="semanal">Semanal (semanas/módulos)</option>
              <option value="capitulos">Capítulos (tabelas por fase)</option>
            </select>
          </Campo>
          {f.tipo === 'semanal' && (
            <Campo rotulo="Semana atual">
              <input type="number" min={1} value={f.semana_atual} onChange={(e) => setF({ ...f, semana_atual: e.target.value })} />
            </Campo>
          )}
          <Campo rotulo="Hábito vinculado (check-in automático)" className="col-span-2">
            <select value={f.habito_id} onChange={(e) => setF({ ...f, habito_id: e.target.value })}>
              <option value="">—</option>
              {habitos.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.titulo}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo rotulo="Arquivo .md">
          <input
            type="file"
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (file) setF({ ...f, md: await file.text() })
            }}
          />
        </Campo>
        <Campo
          rotulo="…ou cole o Markdown"
          dica="Semanal: “## Módulo …”, “### Semana N — título”, linhas “Leitura:”, “Prática:”, “Pergunta da semana:”."
        >
          <textarea rows={6} value={f.md} onChange={(e) => setF({ ...f, md: e.target.value })} className="font-mono text-xs" />
        </Campo>
        <Botao className="w-full" disabled={!f.md.trim() || !f.titulo.trim() || importar.isPending} onClick={() => importar.mutate(false)}>
          Importar
        </Botao>
      </div>
    </div>
  )
}

function DetalhePlano({ plano, itens, onExcluido }: { plano: PlanoLeitura; itens: PlanoItem[]; onExcluido: () => void }) {
  const habitos = useTabela('habitos')
  const dia = hoje()
  const vincular = useAcao(
    (habito_id: string) => db.update('planos_leitura', plano.id, { habito_id: habito_id || null }),
    ['planos_leitura'],
  )
  const concluir = useAcao(
    (i: PlanoItem) => (i.concluido_em ? desfazerItemPlano(i) : concluirItemPlano(i, plano, dia)),
    ['plano_itens', 'checkins'],
  )
  const semana = useAcao((n: number) => definirSemanaAtual(plano.id, n, dia), ['plano_itens'])
  const responder = useAcao((a: { id: string; r: string }) => db.update('plano_itens', a.id, { resposta_pergunta: a.r }), ['plano_itens'])
  const excluir = useAcao(async () => {
    await excluirPlano(plano.id)
    onExcluido()
  }, ['planos_leitura', 'plano_itens'])
  const prox = proximoItem(itens, plano.id)

  // Plano por capítulos: progresso por livro (1189 itens seria longo demais para listar)
  const livros =
    plano.tipo === 'capitulos'
      ? [...new Map(itens.map((i) => [i.livro, i])).keys()].map((livro) => {
          const doLivro = itens.filter((i) => i.livro === livro)
          return { livro, fase: doLivro[0].fase, total: doLivro.length, feitos: doLivro.filter((i) => i.concluido_em).length }
        })
      : []

  return (
    <div className="space-y-4">
      <Campo rotulo="Hábito vinculado (check-in automático ao concluir)">
        <select value={plano.habito_id ?? ''} onChange={(e) => vincular.mutate(e.target.value)}>
          <option value="">—</option>
          {habitos.map((h) => (
            <option key={h.id} value={h.id}>
              {h.titulo}
            </option>
          ))}
        </select>
      </Campo>

      {plano.tipo === 'capitulos' ? (
        <>
          {prox && (
            <div className="flex items-center gap-2">
              <span className="flex-1">
                Próximo:{' '}
                <b>
                  {prox.livro} {prox.capitulo}
                </b>
              </span>
              <Botao variante="primario" onClick={() => concluir.mutate(prox)}>
                Li
              </Botao>
            </div>
          )}
          <ul className="max-h-[50dvh] space-y-1 overflow-y-auto text-sm">
            {livros.map((l, i) => (
              <li key={l.livro}>
                {(i === 0 || livros[i - 1].fase !== l.fase) && (
                  <div className="mt-3 mb-1 text-xs font-semibold text-amber-400">{l.fase}</div>
                )}
                <div className="flex items-center gap-2">
                  <span className={cx('w-32', l.feitos === l.total && 'text-emerald-400')}>{l.livro}</span>
                  <div className="flex-1">
                    <Barra valor={l.feitos / l.total} />
                  </div>
                  <span className="w-14 text-right text-xs tabular-nums text-slate-400">
                    {l.feitos}/{l.total}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <Campo rotulo="Semana atual do plano" dica="Marca como concluídas as semanas anteriores.">
            <select value={prox?.semana ?? prox?.ordem ?? ''} onChange={(e) => semana.mutate(Number(e.target.value))}>
              {itens.map((i) => (
                <option key={i.id} value={i.semana ?? i.ordem}>
                  Semana {i.semana ?? i.ordem} — {i.titulo}
                </option>
              ))}
            </select>
          </Campo>
          <ul className="max-h-[50dvh] space-y-2 overflow-y-auto">
            {itens.map((i, idx) => (
              <li key={i.id} className={cx('rounded-lg border p-2 text-sm', i.id === prox?.id ? 'border-amber-600' : 'border-slate-800')}>
                {(idx === 0 || itens[idx - 1].modulo !== i.modulo) && i.modulo && (
                  <div className="mb-1 text-xs font-semibold text-amber-400">{i.modulo}</div>
                )}
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="mt-0.5" checked={!!i.concluido_em} onChange={() => concluir.mutate(i)} />
                  <span>
                    <b>Semana {i.semana ?? i.ordem}</b> — {i.titulo}
                  </span>
                </label>
                {i.leitura && <p className="mt-1 whitespace-pre-line text-slate-400">📖 {i.leitura}</p>}
                {i.pratica && <p className="text-slate-400">🛠 {i.pratica}</p>}
                {i.pergunta && (
                  <>
                    <p className="text-amber-200/90">❓ {i.pergunta}</p>
                    <textarea
                      rows={2}
                      className="mt-1 w-full"
                      defaultValue={i.resposta_pergunta ?? ''}
                      placeholder="Resposta (também aparece na revisão semanal)"
                      onBlur={(e) => e.target.value !== (i.resposta_pergunta ?? '') && responder.mutate({ id: i.id, r: e.target.value })}
                    />
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      <Botao variante="perigo" className="w-full" onClick={() => confirm('Excluir este plano e o progresso?') && excluir.mutate(undefined)}>
        Excluir plano
      </Botao>
    </div>
  )
}

// ---------- Livros ----------

const STATUS_LIVRO: [Livro['status'], string][] = [
  ['lendo', 'Lendo'],
  ['quero_ler', 'Quero ler'],
  ['lido', 'Lidos'],
  ['abandonado', 'Abandonados'],
]

function Livros() {
  const livros = useTabela('livros')
  const [aberto, setAberto] = useState<Livro | 'novo' | null>(null)
  return (
    <>
      {STATUS_LIVRO.map(([st, rotulo]) => {
        const lista = livros.filter((l) => l.status === st)
        if (!lista.length) return null
        return (
          <Card key={st} titulo={`${rotulo} (${lista.length})`}>
            <ul className="space-y-3">
              {lista.map((l) => (
                <li key={l.id}>
                  <button className="w-full text-left" onClick={() => setAberto(l)}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{l.titulo}</span>
                      <span className="text-xs text-slate-500">{l.categoria}</span>
                    </div>
                    <div className="text-xs text-slate-400">{l.autor}</div>
                    {l.paginas ? (
                      <div className="mt-1 flex items-center gap-2">
                        <Barra valor={l.pagina_atual / l.paginas} />
                        <span className="text-xs tabular-nums text-slate-500">
                          {l.pagina_atual}/{l.paginas}
                        </span>
                      </div>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )
      })}
      {livros.length === 0 && <Vazio>Nenhum livro na lista.</Vazio>}
      <Botao variante="primario" className="w-full" onClick={() => setAberto('novo')}>
        <Plus size={16} /> Adicionar livro
      </Botao>
      <Folha aberta={aberto !== null} onFechar={() => setAberto(null)} titulo={aberto === 'novo' ? 'Novo livro' : 'Livro'}>
        {aberto !== null && (
          <FormLivro key={aberto === 'novo' ? 'n' : aberto.id} livro={aberto === 'novo' ? null : aberto} onFim={() => setAberto(null)} />
        )}
      </Folha>
    </>
  )
}

function FormLivro({ livro, onFim }: { livro: Livro | null; onFim: () => void }) {
  const [f, setF] = useState({
    titulo: livro?.titulo ?? '',
    autor: livro?.autor ?? '',
    categoria: livro?.categoria ?? 'livre',
    status: livro?.status ?? 'quero_ler',
    paginas: livro?.paginas?.toString() ?? '',
    pagina_atual: livro?.pagina_atual?.toString() ?? '0',
    notas: livro?.notas ?? '',
  })
  const salvar = useAcao(async () => {
    const dia = hoje()
    const dados = {
      titulo: f.titulo,
      autor: f.autor || null,
      categoria: f.categoria,
      status: f.status as Livro['status'],
      paginas: num(f.paginas),
      pagina_atual: num(f.pagina_atual) ?? 0,
      notas: f.notas || null,
      inicio: livro?.inicio ?? (f.status === 'lendo' ? dia : null),
      fim: f.status === 'lido' ? (livro?.fim ?? dia) : null,
    }
    if (livro) await db.update('livros', livro.id, dados)
    else await db.insert('livros', [dados])
    onFim()
  }, ['livros'])
  const excluir = useAcao(async () => {
    await db.remove('livros', livro!.id)
    onFim()
  }, ['livros'])
  return (
    <div className="space-y-3">
      <Campo rotulo="Título">
        <input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo rotulo="Autor">
          <input value={f.autor} onChange={(e) => setF({ ...f, autor: e.target.value })} />
        </Campo>
        <Campo rotulo="Categoria">
          <select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
            <option value="filosofia">Filosofia</option>
            <option value="estudo">Estudo</option>
            <option value="livre">Livre</option>
            <option value="biblia">Bíblia</option>
          </select>
        </Campo>
        <Campo rotulo="Status">
          <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Livro['status'] })}>
            {STATUS_LIVRO.map(([s, r]) => (
              <option key={s} value={s}>
                {r}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Páginas (atual / total)">
          <div className="flex gap-1">
            <input
              className="w-1/2"
              inputMode="numeric"
              value={f.pagina_atual}
              onChange={(e) => setF({ ...f, pagina_atual: e.target.value })}
            />
            <input className="w-1/2" inputMode="numeric" value={f.paginas} onChange={(e) => setF({ ...f, paginas: e.target.value })} />
          </div>
        </Campo>
      </div>
      <Campo rotulo="Notas">
        <textarea rows={3} value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} />
      </Campo>
      <div className="flex gap-2">
        <Botao variante="primario" className="flex-1" disabled={!f.titulo.trim()} onClick={() => salvar.mutate(undefined)}>
          Salvar
        </Botao>
        {livro && (
          <Botao variante="perigo" onClick={() => confirm('Excluir livro?') && excluir.mutate(undefined)}>
            Excluir
          </Botao>
        )}
      </div>
    </div>
  )
}
