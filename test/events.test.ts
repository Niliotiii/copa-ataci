import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, makeCtx, getEnv } from "./helpers";
import { onRequestPut as putEvents, onRequestGet as getEvents } from "../functions/api/matches/[id]/events";
import { onRequestGet as getScorers } from "../functions/api/scorers";
import { onRequestGet as getSuspensions } from "../functions/api/suspensions";
import { onRequestPut as putSuspension } from "../functions/api/suspensions/[id]";
import { onRequestGet as getMatch } from "../functions/api/matches/[id]";

beforeEach(async () => {
  await resetDb();
});
function req(url: string, init?: RequestInit) {
  return new Request(`https://test.local${url}`, init);
}
const auth = { authorization: "Bearer test-token", "content-type": "application/json" };

// Helper: ids dos jogadores de um time (via SQL direto).
async function playerIds(teamId: string): Promise<number[]> {
  const { results } = await getEnv().DB.prepare("SELECT id FROM players WHERE team_id = ? ORDER BY id;").bind(teamId).all();
  return (results as { id: number }[]).map((r) => r.id);
}
// jogo 5 = ATA x LEO (R2). ATA e LEO têm elenco no seed.
async function setupEvents(events: { playerId: number; type: string }[]) {
  return putEvents(
    makeCtx(req("/api/matches/5", { method: "PUT", headers: auth, body: JSON.stringify({ events }) }), { id: "5" }),
  );
}

describe("Eventos por jogador", () => {
  it("401 sem token", async () => {
    const res = await putEvents(
      makeCtx(req("/api/matches/5", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ events: [] }) }), { id: "5" }),
    );
    expect(res.status).toBe(401);
  });

  it("400 se jogador não pertence a um time do jogo", async () => {
    const falIds = await playerIds("FAL"); // FAL não joga o match 5 (ATA x LEO)
    const res = await setupEvents([{ playerId: falIds[0], type: "gol" }]);
    expect(res.status).toBe(400);
  });

  it("grava eventos e o GET reflete", async () => {
    const ata = await playerIds("ATA");
    const res = await setupEvents([{ playerId: ata[0], type: "gol" }, { playerId: ata[0], type: "gol" }]);
    expect(res.status).toBe(200);
    const list = (await (await getEvents(makeCtx(req("/api/matches/5/events"), { id: "5" }))).json()) as any[];
    expect(list).toHaveLength(2);
  });

  it("recalcula os cartões agregados do jogo a partir dos eventos", async () => {
    const ata = await playerIds("ATA");
    const leo = await playerIds("LEO");
    await setupEvents([
      { playerId: ata[0], type: "amarelo" },
      { playerId: ata[1], type: "amarelo" },
      { playerId: leo[0], type: "vermelho" },
    ]);
    const m = (await (await getMatch(makeCtx(req("/api/matches/5"), { id: "5" }))).json()) as any;
    expect(m.homeYellow).toBe(2); // ATA (casa)
    expect(m.awayRed).toBe(1);    // LEO (visitante)
  });

  it("recalcula o PLACAR do jogo a partir dos gols nos eventos", async () => {
    const ata = await playerIds("ATA"); // casa
    const leo = await playerIds("LEO"); // visitante
    await setupEvents([
      { playerId: ata[0], type: "gol" },
      { playerId: ata[1], type: "gol" },
      { playerId: ata[0], type: "gol" },
      { playerId: leo[0], type: "gol" },
    ]);
    const m = (await (await getMatch(makeCtx(req("/api/matches/5"), { id: "5" }))).json()) as any;
    expect(m.homeScore).toBe(3); // ATA marcou 3
    expect(m.awayScore).toBe(1); // LEO marcou 1
  });
});

