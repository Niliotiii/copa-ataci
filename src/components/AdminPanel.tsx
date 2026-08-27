import { useState } from "react";
import { useAdminToken, adminStyles, labelClass } from "./admin/shared";
import AdminMatches from "./admin/AdminMatches";
import AdminTeams from "./admin/AdminTeams";
import AdminSponsors from "./admin/AdminSponsors";
import AdminSuspensions from "./admin/AdminSuspensions";

const sections = [
  { id: "jogos", label: "Jogos" },
  { id: "times", label: "Times" },
  { id: "patrocinadores", label: "Patrocinadores" },
  { id: "suspensoes", label: "Suspensões" },
];

export default function AdminPanel() {
  const { token, setToken } = useAdminToken();
  const [section, setSection] = useState("jogos");

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl uppercase tracking-wide" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 700, color: "var(--foreground)" }}>
          Painel do Organizador
        </h2>
      </div>

      {/* Token compartilhado */}
      <div className="rounded-xl p-4 mb-4" style={adminStyles.card}>
        <label className={labelClass} style={adminStyles.label}>Token de Admin</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Bearer token…"
          className="w-full mt-1.5 rounded-lg px-3 py-2 text-sm outline-none"
          style={adminStyles.input}
        />
        <p className="text-xs mt-1.5" style={{ color: "var(--muted-foreground)" }}>
          Guardado apenas nesta sessão do navegador.
        </p>
      </div>

      {/* Abas internas */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
        {sections.map((s) => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase transition-all"
              style={{
                fontFamily: "Oswald, sans-serif",
                letterSpacing: "0.05em",
                background: active ? "var(--primary)" : "transparent",
                color: active ? "var(--primary-foreground)" : "var(--muted-foreground)",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {!token && (
        <div className="rounded-lg p-3 mb-4 text-sm"
          style={{ background: "rgba(212,160,23,0.1)", border: "1px solid var(--accent)", color: "var(--accent)" }}>
          Informe o token de admin acima para poder salvar as alterações.
        </div>
      )}

      {section === "jogos" && <AdminMatches token={token} />}
      {section === "times" && <AdminTeams token={token} />}
      {section === "patrocinadores" && <AdminSponsors token={token} />}
      {section === "suspensoes" && <AdminSuspensions token={token} />}
    </div>
  );
}
