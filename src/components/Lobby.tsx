'use client';

import React, { useState } from 'react';
import Avatar from './Avatar';

interface LobbyProps {
  onStart: (name: string) => void;
}

export default function Lobby({ onStart }: LobbyProps) {
  const [name, setName] = useState('');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4" style={{ height: '100dvh' }}>
      {/* Title card */}
      <div className="text-center mb-4">
        <h1 className="font-pixel text-2xl md:text-3xl text-retro-amarillo mb-2" style={{ textShadow: '3px 3px 0 #111, -1px -1px 0 #111' }}>
          DOMINO
        </h1>
        <h2 className="font-pixel text-sm md:text-base text-retro-naranja" style={{ textShadow: '2px 2px 0 #111' }}>
          RETRO
        </h2>
        <p className="font-handwritten text-lg text-white/60 mt-1" style={{ textShadow: '1px 1px 0 #111' }}>
          Edicion 90s Latino
        </p>
      </div>

      {/* Pixel art logo */}
      <div className="flex gap-2 mb-4">
        <svg width="48" height="48" viewBox="0 0 10 10" style={{ imageRendering: 'pixelated' }}>
          <rect width="10" height="10" fill="#f4f1e8" stroke="#111" strokeWidth="1" />
          <circle cx="3" cy="3" r="1.2" fill="#111" />
          <circle cx="7" cy="3" r="1.2" fill="#111" />
          <circle cx="5" cy="7" r="1.2" fill="#111" />
          <line x1="5" y1="0" x2="5" y2="10" stroke="#111" strokeWidth="0.8" />
        </svg>
        <svg width="48" height="48" viewBox="0 0 10 10" style={{ imageRendering: 'pixelated' }}>
          <rect width="10" height="10" fill="#f4f1e8" stroke="#111" strokeWidth="1" />
          <circle cx="3" cy="3" r="1.2" fill="#111" />
          <circle cx="7" cy="3" r="1.2" fill="#111" />
          <circle cx="3" cy="7" r="1.2" fill="#111" />
          <circle cx="7" cy="7" r="1.2" fill="#111" />
          <line x1="5" y1="0" x2="5" y2="10" stroke="#111" strokeWidth="0.8" />
        </svg>
        <svg width="48" height="48" viewBox="0 0 10 10" style={{ imageRendering: 'pixelated' }}>
          <rect width="10" height="10" fill="#f4f1e8" stroke="#111" strokeWidth="1" />
          <circle cx="3" cy="2" r="1.2" fill="#111" />
          <circle cx="7" cy="2" r="1.2" fill="#111" />
          <circle cx="5" cy="5" r="1.2" fill="#111" />
          <circle cx="3" cy="8" r="1.2" fill="#111" />
          <circle cx="7" cy="8" r="1.2" fill="#111" />
          <line x1="5" y1="0" x2="5" y2="10" stroke="#111" strokeWidth="0.8" />
        </svg>
      </div>

      {/* Name input */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <input
          type="text"
          placeholder="Tu nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && onStart(name.trim())}
          maxLength={16}
          className="w-full p-3 text-sm font-pixel border-3 bg-white text-center"
          style={{
            borderWidth: '3px',
            borderColor: '#111',
            boxShadow: '4px 4px 0px #111',
            imageRendering: 'pixelated',
          }}
        />

        <button
          onClick={() => name.trim() && onStart(name.trim())}
          disabled={!name.trim()}
          className="pixel-btn bg-retro-verde text-white px-8 py-3 font-pixel text-sm disabled:opacity-40"
          style={{ backgroundColor: '#2d6b3f' }}
        >
          Empezar Partida
        </button>
      </div>

      {/* Team preview */}
      <div className="flex gap-8 mt-4">
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-1">
            <Avatar seat={0} team={0} size={32} />
            <Avatar seat={2} team={0} size={32} />
          </div>
          <span className="text-xs font-pixel text-retro-azul" style={{ textShadow: '1px 1px 0 #111' }}>Nosotros</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-1">
            <Avatar seat={1} team={1} size={32} />
            <Avatar seat={3} team={1} size={32} />
          </div>
          <span className="text-xs font-pixel text-retro-rojo" style={{ textShadow: '1px 1px 0 #111' }}>Ellos</span>
        </div>
      </div>

      <p className="text-white/30 text-[10px] font-pixel mt-6 text-center">
        1-4 jugadores online · Reglas venezolanas
      </p>
    </div>
  );
}
