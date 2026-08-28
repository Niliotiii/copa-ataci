import { textColorOn } from "../data/color";

/**
 * Avatar do time: usa o escudo (crestUrl) quando existir; caso contrário,
 * mostra a sigla sobre a cor do time. Reutilizado na classificação, jogos,
 * mata-mata, artilharia, suspensões, etc.
 */
export default function TeamCrest({
  abbr,
  color,
  crestUrl,
  size = 28,
  fontSize,
}: {
  abbr: string | null | undefined;
  color: string | null | undefined;
  crestUrl?: string | null;
  size?: number;
  fontSize?: number;
}) {
  const bg = color ?? "#6b7280";
  const label = (abbr ?? "?").slice(0, 3);
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        background: crestUrl ? "var(--secondary)" : bg,
        color: textColorOn(bg),
        fontFamily: "Oswald, sans-serif",
        fontSize: fontSize ?? Math.max(8, Math.round(size * 0.32)),
      }}
    >
      {crestUrl ? <img src={crestUrl} alt="" className="w-full h-full object-contain" /> : label}
    </div>
  );
}
