import { jsonMutation, error, serverError, requireAuth, type PagesContext } from "./_shared";

// Tipos de imagem aceitos e suas extensões.
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB (R2 aguenta mais do que o data URI)

/**
 * POST /api/uploads (PROTEGIDO) — recebe uma imagem no corpo (bytes crus, com
 * o header content-type do arquivo) e grava no bucket R2. Retorna a URL pública
 * servida por GET /api/uploads/:key.
 */
export const onRequestPost = async (ctx: PagesContext): Promise<Response> => {
  const unauthorized = await requireAuth(ctx);
  if (unauthorized) return unauthorized;

  try {
    if (!ctx.env.MEDIA) return error("Armazenamento de imagens não configurado (R2).", 500);

    const contentType = (ctx.request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const ext = ALLOWED[contentType];
    if (!ext) return error("Tipo de imagem inválido (PNG/JPEG/WebP/GIF).", 400);

    const bytes = await ctx.request.arrayBuffer();
    if (bytes.byteLength === 0) return error("Arquivo vazio.", 400);
    if (bytes.byteLength > MAX_BYTES) return error("Imagem muito grande (máx. 2MB).", 400);

    // Chave única (evita colisão e cache velho).
    const key = `${crypto.randomUUID()}.${ext}`;
    await ctx.env.MEDIA.put(key, bytes, {
      httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
    });

    return jsonMutation({ ok: true, url: `/api/uploads/${key}` });
  } catch (e) {
    return serverError("POST uploads", e);
  }
};
