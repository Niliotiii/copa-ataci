import { jsonMutation, error, serverError, requireAuth, type PagesContext } from "../_shared";
import { computeStandings } from "../standings";

type Body = { location?: string };

/**
 * POST /api/matches/generate-bracket (PROTEGIDO)
 *
 * Gera o mata-mata a partir da classificação calculada dos grupos.
 * Formato: 4 classificados → semifinais → final.
 *   SF1: 1º (mando) × 4º
 *   SF2: 2º (mando) × 3º
 *   F:   Vencedor SF1 × Vencedor SF2 (placeholders; preenchidos pelo avanço
 *        automático ao finalizar as semis)
 *
 * SEGURANÇA: recusa (409) se JÁ houver jogo de mata-mata com placar lançado
 * ou finalizado. Também exige (400) que os 4 primeiros tenham ao menos um jogo
 * disputado (evita gerar bracket com a tabela zerada).
 */
export const onRequestPost = async (ctx: PagesContext): Promise<Response> => {
  const unauthorized = await requireAuth(ctx);
  if (unauthorized) return unauthorized;

  try {
    let body: Body = {};
    try {
      const raw = await ctx.request.text();
      body = raw ? (JSON.parse(raw) as Body) : {};
    } catch {
      return error("Corpo JSON inválido.", 400);
    }
    const location =
      typeof body.location === "string" && body.location.trim() !== ""
        ? body.location.trim()
        : "A definir";

    // 1) Não sobrescreve mata-mata com resultado lançado.
    const played = (await ctx.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM matches
        WHERE phase IN ('quartas','semis','final')
          AND (status = 'finalizado' OR home_score IS NOT NULL OR away_score IS NOT NULL);`,
    ).first()) as { n: number } | null;

    if ((played?.n ?? 0) > 0) {
      return error(
        "Já existem jogos de mata-mata com placar lançado. Zere os resultados antes de gerar o chaveamento novamente.",
        409,
      );
    }

    // 2) Classificação ordenada (com desempates).
    const standings = await computeStandings(ctx.env.DB);
    // Só entram times que disputaram ao menos 1 jogo.
    const qualified = standings.filter((r) => r.j > 0).slice(0, 4);

    if (qualified.length < 4) {
      return error(
        "É preciso ter ao menos 4 times com jogos disputados na fase de grupos para gerar o mata-mata.",
        400,
      );
    }

    const [first, second, third, fourth] = qualified;

    // 3) Substitui todo o mata-mata (sem resultados) e insere semis + final.
    const stmts = [
      ctx.env.DB.prepare("DELETE FROM matches WHERE phase IN ('quartas','semis','final');"),
      // SF1: 1º (casa) × 4º
      ctx.env.DB.prepare(
        `INSERT INTO matches (phase, bracket_slot, match_date, match_time, location, home_team_id, away_team_id, status)
         VALUES ('semis', 'SF1', 'A definir', '', ?, ?, ?, 'agendado');`,
      ).bind(location, first.abbr, fourth.abbr),
      // SF2: 2º (casa) × 3º
      ctx.env.DB.prepare(
        `INSERT INTO matches (phase, bracket_slot, match_date, match_time, location, home_team_id, away_team_id, status)
         VALUES ('semis', 'SF2', 'A definir', '', ?, ?, ?, 'agendado');`,
      ).bind(location, second.abbr, third.abbr),
      // Final: placeholders (preenchidos pelo avanço ao finalizar as semis).
      ctx.env.DB.prepare(
        `INSERT INTO matches (phase, bracket_slot, match_date, match_time, location, home_placeholder, away_placeholder, status)
         VALUES ('final', 'F', 'A definir', '', ?, 'Vencedor SF1', 'Vencedor SF2', 'agendado');`,
      ).bind(location),
    ];
    await ctx.env.DB.batch(stmts);

    return jsonMutation({
      ok: true,
      semis: [
        { slot: "SF1", home: first.abbr, away: fourth.abbr },
        { slot: "SF2", home: second.abbr, away: third.abbr },
      ],
    });
  } catch (e) {
    return serverError("POST matches/generate-bracket", e);
  }
};
