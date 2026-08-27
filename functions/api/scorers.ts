import { json, serverError, type PagesContext } from "./_shared";

// GET /api/scorers — artilharia: gols por jogador, ordenado desc.
export const onRequestGet = async (ctx: PagesContext): Promise<Response> => {
  try {
    const { results } = await ctx.env.DB.prepare(
      `SELECT
         e.player_id AS playerId,
         e.player_name AS playerName,
         e.team_id AS teamId,
         t.name AS teamName,
         t.color AS teamColor,
         COUNT(*) AS goals
       FROM match_events e
       LEFT JOIN teams t ON t.id = e.team_id
       WHERE e.type = 'gol'
       GROUP BY e.player_id, e.player_name, e.team_id
       ORDER BY goals DESC, e.player_name ASC;`,
    ).all();
    return json(results ?? []);
  } catch (e) {
    return serverError("GET scorers", e);
  }
};
