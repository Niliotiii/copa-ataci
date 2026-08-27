import { json, serverError, type PagesContext } from "./_shared";

// GET /api/standings
// Classificação CALCULADA a partir dos jogos finalizados da fase de grupos.
// Vitória = 3 pts, empate = 1, derrota = 0. Ordenação: pts, saldo, gols pró.
export const onRequestGet = async (ctx: PagesContext): Promise<Response> => {
  try {
    const sql = `
      WITH results AS (
        SELECT home_team_id AS team_id, home_score AS gf, away_score AS ga
          FROM matches
         WHERE phase = 'grupos' AND status = 'finalizado'
           AND home_score IS NOT NULL AND away_score IS NOT NULL
        UNION ALL
        SELECT away_team_id AS team_id, away_score AS gf, home_score AS ga
          FROM matches
         WHERE phase = 'grupos' AND status = 'finalizado'
           AND home_score IS NOT NULL AND away_score IS NOT NULL
      ),
      agg AS (
        SELECT
          team_id,
          COUNT(*)                                             AS j,
          SUM(CASE WHEN gf > ga THEN 1 ELSE 0 END)             AS v,
          SUM(CASE WHEN gf = ga THEN 1 ELSE 0 END)             AS e,
          SUM(CASE WHEN gf < ga THEN 1 ELSE 0 END)             AS d,
          COALESCE(SUM(gf), 0)                                 AS gp,
          COALESCE(SUM(ga), 0)                                 AS gc
        FROM results
        GROUP BY team_id
      )
      SELECT
        t.id                                   AS abbr,
        t.name                                 AS name,
        t.color                                AS color,
        COALESCE(a.j, 0)                       AS j,
        COALESCE(a.v, 0)                       AS v,
        COALESCE(a.e, 0)                       AS e,
        COALESCE(a.d, 0)                       AS d,
        COALESCE(a.gp, 0)                      AS gp,
        COALESCE(a.gc, 0)                      AS gc,
        COALESCE(a.gp, 0) - COALESCE(a.gc, 0)  AS sg,
        COALESCE(a.v, 0) * 3 + COALESCE(a.e, 0) AS pts
      FROM teams t
      LEFT JOIN agg a ON a.team_id = t.id
      ORDER BY pts DESC, sg DESC, gp DESC, t.name ASC;
    `;
    const { results } = await ctx.env.DB.prepare(sql).all();

    // Adiciona a posição (1-based) após a ordenação.
    const table = (results ?? []).map((row, i) => ({
      pos: i + 1,
      ...row,
    }));

    return json(table);
  } catch (e) {
    return serverError("GET standings", e);
  }
};
