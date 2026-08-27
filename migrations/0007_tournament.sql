-- 0007: metadados/config do torneio (linha única).
CREATE TABLE IF NOT EXISTS tournament (
  id       INTEGER PRIMARY KEY CHECK (id = 1),
  name     TEXT NOT NULL,
  edition  TEXT,
  season   TEXT
);
INSERT OR IGNORE INTO tournament (id, name, edition, season) VALUES
  (1, 'Copa Ataci', '5ª Edição', '2026');
