import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { resetDb, makeCtx, finishMatchByEvents } from "./helpers";

import { onRequestGet as getStandings } from "../functions/api/standings";
import { onRequestGet as getBracket } from "../functions/api/bracket";
import { onRequestPut as putMatch } from "../functions/api/matches/[id]";
import { onRequestPut as putPlayers, onRequestGet as getPlayers } from "../functions/api/teams/[id]/players";
import { onRequestPut as putSponsors, onRequestGet as getSponsors } from "../functions/api/sponsors";

beforeEach(async () => {
  await resetDb();
});

function req(url: string, init?: RequestInit) {
  return new Request(`https://test.local${url}`, init);
}
const auth = { authorization: "Bearer test-token", "content-type": "application/json" };

async function slotId(slot: string): Promise<number> {
  const res = await getBracket(makeCtx(req("/api/bracket")));
  const b = (await res.json()) as any;
  const all = [...b.quarters, ...b.semis, ...(b.final ? [b.final] : [])];
  return all.find((x) => x.slot === slot).id;
}

describe("Escrita no runtime real (workerd + D1 nativo)", () => {
  it("substitui elenco atomicamente via batch e persiste coordenadas", async () => {
    const res = await putPlayers(
      makeCtx(
        req("/api/teams/ATA/players", {
          method: "PUT",
          headers: auth,
          body: JSON.stringify({ players: [{ name: "Goleiro", number: 1, position: "GOL", posX: 50, posY: 90.5 }] }),
        }),
        { id: "ATA" },
      ),
    );
    expect(res.status).toBe(200);
    const after = await getPlayers(makeCtx(req("/api/teams/ATA/players"), { id: "ATA" }));
    const list = (await after.json()) as any[];
    expect(list).toHaveLength(1);
    expect(list[0].posY).toBe(90.5);
  });

  it("substitui patrocinadores via batch", async () => {
    const res = await putSponsors(
      makeCtx(req("/api/sponsors", { method: "PUT", headers: auth, body: JSON.stringify({ sponsors: [{ name: "Único", initials: "UN", color: "#112233" }] }) })),
    );
    expect(res.status).toBe(200);
    const after = await getSponsors(makeCtx(req("/api/sponsors")));
    expect(((await after.json()) as any[]).length).toBe(1);
  });

  it("propaga o vencedor da SF2 para a final", async () => {
    const id = await slotId("SF2");
    await finishMatchByEvents(id, "FAL", 3, "REL", 1);
    const res = await getBracket(makeCtx(req("/api/bracket")));
    const b = (await res.json()) as any;
    expect(b.final.teamB.abbr).toBe("FAL");
  });

  it("recalcula standings após finalizar um jogo de grupos", async () => {
    // jogo 5 = R2 ATA x LEO
    await finishMatchByEvents(5, "ATA", 4, "LEO", 1);
    const res = await getStandings(makeCtx(req("/api/standings")));
    const rows = (await res.json()) as any[];
    const ata = rows.find((r) => r.abbr === "ATA");
    expect(ata.j).toBe(2);
    expect(ata.pts).toBe(6);
  });

  it("ON DELETE CASCADE remove jogadores ao apagar o time (D1 nativo)", async () => {
    // Confirma que há jogadores.
    const before = (await (await getPlayers(makeCtx(req("/api/teams/ATA/players"), { id: "ATA" }))).json()) as any[];
    expect(before.length).toBeGreaterThan(0);

    // matches referencia teams(id) sem CASCADE — a integridade referencial
    // impede apagar um time ainda usado em jogos (comportamento correto).
    await expect(
      env.DB.prepare("DELETE FROM teams WHERE id = ?;").bind("ATA").run(),
    ).rejects.toThrow(/FOREIGN KEY/i);

    // Removendo as referências em matches, o DELETE passa e o CASCADE de
    // players remove o elenco.
    await env.DB.prepare("UPDATE matches SET home_team_id = NULL WHERE home_team_id = ?;").bind("ATA").run();
    await env.DB.prepare("UPDATE matches SET away_team_id = NULL WHERE away_team_id = ?;").bind("ATA").run();
    await env.DB.prepare("DELETE FROM teams WHERE id = ?;").bind("ATA").run();

    const { results } = await env.DB.prepare("SELECT COUNT(*) AS n FROM players WHERE team_id = ?;").bind("ATA").all();
    expect((results[0] as any).n).toBe(0);
  });
});
