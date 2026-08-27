/// <reference types="@cloudflare/workers-types" />

// Binding do D1 configurado no wrangler.toml (database_id / binding = "DB")
export interface Env {
  DB: D1Database;
  // Secret usado para autenticar chamadas de escrita.
  // Definir com: npx wrangler pages secret put ADMIN_TOKEN
  // Em dev local, definir em .dev.vars (ADMIN_TOKEN=...).
  ADMIN_TOKEN?: string;
}

// Contexto das Pages Functions
export type PagesContext = EventContext<Env, string, unknown>;

/**
 * Valida o header Authorization: Bearer <token> contra o ADMIN_TOKEN do env.
 * Retorna null se autorizado, ou uma Response de erro (401/500) caso contrário.
 *
 * Comparação em tempo constante REAL: compara digests HMAC-SHA-256 dos dois
 * valores via crypto.subtle, eliminando vazamento por tamanho/prefixo. Async
 * por causa do WebCrypto.
 */
export async function requireAuth(ctx: PagesContext): Promise<Response | null> {
  const expected = ctx.env.ADMIN_TOKEN;
  if (!expected) {
    return error("Autenticação não configurada no servidor.", 500);
  }
  const header = ctx.request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  // startsWith é case-sensitive de propósito (esquema "Bearer" canônico).
  const provided = header.startsWith(prefix) ? header.slice(prefix.length) : "";

  if (!(await timingSafeEqual(provided, expected))) {
    return error("Não autorizado.", 401);
  }
  return null;
}

/**
 * Igualdade em tempo constante comparando HMACs dos valores com uma chave
 * aleatória por processo. A chave é gerada preguiçosamente na 1ª chamada — o
 * workerd proíbe I/O assíncrono e geração de aleatoriedade no escopo global.
 */
let hmacKeyPromise: Promise<CryptoKey> | null = null;
function getHmacKey(): Promise<CryptoKey> {
  if (!hmacKeyPromise) {
    hmacKeyPromise = crypto.subtle.generateKey(
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    ) as Promise<CryptoKey>;
  }
  return hmacKeyPromise;
}

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const key = await getHmacKey();
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.sign("HMAC", key, enc.encode(a)),
    crypto.subtle.sign("HMAC", key, enc.encode(b)),
  ]);
  const va = new Uint8Array(da);
  const vb = new Uint8Array(db);
  if (va.length !== vb.length) return false;
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

// Cache curto no edge para LEITURAS (PRD: TTL curto em dia de jogo).
const READ_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=60, s-maxage=60",
};

// Respostas de MUTAÇÃO nunca devem ser cacheadas.
const MUTATION_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

/** Resposta JSON para GET (cacheável no edge). */
export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...READ_HEADERS, ...(init.headers ?? {}) },
  });
}

/** Resposta JSON para PUT/POST/DELETE (no-store). */
export function jsonMutation(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...MUTATION_HEADERS, ...(init.headers ?? {}) },
  });
}

/**
 * Erro "de negócio" seguro para expor (validação/auth/404). A mensagem é
 * controlada por nós — pode ir ao cliente.
 */
export function error(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/**
 * Erro inesperado (ex.: falha de SQL). Loga o detalhe no servidor e devolve
 * uma mensagem GENÉRICA ao cliente — não vaza SQL/stack.
 */
export function serverError(context: string, e: unknown): Response {
  console.error(`[copa-ataci] ${context}:`, e);
  return new Response(JSON.stringify({ error: "Erro interno. Tente novamente." }), {
    status: 500,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

// ---------------------------------------------------------------------------
// Helpers de mapeamento reutilizados por matches.ts e bracket.ts.
// ---------------------------------------------------------------------------
const DEFAULT_COLOR = "#6b7280";
const DEFAULT_NAME = "A definir";

export type TeamSide = {
  abbr: string | null;
  name: string;
  color: string;
  score: number | null;
};

/** Monta o lado de um confronto a partir de colunas cruas do join. */
export function teamSide(opts: {
  abbr: unknown;
  name: unknown;
  color: unknown;
  placeholder: unknown;
  score: unknown;
}): TeamSide {
  return {
    abbr: (opts.abbr as string) ?? null,
    name: (opts.name as string) ?? (opts.placeholder as string) ?? DEFAULT_NAME,
    color: (opts.color as string) ?? DEFAULT_COLOR,
    score: (opts.score as number) ?? null,
  };
}
