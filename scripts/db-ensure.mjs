#!/usr/bin/env node
/**
 * Garante que o D1 LOCAL tenha as tabelas antes de subir o backend.
 *
 * Idempotente e não-destrutivo: só roda `db:reset` quando a tabela `teams`
 * NÃO existe (banco vazio, ex.: após limpar `.wrangler/state`). Se o banco já
 * está populado, não faz nada — seus dados locais são preservados.
 */
import { execSync } from "node:child_process";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

let hasTeams = false;
try {
  const out = run(
    'npx wrangler d1 execute copa-ataci --local ' +
      "--command \"SELECT name FROM sqlite_master WHERE type='table' AND name='teams';\"",
  );
  hasTeams = out.includes('"teams"');
} catch {
  // Banco/estado ainda não existe → precisará de reset.
  hasTeams = false;
}

if (hasTeams) {
  console.log("[db:ensure] D1 local já tem as tabelas — nada a fazer.");
} else {
  console.log("[db:ensure] D1 local vazio — aplicando schema + seed…");
  execSync("npm run db:reset", { stdio: "inherit" });
}
