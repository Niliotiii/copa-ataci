import { json, jsonMutation, error, serverError, requireAuth, type PagesContext, type Env } from "../_shared";

type UpdateBody = {
  status?: "agendado" | "andamento" | "finalizado";
  date?: string;
  time?: string;
  location?: string;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  homeFouls?: number;
  awayFouls?: number;
  homePens?: number | null;
  awayPens?: number | null;
};

const VALID_STATUS = new Set(["agendado", "andamento", "finalizado"]);

// Campos DERIVADOS dos eventos por jogador — não podem ser editados aqui.
// (placar e cartões são recalculados por PUT /api/matches/:id/events.)
const DERIVED_FIELDS = ["homeScore", "awayScore", "homeRed", "awayRed", "homeYellow", "awayYellow"];

// Faltas continuam manuais (não são eventos por jogador).
const DISCIPLINE: [keyof UpdateBody, string][] = [
  ["homeFouls", "home_fouls"], ["awayFouls", "away_fouls"],
];

// Mapa de avanço do mata-mata: o vencedor de cada slot alimenta um lado
// (home/away) do slot seguinte.
const ADVANCE: Record<string, { next: string; side: "home" | "away" }> = {
  QF1: { next: "SF1", side: "home" },
  QF2: { next: "SF1", side: "away" },
  QF3: { next: "SF2", side: "home" },
  QF4: { next: "SF2", side: "away" },
  SF1: { next: "F", side: "home" },
  SF2: { next: "F", side: "away" },
};

// GET /api/matches/:id — um jogo específico (público).
export const onRequestGet = async (ctx: PagesContext): Promise<Response> => {
  try {
    const id = Number(ctx.params.id);
    if (!Number.isInteger(id)) return error("ID inválido.", 400);

    const row = await ctx.env.DB.prepare(
      `SELECT id, phase, round, bracket_slot AS bracketSlot, match_date AS date,
              match_time AS time, location, status,
              home_team_id AS homeTeamId, away_team_id AS awayTeamId,
              home_score AS homeScore, away_score AS awayScore,
              home_red AS homeRed, away_red AS awayRed,
              home_yellow AS homeYellow, away_yellow AS awayYellow,
              home_fouls AS homeFouls, away_fouls AS awayFouls,
              home_pens AS homePens, away_pens AS awayPens
         FROM matches WHERE id = ?;`,
    )
      .bind(id)
      .first();

    if (!row) return error("Jogo não encontrado.", 404);
    return json(row);
  } catch (e) {
    return serverError("GET matches/:id", e);
  }
};

/**
 * Propaga o vencedor de um jogo de mata-mata finalizado para o slot seguinte.
 * Se o jogo não for de mata-mata, empatar, ou não estiver finalizado, o lado
 * correspondente do próximo slot é LIMPO (volta a placeholder) — assim desfazer
 * um resultado também reverte o avanço. Retorna os statements para o batch.
 */
async function advanceStatements(
  db: Env["DB"],
  matchId: number,
): Promise<D1PreparedStatement[]> {
  const m = (await db
    .prepare(
      `SELECT bracket_slot AS slot, status, home_team_id AS home, away_team_id AS away,
              home_score AS hs, away_score AS as_, home_pens AS hp, away_pens AS ap
         FROM matches WHERE id = ?;`,
    )
    .bind(matchId)
    .first()) as
    | { slot: string | null; status: string; home: string | null; away: string | null; hs: number | null; as_: number | null; hp: number | null; ap: number | null }
    | null;

  if (!m || !m.slot || !ADVANCE[m.slot]) return [];
  const rule = ADVANCE[m.slot];

  let winner: string | null = null;
  if (m.status === "finalizado" && m.hs != null && m.as_ != null) {
    if (m.hs !== m.as_) {
      winner = m.hs > m.as_ ? m.home : m.away;
    } else if (m.hp != null && m.ap != null && m.hp !== m.ap) {
      // Empate no tempo normal → decide pelos pênaltis.
      winner = m.hp > m.ap ? m.home : m.away;
    }
  }

  const col = rule.side === "home" ? "home_team_id" : "away_team_id";
  // Define o vencedor (ou limpa se não houver) no lado certo do próximo slot.
  return [
    db.prepare(`UPDATE matches SET ${col} = ? WHERE bracket_slot = ?;`).bind(winner, rule.next),
  ];
}

