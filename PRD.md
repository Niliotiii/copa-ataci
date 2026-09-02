# Product Requirements Document (PRD) - Copa Ataci (5ª Edição)

> **Nota de arquitetura (atualizada).** A primeira versão deste PRD previa um site
> 100% estático alimentado por arquivos `.json` em `/public/data/`. O projeto
> evoluiu para um backend serverless: **Cloudflare Pages Functions + D1**
> (SQLite serverless). A classificação e o chaveamento não são mais digitados à
> mão — são **calculados a partir dos jogos**. Este documento foi revisado para
> refletir a implementação atual. Detalhes operacionais (setup, deploy, API)
> ficam no `README.md`.

## 1. Visão Geral do Produto
O projeto é uma aplicação web responsiva (Mobile-First) para acompanhar a 5ª Edição da **Copa Ataci** (society 7x7). A plataforma é o portal oficial do torneio, apresentando classificação, calendário de jogos, chaveamento do mata-mata, artilharia e detalhes dos elencos de forma interativa.

A premissa técnica é **custo zero de infraestrutura dentro do free tier da Cloudflare**: o frontend (React + Vite) e o backend (Pages Functions) são servidos na mesma origem pela Cloudflare Pages, com dados persistidos no D1. Um **painel de organizador** (`/admin`, protegido por token) permite atualizar resultados e cadastros sem novo deploy.

## 2. Objetivos
* **Acessibilidade Móvel:** Garantir que a experiência no celular seja perfeita, visto que a maioria dos jogadores e torcedores acessará a plataforma em campo ou via redes sociais.
* **Baixa Manutenção Técnica:** Serverless na Cloudflare (Pages Functions + D1) — sem servidor para gerenciar e dentro do free tier. Atualizações de resultado são feitas pelo painel `/admin` e refletem na hora, sem redeploy.
* **Dados Derivados, Não Digitados:** Classificação, artilharia, suspensões e chaveamento são **calculados** a partir dos jogos e dos eventos por jogador (gols/cartões), reduzindo erro humano.
* **Engajamento Visual:** Entregar uma visualização de escalações semelhante ao "Cartola FC", aumentando a imersão e o profissionalismo do torneio amador.

## 3. Escopo de Funcionalidades

### 3.1. Tabela de Classificação
* Tabela dinâmica **calculada a partir dos jogos finalizados** (`GET /api/standings`), não de um arquivo estático.
* **Responsividade:** No celular, exibe apenas as colunas essenciais (Posição, Time, Pontos, Jogos, Saldo de Gols). No desktop, expande para mostrar Vitórias, Empates, Derrotas e Gols Pró/Contra.
* Critérios de desempate aplicados na ordenação (pontos, confronto direto, vitórias, saldo, gols pró/contra, disciplina).
* Indicadores visuais para a zona de classificação (times que avançam ao mata-mata).

### 3.2. Calendário de Jogos (Partidas)
* Lista de jogos de `GET /api/matches` (com filtros opcionais `?phase=&round=`).
* Filtros por fase (Fase de Grupos, Quartas, Semis, Final) ou por rodada.
* Exibição de Data, Horário, Local (campo), Times e Placar (quando finalizado). O placar é **derivado dos eventos por jogador**, não digitado diretamente.

### 3.3. Chaveamento (Mata-mata)
* Árvore de confrontos eliminatórios de `GET /api/bracket`, com o vencedor de cada confronto **derivado do placar** (e dos pênaltis, quando houver) e placeholders para slots ainda indefinidos.
* **Responsividade:** Em telas estreitas, usa scroll horizontal / navegação por abas (Quartas → Semis → Final) para manter a usabilidade.

