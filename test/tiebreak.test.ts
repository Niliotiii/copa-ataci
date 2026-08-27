import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, makeCtx } from "./helpers";
import { sortStandings } from "../functions/api/standings";
import { onRequestGet as getStandings } from "../functions/api/standings";
import { onRequestPut as putMatch, onRequestGet as getMatch } from "../functions/api/matches/[id]";

beforeEach(async () => {
  await resetDb();
});
function req(url: string, init?: RequestInit) {
  return new Request(`https://test.local${url}`, init);
}
const auth = { authorization: "Bearer test-token", "content-type": "application/json" };

// Base para um time; sobrescreve o que o teste precisar.
function team(abbr: string, o: Partial<any> = {}) {
  return {
    abbr, name: o.name ?? abbr, color: "#000",
    j: 1, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts: 0,
    red: 0, yellow: 0, fouls: 0, ...o,
  };
}

describe("sortStandings — sequência de critérios de desempate", () => {
  it("1. ordena por pontos", () => {
    const out = sortStandings([team("A", { pts: 3 }), team("B", { pts: 6 })], []);
    expect(out.map((r) => r.abbr)).toEqual(["B", "A"]);
  });

  it("3. vitórias desempata quando pts iguais e sem confronto direto entre eles", () => {
    // Mesmos pts; nenhum jogo direto → cai para vitórias.
    const rows = [team("A", { pts: 3, v: 1, sg: 2 }), team("B", { pts: 3, v: 1, sg: 2 }), team("C", { pts: 3, v: 2, sg: 2 })];
    const out = sortStandings(rows, []);
    expect(out[0].abbr).toBe("C"); // mais vitórias
  });

  it("4-6. saldo, gols pró e gols contra na ordem certa", () => {
    const rows = [
      team("A", { pts: 3, v: 1, sg: 1, gp: 3, gc: 2 }),
      team("B", { pts: 3, v: 1, sg: 2, gp: 3, gc: 1 }),
    ];
    expect(sortStandings(rows, [])[0].abbr).toBe("B"); // maior saldo

    const rows2 = [
      team("A", { pts: 3, v: 1, sg: 2, gp: 5, gc: 3 }),
      team("B", { pts: 3, v: 1, sg: 2, gp: 4, gc: 2 }),
    ];
    expect(sortStandings(rows2, [])[0].abbr).toBe("A"); // mesmo saldo, mais gols pró
  });

  it("7-9. cartões vermelhos, amarelos e faltas desempatam (menos é melhor)", () => {
    const common = { pts: 3, v: 1, sg: 2, gp: 3, gc: 1 };
    // vermelhos
    expect(sortStandings([team("A", { ...common, red: 2 }), team("B", { ...common, red: 0 })], [])[0].abbr).toBe("B");
    // amarelos (vermelhos iguais)
    expect(sortStandings([team("A", { ...common, yellow: 5 }), team("B", { ...common, yellow: 1 })], [])[0].abbr).toBe("B");
    // faltas (vermelhos e amarelos iguais)
    expect(sortStandings([team("A", { ...common, fouls: 12 }), team("B", { ...common, fouls: 6 })], [])[0].abbr).toBe("B");
  });

  it("2. confronto direto tem prioridade sobre vitórias/saldo", () => {
    // A e B empatados em pts; B tem mais vitórias/saldo no geral, MAS A venceu o
    // confronto direto → A fica na frente.
    const rows = [
      team("A", { pts: 6, v: 2, sg: 3, gp: 5, gc: 2 }),
      team("B", { pts: 6, v: 3, sg: 9, gp: 12, gc: 3 }),
    ];
    const finished = [{ home: "A", away: "B", hs: 2, as_: 0 }]; // A venceu o direto
    expect(sortStandings(rows, finished)[0].abbr).toBe("A");
  });
});

describe("Disciplina — registro e agregação", () => {
  it("PUT aceita cartões/faltas e o GET reflete", async () => {
    const res = await putMatch(
      makeCtx(
        req("/api/matches/5", {
          method: "PUT",
          headers: auth,
          body: JSON.stringify({ homeScore: 2, awayScore: 0, status: "finalizado", homeYellow: 3, awayRed: 1, awayFouls: 9 }),
        }),
        { id: "5" },
      ),
    );
    expect(res.status).toBe(200);
    const check = await getMatch(makeCtx(req("/api/matches/5"), { id: "5" }));
    const m = (await check.json()) as any;
    expect(m.homeYellow).toBe(3);
    expect(m.awayRed).toBe(1);
    expect(m.awayFouls).toBe(9);
  });

  it("PUT rejeita disciplina negativa", async () => {
    const res = await putMatch(
      makeCtx(req("/api/matches/5", { method: "PUT", headers: auth, body: JSON.stringify({ homeRed: -1 }) }), { id: "5" }),
    );
    expect(res.status).toBe(400);
  });

  it("standings agrega cartões/faltas do seed (ATA da R1)", async () => {
    const res = await getStandings(makeCtx(req("/api/standings")));
    const rows = (await res.json()) as any[];
    const ata = rows.find((r) => r.abbr === "ATA");
    // Seed R1 ATA x TRO: ATA teve 2 amarelos, 8 faltas, 0 vermelhos.
    expect(ata.yellow).toBe(2);
    expect(ata.fouls).toBe(8);
    expect(ata.red).toBe(0);
  });
});
