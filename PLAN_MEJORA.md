# PLAN DE EJECUCIÓN — Domino Retro (Jugabilidad + Visual Pixel-Art)

## 0. Diagnóstico (resumen para el ejecutor)
- **Multijugador roto:** en `src/app/room/[id]/page.tsx:45` todos hacen `new Peer(roomId)` → colisión; nunca se llama `connect()`; `myPlayerIndex` siempre `0`; `startGame` siempre crea 3 bots. Hoy es single-player disfrazado de online.
- **Motor:** barajado sesgado (`sort(()=>Math.random()-0.5)`); no se fuerza 6-6 en ronda 1; cadena de `setTimeout`+`useCallback` con closures frágiles; código muerto (`boneyard`, `handShaking`, `createNewRound`, `calculateTotalHandPoints`).
- **Visual:** sin pixel-art real (divs planos); `.table-wood` definido pero NO usado (el tablero es fieltre verde); fuentes vía `@import` bloqueante; `/public/fonts` y `/public/sounds` vacíos; sin animaciones de ficha ni pantallas festivas.
- **Correcto ya:** conteo de puntos (todos los pips), rotación antihoraria, asientos, desempate por tranca. Esa base se conserva.

## 1. Decisiones de arquitectura
1. **Autoridad host:** el host es el único árbitro. Los guests envían *intents* (`PLAY`/`PASS`/`START`/`REMATCH`); el host aplica el reducer y reenvía el estado a todos.
2. **Motor como reducer puro:** `reduceState(state, action): GameState` — funciones puras, sin React, testeables. Todo efecto (sonido, animación, scheduling de bots) vive en el componente, no en el motor.
3. **Scheduling de bots por `useEffect`** que observa `currentTurn`+`phase`, eliminando los `setTimeout` encadenados con closures stales.
4. **Pixel-art CSS/SVG** + fuentes self-hosted. Sin binarios de imagen.
5. **Tablero SVG** con cadena lineal auto-escalada (zoom-to-fit) y dobles perpendiculares.

---

## FASE 1 — Motor de juego (refactor + fixes)
**Archivos:** `src/engine/dominoEngine.ts` (refactor), nuevo `src/engine/reducer.ts`, `src/engine/types.ts`.

- 1.1 Extraer `types.ts` (`Tile`, `Player`, `GameState`, `Action`, `RoundResult`).
- 1.2 **Fisher-Yates** en `shuffleDeck` (reemplazar el sort sesgado).
- 1.3 `getValidMoves(hand, leftEnd, rightEnd, opts)`: devuelve `[{tile, side}]`. `opts.isFirstMoveOfRound` → si ronda 1, filtra a SOLO el `6-6`; en rondas 2+, mesa vacía permite cualquier ficha.
- 1.4 `reduceState(state, action)` pura: `DEAL`/`PLAY`/`PASS`/`END_ROUND`/`NEXT_ROUND`/`REMATCH`.
- 1.5 Revalidar: `PLAY` sólo válido si está en `getValidMoves`.
- 1.6 Trancado: detectar con `isTrancado` (no por conteo de passes). Al cerrar, `resolveRound` ya es correcto; confirmar empate→`lastPlayerToPlay`.
- 1.7 Eliminar muerto: `boneyard`, `createNewRound`, `calculateTotalHandPoints`, `handShaking`.
- 1.8 Mantener meta configurable (100/200) y flag `isZapato`.
- **Criterio:** `npm run lint` + `tsc --noEmit` limpios; tests mínimos para shuffle, getValidMoves y resolveRound.

## FASE 2 — IA/Bot
**Archivo:** `src/engine/aiBot.ts`.

- 2.1 `getBotMove(hand, leftEnd, rightEnd, opts)` usa `getValidMoves`. En ronda 1 primer movimiento → devuelve el 6-6.
- 2.2 Heurística "mayor puntaje" con desempate determinista.
- 2.3 El host ejecuta el bot dentro del reducer (turno de bot = `PLAY` auto-generado).
- **Criterio:** el bot siempre juega ficha legal; en ronda 1 sale con 6-6 si lo tiene.

## FASE 3 — Render del tablero (SVG, sin errores gráficos)
**Archivos:** nuevo `src/engine/chainLayout.ts`, `src/components/Board.tsx`, `src/components/PixelTile.tsx`.

