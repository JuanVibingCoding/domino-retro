export interface Tile {
  id: string;
  left: number;
  right: number;
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  hand: Tile[];
  team: 0 | 1;
  passed: boolean;
}

export interface BoardTile {
  tile: Tile;
  isHorizontal: boolean;
}

export interface GameState {
  players: Player[];
  board: BoardTile[];
  currentTurn: number;
  leftEnd: number | null;
  rightEnd: number | null;
  scores: [number, number];
  gameOver: boolean;
  winnerTeam: number | null;
  log: string[];
  phase: 'lobby' | 'dealing' | 'playing' | 'roundOver' | 'gameOver';
  lastPlayerToPlay: number | null;
  roundStarter: number;
  roundNumber: number;
  goalScore: number;
}

export interface RoundResult {
  winnerTeam: number;
  points: number;
}

export interface ValidMove {
  tile: Tile;
  side: 'left' | 'right';
}

export type GameAction =
  | { type: 'DEAL'; hands: Tile[][] }
  | { type: 'PLAY'; playerIndex: number; tile: Tile; side: 'left' | 'right' }
  | { type: 'PASS'; playerIndex: number }
  | { type: 'START_GAME'; players: Player[]; hands: Tile[][]; starterIndex: number }
  | { type: 'NEXT_ROUND'; nextStarter: number; hands: Tile[][] }
  | { type: 'REMATCH' }
  | { type: 'SET_PLAYERS'; players: Player[] };
