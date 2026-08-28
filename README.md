# Copa Ataci — Portal do Torneio

Portal web mobile-first para acompanhar a Copa Ataci (society 7x7): classificação,
jogos, mata-mata e escalações ("Modo Cartola").

**Stack:** React 19 + Vite + Tailwind CSS v4 no frontend; **Cloudflare Pages
Functions + D1** (SQLite serverless) no backend. Custo zero dentro do free tier.

## Arquitetura

```
Cloudflare Pages (React/Vite build → dist/)
        │  fetch("/api/...")
        ▼
Pages Functions (functions/api/*)  ──►  D1 (SQLite serverless)
```

A **classificação é calculada** a partir dos jogos (`matches`), não digitada à mão.
Ao finalizar um placar, tabela e chaveamento se atualizam automaticamente.

### Estrutura de pastas

```
db/
  schema.sql          Estrutura das tabelas (teams, matches, players, sponsors)
  seed.sql            Dados iniciais
functions/api/
  _shared.ts          Helpers (json, error, requireAuth) + tipo Env
  standings.ts        GET  /api/standings     (classificação calculada)
  matches.ts          GET  /api/matches       (?phase=&round=)
  matches/[id].ts     GET  /api/matches/:id  |  PUT /api/matches/:id (protegido)
  bracket.ts          GET  /api/bracket
  teams.ts            GET  /api/teams
  teams/[id].ts       GET  /api/teams/:id     (elenco com pos_x/pos_y)
  sponsors.ts         GET  /api/sponsors
src/
  data/               types.ts, useApi.ts (hook de fetch)
  components/          Standings, Schedule, Bracket, TeamLineup, SponsorTicker, ...
wrangler.toml         Config Pages + binding do D1
.dev.vars             Segredos locais (NÃO commitado)
```

## Pré-requisitos

- Node.js 18+ e npm
- Conta na Cloudflare (para deploy)
- `wrangler` já vem como devDependency (usado via `npx`)

## Setup local

```bash
# 1. Instalar dependências
npm install

# 2. Criar o token de admin para os endpoints de escrita (dev)
cp .dev.vars.example .dev.vars
# edite .dev.vars e defina ADMIN_TOKEN

# 3. Criar as tabelas e popular o D1 LOCAL
npm run db:reset      # roda db:schema + db:seed no D1 local (--local)

# 4a. Rodar o frontend com hot-reload (SEM backend/D1)
npm run dev           # http://localhost:8443
#   ⚠️ Sozinho, o `dev` serve só o React. As telas (classificação, jogos,
#   mata-mata…) buscam de /api e ficarão VAZIAS/COM ERRO sem um backend.

# 4b. Dev com hot-reload E dados reais — sobe backend + frontend juntos
npm run dev:full      # build + `wrangler pages dev` (8788) + `vite` (8443)
#   O `vite` faz proxy de /api → 8788, então http://localhost:8443 tem HMR
#   do React E dados reais da API. (Rode `npm run db:reset` antes, uma vez.)

# 4c. Rodar tudo junto a partir do build (sem HMR) — o mais próximo de prod
npm run preview       # faz o build e sobe wrangler pages dev em dist/ (8788)
```

> **Por que as telas parecem "não dinâmicas"?** No `npm run dev` puro (só Vite),
> não existe `/api` — o frontend chama `/api/standings`, `/api/matches`,
> `/api/bracket` etc. e recebe erro, então classificação/jogos/mata-mata ficam
> vazios. Use `npm run dev:full` (com proxy) ou `npm run preview` para ver os
> dados. Em produção o Pages serve frontend + Functions na mesma origem, sem
> proxy.

> **Importante:** rode `npx wrangler pages dev dist` **sem** a flag `--d1`.
> O binding do banco vem do `wrangler.toml`. Passar `--d1` cria um banco
> local separado e vazio.

Scripts de banco disponíveis:

