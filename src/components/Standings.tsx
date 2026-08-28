import { useApi } from "../data/useApi";
import type { StandingRow, Tournament } from "../data/types";
import TeamCrest from "./TeamCrest";
import SectionHeader from "./SectionHeader";
import { LoadingState, ErrorState, EmptyState } from "./States";

export default function Standings() {
  const { data, loading, error } = useApi<StandingRow[]>("/api/standings");
  const { data: tournament } = useApi<Tournament>("/api/tournament");
  const seasonLabel = tournament?.season ? `Temporada ${tournament.season}` : "";

  const teams = data ?? [];
  const totalMatches = teams.reduce((acc, t) => acc + t.j, 0) / 2;
  const totalGoals = teams.reduce((acc, t) => acc + t.gp, 0);
  const avgGoals = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(1) : "0";

  return (
    <div>
      <SectionHeader
        kicker="Fase de grupos"
        title="Classificação"
        right={
          seasonLabel ? (
            <span
              className="text-xs px-3 py-1.5 rounded-full font-semibold uppercase"
              style={{ background: "var(--secondary)", color: "var(--muted-foreground)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em" }}
            >
              {seasonLabel}
            </span>
          ) : undefined
        }
      />

      {loading && <LoadingState label="Calculando classificação…" rows={8} />}
      {error && <ErrorState message={error} />}
      {!loading && !error && teams.length === 0 && <EmptyState label="Nenhum jogo finalizado ainda." />}

      {!loading && !error && teams.length > 0 && (
        <>
          {/* Tabela semântica: colunas extras (V/E/D/GP) escondidas no mobile. */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <table className="w-full border-collapse tnum" style={{ fontFamily: "Inter, sans-serif" }}>
              <caption className="sr-only">Classificação da fase de grupos</caption>
              <thead>
                <tr
                  className="text-xs font-semibold uppercase"
                  style={{ background: "var(--secondary)", color: "var(--muted-foreground)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.08em" }}
                >
                  <th scope="col" className="text-left px-3 py-2.5 w-12">Pos</th>
                  <th scope="col" className="text-left py-2.5">Time</th>
                  <th scope="col" className="text-center py-2.5 w-11"><abbr title="Pontos">PTS</abbr></th>
                  <th scope="col" className="text-center py-2.5 w-8"><abbr title="Jogos">J</abbr></th>
                  <th scope="col" className="hidden lg:table-cell text-center py-2.5 w-8"><abbr title="Vitórias">V</abbr></th>
                  <th scope="col" className="hidden lg:table-cell text-center py-2.5 w-8"><abbr title="Empates">E</abbr></th>
                  <th scope="col" className="hidden lg:table-cell text-center py-2.5 w-8"><abbr title="Derrotas">D</abbr></th>
                  <th scope="col" className="text-center py-2.5 w-9"><abbr title="Saldo de gols">SG</abbr></th>
                  <th scope="col" className="hidden lg:table-cell text-center py-2.5 w-9"><abbr title="Gols pró">GP</abbr></th>
                  <th scope="col" className="hidden xl:table-cell text-center py-2.5 w-9"><abbr title="Gols contra">GC</abbr></th>
                  <th scope="col" className="hidden xl:table-cell text-center py-2.5 w-8"><abbr title="Cartões vermelhos">CV</abbr></th>
                  <th scope="col" className="hidden xl:table-cell text-center py-2.5 w-8"><abbr title="Cartões amarelos">CA</abbr></th>
                  <th scope="col" className="hidden xl:table-cell text-center py-2.5 w-9 pr-3"><abbr title="Faltas">F</abbr></th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, i) => {
                  const isQualified = team.pos <= 4;
                  const isCutoff = team.pos === 4; // última linha da zona de classificação
                  const sgColor = team.sg > 0 ? "var(--primary)" : team.sg < 0 ? "var(--danger)" : "var(--muted-foreground)";
                  return (
                    <tr
                      key={team.abbr}
                      style={{
                        background: isQualified
                          ? "var(--primary-soft)"
                          : i % 2 === 0 ? "var(--card)" : "var(--secondary)",
                        borderBottom: isCutoff ? "2px solid var(--primary)" : undefined,
                      }}
                    >
                      <th scope="row" className="text-left px-3 py-3">
                        <span
                          className="inline-flex items-center justify-center rounded-full text-xs font-bold"
                          style={{
                            width: 24, height: 24,
                            fontFamily: "Oswald, sans-serif",
                            background: isQualified ? "var(--primary)" : "transparent",
                            color: isQualified ? "var(--primary-foreground)" : "var(--muted-foreground)",
                          }}
                        >
                          {team.pos}
                        </span>
                      </th>
                      <td className="py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <TeamCrest abbr={team.abbr} color={team.color} crestUrl={team.crestUrl} size={28} />
                          <span className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{team.name}</span>
                        </div>
                      </td>
                      <td className="text-center text-sm font-bold" style={{ fontFamily: "Oswald, sans-serif", color: "var(--accent)" }}>{team.pts}</td>
                      <td className="text-center text-sm" style={{ color: "var(--muted-foreground)" }}>{team.j}</td>
                      <td className="hidden lg:table-cell text-center text-sm font-semibold" style={{ color: "var(--primary)" }}>{team.v}</td>
                      <td className="hidden lg:table-cell text-center text-sm" style={{ color: "var(--muted-foreground)" }}>{team.e}</td>
                      <td className="hidden lg:table-cell text-center text-sm" style={{ color: "var(--danger)" }}>{team.d}</td>
                      <td className="text-center text-sm font-medium" style={{ color: sgColor }}>{team.sg > 0 ? `+${team.sg}` : team.sg}</td>
                      <td className="hidden lg:table-cell text-center text-sm" style={{ color: "var(--muted-foreground)" }}>{team.gp}</td>
                      <td className="hidden xl:table-cell text-center text-sm" style={{ color: "var(--muted-foreground)" }}>{team.gc}</td>
                      <td className="hidden xl:table-cell text-center text-sm" style={{ color: "var(--danger)" }}>{team.red}</td>
                      <td className="hidden xl:table-cell text-center text-sm" style={{ color: "#a16207" }}>{team.yellow}</td>
                      <td className="hidden xl:table-cell text-center text-sm pr-3" style={{ color: "var(--muted-foreground)" }}>{team.fouls}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legenda da zona de classificação */}
          <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
            <span className="inline-block rounded-full" style={{ width: 10, height: 10, background: "var(--primary)" }} aria-hidden />
            <span style={{ fontFamily: "Oswald, sans-serif", letterSpacing: "0.04em" }}>Zona de classificação (1º ao 4º)</span>
          </div>

          {/* Stats strip */}
          <div
            className="mt-4 rounded-xl p-4 grid grid-cols-2 lg:grid-cols-4 gap-4 text-center"
            style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
          >
            {[
              { label: "Times", value: String(teams.length) },
              { label: "Jogos", value: String(totalMatches) },
              { label: "Gols", value: String(totalGoals) },
              { label: "Média/Jogo", value: avgGoals },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl lg:text-3xl font-bold tnum" style={{ fontFamily: "Oswald, sans-serif", color: "var(--accent)" }}>
                  {s.value}
                </div>
                <div className="text-xs mt-0.5 uppercase" style={{ color: "var(--muted-foreground)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
