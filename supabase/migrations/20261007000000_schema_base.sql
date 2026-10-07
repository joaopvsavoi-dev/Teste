-- Norte — schema base (§10 do plano do projeto)
create extension if not exists pgcrypto;

-- Enums
create type freq_tipo      as enum ('diario','dias_semana','x_por_semana');
create type checkin_status as enum ('feito','minimo','dispensado','falhou');
create type projeto_status as enum ('backlog','ativo','pausado','concluido','abandonado');
create type ciclo_status   as enum ('planejado','ativo','revisao','encerrado');
create type revisao_tipo   as enum ('semanal','mensal','ciclo');
create type bloco_origem   as enum ('app','google');

create table areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null, cor text, icone text, ordem int default 0,
  visao text,
  ativa boolean default true,
  created_at timestamptz default now()
);

create table ciclos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text, inicio date not null, fim date not null,
  status ciclo_status default 'planejado',
  tema text, retrospectiva jsonb
);

create table roda_vida (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  ciclo_id uuid references ciclos on delete cascade,
  area_id uuid references areas on delete cascade,
  nota smallint check (nota between 0 and 10), comentario text,
  unique (ciclo_id, area_id)
);

create table metas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  ciclo_id uuid references ciclos on delete cascade,
  area_id uuid references areas on delete set null,
  titulo text not null, porque text,
  unidade text,
  valor_inicial numeric default 0, valor_alvo numeric not null,
  status text default 'em_andamento',
  resultado_nota text
);

create table meta_registros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  meta_id uuid references metas on delete cascade,
  data date not null, valor numeric not null, nota text
);

create table habitos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  area_id uuid references areas on delete set null,
  meta_id uuid references metas on delete set null,
  titulo text not null,
  gatilho_se text,
  acao_entao text,
  versao_minima text,
  freq freq_tipo not null default 'diario',
  dias_semana smallint[],
  vezes_por_semana smallint,
  duracao_min int, horario_preferido time,
  unidade text, valor_alvo numeric,
  gerar_bloco boolean default true,
  ativo boolean default true, inicio date default current_date,
  ordem int default 0
);

create table checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  habito_id uuid references habitos on delete cascade,
  data date not null,
  status checkin_status not null,
  valor numeric, nota text,
  created_at timestamptz default now(),
  unique (habito_id, data)
);

create table configuracoes (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  limite_projetos_ativos int default 2,
  dia_revisao smallint default 7,
  perguntas_diario jsonb,
  gcal_calendar_id text,
  gcal_ler_agenda_principal boolean default true,
  onboarding_concluido boolean default false
);

create table projetos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  area_id uuid references areas on delete set null,
  meta_id uuid references metas on delete set null,
  titulo text not null,
  definicao_de_pronto text not null,
  status projeto_status default 'backlog',
  prazo date, concluido_em date, ordem int default 0
);

-- Limite de projetos ativos (P7)
create or replace function checar_limite_projetos() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  limite int;
  ativos int;
begin
  if new.status = 'ativo' and (tg_op = 'INSERT' or old.status is distinct from 'ativo') then
    select coalesce(limite_projetos_ativos, 2) into limite from configuracoes where user_id = new.user_id;
    limite := coalesce(limite, 2);
    select count(*) into ativos from projetos where user_id = new.user_id and status = 'ativo' and id <> new.id;
    if ativos >= limite then
      raise exception 'Limite de % projetos ativos atingido. Pause ou conclua um projeto antes.', limite
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

create trigger trg_limite_projetos before insert or update of status on projetos
  for each row execute function checar_limite_projetos();

create table tarefas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  projeto_id uuid references projetos on delete cascade,
  titulo text not null, estimativa_min int,
  semana_inicio date,
  concluida_em timestamptz, ordem int default 0
);

create table blocos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  inicio timestamptz not null, fim timestamptz not null,
  titulo text not null,
  area_id uuid references areas on delete set null,
  habito_id uuid references habitos on delete set null,
  projeto_id uuid references projetos on delete set null,
  tarefa_id uuid references tarefas on delete set null,
  origem bloco_origem not null default 'app',
  gcal_event_id text unique, gcal_etag text, gcal_updated timestamptz,
  sync_status text default 'pendente',
  deleted_at timestamptz,
  updated_at timestamptz default now()
);

create or replace function tocar_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger trg_blocos_updated before update on blocos for each row execute function tocar_updated_at();

create table planos_leitura (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  area_id uuid references areas on delete set null,
  habito_id uuid references habitos on delete set null,   -- check-in automático ao concluir item
  tipo text default 'capitulos',                           -- capitulos | semanal
  titulo text not null,
  inicio date, fonte_md text
);

create table plano_itens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  plano_id uuid references planos_leitura on delete cascade,
  ordem int not null,
  semana int, modulo text, titulo text,
  livro text, capitulo int, fase text,
  leitura text, pratica text, pergunta text,
  concluido_em date, resposta_pergunta text
);
create index plano_itens_plano_ordem on plano_itens (plano_id, ordem);

create table livros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  titulo text not null, autor text,
  categoria text,
  status text default 'quero_ler',
  paginas int, pagina_atual int default 0,
  inicio date, fim date, notas text
);

create table diario (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  data date not null, respostas jsonb not null,
  unique (user_id, data)
);

create table revisoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  tipo revisao_tipo not null,
  periodo_inicio date not null, periodo_fim date not null,
  score numeric, respostas jsonb, created_at timestamptz default now()
);

create table fechamentos_mensais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  mes date not null,
  renda numeric, gastos_total numeric,
  gastos_categorias jsonb,
  aporte numeric, patrimonio_investido numeric,
  observacoes text,
  unique (user_id, mes)
);

create table metas_financeiras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  titulo text not null,
  tipo text,
  valor_alvo numeric not null, prazo date
);

create table gcal_sync_estado (
  user_id uuid primary key references auth.users on delete cascade,
  calendar_id text not null,
  sync_token text,
  channel_id text, resource_id text, channel_expira_em timestamptz,
  refresh_token_secret_id uuid,
  ultimo_sync timestamptz
);

-- RLS
do $$
declare t text;
begin
  foreach t in array array['areas','ciclos','roda_vida','metas','meta_registros','habitos','checkins',
    'configuracoes','projetos','tarefas','blocos','planos_leitura','plano_itens','livros','diario',
    'revisoes','fechamentos_mensais','metas_financeiras']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy dono on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- gcal_sync_estado: sem policy para o client (só service role)
alter table gcal_sync_estado enable row level security;
