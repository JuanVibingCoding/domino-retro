import { Tile, canPlayTile } from './dominoEngine';

export function getBotMove(hand: Tile[], leftEnd: number | null, rightEnd: number | null): { tile: Tile, side: 'left' | 'right' } | null {
  const playableTiles = hand.map(tile => {
    const canPlay = canPlayTile(tile, leftEnd, rightEnd);
    if (canPlay.left || canPlay.right) {
      return { tile, side: canPlay.left ? 'left' : 'right', value: tile.left + tile.right };
    }
    return null;
  }).filter(Boolean) as { tile: Tile, side: 'left' | 'right', value: number }[];

  if (playableTiles.length === 0) return null;

  playableTiles.sort((a, b) => b.value - a.value);

  if (Math.random() > 0.2) {
    return { tile: playableTiles[0].tile, side: playableTiles[0].side };
  } else {
    const randomChoice = playableTiles[Math.floor(Math.random() * playableTiles.length)];
    return { tile: randomChoice.tile, side: randomChoice.side };
  }
}
