# Norte — App de Planejamento Pessoal, Metas e Hábitos

> **Nome provisório.** Documento-guia do projeto: visão, modelo conceitual, escopo da v1, arquitetura, modelo de dados, integração com Google Agenda e roadmap.
> Versão 1.0 — outubro/2026 — Dono: João Pedro

---

## 0. Como usar este documento

- É a **fonte da verdade** do projeto. Quem for implementar (você, Claude Code etc.) lê este arquivo antes de cada fase.
- Mudou uma decisão? Atualize a seção correspondente e registre-a em **§15 Registro de decisões**.
- As seções 3 a 8 dizem **o quê** construir. As seções 9 a 13 dizem **como**.

---

## 1. Visão e problema

**Problema.** Há objetivos claros em várias áreas (leitura, idiomas, saúde, carreira, finanças), mas a execução falha por falta de estrutura. Projetos começam e não terminam, hábitos não se consolidam e a semana não é planejada com intenção.

**Visão.** Um sistema pessoal único que liga **quem eu quero ser** (visão) → **o que vou conquistar neste ciclo** (metas) → **o que faço esta semana e hoje** (hábitos e blocos na agenda). Tudo é medido pela execução, não só pelo resultado.

**Para quem.** Uso pessoal, com um único usuário. Nada de recursos sociais ou multiusuário na v1.

**Critério de sucesso do produto.** Depois de 2 ciclos de 12 semanas usando o app:
- score de execução semanal médio ≥ 75%;
- pelo menos 1 projeto profissional concluído por ciclo;
- revisão semanal feita em ≥ 10 de 12 semanas.

---

## 2. Princípios de design (vindos da pesquisa)

| # | Princípio | Evidência / origem | Implicação no app |
|---|---|---|---|
| P1 | **Hábito leva meses, não 21 dias** | Lally et al. (UCL): mediana de ~66 dias até a automaticidade, com faixa de 18 a ~254. Exercício é mais lento (~91 dias) | Nada de mensagens de "hábito formado em 21 dias". A métrica principal é a **força do hábito** (média móvel), não a sequência |
| P2 | **Um deslize isolado não destrói o hábito** | No mesmo estudo, perder um dia teve pouco efeito; o problema é acumular falhas | Sem "zerar streak". A regra visível é **"nunca falhar duas vezes"**: alerta quando o hábito falhou ontem |
| P3 | **Planos se-então funcionam** | Gollwitzer & Sheeran (2006), meta-análise de 94 testes: d = 0,65. O efeito é maior no formato se-então e com o plano ensaiado | Todo hábito nasce com **gatilho (SE) + ação (ENTÃO) + horário**. Esse horário vira **bloco na agenda** |
| P4 | **Medir ação (lead), não só resultado (lag)** | 12 Week Year / 4DX | Cada meta tem um indicador de resultado (lag) e é sustentada por hábitos e tarefas (lead) |
| P5 | **Execução semanal ≥ 85%** | 12 Week Year: completar ≥ 85% do plano semanal tende a levar ao objetivo | **Score semanal** com faixas verde ≥ 85%, amarelo 65–84% e vermelho < 65% |
| P6 | **Poucas metas, horizonte curto** | 12 Week Year (ciclos de 12 semanas), OKRs | No máximo **1 meta por área e 5 por ciclo**. O ciclo tem 12 semanas + 1 de revisão |
| P7 | **Limitar trabalho em andamento** | Kanban / WIP | No máximo **2 projetos ativos** (configurável). Um projeto novo só entra quando outro sai |
| P8 | **Versão mínima para dias ruins** | Hábitos Atômicos (regra dos 2 minutos) | Cada hábito tem uma **versão mínima**, que conta como execução e mantém a identidade |
| P9 | **Fricção mínima no registro** | — | Check-in diário em **≤ 30 segundos**, em 1 toque por hábito, no celular |
| P10 | **Revisão é o motor** | GTD / 12 Week Year | Os rituais semanal, mensal e de ciclo são guiados pelo app, passo a passo |

---

## 3. Modelo conceitual

