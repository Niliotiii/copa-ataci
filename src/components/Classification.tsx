import { useState } from "react";
import Standings from "./Standings";
import Bracket from "./Bracket";

const subtabs = [
  { id: "tabela", label: "Tabela" },
  { id: "mata-mata", label: "Mata-Mata" },
];

/**
 * Tela de Classificação com duas sub-abas internas: a tabela da fase de grupos
 * e o mata-mata. Substitui a antiga opção "Mata-Mata" do menu principal.
 */
export default function Classification() {
  const [sub, setSub] = useState("tabela");

  return (
    <div>
      {/* Sub-abas */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl w-full max-w-md" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
        {subtabs.map((t) => {
          const active = sub === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSub(t.id)}
              aria-current={active ? "page" : undefined}
              className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase transition-all"
              style={{
                fontFamily: "Oswald, sans-serif",
                letterSpacing: "0.05em",
                background: active ? "var(--primary)" : "transparent",
                color: active ? "var(--primary-foreground)" : "var(--muted-foreground)",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {sub === "tabela" && <Standings />}
      {sub === "mata-mata" && <Bracket />}
    </div>
  );
}
