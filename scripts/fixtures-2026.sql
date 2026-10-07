-- Ajuste de jogos/rodadas da fase de grupos — calendário oficial 2026.
-- Local: Campo do Serra Azul para todos. Atualiza por ID (não destrutivo).
-- TIM = Revisa Auto Center, FZC = Fazenda Camata, RAC = Rancho Leiteiro.

-- Rodada 1
UPDATE matches SET round=1, match_date='17/10/2026', match_time='15:45', location='Campo do Serra Azul', home_team_id='RON', away_team_id='IBP' WHERE id=38;
UPDATE matches SET round=1, match_date='17/10/2026', match_time='16:45', location='Campo do Serra Azul', home_team_id='TIM', away_team_id='BUT' WHERE id=39;
UPDATE matches SET round=1, match_date='24/10/2026', match_time='15:45', location='Campo do Serra Azul', home_team_id='VER', away_team_id='FZC' WHERE id=40;

-- Rodada 2
UPDATE matches SET round=2, match_date='24/10/2026', match_time='16:45', location='Campo do Serra Azul', home_team_id='RAC', away_team_id='IBP' WHERE id=41;
UPDATE matches SET round=2, match_date='31/10/2026', match_time='15:45', location='Campo do Serra Azul', home_team_id='VER', away_team_id='TIM' WHERE id=43;
UPDATE matches SET round=2, match_date='31/10/2026', match_time='16:45', location='Campo do Serra Azul', home_team_id='RON', away_team_id='BUT' WHERE id=42;

-- Rodada 3
UPDATE matches SET round=3, match_date='07/11/2026', match_time='15:45', location='Campo do Serra Azul', home_team_id='RAC', away_team_id='FZC' WHERE id=45;
UPDATE matches SET round=3, match_date='07/11/2026', match_time='16:45', location='Campo do Serra Azul', home_team_id='RON', away_team_id='VER' WHERE id=46;
UPDATE matches SET round=3, match_date='14/11/2026', match_time='15:45', location='Campo do Serra Azul', home_team_id='IBP', away_team_id='BUT' WHERE id=44;

-- Rodada 4
UPDATE matches SET round=4, match_date='14/11/2026', match_time='16:45', location='Campo do Serra Azul', home_team_id='FZC', away_team_id='TIM' WHERE id=49;
UPDATE matches SET round=4, match_date='21/11/2026', match_time='15:45', location='Campo do Serra Azul', home_team_id='RAC', away_team_id='BUT' WHERE id=48;
UPDATE matches SET round=4, match_date='21/11/2026', match_time='16:45', location='Campo do Serra Azul', home_team_id='IBP', away_team_id='VER' WHERE id=47;

-- Rodada 5
UPDATE matches SET round=5, match_date='28/11/2026', match_time='15:45', location='Campo do Serra Azul', home_team_id='FZC', away_team_id='RON' WHERE id=51;
UPDATE matches SET round=5, match_date='28/11/2026', match_time='16:45', location='Campo do Serra Azul', home_team_id='RAC', away_team_id='TIM' WHERE id=52;
UPDATE matches SET round=5, match_date='05/12/2026', match_time='15:45', location='Campo do Serra Azul', home_team_id='BUT', away_team_id='VER' WHERE id=50;

-- Rodada 6
UPDATE matches SET round=6, match_date='05/12/2026', match_time='16:45', location='Campo do Serra Azul', home_team_id='FZC', away_team_id='IBP' WHERE id=53;
UPDATE matches SET round=6, match_date='12/12/2026', match_time='15:45', location='Campo do Serra Azul', home_team_id='TIM', away_team_id='RON' WHERE id=54;
UPDATE matches SET round=6, match_date='12/12/2026', match_time='16:45', location='Campo do Serra Azul', home_team_id='RAC', away_team_id='VER' WHERE id=55;

-- Rodada 7
UPDATE matches SET round=7, match_date='19/12/2026', match_time='15:45', location='Campo do Serra Azul', home_team_id='TIM', away_team_id='IBP' WHERE id=56;
UPDATE matches SET round=7, match_date='19/12/2026', match_time='16:45', location='Campo do Serra Azul', home_team_id='BUT', away_team_id='FZC' WHERE id=57;
UPDATE matches SET round=7, match_date='20/12/2026', match_time='16:45', location='Campo do Serra Azul', home_team_id='RAC', away_team_id='RON' WHERE id=58;
