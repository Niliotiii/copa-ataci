import { useEffect, useState } from "react";

/**
 * Roteador mínimo baseado na History API — sem dependências externas.
 * Mantém o bundle enxuto e integra com o SPA fallback do Cloudflare Pages
 * (qualquer path serve index.html; o React decide o que renderizar).
 */

/** Normaliza o path: remove barra final (exceto raiz). */
export function normalizePath(path: string): string {
  const p = path.replace(/\/+$/, "");
  return p === "" ? "/" : p;
}

/** Navega para um novo path via pushState e notifica os assinantes. */
export function navigate(to: string, opts: { replace?: boolean } = {}): void {
  const path = normalizePath(to);
  if (normalizePath(window.location.pathname) === path) return;
  if (opts.replace) window.history.replaceState({}, "", path);
  else window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
}

/** Hook que retorna o path atual e re-renderiza ao mudar (pushState/popstate). */
export function usePath(): string {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname));
  useEffect(() => {
    const onPop = () => setPath(normalizePath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}