### 3.4. Visão de Times e Escalação ("Modo Cartola")
* Página por equipe (`GET /api/teams/:id`), com o elenco e as coordenadas de cada jogador.
* **O Campinho:** Componente visual que simula um campo de futebol, com os jogadores posicionados via CSS (position absolute) a partir de coordenadas **percentuais** `pos_x` / `pos_y` (0–100), garantindo que o layout não quebre em nenhum tamanho de tela.
* **Edição:** No painel admin, as posições podem ser definidas arrastando os jogadores no campo ou digitando as coordenadas X/Y.

### 3.5. Painel do Organizador (Admin)
* Rota `/admin`, fora do menu, protegida por token de admin validado no backend (`POST /api/admin/verify`).
* Abas: **Jogos** (editar/gerar tabela de grupos e mata-mata), **Times** (dados, escudo/logo e elenco), **Patrocinadores**, **Suspensões** (dar baixa) e **Torneio** (metadados).

## 4. Arquitetura e Stack Tecnológica
* **Frontend:** React 19 + Vite + TypeScript. Roteamento por path via History API (sem dependência externa). Estilização com **Tailwind CSS v4**.
* **Backend:** **Cloudflare Pages Functions** (`functions/api/*`) em TypeScript, servidas na mesma origem do frontend.
* **Banco de Dados:** **Cloudflare D1** (SQLite serverless). Estrutura em `db/schema.sql`; dados iniciais em `db/seed.sql`; evolução via `migrations/*.sql`.
* **Armazenamento de Imagens:** **Cloudflare R2** para escudos/logos (upload via `POST /api/uploads`, servido por `GET /api/uploads/:key`).
* **Hospedagem:** **Cloudflare Pages**. O deploy é feito **manualmente** via `wrangler pages deploy` (sem CI/CD automático). O SPA usa fallback para `index.html`, então deep-links funcionam sem configuração extra.

## 5. Modelo de Dados (D1 / SQLite)

Tabelas principais (ver `db/schema.sql` para o detalhe):

* **`teams`** — times: `id` (sigla), nome, cor, escudo/logo.
* **`matches`** — jogos: fase, rodada, data, horário, local, times de casa/fora, status, placar (derivado), pênaltis (mata-mata).
* **`players`** — elenco por time: nome, número, posição e coordenadas `pos_x` / `pos_y` (percentuais 0–100).
* **`match_events`** — eventos por jogador (gols, gol contra, cartões); origem do placar, da artilharia e das suspensões.
* **`suspensions`** — suspensões derivadas dos eventos (vermelho / 3 amarelos), com baixa (`served`) pelo admin.
* **`sponsors`** — patrocinadores (nome, sigla, cor, slogan, logo, link opcional).
* **`tournament`** — metadados do torneio (nome, edição, temporada).

A classificação, a artilharia e o chaveamento **não têm tabelas próprias**: são
consultas derivadas dos jogos e eventos.

## 6. Requisitos Não-Funcionais
* **Performance:** Pontuação alta no Google Lighthouse (Performance e Práticas Recomendadas). Fontes self-hosted (sem Google Fonts em runtime).
* **Cache:** Leituras (`GET /api/*`) têm `cache-control` curto no edge; mutações (`PUT`/`POST`/`DELETE`) usam `no-store`.
* **Segurança:** Endpoints de escrita exigem `Authorization: Bearer <ADMIN_TOKEN>`, com comparação em tempo constante. O token vive como *secret* do Pages (produção) e em `.dev.vars` (local, não commitado).
* **SEO & Compartilhamento:** Open Graph / Twitter Card configurados via `site.config.json` (imagem em `public/og-image.png`, 1200×630).
* **Qualidade:** Suíte de testes automatizados (Vitest) contra SQLite real, mais suíte no runtime `workerd` e smokes E2E (Playwright). Ver `README.md`.

## 7. Histórico / Evolução
1. **v0 (JAMstack estático):** proposta inicial com dados em `.json` em `/public/data/` e deploy automático por commit.
2. **v1 (atual):** migração para Pages Functions + D1 (classificação/chaveamento calculados), painel admin protegido, upload de imagens em R2, migrations versionadas e deploy manual via `wrangler`.
