import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useApi } from "../data/useApi";
import type { Match, Sponsor } from "../data/types";
import { CloseIcon } from "./icons";

interface Props {
  match: Match;
  round: string;
  onClose: () => void;
}

function SponsorLogo({ s }: { s: Sponsor }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className="rounded-full flex items-center justify-center text-white font-bold overflow-hidden"
        style={{ width: "26px", height: "26px", background: s.logoUrl ? "#fff" : s.color, fontSize: "8px", fontFamily: "Oswald, sans-serif", border: "1px solid rgba(255,255,255,0.5)" }}
      >
        {s.logoUrl ? <img src={s.logoUrl} alt="" className="w-full h-full object-contain" /> : s.initials}
      </div>
      <span style={{ fontSize: "6px", color: "rgba(255,255,255,0.75)", fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>
        {s.name}
      </span>
    </div>
  );
}

export default function MatchShareModal({ match, round, onClose }: Props) {
  const bannerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  // O compartilhamento nativo (Web Share com arquivos) só existe em alguns
  // navegadores (sobretudo mobile/HTTPS). No desktop normalmente não há, então
  // evitamos mostrar um botão "Compartilhar" que apenas duplicaria o "Salvar PNG".
  const [canShareFiles, setCanShareFiles] = useState(false);
  useEffect(() => {
    try {
      const probe = new File([new Blob()], "probe.png", { type: "image/png" });
      setCanShareFiles(Boolean(navigator.canShare?.({ files: [probe] })));
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  // Fecha no Esc, move o foco para o botão fechar ao abrir e mantém o foco
  // preso dentro do diálogo (focus-trap) enquanto aberto.
  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const { data: sponsorData } = useApi<Sponsor[]>("/api/sponsors");
  const sponsors = sponsorData ?? [];

  const isPlayed = match.status === "finalizado";

  async function exportImage(): Promise<Blob | null> {
    if (!bannerRef.current) return null;
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(bannerRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      return await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    } finally {
      setExporting(false);
    }
  }

  async function handleDownload() {
    const blob = await exportImage();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `copa-ataci-${match.teamA.abbr ?? "A"}-vs-${match.teamB.abbr ?? "B"}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    const blob = await exportImage();
    if (!blob) return;
    const file = new File([blob], "copa-ataci.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: `Copa Ataci · ${match.teamA.name} vs ${match.teamB.name}`,
        text: `⚽ ${round} · ${match.date} às ${match.time} · ${match.location}`,
        files: [file],
      });
    } else {
      handleDownload();
    }
  }

  function handleWhatsApp() {
    const text = encodeURIComponent(
      `⚽ *Copa Ataci 5ª Edição*\n${round} · ${match.date} às ${match.time}\n\n${match.teamA.name} ${isPlayed ? match.teamA.score + " x " + match.teamB.score : "x"} ${match.teamB.name}\n\n📍 ${match.location}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  async function handleCopy() {
    const text = `⚽ Copa Ataci 5ª Edição · ${round} · ${match.date} às ${match.time}\n${match.teamA.name} ${isPlayed ? match.teamA.score + " x " + match.teamB.score : "x"} ${match.teamB.name} · ${match.location}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        aria-labelledby="share-modal-title"
        className="w-full max-w-sm flex flex-col rounded-2xl overflow-hidden"
        style={{ maxHeight: "90vh", overflowY: "auto", background: "var(--card)", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)" }}
      >
        {/* Header do modal */}
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
          <span
            id="share-modal-title"
            className="text-sm font-bold uppercase tracking-wider"
            style={{ fontFamily: "Oswald, sans-serif", color: "var(--foreground)", letterSpacing: "0.08em" }}
          >
            Compartilhar Jogo
          </span>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Corpo com o banner + botões */}
        <div className="p-5 flex flex-col gap-4">

        {/* ===== BANNER (pôster matchday, vertical) ===== */}
        <div
          ref={bannerRef}
          style={{
            position: "relative",
            background: "linear-gradient(160deg, #0e3b2c 0%, #0b6e4f 45%, #0a2a20 100%)",
            borderRadius: "16px",
            overflow: "hidden",
            fontFamily: "Oswald, sans-serif",
            width: "100%",
            aspectRatio: "9 / 16",
          }}
        >
          {/* Textura sutil de linhas (fundo) */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.06 }} viewBox="0 0 100 178" preserveAspectRatio="none" aria-hidden>
            {Array.from({ length: 18 }).map((_, i) => (
              <path key={i} d={`M0,${i * 10} Q50,${i * 10 + 6} 100,${i * 10}`} stroke="#ffffff" strokeWidth="0.5" fill="none" />
            ))}
          </svg>

          {/* Nome do torneio repetido gigante ao fundo (efeito camadas) */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden" }} aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  fontFamily: "Oswald, sans-serif",
                  fontWeight: 700,
                  fontSize: "62px",
                  lineHeight: 0.92,
                  letterSpacing: "-0.02em",
                  whiteSpace: "nowrap",
                  color: i % 2 === 0 ? "rgba(255,255,255,0.08)" : "rgba(200,145,43,0.18)",
                  transform: `translateX(${i % 2 === 0 ? -10 : -32}px)`,
                  textTransform: "uppercase",
                }}
              >
                COPA ATACI
              </div>
            ))}
          </div>

          {/* Silhueta de jogador fictício (chute), em dourado translúcido */}
          <svg
            style={{ position: "absolute", right: "-6%", bottom: 0, height: "62%", width: "auto", filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.45))" }}
            viewBox="0 0 220 380"
            fill="none"
            aria-hidden
          >
            <g fill="#c8912b">
              {/* cabeça */}
              <circle cx="120" cy="34" r="20" />
              {/* tronco */}
              <path d="M96 52 q24 -8 44 6 l10 70 q-30 14 -64 2 z" />
              {/* braço de trás */}
              <path d="M100 62 q-30 22 -34 60 l14 6 q10 -34 32 -50 z" />
              {/* braço da frente */}
              <path d="M140 66 q34 10 44 40 l-12 10 q-16 -24 -40 -30 z" />
              {/* perna de apoio */}
              <path d="M104 126 q-6 60 -30 104 l18 8 q28 -46 34 -104 z" />
              {/* perna do chute */}
              <path d="M132 122 q30 30 74 40 l-4 20 q-52 -6 -92 -40 z" />
              {/* chuteira */}
              <path d="M198 178 l18 4 -2 14 -20 -4 z" />
              <path d="M88 236 l-16 12 8 12 20 -10 z" />
            </g>
            {/* bola */}
            <circle cx="210" cy="196" r="14" fill="#f5f7fa" stroke="#0e3b2c" strokeWidth="2" />
            <path d="M210 188 l5 4 -2 6 -6 0 -2 -6 z" fill="#0e3b2c" />
          </svg>

          {/* ===== CABEÇALHO ===== */}
          <div style={{ position: "relative", padding: "22px 20px 0", textAlign: "center" }}>
            <div style={{ color: "#f0d9a6", fontSize: "13px", fontStyle: "italic", fontFamily: "Georgia, serif", letterSpacing: "0.04em" }}>
              Copa Ataci
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "9px", letterSpacing: "0.14em", marginTop: "2px", textTransform: "uppercase" }}>
              {match.location}
            </div>

            {/* Confronto */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginTop: "14px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: match.teamA.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "12px", border: "2px solid rgba(255,255,255,0.85)" }}>
                  {match.teamA.abbr ?? "?"}
                </div>
              </div>
              <div style={{ color: "#c8912b", fontSize: "26px", fontWeight: 700, letterSpacing: "0.04em" }}>×</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: match.teamB.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "12px", border: "2px solid rgba(255,255,255,0.85)" }}>
                  {match.teamB.abbr ?? "?"}
                </div>
              </div>
            </div>
            <div style={{ color: "#ffffff", fontSize: "18px", fontWeight: 700, marginTop: "8px", letterSpacing: "0.02em", textTransform: "uppercase" }}>
              {(match.teamA.abbr ?? match.teamA.name)} <span style={{ color: "#c8912b" }}>×</span> {(match.teamB.abbr ?? match.teamB.name)}
            </div>

            {/* Faixa data/hora ou placar */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginTop: "12px", background: "#c8912b", color: "#0e1b2c", padding: "5px 16px", borderRadius: "999px", fontWeight: 700, fontSize: "13px", letterSpacing: "0.06em" }}>
              {isPlayed ? (
                <span>{match.teamA.score} × {match.teamB.score}</span>
              ) : (
                <span>{match.date} · {match.time}</span>
              )}
            </div>
          </div>

          {/* ===== RODAPÉ: patrocinadores + hashtag ===== */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "12px 16px", background: "linear-gradient(to top, rgba(6,26,20,0.9), transparent)" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
              {sponsors.slice(0, 5).map((s) => <SponsorLogo key={s.initials} s={s} />)}
            </div>
            <div style={{ textAlign: "center", marginTop: "8px" }}>
              <span style={{ color: "#c8912b", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em" }}>#CopaAtaci</span>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "9px", letterSpacing: "0.06em", marginLeft: "8px" }}>5ª EDIÇÃO · SOCIETY 7×7</span>
            </div>
          </div>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-2 gap-2">
          {/* Ação primária: compartilhar (nativo) OU salvar PNG (desktop) */}
          {canShareFiles ? (
            <button
              onClick={handleShare}
              disabled={exporting}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50"
              style={{ background: "var(--primary)", color: "white", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em", boxShadow: "var(--shadow-md)" }}
            >
              {exporting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              )}
              COMPARTILHAR
            </button>
          ) : (
            <button
              onClick={handleDownload}
              disabled={exporting}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50"
              style={{ background: "var(--primary)", color: "white", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em", boxShadow: "var(--shadow-md)" }}
            >
              {exporting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
              SALVAR PNG
            </button>
          )}

          <button
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-opacity"
            style={{ background: "#25d366", color: "white", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.555 4.122 1.522 5.855L.057 23.882l6.204-1.626A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 0 1-5.031-1.384l-.36-.214-3.732.979.995-3.636-.235-.373A9.772 9.772 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z" />
            </svg>
            WHATSAPP
          </button>

          {/* Salvar PNG só aparece aqui quando há share nativo (senão é o primário) */}
          {canShareFiles && (
            <button
              onClick={handleDownload}
              disabled={exporting}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50"
              style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              SALVAR PNG
            </button>
          )}

          <button
            onClick={handleCopy}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${canShareFiles ? "" : "col-span-2"}`}
            style={{
              background: copied ? "var(--primary-soft)" : "var(--secondary)",
              color: copied ? "var(--primary)" : "var(--foreground)",
              border: `1px solid ${copied ? "var(--primary)" : "var(--border)"}`,
              fontFamily: "Oswald, sans-serif",
              letterSpacing: "0.06em",
            }}
          >
            {copied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                COPIADO!
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                COPIAR TEXTO
              </>
            )}
          </button>
        </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
