-- Migration 0002 · disciplina por lado nos jogos (cartões e faltas)
-- Usada nos critérios de desempate da classificação. Idempotência: como o D1
-- não suporta ADD COLUMN IF NOT EXISTS, esta migration só deve ser aplicada uma
-- vez (o registro de migrations do wrangler garante isso).

ALTER TABLE matches ADD COLUMN home_red    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE matches ADD COLUMN away_red    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE matches ADD COLUMN home_yellow INTEGER NOT NULL DEFAULT 0;
ALTER TABLE matches ADD COLUMN away_yellow INTEGER NOT NULL DEFAULT 0;
ALTER TABLE matches ADD COLUMN home_fouls  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE matches ADD COLUMN away_fouls  INTEGER NOT NULL DEFAULT 0;
