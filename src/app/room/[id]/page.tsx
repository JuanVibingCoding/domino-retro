'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Peer, { DataConnection } from 'peerjs';
import { generateDeck, shuffleDeck, dealHands, GameState, Tile, Player, canPlayTile, calculateVenezuelanScore, getOrientedTile } from '@/engine/dominoEngine';
import { getBotMove } from '@/engine/aiBot';
import Scoreboard from '@/components/Scoreboard';
import TileComponent from '@/components/Tile';
import { useSound } from '@/hooks/useSound';

export default function Room() {
  const params = useParams();
  const roomId = params.id as string;
  const { playClick } = useSound();

  const [peer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [isHost, setIsHost] = useState(false);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myName, setMyName] = useState('');
  const [myPlayerIndex] = useState(0);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);

  useEffect(() => {
    const newPeer = new Peer(roomId);
    newPeer.on('open', (id) => {
      setIsHost(id === roomId);
    });
    newPeer.on('connection', (conn) => {
      setConnections(prev => [...prev, conn]);
      conn.on('data', (data) => handleNetworkData(data));
    });
    return () => { newPeer.destroy(); };
  }, [roomId]);

  const handleNetworkData = (data: any) => {
    if (data.type === 'STATE_UPDATE') setGameState(data.payload);
  };

  const startGame = () => {
    const deck = shuffleDeck(generateDeck());
    const { hands, boneyard } = dealHands(deck, 4);

    const players: Player[] = [
      { id: 'host', name: myName || 'Tú', isBot: false, hand: hands[0], team: 0 as const, passed: false },
      { id: 'bot-1', name: 'Bot CPU 1', isBot: true, hand: hands[1], team: 1 as const, passed: false },
      { id: 'bot-2', name: 'Bot CPU 2 (Tu Pareja)', isBot: true, hand: hands[2], team: 0 as const, passed: false },
      { id: 'bot-3', name: 'Bot CPU 3', isBot: true, hand: hands[3], team: 1 as const, passed: false }
    ];

    const initialState: GameState = {
      players, board: [], currentTurn: 0, boneyard,
      leftEnd: null, rightEnd: null, scores: [0, 0],
      gameOver: false, winnerTeam: null,
      log: ['Empieza la partida'], phase: 'playing', consecutivePasses: 0
    };

    setGameState(initialState);
    broadcastState(initialState);
  };

  const broadcastState = (state: GameState) => {
    connections.forEach(conn => conn.send({ type: 'STATE_UPDATE', payload: state }));
  };

  const advanceTurn = (state: GameState, nextTurn: number) => {
    let newState = { ...state, currentTurn: nextTurn };
    return newState;
  };

  const checkWin = (state: GameState, winnerIndex: number | null): GameState => {
    if (winnerIndex === null) {
      // Check for lock (tranque) - all 4 passed
      if (state.players.every(p => p.passed)) {
        const result = calculateVenezuelanScore(state, null);
        if (result.team >= 0) {
          const newScores = [...state.scores] as [number, number];
          newScores[result.team] += result.points;
          return { ...state, scores: newScores, gameOver: newScores[result.team] >= 100, winnerTeam: newScores[result.team] >= 100 ? result.team : null, phase: newScores[result.team] >= 100 ? 'gameOver' : 'playing' };
        }
        return state;
      }
      return state;
    }

    const result = calculateVenezuelanScore(state, winnerIndex);
    if (result.team >= 0) {
      const newScores = [...state.scores] as [number, number];
      newScores[result.team] += result.points;
      const gameOver = newScores[result.team] >= 100;
      return { ...state, scores: newScores, gameOver, winnerTeam: gameOver ? result.team : null, phase: gameOver ? 'gameOver' : 'playing' };
    }
    return state;
  };

  const playTile = (tile: Tile, side: 'left' | 'right') => {
    if (!gameState || gameState.currentTurn !== myPlayerIndex) return;

    const canPlay = canPlayTile(tile, gameState.leftEnd, gameState.rightEnd);
    if ((side === 'left' && canPlay.left) || (side === 'right' && canPlay.right)) {
      playClick();

      const orientedTile = getOrientedTile(tile, side, gameState.leftEnd, gameState.rightEnd);
      const newPlayers = gameState.players.map((p, i) =>
        i === myPlayerIndex ? { ...p, hand: p.hand.filter(t => t.id !== tile.id), passed: false } : { ...p, passed: false }
      );

      let newBoard = [...gameState.board];
      const boardEntry = { tile: orientedTile, isHorizontal: true };
      if (side === 'left') newBoard.unshift(boardEntry);
      else newBoard.push(boardEntry);

      const nextTurn = (gameState.currentTurn + 1) % 4;
      const winner = newPlayers[myPlayerIndex].hand.length === 0 ? myPlayerIndex : null;

      let newState: GameState = {
        ...gameState, players: newPlayers, board: newBoard,
        currentTurn: nextTurn,
        leftEnd: newBoard[0].tile.left, rightEnd: newBoard[newBoard.length - 1].tile.right,
        consecutivePasses: 0
      };

      newState = checkWin(newState, winner);
      setGameState(newState);
      broadcastState(newState);
      setSelectedTile(null);

      if (!newState.gameOver && newState.players[nextTurn].isBot) {
        setTimeout(() => playBotMove(newState), 1500);
      }
    }
  };

  const passTurn = () => {
    if (!gameState || gameState.currentTurn !== myPlayerIndex) return;

    const newPlayers = gameState.players.map((p, i) =>
      i === myPlayerIndex ? { ...p, passed: true } : p
    );
    const nextTurn = (gameState.currentTurn + 1) % 4;
    const newPasses = gameState.consecutivePasses + 1;

    let newState: GameState = {
      ...gameState, players: newPlayers, currentTurn: nextTurn, consecutivePasses: newPasses
    };

    if (newPasses >= 4) {
      newState = checkWin(newState, null);
    }

    setGameState(newState);
    broadcastState(newState);

    if (!newState.gameOver && newState.players[nextTurn].isBot) {
      setTimeout(() => playBotMove(newState), 1500);
    }
  };

  const playBotMove = (state: GameState) => {
    const botIndex = state.currentTurn;
    const bot = state.players[botIndex];
    const move = getBotMove(bot.hand, state.leftEnd, state.rightEnd);

    if (move) {
      playClick();
      const orientedTile = getOrientedTile(move.tile, move.side, state.leftEnd, state.rightEnd);
      const newPlayers = state.players.map((p, i) =>
        i === botIndex ? { ...p, hand: p.hand.filter(t => t.id !== move.tile.id), passed: false } : { ...p, passed: false }
      );

      let newBoard = [...state.board];
      const boardEntry = { tile: orientedTile, isHorizontal: true };
      if (move.side === 'left') newBoard.unshift(boardEntry);
      else newBoard.push(boardEntry);

      const nextTurn = (botIndex + 1) % 4;
      const winner = newPlayers[botIndex].hand.length === 0 ? botIndex : null;

      let newState: GameState = {
        ...state, players: newPlayers, board: newBoard,
        currentTurn: nextTurn,
        leftEnd: newBoard[0].tile.left, rightEnd: newBoard[newBoard.length - 1].tile.right,
        consecutivePasses: 0
      };

      newState = checkWin(newState, winner);
      setGameState(newState);
      broadcastState(newState);

      if (!newState.gameOver && newState.players[nextTurn].isBot) {
        setTimeout(() => playBotMove(newState), 1500);
      }
    } else {
      const newPlayers = state.players.map((p, i) =>
        i === botIndex ? { ...p, passed: true } : p
      );
      const nextTurn = (botIndex + 1) % 4;
      const newPasses = state.consecutivePasses + 1;

      let newState: GameState = {
        ...state, players: newPlayers, currentTurn: nextTurn, consecutivePasses: newPasses
      };

      if (newPasses >= 4) {
        newState = checkWin(newState, null);
      }

      setGameState(newState);
      broadcastState(newState);

      if (!newState.gameOver && newState.players[nextTurn].isBot) {
        setTimeout(() => playBotMove(newState), 1500);
      }
    }
  };

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-xl text-gray-800">Sala de Espera: {roomId}</h1>
        <input type="text" placeholder="Tu nombre" value={myName} onChange={(e) => setMyName(e.target.value)} className="p-2 text-base border-2 border-gray-800 bg-white" />
        {typeof window !== 'undefined' && <p className="text-sm text-gray-600">Enlace para invitar: {window.location.href}</p>}
        <button onClick={startGame} className="bg-green-700 text-white px-6 py-3 border-b-4 border-green-900 active:border-b-0 mt-4">¡Empezar Partida! (Bots rellenarán)</button>
      </div>
    );
  }

  const myHand = gameState.players[myPlayerIndex].hand;
  const isMyTurn = gameState.currentTurn === myPlayerIndex;

  return (
    <div className="min-h-screen p-4 relative overflow-hidden">
      <Scoreboard scores={gameState.scores} teamNames={["Nosotros", "Ellos"]} />

      <div className="table-wood w-full h-[60vh] mt-12 p-8 flex flex-col items-center justify-center relative">
        <div className="flex flex-wrap justify-center gap-1 bg-black/10 p-2 rounded max-w-3xl">
          {gameState.board.map((entry, idx) => (
            <TileComponent key={`${entry.tile.id}-${idx}`} left={entry.tile.left} right={entry.tile.right} isHorizontal />
          ))}
        </div>

        {isMyTurn && myHand.every(t => {
          const c = canPlayTile(t, gameState.leftEnd, gameState.rightEnd);
          return !c.left && !c.right;
        }) && (
          <button onClick={passTurn} className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-600 text-white px-4 py-2 rounded">
            Pasar Turno (Trancar)
          </button>
        )}

        {gameState.gameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
            <h1 className="text-4xl text-yellow-400 mb-4 animate-bounce">
              {gameState.winnerTeam === 0 ? "¡GANAMOS!" : "PERDIMOS"}
            </h1>
            <button onClick={startGame} className="bg-blue-600 text-white px-6 py-3 border-b-4 border-blue-800">Revancha</button>
          </div>
        )}
      </div>

      <div className="text-center my-4 text-white bg-gray-800 inline-block px-4 py-2 rounded mx-auto w-full">
        {isMyTurn ? <span className="text-green-400">¡Es tu turno! Selecciona una ficha.</span> : `Turno de: ${gameState.players[gameState.currentTurn].name}`}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-black/60 p-4 flex justify-center gap-2 border-t-4 border-gray-800 z-20">
        {myHand.map(tile => {
          const c = canPlayTile(tile, gameState.leftEnd, gameState.rightEnd);
          const isPlayable = isMyTurn && (c.left || c.right);
          return (
            <div key={tile.id} className="relative">
              <TileComponent
                left={tile.left}
                right={tile.right}
                playable={isPlayable}
                onClick={() => isPlayable && setSelectedTile(tile)}
              />
              {selectedTile?.id === tile.id && (
                <div className="absolute -top-12 left-0 right-0 flex justify-between bg-gray-900 p-1 rounded">
                  {c.left && <button onClick={() => playTile(tile, 'left')} className="bg-blue-500 text-white text-xs px-2 py-1">Izq</button>}
                  {c.right && <button onClick={() => playTile(tile, 'right')} className="bg-blue-500 text-white text-xs px-2 py-1">Der</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