- 3.1 `chainLayout.ts`: `layoutChain(board, opts) -> {tiles:[{x,y,w,h,rotation,face}], width, height}`. Coloca fichas en línea horizontal; dobles rotados 90°.
- 3.2 `Board.tsx`: SVG con `transform: scale(fit)` para zoom-to-fit; scroll/pan si excede.
- 3.3 `PixelTile.tsx` (SVG): ficha crema con borde biselado, línea divisoria, pips como círculos oscuros con highlight 1px; variante `faceDown`; variante `tiny`.
- 3.4 Resaltar extremos jugables cuando es tu turno.
- **Criterio:** cadena siempre legible y conectada; dobles perpendiculares; sin desbordamiento.

## FASE 4 — Sistema visual pixel-art retro-latino
**Archivos:** `src/styles/globals.css`, `tailwind.config.ts`, `Avatar.tsx`, `CRTOverlay.tsx`, `Background.tsx`.

- 4.1 **Paleta** retro 8-bit en `tailwind.config.ts`.
- 4.2 **Fuentes self-hosted:** descargar a `public/fonts/`; `@font-face` + `font-display: swap`.
- 4.3 **Fondo patio:** capas CSS — suelo de tierra/cemento con ruido, gradiente "tarde calurosa".
- 4.4 **Mesa de madera desgastada:** usar `.table-wood`. Quitar fieltre verde.
- 4.5 **Avatares pixel-art** (`Avatar.tsx` SVG): caras simples, borde equipo, pulso turno.
- 4.6 **CRT overlay** (`CRTOverlay.tsx`): scanlines + viñeta + parpadeo sutil, toggable.
- 4.7 **Marcador-libreta** (`Scoreboard.tsx`): papel rayado, fuente manuscrita self-hosted, palotes/tally marks.
- **Criterio:** patio latino 90s + 8-bit; sin divs planos mudos.

## FASE 5 — UX de juego y animaciones
**Archivo:** refactor sección de mano/turnos en `page.tsx`.

- 5.1 Selección de lado inteligente: auto-jugar si un lado válido; toggle lateral claro si ambos.
- 5.2 Animaciones CSS: ficha se desliza y "cae", pulso de turno, "pasar" agita la mano.
- 5.3 Feedback de turno: borde iluminado, log legible.
- **Criterio:** jugada fluida en desktop y táctil.

## FASE 6 — Multijugador PeerJS (host/guest)
**Archivos:** nuevo `src/multi/protocol.ts`, `src/multi/usePeerRoom.ts`, refactor `page.tsx`.

- 6.1 `protocol.ts`: tipos de mensaje (JOIN, ASSIGN, ACTION, STATE, EVENT, LEAVE).
- 6.2 `usePeerRoom(roomId, name)`: host `new Peer(roomId)`, guest `new Peer()` + `connect(roomId)`, lobby real, relay de acciones.
- 6.3 Bot turn scheduling por `useEffect` en host.
- 6.4 Reconexión: convertir a bot al desconectar.
- **Criterio:** 2 pestañas sincronizadas.

## FASE 7 — Pantallas (lobby, victoria, derrota, revancha)
- 7.1 `Lobby.tsx`: nombre, código, roster, start.
- 7.2 `VictoryScreen.tsx`: confeti CSS, "¡GANAMOS!", sonidos.
- 7.3 `DefeatScreen.tsx`: "¡PERDIMOS!" sutil.
- 7.4 Revancha: reusar `reduceState(REMATCH)`.
- 7.5 "Zapato" → pantalla especial.
- **Criterio:** cierre emocional y revancha funcional.

## FASE 8 — Audio
- 8.1 Mejorar envolventes chiptune.
- 8.2 Cues: click, pasar, tranque, victoria, derrota, turno.
- 8.3 AudioContext tras primer gesto.
- **Criterio:** sonido en cada evento sin assets externos.

## FASE 9 — Responsive, pulido y QA
- 9.1 Layout 100dvh robusto.
- 9.2 Tiles rivales legibles.
- 9.3 Estados de carga/error PeerJS.
- 9.4 `prefers-reduced-motion`.
- 9.5 `npm run lint && npx tsc --noEmit && npm run build`.

## FASE 10 — Verificación final
- Build limpio.
- Smoke test single-player y online.
- Validar reglas §1-7 contra `reglas_domino_venezolano.md`.

---

## Orden de ejecución
1 → 2 → 3 (tablero) → 4 (visual) → 5 (UX) → 6 (online) → 7 → 8 → 9 → 10.
