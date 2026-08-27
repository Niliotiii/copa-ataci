import { json, jsonMutation, error, serverError, requireAuth, type PagesContext } from "../_shared";

// GET /api/teams/:id — time + elenco com coordenadas pos_x/pos_y (Modo Cartola).
export const onRequestGet = async (ctx: PagesContext): Promise<Response> => {
  try {
    const id = ctx.params.id as string;

    const team = await ctx.env.DB.prepare(
      `SELECT id, name, abbr, color, crest_url AS crestUrl, formation
         FROM teams WHERE id = ?;`,
    )
      .bind(id)
      .first();

    if (!team) return error("Time não encontrado", 404);

    const { results: players } = await ctx.env.DB.prepare(
      `SELECT name, number, position, photo_url AS photoUrl, pos_x AS posX, pos_y AS posY
         FROM players
        WHERE team_id = ?
        ORDER BY number ASC;`,
    )
      .bind(id)
      .all();

    return json({ ...team, players: players ?? [] });
  } catch (e) {
    return serverError("GET teams/:id", e);
  }
};

type TeamUpdateBody = {
  name?: string;
  abbr?: string;
  color?: string;
  crestUrl?: string | null;
  formation?: string | null;
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// PUT /api/teams/:id — atualiza dados do time (PROTEGIDO por token).
export const onRequestPut = async (ctx: PagesContext): Promise<Response> => {
  const unauthorized = await requireAuth(ctx);
  if (unauthorized) return unauthorized;

  try {
    const id = ctx.params.id as string;

    let body: TeamUpdateBody;
    try {
      body = (await ctx.request.json()) as TeamUpdateBody;
    } catch {
      return error("Corpo JSON inválido.", 400);
    }

    const sets: string[] = [];
    const binds: unknown[] = [];

    if ("name" in body) {
      if (typeof body.name !== "string" || body.name.trim() === "") {
        return error("name inválido.", 400);
      }
      sets.push("name = ?");
      binds.push(body.name.trim());
    }
    if ("abbr" in body) {
      const abbr = typeof body.abbr === "string" ? body.abbr.trim() : "";
      if (!/^[A-Za-z]{2,4}$/.test(abbr)) {
        return error("abbr inválido (2-4 letras).", 400);
      }
      sets.push("abbr = ?");
      binds.push(abbr.toUpperCase());
    }
    if ("color" in body) {
      if (typeof body.color !== "string" || !HEX_COLOR.test(body.color)) {
        return error("color inválido (formato #rrggbb).", 400);
      }
      sets.push("color = ?");
      binds.push(body.color);
    }
    if ("crestUrl" in body) {
      if (body.crestUrl !== null && typeof body.crestUrl !== "string") {
        return error("crestUrl inválido.", 400);
      }
      sets.push("crest_url = ?");
      binds.push(body.crestUrl);
    }
    if ("formation" in body) {
      if (body.formation !== null && typeof body.formation !== "string") {
        return error("formation inválido.", 400);
      }
      sets.push("formation = ?");
      binds.push(body.formation);
    }

    if (sets.length === 0) {
      return error("Nada para atualizar.", 400);
    }

    const existing = await ctx.env.DB.prepare("SELECT id FROM teams WHERE id = ?;")
      .bind(id)
      .first();
    if (!existing) return error("Time não encontrado", 404);

    binds.push(id);
    await ctx.env.DB.prepare(`UPDATE teams SET ${sets.join(", ")} WHERE id = ?;`)
      .bind(...binds)
      .run();

    const updated = await ctx.env.DB.prepare(
      `SELECT id, name, abbr, color, crest_url AS crestUrl, formation
         FROM teams WHERE id = ?;`,
    )
      .bind(id)
      .first();

    return jsonMutation({ ok: true, team: updated });
  } catch (e) {
    return serverError("PUT teams/:id", e);
  }
};
