import { useApi } from "../data/useApi";
import type { Scorer } from "../data/types";
import TeamCrest from "./TeamCrest";
import SectionHeader from "./SectionHeader";
import { LoadingState, ErrorState, EmptyState } from "./States";

// Cores das medalhas do pódio (1º/2º/3º).
const MEDAL = ["#c8912b", "#9aa4b2", "#b06a34"];

export default function Scorers() {
  const { data, loading, error } = useApi<Scorer[]>("/api/scorers");
  const scorers = data ?? [];

  return (
    <div>
      <SectionHeader kicker="Goleadores" title="Artilharia" />

      {loading && <LoadingState label="Carregando artilharia…" rows={6} />}
      {error && <ErrorState message={error} />}
      {!loading && !error && scorers.length === 0 && <EmptyState label="Nenhum gol registrado ainda." />}

      {!loading && !error && scorers.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <table className="w-full border-collapse tnum" style={{ fontFamily: "Inter, sans-serif" }}>
            <caption className="sr-only">Artilheiros do torneio</caption>
            <thead>
              <tr className="text-xs font-semibold uppercase"
                style={{ background: "var(--secondary)", color: "var(--muted-foreground)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.08em" }}>
                <th scope="col" className="text-left px-3 py-2.5 w-12">#</th>
                <th scope="col" className="text-left py-2.5">Jogador</th>
                <th scope="col" className="text-left py-2.5">Time</th>
                <th scope="col" className="text-center py-2.5 w-14 pr-3">Gols</th>
              </tr>
            </thead>
            <tbody>
              {scorers.map((s, i) => {
                const medal = i < 3 ? MEDAL[i] : null;
                return (
                  <tr key={`${s.playerId}-${i}`} style={{ background: i % 2 === 0 ? "var(--card)" : "var(--secondary)" }}>
                    <th scope="row" className="text-left px-3 py-3">
                      <span
                        className="inline-flex items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          width: 24, height: 24,
                          fontFamily: "Oswald, sans-serif",
                          background: medal ?? "transparent",
                          color: medal ? "#fff" : "var(--muted-foreground)",
                        }}
                      >
                        {i + 1}
                      </span>
                    </th>
                    <td className="py-3 text-sm font-medium" style={{ color: "var(--foreground)" }}>{s.playerName}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <TeamCrest abbr={s.teamId} color={s.teamColor} crestUrl={s.teamCrest} size={24} fontSize={9} />
                        <span className="text-sm truncate" style={{ color: "var(--muted-foreground)" }}>{s.teamName ?? s.teamId}</span>
                      </span>
                    </td>
                    <td className="text-center py-3 pr-3 text-lg font-bold tnum" style={{ fontFamily: "Oswald, sans-serif", color: "var(--accent)" }}>{s.goals}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
