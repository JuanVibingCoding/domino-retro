import { BoardTile } from './types';

export interface ChainTile {
  x: number;
  y: number;
  width: number;
  height: number;
  left: number;
  right: number;
  isHorizontal: boolean;
  isDouble: boolean;
}

export interface ChainLayout {
  tiles: ChainTile[];
  totalWidth: number;
  totalHeight: number;
}

const H_W = 80;
const H_H = 44;
const V_W = 44;
const V_H = 80;
const GAP = 6;
const MAX_W = 420;
const MAX_H = 260;

type Dir = 'ltr' | 'rtl' | 'down';

export function layoutChain(board: BoardTile[]): ChainLayout {
  if (board.length === 0) {
    return { tiles: [], totalWidth: 0, totalHeight: 0 };
  }

  const tiles: ChainTile[] = [];
  let cx = 0;
  let cy = 0;
  let dir: Dir = 'ltr';
  let chainEnd: number | null = null;

  function getTileDims(d: Dir, isDouble: boolean) {
    if (d === 'ltr' || d === 'rtl') {
      return isDouble
        ? { tw: V_W, th: V_H, horz: false }
        : { tw: H_W, th: H_H, horz: true };
    }
    // down
    return isDouble
      ? { tw: H_W, th: H_H, horz: true }
      : { tw: V_W, th: V_H, horz: false };
  }

  for (let i = 0; i < board.length; i++) {
    const item = board[i];
    const isDouble = item.tile.left === item.tile.right;
    let tl = item.tile.left;
    let tr = item.tile.right;

    if (chainEnd !== null && tl !== chainEnd && tr === chainEnd) {
      const tmp = tl; tl = tr; tr = tmp;
    }

    const { tw, th } = getTileDims(dir, isDouble);

    // Check if current tile fits, if not — TURN
    let needsTurn = false;
    if (i > 0) {
      if (dir === 'ltr' && cx + tw > MAX_W) needsTurn = true;
      else if (dir === 'rtl' && cx - tw < 0) needsTurn = true;
      else if (dir === 'down' && cy + th > MAX_H) needsTurn = true;
    }

    if (needsTurn) {
      const prev = tiles[tiles.length - 1];

      if (dir === 'ltr' || dir === 'rtl') {
        // Turn DOWN: find the chain exit X center on the previous tile
        const openOnRight = dir === 'ltr';
        dir = 'down';
        let halfCenterX: number;
        if (prev.isDouble) {
          // Double in horizontal chain: center of tile width
          halfCenterX = prev.x + prev.width / 2;
        } else {
          // Normal tile: center of the connecting half
          halfCenterX = openOnRight
            ? prev.x + prev.width * 0.75
            : prev.x + prev.width * 0.25;
        }
        cx = halfCenterX - V_W / 2;
        cy = prev.y + prev.height + GAP;
      } else {
        // Turn horizontal from DOWN: find chain exit Y center
        if (prev.isDouble) {
          // Double in DOWN column: bottom edge center
          cy = prev.y + prev.height - H_H / 2;
        } else {
          // Normal tile: bottom half center
          cy = prev.y + prev.height * 0.75 - H_H / 2;
        }
        if (prev.x + prev.width / 2 > MAX_W / 2) {
          dir = 'rtl';
        } else {
          dir = 'ltr';
        }
        cx = prev.x + prev.width / 2;
      }
    }

    const d = getTileDims(dir, isDouble);
    let tileX: number;
    let tileY: number;

    if (dir === 'ltr') {
      tileX = cx;
      tileY = isDouble ? cy + (H_H - V_H) / 2 : cy;
      cx += d.tw + GAP;
    } else if (dir === 'rtl') {
      tileX = cx - d.tw;
      tileY = isDouble ? cy + (H_H - V_H) / 2 : cy;
      cx -= (d.tw + GAP);
    } else {
      tileX = isDouble ? cx + (V_W - H_W) / 2 : cx;
      tileY = cy;
      cy += d.th + GAP;
    }

    tiles.push({
      x: tileX, y: tileY,
      width: d.tw, height: d.th,
      left: tl, right: tr,
      isHorizontal: d.horz,
      isDouble,
    });

    chainEnd = tr;
  }

  // Normalize
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const t of tiles) {
    minX = Math.min(minX, t.x);
    maxX = Math.max(maxX, t.x + t.width);
    minY = Math.min(minY, t.y);
    maxY = Math.max(maxY, t.y + t.height);
  }

  return {
    tiles: tiles.map(t => ({ ...t, x: t.x - minX, y: t.y - minY })),
    totalWidth: maxX - minX,
    totalHeight: maxY - minY,
  };
}
