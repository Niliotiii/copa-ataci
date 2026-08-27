import { json, jsonMutation, error, serverError, requireAuth, type PagesContext } from "./_shared";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// GET /api/teams — lista de times (sem elenco).
export const onRequestGet = async (ctx: PagesContext): Promise<Response> => {
  try {
    const { results } = await ctx.env.DB.prepare(
      `SELECT id, name, abbr, color, crest_url AS crestUrl
         FROM teams
        ORDER BY sort_order ASC, name ASC;`,
    ).all();
    return json(results ?? []);
  } catch (e) {
    return serverError("GET teams", e);
  }
};

// POST /api/teams — cria um time (PROTEGIDO). O id é a sigla (2-4 letras).
// Corpo: { name, abbr, color, crestUrl? }
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

    const name = typeof b.name === "string" ? b.name.trim() : "";
    const abbrRaw = typeof b.abbr === "string" ? b.abbr.trim() : "";
    if (name === "") return error("name inválido.", 400);
    if (!/^[A-Za-z]{2,4}$/.test(abbrRaw)) return error("abbr inválido (2-4 letras).", 400);
    if (typeof b.color !== "string" || !HEX_COLOR.test(b.color)) return error("color inválido (#rrggbb).", 400);
    const abbr = abbrRaw.toUpperCase();
    const crestUrl = b.crestUrl == null ? null : String(b.crestUrl);

    const exists = await ctx.env.DB.prepare("SELECT id FROM teams WHERE id = ?;").bind(abbr).first();
    if (exists) return error(`Já existe um time com a sigla '${abbr}'.`, 409);

    // sort_order = próximo no fim da lista.
    const maxRow = (await ctx.env.DB.prepare("SELECT COALESCE(MAX(sort_order),0) AS m FROM teams;").first()) as { m: number } | null;
    const sortOrder = (maxRow?.m ?? 0) + 1;

    await ctx.env.DB.prepare(
      `INSERT INTO teams (id, name, abbr, color, crest_url, sort_order) VALUES (?, ?, ?, ?, ?, ?);`,
    )
      .bind(abbr, name, abbr, b.color, crestUrl, sortOrder)
      .run();

    return jsonMutation({ ok: true, id: abbr });
  } catch (e) {
    return serverError("POST teams", e);
  }
};
