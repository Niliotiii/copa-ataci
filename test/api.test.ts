import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, makeCtx, finishMatchByEvents } from "./helpers";

import { onRequestGet as getStandings } from "../functions/api/standings";
import { onRequestGet as getMatches } from "../functions/api/matches";
import { onRequestGet as getBracket } from "../functions/api/bracket";
import { onRequestGet as getTeams } from "../functions/api/teams";
import { onRequestGet as getTeam } from "../functions/api/teams/[id]";
import { onRequestGet as getSponsors } from "../functions/api/sponsors";
import {
  onRequestGet as getMatch,
  onRequestPut as putMatch,
} from "../functions/api/matches/[id]";

// D1 limpo (schema + seed) antes de cada teste.
beforeEach(async () => {
  await resetDb();
});

function req(url: string, init?: RequestInit) {
  return new Request(`https://test.local${url}`, init);
}

describe("GET /api/standings (classificação calculada)", () => {
  it("calcula pontos e ordena; só conta jogos finalizados da fase de grupos", async () => {
    const res = await getStandings(makeCtx(req("/api/standings")));
    expect(res.status).toBe(200);
    const rows = (await res.json()) as any[];

    expect(rows).toHaveLength(8);
    // Após o seed, apenas a Rodada 1 está finalizada.
    // ATA venceu 7x2 → 3 pts, SG +5. Líder por SG sobre REL (também 3 pts, +5)
    // é desempatado por gols pró (ATA 7 x REL 6).
    expect(rows[0].abbr).toBe("ATA");
    expect(rows[0].pos).toBe(1);
    expect(rows[0].pts).toBe(3);
    expect(rows[0].v).toBe(1);
    expect(rows[0].sg).toBe(5);

    // Times que ainda não jogaram jogo finalizado ficam com 0.
    const tro = rows.find((r) => r.abbr === "TRO");
    expect(tro.pts).toBe(0);
    expect(tro.d).toBe(1); // perdeu para ATA
  });

  it("reflete um novo resultado após atualização (recálculo automático)", async () => {
    // Finaliza jogo 5 (Rodada 2: ATA x LEO) 4x1 — via eventos por jogador.
    await finishMatchByEvents(5, "ATA", 4, "LEO", 1);

    const res = await getStandings(makeCtx(req("/api/standings")));
    const rows = (await res.json()) as any[];
    const ata = rows.find((r) => r.abbr === "ATA");
    expect(ata.j).toBe(2);
    expect(ata.v).toBe(2);
    expect(ata.pts).toBe(6);
    expect(ata.sg).toBe(8); // +5 (R1) +3 (R2)
  });
});

describe("GET /api/matches", () => {
  it("filtra por fase e rodada", async () => {
    const res = await getMatches(makeCtx(req("/api/matches?phase=grupos&round=1")));
    expect(res.status).toBe(200);
    const matches = (await res.json()) as any[];
    expect(matches).toHaveLength(4);
    const first = matches[0];
    expect(first.teamA.name).toBe("Ataci FC");
    expect(first.teamA.score).toBe(7);
    expect(first.status).toBe("finalizado");
  });

  it("retorna jogos agendados com placar null", async () => {
    const res = await getMatches(makeCtx(req("/api/matches?phase=grupos&round=2")));
    const matches = (await res.json()) as any[];
    expect(matches.every((m) => m.status === "agendado")).toBe(true);
    expect(matches[0].teamA.score).toBeNull();
  });
});

describe("GET /api/bracket", () => {
  it("agrupa por fase e deriva o vencedor do placar", async () => {
    const res = await getBracket(makeCtx(req("/api/bracket")));
    expect(res.status).toBe(200);
    const b = (await res.json()) as any;
    expect(b.quarters).toHaveLength(4);
    expect(b.semis).toHaveLength(2);
    expect(b.final).not.toBeNull();
    // QF1: ATA 8x3 FOR → vencedor A
    expect(b.quarters[0].winner).toBe("A");
    // Final tem placeholder no lado B (Vencedor SF2)
    expect(b.final.teamB.name).toBe("Vencedor SF2");
  });
});

