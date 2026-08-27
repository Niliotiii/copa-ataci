-- 0005: permitir o tipo de evento 'gol_contra' (gol contra o próprio time,
-- que conta para o adversário no placar). O SQLite não permite alterar um
-- CHECK, então recriamos a tabela match_events preservando os dados.
PRAGMA foreign_keys = OFF;

ALTER TABLE match_events RENAME TO match_events_old;

CREATE TABLE match_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id    INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id   INTEGER REFERENCES players(id) ON DELETE SET NULL,
  team_id     TEXT NOT NULL REFERENCES teams(id),
  player_name TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('gol','gol_contra','amarelo','vermelho')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO match_events (id, match_id, player_id, team_id, player_name, type, created_at)
  SELECT id, match_id, player_id, team_id, player_name, type, created_at FROM match_events_old;

DROP TABLE match_events_old;

CREATE INDEX idx_events_match  ON match_events(match_id);
CREATE INDEX idx_events_player ON match_events(player_id);
CREATE INDEX idx_events_type   ON match_events(type);

PRAGMA foreign_keys = ON;
