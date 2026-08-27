import { useState } from "react";
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

export default function AdminPanel({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [section, setSection] = useState("jogos");

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-[1600px] mx-auto px-4 py-6 lg:px-8 2xl:px-12">
        {/* Cabeçalho com logo, título e sair */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/serra-azul.png" alt="Escudo Serra Azul Esporte Clube" width="40" height="40" style={{ display: "block" }} />
            <div className="min-w-0">
              <h2 className="text-xl uppercase tracking-wide truncate" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 700, color: "var(--foreground)" }}>
                Painel do Organizador
              </h2>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Copa Ataci · 5ª Edição</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a href="/" className="text-xs px-3 py-2 rounded-lg" style={{ color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
              Portal
            </a>
            <button onClick={onLogout}
              className="text-xs px-3 py-2 rounded-lg font-semibold uppercase"
              style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.04em" }}>
              Sair
            </button>
          </div>
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

        {section === "jogos" && <AdminMatches token={token} />}
        {section === "times" && <AdminTeams token={token} />}
        {section === "patrocinadores" && <AdminSponsors token={token} />}
        {section === "suspensoes" && <AdminSuspensions token={token} />}
      </div>
    </div>
  );
}
