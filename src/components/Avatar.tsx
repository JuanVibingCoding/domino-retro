'use client';

import React from 'react';

interface AvatarProps {
  seat: 0 | 1 | 2 | 3;
  team: 0 | 1;
  isActive?: boolean;
  size?: number;
}

const FACE_COLORS = ['#e8c49a', '#d4a574', '#c49060', '#b87840'];

export default function Avatar({ seat, team, isActive = false, size = 40 }: AvatarProps) {
  const s = size;
  const teamColor = team === 0 ? '#2471a3' : '#e63946';
  const skinColor = FACE_COLORS[seat];

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 10 10"
      className={`pixel-avatar ${isActive ? 'animate-pulse ring-2 ring-yellow-400' : ''}`}
      style={{ backgroundColor: teamColor, imageRendering: 'pixelated' }}
    >
      {/* Head */}
      <rect x="3" y="1" width="4" height="4" fill={skinColor} />

      {/* Eyes */}
      <rect x="3.5" y="2" width="1" height="1" fill="#111" />
      <rect x="5.5" y="2" width="1" height="1" fill="#111" />

      {/* Eye highlight */}
      <rect x="3.5" y="2" width="0.5" height="0.5" fill="#fff" opacity="0.5" />
      <rect x="5.5" y="2" width="0.5" height="0.5" fill="#fff" opacity="0.5" />

      {/* Mouth */}
      <rect x="4" y="4" width="2" height="0.5" fill="#c0392b" />

      {/* Hat / Hair */}
      <rect x="2.5" y="0.5" width="5" height="1.5" fill={team === 0 ? '#1a5276' : '#922b21'} rx="0.5" />

      {/* Body hint */}
      <rect x="2" y="5.5" width="6" height="3" fill={teamColor} rx="0.5" />

      {/* Shirt detail */}
      <rect x="4" y="5.5" width="2" height="3" fill={team === 0 ? '#1a5276' : '#922b21'} />
    </svg>
  );
}
