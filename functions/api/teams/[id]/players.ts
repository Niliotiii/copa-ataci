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
      `SELECT id, name, number, position, photo_url AS photoUrl, pos_x AS posX, pos_y AS posY
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

    // Upsert por NOME (chave estável) para preservar players.id — assim os
    // eventos (gols/cartões) e suspensões que referenciam o jogador não são
    // perdidos ao reeditar o elenco. Atualiza os que ficam, insere os novos,
    // remove os que saíram — tudo num único batch (transação).
    const { results: existingRows } = await ctx.env.DB.prepare(
      "SELECT id, name FROM players WHERE team_id = ?;",
    )
      .bind(id)
      .all();
    const existing = new Map<string, number>();
    for (const r of (existingRows ?? []) as { id: number; name: string }[]) {
      existing.set(r.name.trim().toLowerCase(), r.id);
    }

    const seen = new Set<string>();
    const statements: D1PreparedStatement[] = [];
    const updateStmt = ctx.env.DB.prepare(
      `UPDATE players SET number=?, position=?, photo_url=?, pos_x=?, pos_y=? WHERE id=?;`,
    );
    const insertStmt = ctx.env.DB.prepare(
      `INSERT INTO players (team_id, name, number, position, photo_url, pos_x, pos_y)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
    );

    for (const p of players) {
      const name = (p.name as string).trim();
      const key = name.toLowerCase();
      seen.add(key);
      const number = (p.number as number | undefined) ?? null;
      const photo = (p.photoUrl as string | undefined) ?? null;
      const existingId = existing.get(key);
      if (existingId != null) {
        statements.push(updateStmt.bind(number, p.position as string, photo, p.posX as number, p.posY as number, existingId));
      } else {
        statements.push(insertStmt.bind(id, name, number, p.position as string, photo, p.posX as number, p.posY as number));
      }
    }
    // Remove jogadores que não estão mais na lista.
    for (const [key, existingId] of existing) {
      if (!seen.has(key)) {
        statements.push(ctx.env.DB.prepare("DELETE FROM players WHERE id=?;").bind(existingId));
      }
    }
    if (statements.length > 0) await ctx.env.DB.batch(statements);

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
