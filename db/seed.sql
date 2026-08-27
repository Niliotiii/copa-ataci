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

-- ---------------------------------------------------------------------------
-- sponsors (migrado de SponsorTicker.tsx)
-- ---------------------------------------------------------------------------
INSERT INTO sponsors (name, initials, color, tagline, sort_order) VALUES
  ('Arena Ataci',      'AA', '#16a34a', 'Patrocinador Oficial', 1),
  ('Barbearia KL',     'KL', '#d97706', 'Estilo em Campo',      2),
  ('Padaria Central',  'PC', '#dc2626', 'Energia para Jogar',   3),
  ('Farmácia Vida',    'FV', '#2563eb', 'Saúde do Atleta',      4),
  ('AutoPeças JS',     'JS', '#7c3aed', 'Parceiro do Esporte',  5),
  ('Restaurante BH',   'BH', '#0891b2', 'Força Total',          6),
  ('Academia FitZone', 'FZ', '#9f1239', 'Treine como Campeão',  7);
