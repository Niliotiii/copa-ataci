import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, makeCtx } from "./helpers";
import { onRequestGet as getTournament, onRequestPut as putTournament } from "../functions/api/tournament";

beforeEach(async () => {
  await resetDb();
});
function req(url: string, init?: RequestInit) {
  return new Request(`https://test.local${url}`, init);
}
const auth = { authorization: "Bearer test-token", "content-type": "application/json" };

describe("Torneio (metadados)", () => {
  it("GET retorna os metadados do seed", async () => {
    const t = (await (await getTournament(makeCtx(req("/api/tournament")))).json()) as any;
    expect(t.name).toBe("Copa Ataci");
    expect(t.edition).toBe("5ª Edição");
    expect(t.season).toBe("2026");
  });

  it("401 sem token no PUT", async () => {
    const res = await putTournament(makeCtx(req("/api/tournament", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "X" }) })));
    expect(res.status).toBe(401);
  });

  it("400 name vazio", async () => {
    const res = await putTournament(makeCtx(req("/api/tournament", { method: "PUT", headers: auth, body: JSON.stringify({ name: "  " }) })));
    expect(res.status).toBe(400);
  });

  it("PUT atualiza e persiste (upsert linha única)", async () => {
    const res = await putTournament(makeCtx(req("/api/tournament", { method: "PUT", headers: auth, body: JSON.stringify({ name: "Copa Nova", edition: "1ª Edição", season: "2027" }) })));
    expect(res.status).toBe(200);
    const t = (await (await getTournament(makeCtx(req("/api/tournament")))).json()) as any;
    expect(t.name).toBe("Copa Nova");
    expect(t.edition).toBe("1ª Edição");
    expect(t.season).toBe("2027");
  });
});
