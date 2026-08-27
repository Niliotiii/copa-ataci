import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, makeCtx, getEnv } from "./helpers";
import { onRequestPost as postMatch } from "../functions/api/matches";
import { onRequestDelete as deleteMatch } from "../functions/api/matches/[id]";
import { onRequestPost as postTeam } from "../functions/api/teams";
import { onRequestDelete as deleteTeam, onRequestGet as getTeam } from "../functions/api/teams/[id]";

beforeEach(async () => {
  await resetDb();
});
function req(url: string, init?: RequestInit) {
  return new Request(`https://test.local${url}`, init);
}
const auth = { authorization: "Bearer test-token", "content-type": "application/json" };

describe("CRUD de jogos", () => {
  it("401 sem token no POST", async () => {
    const res = await postMatch(makeCtx(req("/api/matches", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phase: "grupos" }) })));
    expect(res.status).toBe(401);
  });

  it("cria um jogo avulso de grupos", async () => {
    const res = await postMatch(makeCtx(req("/api/matches", { method: "POST", headers: auth, body: JSON.stringify({ phase: "grupos", round: 9, date: "Sáb", time: "10:00", location: "Arena", homeTeamId: "ATA", awayTeamId: "LEO" }) })));
    expect(res.status).toBe(200);
    const j = (await res.json()) as any;
    expect(j.ok).toBe(true);
    expect(typeof j.id).toBe("number");
    const row = await getEnv().DB.prepare("SELECT phase, round, home_team_id AS h, away_team_id AS a, status FROM matches WHERE id=?;").bind(j.id).first() as any;
    expect(row.phase).toBe("grupos");
    expect(row.round).toBe(9);
    expect(row.h).toBe("ATA");
    expect(row.status).toBe("agendado");
  });

  it("rejeita phase inválida e time inexistente", async () => {
    expect((await postMatch(makeCtx(req("/api/matches", { method: "POST", headers: auth, body: JSON.stringify({ phase: "x" }) })))).status).toBe(400);
    expect((await postMatch(makeCtx(req("/api/matches", { method: "POST", headers: auth, body: JSON.stringify({ phase: "grupos", homeTeamId: "ZZZ" }) })))).status).toBe(400);
  });

  it("exclui um jogo e seus eventos (cascade)", async () => {
    const created = (await (await postMatch(makeCtx(req("/api/matches", { method: "POST", headers: auth, body: JSON.stringify({ phase: "grupos", homeTeamId: "ATA", awayTeamId: "LEO" }) })))).json()) as any;
    const res = await deleteMatch(makeCtx(req(`/api/matches/${created.id}`, { method: "DELETE", headers: auth }), { id: String(created.id) }));
    expect(res.status).toBe(200);
    const row = await getEnv().DB.prepare("SELECT id FROM matches WHERE id=?;").bind(created.id).first();
    expect(row).toBeNull();
  });

  it("404 ao excluir jogo inexistente", async () => {
    const res = await deleteMatch(makeCtx(req("/api/matches/9999", { method: "DELETE", headers: auth }), { id: "9999" }));
    expect(res.status).toBe(404);
  });
});

describe("CRUD de times", () => {
  it("cria um time novo", async () => {
    const res = await postTeam(makeCtx(req("/api/teams", { method: "POST", headers: auth, body: JSON.stringify({ name: "Novo Clube", abbr: "nvc", color: "#123456" }) })));
    expect(res.status).toBe(200);
    const j = (await res.json()) as any;
    expect(j.id).toBe("NVC"); // normaliza p/ maiúsculas
    const check = await getTeam(makeCtx(req("/api/teams/NVC"), { id: "NVC" }));
    const t = (await check.json()) as any;
    expect(t.name).toBe("Novo Clube");
  });

  it("409 ao criar sigla já existente", async () => {
    const res = await postTeam(makeCtx(req("/api/teams", { method: "POST", headers: auth, body: JSON.stringify({ name: "X", abbr: "ATA", color: "#123456" }) })));
    expect(res.status).toBe(409);
  });

  it("recusa excluir time que está em jogos (409)", async () => {
    // ATA participa de jogos no seed.
    const res = await deleteTeam(makeCtx(req("/api/teams/ATA", { method: "DELETE", headers: auth }), { id: "ATA" }));
    expect(res.status).toBe(409);
  });

  it("exclui um time sem jogos", async () => {
    await postTeam(makeCtx(req("/api/teams", { method: "POST", headers: auth, body: JSON.stringify({ name: "Sem Jogo", abbr: "SJG", color: "#123456" }) })));
    const res = await deleteTeam(makeCtx(req("/api/teams/SJG", { method: "DELETE", headers: auth }), { id: "SJG" }));
    expect(res.status).toBe(200);
    const check = await getTeam(makeCtx(req("/api/teams/SJG"), { id: "SJG" }));
    expect(check.status).toBe(404);
  });
});
