-- Copa Ataci · Seed de dados (migrado dos componentes hardcoded)
-- A classificação NÃO é inserida: ela é calculada a partir de `matches`.

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------
INSERT INTO teams (id, name, abbr, color, formation, sort_order) VALUES
  ('ATA', 'Ataci FC',       'ATA', '#16a34a', '3-2-3', 1),
  ('LEO', 'Leões do Norte', 'LEO', '#2563eb', '2-3-2', 2),
  ('FAL', 'Falcões FC',     'FAL', '#dc2626', '2-3-2', 3),
  ('REL', 'Relâmpago SC',   'REL', '#d97706', NULL,    4),
  ('FOR', 'Força Jovem',    'FOR', '#7c3aed', NULL,    5),
  ('EST', 'Estrelas EC',    'EST', '#0891b2', NULL,    6),
  ('CAC', 'Caçadores',      'CAC', '#65a30d', NULL,    7),
  ('TRO', 'Trovão FC',      'TRO', '#9f1239', NULL,    8);

-- ---------------------------------------------------------------------------
-- matches — Fase de grupos
-- Rodada 1 finalizada; Rodadas 2 e 3 agendadas (fiel ao Schedule.tsx).
-- ---------------------------------------------------------------------------
INSERT INTO matches (phase, round, match_date, match_time, location, home_team_id, away_team_id, home_score, away_score, status, home_red, away_red, home_yellow, away_yellow, home_fouls, away_fouls) VALUES
  -- Rodada 1 (com disciplina: cartões e faltas por lado)
  ('grupos', 1, 'Sáb, 12 Jul', '15:00', 'Arena Ataci', 'ATA', 'TRO', 7, 2, 'finalizado', 0, 1, 2, 3, 8, 12),
  ('grupos', 1, 'Sáb, 12 Jul', '17:00', 'Arena Ataci', 'LEO', 'EST', 5, 3, 'finalizado', 0, 0, 1, 2, 6, 9),
  ('grupos', 1, 'Dom, 13 Jul', '10:00', 'Arena Ataci', 'FAL', 'FOR', 4, 4, 'finalizado', 0, 0, 2, 2, 10, 10),
  ('grupos', 1, 'Dom, 13 Jul', '12:00', 'Arena Ataci', 'REL', 'CAC', 6, 1, 'finalizado', 1, 0, 3, 1, 11, 7);

INSERT INTO matches (phase, round, match_date, match_time, location, home_team_id, away_team_id, home_score, away_score, status) VALUES
  ('grupos', 2, 'Sáb, 19 Jul', '15:00', 'Arena Ataci', 'ATA', 'LEO', NULL, NULL, 'agendado'),
  ('grupos', 2, 'Sáb, 19 Jul', '17:00', 'Arena Ataci', 'FAL', 'REL', NULL, NULL, 'agendado'),
  ('grupos', 2, 'Dom, 20 Jul', '10:00', 'Arena Ataci', 'EST', 'CAC', NULL, NULL, 'agendado'),
  ('grupos', 2, 'Dom, 20 Jul', '12:00', 'Arena Ataci', 'FOR', 'TRO', NULL, NULL, 'agendado'),
  -- Rodada 3
  ('grupos', 3, 'Sáb, 26 Jul', '15:00', 'Arena Ataci', 'ATA', 'CAC', NULL, NULL, 'agendado'),
  ('grupos', 3, 'Sáb, 26 Jul', '17:00', 'Arena Ataci', 'TRO', 'LEO', NULL, NULL, 'agendado'),
  ('grupos', 3, 'Dom, 27 Jul', '10:00', 'Arena Ataci', 'REL', 'FOR', NULL, NULL, 'agendado'),
  ('grupos', 3, 'Dom, 27 Jul', '12:00', 'Arena Ataci', 'EST', 'FAL', NULL, NULL, 'agendado');

-- ---------------------------------------------------------------------------
-- matches — Mata-mata (migrado de Bracket.tsx)
-- ---------------------------------------------------------------------------
INSERT INTO matches (phase, bracket_slot, match_date, match_time, location, home_team_id, away_team_id, home_score, away_score, status) VALUES
  -- Quartas
  ('quartas', 'QF1', 'Sáb, 02 Ago', '15:00', 'Arena Ataci', 'ATA', 'FOR', 8, 3, 'finalizado'),
  ('quartas', 'QF2', 'Sáb, 02 Ago', '17:00', 'Arena Ataci', 'LEO', 'CAC', 6, 2, 'finalizado'),
  ('quartas', 'QF3', 'Dom, 03 Ago', '10:00', 'Arena Ataci', 'FAL', 'EST', 5, 4, 'finalizado'),
  ('quartas', 'QF4', 'Dom, 03 Ago', '12:00', 'Arena Ataci', 'REL', 'TRO', 7, 1, 'finalizado'),
  -- Semis
  ('semis', 'SF1', 'Sáb, 09 Ago', '15:00', 'Arena Ataci', 'ATA', 'LEO', 5, 3, 'finalizado'),
  ('semis', 'SF2', 'Dom, 27 Ago', '16:00', 'Arena Ataci', 'FAL', 'REL', NULL, NULL, 'agendado');

