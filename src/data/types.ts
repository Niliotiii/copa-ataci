// Tipos do contrato da API (/functions/api/*). Mantidos em camelCase para
// bater com o retorno dos endpoints.

export type Position = "GOL" | "DEF" | "ALA" | "MED" | "ATA";
export type MatchStatus = "agendado" | "andamento" | "finalizado";
export type Phase = "grupos" | "quartas" | "semis" | "final";

export interface StandingRow {
  pos: number;
  abbr: string;
  name: string;
  color: string;
  pts: number;
  j: number;
  v: number;
  e: number;
  d: number;
  gp: number;
  gc: number;
  sg: number;
}

export interface MatchTeam {
  abbr: string | null;
  name: string;
  color: string;
  score: number | null;
}

export interface Match {
  id: number;
  phase: Phase;
  round: number | null;
  bracketSlot: string | null;
  date: string;
  time: string;
  location: string;
  status: MatchStatus;
  teamA: MatchTeam;
  teamB: MatchTeam;
}

// Forma "crua" retornada por GET /api/matches/:id (ids de time, não objetos).
export interface MatchDetail {
  id: number;
  phase: Phase;
  round: number | null;
  bracketSlot: string | null;
  date: string;
  time: string;
  location: string;
  status: MatchStatus;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

export interface BracketBox {
  id: number;
  slot: string;
  teamA: MatchTeam;
  teamB: MatchTeam;
  winner: "A" | "B" | null;
}

export interface Bracket {
  quarters: BracketBox[];
  semis: BracketBox[];
  final: BracketBox | null;
}

export interface Team {
  id: string;
  name: string;
  abbr: string;
  color: string;
  crestUrl: string | null;
  formation: string | null;
}

export interface Player {
  name: string;
  number: number | null;
  position: Position;
  photoUrl: string | null;
  posX: number;
  posY: number;
}

export interface TeamDetail extends Team {
  players: Player[];
}

export interface Sponsor {
  name: string;
  initials: string;
  color: string;
  tagline: string | null;
}
