# Norte

App pessoal de planejamento: **visão → metas de 12 semanas → hábitos e blocos na agenda**, medido pela execução.
O documento-guia é [`docs/norte-plano-do-projeto.md`](docs/norte-plano-do-projeto.md) e o plano bíblico, [`docs/plano-biblia.md`](docs/plano-biblia.md).

Stack: React + Vite + TypeScript, Tailwind, TanStack Query, Recharts, date-fns-tz (America/Sao_Paulo), vite-plugin-pwa · Supabase (Postgres, Auth Google, Edge Functions, Vault, pg_cron) · Vercel.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # regras de cálculo (§7), parsers dos planos e proposta de blocos
npm run build      # typecheck + build com service worker (PWA)
```

Sem `.env`, o app roda em **modo local**: os dados ficam no `localStorage` do navegador (dá para usar já, e há exportação/restauração de backup JSON em Configurações). Com o Supabase configurado, o app exige login com Google e grava tudo no Postgres.

## O que está pronto

| Tela | Conteúdo |
|---|---|
| **Onboarding** | Roda da Vida → visão por área → ciclo + metas (1 por área, máx. 5) → hábitos SE/ENTÃO sugeridos (§4) → projetos. Importa o plano bíblico vinculado ao hábito "Leitura bíblica" |
| **Hoje** | Check-in em 1 toque (feito) ou toque longo (mínimo, valor, dispensar com nota, falhou); selo "não falhe duas vezes"; força de cada hábito; próximo capítulo da Bíblia (botão "Li" marca o check-in); semana do plano de filosofia; blocos do dia; próximos passos dos projetos ativos; atalho para o exame noturno |
| **Semana** | Score com faixas (≥ 85% / 65–84% / < 65%) e itens que faltaram; plano de tarefas; agenda por dia com CRUD de blocos; proposta automática de blocos (horário preferido, sem conflitos) |
| **Metas** | Ciclo de 12 + 1 semanas, metas lag com registro de valores e gráfico real × ideal; hábitos e projetos ligados |
| **Hábitos** | Força (EMA α = 0,05), mapa de calor de 12 semanas, edição do se-então e da versão mínima |
| **Projetos** | Backlog / Ativos / Pausados / Concluídos, limite de ativos (trigger no Postgres e regra igual no modo local), definição de pronto obrigatória, próximos passos que podem ser puxados para a semana |
| **Leitura** | Importação de planos `.md` (Bíblia incluída; plano semanal de filosofia por arquivo/colagem com "semana atual"), progresso por livro/semana, resposta da pergunta da semana; lista de livros |
| **Revisão** | Assistente semanal em 6 passos (score, retrospectiva + pergunta da semana, indicadores lag, projetos, plano da próxima semana, blocos), fechamento mensal, revisão do ciclo e histórico |
| **Finanças** | Fechamento mensal (renda, 8 categorias macro, aporte, patrimônio), taxa de poupança e variação, gráfico, metas financeiras |
| **Diário, Áreas, Painel, Configurações** | Exame noturno com perguntas configuráveis; visão por área e Roda da Vida (radar por ciclo); painel com score de 12 semanas, força dos hábitos e metas; limite de projetos, dia da revisão, Google, backup |

### Formato do plano semanal (filosofia)

```md
## Módulo 1 — Estoicos
### Semana 1 — Sêneca
- **Leitura:** Cartas 1–5
- **Prática:** premeditação dos males
- **Pergunta da semana:** O que está sob meu controle?
```

Linhas sem rótulo dentro de uma semana entram como leitura.

## Supabase + Google (Fases 0 e 3)

1. Crie o projeto no Supabase e aplique as migrations: `supabase link --project-ref <ref> && supabase db push`.
2. **Google Cloud**: crie um OAuth Client (Web), habilite a Google Calendar API e adicione os escopos `calendar.app.created` e `calendar.freebusy` na tela de consentimento. Publique o app ("In production") — em "Testing" o refresh token expira em 7 dias (§11.4).
3. **Supabase Auth → Google**: informe client id/secret. Redirect: `https://<ref>.supabase.co/auth/v1/callback`. Adicione a URL do app (Vercel) em *Redirect URLs*.
4. **Edge Functions**:
   ```bash
   supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=...
   supabase functions deploy gcal-oauth-callback gcal-push-blocks gcal-sync gcal-freebusy gcal-renew-channels
   supabase functions deploy gcal-webhook --no-verify-jwt
   ```
5. **pg_cron**: habilite `pg_cron` e `pg_net` e rode os dois `cron.schedule` comentados no fim de `supabase/migrations/20261007000100_gcal.sql` (sync de fallback a cada 15 min e renovação diária dos canais).
6. **Vercel**: importe o repositório (framework Vite) e defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

Fluxo: no login o app envia `provider_refresh_token` para `gcal-oauth-callback`, que o grava no Vault, cria a agenda "Norte" e registra o `events.watch`. Blocos criados/editados/excluídos no app ficam `pendente` e são enviados por `gcal-push-blocks`; mudanças no Google chegam pelo webhook → `gcal-sync` (syncToken, 410 → sync completo, eco por etag, last-write-wins).

> As Edge Functions e a sincronização com o Google ainda **não foram testadas contra um projeto real** — valide os passos acima na Fase 3.

## Estrutura

```
src/app            rotas, navegação inferior, login
src/features/*     telas (today, week, goals, habits, projects, reading, finance, reviews, areas, journal, dashboard, settings, onboarding)
src/lib            dados (Supabase ou local), cálculos do §7, datas (fuso SP), parsers dos planos, proposta de blocos
supabase/          migrations (schema §10 + RLS + trigger de limite + Vault) e Edge Functions do Google Agenda
docs/              plano do projeto e plano bíblico (fonte da importação)
```
