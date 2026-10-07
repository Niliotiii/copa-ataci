-- Renomeia o id do time Revisa de 'TIM' para 'REV' (abbr já era 'REV').
-- Estratégia segura com FKs ON: cria REV (cópia de TIM), re-aponta as
-- referências e remove TIM. Tudo numa transação.

-- D1 executa os statements do arquivo atomicamente (sem BEGIN/COMMIT).

-- 1. Cria o novo time REV copiando os dados de TIM.
INSERT INTO teams (id, name, abbr, color, crest_url, formation, sort_order)
SELECT 'REV', name, 'REV', color, crest_url, formation, sort_order
FROM teams WHERE id='TIM';

-- 2. Re-aponta as referências.
UPDATE matches      SET home_team_id='REV' WHERE home_team_id='TIM';
UPDATE matches      SET away_team_id='REV' WHERE away_team_id='TIM';
UPDATE players      SET team_id='REV'      WHERE team_id='TIM';
UPDATE match_events SET team_id='REV'      WHERE team_id='TIM';

-- 3. Remove o time antigo.
DELETE FROM teams WHERE id='TIM';
