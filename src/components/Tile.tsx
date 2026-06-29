import React from 'react';

const PIP_POSITIONS: Record<number, string[]> = {
  0: [],
  1: ['center'],
  2: ['top-left', 'bottom-right'],
  3: ['top-left', 'center', 'bottom-right'],
  4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
  6: ['top-left', 'top-right', 'mid-left', 'mid-right', 'bottom-left', 'bottom-right']
};

export default function Tile({ left, right, isHorizontal = false, onClick, playable }: {
  left: number;
  right: number;
  isHorizontal?: boolean;
  onClick?: () => void;
  playable?: boolean;
}) {
  const renderPips = (value: number) => (
    <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-1 gap-0">
      {Array.from({ length: 9 }).map((_, idx) => {
        const positions = ['top-left', 'top-center', 'top-right', 'mid-left', 'center', 'mid-right', 'bottom-left', 'bottom-center', 'bottom-right'];
        const pos = positions[idx];
        const hasPip = PIP_POSITIONS[value].includes(pos);
        return <div key={idx} className="flex items-center justify-center">{hasPip && <div className="w-2 h-2 bg-gray-900 rounded-sm"></div>}</div>;
      })}
    </div>
  );

  return (
    <div
      onClick={onClick}
      className={`domino-tile ${isHorizontal ? 'flex-row' : 'flex-col'} ${playable ? 'ring-4 ring-green-500 cursor-pointer hover:-translate-y-2 transition-transform' : ''} bg-[#f4f1e8]`}
      style={{ width: '40px', height: '80px', border: '2px solid #333', borderRadius: '4px', boxShadow: '2px 2px 0px rgba(0,0,0,0.4)' }}
    >
      <div className="flex-1 w-full h-full relative">
        {renderPips(left)}
      </div>
      <div style={{ borderBottom: isHorizontal ? 'none' : '2px solid #333', borderRight: isHorizontal ? '2px solid #333' : 'none' }} className="absolute"></div>
      <div className="flex-1 w-full h-full relative">
        {renderPips(right)}
      </div>
    </div>
  );
}
