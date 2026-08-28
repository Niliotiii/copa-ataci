import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useApi } from "../data/useApi";
import type { Match, MatchTeam, Sponsor } from "../data/types";
import { CloseIcon } from "./icons";

interface Props {
  match: Match;
  round: string;
  onClose: () => void;
}

/** Escudo grande do time no pôster: usa a imagem quando há, senão círculo com sigla. */
function BannerCrest({ team }: { team: MatchTeam }) {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{
        width: "230px",
        height: "230px",
        borderRadius: "50%",
        background: team.crestUrl ? "#fff" : team.color,
        border: "8px solid #fff",
        boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
        color: "#fff",
        fontWeight: 700,
        fontSize: "64px",
        fontFamily: "Oswald, sans-serif",
        letterSpacing: "0.02em",
      }}
    >
      {team.crestUrl ? <img src={team.crestUrl} alt="" className="w-full h-full object-contain" /> : (team.abbr ?? "?")}
    </div>
  );
}

const BANNER_W = 1080;
const BANNER_H = 1920;

function SponsorLogo({ s }: { s: Sponsor }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0"
      style={{ width: "88px", height: "88px", background: s.logoUrl ? "#fff" : s.color, fontSize: "26px", fontFamily: "Oswald, sans-serif", border: "3px solid rgba(255,255,255,0.5)" }}
      title={s.name}
    >
      {s.logoUrl ? <img src={s.logoUrl} alt={s.name} className="w-full h-full object-contain" /> : s.initials}
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

  // O banner tem tamanho FIXO (1080×1350) para ser determinístico: o que se vê é
  // exatamente o que o html2canvas exporta. Aqui só medimos a largura disponível
  // no modal para escalar visualmente o palco (o banner real continua 1080px).
  const stageRef = useRef<HTMLDivElement>(null);
  const scaleWrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      // Escala pela largura, mas limita a altura do preview a ~48vh para não
      // empurrar os botões para fora do modal.
      const maxH = Math.max(240, window.innerHeight * 0.48);
      const byWidth = el.clientWidth / BANNER_W;
      const byHeight = maxH / BANNER_H;
      setScale(Math.min(byWidth, byHeight));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => { ro.disconnect(); window.removeEventListener("resize", update); };
  }, []);

  const isPlayed = match.status === "finalizado";

  /** Nome de arquivo limpo (slug), evitando acentos/espaços no download. */
  function fileName(): string {
    const slug = (t: string) =>
      t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
    const a = match.teamA.abbr ?? match.teamA.name;
    const b = match.teamB.abbr ?? match.teamB.name;
    return `copa-ataci-${slug(a)}-vs-${slug(b)}.png`;
  }

  async function exportImage(): Promise<Blob | null> {
    if (!bannerRef.current) return null;
    setExporting(true);
    // Neutraliza a escala visual do wrapper durante a captura, para o html2canvas
    // renderizar o banner no tamanho REAL (1080×1920), e restaura depois.
    const wrap = scaleWrapRef.current;
    const prevCss = wrap?.style.cssText ?? "";
    if (wrap) {
      // Renderiza em tamanho real, fora da tela, para o html2canvas capturar 1080×1920.
      wrap.style.transform = "none";
      wrap.style.position = "fixed";
      wrap.style.left = "-10000px";
      wrap.style.top = "0";
    }
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(bannerRef.current, {
        scale: 1,
        useCORS: true,
        backgroundColor: "#08241b",
        logging: false,
        width: BANNER_W,
        height: BANNER_H,
        windowWidth: BANNER_W,
        windowHeight: BANNER_H,
      });
      return await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    } finally {
      if (wrap) wrap.style.cssText = prevCss;
      setExporting(false);
    }
  }

  async function handleDownload() {
    const blob = await exportImage();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName();
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    const blob = await exportImage();
    if (!blob) return;
    const file = new File([blob], fileName(), { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        text: `⚽ ${round} · ${match.teamA.name} × ${match.teamB.name} · ${match.date} às ${match.time} · ${match.location}`,
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

        {/* PALCO: mede a largura e escala o banner de tamanho fixo (story 1080×1920) */}
        <div
          ref={stageRef}
          style={{ position: "relative", width: "100%", height: `${BANNER_H * scale}px`, borderRadius: "16px", overflow: "hidden", background: "#08241b" }}
        >
          {/* Wrapper que aplica APENAS a escala visual (o banner real fica 1080×1920) */}
          <div ref={scaleWrapRef} style={{ position: "absolute", top: 0, left: "50%", transform: `translateX(-50%) scale(${scale})`, transformOrigin: "top center" }}>
          {/* ===== BANNER (tamanho FIXO 1080×1920 — story do Instagram) ===== */}
          <div
            ref={bannerRef}
            style={{
              width: `${BANNER_W}px`,
              height: `${BANNER_H}px`,
              position: "relative",
              background: "#08241b",
              overflow: "hidden",
              fontFamily: "Oswald, sans-serif",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Fundo decorativo (atrás de tudo) */}
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }} aria-hidden>
              <div style={{ position: "absolute", top: "24%", left: 0, width: "100%", height: "40%", background: "linear-gradient(180deg, #0b6e4f 0%, #0e3b2c 100%)" }} />
              <div style={{ position: "absolute", top: "24%", left: 0, width: "100%", height: "6px", background: "#c8912b" }} />
              <div style={{ position: "absolute", top: "64%", left: 0, width: "100%", height: "6px", background: "#c8912b" }} />
            </div>

            {/* ===== TOPO: marca ===== */}
            <div style={{ position: "relative", zIndex: 1, padding: "64px 64px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px" }}>
              <img src="/serra-azul.png" alt="" width="150" height="150" style={{ display: "block", filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.4))" }} />
              <div style={{ background: "#c8912b", padding: "14px 34px", borderRadius: "999px" }}>
                <span style={{ color: "#08241b", fontSize: "30px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Copa Ataci · 5ª Edição
                </span>
              </div>
            </div>

            {/* ===== INFO: rodada/local + data/hora ===== */}
            <div style={{ position: "relative", zIndex: 1, padding: "72px 64px 0", textAlign: "center" }}>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "30px", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                {round} <span style={{ color: "#c8912b" }}>·</span> {match.location}
              </div>
              <div style={{ color: "#ffffff", fontSize: "84px", fontWeight: 700, lineHeight: 1.05, letterSpacing: "0.01em", marginTop: "12px", textShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
                {match.date} <span style={{ color: "#c8912b" }}>·</span> {match.time}
              </div>
            </div>

            {/* ===== CONFRONTO: escudos + × (3 colunas iguais) ===== */}
            <div style={{ position: "relative", zIndex: 1, flex: 1, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", padding: "48px 64px" }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <BannerCrest team={match.teamA} />
              </div>
              <div style={{ padding: "0 32px", textAlign: "center" }}>
                {isPlayed ? (
                  <span style={{ color: "#fff", fontSize: "120px", fontWeight: 700, lineHeight: 1, textShadow: "0 6px 20px rgba(0,0,0,0.6)", whiteSpace: "nowrap" }}>
                    {match.teamA.score}<span style={{ color: "#c8912b" }}>:</span>{match.teamB.score}
                  </span>
                ) : (
                  <span style={{ color: "#c8912b", fontSize: "120px", fontWeight: 700, lineHeight: 1, textShadow: "0 6px 20px rgba(0,0,0,0.6)" }}>×</span>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <BannerCrest team={match.teamB} />
              </div>
            </div>

            {/* ===== NOMES (centralizados) ===== */}
            <div style={{ position: "relative", zIndex: 1, padding: "0 64px 8px", textAlign: "center" }}>
              <div style={{ color: "#fff", fontSize: "56px", fontWeight: 700, letterSpacing: "0.01em", textTransform: "uppercase", lineHeight: 1.15 }}>
                {match.teamA.name}
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "28px", fontWeight: 600, letterSpacing: "0.24em", margin: "10px 0" }}>VS</div>
              <div style={{ color: "#fff", fontSize: "56px", fontWeight: 700, letterSpacing: "0.01em", textTransform: "uppercase", lineHeight: 1.15 }}>
                {match.teamB.name}
              </div>
            </div>

            {/* ===== RODAPÉ: patrocinadores ===== */}
            <div style={{ position: "relative", zIndex: 1, marginTop: "48px", padding: "40px 48px", background: "#061a14", borderTop: "6px solid #c8912b" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "36px", alignItems: "center", flexWrap: "wrap" }}>
                {sponsors.map((s) => <SponsorLogo key={s.initials} s={s} />)}
              </div>
            </div>
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
