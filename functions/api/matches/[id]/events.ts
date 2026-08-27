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
// gol_contra: gol marcado pelo jogador contra o próprio time — conta para o
// ADVERSÁRIO no placar e NÃO entra na artilharia.
const TYPES = new Set(["gol", "gol_contra", "amarelo", "vermelho"]);

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

    // Jogadores que já tinham eventos neste jogo (para recomputar suspensões
    // mesmo quando seus eventos forem removidos nesta edição).
    const prevRows = await ctx.env.DB.prepare(
      "SELECT DISTINCT player_id AS pid FROM match_events WHERE match_id = ?;",
    ).bind(id).all();
    const previouslyAffected = (prevRows.results as { pid: number }[]).map((r) => r.pid);

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
    // Placar de um lado = gols do próprio time + gols contra do adversário.
    const scoreFor = (own: string | null, opp: string | null) =>
      tally(own, "gol") + tally(opp, "gol_contra");
    stmts.push(
      ctx.env.DB
        .prepare(
          `UPDATE matches SET home_score=?, away_score=?, home_red=?, away_red=?, home_yellow=?, away_yellow=? WHERE id=?;`,
        )
        .bind(
          scoreFor(match.home, match.away), scoreFor(match.away, match.home),
          tally(match.home, "vermelho"), tally(match.away, "vermelho"),
          tally(match.home, "amarelo"), tally(match.away, "amarelo"),
          id,
        ),
    );

    await ctx.env.DB.batch(stmts);

    // Regenera as suspensões dos jogadores afetados (atuais + os que tinham
    // eventos antes e podem ter sido removidos nesta edição).
    const affected = [...new Set([...resolved.map((r) => r.playerId), ...previouslyAffected])];
    for (const pid of affected) {
      await regenerateSuspensions(ctx.env.DB, pid);
    }

    return jsonMutation({ ok: true, count: resolved.length });
  } catch (e) {
    return serverError("PUT matches/:id/events", e);
  }
};

/**
 * Recomputa as suspensões PENDENTES de um jogador a partir de todos os seus
 * eventos, de forma IDEMPOTENTE e preservando as já cumpridas.
 *
 * Regra: cada vermelho = 1 suspensão; a cada 3 amarelos = 1 suspensão.
 * Para cada motivo: pendentes_alvo = max(0, devido − cumpridas). Ajusta o número
 * de suspensões pendentes (served=0) para bater com o alvo — INSERE se faltam,
 * REMOVE se sobram (ex.: cartão corrigido para menos). Nunca toca nas cumpridas.
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
  const due: Record<string, number> = {
    vermelho: reds, // 1 jogo por vermelho
    "3_amarelos": Math.floor(yellows / 3), // 1 jogo a cada 3 amarelos
  };

  for (const reason of ["vermelho", "3_amarelos"]) {
    const row = (await db
      .prepare(
        `SELECT
           SUM(CASE WHEN served=1 THEN 1 ELSE 0 END) AS served,
           SUM(CASE WHEN served=0 THEN 1 ELSE 0 END) AS pending
         FROM suspensions WHERE player_id = ? AND reason = ?;`,
      )
      .bind(playerId, reason)
      .first()) as { served: number | null; pending: number | null } | null;

    const servedCount = row?.served ?? 0;
    const pendingCount = row?.pending ?? 0;
    const targetPending = Math.max(0, due[reason] - servedCount);

    if (targetPending > pendingCount) {
      // Faltam pendentes → cria a diferença.
      for (let i = 0; i < targetPending - pendingCount; i++) {
        await db
          .prepare("INSERT INTO suspensions (player_id, reason, games, served) VALUES (?, ?, 1, 0);")
          .bind(playerId, reason)
          .run();
      }
    } else if (targetPending < pendingCount) {
      // Sobram pendentes (cartão corrigido p/ menos) → remove só o excedente
      // das NÃO cumpridas, preservando as cumpridas.
      await db
        .prepare(
          `DELETE FROM suspensions
            WHERE id IN (
              SELECT id FROM suspensions
               WHERE player_id = ? AND reason = ? AND served = 0
               ORDER BY id DESC LIMIT ?
            );`,
        )
        .bind(playerId, reason, pendingCount - targetPending)
        .run();
    }
  }
}
