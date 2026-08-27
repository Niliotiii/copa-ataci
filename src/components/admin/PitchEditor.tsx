import { useRef, useState } from "react";
import type { Position } from "../../data/types";

export type PitchPlayer = {
  name: string;
  number: string;
  position: Position;
  posX: string; // percentuais 0-100 como string (estado editável)
  posY: string;
};

const positionColors: Record<Position, string> = {
  GOL: "#f59e0b",
  DEF: "#3b82f6",
  ALA: "#8b5cf6",
  MED: "#06b6d4",
  ATA: "#ef4444",
};

function clamp(v: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, v));
}

interface Props {
  players: PitchPlayer[];
  teamColor: string;
  /** Chamado durante e ao fim do arrasto com as novas coordenadas (0-100, 1 casa). */
  onMove: (index: number, posX: number, posY: number) => void;
}

export default function PitchEditor({ players, teamColor, onMove }: Props) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  function pointFromEvent(e: PointerEvent | React.PointerEvent): { x: number; y: number } | null {
    const el = fieldRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100);
    // Uma casa decimal é suficiente e evita ruído.
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  }

  function startDrag(index: number, e: React.PointerEvent) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragging(index);

    const move = (ev: PointerEvent) => {
      const p = pointFromEvent(ev);
      if (p) onMove(index, p.x, p.y);
    };
    const up = () => {
      setDragging(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div
      ref={fieldRef}
      className="relative rounded-2xl overflow-hidden select-none"
      style={{
        background:
          "linear-gradient(180deg,#1a5c2a 0%,#1e6b31 20%,#1a5c2a 40%,#1e6b31 60%,#1a5c2a 80%,#1e6b31 100%)",
        aspectRatio: "2/3",
        border: "3px solid #2a7a3a",
        boxShadow: "inset 0 0 50px rgba(0,0,0,0.4)",
        touchAction: "none",
      }}
    >
      {/* Marcações do campo */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 150" preserveAspectRatio="none" style={{ opacity: 0.4 }}>
        <rect x="4" y="4" width="92" height="142" rx="1" fill="none" stroke="white" strokeWidth="1" />
        <line x1="4" y1="75" x2="96" y2="75" stroke="white" strokeWidth="1" />
        <circle cx="50" cy="75" r="10" fill="none" stroke="white" strokeWidth="1" />
        <rect x="24" y="4" width="52" height="18" fill="none" stroke="white" strokeWidth="1" />
        <rect x="24" y="128" width="52" height="18" fill="none" stroke="white" strokeWidth="1" />
      </svg>

      {/* Jogadores arrastáveis */}
      {players.map((p, i) => {
        const x = clamp(Number(p.posX) || 0);
        const y = clamp(Number(p.posY) || 0);
        const isDragging = dragging === i;
        return (
          <div
            key={i}
            onPointerDown={(e) => startDrag(i, e)}
            className="absolute flex flex-col items-center cursor-grab active:cursor-grabbing"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: isDragging ? 10 : 1,
              touchAction: "none",
            }}
            title={`${p.name || "?"} — arraste para posicionar`}
          >
            <div
              className="rounded-full flex items-center justify-center font-bold border-2"
              style={{
                width: "30px",
                height: "30px",
                background: teamColor,
                color: "#fff",
                borderColor: isDragging ? "#fff" : positionColors[p.position],
                fontFamily: "Oswald, sans-serif",
                fontSize: "11px",
                boxShadow: isDragging ? "0 4px 14px rgba(0,0,0,0.8)" : "0 2px 8px rgba(0,0,0,0.6)",
                transition: isDragging ? "none" : "box-shadow 0.15s",
              }}
            >
              {p.number || p.position.slice(0, 1)}
            </div>
            <div
              className="mt-0.5 px-1.5 py-0.5 rounded text-white whitespace-nowrap"
              style={{
                fontSize: "8px",
                fontWeight: 600,
                background: "rgba(0,0,0,0.7)",
                fontFamily: "Inter, sans-serif",
                maxWidth: "56px",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {p.name || "—"}
            </div>
          </div>
        );
      })}

      {players.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "Inter, sans-serif" }}>
            Adicione jogadores para posicioná-los no campo.
          </span>
        </div>
      )}
    </div>
  );
}
