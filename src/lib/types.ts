// Espelha o modelo de dados do §10. Datas `date` são strings 'yyyy-MM-dd'.
export type FreqTipo = 'diario' | 'dias_semana' | 'x_por_semana'
export type CheckinStatus = 'feito' | 'minimo' | 'dispensado' | 'falhou'
export type ProjetoStatus = 'backlog' | 'ativo' | 'pausado' | 'concluido' | 'abandonado'
export type CicloStatus = 'planejado' | 'ativo' | 'revisao' | 'encerrado'
export type RevisaoTipo = 'semanal' | 'mensal' | 'ciclo'

export interface Area {
  id: string
  nome: string
  cor: string | null
  icone: string | null
  ordem: number
  visao: string | null
  ativa: boolean
}

export interface Ciclo {
  id: string
  nome: string | null
  inicio: string
  fim: string
  status: CicloStatus
  tema: string | null
  retrospectiva: Record<string, unknown> | null
}

export interface RodaVida {
  id: string
  ciclo_id: string
  area_id: string
  nota: number
  comentario: string | null
}

export interface Meta {
  id: string
  ciclo_id: string
  area_id: string | null
  titulo: string
  porque: string | null
  unidade: string | null
  valor_inicial: number
  valor_alvo: number
  status: 'em_andamento' | 'atingida' | 'parcial' | 'nao_atingida'
  resultado_nota: string | null
}

export interface MetaRegistro {
  id: string
  meta_id: string
  data: string
  valor: number
  nota: string | null
}

export interface Habito {
  id: string
  area_id: string | null
  meta_id: string | null
  titulo: string
  gatilho_se: string | null
  acao_entao: string | null
  versao_minima: string | null
  freq: FreqTipo
  dias_semana: number[] | null // 1=seg ... 7=dom
  vezes_por_semana: number | null
  duracao_min: number | null
  horario_preferido: string | null // 'HH:mm' ou 'HH:mm:ss'
  unidade: string | null
  valor_alvo: number | null
  gerar_bloco: boolean
  ativo: boolean
  inicio: string
  ordem: number
}

export interface Checkin {
  id: string
  habito_id: string
  data: string
  status: CheckinStatus
  valor: number | null
  nota: string | null
}

export interface Projeto {
  id: string
  area_id: string | null
  meta_id: string | null
  titulo: string
  definicao_de_pronto: string
  status: ProjetoStatus
  prazo: string | null
  concluido_em: string | null
  ordem: number
}

export interface Tarefa {
  id: string
  projeto_id: string
  titulo: string
  estimativa_min: number | null
  semana_inicio: string | null
  concluida_em: string | null
  ordem: number
}

export interface Bloco {
  id: string
  inicio: string // ISO timestamptz
  fim: string
  titulo: string
  area_id: string | null
  habito_id: string | null
  projeto_id: string | null
  tarefa_id: string | null
  origem: 'app' | 'google'
  gcal_event_id: string | null
  sync_status: 'pendente' | 'sincronizado' | 'erro'
  deleted_at: string | null
  updated_at?: string
}

export interface PlanoLeitura {
  id: string
  area_id: string | null
  habito_id: string | null
  tipo: 'capitulos' | 'semanal'
  titulo: string
  inicio: string | null
  fonte_md: string | null
}

export interface PlanoItem {
  id: string
  plano_id: string
  ordem: number
  semana: number | null
  modulo: string | null
  titulo: string | null
  livro: string | null
  capitulo: number | null
  fase: string | null
  leitura: string | null
  pratica: string | null
  pergunta: string | null
  concluido_em: string | null
  resposta_pergunta: string | null
}

export interface Livro {
  id: string
  titulo: string
  autor: string | null
  categoria: string | null
  status: 'quero_ler' | 'lendo' | 'lido' | 'abandonado'
  paginas: number | null
  pagina_atual: number
  inicio: string | null
  fim: string | null
  notas: string | null
}

export interface Diario {
  id: string
  data: string
  respostas: Record<string, string>
}

export interface Revisao {
  id: string
  tipo: RevisaoTipo
  periodo_inicio: string
  periodo_fim: string
  score: number | null
  respostas: Record<string, unknown> | null
  created_at?: string
}

export interface FechamentoMensal {
  id: string
  mes: string
  renda: number | null
  gastos_total: number | null
  gastos_categorias: Record<string, number> | null
  aporte: number | null
  patrimonio_investido: number | null
  observacoes: string | null
}

export interface MetaFinanceira {
  id: string
  titulo: string
  tipo: 'taxa_poupanca' | 'aporte_acumulado' | 'patrimonio' | 'reserva' | null
  valor_alvo: number
  prazo: string | null
}

export interface Configuracoes {
  limite_projetos_ativos: number
  dia_revisao: number
  perguntas_diario: string[] | null
  gcal_calendar_id: string | null
  gcal_ler_agenda_principal: boolean
  onboarding_concluido: boolean
}

export interface Tabelas {
  areas: Area
  ciclos: Ciclo
  roda_vida: RodaVida
  metas: Meta
  meta_registros: MetaRegistro
  habitos: Habito
  checkins: Checkin
  projetos: Projeto
  tarefas: Tarefa
  blocos: Bloco
  planos_leitura: PlanoLeitura
  plano_itens: PlanoItem
  livros: Livro
  diario: Diario
  revisoes: Revisao
  fechamentos_mensais: FechamentoMensal
  metas_financeiras: MetaFinanceira
}

export type Tabela = keyof Tabelas
