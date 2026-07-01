'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePeerRoom } from '@/multi/usePeerRoom';
import { Tile } from '@/engine/types';
import { getValidMoves } from '@/engine/dominoEngine';
import Scoreboard from '@/components/Scoreboard';
import Board from '@/components/Board';
import TileComponent from '@/components/Tile';
import Avatar from '@/components/Avatar';
import CRTOverlay from '@/components/CRTOverlay';
import VictoryScreen from '@/components/VictoryScreen';
import { useSound } from '@/hooks/useSound';

export default function Room() {
  const searchParams = useSearchParams();
  const roomId = typeof window !== 'undefined'
    ? window.location.pathname.split('/room/')[1] || ''
    : '';
  const initialName = searchParams.get('name') || '';

  const { playClick, playPass, playTranque, playVictory, playDefeat } = useSound();
  const lastLogRef = useRef<string>('');

  const [myName, setMyName] = useState(initialName);
  const [showScores, setShowScores] = useState(true);
  const [nameInput, setNameInput] = useState('');
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);

  const {
    isHost, gameState, lobby, playerIndex: myPlayerIndex,
    sendAction, startGame,
  } = usePeerRoom(roomId, myName);

  const myHand = useMemo(
    () => gameState?.players[myPlayerIndex]?.hand ?? [],
    [gameState, myPlayerIndex]
  );

  const isMyTurn = gameState?.currentTurn === myPlayerIndex && gameState?.phase === 'playing';

  const playableMoves = useMemo(() => {
    if (!gameState || !isMyTurn) return [];
    const isFirstMove = gameState.board.length === 0 && gameState.roundStarter === myPlayerIndex;
    const mustPlayDouble = isFirstMove && gameState.roundNumber === 1;
    return getValidMoves(myHand, gameState.leftEnd, gameState.rightEnd, {
      isFirstMoveOfRound: mustPlayDouble,
    });
  }, [gameState, isMyTurn, myHand, myPlayerIndex]);

  const canPlayAny = playableMoves.length > 0;

  useEffect(() => {
    if (!gameState || gameState.log.length === 0) return;
    const lastMsg = gameState.log[gameState.log.length - 1];
    if (lastMsg !== lastLogRef.current) {
      lastLogRef.current = lastMsg;
      if (lastMsg.includes('Trancado')) {
        playTranque();
      }
    }
  }, [gameState, playTranque]);

  useEffect(() => {
    if (!gameState || !gameState.gameOver) return;
    const myTeam = gameState.players[myPlayerIndex]?.team ?? 0;
    if (gameState.winnerTeam === myTeam) {
      playVictory();
    } else {
      playDefeat();
    }
  }, [gameState, myPlayerIndex, playVictory, playDefeat]);

  const handleTileClick = useCallback((tile: Tile) => {
    if (!gameState || !isMyTurn) return;
    const tileMoves = playableMoves.filter(m => m.tile.id === tile.id);

    if (tileMoves.length === 1) {
      playClick();
      sendAction({ type: 'PLAY', playerIndex: myPlayerIndex, tile, side: tileMoves[0].side });
      setSelectedTile(null);
    } else if (tileMoves.length === 2) {
      setSelectedTile(tile);
    }
  }, [gameState, isMyTurn, playableMoves, myPlayerIndex, sendAction, playClick]);

  const handleSideChoice = useCallback((tile: Tile, side: 'left' | 'right') => {
    if (!gameState) return;
    playClick();
    sendAction({ type: 'PLAY', playerIndex: myPlayerIndex, tile, side });
    setSelectedTile(null);
  }, [gameState, myPlayerIndex, sendAction, playClick]);

  const handlePass = useCallback(() => {
    if (!gameState || !isMyTurn) return;
    playPass();
    sendAction({ type: 'PASS', playerIndex: myPlayerIndex });
  }, [gameState, isMyTurn, myPlayerIndex, sendAction, playPass]);

  const handleRevancha = useCallback(() => {
    if (!isHost) return;
    startGame();
  }, [isHost, startGame]);

  const handleSetName = useCallback(() => {
    if (nameInput.trim()) {
      setMyName(nameInput.trim());
    }
  }, [nameInput]);

  if (!myName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4" style={{ height: '100dvh' }}>
        <h1 className="font-pixel text-xl text-retro-amarillo" style={{ textShadow: '3px 3px 0 #111' }}>
          DOMINO RETRO
        </h1>
        <p className="font-handwritten text-lg text-white/60">Sala: {roomId}</p>
        <input
          type="text"
          placeholder="Tu nombre"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSetName()}
          className="w-full max-w-xs p-3 text-sm font-pixel text-center"
          style={{ borderWidth: '3px', borderColor: '#111', boxShadow: '4px 4px 0px #111' }}
        />
        <button onClick={handleSetName} className="pixel-btn bg-retro-verde text-white px-8 py-3 font-pixel text-sm" style={{ backgroundColor: '#2d6b3f' }}>
          Unirse
        </button>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4" style={{ height: '100dvh' }}>
        <h1 className="font-pixel text-xl text-retro-amarillo" style={{ textShadow: '3px 3px 0 #111' }}>
          DOMINO RETRO
        </h1>
        <p className="font-handwritten text-lg text-white/60">Sala: {roomId}</p>

        {isHost ? (
          <>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {lobby.map((slot, i) => (
                <div key={i} className="flex items-center gap-2 p-2" style={{ borderWidth: '2px', borderColor: '#555', borderStyle: 'solid' }}>
                  <Avatar seat={i as 0 | 1 | 2 | 3} team={i % 2 === 0 ? 0 : 1} size={32} />
                  <span className="font-pixel text-xs text-white">{slot.name}</span>
                  {slot.isBot && <span className="font-pixel text-[10px] text-white/40 ml-auto">CPU</span>}
                </div>
              ))}
            </div>
            <button onClick={startGame} className="pixel-btn bg-retro-verde text-white px-8 py-3 font-pixel text-sm" style={{ backgroundColor: '#2d6b3f' }}>
              ¡Empezar Partida!
            </button>
          </>
        ) : (
          <div className="text-center">
            <p className="text-white/50 text-xs font-pixel animate-pulse">Esperando al anfitrión...</p>
            <p className="text-white/30 text-[10px] font-pixel mt-2">{lobby.length}/4 jugadores</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#b8a690] relative font-pixel overflow-hidden flex flex-col" style={{ height: '100dvh' }}>
      <button
        onClick={() => setShowScores(!showScores)}
        className="absolute top-2 right-2 z-20 pixel-btn bg-gray-800 text-white text-[10px] px-2 py-1"
      >
        {showScores ? '✕' : 'Pts'}
      </button>
      {showScores && <Scoreboard scores={gameState.scores} teamNames={["Nosotros", "Ellos"]} />}

      {/* Top - Partner (Player 2) */}
      <div className="flex flex-col items-center py-1 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Avatar seat={2} team={gameState.players[2].team} isActive={gameState.currentTurn === 2} />
          <span className={`text-xs font-bold tracking-wide ${gameState.currentTurn === 2 ? 'text-yellow-400' : 'text-white'}`} style={{ textShadow: '1px 1px 0 #111' }}>
            {gameState.players[2].name}
          </span>
          <span className="text-white/40 text-[10px]">({gameState.players[2].hand.length})</span>
        </div>
        <div className="flex gap-[2px]">
          {Array.from({ length: gameState.players[2].hand.length }).map((_, i) => (
            <TileComponent key={i} left={0} right={0} faceDown tiny />
          ))}
        </div>
      </div>

      {/* Middle: Rivals + Board */}
      <div className="flex-1 flex items-stretch min-h-0 px-1">
        {/* Left rival (Player 1) */}
        <div className="flex flex-col items-center justify-center shrink-0 px-1">
          <Avatar seat={1} team={gameState.players[1].team} isActive={gameState.currentTurn === 1} />
          <span className={`text-[10px] font-bold tracking-wide text-center my-1 ${gameState.currentTurn === 1 ? 'text-yellow-400' : 'text-white'}`} style={{ textShadow: '1px 1px 0 #111' }}>
            {gameState.players[1].name}
          </span>
          <span className="text-white/40 text-[8px] mb-1">({gameState.players[1].hand.length})</span>
          <div className="flex flex-col gap-[1px]">
            {Array.from({ length: gameState.players[1].hand.length }).map((_, i) => (
              <TileComponent key={i} left={0} right={0} faceDown tiny />
            ))}
          </div>
        </div>

        {/* Board */}
        <div className="flex-1 flex items-center justify-center px-1">
          <div className="w-full h-full relative" style={{ minHeight: '60px' }}>
            {gameState.phase === 'dealing' || gameState.phase === 'roundOver' ? (
              <div className="absolute inset-0 flex items-center justify-center board-wood rounded-lg">
                <div className="text-white animate-pulse text-center text-xs font-pixel">
                  {gameState.phase === 'roundOver' ? '¡Ronda terminada!' : 'Barajando...'}
                </div>
              </div>
            ) : (
              <Board board={gameState.board} isMyTurn={isMyTurn} />
            )}
          </div>
        </div>

        {/* Right rival (Player 3) */}
        <div className="flex flex-col items-center justify-center shrink-0 px-1">
          <Avatar seat={3} team={gameState.players[3].team} isActive={gameState.currentTurn === 3} />
          <span className={`text-[10px] font-bold tracking-wide text-center my-1 ${gameState.currentTurn === 3 ? 'text-yellow-400' : 'text-white'}`} style={{ textShadow: '1px 1px 0 #111' }}>
            {gameState.players[3].name}
          </span>
          <span className="text-white/40 text-[8px] mb-1">({gameState.players[3].hand.length})</span>
          <div className="flex flex-col gap-[1px]">
            {Array.from({ length: gameState.players[3].hand.length }).map((_, i) => (
              <TileComponent key={i} left={0} right={0} faceDown tiny />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom - Human hand */}
      <div className="hand-area p-3 z-20 shrink-0">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Avatar seat={0} team={gameState.players[0].team} isActive={gameState.currentTurn === 0} />
          <span className={`text-xs font-bold ${gameState.currentTurn === 0 ? 'text-yellow-400' : 'text-gray-300'}`} style={{ textShadow: '1px 1px 0 #111' }}>
            {gameState.players[0].name}
          </span>
        </div>
        <div className="flex justify-center gap-1.5 mb-2 flex-wrap">
          {myHand.map(tile => {
            const isPlayable = isMyTurn && playableMoves.some(m => m.tile.id === tile.id);
            return (
              <div key={tile.id} className="relative">
                <TileComponent
                  left={tile.left}
                  right={tile.right}
                  playable={isPlayable}
                  onClick={() => isPlayable && handleTileClick(tile)}
                />
                {selectedTile?.id === tile.id && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2 bg-gray-900/95 p-1.5 z-30" style={{ borderWidth: '2px', borderStyle: 'solid', borderColor: '#555' }}>
                    <button onClick={() => handleSideChoice(tile, 'left')} className="pixel-btn bg-retro-azul text-white px-3 py-1 text-[10px]">Izq</button>
                    <button onClick={() => handleSideChoice(tile, 'right')} className="pixel-btn bg-retro-naranja text-white px-3 py-1 text-[10px]">Der</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="text-center">
          {isMyTurn && canPlayAny && (
            <span className="text-yellow-400 text-[10px]">Es tu turno. Selecciona una ficha.</span>
          )}
          {isMyTurn && !canPlayAny && (
            <button onClick={handlePass} className="pixel-btn bg-retro-rojo text-white px-6 py-2 text-[10px] animate-glow-pulse">
              ¡PASAR TURNO!
            </button>
          )}
          {!isMyTurn && gameState.phase === 'playing' && (
            <span className="text-gray-400 text-[10px]">
              Turno de: <span className="text-retro-amarillo">{gameState.players[gameState.currentTurn]?.name}</span>
            </span>
          )}
          {gameState.phase === 'roundOver' && (
            <span className="text-yellow-400 text-[10px] animate-pulse">Preparando siguiente mano...</span>
          )}
        </div>
      </div>

      {gameState.gameOver && (
        <VictoryScreen
          isWin={gameState.winnerTeam === (gameState.players[myPlayerIndex]?.team ?? 0)}
          scores={gameState.scores}
          isZapato={gameState.log.some(l => l.includes('ZAPATO'))}
          onRematch={handleRevancha}
        />
      )}

      <CRTOverlay />
    </div>
  );
}
