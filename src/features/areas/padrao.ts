import type { Area } from '@/lib/types'

// §4 — configuração inicial (validada no onboarding)
export const AREAS_PADRAO: Omit<Area, 'id'>[] = [
  { nome: 'Mente & Espírito', cor: '#a78bfa', icone: 'brain', ordem: 0, visao: null, ativa: true },
  { nome: 'Idiomas', cor: '#38bdf8', icone: 'languages', ordem: 1, visao: null, ativa: true },
  { nome: 'Saúde', cor: '#34d399', icone: 'heart-pulse', ordem: 2, visao: null, ativa: true },
  { nome: 'Profissional', cor: '#f59e0b', icone: 'briefcase', ordem: 3, visao: null, ativa: true },
  { nome: 'Finanças pessoais', cor: '#f472b6', icone: 'wallet', ordem: 4, visao: null, ativa: true },
]
