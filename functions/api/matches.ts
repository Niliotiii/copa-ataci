import { json, serverError, teamSide, type PagesContext } from "./_shared";

// GET /api/matches?phase=grupos&round=2
// Lista de jogos com dados dos times (join). Filtros opcionais por fase e rodada.
export const onRequestGet = async (ctx: PagesContext): Promise<Response> => {
  try {
    const url = new URL(ctx.request.url);
    const phase = url.searchParams.get("phase");
    const roundRaw = url.searchParams.get("round");

    const where: string[] = [];
    const binds: unknown[] = [];
    if (phase) {
      where.push("m.phase = ?");
      binds.push(phase);
    }
    if (roundRaw != null && roundRaw !== "") {
      const round = Number(roundRaw);
      // Ignora round inválido (NaN) em vez de vazar NaN pro SQL.
      if (Number.isInteger(round)) {
        where.push("m.round = ?");
        binds.push(round);
      }
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        m.id, m.phase, m.round, m.bracket_slot AS bracketSlot,
        m.match_date AS date, m.match_time AS time, m.location, m.status,
        m.home_score AS homeScore, m.away_score AS awayScore,
        m.home_placeholder AS homePlaceholder, m.away_placeholder AS awayPlaceholder,
        ht.id AS homeAbbr, ht.name AS homeName, ht.color AS homeColor,
        at.id AS awayAbbr, at.name AS awayName, at.color AS awayColor
      FROM matches m
      LEFT JOIN teams ht ON ht.id = m.home_team_id
      LEFT JOIN teams at ON at.id = m.away_team_id
      ${whereSql}
      ORDER BY m.round ASC, m.id ASC;
    `;

    const stmt = ctx.env.DB.prepare(sql);
    const { results } = await (binds.length ? stmt.bind(...binds) : stmt).all();

    const matches = ((results ?? []) as Record<string, unknown>[]).map((row) => ({
      id: row.id,
      phase: row.phase,
      round: row.round,
      bracketSlot: row.bracketSlot,
      date: row.date,
      time: row.time,
      location: row.location,
      status: row.status,
      teamA: teamSide({
        abbr: row.homeAbbr, name: row.homeName, color: row.homeColor,
        placeholder: row.homePlaceholder, score: row.homeScore,
      }),
      teamB: teamSide({
        abbr: row.awayAbbr, name: row.awayName, color: row.awayColor,
        placeholder: row.awayPlaceholder, score: row.awayScore,
      }),
    }));

    return json(matches);
  } catch (e) {
    return serverError("GET matches", e);
  }
};
