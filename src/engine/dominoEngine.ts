export interface Tile {
  id: string;
  left: number;
  right: number;
}

export interface GameState {
  players: { id: string; name: string; isBot: boolean; hand: Tile[]; score: number }[];
  board: Tile[];
  currentTurn: number;
  boneyard: Tile[];
  leftEnd: number | null;
  rightEnd: number | null;
  gameOver: boolean;
  winnerIndex: number | null;
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
