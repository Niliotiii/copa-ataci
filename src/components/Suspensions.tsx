import { useState } from "react";
import { useApi, invalidateCache } from "../data/useApi";
import type { Suspension } from "../data/types";
import { textColorOn } from "../data/color";
import { LoadingState, ErrorState, EmptyState } from "./States";

const REASON_LABEL: Record<Suspension["reason"], string> = {
  vermelho: "Cartão vermelho",
  "3_amarelos": "3 amarelos",
};

export default function Suspensions() {
  const { data, loading, error } = useApi<Suspension[]>("/api/suspensions");
  const list = data ?? [];
  // Token de admin (se presente na sessão) habilita dar baixa.
  const token = sessionStorage.getItem("copa-ataci-admin-token") ?? "";
  const [busy, setBusy] = useState<number | null>(null);

  async function markServed(id: number) {
    if (!token) return;
    setBusy(id);
    try {
      await fetch(`/api/suspensions/${id}`, {
        method: "PUT",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ served: true }),
      });
      invalidateCache("/api/suspensions");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl uppercase tracking-wide" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 700, color: "var(--foreground)" }}>
          Suspensões
        </h2>
      </div>

      {loading && <LoadingState label="Carregando suspensões…" />}
      {error && <ErrorState message={error} />}
      {!loading && !error && list.length === 0 && <EmptyState label="Nenhum jogador suspenso no momento." />}

      {!loading && !error && list.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
          {list.map((s) => (
            <div key={s.id} className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: s.teamColor ?? "#6b7280", color: textColorOn(s.teamColor ?? "#6b7280"), fontFamily: "Oswald, sans-serif" }}>
                {s.teamId}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>
                  {s.playerName}{s.playerNumber != null ? ` · #${s.playerNumber}` : ""}
                </div>
                <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {s.teamName ?? s.teamId} · {REASON_LABEL[s.reason]}
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full font-semibold uppercase"
                style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", fontFamily: "Oswald, sans-serif", fontSize: "10px" }}>
                Suspenso
              </span>
              {token && (
                <button onClick={() => markServed(s.id)} disabled={busy === s.id}
                  className="text-xs px-3 py-2 rounded-lg font-semibold uppercase disabled:opacity-50"
                  style={{ background: "var(--primary)", color: "#fff", fontFamily: "Oswald, sans-serif", letterSpacing: "0.04em" }}>
                  {busy === s.id ? "…" : "Cumprida"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
