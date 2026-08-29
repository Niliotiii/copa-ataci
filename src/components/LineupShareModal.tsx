import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useApi } from "../data/useApi";
import type { Sponsor, TeamDetail } from "../data/types";
import type { BoardPlayer } from "../data/useLineupBoard";
import { CloseIcon } from "./icons";

interface Props {
  team: TeamDetail;
  onField: BoardPlayer[];
  onBench: BoardPlayer[];
  onClose: () => void;
}

const BANNER_W = 1080;
const BANNER_H = 1920;

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2);
}

function SponsorLogo({ s }: { s: Sponsor }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0"
      style={{ width: "72px", height: "72px", background: s.logoUrl ? "#fff" : s.color, fontSize: "22px", fontFamily: "'Oswald', sans-serif", border: "2px solid rgba(255,255,255,0.35)" }}
      title={s.name}
    >
      {s.logoUrl ? <img src={s.logoUrl} alt={s.name} className="w-full h-full object-contain" /> : s.initials}
    </div>
  );
}

/** Compartilha a prancheta (campo + banco) como um story 1080×1920. */
export default function LineupShareModal({ team, onField, onBench, onClose }: Props) {
  const bannerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const scaleWrapRef = useRef<HTMLDivElement>(null);
  const sharedBlobRef = useRef<Blob | null>(null);
  const [exporting, setExporting] = useState(false);
  const [shareReady, setShareReady] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [scale, setScale] = useState(0.2);

  const { data: sponsorData } = useApi<Sponsor[]>("/api/sponsors");
  const sponsors = sponsorData ?? [];

  useEffect(() => {
    try {
      const probe = new File([new Blob()], "x.png", { type: "image/png" });
      setCanShareFiles(typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  // Esc fecha; foco inicial no botão fechar; focus-trap.
  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const f = dialogRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (f.length === 0) return;
      const first = f[0], last = f[f.length - 1], active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const maxH = Math.max(240, window.innerHeight * 0.48);
      setScale(Math.min(el.clientWidth / BANNER_W, maxH / BANNER_H));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => { ro.disconnect(); window.removeEventListener("resize", update); };
  }, []);

  function fileName() {
    const slug = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
    return `copa-ataci-escalacao-${slug(team.abbr || team.name)}.png`;
  }

  async function exportImage(): Promise<Blob | null> {
    if (!bannerRef.current) return null;
    setExporting(true);
    const wrap = scaleWrapRef.current;
    const prevCss = wrap?.style.cssText ?? "";
    if (wrap) {
      wrap.style.transform = "none";
      wrap.style.position = "fixed";
      wrap.style.left = "-10000px";
      wrap.style.top = "0";
    }
    try {
      if (document.fonts) {
        try {
          const fontsReady = Promise.all([
            document.fonts.load("700 100px Oswald"),
            document.fonts.load("400 100px Inter"),
          ]).then(() => document.fonts.ready);
          await Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]);
        } catch { /* segue */ }
      }
      const { snapdom } = await import("@zumer/snapdom");
      return await snapdom.toBlob(bannerRef.current, {
        type: "png", scale: 1, embedFonts: true, backgroundColor: "#08241b", width: BANNER_W, height: BANNER_H,
      });
    } finally {
      if (wrap) wrap.style.cssText = prevCss;
      setExporting(false);
    }
  }

  useEffect(() => {
    if (!canShareFiles) return;
    let cancelled = false;
    (async () => {
      try {
        const blob = await exportImage();
        if (!cancelled && blob) sharedBlobRef.current = blob;
      } catch { /* clique tenta na hora */ }
      finally { if (!cancelled) setShareReady(true); }
    })();
    return () => { cancelled = true; };
  }, [canShareFiles]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDownload() {
    const blob = sharedBlobRef.current ?? (await exportImage());
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName(); a.click();
    URL.revokeObjectURL(url);
  }

  async function handleNativeShare() {
    const blob = sharedBlobRef.current;
    if (!blob) { await handleDownload(); return; }
    const file = new File([blob], fileName(), { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Escalação · ${team.name}`, text: `⚽ Copa Ataci · minha escalação do ${team.name}` });
      } else {
        await handleDownload();
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") await handleDownload();
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lineup-share-title"
        className="w-full max-w-sm flex flex-col rounded-2xl overflow-hidden"
        style={{ maxHeight: "90vh", overflowY: "auto", background: "var(--card)", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
          <span id="lineup-share-title" className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: "Oswald, sans-serif", color: "var(--foreground)", letterSpacing: "0.08em" }}>
            Compartilhar Escalação
          </span>
          <button ref={closeRef} onClick={onClose} aria-label="Fechar" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div ref={stageRef} style={{ position: "relative", width: "100%", height: `${BANNER_H * scale}px`, borderRadius: "16px", overflow: "hidden", background: "#08241b" }}>
            <div ref={scaleWrapRef} style={{ position: "absolute", top: 0, left: "50%", transform: `translateX(-50%) scale(${scale})`, transformOrigin: "top center" }}>
              {/* ===== BANNER 1080×1920 ===== */}
              <div
                ref={bannerRef}
                style={{ width: `${BANNER_W}px`, height: `${BANNER_H}px`, position: "relative", background: "#08241b", overflow: "hidden", fontFamily: "Oswald, sans-serif", display: "flex", flexDirection: "column" }}
              >
                {/* Fundo */}
                <div style={{ position: "absolute", inset: 0, zIndex: 0 }} aria-hidden>
                  <svg width={BANNER_W} height={BANNER_H} viewBox={`0 0 ${BANNER_W} ${BANNER_H}`} style={{ display: "block" }}>
                    <defs>
                      <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#0b3d2a" />
                        <stop offset="1" stopColor="#061a14" />
                      </linearGradient>
                      <pattern id="lstripes" width="46" height="46" patternTransform="rotate(-12)" patternUnits="userSpaceOnUse">
                        <rect width="46" height="46" fill="none" />
                        <rect width="2" height="46" fill="rgba(255,255,255,0.04)" />
                      </pattern>
                    </defs>
                    <rect x="0" y="0" width={BANNER_W} height={BANNER_H} fill="url(#lg)" />
                    <rect x="0" y="0" width={BANNER_W} height={BANNER_H} fill="url(#lstripes)" />
                  </svg>
                </div>

                {/* Cabeçalho: escudo + nome do time + Copa Ataci */}
                <div style={{ position: "relative", zIndex: 1, padding: "56px 56px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", color: "#e0a92e", fontSize: "24px", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase" }}>
                    <span style={{ fontSize: "26px" }}>★</span> Copa Ataci · Escalação <span style={{ fontSize: "26px" }}>★</span>
                  </div>
                  <div style={{ marginTop: "34px", display: "flex", alignItems: "center", gap: "34px" }}>
                    <div style={{ filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.35))" }}>
                      <div style={{ width: "170px", height: "170px", borderRadius: "50%", background: team.crestUrl ? "#fff" : team.color, border: "7px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", color: "#fff", fontWeight: 700, fontSize: "64px", fontFamily: "'Oswald','Arial Narrow',sans-serif" }}>
                        {team.crestUrl ? <img src={team.crestUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : (team.abbr || initials(team.name))}
                      </div>
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ color: "#fff", fontSize: "80px", fontWeight: 700, lineHeight: 0.98, textTransform: "uppercase", letterSpacing: "-0.01em", fontFamily: "'Oswald','Arial Narrow',sans-serif", textShadow: "0 3px 8px rgba(0,0,0,0.4)" }}>
                        {team.name}
                      </div>
                    </div>
                  </div>
                  <div style={{ width: "420px", height: "5px", background: "linear-gradient(90deg, transparent, #e0a92e, transparent)", marginTop: "26px" }} />
                </div>

                {/* Campo com jogadores posicionados */}
                <div style={{ position: "relative", zIndex: 1, flex: 1, padding: "40px 56px 24px", display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      position: "relative", flex: 1, borderRadius: "24px", overflow: "hidden",
                      background: "linear-gradient(180deg,#1a5c2a 0%,#1e6b31 20%,#1a5c2a 40%,#1e6b31 60%,#1a5c2a 80%,#1e6b31 100%)",
                      border: "5px solid #2a7a3a", boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
                    }}
                  >
                    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.4 }} viewBox="0 0 100 150" preserveAspectRatio="none">
                      <rect x="4" y="4" width="92" height="142" rx="1" fill="none" stroke="white" strokeWidth="1" />
                      <line x1="4" y1="75" x2="96" y2="75" stroke="white" strokeWidth="1" />
                      <circle cx="50" cy="75" r="10" fill="none" stroke="white" strokeWidth="1" />
                      <rect x="24" y="4" width="52" height="18" fill="none" stroke="white" strokeWidth="1" />
                      <rect x="24" y="128" width="52" height="18" fill="none" stroke="white" strokeWidth="1" />
                    </svg>
                    {onField.map((p) => (
                      <div key={p.key} style={{ position: "absolute", left: `${p.posX}%`, top: `${p.posY}%`, transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        {/* Sombra via drop-shadow no wrapper: no snapdom/WebKit o box-shadow
                            com blur num círculo vira um retângulo atrás. */}
                        <div style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.55))" }}>
                          <div style={{ width: "76px", height: "76px", borderRadius: "50%", background: team.color, color: "#fff", border: "4px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "30px", fontFamily: "'Oswald',sans-serif" }}>
                            {p.number ?? initials(p.name)}
                          </div>
                        </div>
                        <div style={{ marginTop: "6px", padding: "4px 10px", borderRadius: "6px", background: "rgba(0,0,0,0.72)", color: "#fff", fontSize: "20px", fontWeight: 600, fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.name}
                        </div>
                      </div>
                    ))}
                    {onField.length === 0 && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.8)", fontSize: "30px", fontFamily: "'Inter',sans-serif" }}>
                        Nenhum jogador em campo
                      </div>
                    )}
                  </div>

                  {/* Reservas (sem rótulo) */}
                  <div style={{ marginTop: "22px", borderRadius: "18px", background: "rgba(6,26,20,0.72)", border: "2px solid rgba(224,169,46,0.4)", padding: "18px 22px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                      {onBench.length === 0 && (
                        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "24px", fontFamily: "'Inter',sans-serif" }}>Sem reservas</span>
                      )}
                      {onBench.map((p) => (
                        <div key={p.key} style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.08)", borderRadius: "999px", padding: "8px 18px 8px 8px" }}>
                          <span style={{ width: "48px", height: "48px", borderRadius: "50%", background: team.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "20px", fontFamily: "'Oswald',sans-serif", border: "2px solid rgba(255,255,255,0.6)" }}>
                            {p.number ?? initials(p.name)}
                          </span>
                          <span style={{ color: "#fff", fontSize: "24px", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }}>{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Rodapé: patrocinadores */}
                <div style={{ position: "relative", zIndex: 1, padding: "26px 48px 40px", background: "#061a14", borderTop: "6px solid #e0a92e" }}>
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: "20px", fontWeight: 600, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "18px" }}>
                    Apoio
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: "28px", alignItems: "center", flexWrap: "wrap" }}>
                    {sponsors.map((s) => <SponsorLogo key={s.initials} s={s} />)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex flex-col gap-2">
            {canShareFiles && (
              <button
                onClick={handleNativeShare}
                disabled={!shareReady}
                className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50"
                style={{ background: "var(--primary)", color: "white", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em", boxShadow: "var(--shadow-md)" }}
              >
                {!shareReady ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> PREPARANDO…</>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                    COMPARTILHAR
                  </>
                )}
              </button>
            )}
            <button
              onClick={handleDownload}
              disabled={exporting}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50"
              style={{ background: canShareFiles ? "var(--secondary)" : "var(--primary)", color: canShareFiles ? "var(--foreground)" : "white", border: canShareFiles ? "1px solid var(--border)" : "none", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em", boxShadow: canShareFiles ? "none" : "var(--shadow-md)" }}
            >
              {exporting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
              SALVAR PNG
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
