-- Migration 0003 · eventos por jogador (gols/cartões) e suspensões.

CREATE TABLE IF NOT EXISTS match_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id    INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id   INTEGER REFERENCES players(id) ON DELETE SET NULL,
  team_id     TEXT NOT NULL REFERENCES teams(id),
  player_name TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('gol','amarelo','vermelho')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_match  ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_events_player ON match_events(player_id);
CREATE INDEX IF NOT EXISTS idx_events_type   ON match_events(type);

CREATE TABLE IF NOT EXISTS suspensions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id      INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reason         TEXT NOT NULL CHECK (reason IN ('vermelho','3_amarelos')),
  games          INTEGER NOT NULL DEFAULT 1,
  source_match_id INTEGER REFERENCES matches(id) ON DELETE SET NULL,
  served         INTEGER NOT NULL DEFAULT 0 CHECK (served IN (0,1)),
  served_at      TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_susp_player ON suspensions(player_id);
CREATE INDEX IF NOT EXISTS idx_susp_served ON suspensions(served);
