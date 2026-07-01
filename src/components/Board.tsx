'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BoardTile } from '@/engine/types';
import { layoutChain, ChainLayout } from '@/engine/chainLayout';
import PixelTile from './PixelTile';

interface BoardProps {
  board: BoardTile[];
  isMyTurn: boolean;
}

export default function Board({ board, isMyTurn }: BoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 400, height: 200 });

  const updateSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateSize]);

  const layout: ChainLayout = layoutChain(board);

  const scale = layout.totalWidth > 0
    ? Math.min(
        (containerSize.width - 16) / Math.max(layout.totalWidth, 1),
        (containerSize.height - 16) / Math.max(layout.totalHeight, 1),
        1.5
      )
    : 1;

  const offsetX = layout.totalWidth > 0
    ? (containerSize.width - layout.totalWidth * scale) / 2
    : 0;

  const offsetY = layout.totalHeight > 0
    ? (containerSize.height - layout.totalHeight * scale) / 2
    : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #5e3a1c 0%, #3d2510 100%)',
        border: '6px solid #3d2510',
        borderRadius: '8px',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6), 0 8px 0 rgba(0,0,0,0.3)',
      }}
    >
      {/* Wood grain texture */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 12px, rgba(0,0,0,0.15) 12px, rgba(0,0,0,0.15) 13px),
                           repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(0,0,0,0.05) 40px, rgba(0,0,0,0.05) 41px)`,
        }}
      />

      {board.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white/30 text-xs font-mono text-center px-4">
            {isMyTurn ? 'Juega tu primera ficha' : 'Esperando primera jugada...'}
          </span>
        </div>
      ) : (
        <div
          className="absolute"
          style={{
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          <svg
            width={layout.totalWidth}
            height={layout.totalHeight}
            viewBox={`0 0 ${layout.totalWidth} ${layout.totalHeight}`}
            style={{ imageRendering: 'pixelated' }}
          >
            {layout.tiles.map((ct, i) => {
              return (
                <g key={i} transform={`translate(${ct.x}, ${ct.y})`}>
                  <PixelTile
                    left={ct.left}
                    right={ct.right}
                    width={ct.width}
                    height={ct.height}
                    isHorizontal={ct.isHorizontal}
                    isDouble={ct.isDouble}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Log overlay */}
      <div className="absolute bottom-1 left-2 right-2 bg-black/80 text-white text-[10px] p-1 text-center truncate font-mono">
        {board.length === 0 ? '' : `${board.length} fichas en mesa`}
      </div>
    </div>
  );
}