```
ÁREA DE VIDA ──── Visão (3–5 anos) · Nota da Roda da Vida (0–10)
   │
   └── META DO CICLO (12 semanas)  ← indicador LAG (resultado)
          │
          ├── HÁBITOS  ← indicador LEAD (recorrente, se-então, versão mínima)
          │      └── CHECK-INS diários
          │
          └── PROJETOS (limite de ativos)  ← entregas únicas
                 └── PRÓXIMOS PASSOS (tarefas)

SEMANA ── Plano semanal (hábitos esperados + tarefas escolhidas)
   └── BLOCOS DE AGENDA ⇄ Google Agenda (sincronização em 2 sentidos)

RITUAIS ── Check-in diário · Revisão semanal · Fechamento mensal · Revisão do ciclo
```

### Glossário

- **Área**: um domínio da vida. É fixa e muda pouco.
- **Visão**: um texto curto sobre "quem quero ser nesta área em 3–5 anos", revisado uma vez por ano.
- **Ciclo**: 12 semanas de execução + 1 semana de revisão. São 4 ciclos por ano.
- **Meta**: um resultado mensurável dentro do ciclo, com valor inicial, valor-alvo e unidade.
- **Hábito**: comportamento recorrente com frequência, gatilho, ação, versão mínima e duração. Pode ou não estar ligado a uma meta (hábitos "de manutenção").
- **Projeto**: entrega com início e fim e uma **definição de pronto** explícita.
- **Próximo passo**: tarefa concreta de um projeto. Pode ser puxada para o plano semanal.
- **Bloco**: um intervalo na agenda reservado para um hábito, projeto ou área.
- **Score semanal**: itens planejados que foram executados ÷ itens planejados.
- **Força do hábito**: média móvel exponencial da execução (ver §7).

---

## 4. Áreas de vida — configuração inicial

As áreas e os exemplos abaixo **precisam ser validados no onboarding**. Os exemplos de metas são ilustrativos e não são metas decididas.

| Área | Escopo | Exemplos de hábitos (lead) | Exemplos de metas do ciclo (lag) |
|---|---|---|---|
| **Mente & Espírito** | Plano de filosofia, estudos, livros diversos, Bíblia, diário/exame noturno | Leitura do plano de filosofia (25–35 min/dia); leitura bíblica diária; exame noturno | Concluir os módulos X–Y do plano de filosofia; terminar N livros |
| **Idiomas** | Manutenção do inglês, aprendizado de italiano | Italiano 20 min/dia; conteúdo em inglês 3x/semana | Nível A1/A2 de italiano; N horas de exposição ao inglês |
| **Saúde** | Academia (hipertrofia), corrida, bike | Academia 3–4x/semana; corrida 2x; bike 1x | Volume semanal (km); cargas-alvo; constância ≥ X% |
| **Profissional** | Metas, projetos novos, conclusão de projetos iniciados, novas receitas | Bloco de trabalho profundo 3x/semana | Concluir o projeto X; validar a fonte de receita Y |
| **Finanças pessoais** | Renda, gastos, investimentos (fechamento mensal na v1) | Fechamento mensal (1x/mês) | Taxa de poupança ≥ X%; aporte acumulado ≥ R$ Y |

**Rotina e agenda** é **transversal** e não é uma área: aparece no plano semanal e nos blocos.

### 4.1 Plano de filosofia (importação)

O plano de filosofia já criado neste projeto está em **semanas → módulos**, cada semana com **leitura, prática e pergunta da semana**, e tem versões de 12 meses (52 semanas) e intensiva de 6 meses (26 semanas). O app deve **importar o .md do plano** para a estrutura `planos_leitura` / `plano_itens` (ver §10):
- cada semana do plano vira um item com leitura, prática e pergunta;
- a semana corrente aparece na tela **Hoje**;
- a "pergunta da semana" entra automaticamente na **revisão semanal**;
- o "exame noturno" do plano vira o **diário** do app (perguntas configuráveis).

**Versão em vigor: 12 meses** (52 semanas: 6 módulos de 8 semanas + 4 de integração; 25–35 min de leitura + 10 min de diário por dia). O hábito-padrão gerado na importação é "Leitura do plano de filosofia — 30 min/dia", com versão mínima "ler 1 página". **A confirmar:** a semana atual do plano.

### 4.2 Plano de leitura bíblica

