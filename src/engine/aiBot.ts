import { Tile, ValidMove } from './types';
import { getValidMoves } from './dominoEngine';

export function getBotMove(
  hand: Tile[],
  leftEnd: number | null,
  rightEnd: number | null,
  opts?: { isFirstMoveOfRound?: boolean }
): ValidMove | null {
  const moves = getValidMoves(hand, leftEnd, rightEnd, opts);
  if (moves.length === 0) return null;

  const scored = moves.map(m => ({
    ...m,
    value: m.tile.left + m.tile.right,
  }));

  scored.sort((a, b) => b.value - a.value);

  const selected = scored[0];
  const side = selected.side === 'left' && scored.some(m => m.side === 'left' && m.value === selected.value)
    ? 'left'
    : selected.side === 'right' && scored.some(m => m.side === 'right' && m.value === selected.value)
    ? 'right'
    : selected.side;

  return { tile: selected.tile, side };
}
