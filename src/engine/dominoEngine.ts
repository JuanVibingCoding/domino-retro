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
  phase: 'dealing' | 'playing' | 'gameOver';
  consecutivePasses: number;
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

export function calculateHandScore(players: GameState['players']): number {
  return players.reduce((total, player) => {
    return total + player.hand.reduce((handTotal, tile) => handTotal + tile.left + tile.right, 0);
  }, 0);
}

export function calculateVenezuelanScore(state: GameState, winnerIndex: number | null): { team: number, points: number } {
  const team0Points = state.players.filter(p => p.team === 0).reduce((sum, p) => sum + p.hand.reduce((s, t) => s + t.left + t.right, 0), 0);
  const team1Points = state.players.filter(p => p.team === 1).reduce((sum, p) => sum + p.hand.reduce((s, t) => s + t.left + t.right, 0), 0);

  if (winnerIndex !== null) {
    const winningTeam = state.players[winnerIndex].team;
    const losingTeamPoints = winningTeam === 0 ? team1Points : team0Points;
    return { team: winningTeam, points: losingTeamPoints };
  } else {
    if (team0Points < team1Points) return { team: 0, points: team1Points - team0Points };
    else if (team1Points < team0Points) return { team: 1, points: team0Points - team1Points };
    else return { team: -1, points: 0 };
  }
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
