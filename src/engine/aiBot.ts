import { Tile, canPlayTile } from './dominoEngine';

export function getBotMove(hand: Tile[], leftEnd: number | null, rightEnd: number | null): { tile: Tile, side: 'left' | 'right' } | null {
  const playableTiles = hand.map(tile => {
    const canPlay = canPlayTile(tile, leftEnd, rightEnd);
    if (canPlay.left || canPlay.right) {
      const sides: ('left' | 'right')[] = [];
      if (canPlay.left) sides.push('left');
      if (canPlay.right) sides.push('right');
      return { tile, sides, value: tile.left + tile.right };
    }
    return null;
  }).filter(Boolean) as { tile: Tile, sides: ('left' | 'right')[], value: number }[];

  if (playableTiles.length === 0) return null;

  playableTiles.sort((a, b) => b.value - a.value);

  const selected = playableTiles[0];
  const side = selected.sides[0];

  return { tile: selected.tile, side };
}