**1 capítulo por dia, ordem por impacto no desenvolvimento pessoal** (detalhe em `plano-biblia.md`). O plano é sequencial e sem datas: a tela Hoje mostra o próximo capítulo pendente.

| Fase | Conteúdo | Capítulos |
|---|---|---|
| 1 | Vida de Jesus + sabedoria: Marcos, Provérbios, Mateus, Tiago, Lucas, Eclesiastes, João | 137 (~4,5 meses) |
| 2 | Caráter e propósito: Atos e cartas | 129 |
| 3 | Liderança e coragem no AT: José, Neemias, Rute, Ester, Daniel, Josué, Samuel, Jó | 210 |
| 4 | Salmos | 150 |
| 5 | Restante da Bíblia (ordem canônica) | 563 |

Hábito: SE terminar o café da manhã, ENTÃO leio o próximo capítulo · versão mínima: 1 versículo.

---

## 5. Escopo

### 5.1 Dentro da v1

1. **Onboarding guiado**: Roda da Vida → visão por área → metas do 1º ciclo → hábitos com se-então → projetos ativos.
2. **Áreas e visão**: CRUD, cor e ícone por área, nota da Roda da Vida a cada ciclo.
3. **Ciclos e metas**: criar ciclo, até 5 metas, registro do indicador lag e gráfico de progresso contra a linha ideal.
4. **Hábitos**: frequência (diária, dias da semana ou X por semana), gatilho/ação, versão mínima, duração, horário preferido, unidade opcional (ex.: minutos, km, páginas).
5. **Check-in diário (tela Hoje)**: 1 toque = feito, toque longo = mínimo / dispensado / valor numérico.
6. **Projetos com limite de ativos**: status, definição de pronto, próximos passos.
7. **Plano e revisão semanal**: score, retrospectiva, escolha das tarefas da semana e geração dos blocos.
8. **Agenda com sincronização bidirecional com o Google Agenda** (ver §11).
9. **Leitura**: planos de leitura importáveis (filosofia, Bíblia), lista de livros com progresso.
10. **Diário / exame noturno**: perguntas configuráveis, uma entrada por dia.
11. **Finanças — metas e fechamento mensal**: renda, gastos por categoria macro, aporte, patrimônio investido e taxa de poupança calculada.
12. **Painel**: score das últimas semanas, força dos hábitos, progresso das metas, Roda da Vida.
13. **PWA instalável** no celular (manifest + service worker).

### 5.2 Fora da v1 (backlog)

- Lançamento de transações financeiras, importação de extrato/OFX, carteira detalhada.
- Integração com Strava (corrida/bike automáticos) → Fase 6.
- Notificações push (web push) → Fase 6.
- Coach com IA (Claude API) na revisão semanal → Fase 6.
- Modo offline completo com fila de sincronização.
- Multiusuário / compartilhamento.

---

## 6. Rituais (fluxos guiados)

### 6.1 Check-in diário (≤ 30 s)
- A tela **Hoje** lista os hábitos esperados hoje, os blocos do dia e o próximo passo de cada projeto ativo.
- Hábito que falhou ontem aparece com o selo **"não falhe duas vezes"**.
- À noite: diário / exame noturno (opcional, 2–5 min).

### 6.2 Revisão semanal (domingo, 20–30 min, agendada como bloco fixo)
1. **Score da semana** calculado automaticamente, com os itens que faltaram.
2. **Retrospectiva**: o que funcionou, o que travou, o que muda (3 campos curtos) + a pergunta da semana do plano de filosofia.
3. **Indicadores lag**: atualizar o valor de cada meta.
4. **Projetos**: atualizar status e próximos passos, respeitando o limite de ativos.
5. **Plano da próxima semana**: escolher tarefas e confirmar os hábitos.
6. **Agenda**: o app propõe os blocos da semana (horários preferidos, sem conflito com a agenda principal). Você ajusta e confirma, e os blocos são enviados ao Google.

### 6.3 Fechamento mensal (1º fim de semana do mês, 15–20 min)
1. Finanças: renda, gastos por categoria, aporte, patrimônio investido. O app calcula a taxa de poupança e a variação.
2. Metas financeiras: progresso.
3. Visão rápida do mês: média do score, hábitos mais fracos.

