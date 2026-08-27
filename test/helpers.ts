import type { PagesContext, Env } from "../functions/api/_shared";
import type { TestDriver } from "./drivers/types";
import { createSqliteDriver } from "./drivers/sqlite";

// -----------------------------------------------------------------------------
// Seleção de driver. Os arquivos de teste NÃO conhecem o backend concreto;
// falam apenas com resetDb()/makeCtx()/getEnv() daqui.
//
// Hoje: SQLite em memória (better-sqlite3), rodando em Node.
// Futuro: quando @cloudflare/vitest-pool-workers voltar a ser compatível com
// o Vitest 4 (publicando o export ./config), basta criar um driver
// "workerd" que retorne o binding real de `cloudflare:test` e trocar aqui —
// os testes não mudam.
// -----------------------------------------------------------------------------
const DRIVER = process.env.TEST_DRIVER ?? "sqlite";

function selectDriver(): TestDriver {
  switch (DRIVER) {
    case "sqlite":
      return createSqliteDriver();
    // case "workerd":
    //   return createWorkerdDriver(); // a implementar quando o pool suportar Vitest 4
    default:
      throw new Error(`TEST_DRIVER desconhecido: ${DRIVER}`);
  }
}

const driver = selectDriver();

const ADMIN_TOKEN = "test-token";

/** Recria o schema e reaplica o seed num banco limpo. */
export async function resetDb(): Promise<void> {
  await driver.reset();
}

/** Env de teste (DB + ADMIN_TOKEN) apontando para o banco atual. */
export function getEnv(): Env {
  return {
    DB: driver.getDb() as unknown as Env["DB"],
    ADMIN_TOKEN,
  };
}

type Params = Record<string, string>;

/** Monta um EventContext mínimo compatível com as Pages Functions. */
export function makeCtx(request: Request, params: Params = {}): PagesContext {
  return {
    request,
    env: getEnv(),
    params,
    functionPath: new URL(request.url).pathname,
    waitUntil: () => {},
    passThroughOnException: () => {},
    next: async () => new Response(null),
    data: {},
  } as unknown as PagesContext;
}

export { getEnv as env };

// -----------------------------------------------------------------------------
// Helper de cenário: finaliza um jogo registrando gols/cartões via EVENTOS por
// jogador (o placar e os cartões do jogo são derivados dos eventos). Depois
// marca o status via PUT /api/matches/:id. Faltas continuam manuais (PUT).
// -----------------------------------------------------------------------------
import { onRequestPut as putEvents } from "../functions/api/matches/[id]/events";
import { onRequestPut as putMatchStatus } from "../functions/api/matches/[id]";

const AUTH = { authorization: `Bearer ${ADMIN_TOKEN}`, "content-type": "application/json" };

/** Ids dos jogadores de um time (via SQL direto). */
async function playersOf(teamId: string): Promise<number[]> {
  const { results } = await getEnv().DB.prepare(
    "SELECT id FROM players WHERE team_id = ? ORDER BY id;",
  ).bind(teamId).all();
  return (results as { id: number }[]).map((r) => r.id);
}

type FinishOpts = {
  homeYellow?: number; awayYellow?: number;
  homeRed?: number; awayRed?: number;
  homeFouls?: number; awayFouls?: number;
  status?: "agendado" | "andamento" | "finalizado";
};

/**
 * Finaliza (ou agenda) um jogo entre `home` e `away` com o placar dado,
 * registrando os gols/cartões como eventos dos jogadores desses times.
 * Requer que ambos os times tenham elenco suficiente no seed.
 */
export async function finishMatchByEvents(
  matchId: number,
  home: string,
  homeGoals: number,
  away: string,
  awayGoals: number,
  opts: FinishOpts = {},
): Promise<void> {
  const hp = await playersOf(home);
  const ap = await playersOf(away);
  const events: { playerId: number; type: string }[] = [];
  const pick = (arr: number[], i: number) => arr[i % arr.length];
  // Só gera eventos para lados que têm elenco cadastrado (evita NaN).
  const hHas = hp.length > 0;
  const aHas = ap.length > 0;

  for (let i = 0; hHas && i < homeGoals; i++) events.push({ playerId: pick(hp, i), type: "gol" });
  for (let i = 0; aHas && i < awayGoals; i++) events.push({ playerId: pick(ap, i), type: "gol" });
  for (let i = 0; hHas && i < (opts.homeYellow ?? 0); i++) events.push({ playerId: pick(hp, i), type: "amarelo" });
  for (let i = 0; aHas && i < (opts.awayYellow ?? 0); i++) events.push({ playerId: pick(ap, i), type: "amarelo" });
  for (let i = 0; hHas && i < (opts.homeRed ?? 0); i++) events.push({ playerId: pick(hp, i), type: "vermelho" });
  for (let i = 0; aHas && i < (opts.awayRed ?? 0); i++) events.push({ playerId: pick(ap, i), type: "vermelho" });

  const idStr = String(matchId);
  await putEvents(
    makeCtx(
      new Request(`https://test.local/api/matches/${idStr}/events`, {
        method: "PUT",
        headers: AUTH,
        body: JSON.stringify({ events }),
      }),
      { id: idStr },
    ),
  );

  // Status + faltas (não derivados de eventos).
  const body: Record<string, unknown> = { status: opts.status ?? "finalizado" };
  if (opts.homeFouls != null) body.homeFouls = opts.homeFouls;
  if (opts.awayFouls != null) body.awayFouls = opts.awayFouls;
  await putMatchStatus(
    makeCtx(
      new Request(`https://test.local/api/matches/${idStr}`, {
        method: "PUT",
        headers: AUTH,
        body: JSON.stringify(body),
      }),
      { id: idStr },
    ),
  );
}
