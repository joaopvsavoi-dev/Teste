import { useState } from 'react'
import { Botao, Campo, cx, num } from '@/components/ui'
import { hoje, NOMES_DIAS } from '@/lib/dates'
import type { Area, FreqTipo, Habito, Meta } from '@/lib/types'

export type HabitoNovo = Omit<Habito, 'id'>

export function habitoVazio(p: Partial<HabitoNovo> = {}): HabitoNovo {
  return {
    area_id: null,
    meta_id: null,
    titulo: '',
    gatilho_se: '',
    acao_entao: '',
    versao_minima: '',
    freq: 'diario',
    dias_semana: [1, 2, 3, 4, 5],
    vezes_por_semana: 3,
    duracao_min: 30,
    horario_preferido: '07:00',
    unidade: null,
    valor_alvo: null,
    gerar_bloco: true,
    ativo: true,
    inicio: hoje(),
    ordem: 0,
    ...p,
  }
}

/** Formulário de hábito — todo hábito nasce com SE (gatilho) + ENTÃO (ação) + horário (P3) e versão mínima (P8). */
export function FormHabito({
  inicial,
  areas,
  metas,
  onSalvar,
  onExcluir,
  rotuloSalvar = 'Salvar',
}: {
  inicial: HabitoNovo
  areas: Area[]
  metas: Meta[]
  onSalvar: (h: HabitoNovo) => void
  onExcluir?: () => void
  rotuloSalvar?: string
}) {
  const [h, setH] = useState<HabitoNovo>(inicial)
  const set = <K extends keyof HabitoNovo>(k: K, v: HabitoNovo[K]) => setH((x) => ({ ...x, [k]: v }))
  const valido = h.titulo.trim() && h.gatilho_se?.trim() && h.acao_entao?.trim() && h.versao_minima?.trim()

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (valido) onSalvar({ ...h, horario_preferido: h.horario_preferido || null })
      }}
    >
      <Campo rotulo="Nome do hábito">
        <input value={h.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Italiano" autoFocus />
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo rotulo="SE (gatilho)">
          <input value={h.gatilho_se ?? ''} onChange={(e) => set('gatilho_se', e.target.value)} placeholder="Depois do café da manhã" />
        </Campo>
        <Campo rotulo="ENTÃO (ação)">
          <input value={h.acao_entao ?? ''} onChange={(e) => set('acao_entao', e.target.value)} placeholder="estudo italiano 20 min" />
        </Campo>
      </div>
      <Campo rotulo="Versão mínima (dias ruins)" dica="Conta como execução no score e mantém a identidade.">
        <input value={h.versao_minima ?? ''} onChange={(e) => set('versao_minima', e.target.value)} placeholder="revisar 5 palavras" />
      </Campo>

      <Campo rotulo="Frequência">
        <select value={h.freq} onChange={(e) => set('freq', e.target.value as FreqTipo)}>
          <option value="diario">Diário</option>
          <option value="dias_semana">Dias da semana</option>
          <option value="x_por_semana">X vezes por semana</option>
        </select>
      </Campo>
      {h.freq === 'dias_semana' && (
        <div className="flex gap-1">
          {NOMES_DIAS.map((n, i) => {
            const d = i + 1
            const on = (h.dias_semana ?? []).includes(d)
            return (
              <button
                type="button"
                key={d}
                onClick={() => set('dias_semana', on ? (h.dias_semana ?? []).filter((x) => x !== d) : [...(h.dias_semana ?? []), d].sort())}
                className={cx(
                  'flex-1 rounded-lg border py-1.5 text-xs',
                  on ? 'border-amber-500 bg-amber-500/20 text-amber-200' : 'border-slate-700 text-slate-400',
                )}
              >
                {n}
              </button>
            )
          })}
        </div>
      )}
      {h.freq === 'x_por_semana' && (
        <Campo rotulo="Vezes por semana">
          <input
            type="number"
            min={1}
            max={7}
            value={h.vezes_por_semana ?? ''}
            onChange={(e) => set('vezes_por_semana', num(e.target.value))}
          />
        </Campo>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Campo rotulo="Horário preferido">
          <input type="time" value={h.horario_preferido?.slice(0, 5) ?? ''} onChange={(e) => set('horario_preferido', e.target.value)} />
        </Campo>
        <Campo rotulo="Duração (min)">
          <input type="number" min={1} value={h.duracao_min ?? ''} onChange={(e) => set('duracao_min', num(e.target.value))} />
        </Campo>
        <Campo rotulo="Unidade (opcional)">
          <input value={h.unidade ?? ''} onChange={(e) => set('unidade', e.target.value || null)} placeholder="min, km, páginas" />
        </Campo>
        <Campo rotulo="Valor-alvo (opcional)">
          <input inputMode="decimal" value={h.valor_alvo ?? ''} onChange={(e) => set('valor_alvo', num(e.target.value))} />
        </Campo>
        <Campo rotulo="Área">
          <select value={h.area_id ?? ''} onChange={(e) => set('area_id', e.target.value || null)}>
            <option value="">—</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Meta do ciclo">
          <select value={h.meta_id ?? ''} onChange={(e) => set('meta_id', e.target.value || null)}>
            <option value="">Manutenção (sem meta)</option>
            {metas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.titulo}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Início">
          <input type="date" value={h.inicio} onChange={(e) => set('inicio', e.target.value)} />
        </Campo>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={h.gerar_bloco} onChange={(e) => set('gerar_bloco', e.target.checked)} /> Gerar bloco na agenda
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={h.ativo} onChange={(e) => set('ativo', e.target.checked)} /> Ativo
        </label>
      </div>
      <div className="flex gap-2 pt-1">
        <Botao type="submit" variante="primario" className="flex-1" disabled={!valido}>
          {rotuloSalvar}
        </Botao>
        {onExcluir && (
          <Botao variante="perigo" onClick={() => confirm('Excluir o hábito e todos os check-ins?') && onExcluir()}>
            Excluir
          </Botao>
        )}
      </div>
      {!valido && <p className="text-xs text-slate-500">Preencha nome, SE, ENTÃO e versão mínima.</p>}
    </form>
  )
}
