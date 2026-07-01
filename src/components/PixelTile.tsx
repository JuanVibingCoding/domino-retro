'use client';

import React from 'react';

interface PixelTileProps {
  left: number;
  right: number;
  width: number;
  height: number;
  isHorizontal?: boolean;
  isDouble?: boolean;
  playable?: boolean;
  faceDown?: boolean;
  onClick?: () => void;
}

const PIP_GRIDS: Record<number, [number, number][]> = {
  0: [],
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

function PipGroup({
  value, areaX, areaY, areaW, areaH,
}: {
  value: number; areaX: number; areaY: number; areaW: number; areaH: number;
}) {
  const positions = PIP_GRIDS[value] || [];
  const cellW = areaW / 3;
  const cellH = areaH / 3;
  const pipR = Math.min(cellW, cellH) * 0.34;

  return (
    <g>
      {positions.map(([col, row], i) => {
        const cx = areaX + col * cellW + cellW / 2;
        const cy = areaY + row * cellH + cellH / 2;
        return (
          <g key={i}>
            <circle cx={cx + 0.7} cy={cy + 0.7} r={pipR + 1.2} fill="#000" opacity={0.2} />
            <circle cx={cx} cy={cy} r={pipR} fill="#111" />
            <circle cx={cx - pipR * 0.25} cy={cy - pipR * 0.25} r={pipR * 0.3} fill="#555" opacity={0.5} />
          </g>
        );
      })}
    </g>
  );
}

export default function PixelTile({
  left, right, width: w, height: h,
  isHorizontal = true, isDouble = false,
  playable = false, faceDown = false, onClick,
}: PixelTileProps) {
  const SW = 3;

  if (faceDown) {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ imageRendering: 'pixelated' }}>
        <rect x={0} y={0} width={w} height={h} fill="#1a1a1a" stroke="#333" strokeWidth={2} rx={1} />
        <line x1={4} y1={4} x2={w - 4} y2={h - 4} stroke="#2a2a2a" strokeWidth={1} />
        <line x1={w - 4} y1={4} x2={4} y2={h - 4} stroke="#2a2a2a" strokeWidth={1} />
      </svg>
    );
  }

  const innerW = w - SW * 2;
  const innerH = h - SW * 2;

  let leftArea: { x: number; y: number; w: number; h: number };
  let rightArea: { x: number; y: number; w: number; h: number };
  let divX1: number, divY1: number, divX2: number, divY2: number;

  if (isHorizontal) {
    // Horizontal tile: divider is vertical line, halves are LEFT | RIGHT
    const halfW = innerW / 2;
    leftArea = { x: SW, y: SW, w: halfW, h: innerH };
    rightArea = { x: SW + halfW, y: SW, w: halfW, h: innerH };
    divX1 = w / 2; divY1 = SW;
    divX2 = w / 2; divY2 = h - SW;
  } else {
    // Vertical tile: divider is horizontal line, halves are TOP / BOTTOM
    const halfH = innerH / 2;
    leftArea = { x: SW, y: SW, w: innerW, h: halfH };
    rightArea = { x: SW, y: SW + halfH, w: innerW, h: halfH };
    divX1 = SW; divY1 = h / 2;
    divX2 = w - SW; divY2 = h / 2;
  }

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ imageRendering: 'pixelated', cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      {playable && (
        <rect x={-3} y={-3} width={w + 6} height={h + 6} fill="none" stroke="#facc15" strokeWidth={2.5} rx={3}>
          <animate attributeName="stroke-opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
        </rect>
      )}

      <rect x={SW / 2} y={SW / 2} width={w - SW} height={h - SW} fill="#f4f1e8" stroke="#111" strokeWidth={SW} rx={2} />
      <rect x={SW / 2 + 1} y={SW / 2 + 1} width={w - SW - 2} height={2} fill="rgba(255,255,255,0.5)" />
      <rect x={SW / 2 + 1} y={SW / 2 + 1} width={2} height={h - SW - 2} fill="rgba(255,255,255,0.3)" />

      <line x1={divX1} y1={divY1} x2={divX2} y2={divY2} stroke="#111" strokeWidth={1.5} />

      <PipGroup value={left} areaX={leftArea.x} areaY={leftArea.y} areaW={leftArea.w} areaH={leftArea.h} />
      <PipGroup value={right} areaX={rightArea.x} areaY={rightArea.y} areaW={rightArea.w} areaH={rightArea.h} />

      {isDouble && (
        <g transform={`translate(${w / 2}, ${h / 2})`}>
          <rect x={-4} y={-4} width={8} height={8} fill="#e63946" stroke="#fff" strokeWidth={0.8} transform="rotate(45)" />
        </g>
      )}
    </svg>
  );
}
