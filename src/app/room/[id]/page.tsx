'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Peer, { DataConnection } from 'peerjs';
import { generateDeck, shuffleDeck, dealHands, GameState, Tile, canPlayTile, getOrientedTile, calculateVenezuelanScore } from '@/engine/dominoEngine';
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

  const broadcastState = (state: GameState) => {
    connections.forEach(conn => conn.send({ type: 'STATE_UPDATE', payload: state }));
  };

  const startGame = () => {
    const deck = shuffleDeck(generateDeck());
    const { hands, boneyard } = dealHands(deck, 4);

    const players = [
      { id: 'host', name: myName || 'Tú', isBot: false, hand: hands[0], team: 0 as const, passed: false },
      { id: 'bot-1', name: 'CPU 1 (Rival)', isBot: true, hand: hands[1], team: 1 as const, passed: false },
      { id: 'bot-2', name: 'CPU 2 (Pareja)', isBot: true, hand: hands[2], team: 0 as const, passed: false },
      { id: 'bot-3', name: 'CPU 3 (Rival)', isBot: true, hand: hands[3], team: 1 as const, passed: false }
    ];

    const initialState: GameState = {
      players, board: [], currentTurn: 0, boneyard,
      leftEnd: null, rightEnd: null, scores: [0, 0],
      gameOver: false, winnerTeam: null, log: ['Barajando fichas...'],
      phase: 'dealing', consecutivePasses: 0
    };

    setGameState(initialState);
    broadcastState(initialState);

    setTimeout(() => {
      const playingState = { ...initialState, phase: 'playing' as const, log: ['¡Empieza el juego! Tiras tú.'] };
      setGameState(playingState);
      broadcastState(playingState);
    }, 2000);
  };

  const handlePass = () => {
    if (!gameState || gameState.currentTurn !== myPlayerIndex) return;
    executePass(myPlayerIndex);
  };

  const executePass = (playerIndex: number) => {
    if (!gameState) return;
    playPass();
    const newPlayers = [...gameState.players];
    newPlayers[playerIndex] = { ...newPlayers[playerIndex], passed: true };

    const newPasses = gameState.consecutivePasses + 1;
    const nextTurn = (playerIndex + 1) % 4;

    let log = [...gameState.log, `${gameState.players[playerIndex].name} pasó.`];
    let gameOver = gameState.gameOver;
    let winnerTeam = gameState.winnerTeam;
    let scores = [...gameState.scores] as [number, number];

    if (newPasses >= 4) {
      playTranque();
      log.push(`¡${gameState.players[playerIndex].name} trancó el juego!`);
      const result = calculateVenezuelanScore({ ...gameState, players: newPlayers }, null);
      if (result.team >= 0) {
        scores[result.team] += result.points;
        if (scores[result.team] >= 100) { gameOver = true; winnerTeam = result.team; }
      }
    }

    const newState = { ...gameState, players: newPlayers, currentTurn: nextTurn, consecutivePasses: newPasses, log, gameOver, winnerTeam, scores };
    setGameState(newState);
    broadcastState(newState);

    if (!gameOver && newState.players[nextTurn].isBot) {
      setTimeout(() => playBotMove(newState), 1500);
    }
  };

  const playTile = (tile: Tile, side: 'left' | 'right') => {
    if (!gameState || gameState.currentTurn !== myPlayerIndex) return;
    executePlay(myPlayerIndex, tile, side);
  };

  const executePlay = (playerIndex: number, tile: Tile, side: 'left' | 'right') => {
    if (!gameState) return;
    const player = gameState.players[playerIndex];
    const validTile = player.hand.find(t => t.id === tile.id);
    if (!validTile) return;

    const canPlay = canPlayTile(validTile, gameState.leftEnd, gameState.rightEnd);
    if ((side === 'left' && canPlay.left) || (side === 'right' && canPlay.right)) {
      playClick();

      const orientedTile = getOrientedTile(validTile, side, gameState.leftEnd, gameState.rightEnd);
      const newPlayers = [...gameState.players];
      newPlayers[playerIndex] = { ...newPlayers[playerIndex], hand: player.hand.filter(t => t.id !== validTile.id), passed: false };

      let newBoard = [...gameState.board];
      const isDouble = orientedTile.left === orientedTile.right;
      if (side === 'left') newBoard.unshift({ tile: orientedTile, isHorizontal: isDouble });
      else newBoard.push({ tile: orientedTile, isHorizontal: isDouble });

      const nextTurn = (playerIndex + 1) % 4;
      const winner = newPlayers[playerIndex].hand.length === 0 ? playerIndex : null;
      let newScores = [...gameState.scores] as [number, number];
      let gameOver = false;
      let winnerTeam = null;
      let log = [...gameState.log, `${player.name} jugó [${validTile.left}|${validTile.right}]`];

      if (winner !== null) {
        log.push(`¡${player.name} se fue!`);
        const result = calculateVenezuelanScore({ ...gameState, players: newPlayers }, winner);
        if (result.team >= 0) {
          newScores[result.team] += result.points;
          if (newScores[result.team] >= 100) { gameOver = true; winnerTeam = result.team; }
        }
      }

      const newState = {
        ...gameState, players: newPlayers, board: newBoard, currentTurn: nextTurn,
        leftEnd: newBoard[0].tile.left, rightEnd: newBoard[newBoard.length - 1].tile.right,
        scores: newScores, gameOver, winnerTeam, log, consecutivePasses: 0
      };

      setGameState(newState);
      broadcastState(newState);
      setSelectedTile(null);

      if (!gameOver && newPlayers[nextTurn].isBot) {
        setTimeout(() => playBotMove(newState), 1500);
      }
    }
  };

  const playBotMove = (state: GameState) => {
    const botIndex = state.currentTurn;
    const bot = state.players[botIndex];
    const move = getBotMove(bot.hand, state.leftEnd, state.rightEnd);

    if (move) {
      executePlay(botIndex, move.tile, move.side);
    } else {
      executePass(botIndex);
    }
  };

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
    <div className="min-h-screen bg-[#b8a690] p-4 relative font-mono overflow-hidden">
      <button onClick={() => setShowScores(!showScores)} className="absolute top-2 right-2 z-20 bg-gray-800 text-white text-[10px] px-2 py-1 border-2 border-white shadow-[2px_2px_0px_#000]">
        {showScores ? '✕' : 'Pts'}
      </button>
      {showScores && <Scoreboard scores={gameState.scores} teamNames={["Nosotros", "Ellos"]} />}

      <div className="grid grid-cols-3 grid-rows-3 h-[80vh] gap-4 mt-8">
        {/* Arriba - Compañero */}
        <div className="col-span-3 row-start-1 flex flex-col items-center justify-start p-4">
          <div className="flex items-center gap-2 mb-2">
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
            {gameState.players[2].hand.map((t, i) => <TileComponent key={i} left={0} right={0} faceDown tiny />)}
          </div>
        </div>

        {/* Izquierda - Rival 1 */}
        <div className="col-start-1 row-start-2 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-2 mb-2">
            <div className={`w-10 h-10 border-2 border-white shadow-[2px_2px_0px_#000] relative overflow-hidden ${gameState.players[1].team === 0 ? 'bg-blue-600' : 'bg-red-600'} ${gameState.currentTurn === 1 ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}>
              <div className="absolute top-1.5 left-2 w-1.5 h-1.5 bg-white"></div>
              <div className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-white"></div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3 h-1 bg-white"></div>
            </div>
            <span className={`text-sm font-bold tracking-wide text-center ${gameState.currentTurn === 1 ? 'text-yellow-400' : 'text-white'}`}>
              {gameState.players[1].name}
            </span>
            <span className="text-gray-300 text-[10px]">({gameState.players[1].hand.length})</span>
          </div>
          <div className="flex flex-col gap-[2px]">
            {gameState.players[1].hand.map((t, i) => <TileComponent key={i} left={0} right={0} faceDown tiny />)}
          </div>
        </div>

        {/* Centro - Mesa */}
        <div className="col-start-2 row-start-2 flex items-center justify-center">
          <div className="bg-[#1e5631] border-4 border-[#5e3a1c] p-4 w-full h-full flex items-center justify-center relative shadow-[8px_8px_0px_#000]">
            {gameState.phase === 'dealing' ? (
              <div className="text-white animate-pulse text-center text-sm">Barajando...</div>
            ) : (
              <div className="flex items-center gap-0 overflow-x-auto max-w-full px-1">
                {gameState.board.map((item, idx) => (
                  <TileComponent key={`${item.tile.id}-${idx}`} left={item.tile.left} right={item.tile.right} isHorizontal={item.isHorizontal} />
                ))}
              </div>
            )}

            {gameState.log.length > 0 && (
              <div className="absolute bottom-2 left-2 right-2 bg-black/80 text-white text-xs p-1 text-center truncate">
                {gameState.log[gameState.log.length - 1]}
              </div>
            )}
          </div>
        </div>

        {/* Derecha - Rival 2 */}
        <div className="col-start-3 row-start-2 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-2 mb-2">
            <div className={`w-10 h-10 border-2 border-white shadow-[2px_2px_0px_#000] relative overflow-hidden ${gameState.players[3].team === 0 ? 'bg-blue-600' : 'bg-red-600'} ${gameState.currentTurn === 3 ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}>
              <div className="absolute top-1.5 left-2 w-1.5 h-1.5 bg-white"></div>
              <div className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-white"></div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3 h-1 bg-white"></div>
            </div>
            <span className={`text-sm font-bold tracking-wide text-center ${gameState.currentTurn === 3 ? 'text-yellow-400' : 'text-white'}`}>
              {gameState.players[3].name}
            </span>
            <span className="text-gray-300 text-[10px]">({gameState.players[3].hand.length})</span>
          </div>
          <div className="flex flex-col gap-[2px]">
            {gameState.players[3].hand.map((t, i) => <TileComponent key={i} left={0} right={0} faceDown tiny />)}
          </div>
        </div>

        <div className="col-span-3 row-start-3"></div>
      </div>

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
          {isMyTurn ? (
            !canPlayAny ? (
              <button onClick={handlePass} className="bg-red-600 text-white px-6 py-2 border-b-4 border-red-900 active:border-b-0 animate-pulse">
                ¡PASAR TURNO!
              </button>
            ) : (
              <span className="text-yellow-400 text-sm">Es tu turno. Selecciona una ficha iluminada.</span>
            )
          ) : (
            <span className="text-gray-400 text-sm">Turno de: {gameState.players[gameState.currentTurn].name}</span>
          )}
        </div>
      </div>

      {gameState.gameOver && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
          <h1 className="text-4xl text-yellow-400 mb-4 animate-pulse">
            {gameState.winnerTeam === 0 ? "¡GANAMOS!" : "¡PERDIMOS!"}
          </h1>
          <button onClick={startGame} className="bg-blue-600 text-white px-6 py-3 border-b-4 border-blue-800 active:border-b-0 font-mono">Revancha</button>
        </div>
      )}
    </div>
  );
}