| Script | O que faz |
|--------|-----------|
| `npm run db:schema` | Aplica `db/schema.sql` no D1 local |
| `npm run db:seed` | Aplica `db/seed.sql` no D1 local |
| `npm run db:reset` | schema + seed no local |
| `npm run db:schema:remote` | Aplica o schema no D1 **de produção** |
| `npm run db:seed:remote` | Aplica o seed no D1 **de produção** |

## Rotas do portal (frontend)

O portal usa roteamento por path (History API, sem dependência externa). Cada
tela tem sua própria URL, com deep-link e suporte a voltar/avançar do navegador:

| Rota | Tela |
|------|------|
| `/` | Classificação (tabela) |
| `/mata-mata` | Classificação — chaveamento do mata-mata |
| `/jogos` | Calendário de jogos |
| `/artilharia` | Artilharia |
| `/times` | Lista de times |
| `/times/:id` | Elenco de um time (ex.: `/times/ATA`) |
| `/admin` | Área do organizador (login + painel), fora do menu |

Como é um SPA, o Cloudflare Pages serve `index.html` para qualquer path e o
React decide o que renderizar — deep-links funcionam sem configuração extra.

## Endpoints da API

### Leitura (públicos)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/standings` | Classificação calculada a partir dos jogos |
| GET | `/api/matches?phase=grupos&round=2` | Lista de jogos (filtros opcionais) |
| GET | `/api/matches/:id` | Um jogo específico |
| GET | `/api/bracket` | Mata-mata (quartas, semis, final) |
| GET | `/api/teams` | Lista de times |
| GET | `/api/teams/:id` | Time + elenco (com `posX`/`posY`) |
| GET | `/api/sponsors` | Patrocinadores |
| GET | `/api/scorers` | Artilharia (gols por jogador) |
| GET | `/api/suspensions` | Jogadores suspensos (pendentes) |
| GET | `/api/matches/:id/events` | Eventos (gols/cartões) de um jogo |
| GET | `/api/uploads/:key` | Serve uma imagem (escudo/logo) do R2 |

### Escrita (protegida por token)

Todas as rotas de escrita exigem o header `Authorization: Bearer <ADMIN_TOKEN>`.

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/matches` | Cria um jogo avulso |
| PUT | `/api/matches/:id` | Status, data, hora, local, times e faltas (placar/cartões vêm dos eventos; pênaltis no mata-mata) |
| DELETE | `/api/matches/:id` | Exclui um jogo (limpa o slot seguinte se for mata-mata) |
| POST | `/api/teams` | Cria um time (id = sigla) |
| PUT | `/api/teams/:id` | Dados do time (nome, cor, escudo/logo) |
| DELETE | `/api/teams/:id` | Exclui um time (recusa se estiver em jogos) |
| PUT | `/api/teams/:id/players` | Substitui o elenco inteiro (com `posX`/`posY`) |
| PUT | `/api/sponsors` | Substitui a lista de patrocinadores |
| PUT | `/api/tournament` | Metadados do torneio (nome, edição, temporada) |
| PUT | `/api/matches/:id/events` | Registra gols/gol contra/cartões por jogador (deriva placar, artilharia e suspensões) |
| PUT | `/api/suspensions/:id` | Marca uma suspensão como cumprida (`{served}`) |
| POST | `/api/matches/generate-groups` | Gera a tabela da fase de grupos (todos-contra-todos, turno único; preserva agenda) |
| POST | `/api/matches/generate-bracket` | Gera o mata-mata a partir da classificação (4 classificados: 1º×4º, 2º×3º) |
| POST | `/api/admin/verify` | Valida o token de admin (login do painel `/admin`) |
| POST | `/api/uploads` | Envia uma imagem (escudo/logo) para o R2; retorna a URL |

**`PUT /api/matches/:id`** — campos aceitos (todos opcionais):

- `homeScore` / `awayScore`: **não editáveis** (derivados dos eventos por jogador)
- `status`: `"agendado"` | `"andamento"` | `"finalizado"`
- `date`, `time`, `location`: texto não-vazio
- `homeTeamId`, `awayTeamId`: id de time existente ou `null`

Exemplo — finalizar um jogo 4×1:

```bash
curl -X PUT http://127.0.0.1:8788/api/matches/5 \
  -H "authorization: Bearer $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{"status":"finalizado"}'
