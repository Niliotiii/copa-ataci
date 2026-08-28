import { json, serverError, type PagesContext } from "./_shared";

// GET /api/suspensions — suspensões PENDENTES (served=0) com dados do jogador/time.
export const onRequestGet = async (ctx: PagesContext): Promise<Response> => {
  try {
    const { results } = await ctx.env.DB.prepare(
      `SELECT
         s.id, s.player_id AS playerId, s.reason, s.games, s.served,
         p.name AS playerName, p.number AS playerNumber,
         t.id AS teamId, t.name AS teamName, t.color AS teamColor, t.crest_url AS teamCrest
       FROM suspensions s
       JOIN players p ON p.id = s.player_id
       LEFT JOIN teams t ON t.id = p.team_id
       WHERE s.served = 0
       ORDER BY t.name ASC, p.name ASC;`,
    ).all();
    return json(results ?? []);
  } catch (e) {
    return serverError("GET suspensions", e);
  }
};
