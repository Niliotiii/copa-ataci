import { useState, useEffect } from "react";
import { useApi } from "../../data/useApi";
import type { Team, TeamDetail, Player, Position } from "../../data/types";
import { LoadingState, ErrorState } from "../States";
import { authedPut, authedPost, authedDelete, adminStyles, labelClass, type SaveResult } from "./shared";
import PitchEditor from "./PitchEditor";
import ImageUpload from "./ImageUpload";
import ConfirmDialog from "./ConfirmDialog";
import { CloseIcon } from "../icons";

const POSITIONS: Position[] = ["GOL", "DEF", "ALA", "MED", "ATA"];

type EditablePlayer = {
  name: string;
  number: string;
  position: Position;
  posX: string;
  posY: string;
};

function toEditable(p: Player): EditablePlayer {
  return {
    name: p.name,
    number: p.number != null ? String(p.number) : "",
    position: p.position,
    posX: String(p.posX),
    posY: String(p.posY),
  };
}

export default function AdminTeams({ token }: { token: string }) {
  const { data: teams, loading, error } = useApi<Team[]>("/api/teams");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeId = selectedId ?? teams?.[0]?.id ?? null;
  const { data: squad } = useApi<TeamDetail>(activeId ? `/api/teams/${activeId}` : "/api/teams");

  // Campos do time
  const [name, setName] = useState("");
  const [abbr, setAbbr] = useState("");
  const [color, setColor] = useState("#16a34a");
  const [crestUrl, setCrestUrl] = useState<string | null>(null);
  const [players, setPlayers] = useState<EditablePlayer[]>([]);
  // Novo time (criação) + confirmação de exclusão.
  const [newTeam, setNewTeam] = useState({ name: "", abbr: "", color: "#16a34a" });
  const [creating, setCreating] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const [savingTeam, setSavingTeam] = useState(false);
  const [savingSquad, setSavingSquad] = useState(false);
  const [teamResult, setTeamResult] = useState<SaveResult | null>(null);
  const [squadResult, setSquadResult] = useState<SaveResult | null>(null);

  useEffect(() => {
    if (!squad) return;
    setName(squad.name);
    setAbbr(squad.abbr);
    setColor(squad.color);
    setCrestUrl(squad.crestUrl ?? null);
    setPlayers(squad.players.map(toEditable));
    setTeamResult(null);
    setSquadResult(null);
  }, [squad?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveTeam() {
    if (!activeId) return;
    setSavingTeam(true);
    setTeamResult(null);
    const res = await authedPut(`/api/teams/${activeId}`, token, {
      name, color, crestUrl: crestUrl || null,
    });
    setTeamResult(res);
    setSavingTeam(false);
  }

  async function createTeam() {
    setCreating(true);
    setTeamResult(null);
    const res = await authedPost("/api/teams", token, { name: newTeam.name, abbr: newTeam.abbr, color: newTeam.color });
    if (res.ok) {
      setNewTeam({ name: "", abbr: "", color: "#16a34a" });
      setSelectedId(newTeam.abbr.toUpperCase());
    }
    setTeamResult(res.ok ? { ok: true } : res);
    setCreating(false);
  }

  async function deleteTeam() {
    if (!activeId) return;
    const res = await authedDelete(`/api/teams/${activeId}`, token);
    setTeamResult(res);
    if (res.ok) setSelectedId(null);
  }

  async function saveSquad() {
    if (!activeId) return;
    setSavingSquad(true);
    setSquadResult(null);
    const payload = {
      players: players.map((p) => ({
        name: p.name,
        number: p.number === "" ? null : Number(p.number),
        position: p.position,
        posX: Number(p.posX),
        posY: Number(p.posY),
      })),
    };
    const res = await authedPut(`/api/teams/${activeId}/players`, token, payload);
    setSquadResult(res);
    setSavingSquad(false);
  }

  function updatePlayer(i: number, patch: Partial<EditablePlayer>) {
    setPlayers((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function movePlayer(i: number, posX: number, posY: number) {
    setPlayers((prev) => prev.map((p, idx) => (idx === i ? { ...p, posX: String(posX), posY: String(posY) } : p)));
  }
  function addPlayer() {
    setPlayers((prev) => [...prev, { name: "", number: "", position: "MED", posX: "50", posY: "50" }]);
  }
  function removePlayer(i: number) {
    setPlayers((prev) => prev.filter((_, idx) => idx !== i));
  }

  const feedback = (r: SaveResult | null, okMsg: string) =>
    r && (
      <div className="mt-3 rounded-lg p-3 text-sm" role="status" aria-live="polite"
        style={{
          background: r.ok ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${r.ok ? "var(--primary)" : "rgba(239,68,68,0.5)"}`,
          color: r.ok ? "var(--primary)" : "#ef4444",
        }}>
        {r.ok ? okMsg : r.error}
      </div>
    );

  return (
    <div>
      {loading && <LoadingState label="Carregando times…" />}
      {error && <ErrorState message={error} />}

      {!loading && !error && teams && (
        <>
          {/* Criar novo time */}
          <div className="rounded-xl p-4 mb-4" style={adminStyles.card}>
            <label className={labelClass} style={adminStyles.label}>Novo time</label>
            <div className="grid gap-2 mt-1.5" style={{ gridTemplateColumns: "1fr 72px 40px auto" }}>
              <input value={newTeam.name} onChange={(e) => setNewTeam((t) => ({ ...t, name: e.target.value }))}
                placeholder="Nome" aria-label="Nome do novo time"
                className="rounded-lg px-2 py-2 text-sm outline-none" style={adminStyles.input} />
              <input value={newTeam.abbr} onChange={(e) => setNewTeam((t) => ({ ...t, abbr: e.target.value }))}
                placeholder="Sigla" maxLength={4} aria-label="Sigla do novo time"
                className="rounded-lg px-1 py-2 text-sm outline-none text-center uppercase" style={adminStyles.input} />
              <input type="color" value={newTeam.color} onChange={(e) => setNewTeam((t) => ({ ...t, color: e.target.value }))}
                aria-label="Cor do novo time" className="w-full h-10 rounded cursor-pointer"
                style={{ background: "var(--secondary)", border: "1px solid var(--border)" }} />
              <button onClick={createTeam} disabled={creating || !token || !newTeam.name || !newTeam.abbr}
                className="px-3 rounded-lg text-xs font-semibold uppercase disabled:opacity-50"
                style={{ background: "var(--primary)", color: "#fff", fontFamily: "Oswald, sans-serif" }}>
                {creating ? "…" : "Criar"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-1.5">
            <label className={labelClass} style={adminStyles.label}>Time</label>
            {activeId && (
              <button onClick={() => setConfirmDel(true)} disabled={!token}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold uppercase disabled:opacity-50"
                style={{ background: "transparent", color: "#dc2626", border: "1px solid rgba(220,38,38,0.4)", fontFamily: "Oswald, sans-serif" }}>
                Excluir time
              </button>
            )}
          </div>
          <select value={activeId ?? ""} onChange={(e) => setSelectedId(e.target.value)}
            className="w-full mt-1.5 mb-4 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer" style={adminStyles.input}>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          {/* Dados do time */}
          <div className="rounded-xl p-4 mb-4" style={adminStyles.card}>
            <h3 className="text-sm font-bold uppercase mb-3" style={{ fontFamily: "Oswald, sans-serif", color: "var(--foreground)" }}>
              Dados do time
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelClass} style={adminStyles.label}>Nome</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1.5 rounded-lg px-3 py-2 text-sm outline-none" style={adminStyles.input} />
              </div>
              <div>
                <label className={labelClass} style={adminStyles.label}>Sigla (identificador, fixo)</label>
                <input value={abbr} readOnly disabled maxLength={4}
                  aria-label="Sigla do time (fixa)"
                  className="w-full mt-1.5 rounded-lg px-3 py-2 text-sm outline-none uppercase" style={{ ...adminStyles.input, opacity: 0.7, cursor: "not-allowed" }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelClass} style={adminStyles.label}>Cor</label>
                <div className="flex gap-2 mt-1.5 items-center">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-9 rounded cursor-pointer" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }} />
                  <input value={color} onChange={(e) => setColor(e.target.value)}
                    className="flex-1 rounded-lg px-3 py-2 text-sm outline-none" style={adminStyles.input} />
                </div>
              </div>
              <div>
                <ImageUpload label="Escudo / Logo" value={crestUrl} token={token} onChange={setCrestUrl} />
              </div>
            </div>
            <button onClick={saveTeam} disabled={savingTeam || !token}
              className="w-full rounded-xl py-2.5 font-semibold text-sm uppercase transition-opacity disabled:opacity-50"
              style={{ background: "var(--primary)", color: "white", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em" }}>
              {savingTeam ? "Salvando…" : "Salvar dados do time"}
            </button>
            {feedback(teamResult, "Dados do time salvos!")}
          </div>

          {/* Elenco */}
          <div className="rounded-xl p-4" style={adminStyles.card}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase" style={{ fontFamily: "Oswald, sans-serif", color: "var(--foreground)" }}>
                Elenco ({players.length})
              </h3>
              <button onClick={addPlayer}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold uppercase"
                style={{ background: "var(--secondary)", color: "var(--primary)", border: "1px solid var(--primary)", fontFamily: "Oswald, sans-serif" }}>
                + Adicionar
              </button>
            </div>

            {/* Campo arrastável — posicione os jogadores */}
            <div className="mb-3 max-w-xs mx-auto">
              <PitchEditor players={players} teamColor={color} onMove={movePlayer} />
              <p className="text-xs mt-1.5 text-center" style={{ color: "var(--muted-foreground)" }}>
                Arraste os jogadores no campo para definir a posição. Os valores X/Y abaixo
                se atualizam automaticamente.
              </p>
            </div>

            <div className="flex flex-col gap-2 mb-3">
              {players.map((p, i) => (
                <div key={i} className="grid gap-2 items-center"
                  style={{ gridTemplateColumns: "1fr 44px 64px 44px 44px 44px" }}>
                  <input value={p.name} onChange={(e) => updatePlayer(i, { name: e.target.value })}
                    placeholder="Nome" aria-label={`Nome do jogador ${i + 1}`}
                    className="rounded-lg px-2 py-2 text-sm outline-none" style={adminStyles.input} />
                  <input value={p.number} onChange={(e) => updatePlayer(i, { number: e.target.value })}
                    placeholder="#" type="number" aria-label={`Número do jogador ${i + 1}`}
                    className="rounded-lg px-1 py-2 text-sm outline-none text-center" style={adminStyles.input} />
                  <select value={p.position} onChange={(e) => updatePlayer(i, { position: e.target.value as Position })}
                    aria-label={`Posição do jogador ${i + 1}`}
                    className="rounded-lg px-1 py-2 text-xs outline-none cursor-pointer" style={adminStyles.input}>
                    {POSITIONS.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
                  </select>
                  <input value={p.posX} onChange={(e) => updatePlayer(i, { posX: e.target.value })}
                    placeholder="X" type="number" min={0} max={100} aria-label={`Coordenada X do jogador ${i + 1}`}
                    className="rounded-lg px-1 py-2 text-sm outline-none text-center" style={adminStyles.input} />
                  <input value={p.posY} onChange={(e) => updatePlayer(i, { posY: e.target.value })}
                    placeholder="Y" type="number" min={0} max={100} aria-label={`Coordenada Y do jogador ${i + 1}`}
                    className="rounded-lg px-1 py-2 text-sm outline-none text-center" style={adminStyles.input} />
                  <button onClick={() => removePlayer(i)} aria-label={`Remover jogador ${i + 1}`}
                    className="w-11 h-11 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)" }}>
                    <CloseIcon size={14} />
                  </button>
                </div>
              ))}
              {players.length === 0 && (
                <p className="text-xs text-center py-3" style={{ color: "var(--muted-foreground)" }}>
                  Nenhum jogador. Clique em “Adicionar”.
                </p>
              )}
            </div>

            <button onClick={saveSquad} disabled={savingSquad || !token}
              className="w-full rounded-xl py-2.5 font-semibold text-sm uppercase transition-opacity disabled:opacity-50"
              style={{ background: "var(--primary)", color: "white", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em" }}>
              {savingSquad ? "Salvando…" : "Salvar elenco"}
            </button>
            {feedback(squadResult, "Elenco salvo!")}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmDel}
        title="Excluir time"
        message={`Excluir o time ${name || activeId}? O elenco também será removido. Não é permitido se o time estiver em jogos.`}
        destructive
        confirmLabel="Excluir"
        onCancel={() => setConfirmDel(false)}
        onConfirm={() => { setConfirmDel(false); deleteTeam(); }}
      />
    </div>
  );
}
