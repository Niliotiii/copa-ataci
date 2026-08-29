import { useCallback, useEffect, useMemo, useState } from "react";
import type { Player } from "./types";

/**
 * Prancheta pública do time ("Modo Cartola" interativo).
 *
 * Todos os jogadores começam EM CAMPO nas posições oficiais (posX/posY vindos
 * da API). O usuário pode arrastar jogadores no campo e entre campo↔banco. O
 * estado é persistido só no navegador (localStorage) — nunca no servidor. As
 * ações de escrita (adicionar jogador, salvar posições) seguem restritas ao
 * admin.
 */

// Identifica cada jogador de forma estável entre renders/persistência. Como o
// contrato de Player não traz id, usamos o índice na lista oficial do elenco.
export interface BoardPlayer extends Player {
  /** Índice estável na lista de jogadores do time (chave de persistência). */
  key: number;
  /** true = em campo; false = no banco de reserva. */
  onField: boolean;
}

interface StoredEntry {
  onField: boolean;
  posX: number;
  posY: number;
}
type StoredState = Record<string, StoredEntry>;

const STORAGE_PREFIX = "ataci:board:";
const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

function storageKey(teamId: string) {
  return `${STORAGE_PREFIX}${teamId}`;
}

function readStored(teamId: string): StoredState | null {
  try {
    const raw = localStorage.getItem(storageKey(teamId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as StoredState) : null;
  } catch {
    return null;
  }
}

/** Semeia o estado a partir do elenco oficial, aplicando overrides salvos. */
function seed(teamId: string, players: Player[]): BoardPlayer[] {
  const stored = readStored(teamId);
  return players.map((p, i) => {
    const s = stored?.[String(i)];
    return {
      ...p,
      key: i,
      onField: s ? s.onField : true,
      posX: s ? clamp(s.posX) : clamp(p.posX),
      posY: s ? clamp(s.posY) : clamp(p.posY),
    };
  });
}

export function useLineupBoard(teamId: string | null, players: Player[] | undefined) {
  // Chave que muda quando troca de time OU quando o elenco oficial muda de tamanho.
  const seedKey = `${teamId ?? ""}:${players?.length ?? 0}`;
  const [board, setBoard] = useState<BoardPlayer[]>([]);

  useEffect(() => {
    if (!teamId || !players) {
      setBoard([]);
      return;
    }
    setBoard(seed(teamId, players));
  }, [seedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persiste cada alteração no localStorage (por time).
  useEffect(() => {
    if (!teamId || board.length === 0) return;
    const out: StoredState = {};
    for (const p of board) out[String(p.key)] = { onField: p.onField, posX: p.posX, posY: p.posY };
    try {
      localStorage.setItem(storageKey(teamId), JSON.stringify(out));
    } catch {
      /* storage cheio/indisponível — silencioso; a prancheta segue em memória */
    }
  }, [board, teamId]);

  const moveOnField = useCallback((key: number, posX: number, posY: number) => {
    setBoard((prev) => prev.map((p) => (p.key === key ? { ...p, posX: clamp(posX), posY: clamp(posY), onField: true } : p)));
  }, []);

  const sendToBench = useCallback((key: number) => {
    setBoard((prev) => prev.map((p) => (p.key === key ? { ...p, onField: false } : p)));
  }, []);

  const sendToField = useCallback((key: number, posX = 50, posY = 50) => {
    setBoard((prev) => prev.map((p) => (p.key === key ? { ...p, onField: true, posX: clamp(posX), posY: clamp(posY) } : p)));
  }, []);

  /** Botão "Limpar": manda todos para o banco. */
  const clearField = useCallback(() => {
    setBoard((prev) => prev.map((p) => ({ ...p, onField: false })));
  }, []);

  const onField = useMemo(() => board.filter((p) => p.onField), [board]);
  const onBench = useMemo(() => board.filter((p) => !p.onField), [board]);

  return { board, onField, onBench, moveOnField, sendToBench, sendToField, clearField };
}