describe("GET /api/teams e /api/teams/:id", () => {
  it("lista os 8 times", async () => {
    const res = await getTeams(makeCtx(req("/api/teams")));
    const teams = (await res.json()) as any[];
    expect(teams).toHaveLength(8);
  });

  it("retorna elenco com coordenadas posX/posY", async () => {
    const res = await getTeam(makeCtx(req("/api/teams/ATA"), { id: "ATA" }));
    expect(res.status).toBe(200);
    const team = (await res.json()) as any;
    expect(team.name).toBe("Ataci FC");
    expect(team.formation).toBe("3-2-3");
    expect(team.players.length).toBe(12);
    const gol = team.players.find((p: any) => p.position === "GOL");
    expect(gol.posX).toBe(50);
    expect(gol.posY).toBe(88);
  });

  it("retorna 404 para time inexistente", async () => {
    const res = await getTeam(makeCtx(req("/api/teams/XXX"), { id: "XXX" }));
    expect(res.status).toBe(404);
  });
});

describe("GET /api/sponsors", () => {
  it("lista patrocinadores ordenados", async () => {
    const res = await getSponsors(makeCtx(req("/api/sponsors")));
    const sponsors = (await res.json()) as any[];
    expect(sponsors).toHaveLength(7);
    expect(sponsors[0].name).toBe("Arena Ataci");
  });
});

describe("GET /api/matches/:id", () => {
  it("retorna um jogo específico", async () => {
    const res = await getMatch(makeCtx(req("/api/matches/1"), { id: "1" }));
    expect(res.status).toBe(200);
    const m = (await res.json()) as any;
    expect(m.id).toBe(1);
    expect(m.homeScore).toBe(7);
  });

  it("404 para jogo inexistente", async () => {
    const res = await getMatch(makeCtx(req("/api/matches/9999"), { id: "9999" }));
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/matches/:id (protegido)", () => {
  const body = JSON.stringify({ status: "finalizado", location: "Arena Ataci" });

  it("401 sem token", async () => {
    const res = await putMatch(
      makeCtx(req("/api/matches/5", { method: "PUT", headers: { "content-type": "application/json" }, body }), { id: "5" }),
    );
    expect(res.status).toBe(401);
  });

  it("401 com token incorreto", async () => {
    const res = await putMatch(
      makeCtx(
        req("/api/matches/5", {
          method: "PUT",
          headers: { authorization: "Bearer errado", "content-type": "application/json" },
          body,
        }),
        { id: "5" },
      ),
    );
    expect(res.status).toBe(401);
  });

  it("400 rejeita campos derivados (placar/cartões vêm dos eventos)", async () => {
    const res = await putMatch(
      makeCtx(
        req("/api/matches/5", {
          method: "PUT",
          headers: { authorization: "Bearer test-token", "content-type": "application/json" },
          body: JSON.stringify({ homeScore: 3 }),
        }),
        { id: "5" },
      ),
    );
    expect(res.status).toBe(400);
  });

  it("400 para status inválido", async () => {
    const res = await putMatch(
      makeCtx(
        req("/api/matches/5", {
          method: "PUT",
          headers: { authorization: "Bearer test-token", "content-type": "application/json" },
          body: JSON.stringify({ status: "cancelado" }),
        }),
        { id: "5" },
      ),
    );
    expect(res.status).toBe(400);
  });

  it("404 para jogo inexistente", async () => {
    const res = await putMatch(
      makeCtx(
        req("/api/matches/9999", {
          method: "PUT",
          headers: { authorization: "Bearer test-token", "content-type": "application/json" },
          body,
        }),
        { id: "9999" },
      ),
    );
    expect(res.status).toBe(404);
  });

  it("200 e persiste a atualização com token válido", async () => {
    const res = await putMatch(
      makeCtx(
        req("/api/matches/5", {
          method: "PUT",
          headers: { authorization: "Bearer test-token", "content-type": "application/json" },
          body,
        }),
        { id: "5" },
      ),
    );
    expect(res.status).toBe(200);
    const out = (await res.json()) as any;
    expect(out.ok).toBe(true);
    expect(out.match.status).toBe("finalizado");
    expect(out.match.location).toBe("Arena Ataci");

    // O placar é derivado dos eventos: registrar 4x1 reflete no jogo.
    await finishMatchByEvents(5, "ATA", 4, "LEO", 1);
    const check = await getMatch(makeCtx(req("/api/matches/5"), { id: "5" }));
    const m = (await check.json()) as any;
    expect(m.homeScore).toBe(4);
    expect(m.awayScore).toBe(1);
  });
});
