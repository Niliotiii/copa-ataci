import { useEffect, useState } from "react";
import { useApi, invalidateCache } from "../../data/useApi";
import type { Match, MatchEvent, TeamDetail, EventType } from "../../data/types";
import { adminStyles, labelClass, type SaveResult } from "./shared";
import ResultBanner from "./ResultBanner";
import Select from "../Select";

const TYPE_LABEL: Record<EventType, string> = {
  gol: "Gol",
  gol_contra: "Gol contra",
  amarelo: "Amarelo",
  vermelho: "Vermelho",
};
const TYPE_COLOR: Record<EventType, string> = {
  gol: "var(--primary)",
  gol_contra: "#6b7280",
  amarelo: "#b8860b",
  vermelho: "#ef4444",
};

type Draft = { key: string; playerId: number; playerName: string; teamId: string; type: EventType };

export default function AdminEvents({ match, token }: { match: Match; token: string }) {
  const homeId = match.teamA.abbr;
  const awayId = match.teamB.abbr;

  const home = useApi<TeamDetail>(homeId ? `/api/teams/${homeId}` : "/api/teams");
  const away = useApi<TeamDetail>(awayId ? `/api/teams/${awayId}` : "/api/teams");
  const existing = useApi<MatchEvent[]>(`/api/matches/${match.id}/events`);

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);

  // Carrega os eventos já registrados no jogo.
  useEffect(() => {
    if (!existing.data) return;
    setDrafts(
      existing.data
        .filter((e) => e.playerId != null)
        .map((e, i) => ({
          key: `e${e.id}-${i}`,
          playerId: e.playerId as number,
          playerName: e.playerName,
          teamId: e.teamId,
          type: e.type,
        })),
    );
    setResult(null);
  }, [existing.data]);

  function addEvent(playerId: number, playerName: string, teamId: string, type: EventType) {
    setDrafts((d) => [...d, { key: `n${Date.now()}-${d.length}`, playerId, playerName, teamId, type }]);
  }
  function removeEvent(key: string) {
    setDrafts((d) => d.filter((x) => x.key !== key));
  }

  async function save() {
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch(`/api/matches/${match.id}/events`, {
        method: "PUT",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ events: drafts.map((d) => ({ playerId: d.playerId, type: d.type })) }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 401) throw new Error("Token inválido ou ausente.");
        throw new Error(b.error ?? `Falha (HTTP ${res.status}).`);
      }
      invalidateCache("/api/");
      setResult({ ok: true });
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl p-4 mt-4" style={adminStyles.card}>
      <h3 className="text-sm font-bold uppercase mb-1" style={{ fontFamily: "Oswald, sans-serif", color: "var(--foreground)" }}>
        Eventos por jogador
      </h3>

      {[["Casa", home.data, homeId], ["Visitante", away.data, awayId]].map(([label, detail, tid]) => {
        const team = detail as TeamDetail | null;
        if (!team || !tid) {
          return (
            <p key={label as string} className="text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>
              {label as string}: defina o time do jogo para registrar eventos.
            </p>
          );
        }
        return (
          <div key={tid as string} className="mb-3">
            <label className={labelClass} style={adminStyles.label}>{label as string} — {team.name}</label>
            <PlayerPicker team={team} onAdd={(pid, pname, type) => addEvent(pid, pname, tid as string, type)} />
          </div>
        );
      })}

      {/* Eventos adicionados */}
      {drafts.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3 mt-2">
          {drafts.map((d) => (
            <div key={d.key} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: "var(--secondary)" }}>
              <span className="text-xs px-1.5 py-0.5 rounded font-bold uppercase"
                style={{ background: TYPE_COLOR[d.type], color: "#fff", fontFamily: "Oswald, sans-serif", fontSize: "10px" }}>
                {TYPE_LABEL[d.type]}
              </span>
              <span className="text-sm flex-1" style={{ color: "var(--foreground)" }}>{d.playerName}</span>
              <button onClick={() => removeEvent(d.key)} aria-label="Remover evento"
                className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: "var(--danger)" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <button onClick={save} disabled={saving || !token}
        className="w-full rounded-xl py-2.5 font-semibold text-sm uppercase transition-opacity disabled:opacity-50"
        style={{ background: "var(--primary)", color: "white", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em" }}>
        {saving ? "Salvando…" : "Salvar eventos"}
      </button>

      <ResultBanner result={result} successLabel="Eventos salvos! Artilharia e suspensões atualizadas." />
    </div>
  );
}

// Seletor de jogador + tipo, com botão adicionar. Usa /api/teams/:id/players
// (que agora precisa expor id) — ver PlayerPicker abaixo.
function PlayerPicker({ team, onAdd }: { team: TeamDetail; onAdd: (playerId: number, playerName: string, type: EventType) => void }) {
  // O elenco do detalhe do time não traz player.id; buscamos a lista com id.
  const withIds = useApi<{ id: number; name: string }[]>(`/api/teams/${team.id}/players?withId=1`);
  const [playerId, setPlayerId] = useState("");
  const [type, setType] = useState<EventType>("gol");
  const players = withIds.data ?? [];

  return (
    <div className="grid gap-2 mt-1.5" style={{ gridTemplateColumns: "1fr 120px 44px" }}>
      <Select
        ariaLabel="Jogador"
        value={playerId}
        onChange={setPlayerId}
        placeholder="Jogador…"
        options={players.map((p) => ({ value: String(p.id), label: p.name }))}
      />
      <Select
        ariaLabel="Tipo de evento"
        value={type}
        onChange={(v) => setType(v as EventType)}
        options={[
          { value: "gol", label: "Gol" },
          { value: "gol_contra", label: "Gol contra" },
          { value: "amarelo", label: "Amarelo" },
          { value: "vermelho", label: "Vermelho" },
        ]}
      />
      <button
        onClick={() => {
          const p = players.find((x) => String(x.id) === playerId);
          if (p) { onAdd(p.id, p.name, type); setPlayerId(""); }
        }}
        disabled={!playerId}
        aria-label="Adicionar evento"
        className="rounded-lg flex items-center justify-center text-lg font-bold disabled:opacity-40"
        style={{ background: "var(--secondary)", color: "var(--primary)", border: "1px solid var(--primary)" }}>+</button>
    </div>
  );
}
