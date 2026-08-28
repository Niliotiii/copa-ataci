import { json, serverError, type PagesContext } from "./_shared";

// GET /api/standings
// Classificação CALCULADA a partir dos jogos finalizados da fase de grupos.
// Critérios de desempate, nesta ordem:
//   1. pontos
//   2. confronto direto (mini-tabela entre os times empatados em pontos)
//   3. número de vitórias
//   4. saldo de gols
//   5. gols pró
//   6. gols contra (menos é melhor)
//   7. cartões vermelhos (menos é melhor)
//   8. cartões amarelos (menos é melhor)
//   9. faltas (menos é melhor)
// Como o confronto direto não é expressável em ORDER BY, agregamos no SQL e
// ordenamos em TypeScript.

export type Row = {
  abbr: string;
  name: string;
  color: string;
  crestUrl: string | null;
  j: number; v: number; e: number; d: number;
  gp: number; gc: number; sg: number; pts: number;
  red: number; yellow: number; fouls: number;
};

type FinishedMatch = {
  home: string; away: string; hs: number; as_: number;
};

export const onRequestGet = async (ctx: PagesContext): Promise<Response> => {
  try {
    const ordered = await computeStandings(ctx.env.DB);
    return json(ordered.map((r, i) => ({ pos: i + 1, ...r })));
  } catch (e) {
    return serverError("GET standings", e);
  }
};

/**
 * Calcula a classificação ordenada (com todos os critérios de desempate) a
 * partir dos jogos finalizados da fase de grupos. Reutilizável por outros
 * endpoints (ex.: geração do mata-mata).
 */
export async function computeStandings(db: PagesContext["env"]["DB"]): Promise<Row[]> {
  // Agregação por time a partir dos jogos finalizados da fase de grupos.
  const aggSql = `
      WITH results AS (
        SELECT home_team_id AS team_id, home_score AS gf, away_score AS ga,
               home_red AS red, home_yellow AS yellow, home_fouls AS fouls
          FROM matches
         WHERE phase='grupos' AND status='finalizado'
           AND home_score IS NOT NULL AND away_score IS NOT NULL
        UNION ALL
        SELECT away_team_id, away_score, home_score,
               away_red, away_yellow, away_fouls
          FROM matches
         WHERE phase='grupos' AND status='finalizado'
           AND home_score IS NOT NULL AND away_score IS NOT NULL
      ),
      agg AS (
        SELECT team_id,
          COUNT(*) AS j,
          SUM(CASE WHEN gf>ga THEN 1 ELSE 0 END) AS v,
          SUM(CASE WHEN gf=ga THEN 1 ELSE 0 END) AS e,
          SUM(CASE WHEN gf<ga THEN 1 ELSE 0 END) AS d,
          COALESCE(SUM(gf),0) AS gp,
          COALESCE(SUM(ga),0) AS gc,
          COALESCE(SUM(red),0) AS red,
          COALESCE(SUM(yellow),0) AS yellow,
          COALESCE(SUM(fouls),0) AS fouls
        FROM results GROUP BY team_id
      )
      SELECT t.id AS abbr, t.name AS name, t.color AS color, t.crest_url AS crestUrl,
        COALESCE(a.j,0) AS j, COALESCE(a.v,0) AS v, COALESCE(a.e,0) AS e, COALESCE(a.d,0) AS d,
        COALESCE(a.gp,0) AS gp, COALESCE(a.gc,0) AS gc,
        COALESCE(a.gp,0)-COALESCE(a.gc,0) AS sg,
        COALESCE(a.v,0)*3 + COALESCE(a.e,0) AS pts,
        COALESCE(a.red,0) AS red, COALESCE(a.yellow,0) AS yellow, COALESCE(a.fouls,0) AS fouls
      FROM teams t
      LEFT JOIN agg a ON a.team_id = t.id;
    `;
    const { results } = await db.prepare(aggSql).all();
    const rows = (results ?? []) as unknown as Row[];

    // Jogos finalizados para o confronto direto.
    const { results: fmRes } = await db.prepare(
      `SELECT home_team_id AS home, away_team_id AS away, home_score AS hs, away_score AS as_
         FROM matches
        WHERE phase='grupos' AND status='finalizado'
          AND home_score IS NOT NULL AND away_score IS NOT NULL;`,
    ).all();
    const finished = (fmRes ?? []) as unknown as FinishedMatch[];

    return sortStandings(rows, finished);
}

/**
 * Pontos ganhos por cada time SÓ nos jogos entre os membros de `group`
 * (confronto direto). Retorna um mapa abbr → { pts, sg, gp }.
 */
function headToHead(group: string[], finished: FinishedMatch[]) {
  const set = new Set(group);
  const acc: Record<string, { pts: number; sg: number; gp: number }> = {};
  for (const g of group) acc[g] = { pts: 0, sg: 0, gp: 0 };
  for (const m of finished) {
    if (!set.has(m.home) || !set.has(m.away)) continue;
    acc[m.home].gp += m.hs; acc[m.home].sg += m.hs - m.as_;
    acc[m.away].gp += m.as_; acc[m.away].sg += m.as_ - m.hs;
    if (m.hs > m.as_) acc[m.home].pts += 3;
    else if (m.hs < m.as_) acc[m.away].pts += 3;
    else { acc[m.home].pts += 1; acc[m.away].pts += 1; }
  }
  return acc;
}

/** Ordena aplicando os 9 critérios na sequência definida. */
export function sortStandings(rows: Row[], finished: FinishedMatch[]): Row[] {
  // Comparadores "diretos" (não dependem do grupo), do 3º critério em diante.
  const afterH2H = (a: Row, b: Row): number =>
    b.v - a.v ||            // 3. vitórias
    b.sg - a.sg ||          // 4. saldo
    b.gp - a.gp ||          // 5. gols pró
    a.gc - b.gc ||          // 6. gols contra (menos melhor)
    a.red - b.red ||        // 7. vermelhos (menos melhor)
    a.yellow - b.yellow ||  // 8. amarelos (menos melhor)
    a.fouls - b.fouls ||    // 9. faltas (menos melhor)
    a.name.localeCompare(b.name); // estável por nome

  // Ordena primeiro por pontos; empates resolvidos por confronto direto e,
  // persistindo, pelos demais critérios.
  return rows.slice().sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;

    // Grupo de times empatados em pontos com a e b.
    const tied = rows.filter((r) => r.pts === a.pts).map((r) => r.abbr);
    if (tied.length > 2) {
      const h = headToHead(tied, finished);
      const ha = h[a.abbr], hb = h[b.abbr];
      if (hb.pts !== ha.pts) return hb.pts - ha.pts;
      if (hb.sg !== ha.sg) return hb.sg - ha.sg;
      if (hb.gp !== ha.gp) return hb.gp - ha.gp;
    } else {
      // Empate entre exatamente 2 times: confronto direto = jogos entre eles.
      const h = headToHead([a.abbr, b.abbr], finished);
      const ha = h[a.abbr], hb = h[b.abbr];
      if (hb.pts !== ha.pts) return hb.pts - ha.pts;
      if (hb.sg !== ha.sg) return hb.sg - ha.sg;
    }
    return afterH2H(a, b);
  });
}
