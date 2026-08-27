import { jsonMutation, serverError, requireAuth, type PagesContext } from "../_shared";

/**
 * POST /api/admin/verify
 *
 * "Login" do admin: valida o Bearer token contra o ADMIN_TOKEN. Retorna 200
 * {ok:true} se válido; requireAuth devolve 401 caso contrário. Não expõe nada
 * sensível — serve só para o frontend liberar (ou não) o painel.
 */
export const onRequestPost = async (ctx: PagesContext): Promise<Response> => {
  const unauthorized = await requireAuth(ctx);
  if (unauthorized) return unauthorized;
  try {
    return jsonMutation({ ok: true });
  } catch (e) {
    return serverError("POST admin/verify", e);
  }
};
