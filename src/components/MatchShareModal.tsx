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
    <div style={{ flexShrink: 0, filter: "drop-shadow(0 10px 16px rgba(0,0,0,0.30))" }}>
      <div
        style={{
          width: "340px",
          height: "340px",
          borderRadius: "50%",
          background: team.crestUrl ? "#fff" : team.color,
          border: "9px solid #ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          color: "#fff",
          fontWeight: 700,
          fontSize: "124px",
          fontFamily: "'Oswald', 'Arial Narrow', sans-serif",
          letterSpacing: "-0.04em",
          textShadow: "0 2px 4px rgba(0,0,0,0.35)",
        }}
      >
        {team.crestUrl ? <img src={team.crestUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : (team.abbr ?? "?")}
      </div>
    </div>
  );
}

const BANNER_W = 1080;
const BANNER_H = 1920;

/** Escurece uma cor hex (#rrggbb) por um fator 0..1 — para dar profundidade ao split. */
function darken(hex: string, factor = 0.55): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `rgb(${r},${g},${b})`;
}

function SponsorLogo({ s }: { s: Sponsor }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0"
      style={{ width: "78px", height: "78px", background: s.logoUrl ? "#fff" : s.color, fontSize: "23px", fontFamily: "'Oswald', sans-serif", border: "2px solid rgba(255,255,255,0.35)" }}
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
  const [exporting, setExporting] = useState(false);
  // Blob do PNG pré-gerado: o Web Share API (iOS/PWA) exige que navigator.share
  // seja chamado DENTRO do gesto do usuário. Como gerar o PNG é assíncrono e
  // demorado, geramos antes (ao abrir) e guardamos aqui para compartilhar na hora.
  const sharedBlobRef = useRef<Blob | null>(null);
  const [shareReady, setShareReady] = useState(false);
  // Suporte a compartilhar ARQUIVOS via Web Share API (mobile/PWA). No desktop
  // comum não existe — nesse caso caímos no botão Salvar PNG.
  const [canShareFiles, setCanShareFiles] = useState(false);
  useEffect(() => {
    try {
      const probe = new File([new Blob()], "x.png", { type: "image/png" });
      setCanShareFiles(typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
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

  // O banner tem tamanho FIXO (1080×1920 — story do Instagram) para ser
  // determinístico: o que se vê é exatamente o que o snapdom exporta. Aqui só
  // medimos a largura disponível no modal para escalar visualmente o palco.
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
    // Neutraliza a escala visual do wrapper durante a captura, para o snapdom
    // capturar o banner no tamanho REAL (1080×1920), e restaura depois.
    const wrap = scaleWrapRef.current;
    const prevCss = wrap?.style.cssText ?? "";
    if (wrap) {
      // Renderiza em tamanho real, fora da tela, para capturar em 1080×1920.
      wrap.style.transform = "none";
      wrap.style.position = "fixed";
      wrap.style.left = "-10000px";
      wrap.style.top = "0";
    }
    try {
      // Garante que as fontes estejam carregadas antes de capturar (com timeout
      // de segurança para não pendurar em navegadores móveis).
      if (document.fonts) {
        try {
          const fontsReady = Promise.all([
            document.fonts.load("700 100px Oswald"),
            document.fonts.load("italic 700 100px Oswald"),
            document.fonts.load("400 100px Inter"),
          ]).then(() => document.fonts.ready);
          await Promise.race([
            fontsReady,
            new Promise((r) => setTimeout(r, 2500)),
          ]);
        } catch {
          /* segue mesmo se a API de fontes falhar */
        }
      }
      // snapdom captura via <foreignObject> (o próprio navegador rasteriza).
      // scale 1 => 1080×1920 (story cheio) — leve o suficiente para o mobile.
      const { snapdom } = await import("@zumer/snapdom");
      return await snapdom.toBlob(bannerRef.current, {
        type: "png",
        scale: 1,
        embedFonts: true,
        backgroundColor: "#08241b",
        width: BANNER_W,
        height: BANNER_H,
      });
    } finally {
      if (wrap) wrap.style.cssText = prevCss;
      setExporting(false);
    }
  }

  // Pré-gera o PNG assim que o modal abre (quando há share nativo), para que o
  // clique em "Compartilhar" chame navigator.share() sem await no meio — o
  // iOS/PWA exige que share() rode dentro do gesto do usuário.
  useEffect(() => {
    if (!canShareFiles) return;
    let cancelled = false;
    (async () => {
      try {
        const blob = await exportImage();
        if (!cancelled && blob) sharedBlobRef.current = blob;
      } catch {
        /* falha na pré-geração — o clique tenta gerar na hora / baixa */
      } finally {
        // Libera o botão de qualquer forma: nunca deixa preso em "Preparando".
        if (!cancelled) setShareReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [canShareFiles]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDownload() {
    const blob = sharedBlobRef.current ?? (await exportImage());
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName();
    a.click();
    URL.revokeObjectURL(url);
  }

  // Compartilhamento nativo: abre a folha do sistema com o PNG anexado
  // (WhatsApp, Instagram Stories, Telegram…). Usa o blob pré-gerado para não
  // perder a "user activation" (exigência do Web Share no iOS/PWA).
  async function handleNativeShare() {
    const blob = sharedBlobRef.current;
    // Sem blob pronto ainda: cai para download (não dá pra compartilhar sem
    // quebrar a ativação do usuário com um await longo).
    if (!blob) {
      await handleDownload();
      return;
    }
    const file = new File([blob], fileName(), { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${match.teamA.name} × ${match.teamB.name}`,
          text: `⚽ Copa Ataci · ${round} · ${match.date} às ${match.time} · ${match.location}`,
        });
      } else {
        await handleDownload();
      }
    } catch (e) {
      // AbortError = usuário cancelou (silencioso). Outros erros → tenta baixar.
      if ((e as Error)?.name !== "AbortError") {
        await handleDownload();
      }
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
            {/* Fundo split diagonal head-to-head (cores dos dois times) */}
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }} aria-hidden>
              <svg width={BANNER_W} height={BANNER_H} viewBox={`0 0 ${BANNER_W} ${BANNER_H}`} style={{ display: "block" }}>
                <defs>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={match.teamA.color} />
                    <stop offset="1" stopColor={darken(match.teamA.color, 0.4)} />
                  </linearGradient>
                  <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={match.teamB.color} />
                    <stop offset="1" stopColor={darken(match.teamB.color, 0.4)} />
                  </linearGradient>
                  {/* textura de linhas diagonais finas — dá movimento sem foto externa */}
                  <pattern id="stripes" width="46" height="46" patternTransform="rotate(-12)" patternUnits="userSpaceOnUse">
                    <rect width="46" height="46" fill="none" />
                    <rect width="2" height="46" fill="rgba(255,255,255,0.05)" />
                  </pattern>
                  {/* brilho radial de profundidade, centrado no confronto */}
                  <radialGradient id="glow" cx="50%" cy="58%" r="60%">
                    <stop offset="0" stopColor="rgba(255,255,255,0.16)" />
                    <stop offset="55%" stopColor="rgba(255,255,255,0.03)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </radialGradient>
                  {/* vinheta nas bordas para foco central */}
                  <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
                    <stop offset="55%" stopColor="rgba(0,0,0,0)" />
                    <stop offset="100%" stopColor="rgba(3,12,9,0.55)" />
                  </radialGradient>
                </defs>
                {/* metade esquerda (time A) e direita (time B), separadas por diagonal */}
                <polygon points={`0,0 ${BANNER_W * 0.6},0 ${BANNER_W * 0.4},${BANNER_H} 0,${BANNER_H}`} fill="url(#gA)" />
                <polygon points={`${BANNER_W * 0.6},0 ${BANNER_W},0 ${BANNER_W},${BANNER_H} ${BANNER_W * 0.4},${BANNER_H}`} fill="url(#gB)" />
                {/* textura de linhas por cima das cores */}
                <rect x="0" y="0" width={BANNER_W} height={BANNER_H} fill="url(#stripes)" />
                {/* faixa dourada da diagonal */}
                <polygon points={`${BANNER_W * 0.6 - 10},0 ${BANNER_W * 0.6 + 10},0 ${BANNER_W * 0.4 + 10},${BANNER_H} ${BANNER_W * 0.4 - 10},${BANNER_H}`} fill="#c8912b" />
                {/* profundidade: brilho central + vinheta + leve escurecimento p/ leitura */}
                <rect x="0" y="0" width={BANNER_W} height={BANNER_H} fill="url(#glow)" />
                <rect x="0" y="0" width={BANNER_W} height={BANNER_H} fill="rgba(6,20,15,0.20)" />
                <rect x="0" y="0" width={BANNER_W} height={BANNER_H} fill="url(#vignette)" />
              </svg>
            </div>

            {/* ===== TOPO: lockup do campeonato (logo + título em destaque) ===== */}
            <div style={{ position: "relative", zIndex: 1, padding: "56px 48px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              {/* Logo Serra Azul (sem círculo, só brilho para legibilidade) */}
              <img src="/serra-azul.png" alt="" width="210" height="210" style={{ display: "block", filter: "drop-shadow(0 3px 10px rgba(0,0,0,0.55))" }} />

              {/* Selo de edição */}
              <div style={{ marginTop: "20px", color: "#e0a92e", fontSize: "26px", fontWeight: 700, letterSpacing: "0.32em", textTransform: "uppercase", fontFamily: "'Oswald', sans-serif" }}>
                5ª Edição
              </div>

              {/* Nome do campeonato como título dominante, com estrelas laterais */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "22px", marginTop: "6px" }}>
                <span style={{ color: "#e0a92e", fontSize: "34px", lineHeight: 1 }}>★</span>
                <span style={{ color: "#fff", fontSize: "96px", fontWeight: 700, lineHeight: 0.95, letterSpacing: "-0.02em", textTransform: "uppercase", fontFamily: "'Oswald', 'Arial Narrow', sans-serif", textShadow: "0 3px 10px rgba(0,0,0,0.45)" }}>
                  Copa Ataci
                </span>
                <span style={{ color: "#e0a92e", fontSize: "34px", lineHeight: 1 }}>★</span>
              </div>
              {/* Régua dourada sob o título */}
              <div style={{ width: "360px", height: "5px", background: "linear-gradient(90deg, transparent, #e0a92e, transparent)", marginTop: "16px" }} />
            </div>

            {/* ===== INFO: rodada/local + data/hora ===== */}
            <div style={{ position: "relative", zIndex: 1, padding: "64px 64px 0", textAlign: "center" }}>
              <div style={{ display: "inline-block", color: "#e0a92e", fontSize: "30px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", borderTop: "6px solid rgba(224,169,46,0.75)", borderBottom: "6px solid rgba(224,169,46,0.75)", padding: "12px 0" }}>
                {round} · {match.location}
              </div>
              <div style={{ color: "#ffffff", fontSize: "104px", fontWeight: 700, lineHeight: 1.0, letterSpacing: "0.01em", marginTop: "24px", textShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
                {match.date}
              </div>
              <div style={{ color: "#e0a92e", fontSize: "108px", fontWeight: 700, lineHeight: 1, letterSpacing: "0.04em", textShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
                {match.time}
              </div>
            </div>

            {/* ===== CONFRONTO central (escudo+nome por time + emblema VS) ===== */}
            <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "60px 24px 40px" }}>
              {/* Time A: escudo + nome */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "30px" }}>
                <BannerCrest team={match.teamA} />
                <div style={{ color: "#fff", fontSize: "56px", fontWeight: 700, letterSpacing: "-0.01em", textTransform: "uppercase", lineHeight: 1.02, textAlign: "center", fontFamily: "'Oswald', 'Arial Narrow', sans-serif", textShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
                  {match.teamA.name}
                </div>
              </div>

              {/* Time B: escudo + nome */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "30px" }}>
                <BannerCrest team={match.teamB} />
                <div style={{ color: "#fff", fontSize: "56px", fontWeight: 700, letterSpacing: "-0.01em", textTransform: "uppercase", lineHeight: 1.02, textAlign: "center", fontFamily: "'Oswald', 'Arial Narrow', sans-serif", textShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
                  {match.teamB.name}
                </div>
              </div>

              {/* Emblema central: VS ou placar — centro EXATO do banner,
                  alinhado verticalmente ao centro dos escudos (top 60 + raio 170 = 230). */}
              <div style={{ position: "absolute", left: "50%", top: "230px", transform: "translate(-50%, -50%)", zIndex: 3 }}>
                <div style={{ borderRadius: isPlayed ? "26px" : "50%", background: "#08241b", padding: "8px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  {isPlayed ? (
                    <div style={{ minWidth: "170px", height: "170px", borderRadius: "20px", background: "#e0a92e", border: "6px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 22px" }}>
                      <span style={{ color: "#08241b", fontSize: "80px", fontWeight: 700, lineHeight: 1, whiteSpace: "nowrap", fontFamily: "'Oswald', 'Arial Narrow', sans-serif", fontStyle: "italic", letterSpacing: "-0.02em" }}>
                        {match.teamA.score}<span style={{ opacity: 0.65 }}>:</span>{match.teamB.score}
                      </span>
                    </div>
                  ) : (
                    <div style={{ width: "170px", height: "170px", borderRadius: "50%", background: "#e0a92e", border: "7px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#08241b", fontSize: "76px", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em", fontStyle: "italic", fontFamily: "'Oswald', 'Arial Narrow', sans-serif" }}>VS</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ===== RODAPÉ: patrocinadores ===== */}
            <div style={{ position: "relative", zIndex: 1, marginTop: "40px", padding: "32px 48px 40px", background: "#061a14", borderTop: "6px solid #e0a92e" }}>
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: "22px", fontWeight: 600, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "22px" }}>
                Apoio
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "32px", alignItems: "center", flexWrap: "wrap" }}>
                {sponsors.map((s) => <SponsorLogo key={s.initials} s={s} />)}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Share buttons */}
        <div className="flex flex-col gap-2">
          {canShareFiles && (
            <button
              onClick={handleNativeShare}
              disabled={!shareReady}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50"
              style={{ background: "var(--primary)", color: "white", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em", boxShadow: "var(--shadow-md)" }}
            >
              {!shareReady ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  PREPARANDO…
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
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
