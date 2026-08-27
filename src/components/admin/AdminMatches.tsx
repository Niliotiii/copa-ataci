import { useMemo, useState, useEffect } from "react";
import { useApi } from "../../data/useApi";
import type { Match, Team, MatchStatus } from "../../data/types";
import { LoadingState, ErrorState } from "../States";
import { authedPut, authedPost, adminStyles, labelClass, type SaveResult } from "./shared";
import AdminEvents from "./AdminEvents";

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
  const [status, setStatus] = useState<MatchStatus>("agendado");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  // Pênaltis (só mata-mata, exibido quando o placar normal empata).
  const [pens, setPens] = useState({ home: "", away: "" });
  // Faltas por lado (gols e cartões vêm dos eventos por jogador).
  const [disc, setDisc] = useState({ homeFouls: "", awayFouls: "" });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);
  // Gerador da tabela de grupos.
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<(SaveResult & { info?: string }) | null>(null);
  // Gerador do mata-mata.
  const [generatingKO, setGeneratingKO] = useState(false);
  const [koResult, setKoResult] = useState<(SaveResult & { info?: string }) | null>(null);

  const selected = matches.find((m) => m.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    setStatus(selected.status);
    setDate(selected.date);
    setTime(selected.time);
    setLocation(selected.location);
    setHomeTeamId(selected.teamA.abbr ?? "");
    setAwayTeamId(selected.teamB.abbr ?? "");
    setDisc({
      homeFouls: String(selected.teamA.fouls ?? 0),
      awayFouls: String(selected.teamB.fouls ?? 0),
    });
    setPens({
      home: selected.teamA.pens != null ? String(selected.teamA.pens) : "",
      away: selected.teamB.pens != null ? String(selected.teamB.pens) : "",
    });
    setResult(null);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setResult(null);
    const num = (v: string) => (v === "" ? 0 : Number(v));
    const body: Record<string, unknown> = {
      status,
      date,
      time,
      location,
      homeTeamId: homeTeamId || null,
      awayTeamId: awayTeamId || null,
      homeFouls: num(disc.homeFouls), awayFouls: num(disc.awayFouls),
    };
    // Pênaltis só fazem sentido no mata-mata; envia null quando vazio (limpa).
    if (selected.bracketSlot) {
      body.homePens = pens.home === "" ? null : Number(pens.home);
      body.awayPens = pens.away === "" ? null : Number(pens.away);
    }
    const res = await authedPut(`/api/matches/${selected.id}`, token, body);
    setResult(res);
    setSaving(false);
  }

  const teamOptions = teams ?? [];

  async function handleGenerate() {
    const ok = window.confirm(
      "Gerar a tabela da fase de grupos (todos-contra-todos, turno único)?\n\n" +
        "Isso substitui os jogos de grupos atuais. A ação é bloqueada se já houver placares lançados.",
    );
    if (!ok) return;
    setGenerating(true);
    setGenResult(null);
    const res = await authedPost("/api/matches/generate-groups", token, { location: "Arena Ataci" });
    if (res.ok) {
      setGenResult({ ok: true, info: "Tabela da fase de grupos gerada. Confira a aba Jogos." });
    } else {
      setGenResult(res);
    }
    setGenerating(false);
  }

  async function handleGenerateBracket() {
    const ok = window.confirm(
      "Gerar o mata-mata a partir da classificação atual?\n\n" +
        "Semifinais: 1º × 4º e 2º × 3º (mando do melhor colocado). Substitui o mata-mata atual. " +
        "A ação é bloqueada se já houver placares lançados no mata-mata.",
    );
    if (!ok) return;
    setGeneratingKO(true);
    setKoResult(null);
    const res = await authedPost("/api/matches/generate-bracket", token, { location: "Arena Ataci" });
    if (res.ok) {
      setKoResult({ ok: true, info: "Mata-mata gerado a partir da classificação. Confira a aba Mata-Mata." });
    } else {
      setKoResult(res);
    }
    setGeneratingKO(false);
  }

  return (
    <div>
      {loading && <LoadingState label="Carregando jogos…" />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <div className="rounded-xl p-4 mb-4" style={adminStyles.card}>
          <label className={labelClass} style={adminStyles.label}>Tabela da fase de grupos</label>
          <button onClick={handleGenerate} disabled={generating || !token}
            className="w-full mt-3 rounded-xl py-2.5 font-semibold text-sm uppercase transition-opacity disabled:opacity-50"
            style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em" }}>
            {generating ? "Gerando…" : "Gerar tabela da fase de grupos"}
          </button>
          {genResult && (
            <div className="mt-3 rounded-lg p-3 text-sm" role="status" aria-live="polite"
              style={{
                background: genResult.ok ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${genResult.ok ? "var(--primary)" : "rgba(239,68,68,0.5)"}`,
                color: genResult.ok ? "var(--primary)" : "#ef4444",
              }}>
              {genResult.ok ? genResult.info : genResult.error}
            </div>
          )}

          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <label className={labelClass} style={adminStyles.label}>Mata-mata</label>
            <button onClick={handleGenerateBracket} disabled={generatingKO || !token}
              className="w-full mt-3 rounded-xl py-2.5 font-semibold text-sm uppercase transition-opacity disabled:opacity-50"
              style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em" }}>
              {generatingKO ? "Gerando…" : "Gerar mata-mata da classificação"}
            </button>
            {koResult && (
              <div className="mt-3 rounded-lg p-3 text-sm" role="status" aria-live="polite"
                style={{
                  background: koResult.ok ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.1)",
                  border: `1px solid ${koResult.ok ? "var(--primary)" : "rgba(239,68,68,0.5)"}`,
                  color: koResult.ok ? "var(--primary)" : "#ef4444",
                }}>
                {koResult.ok ? koResult.info : koResult.error}
              </div>
            )}
          </div>
        </div>
      )}

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

              {/* Faltas (casa / visitante) — cartões e gols vêm dos eventos por jogador */}
              <div className="mb-3">
                <label className={labelClass} style={adminStyles.label}>Faltas (casa / visitante)</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <input type="number" min={0} max={999} value={disc.homeFouls}
                    onChange={(e) => setDisc((d) => ({ ...d, homeFouls: e.target.value }))}
                    aria-label="Faltas casa" placeholder="0"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none text-center" style={adminStyles.input} />
                  <input type="number" min={0} max={999} value={disc.awayFouls}
                    onChange={(e) => setDisc((d) => ({ ...d, awayFouls: e.target.value }))}
                    aria-label="Faltas visitante" placeholder="0"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none text-center" style={adminStyles.input} />
                </div>
              </div>

              {/* Pênaltis (só mata-mata) — desempate quando o placar normal empata */}
              {selected.bracketSlot && (
                <div className="mb-3">
                  <label className={labelClass} style={adminStyles.label}>Pênaltis (casa / visitante) — só em caso de empate</label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <input type="number" min={0} max={99} value={pens.home}
                      onChange={(e) => setPens((p) => ({ ...p, home: e.target.value }))}
                      aria-label="Pênaltis casa" placeholder="—"
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none text-center" style={adminStyles.input} />
                    <input type="number" min={0} max={99} value={pens.away}
                      onChange={(e) => setPens((p) => ({ ...p, away: e.target.value }))}
                      aria-label="Pênaltis visitante" placeholder="—"
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none text-center" style={adminStyles.input} />
                  </div>
                </div>
              )}

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

      {!loading && !error && selected && (selected.teamA.abbr || selected.teamB.abbr) && (
        <AdminEvents match={selected} token={token} />
      )}
    </div>
  );
}
