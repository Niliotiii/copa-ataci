import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, makeCtx } from "./helpers";

import {
  onRequestGet as getTeam,
  onRequestPut as putTeam,
} from "../functions/api/teams/[id]";
import {
  onRequestGet as getPlayers,
  onRequestPut as putPlayers,
} from "../functions/api/teams/[id]/players";

beforeEach(async () => {
  await resetDb();
});

function req(url: string, init?: RequestInit) {
  return new Request(`https://test.local${url}`, init);
}

const authHeaders = {
  authorization: "Bearer test-token",
  "content-type": "application/json",
};

describe("PUT /api/teams/:id (dados do time)", () => {
  it("401 sem token", async () => {
    const res = await putTeam(
      makeCtx(
        req("/api/teams/ATA", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Novo Nome" }),
        }),
        { id: "ATA" },
      ),
    );
    expect(res.status).toBe(401);
  });

  it("400 para color inválido", async () => {
    const res = await putTeam(
      makeCtx(
        req("/api/teams/ATA", { method: "PUT", headers: authHeaders, body: JSON.stringify({ color: "vermelho" }) }),
        { id: "ATA" },
      ),
    );
    expect(res.status).toBe(400);
  });

  it("400 para abbr inválido", async () => {
    const res = await putTeam(
      makeCtx(
        req("/api/teams/ATA", { method: "PUT", headers: authHeaders, body: JSON.stringify({ abbr: "TOOLONG" }) }),
        { id: "ATA" },
      ),
    );
    expect(res.status).toBe(400);
  });

  it("404 para time inexistente", async () => {
    const res = await putTeam(
      makeCtx(
        req("/api/teams/XXX", { method: "PUT", headers: authHeaders, body: JSON.stringify({ name: "X" }) }),
        { id: "XXX" },
      ),
    );
    expect(res.status).toBe(404);
  });

  it("200 e persiste nome/cor/formação", async () => {
    const res = await putTeam(
      makeCtx(
        req("/api/teams/ATA", {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ name: "Ataci Futebol Clube", color: "#123456", formation: "2-3-2" }),
        }),
        { id: "ATA" },
      ),
    );
    expect(res.status).toBe(200);
    const out = (await res.json()) as any;
    expect(out.ok).toBe(true);
    expect(out.team.name).toBe("Ataci Futebol Clube");
    expect(out.team.color).toBe("#123456");
    expect(out.team.formation).toBe("2-3-2");

    // Lê de volta.
    const check = await getTeam(makeCtx(req("/api/teams/ATA"), { id: "ATA" }));
    const team = (await check.json()) as any;
    expect(team.name).toBe("Ataci Futebol Clube");
    expect(team.color).toBe("#123456");
  });

  it("normaliza abbr para maiúsculas", async () => {
    const res = await putTeam(
      makeCtx(
        req("/api/teams/ATA", { method: "PUT", headers: authHeaders, body: JSON.stringify({ abbr: "atc" }) }),
        { id: "ATA" },
      ),
    );
    const out = (await res.json()) as any;
    expect(out.team.abbr).toBe("ATC");
  });
});

describe("PUT /api/teams/:id/players (substituir elenco)", () => {
  const goodSquad = {
    players: [
      { name: "Novo GOL", number: 1, position: "GOL", posX: 50, posY: 90 },
      { name: "Novo ZAG", number: 4, position: "DEF", posX: 40, posY: 70 },
      { name: "Novo ATA", number: 9, position: "ATA", posX: 50, posY: 15 },
    ],
  };

  it("401 sem token", async () => {
    const res = await putPlayers(
      makeCtx(
        req("/api/teams/ATA/players", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(goodSquad),
        }),
        { id: "ATA" },
      ),
    );
    expect(res.status).toBe(401);
  });

  it("400 quando players não é array", async () => {
    const res = await putPlayers(
      makeCtx(
        req("/api/teams/ATA/players", { method: "PUT", headers: authHeaders, body: JSON.stringify({ players: "x" }) }),
        { id: "ATA" },
      ),
    );
    expect(res.status).toBe(400);
  });

  it("400 para posX fora de 0-100", async () => {
    const res = await putPlayers(
      makeCtx(
        req("/api/teams/ATA/players", {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ players: [{ name: "P", position: "GOL", posX: 150, posY: 50 }] }),
        }),
        { id: "ATA" },
      ),
    );
    expect(res.status).toBe(400);
  });

  it("400 para position inválida", async () => {
    const res = await putPlayers(
      makeCtx(
        req("/api/teams/ATA/players", {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ players: [{ name: "P", position: "ZAGUEIRO", posX: 50, posY: 50 }] }),
        }),
        { id: "ATA" },
      ),
    );
    expect(res.status).toBe(400);
  });

  it("404 para time inexistente", async () => {
    const res = await putPlayers(
      makeCtx(
        req("/api/teams/XXX/players", { method: "PUT", headers: authHeaders, body: JSON.stringify(goodSquad) }),
        { id: "XXX" },
      ),
    );
    expect(res.status).toBe(404);
  });

  it("200 substitui o elenco inteiro e persiste posX/posY", async () => {
    // ATA começa com 12 jogadores no seed.
    const before = await getPlayers(makeCtx(req("/api/teams/ATA/players"), { id: "ATA" }));
    expect(((await before.json()) as any[]).length).toBe(12);

    const res = await putPlayers(
      makeCtx(
        req("/api/teams/ATA/players", { method: "PUT", headers: authHeaders, body: JSON.stringify(goodSquad) }),
        { id: "ATA" },
      ),
    );
    expect(res.status).toBe(200);
    const out = (await res.json()) as any;
    expect(out.ok).toBe(true);
    expect(out.count).toBe(3);

    // Lê de volta: agora só 3 jogadores, com coordenadas corretas.
    const after = await getPlayers(makeCtx(req("/api/teams/ATA/players"), { id: "ATA" }));
    const players = (await after.json()) as any[];
    expect(players.length).toBe(3);
    const gol = players.find((p) => p.position === "GOL");
    expect(gol.name).toBe("Novo GOL");
    expect(gol.posX).toBe(50);
    expect(gol.posY).toBe(90);
  });

  it("aceita elenco vazio (limpa o time)", async () => {
    const res = await putPlayers(
      makeCtx(
        req("/api/teams/ATA/players", { method: "PUT", headers: authHeaders, body: JSON.stringify({ players: [] }) }),
        { id: "ATA" },
      ),
    );
    expect(res.status).toBe(200);
    const out = (await res.json()) as any;
    expect(out.count).toBe(0);
  });
});