### 6.4 Revisão do ciclo (semana 13)
1. Resultado de cada meta (atingida, parcial ou não atingida) + lições.
2. Nova nota na Roda da Vida.
3. Hábitos: manter, ajustar ou aposentar. Hábitos consolidados viram "manutenção".
4. Criação do próximo ciclo e de suas metas.

---

## 7. Métricas e regras de cálculo

### 7.1 Ocorrências esperadas de um hábito numa semana
- `diario` → 7
- `dias_semana` → quantidade de dias marcados
- `x_por_semana` → X

### 7.2 Status de um check-in
- `feito` = 1,0
- `minimo` = 1,0 para o score (é o objetivo da versão mínima), mas aparece com cor diferente
- `dispensado` = sai do denominador. Exige nota (ex.: viagem, doença) e tem limite de 1 por hábito por semana
- `falhou` ou ausência de check-in = 0

### 7.3 Score semanal
```
planejado  = Σ ocorrências esperadas dos hábitos ativos − dispensados
             + nº de tarefas no plano semanal
executado  = Σ min(check-ins feitos/mínimos, esperado) por hábito
             + nº de tarefas do plano concluídas
score      = executado / planejado
```
Faixas: **≥ 85% verde · 65–84% amarelo · < 65% vermelho**.

### 7.4 Força do hábito (no lugar da sequência)
Média móvel exponencial diária, calculada só nos dias em que o hábito era esperado:
```
força_hoje = força_ontem × (1 − α) + execução_hoje × α      α = 0,05 (~20 dias de memória)
```
Vai de 0 a 100%. Sobe devagar, cai devagar e não zera por um deslize (P1, P2).
Para hábitos `x_por_semana`, a força é calculada por semana: execução = min(feitos/X, 1).

### 7.5 Progresso de meta
- `progresso = (atual − inicial) / (alvo − inicial)`
- **Linha ideal** = progresso linear ao longo das 12 semanas. O gráfico mostra o real contra o ideal.

### 7.6 Finanças (fechamento mensal)
- `taxa_poupança = aporte / renda`
- `variação_patrimônio = patrimônio_mês − patrimônio_mês_anterior`

---

## 8. Telas (mobile-first)

1. **Hoje** — hábitos do dia (check-in), blocos do dia, próximos passos dos projetos ativos, leitura da semana do plano, diário.
2. **Semana** — calendário semanal com os blocos (sincronizados), score parcial, plano da semana.
3. **Metas** — ciclo atual, cards de metas com progresso real × ideal, hábitos e projetos ligados.
4. **Hábitos** — lista com força, mapa de calor de 12 semanas, editar o se-então e a versão mínima.
5. **Projetos** — quadro Backlog / Ativos (limite) / Pausados / Concluídos.
6. **Leitura** — planos (filosofia, Bíblia) com a semana atual e livros com progresso.
7. **Finanças** — fechamentos mensais, gráfico de patrimônio, taxa de poupança, metas financeiras.
8. **Revisão** — assistentes passo a passo (semanal, mensal, ciclo) e histórico.
9. **Áreas** — visão de cada área + Roda da Vida (gráfico radar por ciclo).
10. **Configurações** — conexão com o Google, agenda-alvo, limite de projetos ativos, dia da revisão, perguntas do diário.

A navegação inferior fica com: **Hoje · Semana · Metas · Hábitos · Mais**.

---

## 9. Arquitetura técnica

### 9.1 Stack
**Decidido: React + Vite (SPA)**, sem Next.js. O app é de uso pessoal, não precisa de SEO nem de renderização no servidor, e o back-end inteiro fica no Supabase (Edge Functions). Com Vite, o front é estático na Vercel, o PWA sai mais simples (vite-plugin-pwa) e o build é mais rápido.

| Camada | Escolha |
|---|---|
| Front-end | React + Vite + TypeScript, Tailwind CSS, Lucide Icons, fonte DM Sans |
| Estado de servidor | TanStack Query |
| Gráficos | Recharts |
| Datas | date-fns + date-fns-tz (fuso **America/Sao_Paulo**) |
| PWA | vite-plugin-pwa (manifest, ícones, service worker) |
| Back-end | Supabase: Postgres, Auth (Google), Edge Functions (Deno), pg_cron, Vault |
| Deploy | Vercel (front) + Supabase (banco e funções) |
| Integração | Google Calendar API v3 |

