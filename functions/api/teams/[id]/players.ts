import { json, jsonMutation, error, serverError, requireAuth, type PagesContext } from "../../_shared";

// GET /api/teams/:id/players — apenas o elenco (público).
export const onRequestGet = async (ctx: PagesContext): Promise<Response> => {
  try {
    const id = ctx.params.id as string;
    const team = await ctx.env.DB.prepare("SELECT id FROM teams WHERE id = ?;")
      .bind(id)
      .first();
    if (!team) return error("Time não encontrado", 404);

    const { results } = await ctx.env.DB.prepare(
      `SELECT name, number, position, photo_url AS photoUrl, pos_x AS posX, pos_y AS posY
         FROM players WHERE team_id = ? ORDER BY number ASC;`,
    )
      .bind(id)
      .all();
    return json(results ?? []);
  } catch (e) {
    return serverError("GET teams/:id/players", e);
  }
};

type PlayerInput = {
  name?: unknown;
  number?: unknown;
  position?: unknown;
  photoUrl?: unknown;
  posX?: unknown;
  posY?: unknown;
};

const POSITIONS = new Set(["GOL", "DEF", "ALA", "MED", "ATA"]);

function validatePlayer(p: PlayerInput, i: number): string | null {
  if (typeof p.name !== "string" || p.name.trim() === "") return `jogador ${i}: name inválido.`;
  if (typeof p.position !== "string" || !POSITIONS.has(p.position))
    return `jogador ${i}: position inválida (GOL|DEF|ALA|MED|ATA).`;
  const inRange = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
  if (!inRange(p.posX)) return `jogador ${i}: posX inválido (0-100).`;
  if (!inRange(p.posY)) return `jogador ${i}: posY inválido (0-100).`;
  if (p.number != null && (typeof p.number !== "number" || !Number.isInteger(p.number)))
    return `jogador ${i}: number inválido.`;
  if (p.photoUrl != null && typeof p.photoUrl !== "string")
    return `jogador ${i}: photoUrl inválido.`;
  return null;
}

// PUT /api/teams/:id/players — substitui o elenco inteiro (PROTEGIDO).
// Corpo: { players: [{ name, number?, position, photoUrl?, posX, posY }, ...] }
export const onRequestPut = async (ctx: PagesContext): Promise<Response> => {
  const unauthorized = await requireAuth(ctx);
  if (unauthorized) return unauthorized;

  try {
    const id = ctx.params.id as string;

    let body: { players?: unknown };
    try {
      body = (await ctx.request.json()) as { players?: unknown };
    } catch {
      return error("Corpo JSON inválido.", 400);
    }

    if (!Array.isArray(body.players)) {
      return error("Campo 'players' deve ser um array.", 400);
    }
    const players = body.players as PlayerInput[];

    for (let i = 0; i < players.length; i++) {
      const err = validatePlayer(players[i], i);
      if (err) return error(err, 400);
    }

    const team = await ctx.env.DB.prepare("SELECT id FROM teams WHERE id = ?;")
      .bind(id)
      .first();
    if (!team) return error("Time não encontrado", 404);

    // Substitui o elenco atomicamente: DELETE + INSERTs num único batch
    // (o D1 executa o batch numa transação implícita).
    const insertStmt = ctx.env.DB.prepare(
      `INSERT INTO players (team_id, name, number, position, photo_url, pos_x, pos_y)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
    );
    const statements = [
      ctx.env.DB.prepare("DELETE FROM players WHERE team_id = ?;").bind(id),
      ...players.map((p) =>
        insertStmt.bind(
          id,
          (p.name as string).trim(),
          (p.number as number | undefined) ?? null,
          p.position as string,
          (p.photoUrl as string | undefined) ?? null,
          p.posX as number,
          p.posY as number,
        ),
      ),
    ];
    await ctx.env.DB.batch(statements);

    const { results } = await ctx.env.DB.prepare(
      `SELECT name, number, position, photo_url AS photoUrl, pos_x AS posX, pos_y AS posY
         FROM players WHERE team_id = ? ORDER BY number ASC;`,
    )
      .bind(id)
      .all();

    return jsonMutation({ ok: true, count: (results ?? []).length, players: results ?? [] });
  } catch (e) {
    return serverError("PUT teams/:id/players", e);
  }
};
