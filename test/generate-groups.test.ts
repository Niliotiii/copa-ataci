import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, makeCtx, getEnv } from "./helpers";
import { generateRoundRobin } from "../functions/api/lib/roundRobin";
import { onRequestPost as generateGroups } from "../functions/api/matches/generate-groups";

function req(url: string, init?: RequestInit) {
  return new Request(`https://test.local${url}`, init);
}
const auth = { authorization: "Bearer test-token", "content-type": "application/json" };

describe("generateRoundRobin (lógica pura)", () => {
  it("N par: N-1 rodadas, cada time joga uma vez por rodada", () => {
    const teams = ["A", "B", "C", "D", "E", "F", "G", "H"]; // 8 times
    const p = generateRoundRobin(teams);
    const rounds = Math.max(...p.map((x) => x.round));
    expect(rounds).toBe(7); // 8-1
    expect(p.length).toBe((8 * 7) / 2); // 28 confrontos
    // Em cada rodada, 4 jogos e nenhum time repetido.
    for (let r = 1; r <= rounds; r++) {
      const games = p.filter((x) => x.round === r);
      expect(games.length).toBe(4);
      const seen = new Set<string>();
      for (const g of games) {
        expect(seen.has(g.home)).toBe(false);
        expect(seen.has(g.away)).toBe(false);
        seen.add(g.home);
        seen.add(g.away);
      }
    }
  });

  it("cada par de times se enfrenta exatamente uma vez", () => {
    const teams = ["A", "B", "C", "D", "E"];
    const p = generateRoundRobin(teams);
    const pairs = new Set(p.map((x) => [x.home, x.away].sort().join("-")));
    expect(pairs.size).toBe(p.length); // sem repetição
    expect(p.length).toBe((5 * 4) / 2); // 10 confrontos
  });

  it("N ímpar: N rodadas, um time folga por rodada", () => {
    const teams = ["A", "B", "C", "D", "E"]; // 5 times
    const p = generateRoundRobin(teams);
    expect(Math.max(...p.map((x) => x.round))).toBe(5);
    // 2 jogos por rodada (um time folga)
    for (let r = 1; r <= 5; r++) {
      expect(p.filter((x) => x.round === r).length).toBe(2);
    }
    // Nenhum confronto contém o BYE.
    expect(p.every((x) => x.home !== "__BYE__" && x.away !== "__BYE__")).toBe(true);
  });

  it("menos de 2 times: vazio", () => {
    expect(generateRoundRobin(["A"])).toEqual([]);
    expect(generateRoundRobin([])).toEqual([]);
  });
});

describe("POST /api/matches/generate-groups (endpoint)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("401 sem token", async () => {
    const res = await generateGroups(makeCtx(req("/api/matches/generate-groups", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })));
    expect(res.status).toBe(401);
  });

  it("409 quando já há jogos de grupos com placar (não apaga resultados)", async () => {
    // O seed tem a Rodada 1 finalizada com placar.
    const res = await generateGroups(makeCtx(req("/api/matches/generate-groups", { method: "POST", headers: auth, body: "{}" })));
    expect(res.status).toBe(409);
  });

  it("gera a tabela quando não há placares lançados", async () => {
    const db = getEnv().DB;
    // Zera os placares/status dos jogos de grupos existentes.
    await db.prepare("UPDATE matches SET home_score = NULL, away_score = NULL, status = 'agendado' WHERE phase = 'grupos';").run();

    const res = await generateGroups(makeCtx(req("/api/matches/generate-groups", { method: "POST", headers: auth, body: JSON.stringify({ location: "Arena Ataci" }) })));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; created: number; rounds: number; teams: number };
    expect(json.ok).toBe(true);
    expect(json.teams).toBe(8); // seed tem 8 times
    expect(json.rounds).toBe(7);
    expect(json.created).toBe(28);

    // Persistiu: 28 jogos de grupos, todos agendados e sem placar.
    const { results } = await db.prepare("SELECT round, home_team_id AS h, away_team_id AS a, status, home_score AS hs FROM matches WHERE phase = 'grupos' ORDER BY round;").all();
    expect(results.length).toBe(28);
    expect(results.every((r: any) => r.status === "agendado" && r.hs === null)).toBe(true);
    // Cada par único uma vez.
    const pairs = new Set(results.map((r: any) => [r.h, r.a].sort().join("-")));
    expect(pairs.size).toBe(28);
  });

  it("substitui a tabela anterior (não duplica) ao gerar de novo", async () => {
    const db = getEnv().DB;
    await db.prepare("UPDATE matches SET home_score = NULL, away_score = NULL, status = 'agendado' WHERE phase = 'grupos';").run();
    await generateGroups(makeCtx(req("/api/matches/generate-groups", { method: "POST", headers: auth, body: "{}" })));
    await generateGroups(makeCtx(req("/api/matches/generate-groups", { method: "POST", headers: auth, body: "{}" })));
    const { results } = await db.prepare("SELECT id FROM matches WHERE phase = 'grupos';").all();
    expect(results.length).toBe(28); // não acumulou (28, não 56)
  });

  it("preserva data/hora/local do par de times ao regenerar", async () => {
    const db = getEnv().DB;
    await db.prepare("UPDATE matches SET home_score = NULL, away_score = NULL, status = 'agendado' WHERE phase = 'grupos';").run();
    await generateGroups(makeCtx(req("/api/matches/generate-groups", { method: "POST", headers: auth, body: "{}" })));
    // Define uma agenda específica no par ATA/LEO.
    await db.prepare("UPDATE matches SET match_date='Sáb 30', match_time='20:00', location='Ginásio X' WHERE phase='grupos' AND ((home_team_id='ATA' AND away_team_id='LEO') OR (home_team_id='LEO' AND away_team_id='ATA'));").run();
    // Regenera: a agenda do par ATA/LEO deve ser preservada.
    await generateGroups(makeCtx(req("/api/matches/generate-groups", { method: "POST", headers: auth, body: "{}" })));
    const row = await db.prepare("SELECT match_date AS d, match_time AS t, location AS loc FROM matches WHERE phase='grupos' AND ((home_team_id='ATA' AND away_team_id='LEO') OR (home_team_id='LEO' AND away_team_id='ATA'));").first() as any;
    expect(row.d).toBe("Sáb 30");
    expect(row.t).toBe("20:00");
    expect(row.loc).toBe("Ginásio X");
  });
});
