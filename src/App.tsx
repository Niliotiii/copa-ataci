import { useState, useEffect } from "react";
import Classification from "./components/Classification";
import Schedule from "./components/Schedule";
import TeamLineup from "./components/TeamLineup";
import SponsorTicker from "./components/SponsorTicker";
import Footer from "./components/Footer";
import AdminRoute from "./components/AdminRoute";
import Scorers from "./components/Scorers";
import { usePath, navigate } from "./router";
import { useApi } from "./data/useApi";
import type { Tournament } from "./data/types";
import { TrophyIcon, BallIcon, ShirtIcon, ScorerIcon, MenuIcon, CloseIcon, CollapseIcon, ExpandIcon } from "./components/icons";
import type { ComponentType } from "react";

// Aba → path base. (Mata-mata é sub-rota de /classificacao.)
const tabs: { id: string; label: string; path: string; Icon: ComponentType<{ size?: number }> }[] = [
  { id: "classificacao", label: "Classificação", path: "/", Icon: TrophyIcon },
  { id: "jogos", label: "Jogos", path: "/jogos", Icon: BallIcon },
  { id: "artilharia", label: "Artilharia", path: "/artilharia", Icon: ScorerIcon },
  { id: "times", label: "Times", path: "/times", Icon: ShirtIcon },
];

/** Deriva qual aba do menu está ativa a partir do path atual. */
function tabForPath(path: string): string {
  if (path === "/" || path === "/classificacao" || path === "/mata-mata") return "classificacao";
  if (path.startsWith("/jogos")) return "jogos";
  if (path.startsWith("/artilharia")) return "artilharia";
  if (path.startsWith("/times")) return "times";
  return "classificacao";
}

export default function App() {
  const path = usePath();
  if (path === "/admin") return <AdminRoute />;
  return <Portal path={path} />;
}

