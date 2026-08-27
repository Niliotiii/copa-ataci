import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, makeCtx, getEnv, finishMatchByEvents } from "./helpers";

import { onRequestGet as getStandings } from "../functions/api/standings";
import { onRequestGet as getBracket } from "../functions/api/bracket";
import { onRequestGet as getMatches } from "../functions/api/matches";
import { onRequestPut as putMatch, onRequestGet as getMatch } from "../functions/api/matches/[id]";
import { onRequestPut as putEvents } from "../functions/api/matches/[id]/events";
import { onRequestPut as putPlayers } from "../functions/api/teams/[id]/players";

beforeEach(async () => {
  await resetDb();
});

function req(url: string, init?: RequestInit) {
  return new Request(`https://test.local${url}`, init);
}
const auth = { authorization: "Bearer test-token", "content-type": "application/json" };

// Helper: acha o id de um jogo pelo bracket_slot lendo /api/bracket.
async function slotId(slot: string): Promise<number> {
  const res = await getBracket(makeCtx(req("/api/bracket")));
  const b = (await res.json()) as any;
  const all = [...b.quarters, ...b.semis, ...(b.final ? [b.final] : [])];
  return all.find((x) => x.slot === slot).id;
}

describe("Avanço automático do mata-mata", () => {
  it("finalizar SF2 promove o vencedor para o lado B da final", async () => {
    // No seed, SF2 = FAL x REL (agendado) e a final tem ATA vs placeholder.
    const id = await slotId("SF2");
    await finishMatchByEvents(id, "FAL", 3, "REL", 1);

    const res = await getBracket(makeCtx(req("/api/bracket")));
    const b = (await res.json()) as any;
    // FAL (home da SF2) venceu → deve aparecer no lado B (away) da final.
    expect(b.final.teamB.abbr).toBe("FAL");
  });

  it("reverter a final (status agendado) limpa o vencedor promovido", async () => {
    const id = await slotId("SF2");
    // Primeiro promove (via eventos).
    await finishMatchByEvents(id, "FAL", 3, "REL", 1);
    // Depois desfaz: zera os eventos (placar volta a null) e status agendado.
    await putEvents(makeCtx(req(`/api/matches/${id}/events`, { method: "PUT", headers: auth, body: JSON.stringify({ events: [] }) }), { id: String(id) }));
    await putMatch(makeCtx(req(`/api/matches/${id}`, { method: "PUT", headers: auth, body: JSON.stringify({ status: "agendado" }) }), { id: String(id) }));

    const res = await getBracket(makeCtx(req("/api/bracket")));
    const b = (await res.json()) as any;
    // Lado B da final volta ao placeholder ("A definir" quando sem time).
    expect(b.final.teamB.abbr).toBe("???");
  });

  it("empate em jogo de mata-mata não promove ninguém", async () => {
    const id = await slotId("SF2");
    // 0x0 (empate) — REL não tem elenco no seed; o importante é não haver vencedor.
    await finishMatchByEvents(id, "FAL", 0, "REL", 0);
    const res = await getBracket(makeCtx(req("/api/bracket")));
    const b = (await res.json()) as any;
    expect(b.final.teamB.abbr).toBe("???");
  });

  it("empate decidido nos pênaltis promove o vencedor dos pênaltis", async () => {
    const id = await slotId("SF2");
    // Empate 0x0 e FAL vence nos pênaltis (3x1) → FAL vai para a final.
    await finishMatchByEvents(id, "FAL", 0, "REL", 0);
    await putMatch(makeCtx(req(`/api/matches/${id}`, { method: "PUT", headers: auth, body: JSON.stringify({ homePens: 3, awayPens: 1 }) }), { id: String(id) }));
    const res = await getBracket(makeCtx(req("/api/bracket")));
    const b = (await res.json()) as any;
    expect(b.final.teamB.abbr).toBe("FAL");
    const sf2 = b.semis.find((s: any) => s.slot === "SF2");
    expect(sf2.winner).toBe("A"); // FAL era o mandante (home) da SF2
  });
});

describe("Standings — desempates isolados", () => {
  it("desempate por saldo de gols quando pontos iguais", async () => {
    // Reaproveita o seed: R1 já finalizada. ATA (7-2,+5) e REL (6-1,+5) têm
    // mesmo pts e saldo; desempata por gols pró → ATA (7) acima de REL (6).
    const res = await getStandings(makeCtx(req("/api/standings")));
    const rows = (await res.json()) as any[];
    const ata = rows.findIndex((r) => r.abbr === "ATA");
    const rel = rows.findIndex((r) => r.abbr === "REL");
    expect(ata).toBeLessThan(rel);
    // E o critério real: ambos 3 pts e +5.
    expect(rows[ata].pts).toBe(rows[rel].pts);
    expect(rows[ata].sg).toBe(rows[rel].sg);
    expect(rows[ata].gp).toBeGreaterThan(rows[rel].gp);
  });
});

