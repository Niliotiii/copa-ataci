import { useState, useEffect } from "react";
import AdminPanel from "./AdminPanel";
import { useAdminToken, verifyToken, adminStyles, labelClass } from "./admin/shared";

/**
 * Rota /admin: tela de login (valida o token no backend) e, uma vez
 * autenticado, o painel de gerenciamento. Fora do menu do portal.
 */
export default function AdminRoute() {
  const { token, setToken } = useAdminToken();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Revalida um token já guardado na sessão ao abrir /admin.
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (token && (await verifyToken(token))) {
        if (!cancel) setAuthed(true);
      }
      if (!cancel) setChecking(false);
    })();
    return () => {
      cancel = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const ok = await verifyToken(input);
    if (ok) {
      setToken(input);
      setAuthed(true);
    } else {
      setError("Token inválido. Verifique e tente novamente.");
    }
    setSubmitting(false);
  }

  function handleLogout() {
    setToken("");
    setAuthed(false);
    setInput("");
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Carregando…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--background)" }}>
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-2xl p-6" style={{ ...adminStyles.card, boxShadow: "var(--shadow-lg)" }}>
          <div className="flex items-center gap-3 mb-5">
            <img src="/serra-azul.png" alt="Escudo Serra Azul Esporte Clube" width="44" height="44" style={{ display: "block" }} />
            <div>
              <div className="kicker mb-0.5">Acesso restrito</div>
              <h1 className="text-lg uppercase tracking-wider" style={{ fontFamily: "Oswald, sans-serif", color: "var(--foreground)", fontWeight: 700 }}>
                Área do Organizador
              </h1>
            </div>
          </div>

          <label className={labelClass} style={adminStyles.label} htmlFor="admin-token">Token de acesso</label>
          <input
            id="admin-token"
            type="password"
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Cole o token de admin…"
            className="w-full mt-1.5 rounded-lg px-3 py-2.5 text-sm outline-none"
            style={adminStyles.input}
          />

          {error && (
            <div className="mt-3 rounded-lg p-2.5 text-sm" role="alert"
              style={{ background: "rgba(217,45,45,0.1)", border: "1px solid rgba(217,45,45,0.5)", color: "var(--danger)" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting || !input}
            className="w-full mt-4 rounded-xl py-3 font-semibold text-sm uppercase transition-opacity disabled:opacity-50"
            style={{ background: "var(--primary)", color: "#fff", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em", boxShadow: "var(--shadow-md)" }}>
            {submitting ? "Verificando…" : "Entrar"}
          </button>

          <a href="/" className="block text-center text-xs mt-4" style={{ color: "var(--muted-foreground)" }}>
            ← Voltar ao portal
          </a>
        </form>
      </div>
    );
  }

  return <AdminPanel token={token} onLogout={handleLogout} />;
}
