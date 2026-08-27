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
