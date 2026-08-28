import { useApi } from "../data/useApi";
import type { Scorer } from "../data/types";
import TeamCrest from "./TeamCrest";
import { LoadingState, ErrorState, EmptyState } from "./States";

export default function Scorers() {
  const { data, loading, error } = useApi<Scorer[]>("/api/scorers");
  const scorers = data ?? [];

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl uppercase tracking-wide" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 700, color: "var(--foreground)" }}>
          Artilharia
        </h2>
      </div>

      {loading && <LoadingState label="Carregando artilharia…" />}
      {error && <ErrorState message={error} />}
      {!loading && !error && scorers.length === 0 && <EmptyState label="Nenhum gol registrado ainda." />}

      {!loading && !error && scorers.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full border-collapse" style={{ fontFamily: "Inter, sans-serif" }}>
            <caption className="sr-only">Artilheiros do torneio</caption>
            <thead>
              <tr className="text-xs font-semibold uppercase"
                style={{ background: "var(--secondary)", color: "var(--muted-foreground)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.08em" }}>
                <th scope="col" className="text-left px-3 py-2.5 w-10">#</th>
                <th scope="col" className="text-left py-2.5">Jogador</th>
                <th scope="col" className="text-left py-2.5">Time</th>
                <th scope="col" className="text-center py-2.5 w-14 pr-3">Gols</th>
              </tr>
            </thead>
            <tbody>
              {scorers.map((s, i) => (
                <tr key={`${s.playerId}-${i}`} style={{ background: i % 2 === 0 ? "var(--card)" : "var(--secondary)" }}>
                  <th scope="row" className="text-left px-3 py-3 text-sm font-bold"
                    style={{ fontFamily: "Oswald, sans-serif", color: i === 0 ? "var(--accent)" : "var(--muted-foreground)" }}>
                    {i + 1}
                  </th>
                  <td className="py-3 text-sm font-medium" style={{ color: "var(--foreground)" }}>{s.playerName}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <TeamCrest abbr={s.teamId} color={s.teamColor} crestUrl={s.teamCrest} size={24} fontSize={9} />
                      <span className="text-sm truncate" style={{ color: "var(--muted-foreground)" }}>{s.teamName ?? s.teamId}</span>
                    </span>
                  </td>
                  <td className="text-center py-3 pr-3 text-lg font-bold" style={{ fontFamily: "Oswald, sans-serif", color: "var(--accent)" }}>{s.goals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
