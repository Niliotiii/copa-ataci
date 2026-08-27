-- Copa Ataci · Cloudflare D1 schema
-- Fonte única de verdade: os jogos (matches). A classificação é CALCULADA
-- a partir dos placares dos jogos finalizados (ver função /api/standings).

PRAGMA foreign_keys = ON;

-- Recria as tabelas do zero (idempotente para dev/seed local).
-- Ordem: dependentes primeiro (FKs) para não violar integridade referencial.
DROP TABLE IF EXISTS suspensions;
DROP TABLE IF EXISTS match_events;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS sponsors;
DROP TABLE IF EXISTS tournament;
DROP TABLE IF EXISTS teams;

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------
CREATE TABLE teams (
  id           TEXT PRIMARY KEY,            -- abreviação estável, ex.: "ATA"
  name         TEXT NOT NULL,               -- nome completo, ex.: "Ataci FC"
  abbr         TEXT NOT NULL,               -- exibição curta, ex.: "ATA"
  color        TEXT NOT NULL,               -- cor do escudo (#hex)
  crest_url    TEXT,                        -- escudo (PRD: `escudo`), opcional
  formation    TEXT,                        -- esquema tático (PRD: `esquema_tatico`)
  sort_order   INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- matches  (PRD: jogos.json)
-- ---------------------------------------------------------------------------
CREATE TABLE matches (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  phase        TEXT NOT NULL CHECK (phase IN ('grupos','quartas','semis','final')),
  round        INTEGER,                     -- rodada (só para fase de grupos)
  bracket_slot TEXT,                        -- posição no chaveamento, ex.: 'QF1','SF1','F'
  match_date   TEXT NOT NULL,               -- rótulo de data, ex.: 'Sáb, 12 Jul'
  match_time   TEXT NOT NULL,               -- horário, ex.: '15:00'
  location     TEXT NOT NULL,               -- campo/arena
  home_team_id TEXT REFERENCES teams(id),
  away_team_id TEXT REFERENCES teams(id),
  home_score   INTEGER CHECK (home_score IS NULL OR (home_score >= 0 AND home_score <= 999)),
  away_score   INTEGER CHECK (away_score IS NULL OR (away_score >= 0 AND away_score <= 999)),
  status       TEXT NOT NULL DEFAULT 'agendado'
               CHECK (status IN ('agendado','andamento','finalizado')),
  -- Disciplina por lado (para os critérios de desempate). NULL/0 quando não informado.
  home_red     INTEGER NOT NULL DEFAULT 0 CHECK (home_red >= 0),
  away_red     INTEGER NOT NULL DEFAULT 0 CHECK (away_red >= 0),
  home_yellow  INTEGER NOT NULL DEFAULT 0 CHECK (home_yellow >= 0),
  away_yellow  INTEGER NOT NULL DEFAULT 0 CHECK (away_yellow >= 0),
  home_fouls   INTEGER NOT NULL DEFAULT 0 CHECK (home_fouls >= 0),
  away_fouls   INTEGER NOT NULL DEFAULT 0 CHECK (away_fouls >= 0),
  -- Pênaltis (só mata-mata): desempate quando o placar normal empata. NULL = não houve.
  home_pens    INTEGER CHECK (home_pens IS NULL OR home_pens >= 0),
  away_pens    INTEGER CHECK (away_pens IS NULL OR away_pens >= 0),
  -- rótulos placeholder para o chaveamento (quando ainda não há time definido),
  -- ex.: "Vencedor SF2"
  home_placeholder TEXT,
  away_placeholder TEXT
);

CREATE INDEX idx_matches_phase  ON matches(phase);
CREATE INDEX idx_matches_round  ON matches(round);
CREATE INDEX idx_matches_status ON matches(status);
-- Índices nas FKs para os joins de matches/bracket e o avanço do mata-mata.
CREATE INDEX idx_matches_home   ON matches(home_team_id);
CREATE INDEX idx_matches_away   ON matches(away_team_id);
CREATE INDEX idx_matches_slot   ON matches(bracket_slot);

-- ---------------------------------------------------------------------------
-- players  (PRD: times.json > jogadores, com pos_x/pos_y percentuais)
-- ---------------------------------------------------------------------------
CREATE TABLE players (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id      TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  number       INTEGER,
  position     TEXT NOT NULL CHECK (position IN ('GOL','DEF','ALA','MED','ATA')),
  photo_url    TEXT,                         -- PRD: `foto`, opcional
  -- Coordenadas percentuais no campo (0-100). PRD seção 3.4 / 5.
  pos_x        REAL NOT NULL CHECK (pos_x >= 0 AND pos_x <= 100),
  pos_y        REAL NOT NULL CHECK (pos_y >= 0 AND pos_y <= 100)
);

CREATE INDEX idx_players_team ON players(team_id);

-- ---------------------------------------------------------------------------
-- match_events — eventos por jogador (gols e cartões) num jogo.
-- Denormaliza team_id/player_name para preservar histórico mesmo se o jogador
-- for removido do elenco.
-- ---------------------------------------------------------------------------
CREATE TABLE match_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id    INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id   INTEGER REFERENCES players(id) ON DELETE SET NULL,
  team_id     TEXT NOT NULL REFERENCES teams(id),
  player_name TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('gol','gol_contra','amarelo','vermelho')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_events_match  ON match_events(match_id);
CREATE INDEX idx_events_player ON match_events(player_id);
CREATE INDEX idx_events_type   ON match_events(type);

-- ---------------------------------------------------------------------------
-- suspensions — instâncias de suspensão geradas pela regra (3 amarelos ou 1
-- vermelho = 1 jogo). served=0 enquanto pendente; served=1 quando cumprida.
-- ---------------------------------------------------------------------------
CREATE TABLE suspensions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id      INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reason         TEXT NOT NULL CHECK (reason IN ('vermelho','3_amarelos')),
  games          INTEGER NOT NULL DEFAULT 1,
  source_match_id INTEGER REFERENCES matches(id) ON DELETE SET NULL,
  served         INTEGER NOT NULL DEFAULT 0 CHECK (served IN (0,1)),
  served_at      TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_susp_player ON suspensions(player_id);
CREATE INDEX idx_susp_served ON suspensions(served);


-- ---------------------------------------------------------------------------
-- sponsors
-- ---------------------------------------------------------------------------
CREATE TABLE sponsors (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  initials     TEXT NOT NULL,
  color        TEXT NOT NULL,
  tagline      TEXT,
  logo_url     TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- tournament — metadados/config do torneio (linha única, id=1).
-- ---------------------------------------------------------------------------
CREATE TABLE tournament (
  id       INTEGER PRIMARY KEY CHECK (id = 1),
  name     TEXT NOT NULL,
  edition  TEXT,
  season   TEXT
);

INSERT INTO tournament (id, name, edition, season) VALUES
  (1, 'Copa Ataci', '5ª Edição', '2026');
