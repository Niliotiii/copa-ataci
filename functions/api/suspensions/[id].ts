import { jsonMutation, error, serverError, requireAuth, type PagesContext } from "../_shared";

// PUT /api/suspensions/:id — marca a suspensão como cumprida/pendente (PROTEGIDO).
// Corpo: { served: boolean }
export const onRequestPut = async (ctx: PagesContext): Promise<Response> => {
  const unauthorized = await requireAuth(ctx);
  if (unauthorized) return unauthorized;

  try {
    const id = Number(ctx.params.id);
    if (!Number.isInteger(id)) return error("ID inválido.", 400);

    let body: { served?: unknown };
    try {
      body = (await ctx.request.json()) as { served?: unknown };
    } catch {
      return error("Corpo JSON inválido.", 400);
    }
    if (typeof body.served !== "boolean") return error("Campo 'served' deve ser booleano.", 400);

    const existing = await ctx.env.DB.prepare("SELECT id FROM suspensions WHERE id = ?;")
      .bind(id)
      .first();
    if (!existing) return error("Suspensão não encontrada.", 404);

    await ctx.env.DB.prepare(
      `UPDATE suspensions SET served = ?, served_at = ? WHERE id = ?;`,
    )
      .bind(body.served ? 1 : 0, body.served ? new Date().toISOString() : null, id)
      .run();

    return jsonMutation({ ok: true });
  } catch (e) {
    return serverError("PUT suspensions/:id", e);
  }
};
