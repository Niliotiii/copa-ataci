import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, makeCtx } from "./helpers";

// Importa os handlers REAIS das Pages Functions do projeto.
import { onRequestGet as getStandings } from "../functions/api/standings";
import { onRequestGet as getTeam } from "../functions/api/teams/[id]";
import { onRequestPut as putMatch } from "../functions/api/matches/[id]";

beforeEach(async () => {
  await resetDb();
});

function req(url: string, init?: RequestInit) {
  return new Request(`https://test.local${url}`, init);
}

const auth = { authorization: "Bearer test-token", "content-type": "application/json" };

describe("Functions no runtime real (workerd + D1 nativo)", () => {
  it("standings calcula e ordena a partir dos jogos", async () => {
    const res = await getStandings(makeCtx(req("/api/standings")));
    expect(res.status).toBe(200);
    const rows = (await res.json()) as any[];
    expect(rows).toHaveLength(8);
    expect(rows[0].abbr).toBe("ATA");
    expect(rows[0].pts).toBe(3);
  });

  it("teams/:id retorna elenco com posX/posY", async () => {
    const res = await getTeam(makeCtx(req("/api/teams/ATA"), { id: "ATA" }));
    const team = (await res.json()) as any;
    expect(team.players.length).toBe(12);
    const gol = team.players.find((p: any) => p.position === "GOL");
    expect(gol.posX).toBe(50);
    expect(gol.posY).toBe(88);
  });

  it("PUT matches sem token → 401", async () => {
    const res = await putMatch(
      makeCtx(
        req("/api/matches/5", { method: "PUT", headers: { "content-type": "application/json" }, body: "{}" }),
        { id: "5" },
      ),
    );
    expect(res.status).toBe(401);
  });

  it("PUT matches com token finaliza e recalcula standings", async () => {
    const put = await putMatch(
      makeCtx(
        req("/api/matches/5", {
          method: "PUT",
          headers: auth,
          body: JSON.stringify({ homeScore: 4, awayScore: 1, status: "finalizado" }),
        }),
        { id: "5" },
      ),
    );
    expect(put.status).toBe(200);

    const res = await getStandings(makeCtx(req("/api/standings")));
    const rows = (await res.json()) as any[];
    const ata = rows.find((r) => r.abbr === "ATA");
    expect(ata.j).toBe(2);
    expect(ata.pts).toBe(6);
  });
});
