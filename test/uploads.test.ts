import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, makeCtx } from "./helpers";
import { onRequestPost as postUpload } from "../functions/api/uploads";
import { onRequestGet as getUpload } from "../functions/api/uploads/[key]";

beforeEach(async () => {
  await resetDb();
});

// Mock mínimo de R2Bucket em memória.
function makeR2() {
  const store = new Map<string, { body: ArrayBuffer; meta: any }>();
  return {
    store,
    put: async (key: string, body: ArrayBuffer, opts: any) => { store.set(key, { body, meta: opts?.httpMetadata }); },
    get: async (key: string) => {
      const o = store.get(key);
      if (!o) return null;
      return { body: o.body, httpMetadata: o.meta, httpEtag: '"x"' };
    },
  };
}

function req(url: string, init?: RequestInit) {
  return new Request(`https://test.local${url}`, init);
}
const auth = { authorization: "Bearer test-token" };

// Injeta o MEDIA mock no ctx.
function ctxWith(media: any, request: Request, params: Record<string, string> = {}) {
  const c = makeCtx(request, params);
  (c.env as any).MEDIA = media;
  return c;
}

describe("Uploads (R2)", () => {
  it("401 sem token", async () => {
    const res = await postUpload(ctxWith(makeR2(), req("/api/uploads", { method: "POST", headers: { "content-type": "image/png" }, body: new Uint8Array([1, 2, 3]) })));
    expect(res.status).toBe(401);
  });

  it("400 tipo inválido", async () => {
    const res = await postUpload(ctxWith(makeR2(), req("/api/uploads", { method: "POST", headers: { ...auth, "content-type": "text/html" }, body: "x" })));
    expect(res.status).toBe(400);
  });

  it("grava no R2 e retorna URL; GET serve a imagem", async () => {
    const media = makeR2();
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // assinatura PNG
    const up = await postUpload(ctxWith(media, req("/api/uploads", { method: "POST", headers: { ...auth, "content-type": "image/png" }, body: png })));
    expect(up.status).toBe(200);
    const { url } = (await up.json()) as { url: string };
    expect(url).toMatch(/^\/api\/uploads\/[A-Za-z0-9-]+\.png$/);

    const key = url.split("/").pop()!;
    const get = await getUpload(ctxWith(media, req(url), { key }));
    expect(get.status).toBe(200);
    expect(get.headers.get("content-type")).toBe("image/png");
  });

  it("404 para chave inexistente", async () => {
    const get = await getUpload(ctxWith(makeR2(), req("/api/uploads/none.png"), { key: "none.png" }));
    expect(get.status).toBe(404);
  });
});