### 9.2 Estrutura de pastas (sugerida)
```
/src
  /app            rotas e layout (bottom nav)
  /features
    /today  /week  /goals  /habits  /projects
    /reading  /finance  /reviews  /areas  /settings
  /lib            supabase client, date utils, cálculos (score, força)
  /components     UI compartilhada
/supabase
  /migrations     SQL versionado
  /functions
    gcal-oauth-callback/
    gcal-push-blocks/      app → Google
    gcal-webhook/          Google → app (notificação push)
    gcal-sync/             sync incremental (syncToken)
    gcal-renew-channels/   renovação dos canais de webhook (cron)
```

### 9.3 Regras gerais
- **Datas**: check-ins usam o tipo `date` no fuso local. Blocos usam `timestamptz`. A semana começa na **segunda**; a revisão é no **domingo** (configurável).
- **Cálculos** (score, força) ficam em funções SQL ou views para servir o painel. As mesmas funções ficam espelhadas em `/lib` com testes unitários.
- **Segurança**: RLS em todas as tabelas (`user_id = auth.uid()`). Tokens do Google ficam no **Supabase Vault** e só são acessados por Edge Functions com service role.

---

## 10. Modelo de dados (Supabase / Postgres)

```sql
-- Enums
create type freq_tipo      as enum ('diario','dias_semana','x_por_semana');
create type checkin_status as enum ('feito','minimo','dispensado','falhou');
create type projeto_status as enum ('backlog','ativo','pausado','concluido','abandonado');
create type ciclo_status   as enum ('planejado','ativo','revisao','encerrado');
create type revisao_tipo   as enum ('semanal','mensal','ciclo');
create type bloco_origem   as enum ('app','google');

create table areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  nome text not null, cor text, icone text, ordem int default 0,
  visao text,                       -- quem quero ser em 3–5 anos
  ativa boolean default true,
  created_at timestamptz default now()
);

create table ciclos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  nome text, inicio date not null, fim date not null,    -- 12 semanas
  status ciclo_status default 'planejado',
  tema text, retrospectiva jsonb
);

create table roda_vida (            -- uma nota por área por ciclo
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  ciclo_id uuid references ciclos on delete cascade,
  area_id uuid references areas on delete cascade,
  nota smallint check (nota between 0 and 10), comentario text,
  unique (ciclo_id, area_id)
);

create table metas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  ciclo_id uuid references ciclos on delete cascade,
  area_id uuid references areas,
  titulo text not null, porque text,
  unidade text,                         -- 'km', 'livros', '%', 'R$'...
  valor_inicial numeric default 0, valor_alvo numeric not null,
  status text default 'em_andamento',   -- em_andamento | atingida | parcial | nao_atingida
  resultado_nota text
);

create table meta_registros (             -- indicador LAG ao longo do tempo
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  meta_id uuid references metas on delete cascade,
  data date not null, valor numeric not null, nota text
);

create table habitos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  area_id uuid references areas,
  meta_id uuid references metas,          -- null = hábito de manutenção
  titulo text not null,
  gatilho_se text,                        -- "Depois do café da manhã"
  acao_entao text,                        -- "leio 1 capítulo da Bíblia"
  versao_minima text,                     -- "leio 1 versículo"
  freq freq_tipo not null default 'diario',
  dias_semana smallint[],                 -- 1=seg ... 7=dom
  vezes_por_semana smallint,
  duracao_min int, horario_preferido time,
  unidade text, valor_alvo numeric,       -- opcional: 20 min, 5 km
  gerar_bloco boolean default true,       -- cria bloco na agenda?
  ativo boolean default true, inicio date default current_date,
  ordem int default 0
);

create table checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  habito_id uuid references habitos on delete cascade,
  data date not null,
  status checkin_status not null,
  valor numeric, nota text,
  created_at timestamptz default now(),
  unique (habito_id, data)
);

create table projetos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  area_id uuid references areas, meta_id uuid references metas,
  titulo text not null,
  definicao_de_pronto text not null,      -- obrigatório
  status projeto_status default 'backlog',
  prazo date, concluido_em date, ordem int default 0
);
-- Trigger: impedir que mais de N projetos fiquem 'ativo' (N em configuracoes)

create table tarefas (                    -- próximos passos
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  projeto_id uuid references projetos on delete cascade,
  titulo text not null, estimativa_min int,
  semana_inicio date,                     -- se planejada para uma semana
  concluida_em timestamptz, ordem int default 0
);

create table blocos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  inicio timestamptz not null, fim timestamptz not null,
  titulo text not null,
  area_id uuid references areas, habito_id uuid references habitos,
  projeto_id uuid references projetos, tarefa_id uuid references tarefas,
  origem bloco_origem not null default 'app',
  gcal_event_id text unique, gcal_etag text, gcal_updated timestamptz,
  sync_status text default 'pendente',   -- pendente | sincronizado | erro
  deleted_at timestamptz,                -- exclusão lógica (sincroniza a exclusão)
  updated_at timestamptz default now()
);

create table planos_leitura (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  area_id uuid references areas,
  titulo text not null,                   -- "Plano de Filosofia 12 meses", "Bíblia"
  inicio date, fonte_md text              -- markdown original importado
);

create table plano_itens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  plano_id uuid references planos_leitura on delete cascade,
  ordem int not null,                     -- sequência no plano
  semana int, modulo text, titulo text,   -- planos semanais (filosofia)
  livro text, capitulo int, fase text,    -- planos por capítulo (Bíblia)
  leitura text, pratica text, pergunta text,
  concluido_em date, resposta_pergunta text
);

create table livros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  titulo text not null, autor text,
  categoria text,                         -- filosofia | estudo | livre | biblia
  status text default 'quero_ler',        -- quero_ler | lendo | lido | abandonado
  paginas int, pagina_atual int default 0,
  inicio date, fim date, notas text
);

create table diario (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  data date not null, respostas jsonb not null,  -- {pergunta: resposta}
  unique (user_id, data)
);

create table revisoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  tipo revisao_tipo not null,
  periodo_inicio date not null, periodo_fim date not null,
  score numeric, respostas jsonb, created_at timestamptz default now()
);

create table fechamentos_mensais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  mes date not null,                      -- 1º dia do mês
  renda numeric, gastos_total numeric,
  gastos_categorias jsonb,                -- {"moradia": 0, "alimentação": 0, ...}
  aporte numeric, patrimonio_investido numeric,
  observacoes text,
  unique (user_id, mes)
);

create table metas_financeiras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  titulo text not null,
  tipo text,                              -- taxa_poupanca | aporte_acumulado | patrimonio | reserva
  valor_alvo numeric not null, prazo date
);

create table configuracoes (
  user_id uuid primary key default auth.uid() references auth.users,
  limite_projetos_ativos int default 2,
  dia_revisao smallint default 7,         -- domingo
  perguntas_diario jsonb,
  gcal_calendar_id text,                  -- agenda "Norte" no Google
  gcal_ler_agenda_principal boolean default true
);

create table gcal_sync_estado (           -- só acessado pelas Edge Functions
  user_id uuid primary key references auth.users,
  calendar_id text not null,
  sync_token text,
  channel_id text, resource_id text, channel_expira_em timestamptz,
  refresh_token_secret_id uuid,           -- referência ao Supabase Vault
  ultimo_sync timestamptz
);

-- RLS: habilitar em todas as tabelas, com policy
--   using (user_id = auth.uid()) with check (user_id = auth.uid())
-- gcal_sync_estado: sem policy para o client (só service role)
```

