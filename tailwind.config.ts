import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        tierra: {
          clara: '#d5cdba',
          DEFAULT: '#b8a690',
          oscura: '#9a8a74',
        },
        madera: {
          clara: '#a06830',
          DEFAULT: '#8b5a2b',
          oscura: '#5e3a1c',
        },
        ficha: '#f4f1e8',
        verde: {
          mesa: '#2d6b3f',
          oscuro: '#1a4028',
        },
        retro: {
          rojo: '#e63946',
          amarillo: '#f4d03f',
          azul: '#2471a3',
          naranja: '#e67e22',
          crema: '#fdebd0',
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        handwritten: ['"Permanent Marker"', 'cursive'],
      },
      animation: {
        'tile-place': 'tilePlace 0.3s ease-out',
        'tile-float': 'tileFloat 2s ease-in-out infinite',
        'glow-pulse': 'glowPulse 1.5s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        'confetti-fall': 'confettiFall 3s linear infinite',
      },
      keyframes: {
        tilePlace: {
          '0%': { transform: 'scale(0.5) translateY(-20px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        tileFloat: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 8px #facc15' },
          '50%': { boxShadow: '0 0 20px #facc15, 0 0 40px #facc15' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        confettiFall: {
          '0%': { transform: 'translateY(-10vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(110vh) rotate(720deg)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