-- Final: só um finalista definido (ATA). O outro lado é placeholder.
INSERT INTO matches (phase, bracket_slot, match_date, match_time, location, home_team_id, away_placeholder, home_score, away_score, status) VALUES
  ('final', 'F', 'A definir', '16:00', 'Arena Ataci', 'ATA', 'Vencedor SF2', NULL, NULL, 'agendado');

-- ---------------------------------------------------------------------------
-- players — coordenadas pos_x/pos_y percentuais (0-100). PRD 3.4.
-- Migrado de TeamLineup.tsx. Layout: y menor = ataque (topo), y maior = gol.
-- ---------------------------------------------------------------------------
-- Ataci FC (3-2-3)
INSERT INTO players (team_id, name, number, position, pos_x, pos_y) VALUES
  ('ATA', 'Rodrigo', 1,  'GOL', 50, 88),
  ('ATA', 'Matheus', 4,  'DEF', 28, 72),
  ('ATA', 'Felipe',  5,  'DEF', 50, 72),
  ('ATA', 'Diego',   6,  'DEF', 72, 72),
  ('ATA', 'Lucas',   2,  'ALA', 22, 52),
  ('ATA', 'Thiago',  3,  'ALA', 78, 52),
  ('ATA', 'Rafael',  8,  'MED', 30, 32),
  ('ATA', 'André',   10, 'MED', 50, 32),
  ('ATA', 'Carlos',  7,  'MED', 70, 32),
  ('ATA', 'Bruno',   11, 'ATA', 28, 14),
  ('ATA', 'Gabriel', 9,  'ATA', 50, 14),
  ('ATA', 'João',    17, 'ATA', 72, 14);

-- Leões do Norte
INSERT INTO players (team_id, name, number, position, pos_x, pos_y) VALUES
  ('LEO', 'Tiago',   1,  'GOL', 50, 88),
  ('LEO', 'Vitor',   4,  'DEF', 35, 72),
  ('LEO', 'Marcos',  5,  'DEF', 65, 72),
  ('LEO', 'Pedro',   3,  'ALA', 22, 52),
  ('LEO', 'Fábio',   7,  'ALA', 78, 52),
  ('LEO', 'Igor',    8,  'MED', 30, 32),
  ('LEO', 'Renato',  10, 'MED', 50, 32),
  ('LEO', 'Caio',    6,  'MED', 70, 32),
  ('LEO', 'Alan',    11, 'ATA', 28, 14),
  ('LEO', 'Júnior',  9,  'ATA', 50, 14),
  ('LEO', 'Leandro', 17, 'ATA', 72, 14);

-- Falcões FC
INSERT INTO players (team_id, name, number, position, pos_x, pos_y) VALUES
  ('FAL', 'Samuel',   1,  'GOL', 50, 88),
  ('FAL', 'Henrique', 4,  'DEF', 35, 72),
  ('FAL', 'Augusto',  5,  'DEF', 65, 72),
  ('FAL', 'Danilo',   2,  'ALA', 22, 52),
  ('FAL', 'Patrick',  3,  'ALA', 78, 52),
  ('FAL', 'Wesley',   8,  'MED', 30, 32),
  ('FAL', 'Murilo',   10, 'MED', 50, 32),
  ('FAL', 'Gustavo',  7,  'MED', 70, 32),
  ('FAL', 'Edson',    11, 'ATA', 28, 14),
  ('FAL', 'Fernando', 9,  'ATA', 50, 14),
  ('FAL', 'Cássio',   17, 'ATA', 72, 14);