**Views/funções sugeridas:** `v_score_semanal(semana_inicio)`, `v_forca_habito`, `v_progresso_meta`, `v_hoje` (hábitos esperados hoje + check-in existente).

---

## 11. Google Agenda — sincronização em 2 sentidos

### 11.1 Estratégia
- O app cria e é **dono de uma agenda secundária "Norte"** na conta Google. Os blocos vivem nela, o que isola os eventos do app e simplifica a sincronização.
- **Agenda principal = só leitura** (free/busy), usada para não propor blocos em conflito com compromissos de trabalho.
- **Sentido App → Google**: criar, editar ou excluir um bloco no app cria, atualiza ou exclui o evento.
- **Sentido Google → App**: mover, redimensionar ou excluir o evento no Google atualiza o bloco. Um evento criado manualmente na agenda "Norte" entra como bloco `origem = google`, sem vínculo, e pode ser vinculado depois a área, hábito ou projeto.

### 11.2 Mecânica
1. **OAuth**: login com Google pelo Supabase Auth, com `access_type=offline` e `prompt=consent`, para receber o **refresh token**. O Supabase não persiste o token do provedor, então a Edge Function `gcal-oauth-callback` grava o token no **Vault**.
2. **Escopos**: `calendar.events` (escrita na agenda Norte) + `calendar.readonly` ou `calendar.freebusy` (leitura da principal). Avaliar o escopo restrito a agendas criadas pelo app, se estiver disponível. **Verificar na documentação atual do Google.**
3. **Vínculo**: cada evento leva `extendedProperties.private.norte_bloco_id = <uuid>`.
4. **App → Google** (`gcal-push-blocks`): é disparado na criação ou edição de blocos (fila `sync_status = pendente`). Grava `gcal_event_id`, `etag` e `updated`.
5. **Google → App**:
   - `events.watch` na agenda Norte → webhook `gcal-webhook` → chama `gcal-sync`;
   - `gcal-sync` usa `events.list` com **syncToken**, ou seja, só as mudanças. Se a resposta for **410 Gone**, faz uma sincronização completa e gera um novo token;
   - **fallback**: pg_cron roda `gcal-sync` a cada 15 min, caso algum webhook se perca.
