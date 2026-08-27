import { execSync } from "node:child_process";

// Reseta o D1 local (schema + seed) UMA vez antes de subir o webServer,
// evitando corrida entre `db:reset` e `wrangler pages dev` no comando do
// webServer. Roda de forma síncrona e sequencial.
export default async function globalSetup() {
  execSync("npm run db:reset", { stdio: "inherit" });
}
