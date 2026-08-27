-- Migration 0001 · schema inicial (Copa Ataci)
-- Não-destrutiva: usa CREATE TABLE IF NOT EXISTS. Aplicar com:
--   npx wrangler d1 migrations apply copa-ataci --remote
-- Mantém paridade com db/schema.sql (usado pelo harness de testes com DROP).

CREATE TABLE IF NOT EXISTS teams (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  abbr         TEXT NOT NULL,
  color        TEXT NOT NULL,
  crest_url    TEXT,
  formation    TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS matches (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  phase        TEXT NOT NULL CHECK (phase IN ('grupos','quartas','semis','final')),
  round        INTEGER,
  bracket_slot TEXT,
  match_date   TEXT NOT NULL,
  match_time   TEXT NOT NULL,
  location     TEXT NOT NULL,
  home_team_id TEXT REFERENCES teams(id),
  away_team_id TEXT REFERENCES teams(id),
  home_score   INTEGER CHECK (home_score IS NULL OR (home_score >= 0 AND home_score <= 999)),
  away_score   INTEGER CHECK (away_score IS NULL OR (away_score >= 0 AND away_score <= 999)),
  status       TEXT NOT NULL DEFAULT 'agendado'
               CHECK (status IN ('agendado','andamento','finalizado')),
  home_placeholder TEXT,
  away_placeholder TEXT
);

CREATE INDEX IF NOT EXISTS idx_matches_phase  ON matches(phase);
CREATE INDEX IF NOT EXISTS idx_matches_round  ON matches(round);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_home   ON matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away   ON matches(away_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_slot   ON matches(bracket_slot);

CREATE TABLE IF NOT EXISTS players (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id      TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  number       INTEGER,
  position     TEXT NOT NULL CHECK (position IN ('GOL','DEF','ALA','MED','ATA')),
  photo_url    TEXT,
  pos_x        REAL NOT NULL CHECK (pos_x >= 0 AND pos_x <= 100),
  pos_y        REAL NOT NULL CHECK (pos_y >= 0 AND pos_y <= 100)
);

CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);

CREATE TABLE IF NOT EXISTS sponsors (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  initials     TEXT NOT NULL,
  color        TEXT NOT NULL,
  tagline      TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0
);