describe("Artilharia", () => {
  it("conta gols por jogador e ordena", async () => {
    const ata = await playerIds("ATA");
    await setupEvents([
      { playerId: ata[0], type: "gol" },
      { playerId: ata[0], type: "gol" },
      { playerId: ata[1], type: "gol" },
    ]);
    const scorers = (await (await getScorers(makeCtx(req("/api/scorers")))).json()) as any[];
    expect(scorers[0].goals).toBe(2);
    expect(scorers[0].playerId).toBe(ata[0]);
    expect(scorers.length).toBe(2);
  });
});

describe("Suspensões — geração e ciclo", () => {
  it("1 vermelho gera 1 suspensão pendente", async () => {
    const ata = await playerIds("ATA");
    await setupEvents([{ playerId: ata[0], type: "vermelho" }]);
    const susp = (await (await getSuspensions(makeCtx(req("/api/suspensions")))).json()) as any[];
    expect(susp).toHaveLength(1);
    expect(susp[0].reason).toBe("vermelho");
    expect(susp[0].playerId).toBe(ata[0]);
  });

  it("3 amarelos geram 1 suspensão; 2 não geram", async () => {
    const ata = await playerIds("ATA");
    await setupEvents([{ playerId: ata[0], type: "amarelo" }, { playerId: ata[0], type: "amarelo" }]);
    let susp = (await (await getSuspensions(makeCtx(req("/api/suspensions")))).json()) as any[];
    expect(susp).toHaveLength(0);

    await setupEvents([
      { playerId: ata[0], type: "amarelo" }, { playerId: ata[0], type: "amarelo" }, { playerId: ata[0], type: "amarelo" },
    ]);
    susp = (await (await getSuspensions(makeCtx(req("/api/suspensions")))).json()) as any[];
    expect(susp).toHaveLength(1);
    expect(susp[0].reason).toBe("3_amarelos");
  });

  it("marcar como cumprida remove da lista de pendentes", async () => {
    const ata = await playerIds("ATA");
    await setupEvents([{ playerId: ata[0], type: "vermelho" }]);
    let susp = (await (await getSuspensions(makeCtx(req("/api/suspensions")))).json()) as any[];
    const id = susp[0].id;

    const res = await putSuspension(
      makeCtx(req(`/api/suspensions/${id}`, { method: "PUT", headers: auth, body: JSON.stringify({ served: true }) }), { id: String(id) }),
    );
    expect(res.status).toBe(200);

    susp = (await (await getSuspensions(makeCtx(req("/api/suspensions")))).json()) as any[];
    expect(susp).toHaveLength(0);
  });

  it("re-salvar eventos não duplica suspensão já existente", async () => {
    const ata = await playerIds("ATA");
    await setupEvents([{ playerId: ata[0], type: "vermelho" }]);
    // re-salva o mesmo evento (idempotente quanto à suspensão)
    await setupEvents([{ playerId: ata[0], type: "vermelho" }]);
    const susp = (await (await getSuspensions(makeCtx(req("/api/suspensions")))).json()) as any[];
    expect(susp).toHaveLength(1);
  });

  it("baixar suspensão não impede nova suspensão de um novo vermelho", async () => {
    const ata = await playerIds("ATA");
    await setupEvents([{ playerId: ata[0], type: "vermelho" }]);
    let susp = (await (await getSuspensions(makeCtx(req("/api/suspensions")))).json()) as any[];
    await putSuspension(makeCtx(req(`/api/suspensions/${susp[0].id}`, { method: "PUT", headers: auth, body: JSON.stringify({ served: true }) }), { id: String(susp[0].id) }));

    // Novo jogo com outro vermelho para o mesmo jogador (usa match 9 = ATA x CAC).
    const res = await putEvents(makeCtx(req("/api/matches/9", { method: "PUT", headers: auth, body: JSON.stringify({ events: [{ playerId: ata[0], type: "vermelho" }] }) }), { id: "9" }));
    expect(res.status).toBe(200);
    susp = (await (await getSuspensions(makeCtx(req("/api/suspensions")))).json()) as any[];
    expect(susp).toHaveLength(1); // a nova suspensão (2 devidas, 1 cumprida)
  });
});
