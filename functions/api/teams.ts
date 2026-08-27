import { json, serverError, type PagesContext } from "./_shared";

// GET /api/teams — lista de times (sem elenco).
export const onRequestGet = async (ctx: PagesContext): Promise<Response> => {
  try {
    const { results } = await ctx.env.DB.prepare(
      `SELECT id, name, abbr, color, crest_url AS crestUrl, formation
         FROM teams
        ORDER BY sort_order ASC, name ASC;`,
    ).all();
    return json(results ?? []);
  } catch (e) {
    return serverError("GET teams", e);
  }
};
