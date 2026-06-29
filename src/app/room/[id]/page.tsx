'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Peer, { DataConnection } from 'peerjs';
import {
  generateDeck, shuffleDeck, dealHands, GameState, Tile, canPlayTile,
  getOrientedTile, findSixDoubleOwner, getNextTurn, resolveRound,
  isTrancado, createNewRound, calculateTotalPips, calculateTeamPoints,
} from '@/engine/dominoEngine';
import { getBotMove } from '@/engine/aiBot';
import Scoreboard from '@/components/Scoreboard';
import TileComponent from '@/components/Tile';
import { useSound } from '@/hooks/useSound';

export default function Room() {
  const params = useParams();
  const roomId = params.id as string;
  const { playClick, playPass, playTranque } = useSound();

  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [isHost, setIsHost] = useState(false);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myName, setMyName] = useState('');
  const [myPlayerIndex, setMyPlayerIndex] = useState(0);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [showScores, setShowScores] = useState(true);
  const [handShaking, setHandShaking] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(400);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      setBoardWidth(entries[0].contentRect.width);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const newPeer = new Peer(roomId);
    newPeer.on('open', (id) => setIsHost(id === roomId));
    newPeer.on('connection', (conn) => {
      setConnections(prev => [...prev, conn]);
      conn.on('data', (data: any) => data.type === 'STATE_UPDATE' && setGameState(data.payload));
    });
    setPeer(newPeer);
    return () => { newPeer.destroy(); };
  }, [roomId]);

  const broadcastState = useCallback((state: GameState) => {
    connections.forEach(conn => conn.send({ type: 'STATE_UPDATE', payload: state }));
  }, [connections]);

  const startNewHand = useCallback((prevState: GameState, nextRoundStarter: number) => {
    const deck = shuffleDeck(generateDeck());
    const { hands } = dealHands(deck, 4);
    const newPlayers = prevState.players.map((p, i) => ({
      ...p, hand: hands[i], passed: false,
    }));

    const firstTurn = nextRoundStarter;
    const log = prevState.log.slice();
    log.push(`Nueva mano — repartiendo fichas...`);

    const newState: GameState = {
      ...prevState,
      players: newPlayers,
      board: [],
      currentTurn: firstTurn,
      boneyard: [],
      leftEnd: null,
      rightEnd: null,
      log,
      phase: 'playing',
      consecutivePasses: 0,
      lastPlayerToPlay: null,
      roundStarter: firstTurn,
    };

    setGameState(newState);
    broadcastState(newState);
    setSelectedTile(null);
    setHandShaking(false);
    return newState;
  }, [broadcastState]);

  const startGame = useCallback(() => {
    const deck = shuffleDeck(generateDeck());
    const { hands, boneyard } = dealHands(deck, 4);

    const players = [
      { id: 'host', name: myName || 'Tú', isBot: false, hand: hands[0], team: 0 as const, passed: false },
      { id: 'bot-1', name: 'CPU 1 (Rival)', isBot: true, hand: hands[1], team: 1 as const, passed: false },
      { id: 'bot-2', name: 'CPU 2 (Pareja)', isBot: true, hand: hands[2], team: 0 as const, passed: false },
      { id: 'bot-3', name: 'CPU 3 (Rival)', isBot: true, hand: hands[3], team: 1 as const, passed: false },
    ];

    const sixSixOwner = findSixDoubleOwner(players);
    const firstStarter = sixSixOwner !== -1 ? sixSixOwner : 0;

    const initialState: GameState = {
      players,
      board: [],
      currentTurn: firstStarter,
      boneyard,
      leftEnd: null,
      rightEnd: null,
      scores: [0, 0],
      gameOver: false,
      winnerTeam: null,
      log: ['¡Partida iniciada! Buscando el 6-6...'],
      phase: 'dealing',
      consecutivePasses: 0,
      lastPlayerToPlay: null,
      roundStarter: firstStarter,
    };

    setGameState(initialState);
    broadcastState(initialState);

    setTimeout(() => {
      const starterName = players[firstStarter].name;
      const logMsg = sixSixOwner !== -1
        ? `${starterName} tiene la cochina (6-6). ¡Empieza!`
        : `${starterName} empieza la primera ronda.`;
      const playingState = {
        ...initialState,
        phase: 'playing' as const,
        log: [logMsg],
      };
      setGameState(playingState);
      broadcastState(playingState);

      if (players[firstStarter].isBot) {
        setTimeout(() => playBotMove(playingState), 1500);
      }
    }, 1500);
  }, [myName, broadcastState]);

  const endRound = useCallback((state: GameState, winnerPlayerIndex: number | null) => {
    const result = resolveRound(state.players, winnerPlayerIndex, state.lastPlayerToPlay);
    const newScores: [number, number] = [...state.scores];
    newScores[result.winnerTeam] += result.points;
    const isZapato = result.winnerTeam === 0 ? newScores[1] === 0 : newScores[0] === 0;
    const reachedGoal = newScores[result.winnerTeam] >= 100;
    const newLog = [...state.log];
    newLog.push(`${result.winnerTeam === 0 ? 'Nosotros' : 'Ellos'} ganaron la ronda — ${result.points} pts.`);

    if (reachedGoal) {
      if (isZapato) {
        newLog.push(`¡ZAPATO! ${result.winnerTeam === 0 ? 'Nosotros' : 'Ellos'} barrieron la mesa.`);
      }
      const finalState: GameState = {
        ...state,
        scores: newScores,
        log: newLog,
        gameOver: true,
        winnerTeam: result.winnerTeam,
        phase: 'gameOver',
      };
      setGameState(finalState);
      broadcastState(finalState);
      return;
    }

    const nextStarter = getNextTurn(state.roundStarter, 4);
    const transitionState: GameState = {
      ...state,
      scores: newScores,
      log: newLog,
      phase: 'roundOver',
    };
    setGameState(transitionState);
    broadcastState(transitionState);

    setTimeout(() => {
      startNewHand(transitionState, nextStarter);
    }, 2500);
  }, [broadcastState, startNewHand]);

  const handlePass = useCallback(() => {
    if (!gameState || gameState.currentTurn !== myPlayerIndex) return;
    performPass(myPlayerIndex, gameState);
  }, [gameState, myPlayerIndex]);

  const performPass = useCallback((playerIndex: number, state: GameState) => {
    playPass();

    const newPlayers = state.players.map((p, i) =>
      i === playerIndex ? { ...p, passed: true } : p
    );
    const newPasses = state.consecutivePasses + 1;
    const nextTurn = getNextTurn(playerIndex, 4);
    const log = [...state.log, `${state.players[playerIndex].name} pasó.`];

    if (newPasses >= 4 || isTrancado(newPlayers, state.leftEnd, state.rightEnd)) {
      playTranque();
      log.push(`¡Trancado! Nadie puede jugar.`);
      const passState: GameState = {
        ...state,
        players: newPlayers,
        log,
        consecutivePasses: newPasses,
        currentTurn: nextTurn,
      };
      setGameState(passState);
      broadcastState(passState);
      endRound(passState, null);
      return;
    }

    const newState: GameState = {
      ...state,
      players: newPlayers,
      currentTurn: nextTurn,
      consecutivePasses: newPasses,
      log,
    };
    setGameState(newState);
    broadcastState(newState);

    if (newState.players[nextTurn].isBot) {
      setTimeout(() => playBotMove(newState), 1500);
    }
  }, [broadcastState, endRound, playPass, playTranque]);

  const playTile = useCallback((tile: Tile, side: 'left' | 'right') => {
    if (!gameState || gameState.currentTurn !== myPlayerIndex) return;
    performPlay(myPlayerIndex, tile, side, gameState);
  }, [gameState, myPlayerIndex]);

  const performPlay = useCallback((playerIndex: number, tile: Tile, side: 'left' | 'right', state: GameState) => {
    const player = state.players[playerIndex];
    const validTile = player.hand.find(t => t.id === tile.id);
    if (!validTile) return null;

    const canPlay = canPlayTile(validTile, state.leftEnd, state.rightEnd);
    if (!((side === 'left' && canPlay.left) || (side === 'right' && canPlay.right))) return null;

    playClick();

    const orientedTile = getOrientedTile(validTile, side, state.leftEnd, state.rightEnd);
    const newPlayers = state.players.map((p, i) =>
      i === playerIndex
        ? { ...p, hand: p.hand.filter(t => t.id !== validTile.id), passed: false }
        : p
    );

    const newBoard = [...state.board];
    const isDouble = orientedTile.left === orientedTile.right;
    if (side === 'left') newBoard.unshift({ tile: orientedTile, isHorizontal: !isDouble });
    else newBoard.push({ tile: orientedTile, isHorizontal: !isDouble });

    const nextTurn = getNextTurn(playerIndex, 4);
    const log = [...state.log, `${player.name} jugó [${validTile.left}|${validTile.right}]`];

    const newState: GameState = {
      ...state,
      players: newPlayers,
      board: newBoard,
      currentTurn: nextTurn,
      leftEnd: newBoard[0].tile.left,
      rightEnd: newBoard[newBoard.length - 1].tile.right,
      log,
      consecutivePasses: 0,
      lastPlayerToPlay: playerIndex,
    };

    setGameState(newState);
    broadcastState(newState);
    setSelectedTile(null);

    if (newPlayers[playerIndex].hand.length === 0) {
      log.push(`¡${player.name} se fue!`);
      const dominadaState = { ...newState, log };
      setGameState(dominadaState);
      broadcastState(dominadaState);
      endRound(dominadaState, playerIndex);
      return newState;
    }

    if (newPlayers[nextTurn].isBot) {
      setTimeout(() => playBotMove(newState), 1500);
    }

    return newState;
  }, [broadcastState, endRound, playClick]);

  const playBotMove = useCallback((state: GameState) => {
    const botIndex = state.currentTurn;
    const bot = state.players[botIndex];
    const move = getBotMove(bot.hand, state.leftEnd, state.rightEnd);

    if (move) {
      performPlay(botIndex, move.tile, move.side, state);
    } else {
      performPass(botIndex, state);
    }
  }, [performPlay, performPass]);

  const handleRevancha = useCallback(() => {
    startGame();
  }, [startGame]);

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#d5cdba]">
        <h1 className="text-xl text-gray-800 font-mono">Sala de Espera: {roomId}</h1>
        <input type="text" placeholder="Tu nombre" value={myName} onChange={(e) => setMyName(e.target.value)} className="p-2 text-base border-4 border-gray-800 bg-white font-mono" />
        <button onClick={startGame} className="bg-green-700 text-white px-6 py-3 border-b-4 border-green-900 active:border-b-0 mt-4 font-mono">¡Empezar Partida!</button>
      </div>
    );
  }

  const myHand = gameState.players[myPlayerIndex].hand;
  const isMyTurn = gameState.currentTurn === myPlayerIndex;
  const canPlayAny = myHand.some(t => {
    const c = canPlayTile(t, gameState.leftEnd, gameState.rightEnd);
    return c.left || c.right;
  });

  return (
    <div className="min-h-screen bg-[#b8a690] relative font-mono overflow-hidden flex flex-col" style={{ height: '100dvh' }}>
      <button onClick={() => setShowScores(!showScores)} className="absolute top-2 right-2 z-20 bg-gray-800 text-white text-[10px] px-2 py-1 border-2 border-white shadow-[2px_2px_0px_#000]">
        {showScores ? '✕' : 'Pts'}
      </button>
      {showScores && <Scoreboard scores={gameState.scores} teamNames={["Nosotros", "Ellos"]} />}

      {/* Top - Partner (Player 2) */}
      <div className="flex flex-col items-center py-2 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-10 h-10 border-2 border-white shadow-[2px_2px_0px_#000] relative overflow-hidden ${gameState.players[2].team === 0 ? 'bg-blue-600' : 'bg-red-600'} ${gameState.currentTurn === 2 ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}>
            <div className="absolute top-1.5 left-2 w-1.5 h-1.5 bg-white"></div>
            <div className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-white"></div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3 h-1 bg-white"></div>
          </div>
          <span className={`text-sm font-bold tracking-wide ${gameState.currentTurn === 2 ? 'text-yellow-400' : 'text-white'}`}>
            {gameState.players[2].name}
          </span>
          <span className="text-gray-300 text-[10px]">({gameState.players[2].hand.length})</span>
        </div>
        <div className="flex gap-[2px]">
          {Array.from({ length: gameState.players[2].hand.length }).map((_, i) => (
            <TileComponent key={i} left={0} right={0} faceDown tiny />
          ))}
        </div>
      </div>

      {/* Middle: Rivals + Board */}
      <div className="flex-1 flex items-stretch min-h-0 px-2">
        {/* Left rival (Player 1) */}
        <div className="flex flex-col items-center justify-center shrink-0 px-1">
          <div className={`w-10 h-10 border-2 border-white shadow-[2px_2px_0px_#000] relative overflow-hidden mb-2 ${gameState.players[1].team === 0 ? 'bg-blue-600' : 'bg-red-600'} ${gameState.currentTurn === 1 ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}>
            <div className="absolute top-1.5 left-2 w-1.5 h-1.5 bg-white"></div>
            <div className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-white"></div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3 h-1 bg-white"></div>
          </div>
          <span className={`text-sm font-bold tracking-wide text-center mb-2 ${gameState.currentTurn === 1 ? 'text-yellow-400' : 'text-white'}`}>
            {gameState.players[1].name}
          </span>
          <span className="text-gray-300 text-[10px] mb-1">({gameState.players[1].hand.length})</span>
          <div className="flex flex-col gap-[2px]">
            {Array.from({ length: gameState.players[1].hand.length }).map((_, i) => (
              <TileComponent key={i} left={0} right={0} faceDown tiny />
            ))}
          </div>
        </div>

        {/* Board */}
        <div className="flex-1 flex items-center justify-center px-2">
          <div className="bg-[#1e5631] border-4 border-[#5e3a1c] w-full h-full flex items-center justify-center relative shadow-[8px_8px_0px_#000]" style={{ minHeight: '60px' }}>
            {gameState.phase === 'dealing' || gameState.phase === 'roundOver' ? (
              <div className="text-white animate-pulse text-center text-sm">
                {gameState.phase === 'roundOver' ? '¡Ronda terminada!' : 'Barajando...'}
              </div>
            ) : (
              <div ref={boardRef} className="flex flex-col items-center overflow-y-auto w-full h-full px-2 py-1">
                {gameState.board.length === 0 ? (
                  <span className="text-white/40 text-xs mx-auto mt-auto mb-auto">Juega tu primera ficha</span>
                ) : (() => {
                  const TILE_W = 64;
                  const perRow = Math.max(1, Math.floor(boardWidth / TILE_W));
                  const rows: (typeof gameState.board)[] = [];
                  for (let i = 0; i < gameState.board.length; i += perRow) {
                    rows.push(gameState.board.slice(i, i + perRow));
                  }
                  return (
                    <div className="flex flex-col gap-[2px] m-auto items-center">
                      {rows.map((row, ri) => (
                        <div key={ri} className="flex" style={{ flexDirection: ri % 2 === 0 ? 'row' : 'row-reverse' }}>
                          {row.map((item, idx) => (
                            <TileComponent key={`${item.tile.id}-${ri}-${idx}`} left={item.tile.left} right={item.tile.right} compact doubleMark={item.tile.left === item.tile.right} isHorizontal={item.isHorizontal} />
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {gameState.log.length > 0 && (
              <div className="absolute bottom-1 left-2 right-2 bg-black/80 text-white text-[10px] p-1 text-center truncate">
                {gameState.log[gameState.log.length - 1]}
              </div>
            )}
          </div>
        </div>

        {/* Right rival (Player 3) */}
        <div className="flex flex-col items-center justify-center shrink-0 px-1">
          <div className={`w-10 h-10 border-2 border-white shadow-[2px_2px_0px_#000] relative overflow-hidden mb-2 ${gameState.players[3].team === 0 ? 'bg-blue-600' : 'bg-red-600'} ${gameState.currentTurn === 3 ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}>
            <div className="absolute top-1.5 left-2 w-1.5 h-1.5 bg-white"></div>
            <div className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-white"></div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3 h-1 bg-white"></div>
          </div>
          <span className={`text-sm font-bold tracking-wide text-center mb-2 ${gameState.currentTurn === 3 ? 'text-yellow-400' : 'text-white'}`}>
            {gameState.players[3].name}
          </span>
          <span className="text-gray-300 text-[10px] mb-1">({gameState.players[3].hand.length})</span>
          <div className="flex flex-col gap-[2px]">
            {Array.from({ length: gameState.players[3].hand.length }).map((_, i) => (
              <TileComponent key={i} left={0} right={0} faceDown tiny />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom - Human hand */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#111] p-4 border-t-4 border-[#5e3a1c] z-20">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className={`w-10 h-10 border-2 border-white shadow-[2px_2px_0px_#000] relative overflow-hidden ${gameState.players[0].team === 0 ? 'bg-blue-600' : 'bg-red-600'}`}>
            <div className="absolute top-1.5 left-2 w-1.5 h-1.5 bg-white"></div>
            <div className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-white"></div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3 h-1 bg-white"></div>
          </div>
          <span className={`text-sm font-bold ${gameState.currentTurn === 0 ? 'text-yellow-400' : 'text-gray-300'}`}>
            {gameState.players[0].name}
          </span>
        </div>
        <div className="flex justify-center gap-2 mb-2">
          {myHand.map(tile => {
            const c = canPlayTile(tile, gameState.leftEnd, gameState.rightEnd);
            const isPlayable = isMyTurn && (c.left || c.right);
            return (
              <div key={tile.id} className="relative">
                <TileComponent
                  left={tile.left} right={tile.right}
                  playable={isPlayable}
                  onClick={() => isPlayable && setSelectedTile(tile)}
                />
                {selectedTile?.id === tile.id && (
                  <div className="absolute -top-10 left-0 right-0 flex justify-between bg-gray-900 p-1 rounded shadow-lg z-30">
                    {c.left && <button onClick={() => playTile(tile, 'left')} className="bg-blue-500 text-white text-xs px-2 py-1 hover:bg-blue-400">Izq</button>}
                    {c.right && <button onClick={() => playTile(tile, 'right')} className="bg-blue-500 text-white text-xs px-2 py-1 hover:bg-blue-400">Der</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="text-center">
          {isMyTurn && canPlayAny && gameState.phase === 'playing' && (
            <span className="text-yellow-400 text-sm">Es tu turno. Selecciona una ficha iluminada.</span>
          )}
          {isMyTurn && !canPlayAny && gameState.phase === 'playing' && (
            <button onClick={handlePass} className="bg-red-600 text-white px-6 py-2 border-b-4 border-red-900 active:border-b-0 animate-pulse">
              ¡PASAR TURNO!
            </button>
          )}
          {gameState.currentTurn !== myPlayerIndex && gameState.phase === 'playing' && (
            <span className="text-gray-400 text-sm">Turno de: {gameState.players[gameState.currentTurn].name}</span>
          )}
          {gameState.phase === 'roundOver' && (
            <span className="text-yellow-400 text-sm animate-pulse">Preparando siguiente mano...</span>
          )}
        </div>
      </div>

      {gameState.gameOver && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
          <h1 className="text-4xl text-yellow-400 mb-4 animate-pulse">
            {gameState.winnerTeam === 0 ? "¡GANAMOS!" : "¡PERDIMOS!"}
          </h1>
          <p className="text-white text-sm mb-4">
            {gameState.scores[0]} - {gameState.scores[1]}
          </p>
          <button onClick={handleRevancha} className="bg-blue-600 text-white px-6 py-3 border-b-4 border-blue-800 active:border-b-0 font-mono">Revancha</button>
        </div>
      )}
    </div>
  );
}
