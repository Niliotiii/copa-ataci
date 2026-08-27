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
