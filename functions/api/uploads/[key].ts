import { error, serverError, type PagesContext } from "../_shared";

// GET /api/uploads/:key — serve a imagem do R2 (público, cacheável no edge).
export const onRequestGet = async (ctx: PagesContext): Promise<Response> => {
  try {
    if (!ctx.env.MEDIA) return error("Armazenamento de imagens não configurado (R2).", 500);
    const key = ctx.params.key as string;
    if (!key || !/^[A-Za-z0-9._-]+$/.test(key)) return error("Chave inválida.", 400);

    const obj = await ctx.env.MEDIA.get(key);
    if (!obj) return error("Imagem não encontrada.", 404);

    const headers = new Headers();
    headers.set("content-type", obj.httpMetadata?.contentType ?? "application/octet-stream");
    headers.set("cache-control", obj.httpMetadata?.cacheControl ?? "public, max-age=31536000, immutable");
    if (obj.httpEtag) headers.set("etag", obj.httpEtag);
    return new Response(obj.body, { headers });
  } catch (e) {
    return serverError("GET uploads/:key", e);
  }
};
