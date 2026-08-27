import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

// Testes rodando dentro do runtime real (workerd) com um D1 nativo.
// Isolado do app (que usa Vite 8 / Vitest 4) porque o pool-workers com
// export ./config só existe na linha que pareia com Vitest 3 (Vite 5/6).
export default defineWorkersConfig({
  // Permite importar arquivos do projeto pai (db/*.sql, functions/*) que ficam
  // fora do diretório test-workerd.
  server: {
    fs: { allow: [".."] },
  },
  test: {
    include: ["**/*.test.ts"],
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          bindings: { ADMIN_TOKEN: "test-token" },
        },
      },
    },
  },
});
