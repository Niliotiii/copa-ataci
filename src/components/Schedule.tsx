import { useMemo, useState } from "react";
import MatchShareModal from "./MatchShareModal";
import Select from "./Select";
import SectionHeader from "./SectionHeader";
import { ShareNetwork, MapPin } from "@phosphor-icons/react";
import { useApi } from "../data/useApi";
import type { Match } from "../data/types";
import { LoadingState, ErrorState, EmptyState } from "./States";

function TeamBadge({ abbr, color, crestUrl }: { abbr: string; color: string; crestUrl?: string | null }) {
  return (
    <div
      className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden"
      style={{ background: crestUrl ? "var(--secondary)" : color, fontSize: "11px", fontFamily: "Oswald, sans-serif" }}
    >
      {crestUrl ? <img src={crestUrl} alt="" className="w-full h-full object-contain" /> : abbr}
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

  // Rodada padrão: a 1ª que ainda tem jogo a cumprir (não finalizado). Se todas
  // já estão completas, cai na última rodada.
  const defaultRound = useMemo(() => {
    if (rounds.length === 0) return null;
    const pending = rounds.find((r) =>
      matches.some((m) => m.round === r && m.status !== "finalizado"),
    );
    return pending ?? rounds[rounds.length - 1];
  }, [rounds, matches]);

  const activeRound = selectedRound ?? defaultRound;
  const visible = matches.filter((m) => m.round === activeRound);
  const roundLabel = activeRound != null ? `Rodada ${activeRound}` : "";

  return (
    <>
      <div>
        <SectionHeader
          kicker="Fase de grupos"
          title="Calendário"
          right={
            rounds.length > 0 ? (
              <Select
                className="w-40"
                ariaLabel="Rodada"
                value={activeRound != null ? String(activeRound) : ""}
                onChange={(v) => setSelectedRound(Number(v))}
                options={rounds.map((r) => ({ value: String(r), label: `Rodada ${r}` }))}
              />
            ) : undefined
          }
        />

        {loading && <LoadingState label="Carregando jogos…" rows={4} />}
        {error && <ErrorState message={error} />}
        {!loading && !error && visible.length === 0 && <EmptyState label="Nenhum jogo nesta rodada." />}

        {!loading && !error && visible.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3">
            {visible.map((match) => {
              const isDone = match.status === "finalizado";
              const isLive = match.status === "andamento";
              const badge = isDone
                ? { label: "Encerrado", bg: "rgba(90,102,117,0.15)", color: "var(--muted-foreground)", edge: "var(--muted-foreground)" }
                : isLive
                  ? { label: "Ao vivo", bg: "rgba(217,45,45,0.15)", color: "var(--danger)", edge: "var(--danger)" }
                  : { label: "Próximo", bg: "rgba(11,110,79,0.13)", color: "var(--primary)", edge: "var(--primary)" };
              const aScore = match.teamA.score;
              const bScore = match.teamB.score;
              const aWon = isDone && aScore != null && bScore != null && aScore > bScore;
              const bWon = isDone && aScore != null && bScore != null && bScore > aScore;
              return (
                <div
                  key={match.id}
                  className="group rounded-xl overflow-hidden w-full transition-all hover:-translate-y-0.5"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderLeft: `3px solid ${badge.edge}`,
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {/* Top bar */}
                  <div
                    className="flex items-center justify-between px-4 py-2"
                    style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}
                  >
                    <span className="text-xs font-medium tnum" style={{ color: "var(--muted-foreground)" }}>
                      {match.date} · {match.time}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                        style={{
                          fontSize: "10px",
                          background: badge.bg,
                          color: badge.color,
                          fontFamily: "Oswald, sans-serif",
                        }}
                      >
                        {isLive && (
                          <span className="live-dot inline-block rounded-full" style={{ width: 6, height: 6, background: "var(--danger)" }} aria-hidden />
                        )}
                        {badge.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShareMatch({ match, round: roundLabel })}
                        aria-label={`Compartilhar ${match.teamA.name} contra ${match.teamB.name}`}
                        className="flex items-center justify-center rounded-lg transition-colors"
                        style={{ width: 32, height: 32, color: "var(--muted-foreground)", background: "transparent" }}
                      >
                        <ShareNetwork size={15} weight="bold" aria-hidden />
                      </button>
                    </div>
                  </div>

                  {/* Match body */}
                  <div className="px-4 py-5 flex items-center gap-3">
                    <div className="flex-1 flex flex-col items-center gap-2" style={{ opacity: bWon ? 0.5 : 1 }}>
                      <TeamBadge abbr={match.teamA.abbr ?? "?"} color={match.teamA.color} crestUrl={match.teamA.crestUrl} />
                      <span className="text-xs lg:text-sm text-center leading-tight" style={{ color: "var(--foreground)", fontWeight: aWon ? 700 : 500 }}>
                        {match.teamA.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {aScore !== null ? (
                        <>
                          <span className="text-3xl lg:text-4xl font-bold w-9 text-center tnum" style={{ fontFamily: "Oswald, sans-serif", color: aWon ? "var(--foreground)" : "var(--muted-foreground)" }}>
                            {aScore}
                          </span>
                          <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>–</span>
                          <span className="text-3xl lg:text-4xl font-bold w-9 text-center tnum" style={{ fontFamily: "Oswald, sans-serif", color: bWon ? "var(--foreground)" : "var(--muted-foreground)" }}>
                            {bScore}
                          </span>
                        </>
                      ) : (
                        <span
                          className="inline-flex items-center justify-center rounded-full text-xs font-bold"
                          style={{ width: 34, height: 34, fontFamily: "Oswald, sans-serif", color: "var(--muted-foreground)", background: "var(--secondary)", border: "1px solid var(--border)" }}
                        >
                          VS
                        </span>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col items-center gap-2" style={{ opacity: aWon ? 0.5 : 1 }}>
                      <TeamBadge abbr={match.teamB.abbr ?? "?"} color={match.teamB.color} crestUrl={match.teamB.crestUrl} />
                      <span className="text-xs lg:text-sm text-center leading-tight" style={{ color: "var(--foreground)", fontWeight: bWon ? 700 : 500 }}>
                        {match.teamB.name}
                      </span>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-1.5 px-4 pb-3" style={{ color: "var(--muted-foreground)" }}>
                    <MapPin size={12} weight="bold" aria-hidden />
                    <span className="text-xs">{match.location}</span>
                  </div>
                </div>
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
