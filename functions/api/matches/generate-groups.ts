import { jsonMutation, error, serverError, requireAuth, type PagesContext } from "../_shared";
import { generateRoundRobin } from "../lib/roundRobin";

type Body = {
  // Rótulos opcionais por rodada (data/hora/local). Se ausentes, usa defaults.
  location?: string;
  startDate?: string; // rótulo de data-base (texto livre, ex.: "A definir")
};

/**
 * POST /api/matches/generate-groups (PROTEGIDO)
 *
 * Gera a tabela da fase de grupos (todos-contra-todos, turno único) a partir
 * dos times cadastrados, usando o número de times atual.
 *
 * SEGURANÇA: recusa (409) se JÁ existir qualquer jogo de grupos COM placar
 * lançado ou finalizado — para não apagar resultados. Se só houver jogos de
 * grupos agendados e sem placar, eles são SUBSTITUÍDOS pela nova tabela.
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
    const dateLabel =
      typeof body.startDate === "string" && body.startDate.trim() !== ""
        ? body.startDate.trim()
        : "A definir";

    // 1) Há resultado lançado em jogos de grupos? Se sim, recusa.
    const played = (await ctx.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM matches
        WHERE phase = 'grupos'
          AND (status = 'finalizado' OR home_score IS NOT NULL OR away_score IS NOT NULL);`,
    ).first()) as { n: number } | null;

    if ((played?.n ?? 0) > 0) {
      return error(
        "Já existem jogos de grupos com placar lançado. Apague/zere os resultados antes de gerar a tabela novamente.",
        409,
      );
    }

    // 2) Times cadastrados (ordenados pela ordem de exibição).
    const teamsRes = await ctx.env.DB.prepare(
      "SELECT id FROM teams ORDER BY sort_order ASC, id ASC;",
    ).all();
    const teamIds = (teamsRes.results as { id: string }[]).map((t) => t.id);

    if (teamIds.length < 2) {
      return error("São necessários ao menos 2 times cadastrados.", 400);
    }

    const pairings = generateRoundRobin(teamIds);

    // Preserva a agenda (data/hora/local) dos jogos de grupos atuais, casando
    // pelo PAR de times (independe de mando). Chave = par ordenado "A|B".
    const existing = await ctx.env.DB.prepare(
      `SELECT home_team_id AS h, away_team_id AS a, match_date AS d, match_time AS t, location AS loc
         FROM matches WHERE phase = 'grupos';`,
    ).all();
    const pairKey = (x: string, y: string) => [x, y].sort().join("|");
    const agenda = new Map<string, { d: string; t: string; loc: string }>();
    for (const r of existing.results as { h: string | null; a: string | null; d: string; t: string; loc: string }[]) {
      if (r.h && r.a) agenda.set(pairKey(r.h, r.a), { d: r.d, t: r.t, loc: r.loc });
    }

    // 3) Substitui os jogos de grupos (só agendados/sem placar chegam aqui) e
    //    insere a nova tabela — tudo numa transação atômica, reaproveitando a
    //    agenda anterior quando o par já existia.
    const stmts = [
      ctx.env.DB.prepare("DELETE FROM matches WHERE phase = 'grupos';"),
      ...pairings.map((p) => {
        const kept = agenda.get(pairKey(p.home, p.away));
        return ctx.env.DB.prepare(
          `INSERT INTO matches
             (phase, round, match_date, match_time, location, home_team_id, away_team_id, status)
           VALUES ('grupos', ?, ?, ?, ?, ?, ?, 'agendado');`,
        ).bind(p.round, kept?.d ?? dateLabel, kept?.t ?? "", kept?.loc ?? location, p.home, p.away);
      }),
    ];
    await ctx.env.DB.batch(stmts);

    const rounds = pairings.reduce((max, p) => Math.max(max, p.round), 0);
    return jsonMutation({ ok: true, created: pairings.length, rounds, teams: teamIds.length });
  } catch (e) {
    return serverError("POST matches/generate-groups", e);
  }
};
