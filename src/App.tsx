import { useState } from "react";
import Standings from "./components/Standings";
import Schedule from "./components/Schedule";
import Bracket from "./components/Bracket";
import TeamLineup from "./components/TeamLineup";
import SponsorTicker from "./components/SponsorTicker";
import AdminPanel from "./components/AdminPanel";

const tabs = [
  { id: "classificacao", label: "Classificação", icon: "🏆" },
  { id: "jogos", label: "Jogos", icon: "⚽" },
  { id: "mata-mata", label: "Mata-Mata", icon: "🔥" },
  { id: "times", label: "Times", icon: "👕" },
  { id: "admin", label: "Admin", icon: "🔒" },
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
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--primary)" }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="white" fillOpacity="0.15" />
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="white" strokeWidth="1.5" fill="none" />
                <path d="M12 6l1.5 4.5H18l-3.75 2.73 1.43 4.39L12 15.3l-3.68 2.32 1.43-4.39L6 10.5h4.5L12 6z" fill="white" />
              </svg>
            </div>
            <div>
              <h1
                className="text-xl leading-tight uppercase tracking-wider"
                style={{ fontFamily: "Oswald, sans-serif", color: "var(--foreground)", fontWeight: 700 }}
              >
                Copa Ataci
              </h1>
              <p className="text-xs" style={{ color: "var(--accent)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em" }}>
                4ª Edição · 2026
              </p>
            </div>
          </div>
          <div className="mt-4">
            <span
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wide"
              style={{ background: "rgba(22,163,74,0.15)", color: "var(--primary)", fontSize: "11px" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Em Curso
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
                <span style={{ fontSize: "18px" }}>{tab.icon}</span>
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
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--primary)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="white" fillOpacity="0.15" />
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="white" strokeWidth="1.5" fill="none" />
                  <path d="M12 6l1.5 4.5H18l-3.75 2.73 1.43 4.39L12 15.3l-3.68 2.32 1.43-4.39L6 10.5h4.5L12 6z" fill="white" />
                </svg>
              </div>
              <div>
                <h1
                  className="text-base leading-tight uppercase tracking-wider"
                  style={{ fontFamily: "Oswald, sans-serif", color: "var(--foreground)", fontWeight: 700 }}
                >
                  Copa Ataci
                </h1>
                <p className="text-xs" style={{ color: "var(--accent)", fontFamily: "Oswald, sans-serif" }}>
                  4ª Edição · 2026
                </p>
              </div>
              <div className="ml-auto">
                <span
                  className="text-xs px-2 py-1 rounded-full font-semibold uppercase"
                  style={{ background: "rgba(22,163,74,0.15)", color: "var(--primary)", fontSize: "10px" }}
                >
                  Em Curso
                </span>
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
          <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>Copa Ataci 4ª Edição</span>
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
