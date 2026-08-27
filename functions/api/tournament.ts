import { json, jsonMutation, error, serverError, requireAuth, type PagesContext } from "./_shared";

const DEFAULTS = { name: "Copa Ataci", edition: null as string | null, season: null as string | null };

// GET /api/tournament — metadados do torneio (público).
export const onRequestGet = async (ctx: PagesContext): Promise<Response> => {
  try {
    const row = (await ctx.env.DB.prepare(
      "SELECT name, edition, season FROM tournament WHERE id = 1;",
    ).first()) as { name: string; edition: string | null; season: string | null } | null;
    return json(row ?? DEFAULTS);
  } catch (e) {
    return serverError("GET tournament", e);
  }
};

// PUT /api/tournament — atualiza os metadados (PROTEGIDO). Corpo: { name, edition?, season? }
export const onRequestPut = async (ctx: PagesContext): Promise<Response> => {
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
    if (name === "") return error("name inválido.", 400);
    const text = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
    const edition = text(b.edition);
    const season = text(b.season);

    // Upsert da linha única (id=1).
    await ctx.env.DB.prepare(
      `INSERT INTO tournament (id, name, edition, season) VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, edition=excluded.edition, season=excluded.season;`,
    )
      .bind(name, edition, season)
      .run();

    return jsonMutation({ ok: true, tournament: { name, edition, season } });
  } catch (e) {
    return serverError("PUT tournament", e);
  }
};
