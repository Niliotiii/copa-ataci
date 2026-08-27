import { useMemo, useState, useEffect } from "react";
import { useApi } from "../../data/useApi";
import type { Match, Team, MatchStatus } from "../../data/types";
import { LoadingState, ErrorState } from "../States";
import { authedPut, adminStyles, labelClass, type SaveResult } from "./shared";

const statusOptions: { value: MatchStatus; label: string }[] = [
  { value: "agendado", label: "Agendado" },
  { value: "andamento", label: "Em andamento" },
  { value: "finalizado", label: "Finalizado" },
];

export default function AdminMatches({ token }: { token: string }) {
  const { data, loading, error } = useApi<Match[]>("/api/matches");
  const { data: teams } = useApi<Team[]>("/api/teams");
  const matches = useMemo(() => data ?? [], [data]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [status, setStatus] = useState<MatchStatus>("agendado");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);

  const selected = matches.find((m) => m.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    setHomeScore(selected.teamA.score != null ? String(selected.teamA.score) : "");
    setAwayScore(selected.teamB.score != null ? String(selected.teamB.score) : "");
    setStatus(selected.status);
    setDate(selected.date);
    setTime(selected.time);
    setLocation(selected.location);
    setHomeTeamId(selected.teamA.abbr ?? "");
    setAwayTeamId(selected.teamB.abbr ?? "");
    setResult(null);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setResult(null);
    const body: Record<string, unknown> = {
      status,
      homeScore: homeScore === "" ? null : Number(homeScore),
      awayScore: awayScore === "" ? null : Number(awayScore),
      date,
      time,
      location,
      homeTeamId: homeTeamId || null,
      awayTeamId: awayTeamId || null,
    };
    const res = await authedPut(`/api/matches/${selected.id}`, token, body);
    setResult(res);
    setSaving(false);
  }

  const teamOptions = teams ?? [];

  return (
    <div>
      {loading && <LoadingState label="Carregando jogos…" />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <div className="rounded-xl p-4" style={adminStyles.card}>
          <label className={labelClass} style={adminStyles.label}>Jogo</label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
            className="w-full mt-1.5 mb-4 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer"
            style={adminStyles.input}
          >
            <option value="">Selecione um jogo…</option>
            {matches.map((m) => {
              const tag = m.round != null ? `R${m.round}` : (m.bracketSlot ?? m.phase);
              return (
                <option key={m.id} value={m.id}>
                  [{tag}] {m.teamA.name} × {m.teamB.name} — {m.status}
                </option>
              );
            })}
          </select>

          {selected && (
            <>
              {/* Times */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={labelClass} style={adminStyles.label}>Time casa</label>
                  <select value={homeTeamId} onChange={(e) => setHomeTeamId(e.target.value)}
                    className="w-full mt-1.5 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer" style={adminStyles.input}>
                    <option value="">— (a definir)</option>
                    {teamOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass} style={adminStyles.label}>Time visitante</label>
                  <select value={awayTeamId} onChange={(e) => setAwayTeamId(e.target.value)}
                    className="w-full mt-1.5 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer" style={adminStyles.input}>
                    <option value="">— (a definir)</option>
                    {teamOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Placar */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={labelClass} style={adminStyles.label}>Gols casa</label>
                  <input type="number" min={0} max={999} value={homeScore} onChange={(e) => setHomeScore(e.target.value)}
                    placeholder="—" className="w-full mt-1.5 rounded-lg px-3 py-2 text-sm outline-none text-center" style={adminStyles.input} />
                </div>
                <div>
                  <label className={labelClass} style={adminStyles.label}>Gols visitante</label>
                  <input type="number" min={0} max={999} value={awayScore} onChange={(e) => setAwayScore(e.target.value)}
                    placeholder="—" className="w-full mt-1.5 rounded-lg px-3 py-2 text-sm outline-none text-center" style={adminStyles.input} />
                </div>
              </div>

              {/* Data / hora / local */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={labelClass} style={adminStyles.label}>Data</label>
                  <input value={date} onChange={(e) => setDate(e.target.value)}
                    placeholder="Sáb, 12 Jul" className="w-full mt-1.5 rounded-lg px-3 py-2 text-sm outline-none" style={adminStyles.input} />
                </div>
                <div>
                  <label className={labelClass} style={adminStyles.label}>Horário</label>
                  <input value={time} onChange={(e) => setTime(e.target.value)}
                    placeholder="15:00" className="w-full mt-1.5 rounded-lg px-3 py-2 text-sm outline-none" style={adminStyles.input} />
                </div>
              </div>
              <div className="mb-3">
                <label className={labelClass} style={adminStyles.label}>Local</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)}
                  placeholder="Arena Ataci" className="w-full mt-1.5 rounded-lg px-3 py-2 text-sm outline-none" style={adminStyles.input} />
              </div>

              {/* Status */}
              <label className={labelClass} style={adminStyles.label}>Status</label>
              <div className="flex gap-2 mt-1.5 mb-4">
                {statusOptions.map((opt) => {
                  const active = status === opt.value;
                  return (
                    <button key={opt.value} onClick={() => setStatus(opt.value)}
                      className="flex-1 rounded-lg px-2 py-2 text-xs font-semibold uppercase transition-all"
                      style={{
                        fontFamily: "Oswald, sans-serif", letterSpacing: "0.05em",
                        background: active ? "var(--primary)" : "var(--secondary)",
                        color: active ? "var(--primary-foreground)" : "var(--muted-foreground)",
                        border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
                      }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <button onClick={handleSave} disabled={saving || !token}
                className="w-full rounded-xl py-3 font-semibold text-sm uppercase transition-opacity disabled:opacity-50"
                style={{ background: "var(--primary)", color: "white", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em" }}>
                {saving ? "Salvando…" : "Salvar jogo"}
              </button>

              {result && (
                <div className="mt-4 rounded-lg p-3 text-sm" role="status" aria-live="polite"
                  style={{
                    background: result.ok ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.1)",
                    border: `1px solid ${result.ok ? "var(--primary)" : "rgba(239,68,68,0.5)"}`,
                    color: result.ok ? "var(--primary)" : "#ef4444",
                  }}>
                  {result.ok ? "Jogo salvo! Classificação e chaveamento atualizados." : result.error}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
