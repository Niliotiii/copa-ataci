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
npm run dev           # http://localhost:8443  (as chamadas /api falham nesse modo)

# 4b. Rodar tudo junto (frontend + Functions + D1) — recomendado
npm run preview       # faz o build e sobe wrangler pages dev em dist/
```

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

### Escrita (protegida por token)

Todas as rotas de escrita exigem o header `Authorization: Bearer <ADMIN_TOKEN>`.

| Método | Rota | Descrição |
|--------|------|-----------|
| PUT | `/api/matches/:id` | Placar, status e dados do jogo |
| PUT | `/api/teams/:id` | Dados do time (nome, sigla, cor, formação) |
| PUT | `/api/teams/:id/players` | Substitui o elenco inteiro (com `posX`/`posY`) |
| PUT | `/api/sponsors` | Substitui a lista de patrocinadores |

**`PUT /api/matches/:id`** — campos aceitos (todos opcionais):

- `homeScore` / `awayScore`: inteiro 0–999 ou `null`
- `status`: `"agendado"` | `"andamento"` | `"finalizado"`
- `date`, `time`, `location`: texto não-vazio
- `homeTeamId`, `awayTeamId`: id de time existente ou `null`

Exemplo — finalizar um jogo 4×1:

```bash
curl -X PUT http://127.0.0.1:8788/api/matches/5 \
  -H "authorization: Bearer $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{"homeScore":4,"awayScore":1,"status":"finalizado"}'
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

```bash
# 1. Autenticar
npx wrangler login

# 2. Criar o banco D1 (uma vez)
npx wrangler d1 create copa-ataci
#   → copie o "database_id" retornado

# 3. Colar o database_id no wrangler.toml (campo database_id)

# 4. Criar as tabelas e popular o D1 de produção
npm run db:schema:remote
npm run db:seed:remote

# 5. Definir o token de admin como secret (produção)
npx wrangler pages secret put ADMIN_TOKEN

# 6. Deploy
npm run build
npx wrangler pages deploy dist
```

### CI/CD via GitHub (opcional)

Conecte o repositório em **Cloudflare Pages → Create project → Connect to Git**:

- Build command: `npm run build`
- Build output directory: `dist`
- Adicione o binding do D1 (`DB` → `copa-ataci`) em
  *Settings → Functions → D1 database bindings*.
- Adicione a variável/secret `ADMIN_TOKEN` em *Settings → Environment variables*.

Cada push na branch principal dispara build + deploy automáticos.

## Segurança

- `.dev.vars` contém o `ADMIN_TOKEN` local e **não é commitado** (está no `.gitignore`).
  Em produção o token vive como *secret* do Pages.
- Os endpoints de escrita validam o Bearer token com comparação em tempo constante.
- Use um token forte e aleatório em produção (ex.: `openssl rand -hex 32`).

## Painel do Organizador (Admin)

O app tem uma aba **Admin** (🔒) que permite editar o torneio pela UI, sem usar
`curl`. O token é colado uma vez (guardado só na sessão, via `sessionStorage`) e
vale para todas as seções. O painel tem três abas internas:

- **Jogos** — selecionar um jogo e editar placar, status, data, horário, local e
  os times de casa/visitante.
- **Times** — editar nome, sigla, cor (color picker) e formação; e editar o
  elenco (nome, número, posição e coordenadas `posX`/`posY`), com adicionar/remover.
  As posições podem ser definidas **arrastando os jogadores direto no campo**
  (Modo Cartola) ou digitando as coordenadas X/Y.
- **Patrocinadores** — adicionar, remover e editar a lista (nome, sigla, cor, slogan).

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

## Atualizando os dados do torneio

- **Placares/status:** via `PUT /api/matches/:id` (não requer redeploy).
- **Times, jogadores, patrocinadores, novos jogos:** edite `db/seed.sql` (ou rode
  comandos SQL via `wrangler d1 execute`) e reaplique no D1.
- As coordenadas de cada jogador no campo ficam em `players.pos_x` / `players.pos_y`
  (percentuais 0–100), conforme o "Modo Cartola" do PRD.