function Portal({ path }: { path: string }) {
  const activeTab = tabForPath(path);
  const { data: tournament } = useApi<Tournament>("/api/tournament");
  const tName = tournament?.name ?? "Copa Ataci";
  const tSub = [tournament?.edition, tournament?.season].filter(Boolean).join(" · ");
  const [menuOpen, setMenuOpen] = useState(false);
  // Sidebar recolhida (só ícones) — preferência persistida no navegador.
  const [collapsed, setCollapsed] = useState(
    () => typeof localStorage !== "undefined" && localStorage.getItem("copa-ataci-sidebar") === "collapsed",
  );

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("copa-ataci-sidebar", next ? "collapsed" : "expanded");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const selectTab = (tabPath: string) => {
    navigate(tabPath);
    setMenuOpen(false);
  };

  // Fecha o menu mobile com Escape e trava o scroll do body enquanto aberto.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: "var(--background)" }}>

      {/* === DESKTOP SIDEBAR === */}
      <aside
        className={`hidden lg:flex flex-col sticky top-0 h-screen transition-[width] duration-200 ${collapsed ? "w-20" : "w-64 xl:w-72"}`}
        style={{ background: "var(--card)", borderRight: "1px solid var(--border)" }}
      >
        {/* Logo + toggle */}
        <div className="px-4 py-6 border-b" style={{ borderColor: "var(--border)" }}>
          <div className={`flex items-center gap-3 ${collapsed ? "flex-col" : ""}`}>
            <button
              type="button"
              onClick={() => selectTab("/")}
              aria-label="Ir para a tela inicial"
              className={`flex items-center gap-3 min-w-0 flex-1 text-left ${collapsed ? "flex-col" : ""}`}
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
            >
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                <img src="/serra-azul.png" alt="Escudo Serra Azul Esporte Clube" width="48" height="48" style={{ display: "block" }} />
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <h1
                    className="text-xl leading-tight uppercase tracking-wider truncate"
                    style={{ fontFamily: "Oswald, sans-serif", color: "var(--foreground)", fontWeight: 700 }}
                  >
                    {tName}
                  </h1>
                  <p className="text-xs" style={{ color: "var(--accent)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em" }}>
                    {tSub}
                  </p>
                </div>
              )}
            </button>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
              aria-pressed={collapsed}
              title={collapsed ? "Expandir menu" : "Recolher menu"}
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ width: 36, height: 36, color: "var(--muted-foreground)", background: "var(--secondary)", border: "1px solid var(--border)" }}
            >
              {collapsed ? <ExpandIcon size={18} /> : <CollapseIcon size={18} />}
            </button>
          </div>
        </div>

        {/* Sidebar nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                aria-current={isActive ? "page" : undefined}
                aria-label={collapsed ? tab.label : undefined}
                title={collapsed ? tab.label : undefined}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all ${collapsed ? "justify-center" : "text-left"}`}
                style={{
                  fontFamily: "Oswald, sans-serif",
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: "0.06em",
                  fontSize: "15px",
                  color: isActive ? "var(--primary-foreground)" : "var(--secondary-foreground)",
                  background: isActive ? "var(--primary)" : "transparent",
                  boxShadow: isActive ? "var(--shadow-md)" : "none",
                }}
              >
                {isActive && !collapsed && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                    style={{ width: 3, height: 20, background: "var(--accent)" }}
                  />
                )}
                <span className="flex items-center justify-center" style={{ width: "18px" }}><tab.Icon size={18} /></span>
                {!collapsed && tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* === MAIN AREA === */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* MOBILE HEADER */}
        <header
          className="lg:hidden sticky top-0 z-50 shadow-lg"
          style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
        >
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => selectTab("/")}
              aria-label="Ir para a tela inicial"
              className="flex items-center gap-3 min-w-0 text-left"
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
            >
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                <img src="/serra-azul.png" alt="Escudo Serra Azul Esporte Clube" width="40" height="40" style={{ display: "block" }} />
              </div>
              <div className="min-w-0">
                <h1
                  className="text-base leading-tight uppercase tracking-wider truncate"
                  style={{ fontFamily: "Oswald, sans-serif", color: "var(--foreground)", fontWeight: 700 }}
                >
                  {tName}
                </h1>
                <p className="text-xs" style={{ color: "var(--accent)", fontFamily: "Oswald, sans-serif" }}>
                  {tSub}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu de navegação"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ width: 44, height: 44, color: "var(--foreground)", background: "transparent" }}
            >
              <MenuIcon size={24} />
            </button>
          </div>
        </header>

        {/* MOBILE MENU (drawer + backdrop) */}
        {menuOpen && (
          <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Menu de navegação">
            {/* backdrop */}
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 w-full h-full"
              style={{ background: "rgba(0,0,0,0.5)", border: "none" }}
            />
            {/* painel deslizante */}
            <nav
              id="mobile-menu"
              className="absolute top-0 right-0 h-full w-72 max-w-[85%] flex flex-col shadow-2xl"
              style={{ background: "var(--card)", borderLeft: "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                <span
                  className="uppercase tracking-wider text-sm"
                  style={{ fontFamily: "Oswald, sans-serif", color: "var(--muted-foreground)", fontWeight: 600, letterSpacing: "0.08em" }}
                >
                  Menu
                </span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Fechar menu"
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: 44, height: 44, color: "var(--foreground)", background: "transparent" }}
                >
                  <CloseIcon size={22} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => selectTab(tab.path)}
                      aria-current={isActive ? "page" : undefined}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-left w-full transition-all"
                      style={{
                        fontFamily: "Oswald, sans-serif",
                        fontWeight: isActive ? 600 : 400,
                        letterSpacing: "0.06em",
                        fontSize: "16px",
                        minHeight: 48,
                        color: isActive ? "var(--primary-foreground)" : "var(--secondary-foreground)",
                        background: isActive ? "var(--primary)" : "transparent",
                        boxShadow: isActive ? "var(--shadow-md)" : "none",
                      }}
                    >
                      <span className="flex items-center justify-center" style={{ width: "18px" }}><tab.Icon size={18} /></span>
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        )}

        {/* SPONSOR TICKER — both mobile and desktop */}
        <SponsorTicker />

        {/* CONTENT */}
        <main className="flex-1 px-4 py-4 lg:px-8 lg:py-6 2xl:px-12">
          <div key={activeTab} className="w-full max-w-[1600px] mx-auto page-in">
            {activeTab === "classificacao" && (
              <Classification sub={path === "/mata-mata" ? "mata-mata" : "tabela"} />
            )}
            {activeTab === "jogos" && <Schedule />}
            {activeTab === "artilharia" && <Scorers />}
            {activeTab === "times" && <TeamLineup />}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
