import { useEffect, useState } from "react";
import { useApi } from "../data/useApi";
import type { Sponsor } from "../data/types";

interface Props {
  /** Chamado quando o splash termina (após tempo mínimo + dados prontos). */
  onDone: () => void;
  /** Tempo mínimo em tela para o splash não "piscar". */
  minMs?: number;
}

/**
 * Tela de carregamento inicial: a logo Serra Azul no centro e os círculos dos
 * patrocinadores dispostos em um anel que gira (spinner). O splash some depois
 * de um tempo mínimo E de os patrocinadores terem sido buscados (o que também
 * "aquece" o cache da API para o portal renderizar sem flashes).
 */
export default function SplashScreen({ onDone, minMs = 3000 }: Props) {
  const { data, loading } = useApi<Sponsor[]>("/api/sponsors");
  const sponsors = data ?? [];
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const elapsed = Date.now() - start;
      // Pronto quando passou o tempo mínimo e a busca de sponsors terminou.
      if (elapsed >= minMs && !loading) {
        setLeaving(true);
        // Aguarda a transição de saída antes de desmontar.
        window.setTimeout(onDone, 420);
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [loading, minMs, onDone]);

  // Anel: usa os patrocinadores reais quando já chegaram; senão, placeholders
  // para o spinner nunca ficar vazio.
  const count = Math.max(sponsors.length, 6);
  const items = sponsors.length > 0 ? sponsors : Array.from({ length: count }, () => null);
  const radius = 92; // px — raio do anel

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Carregando a Copa Ataci"
      className="fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-[400ms]"
      style={{
        background: "rgba(243, 246, 250, 0.55)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        opacity: leaving ? 0 : 1,
        pointerEvents: leaving ? "none" : "auto",
      }}
    >
      <div className="flex flex-col items-center gap-8">
        {/* Anel giratório com os círculos dos patrocinadores + logo central */}
        <div style={{ position: "relative", width: `${radius * 2 + 56}px`, height: `${radius * 2 + 56}px` }}>
          {/* Camada que gira */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              animation: "splash-spin 3.2s linear infinite",
              willChange: "transform",
            }}
          >
            {items.map((s, i) => {
              const angle = (i / items.length) * 2 * Math.PI - Math.PI / 2;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    top: "50%",
                    left: "50%",
                    width: "44px",
                    height: "44px",
                    marginTop: "-22px",
                    marginLeft: "-22px",
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                >
                  {/* Contra-rotação isolada: mantém o círculo "de pé" enquanto o anel gira. */}
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center text-white font-bold overflow-hidden"
                    style={{
                      background: s?.logoUrl ? "#fff" : (s?.color ?? "var(--muted)"),
                      border: "2px solid rgba(255,255,255,0.6)",
                      boxShadow: "var(--shadow-sm)",
                      fontFamily: "'Oswald', sans-serif",
                      fontSize: "13px",
                      color: "#fff",
                      animation: "splash-spin-rev 3.2s linear infinite",
                    }}
                    title={s?.name}
                  >
                    {s?.logoUrl ? (
                      <img src={s.logoUrl} alt="" className="w-full h-full object-contain" />
                    ) : (
                      s?.initials ?? ""
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Logo central fixa */}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img
              src="/serra-azul.png"
              alt=""
              width={72}
              height={72}
              style={{ display: "block", filter: "drop-shadow(0 4px 10px rgba(14,27,44,0.25))" }}
            />
          </div>
        </div>

        {/* Título */}
        <div className="flex flex-col items-center">
          <span
            className="uppercase"
            style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, letterSpacing: "0.16em", color: "var(--foreground)", fontSize: "18px" }}
          >
            Copa Ataci
          </span>
        </div>
      </div>

      <style>{`
        @keyframes splash-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes splash-spin-rev { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @media (prefers-reduced-motion: reduce) {
          [aria-label="Carregando a Copa Ataci"] * { animation-duration: 0s !important; }
        }
      `}</style>
    </div>
  );
}
