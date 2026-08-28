import { json, jsonMutation, error, serverError, requireAuth, validateImageDataUri, type PagesContext } from "./_shared";

// GET /api/sponsors
export const onRequestGet = async (ctx: PagesContext): Promise<Response> => {
  try {
    const { results } = await ctx.env.DB.prepare(
      `SELECT name, initials, color, tagline, logo_url AS logoUrl, link_url AS linkUrl
         FROM sponsors
        ORDER BY sort_order ASC, id ASC;`,
    ).all();
    return json(results ?? []);
  } catch (e) {
    return serverError("GET sponsors", e);
  }
};

type SponsorInput = {
  name?: unknown;
  initials?: unknown;
  color?: unknown;
  tagline?: unknown;
  logoUrl?: unknown;
  linkUrl?: unknown;
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function validateSponsor(s: SponsorInput, i: number): string | null {
  if (typeof s.name !== "string" || s.name.trim() === "") return `patrocinador ${i}: name inválido.`;
  if (typeof s.initials !== "string" || !/^.{1,4}$/.test(s.initials.trim()))
    return `patrocinador ${i}: initials inválido (1-4 caracteres).`;
  if (typeof s.color !== "string" || !HEX_COLOR.test(s.color))
    return `patrocinador ${i}: color inválido (#rrggbb).`;
  if (s.tagline != null && typeof s.tagline !== "string")
    return `patrocinador ${i}: tagline inválido.`;
  if (typeof s.logoUrl === "string" && s.logoUrl.startsWith("data:")) {
    const imgErr = validateImageDataUri(s.logoUrl, `patrocinador ${i}: logo`);
    if (imgErr) return imgErr;
  } else if (s.logoUrl != null && typeof s.logoUrl !== "string") {
    return `patrocinador ${i}: logo inválido.`;
  }
  // Link opcional: quando presente, precisa ser uma URL http(s) válida.
  if (s.linkUrl != null && s.linkUrl !== "") {
    if (typeof s.linkUrl !== "string") return `patrocinador ${i}: link inválido.`;
    let u: URL;
    try {
      u = new URL(s.linkUrl);
    } catch {
      return `patrocinador ${i}: link deve ser uma URL válida (https://…).`;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:")
      return `patrocinador ${i}: link deve começar com http:// ou https://.`;
  }
  return null;
}

// PUT /api/sponsors — substitui a lista inteira de patrocinadores (PROTEGIDO).
// Corpo: { sponsors: [{ name, initials, color, tagline? }, ...] }
export const onRequestPut = async (ctx: PagesContext): Promise<Response> => {
  const unauthorized = await requireAuth(ctx);
  if (unauthorized) return unauthorized;

  try {
    let body: { sponsors?: unknown };
    try {
      body = (await ctx.request.json()) as { sponsors?: unknown };
    } catch {
      return error("Corpo JSON inválido.", 400);
    }

    if (!Array.isArray(body.sponsors)) {
      return error("Campo 'sponsors' deve ser um array.", 400);
    }
    const sponsors = body.sponsors as SponsorInput[];

    for (let i = 0; i < sponsors.length; i++) {
      const err = validateSponsor(sponsors[i], i);
      if (err) return error(err, 400);
    }

    // Substitui a lista atomicamente: DELETE + INSERTs num único batch.
    const insertStmt = ctx.env.DB.prepare(
      `INSERT INTO sponsors (name, initials, color, tagline, logo_url, link_url, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
    );
    const statements = [
      ctx.env.DB.prepare("DELETE FROM sponsors;"),
      ...sponsors.map((s, i) =>
        insertStmt.bind(
          (s.name as string).trim(),
          (s.initials as string).trim(),
          s.color as string,
          (s.tagline as string | undefined) ?? null,
          (s.logoUrl as string | undefined) ?? null,
          (s.linkUrl as string | undefined)?.trim() || null,
          i + 1,
        ),
      ),
    ];
    await ctx.env.DB.batch(statements);

    const { results } = await ctx.env.DB.prepare(
      `SELECT name, initials, color, tagline, logo_url AS logoUrl, link_url AS linkUrl FROM sponsors ORDER BY sort_order ASC, id ASC;`,
    ).all();

    return jsonMutation({ ok: true, count: (results ?? []).length, sponsors: results ?? [] });
  } catch (e) {
    return serverError("PUT sponsors", e);
  }
};
