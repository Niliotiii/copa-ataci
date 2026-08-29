import { useState } from "react";
import { ShareNetwork } from "@phosphor-icons/react";
import { useApi } from "../data/useApi";
import type { Team, TeamDetail } from "../data/types";
import { textColorOn } from "../data/color";
import { usePath, navigate } from "../router";
import { useLineupBoard } from "../data/useLineupBoard";
import LineupBoard from "./LineupBoard";
import LineupShareModal from "./LineupShareModal";
import SectionHeader from "./SectionHeader";
import { LoadingState, ErrorState, EmptyState } from "./States";

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

  // Prancheta pública ("Modo Cartola" interativo): estado no navegador, sem salvar no servidor.
  const isTeam = !!squad && !Array.isArray(squad) && Array.isArray(squad.players);
  const teamDetail = isTeam ? (squad as TeamDetail) : null;
  const { board, onField, onBench, moveOnField, sendToBench, sendToField, clearField } = useLineupBoard(
    selectedId,
    teamDetail?.players,
  );
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div>
      <SectionHeader
        kicker="Elencos"
        title="Times"
        right={
          selectedId ? (
            <button
              onClick={() => setSelectedId(null)}
              className="text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors"
              style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.04em" }}
            >
              ← Todos os times
            </button>
          ) : undefined
        }
      />

      {teamsLoading && <LoadingState label="Carregando times…" rows={6} />}
      {teamsError && <ErrorState message={teamsError} />}

      {/* LISTA DE TIMES (sem seleção) */}
      {!teamsError && !selectedId && teams && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className="group rounded-xl p-4 flex items-center gap-3 text-left transition-all hover:-translate-y-0.5 active:scale-[0.99]"
              style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", cursor: "pointer" }}
              aria-label={`Ver elenco de ${t.name}`}
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center font-bold flex-shrink-0 overflow-hidden"
                style={{ background: t.crestUrl ? "var(--secondary)" : t.color, color: textColorOn(t.color), fontFamily: "Oswald, sans-serif", fontSize: "12px" }}
              >
                {t.crestUrl ? <img src={t.crestUrl} alt="" className="w-full h-full object-contain" /> : t.abbr}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>{t.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {squadError && <ErrorState message={squadError} />}

      {selectedId && !teamsError && !squadError && (
        <div>
          {squadLoading && <LoadingState label="Carregando elenco…" />}

          {!squadLoading && teamDetail && (
            <>
              {/* Team info strip + ação de compartilhar */}
              <div
                className="rounded-xl p-3 flex items-center gap-3 mb-4"
                style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 overflow-hidden"
                  style={{ background: teamDetail.crestUrl ? "var(--secondary)" : teamDetail.color, fontFamily: "Oswald, sans-serif" }}
                >
                  {teamDetail.crestUrl ? <img src={teamDetail.crestUrl} alt="" className="w-full h-full object-contain" /> : initials(teamDetail.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-base font-bold uppercase tracking-wide truncate"
                    style={{ fontFamily: "Oswald, sans-serif", color: "var(--foreground)" }}
                  >
                    {teamDetail.name}
                  </div>
                </div>
                {board.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShareOpen(true)}
                    className="flex items-center justify-center rounded-lg flex-shrink-0 transition-colors"
                    style={{ width: 32, height: 32, color: "var(--muted-foreground)", background: "transparent" }}
                    aria-label="Compartilhar escalação"
                  >
                    <ShareNetwork size={15} weight="bold" aria-hidden />
                  </button>
                )}
              </div>

              {teamDetail.players.length === 0 ? (
                <EmptyState label="Elenco não cadastrado." />
              ) : (
                <LineupBoard
                  board={board}
                  onField={onField}
                  onBench={onBench}
                  teamColor={teamDetail.color}
                  onMoveOnField={moveOnField}
                  onSendToBench={sendToBench}
                  onSendToField={sendToField}
                  onClear={clearField}
                />
              )}
            </>
          )}
        </div>
      )}

      {shareOpen && teamDetail && (
        <LineupShareModal
          team={teamDetail}
          onField={onField}
          onBench={onBench}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
