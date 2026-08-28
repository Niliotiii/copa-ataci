import { useApi } from "../data/useApi";
import type { Suspension } from "../data/types";
import TeamCrest from "./TeamCrest";
import { LoadingState, ErrorState, EmptyState } from "./States";

const REASON_LABEL: Record<Suspension["reason"], string> = {
  vermelho: "Cartão vermelho",
  "3_amarelos": "3 amarelos",
};

// Visualização pública das suspensões. A gestão (dar baixa) fica no painel Admin.
export default function Suspensions() {
  const { data, loading, error } = useApi<Suspension[]>("/api/suspensions");
  const list = data ?? [];

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
              <TeamCrest abbr={s.teamId} color={s.teamColor} crestUrl={s.teamCrest} size={36} />
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