6. **Renovação**: os canais de `watch` expiram, então `gcal-renew-channels` roda diariamente via pg_cron e renova os que estão perto do vencimento.

### 11.3 Regras de conflito e de loop
- **Eco**: ao receber uma mudança cujo `etag` é igual ao último enviado pelo app, ela é ignorada.
- **Conflito** (editado nos dois lados entre dois syncs): vence o **`updated` mais recente** (last-write-wins). A versão perdedora é registrada em log.
- **Exclusão**: é sempre lógica no app (`deleted_at`). Evento cancelado no Google → `deleted_at` no bloco.
- **Recorrência**: na v1 o app **não usa RRULE**. A revisão semanal gera **eventos individuais da semana**. Isso simplifica a sincronização e reforça o planejamento semanal (P10).

### 11.4 Pontos de atenção
- Com o app OAuth no Google Cloud em modo **"Testing"**, refresh tokens de usuários externos **expiram em 7 dias**. É preciso publicar o app ("In production"). Para uso pessoal, o aviso de "app não verificado" é aceitável.
- O endpoint do webhook precisa ser HTTPS público: a URL da Edge Function do Supabase atende.

---

## 12. Integrações futuras

- **Strava** (Fase 6): OAuth + webhook de atividades. Uma corrida ou pedalada cria automaticamente o check-in do hábito correspondente, com valor em km/min. É preciso registrar um app próprio na API do Strava.
- **Web push**: lembrete do check-in noturno e da revisão de domingo. No iOS, só funciona com o PWA instalado na tela inicial.
- **Coach IA** (Claude API): na revisão semanal, lê score, retrospectiva e metas e sugere 1 ajuste. Sem dados financeiros brutos no prompt.

---

## 13. Roadmap

> Regra do próprio projeto: **usar o app desde a Fase 1**. Construir em pequenas entregas e começar o 1º ciclo assim que a tela Hoje funcionar.

| Fase | Entrega | Critério de aceite |
|---|---|---|
| **0 — Setup** | Repo, Supabase, migrations base, login Google, deploy na Vercel, PWA instalável | Login no celular e app instalado na tela inicial |
| **1 — Núcleo** | Áreas, ciclo, metas, hábitos, tela Hoje com check-in, força do hábito | Check-in de todos os hábitos do dia em < 30 s |
| **2 — Semana** | Projetos com limite de ativos, tarefas, plano semanal, score, assistente de revisão semanal | Revisão semanal completa em < 25 min, com score calculado corretamente (testes) |
| **3 — Agenda** | Sincronização bidirecional com o Google (§11), proposta automática de blocos | Mover um evento no Google reflete no app em < 1 min; editar no app reflete no Google |
| **4 — Leitura & Diário** | Importação dos planos (.md), livros, diário/exame noturno | O plano de filosofia aparece com a semana atual na tela Hoje |
| **5 — Finanças & Painel** | Fechamento mensal, metas financeiras, painel geral, Roda da Vida | Fechamento do mês em < 15 min e gráficos de patrimônio e score |
| **6 — Pós-v1** | Strava, web push, coach IA | — |

