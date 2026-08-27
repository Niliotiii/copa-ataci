-- Copa Ataci · Cloudflare D1 schema
-- Fonte única de verdade: os jogos (matches). A classificação é CALCULADA
-- a partir dos placares dos jogos finalizados (ver função /api/standings).

PRAGMA foreign_keys = ON;

-- Recria as tabelas do zero (idempotente para dev/seed local).
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS sponsors;
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
-- sponsors
-- ---------------------------------------------------------------------------
CREATE TABLE sponsors (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  initials     TEXT NOT NULL,
  color        TEXT NOT NULL,
  tagline      TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0
);
