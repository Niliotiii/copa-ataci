import { useMemo, useState } from "react";
import MatchShareModal from "./MatchShareModal";
import { useApi } from "../data/useApi";
import type { Match } from "../data/types";
import { LoadingState, ErrorState, EmptyState } from "./States";

function TeamBadge({ abbr, color }: { abbr: string; color: string }) {
  return (
    <div
      className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ background: color, fontSize: "11px", fontFamily: "Oswald, sans-serif" }}
    >
      {abbr}
    </div>
  );
}

export default function Schedule() {
  const { data, loading, error } = useApi<Match[]>("/api/matches?phase=grupos");
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [shareMatch, setShareMatch] = useState<{ match: Match; round: string } | null>(null);

  const matches = data ?? [];

  // Rodadas disponíveis, ordenadas.
  const rounds = useMemo(() => {
    const set = new Set<number>();
    matches.forEach((m) => m.round != null && set.add(m.round));
    return Array.from(set).sort((a, b) => a - b);
  }, [matches]);

  const activeRound = selectedRound ?? rounds[0] ?? null;
  const visible = matches.filter((m) => m.round === activeRound);
  const roundLabel = activeRound != null ? `Rodada ${activeRound}` : "";

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl uppercase tracking-wide" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 700, color: "var(--foreground)" }}>
              Calendário
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>Society 7x7 · Fase de Grupos</p>
          </div>
          {rounds.length > 0 && (
            <select
              value={activeRound ?? ""}
              onChange={(e) => setSelectedRound(Number(e.target.value))}
              className="text-sm rounded-lg px-3 py-1.5 outline-none cursor-pointer"
              style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", fontFamily: "Inter, sans-serif" }}
            >
              {rounds.map((r) => <option key={r} value={r}>Rodada {r}</option>)}
            </select>
          )}
        </div>

        {loading && <LoadingState label="Carregando jogos…" />}
        {error && <ErrorState message={error} />}
        {!loading && !error && visible.length === 0 && <EmptyState label="Nenhum jogo nesta rodada." />}

        {!loading && !error && visible.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {visible.map((match) => {
              const isDone = match.status === "finalizado";
              return (
                <button
                  key={match.id}
                  className="rounded-xl overflow-hidden text-left w-full transition-all hover:scale-[1.01] hover:brightness-110 active:scale-[0.99]"
                  style={{ background: "var(--card)", border: "1px solid var(--border)", cursor: "pointer" }}
                  aria-label={`Compartilhar jogo ${match.teamA.name} contra ${match.teamB.name}`}
                  onClick={() => setShareMatch({ match, round: roundLabel })}
                >
                  {/* Top bar */}
                  <div
                    className="flex items-center justify-between px-4 py-2"
                    style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}
                  >
                    <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                      {match.date} · {match.time}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                        style={{
                          fontSize: "10px",
                          background: isDone ? "rgba(107,114,128,0.2)" : "rgba(22,163,74,0.15)",
                          color: isDone ? "var(--muted-foreground)" : "var(--primary)",
                          fontFamily: "Oswald, sans-serif",
                        }}
                      >
                        {isDone ? "Encerrado" : "Próximo"}
                      </span>
                      <span style={{ color: "var(--muted-foreground)", opacity: 0.6 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                      </span>
                    </div>
                  </div>

                  {/* Match body */}
                  <div className="px-4 py-5 flex items-center gap-3">
                    <div className="flex-1 flex flex-col items-center gap-2">
                      <TeamBadge abbr={match.teamA.abbr ?? "?"} color={match.teamA.color} />
                      <span className="text-xs lg:text-sm text-center font-medium leading-tight" style={{ color: "var(--foreground)" }}>
                        {match.teamA.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {match.teamA.score !== null ? (
                        <>
                          <span className="text-3xl lg:text-4xl font-bold w-9 text-center" style={{ fontFamily: "Oswald, sans-serif", color: "var(--foreground)" }}>
                            {match.teamA.score}
                          </span>
                          <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>–</span>
                          <span className="text-3xl lg:text-4xl font-bold w-9 text-center" style={{ fontFamily: "Oswald, sans-serif", color: "var(--foreground)" }}>
                            {match.teamB.score}
                          </span>
                        </>
                      ) : (
                        <span className="text-xl font-bold px-3" style={{ fontFamily: "Oswald, sans-serif", color: "var(--border)" }}>VS</span>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col items-center gap-2">
                      <TeamBadge abbr={match.teamB.abbr ?? "?"} color={match.teamB.color} />
                      <span className="text-xs lg:text-sm text-center font-medium leading-tight" style={{ color: "var(--foreground)" }}>
                        {match.teamB.name}
                      </span>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-1.5 px-4 pb-3" style={{ color: "var(--muted-foreground)" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span className="text-xs">{match.location}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {shareMatch && (
        <MatchShareModal
          match={shareMatch.match}
          round={shareMatch.round}
          onClose={() => setShareMatch(null)}
        />
      )}
    </>
  );
}