-- Relâmpago SC
INSERT INTO players (team_id, name, number, position, pos_x, pos_y) VALUES
  ('REL', 'Adriano', 1,  'GOL', 50, 88),
  ('REL', 'Bruno R', 4,  'DEF', 35, 72),
  ('REL', 'Cléber',  5,  'DEF', 65, 72),
  ('REL', 'Diego R', 2,  'ALA', 22, 52),
  ('REL', 'Elias',   3,  'ALA', 78, 52),
  ('REL', 'Flávio',  8,  'MED', 35, 32),
  ('REL', 'Gilberto',10, 'MED', 65, 32),
  ('REL', 'Hugo',    9,  'ATA', 38, 14),
  ('REL', 'Ivan',    11, 'ATA', 62, 14);

-- Força Jovem
INSERT INTO players (team_id, name, number, position, pos_x, pos_y) VALUES
  ('FOR', 'Jonas',   1,  'GOL', 50, 88),
  ('FOR', 'Kevin',   4,  'DEF', 35, 72),
  ('FOR', 'Luan',    5,  'DEF', 65, 72),
  ('FOR', 'Mário',   2,  'ALA', 22, 52),
  ('FOR', 'Nelson',  3,  'ALA', 78, 52),
  ('FOR', 'Otávio',  8,  'MED', 35, 32),
  ('FOR', 'Paulo',   10, 'MED', 65, 32),
  ('FOR', 'Quintino',9,  'ATA', 38, 14),
  ('FOR', 'Rui',     11, 'ATA', 62, 14);

-- Estrelas EC
INSERT INTO players (team_id, name, number, position, pos_x, pos_y) VALUES
  ('EST', 'Sérgio',  1,  'GOL', 50, 88),
  ('EST', 'Téo',     4,  'DEF', 35, 72),
  ('EST', 'Ulisses', 5,  'DEF', 65, 72),
  ('EST', 'Válter',  2,  'ALA', 22, 52),
  ('EST', 'Wander',  3,  'ALA', 78, 52),
  ('EST', 'Xavier',  8,  'MED', 35, 32),
  ('EST', 'Yuri',    10, 'MED', 65, 32),
  ('EST', 'Zé',      9,  'ATA', 38, 14),
  ('EST', 'Aldo',    11, 'ATA', 62, 14);

-- Caçadores
INSERT INTO players (team_id, name, number, position, pos_x, pos_y) VALUES
  ('CAC', 'Beto',    1,  'GOL', 50, 88),
  ('CAC', 'Cadu',    4,  'DEF', 35, 72),
  ('CAC', 'Dante',   5,  'DEF', 65, 72),
  ('CAC', 'Éder',    2,  'ALA', 22, 52),
  ('CAC', 'Fabinho', 3,  'ALA', 78, 52),
  ('CAC', 'Gean',    8,  'MED', 35, 32),
  ('CAC', 'Heitor',  10, 'MED', 65, 32),
  ('CAC', 'Ícaro',   9,  'ATA', 38, 14),
  ('CAC', 'Juca',    11, 'ATA', 62, 14);

-- Trovão FC
INSERT INTO players (team_id, name, number, position, pos_x, pos_y) VALUES
  ('TRO', 'Kaká',    1,  'GOL', 50, 88),
  ('TRO', 'Lipe',    4,  'DEF', 35, 72),
  ('TRO', 'Moa',     5,  'DEF', 65, 72),
  ('TRO', 'Neto',    2,  'ALA', 22, 52),
  ('TRO', 'Oscar',   3,  'ALA', 78, 52),
  ('TRO', 'Pablo',   8,  'MED', 35, 32),
  ('TRO', 'Quiel',   10, 'MED', 65, 32),
  ('TRO', 'Ramon',   9,  'ATA', 38, 14),
  ('TRO', 'Saulo',   11, 'ATA', 62, 14);

-- ---------------------------------------------------------------------------
-- sponsors (migrado de SponsorTicker.tsx)
-- ---------------------------------------------------------------------------
INSERT INTO sponsors (name, initials, color, tagline, link_url, sort_order) VALUES
  ('Arena Ataci',      'AA', '#16a34a', 'Patrocinador Oficial', 'https://instagram.com/arenaataci',  1),
  ('Barbearia KL',     'KL', '#d97706', 'Estilo em Campo',      'https://instagram.com/barbeariakl', 2),
  ('Padaria Central',  'PC', '#dc2626', 'Energia para Jogar',   NULL,                                3),
  ('Farmácia Vida',    'FV', '#2563eb', 'Saúde do Atleta',      NULL,                                4),
  ('AutoPeças JS',     'JS', '#7c3aed', 'Parceiro do Esporte',  NULL,                                5),
  ('Restaurante BH',   'BH', '#0891b2', 'Força Total',          NULL,                                6),
  ('Academia FitZone', 'FZ', '#9f1239', 'Treine como Campeão',  NULL,                                7);

