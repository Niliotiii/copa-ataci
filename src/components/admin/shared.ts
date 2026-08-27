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

/** Faz um PUT autenticado com JSON e invalida o cache de /api/ ao dar certo. */
export async function authedPut(
  path: string,
  token: string,
  body: unknown,
): Promise<SaveResult> {
  try {
    const res = await fetch(path, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
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

// Estilos compartilhados das seções do admin.
export const adminStyles = {
  label: { fontFamily: "Oswald, sans-serif", color: "var(--muted-foreground)", letterSpacing: "0.08em" },
  input: {
    background: "var(--secondary)",
    color: "var(--foreground)",
    border: "1px solid var(--border)",
    fontFamily: "Inter, sans-serif",
  },
  card: { background: "var(--card)", border: "1px solid var(--border)" },
};

export const labelClass = "text-xs font-semibold uppercase tracking-wider";