**Sugestão de calendário:** começar o **Ciclo 1** na segunda-feira seguinte ao deploy da Fase 1. Se quiser começar antes (ex.: **12/10/2026**), use Roda da Vida, metas e hábitos no papel e importe depois.

---

## 14. Decisões em aberto

1. ~~Nome definitivo do app~~ → decidido: **Norte** (ver §15).
2. ~~Vite × Next.js~~ → decidido: Vite (ver §15).
3. Semana atual do plano de filosofia (versão de 12 meses já decidida).
4. ~~Plano de leitura bíblica~~ → decidido: 1 capítulo/dia, por impacto (ver §4.2).
5. Categorias macro de gastos do fechamento mensal (sugestão: até 8).
6. Metas do Ciclo 1 (definidas no onboarding).
7. Limite de projetos ativos: 2 ou 3?

---

## 15. Registro de decisões

| Data | Decisão |
|---|---|
| 07/10/2026 | Stack: mesmo padrão do TM Obras — Vercel + Supabase |
| 07/10/2026 | Front-end: React + Vite (SPA) + TypeScript + Tailwind; sem Next.js (sem SSR/SEO, back-end no Supabase) |
| 07/10/2026 | Plano de filosofia vigente: versão de 12 meses (52 semanas) |
| 07/10/2026 | Bíblia: 1 capítulo/dia, sequencial sem datas, começando por Marcos e Provérbios (`plano-biblia.md`) |
| 07/10/2026 | Finanças na v1: apenas metas + fechamento mensal (sem lançamentos) |
| 07/10/2026 | Google Agenda: sincronização bidirecional, com agenda secundária dedicada |
| 07/10/2026 | Modelo: Visão → Ciclo de 12 semanas → Metas (lag) → Hábitos/Projetos (lead) → Blocos; score semanal com meta de 85% |
| 07/10/2026 | Força do hábito (média móvel) no lugar da sequência; regra "nunca falhar duas vezes" |
| 07/10/2026 | Nome definitivo: **Norte** |
| 07/10/2026 | Implementação v1: score, força, progresso e proposta de blocos calculados no cliente (`src/lib`, com testes). Views SQL ficam para quando o volume exigir |
| 07/10/2026 | `planos_leitura` ganhou `habito_id` (check-in automático ao concluir um item) e `tipo` (`capitulos` \| `semanal`); `configuracoes` ganhou `onboarding_concluido` |
| 07/10/2026 | Força de hábitos `x_por_semana`: α semanal = 1 − (1 − 0,05)^7 ≈ 0,30, mesma memória em tempo do α diário |
| 07/10/2026 | Sem Supabase configurado, o app roda em **modo local** (localStorage) com a mesma API de dados — permite usar desde já e migrar depois via backup JSON |
| 07/10/2026 | Escopos Google: `calendar.app.created` (agenda Norte) + `calendar.freebusy` (principal). Hábitos criados no onboarding começam no mesmo dia; o ciclo começa na segunda seguinte |

---

### Referências

- Lally, P. et al. (2010). *How are habits formed: Modelling habit formation in the real world.* European Journal of Social Psychology.
- Gollwitzer, P. M. & Sheeran, P. (2006). *Implementation intentions and goal achievement: A meta-analysis.* Advances in Experimental Social Psychology.
- Sheeran, P., Listrom, O. & Gollwitzer, P. M. (2025). *The when and how of planning: Meta-analysis of the scope and components of implementation intentions in 642 tests.*
- Moran, B. & Lennington, M. (2013). *The 12 Week Year.*
- Clear, J. (2018). *Atomic Habits* / *Hábitos Atômicos.*
- Hyatt, M. & Harkavy, D. *Living Forward* (Life Plan).
- McChesney, C., Covey, S. & Huling, J. *The 4 Disciplines of Execution.*
