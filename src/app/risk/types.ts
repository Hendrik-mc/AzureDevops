export interface Territory {
  id: string;
  name: string;
  continent: string;
  neighbors: string[];
  path: string; // SVG path
  labelX: number;
  labelY: number;
  owner: number | null;
  troops: number;
}

export interface Continent {
  id: string;
  name: string;
  bonus: number;
  color: string;
  territories: string[];
}

export interface Player {
  id: number;
  name: string;
  role: string;
  color: string;
  colorLight: string;
  colorDark: string;
  avatar: string;
  isAI: boolean;
  territories: number;
  troops: number;
  eliminated: boolean;
  cards: Card[];
}

export interface Card {
  id: string;
  territory: string;
  type: 'infantry' | 'cavalry' | 'artillery' | 'wild';
}

export type GamePhase = 'setup' | 'draft' | 'attack' | 'fortify' | 'gameover';

export interface DiceResult {
  attacker: number[];
  defender: number[];
  attackerLosses: number;
  defenderLosses: number;
}

export interface GameState {
  players: Player[];
  territories: Record<string, Territory>;
  continents: Record<string, Continent>;
  currentPlayer: number;
  phase: GamePhase;
  troopsToDraft: number;
  selectedTerritory: string | null;
  targetTerritory: string | null;
  diceResult: DiceResult | null;
  turnNumber: number;
  conqueredThisTurn: boolean;
  message: string;
  winner: number | null;
  fortifyFrom: string | null;
  fortifyTo: string | null;
}
