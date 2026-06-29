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

export interface GameState {
  players: Player[];
  board: { tile: Tile; isHorizontal: boolean }[];
  currentTurn: number;
  boneyard: Tile[];
  leftEnd: number | null;
  rightEnd: number | null;
  scores: [number, number];
  gameOver: boolean;
  winnerTeam: number | null;
  log: string[];
  phase: 'dealing' | 'playing' | 'roundOver' | 'gameOver';
  consecutivePasses: number;
  lastPlayerToPlay: number | null;
  roundStarter: number;
}

export function generateDeck(): Tile[] {
  const deck: Tile[] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      deck.push({ id: `${i}-${j}`, left: i, right: j });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Tile[]): Tile[] {
  return [...deck].sort(() => Math.random() - 0.5);
}

export function dealHands(deck: Tile[], playerCount: number): { hands: Tile[][], boneyard: Tile[] } {
  const hands: Tile[][] = [];
  const remainingDeck = [...deck];

  for (let i = 0; i < playerCount; i++) {
    hands.push(remainingDeck.splice(0, 7));
  }

  return { hands, boneyard: remainingDeck };
}

export function canPlayTile(tile: Tile, leftEnd: number | null, rightEnd: number | null): { left: boolean, right: boolean } {
  return {
    left: leftEnd === null || tile.left === leftEnd || tile.right === leftEnd,
    right: rightEnd === null || tile.left === rightEnd || tile.right === rightEnd
  };
}

export function getOrientedTile(tile: Tile, side: 'left' | 'right', leftEnd: number | null, rightEnd: number | null): Tile {
  if (side === 'left') {
    if (tile.right === leftEnd) return tile;
    if (tile.left === leftEnd) return { ...tile, left: tile.right, right: tile.left };
  } else {
    if (tile.left === rightEnd) return tile;
    if (tile.right === rightEnd) return { ...tile, left: tile.right, right: tile.left };
  }
  return tile;
}

export function findSixDoubleOwner(players: Player[]): number {
  return players.findIndex(p => p.hand.some(t => t.id === '6-6'));
}

export function getNextTurn(currentIndex: number, playerCount: number): number {
  return (currentIndex + 3) % playerCount;
}

export function calculateTotalHandPoints(players: Player[]): number {
  return players.reduce((sum, p) => sum + p.hand.reduce((s, t) => s + t.left + t.right, 0), 0);
}

export function calculateTeamPoints(players: Player[], team: number): number {
  return players.filter(p => p.team === team).reduce((sum, p) => sum + p.hand.reduce((s, t) => s + t.left + t.right, 0), 0);
}

export function calculateTotalPips(players: Player[]): number {
  return players.reduce((sum, p) => sum + p.hand.reduce((s, t) => s + t.left + t.right, 0), 0);
}

export function isTrancado(players: Player[], leftEnd: number | null, rightEnd: number | null): boolean {
  return players.every(p => !p.hand.some(t => {
    const c = canPlayTile(t, leftEnd, rightEnd);
    return c.left || c.right;
  }));
}

export interface RoundResult {
  winnerTeam: number;
  points: number;
}

export function resolveRound(players: Player[], winnerPlayerIndex: number | null, lastPlayerToPlay: number | null): RoundResult {
  const team0Points = calculateTeamPoints(players, 0);
  const team1Points = calculateTeamPoints(players, 1);
  const totalPoints = calculateTotalPips(players);

  if (winnerPlayerIndex !== null) {
    return { winnerTeam: players[winnerPlayerIndex].team, points: totalPoints };
  }

  if (team0Points < team1Points) return { winnerTeam: 0, points: totalPoints };
  if (team1Points < team0Points) return { winnerTeam: 1, points: totalPoints };

  if (lastPlayerToPlay !== null) {
    return { winnerTeam: players[lastPlayerToPlay].team, points: totalPoints };
  }
  return { winnerTeam: 0, points: totalPoints };
}

export function createNewRound(players: Player[], roundStarter: number): GameState {
  const deck = shuffleDeck(generateDeck());
  const { hands } = dealHands(deck, 4);
  const newPlayers = players.map((p, i) => ({ ...p, hand: hands[i], passed: false }));

  return {
    players: newPlayers,
    board: [],
    currentTurn: roundStarter,
    boneyard: [],
    leftEnd: null,
    rightEnd: null,
    scores: [0, 0],
    gameOver: false,
    winnerTeam: null,
    log: ['Nueva mano...'],
    phase: 'playing',
    consecutivePasses: 0,
    lastPlayerToPlay: null,
    roundStarter,
  };
}
