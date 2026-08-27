import { defineConfig } from "vitest/config";

// Testes rodam em Node contra um SQLite real (better-sqlite3) através de um
// adaptador que implementa a superfície D1 usada pelas Functions
// (prepare().bind().all()/first()/run()). Isso exercita o SQL real do schema,
// seed e queries. Ver test/helpers.ts.
//
// Observação: o @cloudflare/vitest-pool-workers (que rodaria dentro do workerd
// com um D1 nativo) está quebrado para Vitest 4 nesta data — não publica o
// export "./config" nem o wiring de pool compatível com o Vitest 4. Por isso
// usamos o adaptador SQLite, que valida a mesma lógica de SQL.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts", "src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
