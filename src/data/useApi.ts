import { useEffect, useState } from "react";

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook simples de fetch para os endpoints das Pages Functions (/api/*).
 * Faz cache em memória por URL para evitar refetch entre trocas de aba.
 */
const cache = new Map<string, unknown>();

/** Limpa o cache em memória. Sem argumento, limpa tudo; com prefixo, só as
 *  URLs que começam com ele. Dispara um evento para hooks montados revalidarem. */
export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
  } else {
    for (const key of Array.from(cache.keys())) {
      if (key.startsWith(prefix)) cache.delete(key);
    }
  }
  window.dispatchEvent(new CustomEvent("api:invalidate", { detail: { prefix } }));
}

export function useApi<T>(path: string): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>(() => ({
    data: (cache.get(path) as T) ?? null,
    loading: !cache.has(path),
    error: null,
  }));

  useEffect(() => {
    let cancelled = false;
    // Token de request: só a resposta mais recente pode atualizar o estado,
    // evitando que um refetch antigo (mais lento) sobrescreva um mais novo.
    let loadId = 0;

    async function load(force = false) {
      if (!force && cache.has(path)) {
        setState({ data: cache.get(path) as T, loading: false, error: null });
        return;
      }
      const myId = ++loadId;
      setState((s) => ({ data: s.data, loading: true, error: null }));
      try {
        const res = await fetch(path);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as T;
        if (cancelled || myId !== loadId) return; // resposta obsoleta: ignora
        cache.set(path, data);
        setState({ data, loading: false, error: null });
      } catch (err) {
        if (cancelled || myId !== loadId) return;
        // Preserva o último data bom para não "piscar" para vazio em erro.
        setState((s) => ({ data: s.data, loading: false, error: (err as Error).message }));
      }
    }

    load();

    // Revalida quando o cache é invalidado para uma URL que casa com este path.
    function onInvalidate(e: Event) {
      const prefix = (e as CustomEvent<{ prefix?: string }>).detail?.prefix;
      if (!prefix || path.startsWith(prefix)) {
        load(true);
      }
    }
    window.addEventListener("api:invalidate", onInvalidate);

    return () => {
      cancelled = true;
      window.removeEventListener("api:invalidate", onInvalidate);
    };
  }, [path]);

  return state;
}
