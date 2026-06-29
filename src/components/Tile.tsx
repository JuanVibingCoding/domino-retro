import React from 'react';

const PIP_POSITIONS: Record<number, string[]> = {
  0: [], 1: ['center'],
  2: ['top-left', 'bottom-right'],
  3: ['top-left', 'center', 'bottom-right'],
  4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
  6: ['top-left', 'top-right', 'mid-left', 'mid-right', 'bottom-left', 'bottom-right']
};

export default function Tile({ left, right, isHorizontal = false, faceDown = false, tiny = false, compact = false, doubleMark = false, onClick, playable }: {
  left: number; right: number; isHorizontal?: boolean; faceDown?: boolean; tiny?: boolean; compact?: boolean; doubleMark?: boolean; onClick?: () => void; playable?: boolean;
}) {
  const tileW = isHorizontal ? (compact ? 60 : 80) : (compact ? 30 : 40);
  const tileH = isHorizontal ? (compact ? 30 : 40) : (compact ? 60 : 80);
  const bs = compact ? 2 : 3;
  const pipSize = compact ? 4 : 6;

  if (faceDown) {
    if (tiny) {
      return (
        <div
          className="bg-[#1a1a1a] border border-[#444] shadow-[1px_1px_0px_#000]"
          style={{ width: '12px', height: '24px', imageRendering: 'pixelated' }}
        />
      );
    }
    return (
      <div
        className="bg-[#1a1a1a] border-2 border-[#444] shadow-[3px_3px_0px_#000]"
        style={{ width: tileW + 'px', height: tileH + 'px', imageRendering: 'pixelated' }}
      />
    );
  }

  const renderPips = (value: number) => (
    <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-0.5">
      {Array.from({ length: 9 }).map((_, idx) => {
        const positions = ['top-left', 'top-center', 'top-right', 'mid-left', 'center', 'mid-right', 'bottom-left', 'bottom-center', 'bottom-right'];
        const hasPip = PIP_POSITIONS[value].includes(positions[idx]);
        return <div key={idx} className="flex items-center justify-center">{hasPip && <div style={{ width: pipSize + 'px', height: pipSize + 'px' }} className="bg-[#111] shadow-[1px_1px_0px_#555]"></div>}</div>;
      })}
    </div>
  );

  return (
    <div
      onClick={onClick}
      className={`bg-[#f4f1e8] relative flex ${isHorizontal ? 'flex-row' : 'flex-col'} ${playable ? 'ring-4 ring-yellow-400 cursor-pointer animate-pulse' : ''}`}
      style={{
        width: tileW + 'px', height: tileH + 'px', imageRendering: 'pixelated',
        border: bs + 'px solid #111',
        boxShadow: (compact ? '2px 2px 0px #000' : '3px 3px 0px #000')
      }}
    >
      {doubleMark && (
        <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 z-10 flex items-center justify-center">
          <div className="w-2.5 h-2.5 bg-red-500 border border-white shadow-[1px_1px_0px_#000] rotate-45"></div>
        </div>
      )}
      <div className="flex-1 w-full h-full relative">{renderPips(left)}</div>
      <div style={{ width: isHorizontal ? bs + 'px' : '100%', height: isHorizontal ? '100%' : bs + 'px', backgroundColor: '#111' }}></div>
      <div className="flex-1 w-full h-full relative">{renderPips(right)}</div>
    </div>
  );
}
