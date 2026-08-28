import { useState, useCallback } from "react";
import { invalidateCache } from "../../data/useApi";

const TOKEN_KEY = "copa-ataci-admin-token";

/** Token de admin compartilhado entre as seções (persistido só na sessão). */
export function useAdminToken() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? "");

  const persist = useCallback((value: string) => {
    setToken(value);
    if (value) sessionStorage.setItem(TOKEN_KEY, value);
    else sessionStorage.removeItem(TOKEN_KEY);
  }, []);

  return { token, setToken: persist };
}

export type SaveResult = { ok: true } | { ok: false; error: string };

/** Valida o token de admin no backend (login). Retorna true se aceito. */
export async function verifyToken(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: "{}",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Faz um PUT autenticado com JSON e invalida o cache de /api/ ao dar certo. */
export async function authedPut(
  path: string,
  token: string,
  body: unknown,
): Promise<SaveResult> {
  return authedMutation("PUT", path, token, body);
}

/** Faz um POST autenticado com JSON e invalida o cache de /api/ ao dar certo. */
export async function authedPost(
  path: string,
  token: string,
  body: unknown,
): Promise<SaveResult> {
  return authedMutation("POST", path, token, body);
}

async function authedMutation(
  method: "PUT" | "POST" | "DELETE",
  path: string,
  token: string,
  body?: unknown,
): Promise<SaveResult> {
  try {
    const res = await fetch(path, {
      method,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) return { ok: false, error: "Token inválido ou ausente." };
      return { ok: false, error: data.error ?? `Falha (HTTP ${res.status}).` };
    }
    invalidateCache("/api/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** DELETE autenticado; invalida o cache ao dar certo. */
export async function authedDelete(path: string, token: string): Promise<SaveResult> {
  return authedMutation("DELETE", path, token);
}

// Estilos compartilhados das seções do admin.
export const adminStyles = {
  label: { fontFamily: "Oswald, sans-serif", color: "var(--muted-foreground)", letterSpacing: "0.08em" },
  input: {
    background: "var(--secondary)",
    color: "var(--foreground)",
    border: "1px solid var(--border)",
    fontFamily: "Inter, sans-serif",
  },
  card: { background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" },
};

export const labelClass = "text-xs font-semibold uppercase tracking-wider";
