import { useApi } from "../data/useApi";
import type { Sponsor } from "../data/types";

function SponsorItem({ sponsor }: { sponsor: Sponsor }) {
  return (
    <div
      className="flex items-center gap-2.5 flex-shrink-0 px-6"
      style={{ borderRight: "1px solid var(--border)" }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden"
        style={{ background: sponsor.logoUrl ? "var(--card)" : sponsor.color, fontSize: "10px", fontFamily: "Oswald, sans-serif" }}
      >
        {sponsor.logoUrl ? <img src={sponsor.logoUrl} alt="" className="w-full h-full object-contain" /> : sponsor.initials}
      </div>
      <div>
        <div
          className="text-xs font-bold leading-tight whitespace-nowrap"
          style={{ color: "var(--foreground)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.04em" }}
        >
          {sponsor.name}
        </div>
        {sponsor.tagline && (
          <div className="text-xs leading-tight whitespace-nowrap" style={{ color: "var(--muted-foreground)", fontSize: "9px" }}>
            {sponsor.tagline}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SponsorTicker() {
  const { data } = useApi<Sponsor[]>("/api/sponsors");
  const sponsors = data ?? [];

  // Não renderiza a faixa enquanto não há patrocinadores carregados.
  if (sponsors.length === 0) return null;

  return (
    <div
      className="relative overflow-hidden flex items-center"
      style={{
        background: "var(--secondary)",
        borderBottom: "1px solid var(--border)",
        borderTop: "1px solid var(--border)",
        height: "48px",
      }}
    >
      {/* Fixed label */}
      <div
        className="absolute left-0 top-0 bottom-0 z-20 flex items-center px-3 flex-shrink-0"
        style={{
          background: "var(--accent)",
          color: "var(--accent-foreground)",
          fontFamily: "Oswald, sans-serif",
          letterSpacing: "0.1em",
          fontSize: "9px",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        PATROCINADORES
      </div>

      {/* Left fade */}
      <div
        className="absolute z-10 top-0 bottom-0 pointer-events-none"
        style={{
          left: "108px",
          width: "32px",
          background: "linear-gradient(to right, var(--secondary), transparent)",
        }}
      />
      {/* Right fade */}
      <div
        className="absolute right-0 top-0 bottom-0 z-10 w-16 pointer-events-none"
        style={{ background: "linear-gradient(to left, var(--secondary), transparent)" }}
      />

      {/* Scrolling area */}
      <div
        className="absolute top-0 bottom-0 flex items-center"
        style={{ left: "108px", right: 0, overflow: "hidden" }}
      >
        <div
          className="flex items-center h-full"
          style={{ animation: "ticker-scroll 24s linear infinite", willChange: "transform" }}
        >
          {/* Set A */}
          <div className="flex items-center h-full flex-shrink-0">
            {sponsors.map((s, i) => <SponsorItem key={`a-${i}`} sponsor={s} />)}
          </div>
          {/* Set B — cópia exata para costura invisível */}
          <div className="flex items-center h-full flex-shrink-0">
            {sponsors.map((s, i) => <SponsorItem key={`b-${i}`} sponsor={s} />)}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