-- ---------------------------------------------------------------------------
-- match_events (Rodada 1) — reproduzem os placares/cartões acima, para que
-- artilharia e disciplina fiquem consistentes num fresh install.
-- ---------------------------------------------------------------------------
INSERT INTO match_events (match_id, player_id, team_id, player_name, type) VALUES
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='ATA' AND away_team_id='TRO'), (SELECT id FROM players WHERE team_id='ATA' AND name='Bruno'), 'ATA', 'Bruno', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='ATA' AND away_team_id='TRO'), (SELECT id FROM players WHERE team_id='ATA' AND name='Gabriel'), 'ATA', 'Gabriel', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='ATA' AND away_team_id='TRO'), (SELECT id FROM players WHERE team_id='ATA' AND name='João'), 'ATA', 'João', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='ATA' AND away_team_id='TRO'), (SELECT id FROM players WHERE team_id='ATA' AND name='Rafael'), 'ATA', 'Rafael', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='ATA' AND away_team_id='TRO'), (SELECT id FROM players WHERE team_id='ATA' AND name='André'), 'ATA', 'André', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='ATA' AND away_team_id='TRO'), (SELECT id FROM players WHERE team_id='ATA' AND name='Carlos'), 'ATA', 'Carlos', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='ATA' AND away_team_id='TRO'), (SELECT id FROM players WHERE team_id='ATA' AND name='Bruno'), 'ATA', 'Bruno', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='ATA' AND away_team_id='TRO'), (SELECT id FROM players WHERE team_id='ATA' AND name='Rodrigo'), 'ATA', 'Rodrigo', 'amarelo'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='ATA' AND away_team_id='TRO'), (SELECT id FROM players WHERE team_id='ATA' AND name='Diego'), 'ATA', 'Diego', 'amarelo'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='ATA' AND away_team_id='TRO'), (SELECT id FROM players WHERE team_id='TRO' AND name='Ramon'), 'TRO', 'Ramon', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='ATA' AND away_team_id='TRO'), (SELECT id FROM players WHERE team_id='TRO' AND name='Saulo'), 'TRO', 'Saulo', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='ATA' AND away_team_id='TRO'), (SELECT id FROM players WHERE team_id='TRO' AND name='Kaká'), 'TRO', 'Kaká', 'amarelo'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='ATA' AND away_team_id='TRO'), (SELECT id FROM players WHERE team_id='TRO' AND name='Moa'), 'TRO', 'Moa', 'amarelo'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='ATA' AND away_team_id='TRO'), (SELECT id FROM players WHERE team_id='TRO' AND name='Lipe'), 'TRO', 'Lipe', 'amarelo'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='ATA' AND away_team_id='TRO'), (SELECT id FROM players WHERE team_id='TRO' AND name='Kaká'), 'TRO', 'Kaká', 'vermelho'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='LEO' AND away_team_id='EST'), (SELECT id FROM players WHERE team_id='LEO' AND name='Alan'), 'LEO', 'Alan', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='LEO' AND away_team_id='EST'), (SELECT id FROM players WHERE team_id='LEO' AND name='Júnior'), 'LEO', 'Júnior', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='LEO' AND away_team_id='EST'), (SELECT id FROM players WHERE team_id='LEO' AND name='Leandro'), 'LEO', 'Leandro', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='LEO' AND away_team_id='EST'), (SELECT id FROM players WHERE team_id='LEO' AND name='Igor'), 'LEO', 'Igor', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='LEO' AND away_team_id='EST'), (SELECT id FROM players WHERE team_id='LEO' AND name='Renato'), 'LEO', 'Renato', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='LEO' AND away_team_id='EST'), (SELECT id FROM players WHERE team_id='LEO' AND name='Tiago'), 'LEO', 'Tiago', 'amarelo'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='LEO' AND away_team_id='EST'), (SELECT id FROM players WHERE team_id='EST' AND name='Zé'), 'EST', 'Zé', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='LEO' AND away_team_id='EST'), (SELECT id FROM players WHERE team_id='EST' AND name='Aldo'), 'EST', 'Aldo', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='LEO' AND away_team_id='EST'), (SELECT id FROM players WHERE team_id='EST' AND name='Xavier'), 'EST', 'Xavier', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='LEO' AND away_team_id='EST'), (SELECT id FROM players WHERE team_id='EST' AND name='Sérgio'), 'EST', 'Sérgio', 'amarelo'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='LEO' AND away_team_id='EST'), (SELECT id FROM players WHERE team_id='EST' AND name='Ulisses'), 'EST', 'Ulisses', 'amarelo'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='FAL' AND away_team_id='FOR'), (SELECT id FROM players WHERE team_id='FAL' AND name='Edson'), 'FAL', 'Edson', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='FAL' AND away_team_id='FOR'), (SELECT id FROM players WHERE team_id='FAL' AND name='Fernando'), 'FAL', 'Fernando', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='FAL' AND away_team_id='FOR'), (SELECT id FROM players WHERE team_id='FAL' AND name='Cássio'), 'FAL', 'Cássio', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='FAL' AND away_team_id='FOR'), (SELECT id FROM players WHERE team_id='FAL' AND name='Wesley'), 'FAL', 'Wesley', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='FAL' AND away_team_id='FOR'), (SELECT id FROM players WHERE team_id='FAL' AND name='Samuel'), 'FAL', 'Samuel', 'amarelo'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='FAL' AND away_team_id='FOR'), (SELECT id FROM players WHERE team_id='FAL' AND name='Augusto'), 'FAL', 'Augusto', 'amarelo'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='FAL' AND away_team_id='FOR'), (SELECT id FROM players WHERE team_id='FOR' AND name='Quintino'), 'FOR', 'Quintino', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='FAL' AND away_team_id='FOR'), (SELECT id FROM players WHERE team_id='FOR' AND name='Rui'), 'FOR', 'Rui', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='FAL' AND away_team_id='FOR'), (SELECT id FROM players WHERE team_id='FOR' AND name='Otávio'), 'FOR', 'Otávio', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='FAL' AND away_team_id='FOR'), (SELECT id FROM players WHERE team_id='FOR' AND name='Paulo'), 'FOR', 'Paulo', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='FAL' AND away_team_id='FOR'), (SELECT id FROM players WHERE team_id='FOR' AND name='Jonas'), 'FOR', 'Jonas', 'amarelo'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='FAL' AND away_team_id='FOR'), (SELECT id FROM players WHERE team_id='FOR' AND name='Luan'), 'FOR', 'Luan', 'amarelo'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='REL' AND away_team_id='CAC'), (SELECT id FROM players WHERE team_id='REL' AND name='Hugo'), 'REL', 'Hugo', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='REL' AND away_team_id='CAC'), (SELECT id FROM players WHERE team_id='REL' AND name='Ivan'), 'REL', 'Ivan', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='REL' AND away_team_id='CAC'), (SELECT id FROM players WHERE team_id='REL' AND name='Flávio'), 'REL', 'Flávio', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='REL' AND away_team_id='CAC'), (SELECT id FROM players WHERE team_id='REL' AND name='Gilberto'), 'REL', 'Gilberto', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='REL' AND away_team_id='CAC'), (SELECT id FROM players WHERE team_id='REL' AND name='Diego R'), 'REL', 'Diego R', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='REL' AND away_team_id='CAC'), (SELECT id FROM players WHERE team_id='REL' AND name='Elias'), 'REL', 'Elias', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='REL' AND away_team_id='CAC'), (SELECT id FROM players WHERE team_id='REL' AND name='Adriano'), 'REL', 'Adriano', 'amarelo'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='REL' AND away_team_id='CAC'), (SELECT id FROM players WHERE team_id='REL' AND name='Cléber'), 'REL', 'Cléber', 'amarelo'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='REL' AND away_team_id='CAC'), (SELECT id FROM players WHERE team_id='REL' AND name='Bruno R'), 'REL', 'Bruno R', 'amarelo'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='REL' AND away_team_id='CAC'), (SELECT id FROM players WHERE team_id='REL' AND name='Adriano'), 'REL', 'Adriano', 'vermelho'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='REL' AND away_team_id='CAC'), (SELECT id FROM players WHERE team_id='CAC' AND name='Ícaro'), 'CAC', 'Ícaro', 'gol'),
  ((SELECT id FROM matches WHERE phase='grupos' AND round=1 AND home_team_id='REL' AND away_team_id='CAC'), (SELECT id FROM players WHERE team_id='CAC' AND name='Beto'), 'CAC', 'Beto', 'amarelo');

-- suspensions pendentes da Rodada 1 (cartões vermelhos).
INSERT INTO suspensions (player_id, reason, games, served) VALUES
  ((SELECT id FROM players WHERE team_id='TRO' AND name='Kaká'), 'vermelho', 1, 0),
  ((SELECT id FROM players WHERE team_id='REL' AND name='Adriano'), 'vermelho', 1, 0);
