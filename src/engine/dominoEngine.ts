import { Tile, Player, ValidMove, RoundResult } from './types';
export type { Tile, Player, GameState, BoardTile, ValidMove, RoundResult, GameAction } from './types';

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
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function dealHands(deck: Tile[], playerCount: number): { hands: Tile[][]; boneyard: Tile[] } {
  const hands: Tile[][] = [];
  const remainingDeck = [...deck];
  for (let i = 0; i < playerCount; i++) {
    hands.push(remainingDeck.splice(0, 7));
  }
  return { hands, boneyard: remainingDeck };
}

export function canPlayTile(tile: Tile, leftEnd: number | null, rightEnd: number | null): { left: boolean; right: boolean } {
  return {
    left: leftEnd === null || tile.left === leftEnd || tile.right === leftEnd,
    right: rightEnd === null || tile.left === rightEnd || tile.right === rightEnd,
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

export function getValidMoves(
  hand: Tile[],
  leftEnd: number | null,
  rightEnd: number | null,
  opts?: { isFirstMoveOfRound?: boolean; mustPlayTileId?: string }
): ValidMove[] {
  const moves: ValidMove[] = [];

  if (opts?.mustPlayTileId) {
    const tile = hand.find(t => t.id === opts.mustPlayTileId);
    if (tile) {
      const can = canPlayTile(tile, leftEnd, rightEnd);
      if (can.left) moves.push({ tile, side: 'left' });
      if (can.right) moves.push({ tile, side: 'right' });
    }
    return moves;
  }

  for (const tile of hand) {
    const can = canPlayTile(tile, leftEnd, rightEnd);
    if (opts?.isFirstMoveOfRound) {
      if (tile.id === '6-6') {
        if (can.left) moves.push({ tile, side: 'left' });
        if (can.right) moves.push({ tile, side: 'right' });
      }
    } else {
      if (can.left) moves.push({ tile, side: 'left' });
      if (can.right) moves.push({ tile, side: 'right' });
    }
  }

  return moves;
}

export function findSixDoubleOwner(players: Player[]): number {
  return players.findIndex(p => p.hand.some(t => t.id === '6-6'));
}

export function getNextTurn(currentIndex: number, playerCount: number): number {
  return (currentIndex + 1) % playerCount;
}

export function calculateTeamPoints(players: Player[], team: number): number {
  return players
    .filter(p => p.team === team)
    .reduce((sum, p) => sum + p.hand.reduce((s, t) => s + t.left + t.right, 0), 0);
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
