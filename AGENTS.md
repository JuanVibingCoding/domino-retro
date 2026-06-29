# Domino Retro - 90s Latino Dominó Game

## Stack

- **Framework:** Next.js (App Router)
- **Rendering:** Client-side (no SSR needed for game)
- **Multijugador:** WebRTC / BroadcastChannel + Room ID via URL
- **IA:** Bot con lógica matemática (priorizar ficha de mayor puntaje)
- **Despliegue:** Vercel (Plan Hobby)

## Reglas del Juego

- 28 fichas (Doble Seis al Blanco Puro)
- 7 fichas por jugador
- 1-4 jugadores reales, los cupos restantes se llenan con bots
- Turnos rotativos, validación estricta de ambos extremos
- Conteo de puntos automático al finalizar cada mano
- Victoria al llegar a 100 puntos
- Botón de revancha al finalizar

## Dirección de Arte

- Estética 2D Pixel Art (8-bit / Atari)
- Ambiente: patio de casa latinoamericana años 90
- Fondo: suelo de tierra/cemento rústico
- Mesa de madera desgastada en el centro
- Marcador tipo libreta de papel vieja escrita a mano
- Animaciones 2D para fichas, pantalla de victoria/derrota

## Estructura del Proyecto

```
domino-retro/
├── public/          # Assets estáticos (sprites, sonidos, etc.)
├── src/
│   ├── app/         # Páginas y layout de Next.js
│   ├── components/  # Componentes React
│   ├── game/        # Lógica del juego (core engine)
│   ├── ai/          # Lógica del bot
│   ├── multi/       # Lógica multijugador
│   ├── hooks/       # Custom hooks
│   ├── styles/      # Estilos globales y variables CSS
│   └── utils/       # Utilidades
├── next.config.js
├── package.json
├── tsconfig.json
└── AGENTS.md
```

## Convenciones

- TypeScript estricto
- Componentes funcionales con hooks
- CSS Modules o Tailwind para estilos
- Toda la lógica de juego desacoplada de React
- Animaciones vía CSS transitions o Framer Motion
