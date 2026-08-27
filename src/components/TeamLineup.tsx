import { useState } from "react";
import { useApi } from "../data/useApi";
import type { Team, TeamDetail, Player, Position } from "../data/types";
import { textColorOn } from "../data/color";
import { usePath, navigate } from "../router";
import { LoadingState, ErrorState, EmptyState } from "./States";

const positionColors: Record<Position, string> = {
  GOL: "#f59e0b",
  DEF: "#3b82f6",
  ALA: "#8b5cf6",
  MED: "#06b6d4",
  ATA: "#ef4444",
};

const positionLabels: { key: Position; label: string }[] = [
  { key: "GOL", label: "Goleiro" },
  { key: "DEF", label: "Defensores" },
  { key: "ALA", label: "Alas" },
  { key: "MED", label: "Meias" },
  { key: "ATA", label: "Atacantes" },
];

function initials(name: string | undefined | null) {
  if (!name) return "";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2);
}

export default function TeamLineup() {
  const { data: teams, loading: teamsLoading, error: teamsError } = useApi<Team[]>("/api/teams");
  const path = usePath();
  // Time selecionado vem da URL: /times/:id. Sem id → lista de times.
  const m = path.match(/^\/times\/([^/]+)$/);
  const selectedId = m ? decodeURIComponent(m[1]) : null;
  const setSelectedId = (id: string | null) => navigate(id ? `/times/${encodeURIComponent(id)}` : "/times");

  // Só busca o elenco quando um time foi escolhido. Sem seleção, o path aponta
  // para a lista (inofensivo) e a visão de detalhe fica oculta.
  const { data: squad, loading: squadLoading, error: squadError } = useApi<TeamDetail>(
    selectedId ? `/api/teams/${selectedId}` : "/api/teams",
  );

  const byPosition = (pos: Position) => (squad?.players ?? []).filter((p) => p.position === pos);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2
          className="text-xl uppercase tracking-wide"
          style={{ fontFamily: "Oswald, sans-serif", fontWeight: 700, color: "var(--foreground)" }}
        >
          Times
        </h2>
        {selectedId && (
          <button
            onClick={() => setSelectedId(null)}
            className="text-sm px-3 py-1.5 rounded-lg font-semibold"
            style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.04em" }}
          >
            ← Todos os times
          </button>
        )}
      </div>

      {teamsLoading && <LoadingState label="Carregando times…" />}
      {teamsError && <ErrorState message={teamsError} />}

      {/* LISTA DE TIMES (sem seleção) */}
      {!teamsError && !selectedId && teams && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className="rounded-xl p-4 flex items-center gap-3 text-left transition-all hover:brightness-105 active:scale-[0.99]"
              style={{ background: "var(--card)", border: "1px solid var(--border)", cursor: "pointer" }}
              aria-label={`Ver elenco de ${t.name}`}
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                style={{ background: t.color, color: textColorOn(t.color), fontFamily: "Oswald, sans-serif", fontSize: "12px" }}
              >
                {t.abbr}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>{t.name}</div>
                {t.formation && <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{t.formation}</div>}
              </div>
            </button>
          ))}
        </div>
      )}

      {squadError && <ErrorState message={squadError} />}

      {selectedId && !teamsError && !squadError && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Pitch */}
          <div className="flex-1 min-w-0">
            {squadLoading && <LoadingState label="Carregando elenco…" />}

            {!squadLoading && squad && !Array.isArray(squad) && Array.isArray(squad.players) && (
              <>
                {/* Team info strip */}
                <div
                  className="rounded-xl p-3 flex items-center gap-3 mb-4"
                  style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                    style={{ background: squad.color, fontFamily: "Oswald, sans-serif" }}
                  >
                    {initials(squad.name)}
                  </div>
                  <div className="flex-1">
                    <div
                      className="text-base font-bold uppercase tracking-wide"
                      style={{ fontFamily: "Oswald, sans-serif", color: "var(--foreground)" }}
                    >
                      {squad.name}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                      {squad.players.length} jogadores{squad.formation ? ` · ${squad.formation}` : ""}
                    </div>
                  </div>
                </div>

                {/* Society pitch */}
                <div
                  className="relative rounded-2xl overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(180deg,#1a5c2a 0%,#1e6b31 20%,#1a5c2a 40%,#1e6b31 60%,#1a5c2a 80%,#1e6b31 100%)",
                    aspectRatio: "2/3",
                    border: "3px solid #2a7a3a",
                    boxShadow: "inset 0 0 50px rgba(0,0,0,0.4)",
                  }}
                >
                  {/* Field markings */}
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 100 150"
                    preserveAspectRatio="none"
                    style={{ opacity: 0.4 }}
                  >
                    <rect x="4" y="4" width="92" height="142" rx="1" fill="none" stroke="white" strokeWidth="1" />
                    <line x1="4" y1="75" x2="96" y2="75" stroke="white" strokeWidth="1" />
                    <circle cx="50" cy="75" r="10" fill="none" stroke="white" strokeWidth="1" />
                    <circle cx="50" cy="75" r="1" fill="white" />
                    <rect x="24" y="4" width="52" height="18" fill="none" stroke="white" strokeWidth="1" />
                    <rect x="36" y="4" width="28" height="8" fill="none" stroke="white" strokeWidth="1" />
                    <circle cx="50" cy="14" r="1" fill="white" />
                    <rect x="24" y="128" width="52" height="18" fill="none" stroke="white" strokeWidth="1" />
                    <rect x="36" y="138" width="28" height="8" fill="none" stroke="white" strokeWidth="1" />
                    <circle cx="50" cy="136" r="1" fill="white" />
                  </svg>

                  {/* Players — posicionados por coordenadas pos_x / pos_y (PRD 3.4) */}
                  {squad.players.map((player: Player, i) => (
                    <div
                      key={`${player.name}-${i}`}
                      className="absolute flex flex-col items-center"
                      style={{
                        left: `${player.posX}%`,
                        top: `${player.posY}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <div
                        className="rounded-full flex items-center justify-center font-bold border-2 border-white"
                        style={{
                          width: "32px",
                          height: "32px",
                          background: squad.color,
                          color: "#ffffff",
                          fontFamily: "Oswald, sans-serif",
                          fontSize: "11px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
                        }}
                      >
                        {player.number ?? initials(player.name)}
                      </div>
                      <div
                        className="mt-0.5 px-1.5 py-0.5 rounded text-white whitespace-nowrap"
                        style={{
                          fontSize: "8px",
                          fontWeight: 600,
                          background: "rgba(0,0,0,0.7)",
                          fontFamily: "Inter, sans-serif",
                          backdropFilter: "blur(2px)",
                          maxWidth: "56px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {player.name}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Player list by position */}
          {!squadLoading && squad && !Array.isArray(squad) && Array.isArray(squad.players) && (
            <div
              className="w-full lg:w-60 xl:w-64 lg:self-start rounded-xl overflow-hidden"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              {squad.players.length === 0 && <EmptyState label="Elenco não cadastrado." />}
              {positionLabels.map(({ key, label }) => {
                const group = byPosition(key);
                if (group.length === 0) return null;
                return (
                  <div key={key}>
                    <div
                      className="flex items-center gap-2 px-4 py-2"
                      style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}
                    >
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: positionColors[key],
                          color: "#fff",
                          fontFamily: "Oswald, sans-serif",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {key}
                      </span>
                      <span
                        className="text-xs font-semibold uppercase tracking-wider"
                        style={{ fontFamily: "Oswald, sans-serif", color: "var(--muted-foreground)", letterSpacing: "0.08em" }}
                      >
                        {label}
                      </span>
                      <span className="ml-auto text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {group.length}
                      </span>
                    </div>

                    {group.map((p, i) => (
                      <div
                        key={`${p.name}-${i}`}
                        className="flex items-center gap-3 px-4 py-2.5"
                        style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                          style={{ background: squad.color, fontSize: "10px", fontFamily: "Oswald, sans-serif" }}
                        >
                          {p.number ?? initials(p.name)}
                        </div>
                        <span className="text-sm flex-1" style={{ color: "var(--foreground)" }}>
                          {p.name}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
