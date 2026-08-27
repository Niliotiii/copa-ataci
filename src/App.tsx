import { useState } from "react";
import Standings from "./components/Standings";
import Schedule from "./components/Schedule";
import Bracket from "./components/Bracket";
import TeamLineup from "./components/TeamLineup";
import SponsorTicker from "./components/SponsorTicker";
import AdminPanel from "./components/AdminPanel";
import { TrophyIcon, BallIcon, BracketIcon, ShirtIcon, LockIcon } from "./components/icons";
import type { ComponentType } from "react";

const tabs: { id: string; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { id: "classificacao", label: "Classificação", Icon: TrophyIcon },
  { id: "jogos", label: "Jogos", Icon: BallIcon },
  { id: "mata-mata", label: "Mata-Mata", Icon: BracketIcon },
  { id: "times", label: "Times", Icon: ShirtIcon },
  { id: "admin", label: "Admin", Icon: LockIcon },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("classificacao");

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: "var(--background)" }}>

      {/* === DESKTOP SIDEBAR === */}
      <aside
        className="hidden lg:flex flex-col w-64 xl:w-72 sticky top-0 h-screen"
        style={{ background: "var(--card)", borderRight: "1px solid var(--border)" }}
      >
        {/* Logo */}
        <div className="px-6 py-8 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
              <img src="/serra-azul.svg" alt="Escudo Serra Azul Esporte Clube" width="48" height="48" style={{ display: "block" }} />
            </div>
            <div>
              <h1
                className="text-xl leading-tight uppercase tracking-wider"
                style={{ fontFamily: "Oswald, sans-serif", color: "var(--foreground)", fontWeight: 700 }}
              >
                Copa Ataci
              </h1>
              <p className="text-xs" style={{ color: "var(--accent)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em" }}>
                5ª Edição · 2026
              </p>
            </div>
          </div>
          <div className="mt-4">
            <span
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wide"
              style={{ background: "rgba(212,160,23,0.15)", color: "var(--accent)", fontSize: "11px" }}
            >
              5ª Edição
            </span>
          </div>
        </div>

        {/* Sidebar nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-left w-full transition-all"
                style={{
                  fontFamily: "Oswald, sans-serif",
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: "0.06em",
                  fontSize: "15px",
                  color: isActive ? "var(--primary-foreground)" : "var(--secondary-foreground)",
                  background: isActive ? "var(--primary)" : "transparent",
                  boxShadow: isActive ? "0 4px 14px rgba(22,163,74,0.3)" : "none",
                }}
              >
                <span className="flex items-center justify-center" style={{ width: "18px" }}><tab.Icon size={18} /></span>
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="px-6 py-5 border-t" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Temporada 2026 · Arena Ataci
          </p>
        </div>
      </aside>

      {/* === MAIN AREA === */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* MOBILE HEADER */}
        <header
          className="lg:hidden sticky top-0 z-50 shadow-lg"
          style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
        >
          <div className="px-4 pt-4 pb-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                <img src="/serra-azul.svg" alt="Escudo Serra Azul Esporte Clube" width="40" height="40" style={{ display: "block" }} />
              </div>
              <div>
                <h1
                  className="text-base leading-tight uppercase tracking-wider"
                  style={{ fontFamily: "Oswald, sans-serif", color: "var(--foreground)", fontWeight: 700 }}
                >
                  Copa Ataci
                </h1>
                <p className="text-xs" style={{ color: "var(--accent)", fontFamily: "Oswald, sans-serif" }}>
                  5ª Edição · 2026
                </p>
              </div>
            </div>
            <nav className="flex overflow-x-auto -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={isActive ? "page" : undefined}
                    className="flex-shrink-0 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap"
                    style={{
                      fontFamily: "Oswald, sans-serif",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "var(--primary)" : "var(--muted-foreground)",
                      letterSpacing: "0.05em",
                      borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* SPONSOR TICKER — both mobile and desktop */}
        <SponsorTicker />

        {/* DESKTOP PAGE TITLE BAR */}
        <div
          className="hidden lg:flex items-center gap-3 px-8 py-5 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <h2
            className="text-2xl uppercase tracking-wide font-bold"
            style={{ fontFamily: "Oswald, sans-serif", color: "var(--foreground)" }}
          >
            {tabs.find((t) => t.id === activeTab)?.label}
          </h2>
          <span style={{ color: "var(--muted-foreground)" }}>·</span>
          <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>Copa Ataci 5ª Edição</span>
        </div>

        {/* CONTENT */}
        <main className="flex-1 px-4 py-4 lg:px-8 lg:py-6">
          <div className="max-w-4xl">
            {activeTab === "classificacao" && <Standings />}
            {activeTab === "jogos" && <Schedule />}
            {activeTab === "mata-mata" && <Bracket />}
            {activeTab === "times" && <TeamLineup />}
            {activeTab === "admin" && <AdminPanel />}
          </div>
        </main>
      </div>
    </div>
  );
}