describe("Validações limítrofes", () => {
  it("PUT rejeita campos derivados de eventos (placar e cartões)", async () => {
    for (const field of ["homeScore", "awayScore", "homeRed", "awayYellow"]) {
      const res = await putMatch(makeCtx(req("/api/matches/5", { method: "PUT", headers: auth, body: JSON.stringify({ [field]: 1 }) }), { id: "5" }));
      expect(res.status).toBe(400);
    }
  });

  it("aceita posX 0 e 100, rejeita 100.01 e -0.1", async () => {
    const okBody = { players: [{ name: "P", position: "GOL", posX: 0, posY: 100 }] };
    const ok = await putPlayers(makeCtx(req("/api/teams/ATA/players", { method: "PUT", headers: auth, body: JSON.stringify(okBody) }), { id: "ATA" }));
    expect(ok.status).toBe(200);

    const hi = await putPlayers(makeCtx(req("/api/teams/ATA/players", { method: "PUT", headers: auth, body: JSON.stringify({ players: [{ name: "P", position: "GOL", posX: 100.01, posY: 50 }] }) }), { id: "ATA" }));
    expect(hi.status).toBe(400);

    const lo = await putPlayers(makeCtx(req("/api/teams/ATA/players", { method: "PUT", headers: auth, body: JSON.stringify({ players: [{ name: "P", position: "GOL", posX: -0.1, posY: 50 }] }) }), { id: "ATA" }));
    expect(lo.status).toBe(400);
  });
});

describe("Filtros de matches", () => {
  it("round inválido (NaN) é ignorado e retorna a lista", async () => {
    const res = await getMatches(makeCtx(req("/api/matches?phase=grupos&round=abc")));
    expect(res.status).toBe(200);
    const list = (await res.json()) as any[];
    expect(list.length).toBeGreaterThan(0); // não filtrou por round inválido
  });

  it("phase inexistente retorna lista vazia", async () => {
    const res = await getMatches(makeCtx(req("/api/matches?phase=xyz")));
    const list = (await res.json()) as any[];
    expect(list).toHaveLength(0);
  });

  it("jogo sem time usa placeholder e cor default", async () => {
    // Final do seed tem away como placeholder "Vencedor SF2".
    const res = await getMatches(makeCtx(req("/api/matches?phase=final")));
    const list = (await res.json()) as any[];
    expect(list[0].teamB.name).toBe("Vencedor SF2");
    expect(list[0].teamB.color).toBe("#6b7280");
  });
});

describe("Auth — casos limítrofes", () => {
  it("header sem prefixo Bearer → 401", async () => {
    const res = await putMatch(makeCtx(req("/api/matches/5", { method: "PUT", headers: { authorization: "test-token", "content-type": "application/json" }, body: JSON.stringify({ status: "andamento" }) }), { id: "5" }));
    expect(res.status).toBe(401);
  });

  it("esquema em minúsculas (bearer) → 401 (case-sensitive)", async () => {
    const res = await putMatch(makeCtx(req("/api/matches/5", { method: "PUT", headers: { authorization: "bearer test-token", "content-type": "application/json" }, body: JSON.stringify({ status: "andamento" }) }), { id: "5" }));
    expect(res.status).toBe(401);
  });

  it("ADMIN_TOKEN ausente no env → 500", async () => {
    const env = getEnv();
    const ctx = {
      request: req("/api/matches/5", { method: "PUT", headers: { authorization: "Bearer x", "content-type": "application/json" }, body: "{}" }),
      env: { DB: env.DB, ADMIN_TOKEN: undefined },
      params: { id: "5" },
      waitUntil() {}, passThroughOnException() {}, next: async () => new Response(null), data: {},
      functionPath: "/api/matches/5",
    } as any;
    const res = await putMatch(ctx);
    expect(res.status).toBe(500);
  });
});

describe("GET /api/matches/:id — id inválido", () => {
  it("id não-numérico → 400", async () => {
    const res = await getMatch(makeCtx(req("/api/matches/abc"), { id: "abc" }));
    expect(res.status).toBe(400);
  });
});
