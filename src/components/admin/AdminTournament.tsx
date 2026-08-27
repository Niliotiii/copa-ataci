import { useState, useEffect } from "react";
import { useApi } from "../../data/useApi";
import type { Tournament } from "../../data/types";
import { LoadingState, ErrorState } from "../States";
import { authedPut, adminStyles, labelClass, type SaveResult } from "./shared";

// Edição dos metadados do torneio (nome, edição, temporada).
export default function AdminTournament({ token }: { token: string }) {
  const { data, loading, error } = useApi<Tournament>("/api/tournament");
  const [name, setName] = useState("");
  const [edition, setEdition] = useState("");
  const [season, setSeason] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);

  useEffect(() => {
    if (!data) return;
    setName(data.name ?? "");
    setEdition(data.edition ?? "");
    setSeason(data.season ?? "");
    setResult(null);
  }, [data]);

  async function save() {
    setSaving(true);
    setResult(null);
    const res = await authedPut("/api/tournament", token, { name, edition: edition || null, season: season || null });
    setResult(res);
    setSaving(false);
  }

  return (
    <div className="rounded-xl p-4" style={adminStyles.card}>
      {loading && <LoadingState label="Carregando…" />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <>
          <label className={labelClass} style={adminStyles.label}>Nome do torneio</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Copa Ataci" className="w-full mt-1.5 mb-3 rounded-lg px-3 py-2 text-sm outline-none" style={adminStyles.input} />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={labelClass} style={adminStyles.label}>Edição</label>
              <input value={edition} onChange={(e) => setEdition(e.target.value)}
                placeholder="5ª Edição" className="w-full mt-1.5 rounded-lg px-3 py-2 text-sm outline-none" style={adminStyles.input} />
            </div>
            <div>
              <label className={labelClass} style={adminStyles.label}>Temporada</label>
              <input value={season} onChange={(e) => setSeason(e.target.value)}
                placeholder="2026" className="w-full mt-1.5 rounded-lg px-3 py-2 text-sm outline-none" style={adminStyles.input} />
            </div>
          </div>
          <button onClick={save} disabled={saving || !token}
            className="w-full rounded-xl py-2.5 font-semibold text-sm uppercase transition-opacity disabled:opacity-50"
            style={{ background: "var(--primary)", color: "white", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em" }}>
            {saving ? "Salvando…" : "Salvar torneio"}
          </button>
          {result && (
            <div className="mt-3 rounded-lg p-3 text-sm" role="status" aria-live="polite"
              style={{
                background: result.ok ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${result.ok ? "var(--primary)" : "rgba(239,68,68,0.5)"}`,
                color: result.ok ? "var(--primary)" : "#ef4444",
              }}>
              {result.ok ? "Torneio atualizado!" : result.error}
            </div>
          )}
        </>
      )}
    </div>
  );
}
