import { env } from "cloudflare:test";
// Importa os MESMOS arquivos SQL do projeto como texto (Vite ?raw).
import schemaSql from "../db/schema.sql?raw";
import seedSql from "../db/seed.sql?raw";

/** Recria schema + seed no D1 real do workerd. */
export async function resetDb(): Promise<void> {
  // D1 exec() executa múltiplos statements separados por ';'.
  await env.DB.exec(prepareForExec(schemaSql));
  await env.DB.exec(prepareForExec(seedSql));
}

// D1 exec() espera um statement por linha e não aceita comentários/linhas em
// branco no meio. Normaliza: remove comentários "--", junta cada statement
// (que pode ocupar várias linhas no arquivo) numa única linha.
function prepareForExec(sql: string): string {
  const noComments = sql
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("--");
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("\n");
  return noComments
    .split(";")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 0)
    .map((s) => s + ";")
    .join("\n");
}

type Params = Record<string, string>;

/** EventContext mínimo com o binding D1 real e o ADMIN_TOKEN de teste. */
export function makeCtx(request: Request, params: Params = {}): any {
  return {
    request,
    env,
    params,
    functionPath: new URL(request.url).pathname,
    waitUntil: () => {},
    passThroughOnException: () => {},
    next: async () => new Response(null),
    data: {},
  };
}

import { onRequestPut as putEvents } from "../functions/api/matches/[id]/events";
import { onRequestPut as putMatchStatus } from "../functions/api/matches/[id]";

const AUTH = { authorization: "Bearer test-token", "content-type": "application/json" };

/** Finaliza um jogo registrando gols/cartões como eventos (placar derivado). */
export async function finishMatchByEvents(
  matchId: number,
  home: string,
  homeGoals: number,
  away: string,
  awayGoals: number,
  opts: { status?: string; homeFouls?: number; awayFouls?: number } = {},
): Promise<void> {
  const players = async (teamId: string): Promise<number[]> => {
    const { results } = await env.DB.prepare("SELECT id FROM players WHERE team_id=? ORDER BY id;").bind(teamId).all();
    return (results as { id: number }[]).map((r) => r.id);
  };
  const hp = await players(home);
  const ap = await players(away);
  const events: { playerId: number; type: string }[] = [];
  for (let i = 0; hp.length && i < homeGoals; i++) events.push({ playerId: hp[i % hp.length], type: "gol" });
  for (let i = 0; ap.length && i < awayGoals; i++) events.push({ playerId: ap[i % ap.length], type: "gol" });

  const idStr = String(matchId);
  await putEvents(
    makeCtx(new Request(`https://test.local/api/matches/${idStr}/events`, { method: "PUT", headers: AUTH, body: JSON.stringify({ events }) }), { id: idStr }),
  );
  const body: Record<string, unknown> = { status: opts.status ?? "finalizado" };
  if (opts.homeFouls != null) body.homeFouls = opts.homeFouls;
  if (opts.awayFouls != null) body.awayFouls = opts.awayFouls;
  await putMatchStatus(
    makeCtx(new Request(`https://test.local/api/matches/${idStr}`, { method: "PUT", headers: AUTH, body: JSON.stringify(body) }), { id: idStr }),
  );
}