// PUT /api/matches/:id — atualiza placar/status/dados do jogo (PROTEGIDO).
export const onRequestPut = async (ctx: PagesContext): Promise<Response> => {
  const unauthorized = await requireAuth(ctx);
  if (unauthorized) return unauthorized;

  try {
    const id = Number(ctx.params.id);
    if (!Number.isInteger(id)) return error("ID inválido.", 400);

    let body: UpdateBody & Record<string, unknown>;
    try {
      body = (await ctx.request.json()) as UpdateBody & Record<string, unknown>;
    } catch {
      return error("Corpo JSON inválido.", 400);
    }

    // Placar e cartões são DERIVADOS dos eventos por jogador — não editáveis aqui.
    const derived = DERIVED_FIELDS.filter((f) => f in body);
    if (derived.length > 0) {
      return error(
        `Campos derivados dos eventos não podem ser editados aqui (${derived.join(", ")}). Use os eventos por jogador em /api/matches/:id/events.`,
        400,
      );
    }

    const sets: string[] = [];
    const binds: unknown[] = [];

    if ("status" in body) {
      if (!body.status || !VALID_STATUS.has(body.status)) {
        return error("status inválido (agendado|andamento|finalizado).", 400);
      }
      sets.push("status = ?");
      binds.push(body.status);
    }

    const validText = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

    if ("date" in body) {
      if (!validText(body.date)) return error("date inválido.", 400);
      sets.push("match_date = ?");
      binds.push(body.date!.trim());
    }
    if ("time" in body) {
      if (!validText(body.time)) return error("time inválido.", 400);
      sets.push("match_time = ?");
      binds.push(body.time!.trim());
    }
    if ("location" in body) {
      if (!validText(body.location)) return error("location inválido.", 400);
      sets.push("location = ?");
      binds.push(body.location!.trim());
    }

    for (const [key, col] of [
      ["homeTeamId", "home_team_id"],
      ["awayTeamId", "away_team_id"],
    ] as const) {
      if (key in body) {
        const teamId = body[key];
        if (teamId !== null) {
          if (typeof teamId !== "string") return error(`${key} inválido.`, 400);
          const team = await ctx.env.DB.prepare("SELECT id FROM teams WHERE id = ?;")
            .bind(teamId)
            .first();
          if (!team) return error(`${key}: time '${teamId}' não existe.`, 400);
        }
        sets.push(`${col} = ?`);
        binds.push(teamId);
      }
    }

    // Disciplina: inteiros >= 0.
    for (const [key, col] of DISCIPLINE) {
      if (key in body) {
        const v = body[key];
        if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 999) {
          return error(`${key} inválido (inteiro 0-999).`, 400);
        }
        sets.push(`${col} = ?`);
        binds.push(v);
      }
    }

    // Pênaltis (mata-mata): inteiro >= 0 ou null (limpa).
    for (const [key, col] of [["homePens", "home_pens"], ["awayPens", "away_pens"]] as const) {
      if (key in body) {
        const v = body[key];
        if (v !== null && (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 99)) {
          return error(`${key} inválido (inteiro 0-99 ou null).`, 400);
        }
        sets.push(`${col} = ?`);
        binds.push(v);
      }
    }

    if (sets.length === 0) {
      return error("Nada para atualizar.", 400);
    }

    const existing = await ctx.env.DB.prepare("SELECT id FROM matches WHERE id = ?;")
      .bind(id)
      .first();
    if (!existing) return error("Jogo não encontrado.", 404);

    binds.push(id);
    await ctx.env.DB.prepare(`UPDATE matches SET ${sets.join(", ")} WHERE id = ?;`)
      .bind(...binds)
      .run();

    // Se for jogo de mata-mata, propaga (ou reverte) o vencedor no slot seguinte.
    const advance = await advanceStatements(ctx.env.DB, id);
    if (advance.length > 0) {
      await ctx.env.DB.batch(advance);
    }

    const updated = await ctx.env.DB.prepare(
      `SELECT id, phase, round, bracket_slot AS bracketSlot, status,
              match_date AS date, match_time AS time, location,
              home_team_id AS homeTeamId, away_team_id AS awayTeamId,
              home_score AS homeScore, away_score AS awayScore,
              home_red AS homeRed, away_red AS awayRed,
              home_yellow AS homeYellow, away_yellow AS awayYellow,
              home_fouls AS homeFouls, away_fouls AS awayFouls,
              home_pens AS homePens, away_pens AS awayPens
         FROM matches WHERE id = ?;`,
    )
      .bind(id)
      .first();

    return jsonMutation({ ok: true, match: updated });
  } catch (e) {
    return serverError("PUT matches/:id", e);
  }
};
