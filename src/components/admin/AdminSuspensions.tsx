import { useState } from "react";
import { useApi } from "../../data/useApi";
import type { Suspension } from "../../data/types";
import { textColorOn } from "../../data/color";
import { LoadingState, ErrorState, EmptyState } from "../States";
import { authedPut, adminStyles, labelClass } from "./shared";

const REASON_LABEL: Record<Suspension["reason"], string> = {
  vermelho: "Cartão vermelho",
  "3_amarelos": "3 amarelos",
};

/** Gestão de suspensões dentro do Admin: dá baixa (marca como cumprida). */
export default function AdminSuspensions({ token }: { token: string }) {
  const { data, loading, error } = useApi<Suspension[]>("/api/suspensions");
  const list = data ?? [];
  const [busy, setBusy] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function markServed(id: number) {
    if (!token) return;
    setBusy(id);
    setFeedback(null);
    const res = await authedPut(`/api/suspensions/${id}`, token, { served: true });
    setFeedback(res.ok ? "Suspensão marcada como cumprida." : res.error);
    setBusy(null);
  }

  return (
    <div className="rounded-xl p-4" style={adminStyles.card}>
      <label className={labelClass} style={adminStyles.label}>Suspensões pendentes</label>

      <div className="mt-3">
        {loading && <LoadingState label="Carregando suspensões…" />}
        {error && <ErrorState message={error} />}
        {!loading && !error && list.length === 0 && <EmptyState label="Nenhum jogador suspenso no momento." />}

        {!loading && !error && list.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
            {list.map((s) => (
              <div key={s.id} className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
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
                <button onClick={() => markServed(s.id)} disabled={busy === s.id || !token}
                  className="text-xs px-3 py-2 rounded-lg font-semibold uppercase disabled:opacity-50"
                  style={{ background: "var(--primary)", color: "#fff", fontFamily: "Oswald, sans-serif", letterSpacing: "0.04em" }}>
                  {busy === s.id ? "…" : "Cumprida"}
                </button>
              </div>
            ))}
          </div>
        )}

        {feedback && (
          <div className="mt-3 rounded-lg p-3 text-sm" role="status" aria-live="polite"
            style={{ background: "rgba(22,163,74,0.1)", border: "1px solid var(--primary)", color: "var(--primary)" }}>
            {feedback}
          </div>
        )}
      </div>
    </div>
  );
}
