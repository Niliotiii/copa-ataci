import { useRef, useState } from "react";
import type { Position } from "../data/types";
import type { BoardPlayer } from "../data/useLineupBoard";

const positionColors: Record<Position, string> = {
  GOL: "#f59e0b",
  DEF: "#3b82f6",
  ALA: "#8b5cf6",
  MED: "#06b6d4",
  ATA: "#ef4444",
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2);
}
const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

interface Props {
  board: BoardPlayer[];
  onField: BoardPlayer[];
  onBench: BoardPlayer[];
  teamColor: string;
  onMoveOnField: (key: number, posX: number, posY: number) => void;
  onSendToBench: (key: number) => void;
  onSendToField: (key: number, posX?: number, posY?: number) => void;
  onClear: () => void;
}

/**
 * Prancheta interativa pública: campo society + banco de reserva à direita.
 * Arraste um jogador no campo para reposicioná-lo; solte-o sobre o banco para
 * tirá-lo de campo; arraste um reserva para o campo para escalá-lo. Funciona
 * com toque (pointer events). Nada é salvo no servidor — só no navegador.
 */
export default function LineupBoard({
  board,
  onField,
  onBench,
  teamColor,
  onMoveOnField,
  onSendToBench,
  onSendToField,
  onClear,
}: Props) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const benchRef = useRef<HTMLDivElement>(null);
  const [dragKey, setDragKey] = useState<number | null>(null);
  // Posição do "fantasma" que segue o dedo/cursor durante o arrasto (px na viewport).
  const [ghost, setGhost] = useState<{ x: number; y: number; over: "field" | "bench" } | null>(null);

  function fieldPercentFromClient(clientX: number, clientY: number) {
    const el = fieldRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = clamp(((clientX - rect.left) / rect.width) * 100);
    const y = clamp(((clientY - rect.top) / rect.height) * 100);
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  }

  function overTarget(clientX: number, clientY: number): "field" | "bench" {
    const b = benchRef.current?.getBoundingClientRect();
    if (b && clientX >= b.left && clientX <= b.right && clientY >= b.top && clientY <= b.bottom) return "bench";
    return "field";
  }

  function commitDrop(key: number, wasOnField: boolean, clientX: number, clientY: number) {
    const over = overTarget(clientX, clientY);
    if (over === "bench") {
      onSendToBench(key);
    } else {
      const p = fieldPercentFromClient(clientX, clientY);
      if (p) {
        if (wasOnField) onMoveOnField(key, p.x, p.y);
        else onSendToField(key, p.x, p.y);
      }
    }
    setDragKey(null);
    setGhost(null);
  }

  // --- TOQUE (mobile): long-press ativa; touchmove NÃO-passivo bloqueia o scroll ---
  function startDragTouch(key: number, el: HTMLElement, startX: number, startY: number) {
    const player = board.find((p) => p.key === key);
    const wasOnField = player?.onField ?? false;

    let active = false;
    const HOLD_MS = 220;
    const CANCEL_MOVE = 10; // mover além disso antes do hold = scroll → cancela
    let holdTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      active = true;
      holdTimer = null;
      setDragKey(key);
      setGhost({ x: startX, y: startY, over: overTarget(startX, startY) });
      try { navigator.vibrate?.(15); } catch { /* ignore */ }
    }, HOLD_MS);

    // touchmove precisa ser NÃO-passivo para que preventDefault() cancele o
    // scroll de forma confiável (o React registra onTouchMove como passivo).
    const move = (ev: TouchEvent) => {
      const pt = ev.touches[0];
      if (!pt) return;
      if (!active) {
        if (Math.abs(pt.clientX - startX) > CANCEL_MOVE || Math.abs(pt.clientY - startY) > CANCEL_MOVE) {
          cleanup(); // deslizou antes do hold → é scroll
        }
        return;
      }
      ev.preventDefault(); // bloqueia o scroll durante o arrasto
      const over = overTarget(pt.clientX, pt.clientY);
      setGhost({ x: pt.clientX, y: pt.clientY, over });
      if (over === "field") {
        const p = fieldPercentFromClient(pt.clientX, pt.clientY);
        if (p) onMoveOnField(key, p.x, p.y);
      }
    };
    const end = (ev: TouchEvent) => {
      const wasActive = active;
      const pt = ev.changedTouches[0];
      cleanup();
      if (wasActive && pt) commitDrop(key, wasOnField, pt.clientX, pt.clientY);
    };
    function cleanup() {
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      active = false;
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
    }
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
  }

  // --- MOUSE (desktop): arrasta imediatamente ---
  function startDragMouse(key: number, e: React.PointerEvent) {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const pointerId = e.pointerId;
    const player = board.find((p) => p.key === key);
    const wasOnField = player?.onField ?? false;
    target.setPointerCapture?.(pointerId);
    setDragKey(key);
    setGhost({ x: e.clientX, y: e.clientY, over: overTarget(e.clientX, e.clientY) });

    const move = (ev: PointerEvent) => {
      const over = overTarget(ev.clientX, ev.clientY);
      setGhost({ x: ev.clientX, y: ev.clientY, over });
      if (over === "field") {
        const p = fieldPercentFromClient(ev.clientX, ev.clientY);
        if (p) onMoveOnField(key, p.x, p.y);
      }
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      commitDrop(key, wasOnField, ev.clientX, ev.clientY);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // Dispatcher no pointerdown: toque → long-press; mouse/caneta → imediato.
  function onPointerDown(key: number, e: React.PointerEvent) {
    if (e.pointerType === "touch") {
      startDragTouch(key, e.currentTarget as HTMLElement, e.clientX, e.clientY);
    } else {
      startDragMouse(key, e);
    }
  }

  const draggingPlayer = dragKey != null ? board.find((p) => p.key === dragKey) : null;

  return (
    <div className="flex flex-col lg:flex-row gap-3 select-none">
      {/* CAMPO */}
      <div className="flex-1 min-w-0">
        <div
          ref={fieldRef}
          className="relative rounded-2xl overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg,#1a5c2a 0%,#1e6b31 20%,#1a5c2a 40%,#1e6b31 60%,#1a5c2a 80%,#1e6b31 100%)",
            aspectRatio: "2/3",
            border: "3px solid #2a7a3a",
            boxShadow: "inset 0 0 50px rgba(0,0,0,0.4)",
            // pan-y em todo o campo e nos jogadores: gestos verticais rolam a
            // página; gestos horizontais sobre um jogador iniciam o arrasto
            // (com threshold no JS). Evita "prender" o scroll no mobile.
            touchAction: "pan-y",
            outline: ghost?.over === "field" ? "3px solid rgba(224,169,46,0.6)" : "none",
            outlineOffset: "-3px",
          }}
        >
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 150" preserveAspectRatio="none" style={{ opacity: 0.4 }}>
            <rect x="4" y="4" width="92" height="142" rx="1" fill="none" stroke="white" strokeWidth="1" />
            <line x1="4" y1="75" x2="96" y2="75" stroke="white" strokeWidth="1" />
            <circle cx="50" cy="75" r="10" fill="none" stroke="white" strokeWidth="1" />
            <circle cx="50" cy="75" r="1" fill="white" />
            <rect x="24" y="4" width="52" height="18" fill="none" stroke="white" strokeWidth="1" />
            <rect x="36" y="4" width="28" height="8" fill="none" stroke="white" strokeWidth="1" />
            <rect x="24" y="128" width="52" height="18" fill="none" stroke="white" strokeWidth="1" />
            <rect x="36" y="138" width="28" height="8" fill="none" stroke="white" strokeWidth="1" />
          </svg>

          {onField.map((p) => {
            const isDragging = dragKey === p.key;
            return (
              <div
                key={p.key}
                onPointerDown={(e) => onPointerDown(p.key, e)}
                className="absolute flex flex-col items-center cursor-grab active:cursor-grabbing"
                style={{
                  left: `${p.posX}%`,
                  top: `${p.posY}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex: isDragging ? 20 : 1,
                  opacity: isDragging ? 0.35 : 1,
                  touchAction: "manipulation",
                }}
                title={`${p.name} — segure e arraste para mover ou levar ao banco`}
              >
                <div
                  className="rounded-full flex items-center justify-center font-bold border-2 border-white"
                  style={{
                    width: "44px",
                    height: "44px",
                    background: teamColor,
                    color: "#fff",
                    fontFamily: "Oswald, sans-serif",
                    fontSize: "15px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
                  }}
                >
                  {p.number ?? initials(p.name)}
                </div>
                <div
                  className="mt-0.5 px-1.5 py-0.5 rounded text-white whitespace-nowrap"
                  style={{
                    fontSize: "9px",
                    fontWeight: 600,
                    background: "rgba(0,0,0,0.7)",
                    fontFamily: "Inter, sans-serif",
                    maxWidth: "72px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {p.name}
                </div>
              </div>
            );
          })}

          {onField.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-center px-6">
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.8)", fontFamily: "Inter, sans-serif" }}>
                Arraste jogadores do banco para montar sua escalação.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* BANCO DE RESERVA */}
      <div
        ref={benchRef}
        className="w-full lg:w-52 xl:w-56 lg:self-stretch rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
          outline: ghost?.over === "bench" ? "3px solid rgba(224,169,46,0.7)" : "none",
          outlineOffset: "-3px",
        }}
      >
        <div className="flex items-center justify-end gap-2 px-3 py-2.5" style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}>
          <span className="text-xs tnum" style={{ color: "var(--muted-foreground)" }}>{onBench.length}</span>
        </div>

        <div className="flex-1 p-2 flex flex-row lg:flex-col flex-wrap lg:flex-nowrap gap-1.5 overflow-auto" style={{ minHeight: "72px" }}>
          {onBench.length === 0 && (
            <div className="w-full text-center py-4 text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "Inter, sans-serif" }}>
              Todos em campo. Arraste alguém aqui para tirar de campo.
            </div>
          )}
          {onBench.map((p) => {
            const isDragging = dragKey === p.key;
            return (
              <div
                key={p.key}
                onPointerDown={(e) => onPointerDown(p.key, e)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing"
                style={{
                  background: "var(--secondary)",
                  border: "1px solid var(--border)",
                  opacity: isDragging ? 0.35 : 1,
                  touchAction: "manipulation",
                }}
                title={`${p.name} — arraste para o campo para escalar`}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: teamColor, fontSize: "9px", fontFamily: "Oswald, sans-serif", borderLeft: `3px solid ${positionColors[p.position]}` }}
                >
                  {p.number ?? initials(p.name)}
                </span>
                <span className="text-xs truncate" style={{ color: "var(--foreground)" }}>{p.name}</span>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClear}
          disabled={onField.length === 0}
          className="m-2 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-opacity disabled:opacity-40"
          style={{ background: "var(--secondary)", color: "var(--danger)", border: "1px solid var(--border)", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em" }}
        >
          Limpar campo
        </button>
      </div>

      {/* Fantasma que segue o cursor/dedo durante o arrasto */}
      {draggingPlayer && ghost && (
        <div
          className="fixed pointer-events-none z-[70] flex flex-col items-center"
          style={{ left: ghost.x, top: ghost.y, transform: "translate(-50%, -50%)" }}
          aria-hidden
        >
          <div
            className="rounded-full flex items-center justify-center font-bold border-2 border-white"
            style={{ width: "48px", height: "48px", background: teamColor, color: "#fff", fontFamily: "Oswald, sans-serif", fontSize: "16px", boxShadow: "0 6px 16px rgba(0,0,0,0.5)" }}
          >
            {draggingPlayer.number ?? initials(draggingPlayer.name)}
          </div>
        </div>
      )}
    </div>
  );
}
