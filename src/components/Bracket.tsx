import { useApi } from "../data/useApi";
import type { Bracket as BracketData, BracketBox } from "../data/types";
import { Trophy } from "@phosphor-icons/react";
import SectionHeader from "./SectionHeader";
import { LoadingState, ErrorState, EmptyState } from "./States";

function MatchCard({ match, size = "sm" }: { match: BracketBox; size?: "sm" | "lg" }) {
  const isLg = size === "lg";
  return (
    <div
      className="rounded-xl overflow-hidden tnum"
      style={{
        background: "var(--card)",
        border: isLg ? "1px solid var(--accent)" : "1px solid var(--border)",
        width: isLg ? "176px" : "152px",
        boxShadow: isLg ? "var(--shadow-lg)" : "var(--shadow-sm)",
      }}
    >
      {[match.teamA, match.teamB].map((team, idx) => {
        const isWinner = (idx === 0 && match.winner === "A") || (idx === 1 && match.winner === "B");
        return (
          <div
            key={idx}
            className="flex items-center gap-2 px-3 py-2"
            style={{
              borderBottom: idx === 0 ? "1px solid var(--border)" : "none",
              background: isWinner ? "var(--primary-soft)" : "transparent",
              borderLeft: isWinner ? "2px solid var(--primary)" : "2px solid transparent",
            }}
          >
            <div
              className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden"
              style={{
                width: isLg ? "22px" : "18px",
                height: isLg ? "22px" : "18px",
                background: team.crestUrl ? "var(--secondary)" : team.color,
                fontSize: "7px",
                fontFamily: "Oswald, sans-serif",
                fontWeight: 700,
              }}
            >
              {team.crestUrl ? <img src={team.crestUrl} alt="" className="w-full h-full object-contain" /> : (team.abbr ?? "?").slice(0, 3)}
            </div>
            <span
              className="flex-1 truncate"
              style={{
                fontSize: isLg ? "13px" : "11px",
                fontFamily: "Inter, sans-serif",
                color: isWinner ? "var(--foreground)" : "var(--secondary-foreground)",
                fontWeight: isWinner ? 600 : 400,
              }}
            >
              {team.name}
            </span>
            <span
              style={{
                fontSize: isLg ? "16px" : "14px",
                fontFamily: "Oswald, sans-serif",
                fontWeight: 700,
                color: isWinner ? "var(--accent)" : team.score !== null ? "var(--muted-foreground)" : "var(--border)",
                minWidth: "14px",
                textAlign: "right",
              }}
            >
              {team.score !== null ? team.score : "–"}
              {team.pens != null && <span style={{ fontSize: "10px" }}> ({team.pens})</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ColLabel({ label }: { label: string }) {
  return (
    <div
      className="text-xs font-semibold uppercase tracking-widest mb-3 text-center"
      style={{ fontFamily: "Oswald, sans-serif", color: "var(--muted-foreground)", letterSpacing: "0.12em" }}
    >
      {label}
    </div>
  );
}

const CARD_H = 62;
const GAP = 12;
const COL_H = 4 * (CARD_H + GAP) - GAP;

export default function Bracket() {
  const { data, loading, error } = useApi<BracketData>("/api/bracket");

  const quarters = data?.quarters ?? [];
  const semis = data?.semis ?? [];
  const finalMatch = data?.final ?? null;

  return (
    <div>
      <SectionHeader
        kicker="Fase final"
        title="Mata-Mata"
        right={
          <span
            className="text-xs px-3 py-1.5 rounded-full font-semibold uppercase"
            style={{ background: "rgba(200,145,43,0.15)", color: "var(--accent)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em" }}
          >
            2026
          </span>
        }
      />

      {loading && <LoadingState label="Carregando chaveamento…" rows={4} />}
      {error && <ErrorState message={error} />}
      {!loading && !error && quarters.length === 0 && <EmptyState label="Mata-mata ainda não definido." />}

      {!loading && !error && quarters.length > 0 && (
        <>
          <div className="overflow-x-auto lg:overflow-x-visible pb-4" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-0 items-start lg:w-full" style={{ minWidth: "560px" }}>

              {/* Quarterfinals */}
              <div className="flex flex-col" style={{ width: "152px" }}>
                <ColLabel label="Quartas" />
                <div className="flex flex-col" style={{ gap: `${GAP}px` }}>
                  {quarters.map((m) => <MatchCard key={m.id} match={m} />)}
                </div>
              </div>

              {/* Connector Q→S */}
              <div className="flex-none lg:flex-1" style={{ marginTop: "24px" }}>
                <svg
                  width="40"
                  height={COL_H + 24}
                  viewBox={`0 0 40 ${COL_H + 24}`}
                  preserveAspectRatio="none"
                  className="w-10 lg:w-full"
                  style={{ display: "block", height: COL_H + 24 }}
                >
                  <path d={`M0,${CARD_H / 2} H20 V${CARD_H + GAP + CARD_H / 2} H20`} stroke="var(--border)" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
                  <path d={`M20,${(CARD_H + CARD_H + GAP) / 2} H40`} stroke="var(--border)" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
                  <path d={`M0,${2 * (CARD_H + GAP) + CARD_H / 2} H20 V${3 * (CARD_H + GAP) + CARD_H / 2} H20`} stroke="var(--border)" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
                  <path d={`M20,${(2 * (CARD_H + GAP) + 3 * (CARD_H + GAP) + CARD_H) / 2} H40`} stroke="var(--border)" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>

              {/* Semis */}
              <div style={{ width: "152px" }}>
                <ColLabel label="Semifinal" />
                <div style={{ paddingTop: `${(CARD_H + GAP) / 2}px` }} className="flex flex-col">
                  {semis[0] && (
                    <div style={{ marginBottom: `${(CARD_H + GAP) * 2 - CARD_H - GAP}px` }}>
                      <MatchCard match={semis[0]} />
                    </div>
                  )}
                  {semis[1] && <MatchCard match={semis[1]} />}
                </div>
              </div>

              {/* Connector S→F */}
              <div className="flex-none lg:flex-1" style={{ marginTop: "24px" }}>
                <svg
                  width="40"
                  height={COL_H + 24}
                  viewBox={`0 0 40 ${COL_H + 24}`}
                  preserveAspectRatio="none"
                  className="w-10 lg:w-full"
                  style={{ display: "block", height: COL_H + 24 }}
                >
                  <path
                    d={`M0,${(CARD_H + GAP) / 2 + CARD_H / 2} H20 V${(CARD_H + GAP) * 2 + (CARD_H + GAP) / 2 + CARD_H / 2} H20`}
                    stroke="var(--border)" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={`M20,${((CARD_H + GAP) / 2 + CARD_H / 2 + (CARD_H + GAP) * 2 + (CARD_H + GAP) / 2 + CARD_H / 2) / 2} H40`}
                    stroke="var(--border)" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>

              {/* Final */}
              <div style={{ width: "176px" }}>
                <ColLabel label="Final" />
                {finalMatch && (
                  <div style={{ paddingTop: `${(CARD_H + GAP) * 1.5 - CARD_H * 0.5}px` }}>
                    <MatchCard match={finalMatch} size="lg" />
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                      <Trophy size={14} weight="fill" color="var(--accent)" aria-hidden />
                      <span className="text-xs font-semibold" style={{ color: "var(--accent)", fontFamily: "Oswald, sans-serif" }}>Campeão</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