```

**`PUT /api/teams/:id/players`** e **`PUT /api/sponsors`** substituem a coleção
inteira (envie o array completo). Ex.:

```bash
curl -X PUT http://127.0.0.1:8788/api/sponsors \
  -H "authorization: Bearer $ADMIN_TOKEN" -H "content-type: application/json" \
  -d '{"sponsors":[{"name":"Arena Ataci","initials":"AA","color":"#16a34a","tagline":"Oficial"}]}'
```

Respostas: `200` com `{ok:true, ...}`; `400` (validação);
`401` (token ausente/incorreto); `404` (recurso inexistente).

Como a classificação é derivada dos jogos, atualizar um placar recalcula a
tabela e o chaveamento automaticamente — sem novo deploy.

## Deploy na Cloudflare

Passo a passo (primeira publicação):

```bash
# 1. Autenticar na Cloudflare
npx wrangler login

# 2. Criar o banco D1 (uma vez) e copiar o database_id retornado
npx wrangler d1 create copa-ataci

# 2b. Criar o bucket R2 das imagens (escudos/logos). O nome deve bater com o
#     bucket_name do wrangler.toml (copa-ataci-media).
npx wrangler r2 bucket create copa-ataci-media

# 3. Colar o database_id no wrangler.toml (campo database_id)

# 4. Aplicar o schema via MIGRATIONS versionadas (não-destrutivo) e popular
npm run db:migrate:remote     # aplica migrations/*.sql no D1 de produção
npm run db:seed:remote        # popula com os dados iniciais (db/seed.sql)

# 5. Gerar um token de admin forte e defini-lo como secret do Pages
openssl rand -hex 32          # copie a saída
npx wrangler pages secret put ADMIN_TOKEN   # cole quando solicitado

