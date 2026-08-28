import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, makeCtx } from "./helpers";

import {
  onRequestGet as getMatch,
  onRequestPut as putMatch,
} from "../functions/api/matches/[id]";
import {
  onRequestGet as getSponsors,
  onRequestPut as putSponsors,
} from "../functions/api/sponsors";

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

describe("PUT /api/matches/:id — dados do jogo (data/hora/local/times)", () => {
  it("200 atualiza data, hora e local e persiste", async () => {
    const res = await putMatch(
      makeCtx(
        req("/api/matches/5", {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ date: "Sex, 01 Ago", time: "20:30", location: "Campo Novo" }),
        }),
        { id: "5" },
      ),
    );
    expect(res.status).toBe(200);
    const out = (await res.json()) as any;
    expect(out.match.date).toBe("Sex, 01 Ago");
    expect(out.match.time).toBe("20:30");
    expect(out.match.location).toBe("Campo Novo");

    const check = await getMatch(makeCtx(req("/api/matches/5"), { id: "5" }));
    const m = (await check.json()) as any;
    expect(m.location).toBe("Campo Novo");
  });

  it("200 troca os times por ids existentes", async () => {
    const res = await putMatch(
      makeCtx(
        req("/api/matches/5", {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ homeTeamId: "FAL", awayTeamId: "CAC" }),
        }),
        { id: "5" },
      ),
    );
    expect(res.status).toBe(200);
    const out = (await res.json()) as any;
    expect(out.match.homeTeamId).toBe("FAL");
    expect(out.match.awayTeamId).toBe("CAC");
  });

  it("aceita homeTeamId null (limpa o time)", async () => {
    const res = await putMatch(
      makeCtx(
        req("/api/matches/5", { method: "PUT", headers: authHeaders, body: JSON.stringify({ homeTeamId: null }) }),
        { id: "5" },
      ),
    );
    expect(res.status).toBe(200);
    const out = (await res.json()) as any;
    expect(out.match.homeTeamId).toBeNull();
  });

  it("400 para time inexistente", async () => {
    const res = await putMatch(
      makeCtx(
        req("/api/matches/5", { method: "PUT", headers: authHeaders, body: JSON.stringify({ homeTeamId: "ZZZ" }) }),
        { id: "5" },
      ),
    );
    expect(res.status).toBe(400);
  });

  it("400 para date vazio", async () => {
    const res = await putMatch(
      makeCtx(
        req("/api/matches/5", { method: "PUT", headers: authHeaders, body: JSON.stringify({ date: "  " }) }),
        { id: "5" },
      ),
    );
    expect(res.status).toBe(400);
  });

  it("401 sem token", async () => {
    const res = await putMatch(
      makeCtx(
        req("/api/matches/5", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ location: "X" }),
        }),
        { id: "5" },
      ),
    );
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/sponsors — substituir lista", () => {
  const goodList = {
    sponsors: [
      { name: "Novo Patro A", initials: "NA", color: "#112233", tagline: "Apoio" },
      { name: "Novo Patro B", initials: "NB", color: "#445566" },
    ],
  };

  it("persiste o logo (imagem data URI) do patrocinador", async () => {
    const logo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA=";
    const res = await putSponsors(
      makeCtx(req("/api/sponsors", { method: "PUT", headers: authHeaders, body: JSON.stringify({ sponsors: [{ name: "Logo Co", initials: "LC", color: "#112233", logoUrl: logo }] }) })),
    );
    expect(res.status).toBe(200);
    const after = await getSponsors(makeCtx(req("/api/sponsors")));
    const list = (await after.json()) as any[];
    expect(list[0].logoUrl).toBe(logo);
  });

  it("rejeita logo com data URI não-imagem", async () => {
    const res = await putSponsors(
      makeCtx(req("/api/sponsors", { method: "PUT", headers: authHeaders, body: JSON.stringify({ sponsors: [{ name: "X", initials: "X", color: "#112233", logoUrl: "data:text/html;base64,PHM+" }] }) })),
    );
    expect(res.status).toBe(400);
  });

  it("persiste o link (URL http/https) do patrocinador", async () => {
    const res = await putSponsors(
      makeCtx(req("/api/sponsors", { method: "PUT", headers: authHeaders, body: JSON.stringify({ sponsors: [{ name: "Link Co", initials: "LK", color: "#112233", linkUrl: "https://exemplo.com" }] }) })),
    );
    expect(res.status).toBe(200);
    const after = await getSponsors(makeCtx(req("/api/sponsors")));
    const list = (await after.json()) as any[];
    expect(list[0].linkUrl).toBe("https://exemplo.com");
  });

  it("rejeita link que não é URL http(s)", async () => {
    const res = await putSponsors(
      makeCtx(req("/api/sponsors", { method: "PUT", headers: authHeaders, body: JSON.stringify({ sponsors: [{ name: "X", initials: "X", color: "#112233", linkUrl: "javascript:alert(1)" }] }) })),
    );
    expect(res.status).toBe(400);
  });

  it("401 sem token", async () => {
    const res = await putSponsors(
      makeCtx(
        req("/api/sponsors", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(goodList),
        }),
      ),
    );
    expect(res.status).toBe(401);
  });

  it("400 quando sponsors não é array", async () => {
    const res = await putSponsors(
      makeCtx(req("/api/sponsors", { method: "PUT", headers: authHeaders, body: JSON.stringify({ sponsors: 1 }) })),
    );
    expect(res.status).toBe(400);
  });

  it("400 para color inválido", async () => {
    const res = await putSponsors(
      makeCtx(
        req("/api/sponsors", {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ sponsors: [{ name: "X", initials: "X", color: "red" }] }),
        }),
      ),
    );
    expect(res.status).toBe(400);
  });

  it("400 para initials muito longo", async () => {
    const res = await putSponsors(
      makeCtx(
        req("/api/sponsors", {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ sponsors: [{ name: "X", initials: "TOOLONG", color: "#112233" }] }),
        }),
      ),
    );
    expect(res.status).toBe(400);
  });

  it("200 substitui a lista (seed tem 7 → agora 2) e persiste", async () => {
    const before = await getSponsors(makeCtx(req("/api/sponsors")));
    expect(((await before.json()) as any[]).length).toBe(7);

    const res = await putSponsors(
      makeCtx(req("/api/sponsors", { method: "PUT", headers: authHeaders, body: JSON.stringify(goodList) })),
    );
    expect(res.status).toBe(200);
    const out = (await res.json()) as any;
    expect(out.ok).toBe(true);
    expect(out.count).toBe(2);

    const after = await getSponsors(makeCtx(req("/api/sponsors")));
    const list = (await after.json()) as any[];
    expect(list.length).toBe(2);
    expect(list[0].name).toBe("Novo Patro A");
    expect(list[1].tagline).toBeNull();
  });

  it("200 aceita lista vazia", async () => {
    const res = await putSponsors(
      makeCtx(req("/api/sponsors", { method: "PUT", headers: authHeaders, body: JSON.stringify({ sponsors: [] }) })),
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).count).toBe(0);
  });
});
