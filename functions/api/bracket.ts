import { json, serverError, type PagesContext } from "./_shared";

// GET /api/bracket
// Retorna o mata-mata agrupado por fase (quartas, semis, final) com o vencedor
// derivado do placar quando o jogo está finalizado.
export const onRequestGet = async (ctx: PagesContext): Promise<Response> => {
  try {
    const sql = `
      SELECT
        m.id, m.phase, m.bracket_slot AS slot, m.status,
        m.home_score AS homeScore, m.away_score AS awayScore,
        m.home_placeholder AS homePlaceholder, m.away_placeholder AS awayPlaceholder,
        ht.id AS homeAbbr, ht.name AS homeName, ht.color AS homeColor,
        at.id AS awayAbbr, at.name AS awayName, at.color AS awayColor
      FROM matches m
      LEFT JOIN teams ht ON ht.id = m.home_team_id
      LEFT JOIN teams at ON at.id = m.away_team_id
      WHERE m.phase IN ('quartas', 'semis', 'final')
      ORDER BY m.id ASC;
    `;
    const { results } = await ctx.env.DB.prepare(sql).all();

    const mapBox = (r: Record<string, unknown>) => {
      const homeScore = (r.homeScore as number | null) ?? null;
      const awayScore = (r.awayScore as number | null) ?? null;
      let winner: "A" | "B" | null = null;
      if (r.status === "finalizado" && homeScore !== null && awayScore !== null) {
        winner = homeScore > awayScore ? "A" : awayScore > homeScore ? "B" : null;
      }
      return {
        id: r.id,
        slot: r.slot,
        teamA: {
          abbr: (r.homeAbbr as string) ?? "???",
          name: (r.homeName as string) ?? (r.homePlaceholder as string) ?? "A definir",
          color: (r.homeColor as string) ?? "#6b7280",
          score: homeScore,
        },
        teamB: {
          abbr: (r.awayAbbr as string) ?? "???",
          name: (r.awayName as string) ?? (r.awayPlaceholder as string) ?? "A definir",
          color: (r.awayColor as string) ?? "#6b7280",
          score: awayScore,
        },
        winner,
      };
    };

    // Ordena por número do slot (QF2 antes de QF10) dentro de cada fase.
    const slotNum = (slot: unknown) => {
      const m = /(\d+)/.exec(String(slot ?? ""));
      return m ? Number(m[1]) : 0;
    };
    const rows = ((results ?? []) as Record<string, unknown>[]).slice().sort(
      (a, b) => slotNum(a.slot) - slotNum(b.slot),
    );

    const bracket = {
      quarters: rows.filter((r) => r.phase === "quartas").map(mapBox),
      semis: rows.filter((r) => r.phase === "semis").map(mapBox),
      final: rows.filter((r) => r.phase === "final").map(mapBox)[0] ?? null,
    };

    return json(bracket);
  } catch (e) {
    return serverError("GET bracket", e);
  }
};