# 6. Build + deploy
npm run build
npx wrangler pages deploy dist
```

> **Migrations vs. schema:remote.** Prefira `db:migrate:remote` (aplica
> `migrations/*.sql` de forma incremental e idempotente). O `db:schema:remote`
> existe para conveniência, mas roda `db/schema.sql`, que **recria as tabelas do
> zero (DROP)** — use só num banco vazio.

Publicações seguintes: `npm run build && npx wrangler pages deploy dist`
(e `npm run db:migrate:remote` quando houver novas migrations).

### Deploy manual

O deploy é feito manualmente pela linha de comando (sem CI/CD automático):

```bash
npm run build
npx wrangler pages deploy dist
# e, quando houver novas migrations:
npm run db:migrate:remote
```

Garanta que o projeto no Cloudflare Pages tenha:

- Binding do D1 (`DB` → `copa-ataci`) em *Settings → Functions → D1 database bindings*.
- Secret `ADMIN_TOKEN` em *Settings → Environment variables and secrets*.

### Notas de produção

- **OG image:** o banner de compartilhamento fica em `public/og-image.png`
  (1200×630, referenciado por `site.config.json`). Para trocar a arte, substitua
  o PNG mantendo as dimensões.
- **Fontes:** Inter e Oswald são *self-hosted* (`public/fonts/*.woff2`), sem
  dependência do Google Fonts em runtime.
- **Cache:** leituras (`GET /api/*`) têm `cache-control` curto no edge; mutações
  (`PUT`) usam `no-store`.

## Segurança

- `.dev.vars` contém o `ADMIN_TOKEN` local e **não é commitado** (está no `.gitignore`).
  Em produção o token vive como *secret* do Pages.
- Os endpoints de escrita validam o Bearer token com comparação em tempo constante.
- Use um token forte e aleatório em produção (ex.: `openssl rand -hex 32`).

## Painel do Organizador (Admin)

O painel do organizador fica em **`/admin`** (fora do menu do portal). Ao acessar,
uma tela de **login** pede o token de admin, que é **validado no backend**
(`POST /api/admin/verify`) — só libera o painel com o token correto. O token é
guardado só na sessão (`sessionStorage`) e vale para todas as seções; há botão
**Sair**. O painel tem quatro abas internas:

- **Jogos** — selecionar um jogo e editar placar, status, data, horário, local e
  os times de casa/visitante. Inclui **gerar a tabela da fase de grupos**
  (round-robin) e **gerar o mata-mata** a partir da classificação.
- **Times** — editar nome, sigla, cor (color picker) e **escudo/logo (upload de
  imagem)**; e editar o elenco (nome, número, posição e coordenadas `posX`/`posY`),
  com adicionar/remover. As posições podem ser definidas **arrastando os jogadores
  direto no campo** (Modo Cartola) ou digitando as coordenadas X/Y.
- **Patrocinadores** — adicionar, remover e editar a lista (nome, sigla, cor, slogan).
- **Suspensões** — dar baixa (marcar como cumprida) nos jogadores suspensos.

Ao salvar, o painel chama o `PUT` correspondente e invalida o cache local —
classificação, jogos, chaveamento, escalações e patrocinadores se atualizam na
hora, sem novo deploy.

## Testes automatizados

O projeto tem **duas suítes** complementares:

### 1. Suíte principal (rápida, roda em Node)

```bash
npm test          # roda a suíte uma vez
npm run test:watch
```

Os testes (Vitest 4) exercitam as Pages Functions contra um **SQLite real**
(via `better-sqlite3`), aplicando `db/schema.sql` + `db/seed.sql` num banco em
memória e chamando os handlers diretamente. São **42 testes** cobrindo:
cálculo/ordenação da classificação e seu recálculo após um placar, filtros de
jogos, montagem do chaveamento (vencedor derivado e placeholders), elenco com
`posX`/`posY`, patrocinadores, e todas as rotas de escrita protegidas
(401/400/404/200 + persistência): placar/dados do jogo, dados do time,
substituição de elenco e substituição da lista de patrocinadores.

### 2. Suíte no runtime real (workerd + D1 nativo)

```bash
npm run test:workerd
```

Roda dentro do **runtime real do Cloudflare (`workerd`)** com um D1 nativo, via
`@cloudflare/vitest-pool-workers`. Importa os **mesmos handlers** das Functions
e o mesmo `db/*.sql`, provando o comportamento no runtime de produção
(standings calculada, elenco com `posX`/`posY`, auth do `PUT`, recálculo).

> **Por que duas suítes?** O `vitest-pool-workers` com o export `./config`
> (`defineWorkersConfig`) só existe na linha que pareia com **Vitest 3 (Vite
> 5/6)**; o app usa **Vite 8 / Vitest 4**. Para não degradar o stack do app,
> a suíte workerd vive isolada em `test-workerd/` com seu próprio
> `node_modules` (Vitest 3). A suíte principal (Node/SQLite) segue sendo a de
> desenvolvimento diário por ser mais rápida; a workerd valida o runtime real.

### 3. E2E no navegador (Playwright)

```bash
npm run test:e2e
```

Sobe o app real (build + `wrangler pages dev` + D1 local, com o banco resetado)
e roda 2 smokes no Chromium: navegação pelas abas com a classificação calculada,
e o fluxo do admin (colar token → finalizar um jogo → salvar → ver o sucesso).
Requer o browser do Playwright: `npx playwright install chromium`.

## Atualizando os dados do torneio

- **Placares/status:** via `PUT /api/matches/:id` (não requer redeploy).
- **Times, jogadores, patrocinadores, novos jogos:** edite `db/seed.sql` (ou rode
  comandos SQL via `wrangler d1 execute`) e reaplique no D1.
- As coordenadas de cada jogador no campo ficam em `players.pos_x` / `players.pos_y`
  (percentuais 0–100), conforme o "Modo Cartola" do PRD.
