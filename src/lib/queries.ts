import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from './db'
import type { Configuracoes, Tabela, Tabelas } from './types'

export function useTabela<T extends Tabela>(t: T) {
  return useQuery({ queryKey: [t], queryFn: () => db.list(t) }).data ?? ([] as Tabelas[T][])
}

export function useTabelaQuery<T extends Tabela>(t: T) {
  return useQuery({ queryKey: [t], queryFn: () => db.list(t) })
}

export function useConfig(): Configuracoes | undefined {
  return useQuery({ queryKey: ['configuracoes'], queryFn: () => db.getConfig() }).data
}

/** Mutação genérica que invalida as tabelas informadas ao terminar e mostra o erro ao usuário. */
export function useAcao<A>(fn: (a: A) => Promise<unknown>, invalida: (Tabela | 'configuracoes')[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => Promise.all(invalida.map((t) => qc.invalidateQueries({ queryKey: [t] }))),
    onError: (e: Error) => alert(e.message),
  })
}

export function useInvalidar() {
  const qc = useQueryClient()
  return (...ts: (Tabela | 'configuracoes')[]) => Promise.all(ts.map((t) => qc.invalidateQueries({ queryKey: [t] })))
}
