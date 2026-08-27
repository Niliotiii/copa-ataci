import { json, jsonMutation, error, serverError, requireAuth, teamSide, type PagesContext } from "./_shared";

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
        m.home_red AS homeRed, m.away_red AS awayRed,
        m.home_yellow AS homeYellow, m.away_yellow AS awayYellow,
        m.home_fouls AS homeFouls, m.away_fouls AS awayFouls,
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
      teamA: {
        ...teamSide({
          abbr: row.homeAbbr, name: row.homeName, color: row.homeColor,
          placeholder: row.homePlaceholder, score: row.homeScore,
        }),
        red: (row.homeRed as number) ?? 0,
        yellow: (row.homeYellow as number) ?? 0,
        fouls: (row.homeFouls as number) ?? 0,
      },
      teamB: {
        ...teamSide({
          abbr: row.awayAbbr, name: row.awayName, color: row.awayColor,
          placeholder: row.awayPlaceholder, score: row.awayScore,
        }),
        red: (row.awayRed as number) ?? 0,
        yellow: (row.awayYellow as number) ?? 0,
        fouls: (row.awayFouls as number) ?? 0,
      },
    }));

    return json(matches);
  } catch (e) {
    return serverError("GET matches", e);
  }
};

const VALID_PHASE = new Set(["grupos", "quartas", "semis", "final"]);

// POST /api/matches — cria um jogo avulso (PROTEGIDO).
// Corpo: { phase, round?, bracketSlot?, date, time, location, homeTeamId?, awayTeamId? }
export const onRequestPost = async (ctx: PagesContext): Promise<Response> => {
  const unauthorized = await requireAuth(ctx);
  if (unauthorized) return unauthorized;

  try {
    let b: Record<string, unknown>;
    try {
      b = (await ctx.request.json()) as Record<string, unknown>;
    } catch {
      return error("Corpo JSON inválido.", 400);
    }

    const phase = b.phase;
    if (typeof phase !== "string" || !VALID_PHASE.has(phase)) {
      return error("phase inválida (grupos|quartas|semis|final).", 400);
    }
    const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const date = text(b.date) || "A definir";
    const time = text(b.time);
    const location = text(b.location) || "A definir";

    let round: number | null = null;
    if (b.round != null) {
      round = Number(b.round);
      if (!Number.isInteger(round) || round < 1 || round > 999) return error("round inválido.", 400);
    }
    const bracketSlot = text(b.bracketSlot) || null;

    // Valida times informados (opcionais).
    const teamIds: (string | null)[] = [];
    for (const key of ["homeTeamId", "awayTeamId"] as const) {
      const v = b[key];
      if (v == null || v === "") {
        teamIds.push(null);
      } else if (typeof v === "string") {
        const t = await ctx.env.DB.prepare("SELECT id FROM teams WHERE id = ?;").bind(v).first();
        if (!t) return error(`${key}: time '${v}' não existe.`, 400);
        teamIds.push(v);
      } else {
        return error(`${key} inválido.`, 400);
      }
    }

    await ctx.env.DB.prepare(
      `INSERT INTO matches (phase, round, bracket_slot, match_date, match_time, location, home_team_id, away_team_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'agendado');`,
    )
      .bind(phase, round, bracketSlot, date, time, location, teamIds[0], teamIds[1])
      .run();

    const row = (await ctx.env.DB.prepare("SELECT last_insert_rowid() AS id;").first()) as { id: number } | null;
    return jsonMutation({ ok: true, id: row?.id ?? null });
  } catch (e) {
    return serverError("POST matches", e);
  }
};
