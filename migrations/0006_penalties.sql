-- 0006: pênaltis para desempatar jogos de mata-mata (placar normal empatado).
ALTER TABLE matches ADD COLUMN home_pens INTEGER;
ALTER TABLE matches ADD COLUMN away_pens INTEGER;
