import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, makeCtx, getEnv } from "./helpers";
import { onRequestPost as generateBracket } from "../functions/api/matches/generate-bracket";
import { onRequestGet as getStandings } from "../functions/api/standings";

function req(url: string, init?: RequestInit) {
  return new Request(`https://test.local${url}`, init);
}
const auth = { authorization: "Bearer test-token", "content-type": "application/json" };

async function topFour(): Promise<string[]> {
  const res = await getStandings(makeCtx(req("/api/standings")));
  const rows = (await res.json()) as { abbr: string; j: number }[];
  return rows.filter((r) => r.j > 0).slice(0, 4).map((r) => r.abbr);
}

describe("POST /api/matches/generate-bracket", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("401 sem token", async () => {
    const res = await generateBracket(makeCtx(req("/api/matches/generate-bracket", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })));
    expect(res.status).toBe(401);
  });

  it("409 quando já há mata-mata com placar (seed tem quartas finalizadas)", async () => {
    const res = await generateBracket(makeCtx(req("/api/matches/generate-bracket", { method: "POST", headers: auth, body: "{}" })));
    expect(res.status).toBe(409);
  });

  it("gera semis 1º×4º e 2º×3º com mando do melhor colocado", async () => {
    const db = getEnv().DB;
    // Zera o mata-mata do seed (mantém os grupos finalizados da Rodada 1).
    await db.prepare("DELETE FROM matches WHERE phase IN ('quartas','semis','final');").run();

    const ranking = await topFour(); // ordem oficial da classificação
    const res = await generateBracket(makeCtx(req("/api/matches/generate-bracket", { method: "POST", headers: auth, body: JSON.stringify({ location: "Arena Ataci" }) })));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; semis: { slot: string; home: string; away: string }[] };
    expect(json.ok).toBe(true);

    const sf1 = json.semis.find((s) => s.slot === "SF1")!;
    const sf2 = json.semis.find((s) => s.slot === "SF2")!;
    expect(sf1.home).toBe(ranking[0]); // 1º manda
    expect(sf1.away).toBe(ranking[3]); // × 4º
    expect(sf2.home).toBe(ranking[1]); // 2º manda
    expect(sf2.away).toBe(ranking[2]); // × 3º

    // Persistiu: 2 semis + 1 final, sem placar; final com placeholders.
    const { results } = await db.prepare("SELECT bracket_slot AS slot, phase, home_team_id AS h, away_team_id AS a, home_placeholder AS hp, away_placeholder AS ap, status, home_score AS hs FROM matches WHERE phase IN ('semis','final') ORDER BY bracket_slot;").all();
    expect(results.length).toBe(3);
    const final = results.find((r: any) => r.slot === "F") as any;
    expect(final.hp).toBe("Vencedor SF1");
    expect(final.ap).toBe("Vencedor SF2");
    expect(results.every((r: any) => r.status === "agendado" && r.hs === null)).toBe(true);
  });

  it("400 quando não há 4 times com jogos disputados", async () => {
    const db = getEnv().DB;
    await db.prepare("DELETE FROM matches WHERE phase IN ('quartas','semis','final');").run();
    // Zera todos os grupos (ninguém tem jogo disputado).
    await db.prepare("UPDATE matches SET home_score=NULL, away_score=NULL, status='agendado' WHERE phase='grupos';").run();
    const res = await generateBracket(makeCtx(req("/api/matches/generate-bracket", { method: "POST", headers: auth, body: "{}" })));
    expect(res.status).toBe(400);
  });

  it("regenerar não duplica (substitui o mata-mata)", async () => {
    const db = getEnv().DB;
    await db.prepare("DELETE FROM matches WHERE phase IN ('quartas','semis','final');").run();
    await generateBracket(makeCtx(req("/api/matches/generate-bracket", { method: "POST", headers: auth, body: "{}" })));
    await generateBracket(makeCtx(req("/api/matches/generate-bracket", { method: "POST", headers: auth, body: "{}" })));
    const { results } = await db.prepare("SELECT id FROM matches WHERE phase IN ('quartas','semis','final');").all();
    expect(results.length).toBe(3); // 2 semis + 1 final, não 6
  });
});
