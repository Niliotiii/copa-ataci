import { useApi } from "../data/useApi";
import type { StandingRow } from "../data/types";
import { textColorOn } from "../data/color";
import { LoadingState, ErrorState, EmptyState } from "./States";

function TeamAvatar({ abbr, color }: { abbr: string; color: string }) {
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center font-bold flex-shrink-0"
      style={{ background: color, color: textColorOn(color), fontSize: "9px", fontFamily: "Oswald, sans-serif" }}
    >
      {abbr}
    </div>
  );
}

export default function Standings() {
  const { data, loading, error } = useApi<StandingRow[]>("/api/standings");

  const teams = data ?? [];
  const totalMatches = teams.reduce((acc, t) => acc + t.j, 0) / 2;
  const totalGoals = teams.reduce((acc, t) => acc + t.gp, 0);
  const avgGoals = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(1) : "0";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2
            className="text-xl uppercase tracking-wide"
            style={{ fontFamily: "Oswald, sans-serif", fontWeight: 700, color: "var(--foreground)" }}
          >
            Classificação
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>Society 7x7 · Fase de Grupos</p>
        </div>
        <span className="text-xs px-2 py-1 rounded" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
          Temporada 2026
        </span>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--primary)" }} />
          Classificado para Mata-Mata (Top 4)
        </span>
      </div>

      {loading && <LoadingState label="Calculando classificação…" />}
      {error && <ErrorState message={error} />}
      {!loading && !error && teams.length === 0 && <EmptyState label="Nenhum jogo finalizado ainda." />}

      {!loading && !error && teams.length > 0 && (
        <>
          {/* Tabela semântica: colunas extras (V/E/D/GP) escondidas no mobile. */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full border-collapse" style={{ fontFamily: "Inter, sans-serif" }}>
              <caption className="sr-only">Classificação da fase de grupos</caption>
              <thead>
                <tr
                  className="text-xs font-semibold uppercase"
                  style={{ background: "var(--secondary)", color: "var(--muted-foreground)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.08em" }}
                >
                  <th scope="col" className="text-left px-3 py-2.5 w-10">Pos</th>
                  <th scope="col" className="text-left py-2.5">Time</th>
                  <th scope="col" className="text-center py-2.5 w-11"><abbr title="Pontos">PTS</abbr></th>
                  <th scope="col" className="text-center py-2.5 w-8"><abbr title="Jogos">J</abbr></th>
                  <th scope="col" className="hidden lg:table-cell text-center py-2.5 w-8"><abbr title="Vitórias">V</abbr></th>
                  <th scope="col" className="hidden lg:table-cell text-center py-2.5 w-8"><abbr title="Empates">E</abbr></th>
                  <th scope="col" className="hidden lg:table-cell text-center py-2.5 w-8"><abbr title="Derrotas">D</abbr></th>
                  <th scope="col" className="text-center py-2.5 w-9"><abbr title="Saldo de gols">SG</abbr></th>
                  <th scope="col" className="hidden lg:table-cell text-center py-2.5 w-9 pr-3"><abbr title="Gols pró">GP</abbr></th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, i) => {
                  const isQualified = team.pos <= 4;
                  const sgColor = team.sg > 0 ? "var(--primary)" : team.sg < 0 ? "#ef4444" : "var(--muted-foreground)";
                  return (
                    <tr
                      key={team.abbr}
                      style={{
                        background: i % 2 === 0 ? "var(--card)" : "var(--secondary)",
                        borderLeft: isQualified ? "3px solid var(--primary)" : "3px solid transparent",
                      }}
                    >
                      <th scope="row" className="text-left px-3 py-3 text-sm font-bold"
                        style={{ fontFamily: "Oswald, sans-serif", color: isQualified ? "var(--primary)" : "var(--muted-foreground)" }}>
                        {team.pos}
                      </th>
                      <td className="py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <TeamAvatar abbr={team.abbr} color={team.color} />
                          <span className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{team.name}</span>
                        </div>
                      </td>
                      <td className="text-center text-sm font-bold" style={{ fontFamily: "Oswald, sans-serif", color: "var(--accent)" }}>{team.pts}</td>
                      <td className="text-center text-sm" style={{ color: "var(--muted-foreground)" }}>{team.j}</td>
                      <td className="hidden lg:table-cell text-center text-sm font-semibold" style={{ color: "var(--primary)" }}>{team.v}</td>
                      <td className="hidden lg:table-cell text-center text-sm" style={{ color: "var(--muted-foreground)" }}>{team.e}</td>
                      <td className="hidden lg:table-cell text-center text-sm" style={{ color: "#ef4444" }}>{team.d}</td>
                      <td className="text-center text-sm font-medium" style={{ color: sgColor }}>{team.sg > 0 ? `+${team.sg}` : team.sg}</td>
                      <td className="hidden lg:table-cell text-center text-sm pr-3" style={{ color: "var(--muted-foreground)" }}>{team.gp}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Stats strip */}
          <div
            className="mt-4 rounded-xl p-4 grid grid-cols-2 lg:grid-cols-4 gap-4 text-center"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            {[
              { label: "Times", value: String(teams.length) },
              { label: "Jogos", value: String(totalMatches) },
              { label: "Gols", value: String(totalGoals) },
              { label: "Média/Jogo", value: avgGoals },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-xl lg:text-2xl font-bold" style={{ fontFamily: "Oswald, sans-serif", color: "var(--accent)" }}>
                  {s.value}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
