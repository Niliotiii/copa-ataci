import { useState, useEffect } from "react";
import { useApi } from "../../data/useApi";
import type { Sponsor } from "../../data/types";
import { LoadingState, ErrorState } from "../States";
import { authedPut, adminStyles, labelClass, type SaveResult } from "./shared";
import ImageUpload from "./ImageUpload";
import { CloseIcon } from "../icons";

type EditableSponsor = {
  name: string;
  initials: string;
  color: string;
  tagline: string;
  logoUrl: string | null;
};

export default function AdminSponsors({ token }: { token: string }) {
  const { data, loading, error } = useApi<Sponsor[]>("/api/sponsors");
  const [items, setItems] = useState<EditableSponsor[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);

  useEffect(() => {
    if (!data) return;
    setItems(data.map((s) => ({ name: s.name, initials: s.initials, color: s.color, tagline: s.tagline ?? "", logoUrl: s.logoUrl ?? null })));
    setResult(null);
  }, [data]);

  function update(i: number, patch: Partial<EditableSponsor>) {
    setItems((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function add() {
    setItems((prev) => [...prev, { name: "", initials: "", color: "#16a34a", tagline: "", logoUrl: null }]);
  }
  function remove(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setSaving(true);
    setResult(null);
    const payload = {
      sponsors: items.map((s) => ({
        name: s.name,
        initials: s.initials,
        color: s.color,
        tagline: s.tagline || null,
        logoUrl: s.logoUrl || null,
      })),
    };
    const res = await authedPut("/api/sponsors", token, payload);
    setResult(res);
    setSaving(false);
  }

  return (
    <div>
      {loading && <LoadingState label="Carregando patrocinadores…" />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <div className="rounded-xl p-4" style={adminStyles.card}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase" style={{ fontFamily: "Oswald, sans-serif", color: "var(--foreground)" }}>
              Patrocinadores ({items.length})
            </h3>
            <button onClick={add}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold uppercase"
              style={{ background: "var(--secondary)", color: "var(--primary)", border: "1px solid var(--primary)", fontFamily: "Oswald, sans-serif" }}>
              + Adicionar
            </button>
          </div>

          <div className="flex flex-col gap-3 mb-3">
            {items.map((s, i) => (
              <div key={i} className="rounded-lg p-3" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                <div className="grid gap-2 items-center mb-3"
                  style={{ gridTemplateColumns: "1fr 56px 40px 1fr 44px" }}>
                  <input value={s.name} onChange={(e) => update(i, { name: e.target.value })}
                    placeholder="Nome" aria-label={`Nome do patrocinador ${i + 1}`}
                    className="rounded-lg px-2 py-2 text-sm outline-none" style={adminStyles.input} />
                  <input value={s.initials} onChange={(e) => update(i, { initials: e.target.value })}
                    placeholder="Sigla" maxLength={4} aria-label={`Sigla do patrocinador ${i + 1}`}
                    className="rounded-lg px-1 py-2 text-sm outline-none text-center" style={adminStyles.input} />
                  <input type="color" value={s.color} onChange={(e) => update(i, { color: e.target.value })}
                    className="w-full h-11 rounded cursor-pointer" aria-label={`Cor do patrocinador ${i + 1}`}
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                  <input value={s.tagline} onChange={(e) => update(i, { tagline: e.target.value })}
                    placeholder="Slogan (opcional)" aria-label={`Slogan do patrocinador ${i + 1}`}
                    className="rounded-lg px-2 py-2 text-sm outline-none" style={adminStyles.input} />
                  <button onClick={() => remove(i)} aria-label={`Remover patrocinador ${i + 1}`}
                    className="w-11 h-11 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)" }}>
                    <CloseIcon size={14} />
                  </button>
                </div>
                <ImageUpload label="Logo" value={s.logoUrl} onChange={(v) => update(i, { logoUrl: v })} />
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-xs text-center py-3" style={{ color: "var(--muted-foreground)" }}>
                Nenhum patrocinador. Clique em “Adicionar”.
              </p>
            )}
          </div>

          <button onClick={save} disabled={saving || !token}
            className="w-full rounded-xl py-2.5 font-semibold text-sm uppercase transition-opacity disabled:opacity-50"
            style={{ background: "var(--primary)", color: "white", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em" }}>
            {saving ? "Salvando…" : "Salvar patrocinadores"}
          </button>

          {result && (
            <div className="mt-3 rounded-lg p-3 text-sm" role="status" aria-live="polite"
              style={{
                background: result.ok ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${result.ok ? "var(--primary)" : "rgba(239,68,68,0.5)"}`,
                color: result.ok ? "var(--primary)" : "#ef4444",
              }}>
              {result.ok ? "Patrocinadores salvos!" : result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
