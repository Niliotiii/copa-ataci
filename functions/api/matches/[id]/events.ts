import { json, jsonMutation, error, serverError, requireAuth, type PagesContext, type Env } from "../../_shared";

// GET /api/matches/:id/events — lista os eventos (gols/cartões) do jogo (público).
export const onRequestGet = async (ctx: PagesContext): Promise<Response> => {
  try {
    const id = Number(ctx.params.id);
    if (!Number.isInteger(id)) return error("ID inválido.", 400);
    const { results } = await ctx.env.DB.prepare(
      `SELECT id, player_id AS playerId, team_id AS teamId, player_name AS playerName, type
         FROM match_events WHERE match_id = ? ORDER BY id ASC;`,
    )
      .bind(id)
      .all();
    return json(results ?? []);
  } catch (e) {
    return serverError("GET matches/:id/events", e);
  }
};

type EventInput = { playerId?: unknown; type?: unknown };
const TYPES = new Set(["gol", "amarelo", "vermelho"]);

// PUT /api/matches/:id/events — substitui os eventos do jogo (PROTEGIDO).
// Corpo: { events: [{ playerId, type }, ...] }
// Efeitos: (1) grava os eventos; (2) recalcula os agregados de cartões do jogo
// (home/away red/yellow) a partir dos eventos; (3) regenera as suspensões.
export const onRequestPut = async (ctx: PagesContext): Promise<Response> => {
  const unauthorized = await requireAuth(ctx);
  if (unauthorized) return unauthorized;

  try {
    const id = Number(ctx.params.id);
    if (!Number.isInteger(id)) return error("ID inválido.", 400);

    let body: { events?: unknown };
    try {
      body = (await ctx.request.json()) as { events?: unknown };
    } catch {
      return error("Corpo JSON inválido.", 400);
    }
    if (!Array.isArray(body.events)) return error("Campo 'events' deve ser um array.", 400);
    const events = body.events as EventInput[];

    const match = (await ctx.env.DB.prepare(
      "SELECT id, home_team_id AS home, away_team_id AS away FROM matches WHERE id = ?;",
    )
      .bind(id)
      .first()) as { id: number; home: string | null; away: string | null } | null;
    if (!match) return error("Jogo não encontrado.", 404);

    // Valida cada evento e resolve o jogador (precisa existir e pertencer a um
    // dos times do jogo).
    type Resolved = { playerId: number; teamId: string; playerName: string; type: string };
    const resolved: Resolved[] = [];
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (typeof ev.type !== "string" || !TYPES.has(ev.type)) {
        return error(`evento ${i}: type inválido (gol|amarelo|vermelho).`, 400);
      }
      if (typeof ev.playerId !== "number" || !Number.isInteger(ev.playerId)) {
        return error(`evento ${i}: playerId inválido.`, 400);
      }
      const p = (await ctx.env.DB.prepare("SELECT id, name, team_id AS teamId FROM players WHERE id = ?;")
        .bind(ev.playerId)
        .first()) as { id: number; name: string; teamId: string } | null;
      if (!p) return error(`evento ${i}: jogador não encontrado.`, 400);
      if (p.teamId !== match.home && p.teamId !== match.away) {
        return error(`evento ${i}: jogador não pertence a um dos times do jogo.`, 400);
      }
      resolved.push({ playerId: p.id, teamId: p.teamId, playerName: p.name, type: ev.type });
    }

    // Grava os eventos: apaga os do jogo e insere os novos (batch/transação).
    const insertEvent = ctx.env.DB.prepare(
      `INSERT INTO match_events (match_id, player_id, team_id, player_name, type)
       VALUES (?, ?, ?, ?, ?);`,
    );
    const stmts: D1PreparedStatement[] = [
      ctx.env.DB.prepare("DELETE FROM match_events WHERE match_id = ?;").bind(id),
      ...resolved.map((r) => insertEvent.bind(id, r.playerId, r.teamId, r.playerName, r.type)),
    ];

    // Recalcula os agregados (cartões E gols) DO JOGO a partir dos eventos.
    const tally = (team: string | null, type: string) =>
      team == null ? 0 : resolved.filter((r) => r.teamId === team && r.type === type).length;
    stmts.push(
      ctx.env.DB
        .prepare(
          `UPDATE matches SET home_score=?, away_score=?, home_red=?, away_red=?, home_yellow=?, away_yellow=? WHERE id=?;`,
        )
        .bind(
          tally(match.home, "gol"), tally(match.away, "gol"),
          tally(match.home, "vermelho"), tally(match.away, "vermelho"),
          tally(match.home, "amarelo"), tally(match.away, "amarelo"),
          id,
        ),
    );

    await ctx.env.DB.batch(stmts);

    // Regenera as suspensões dos jogadores afetados por este jogo.
    const affected = [...new Set(resolved.map((r) => r.playerId))];
    for (const pid of affected) {
      await regenerateSuspensions(ctx.env.DB, pid);
    }

    return jsonMutation({ ok: true, count: resolved.length });
  } catch (e) {
    return serverError("PUT matches/:id/events", e);
  }
};

/**
 * Recalcula as suspensões PENDENTES devidas de um jogador a partir de todos os
 * seus eventos, sem apagar as já cumpridas.
 * Regra: cada vermelho = 1 suspensão; a cada 3 amarelos = 1 suspensão.
 * Cria só a diferença entre o total devido e o total já existente por motivo.
 */
async function regenerateSuspensions(db: Env["DB"], playerId: number): Promise<void> {
  const counts = (await db
    .prepare(
      `SELECT
         SUM(CASE WHEN type='vermelho' THEN 1 ELSE 0 END) AS reds,
         SUM(CASE WHEN type='amarelo' THEN 1 ELSE 0 END) AS yellows
       FROM match_events WHERE player_id = ?;`,
    )
    .bind(playerId)
    .first()) as { reds: number | null; yellows: number | null } | null;

  const reds = counts?.reds ?? 0;
  const yellows = counts?.yellows ?? 0;
  const dueRed = reds; // 1 jogo por vermelho
  const dueYellow = Math.floor(yellows / 3); // 1 jogo a cada 3 amarelos

  const have = (await db
    .prepare(
      `SELECT
         SUM(CASE WHEN reason='vermelho' THEN 1 ELSE 0 END) AS red,
         SUM(CASE WHEN reason='3_amarelos' THEN 1 ELSE 0 END) AS yel
       FROM suspensions WHERE player_id = ?;`,
    )
    .bind(playerId)
    .first()) as { red: number | null; yel: number | null } | null;

  const haveRed = have?.red ?? 0;
  const haveYel = have?.yel ?? 0;

  const toAdd: string[] = [];
  for (let i = 0; i < dueRed - haveRed; i++) toAdd.push("vermelho");
  for (let i = 0; i < dueYellow - haveYel; i++) toAdd.push("3_amarelos");

  for (const reason of toAdd) {
    await db
      .prepare("INSERT INTO suspensions (player_id, reason, games, served) VALUES (?, ?, 1, 0);")
      .bind(playerId, reason)
      .run();
  }
}
