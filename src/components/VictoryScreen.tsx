'use client';

import React, { useMemo } from 'react';

interface VictoryScreenProps {
  isWin: boolean;
  scores: [number, number];
  isZapato?: boolean;
  onRematch: () => void;
}

interface ConfettiPiece {
  left: string;
  color: string;
  duration: string;
  delay: string;
  width: string;
  height: string;
  radius: string;
}

const COLORS = ['#e63946', '#f4d03f', '#2471a3', '#2ecc71', '#e67e22', '#9b59b6'];

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export default function VictoryScreen({ isWin, scores, isZapato = false, onRematch }: VictoryScreenProps) {
  const confetti = useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      left: `${seededRandom(i * 3 + 1) * 100}%`,
      color: COLORS[i % COLORS.length],
      duration: `${2 + seededRandom(i * 3 + 2) * 3}s`,
      delay: `${seededRandom(i * 3 + 3) * 2}s`,
      width: `${6 + seededRandom(i * 3 + 4) * 8}px`,
      height: `${6 + seededRandom(i * 3 + 5) * 8}px`,
      radius: seededRandom(i * 3 + 6) > 0.5 ? '50%' : '0',
    }));
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.92)' }}>
      {isWin && confetti.map((c, i) => (
        <div
          key={i}
          className="confetti"
          style={{
            left: c.left,
            backgroundColor: c.color,
            animationDuration: c.duration,
            animationDelay: c.delay,
            width: c.width,
            height: c.height,
            borderRadius: c.radius,
          }}
        />
      ))}

      <div className="text-center animate-slide-up">
        <h1
          className="font-pixel text-3xl md:text-5xl mb-4"
          style={{
            color: isWin ? '#f4d03f' : '#e63946',
            textShadow: `4px 4px 0 #111, -1px -1px 0 #111, 0 0 20px ${isWin ? 'rgba(244,208,63,0.5)' : 'rgba(230,57,70,0.3)'}`,
          }}
        >
          {isZapato ? '¡ZAPATO!' : isWin ? '¡GANAMOS!' : '¡PERDIMOS!'}
        </h1>

        {isZapato && (
          <p className="font-handwritten text-xl text-retro-naranja mb-2" style={{ textShadow: '2px 2px 0 #111' }}>
            Blanqueada perfecta
          </p>
        )}

        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="text-center">
            <p className="font-pixel text-xs text-white/50 mb-1">Nosotros</p>
            <p className="font-pixel text-2xl text-retro-azul" style={{ textShadow: '2px 2px 0 #111' }}>{scores[0]}</p>
          </div>
          <span className="font-pixel text-xl text-white/30">-</span>
          <div className="text-center">
            <p className="font-pixel text-xs text-white/50 mb-1">Ellos</p>
            <p className="font-pixel text-2xl text-retro-rojo" style={{ textShadow: '2px 2px 0 #111' }}>{scores[1]}</p>
          </div>
        </div>

        <button
          onClick={onRematch}
          className="pixel-btn bg-retro-azul text-white px-8 py-3 font-pixel text-sm"
        >
          Revancha
        </button>
      </div>
    </div>
  );
}
