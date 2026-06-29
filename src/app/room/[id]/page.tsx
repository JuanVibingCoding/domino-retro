'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Peer, { DataConnection } from 'peerjs';
import { generateDeck, shuffleDeck, dealHands, GameState, Tile, Player, canPlayTile, calculateVenezuelanScore } from '@/engine/dominoEngine';
import { getBotMove } from '@/engine/aiBot';
import Scoreboard from '@/components/Scoreboard';
import TileComponent from '@/components/Tile';
import { useSound } from '@/hooks/useSound';

export default function Room() {
  const params = useParams();
  const roomId = params.id as string;
  const { playClick } = useSound();

  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [myId, setMyId] = useState('');

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myName, setMyName] = useState('');
  const [myPlayerIndex, setMyPlayerIndex] = useState(0);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);

  useEffect(() => {
    const newPeer = new Peer(roomId);
    newPeer.on('open', (id) => {
      setMyId(id);
      setIsHost(id === roomId);
    });
    newPeer.on('connection', (conn) => {
      setConnections(prev => [...prev, conn]);
      conn.on('data', (data) => handleNetworkData(data));
    });
    setPeer(newPeer);
    return () => { newPeer.destroy(); };
  }, [roomId]);

  const handleNetworkData = (data: any) => {
    if (data.type === 'STATE_UPDATE') setGameState(data.payload);
  };

  const startGame = () => {
    const deck = shuffleDeck(generateDeck());
    const { hands, boneyard } = dealHands(deck, 4);

    const players: Player[] = [
      { id: 'host', name: myName || 'Tú', isBot: false, hand: hands[0], team: 0 as const },
      { id: 'bot-1', name: 'Bot CPU 1', isBot: true, hand: hands[1], team: 1 as const },
      { id: 'bot-2', name: 'Bot CPU 2 (Tu Pareja)', isBot: true, hand: hands[2], team: 0 as const },
      { id: 'bot-3', name: 'Bot CPU 3', isBot: true, hand: hands[3], team: 1 as const }
    ];

    const initialState: GameState = {
      players, board: [], currentTurn: 0, boneyard,
      leftEnd: null, rightEnd: null, scores: [0, 0],
      gameOver: false, winnerTeam: null, winnerIndex: null, log: ['Empieza la partida']
    };

    setGameState(initialState);
    broadcastState(initialState);
  };

  const broadcastState = (state: GameState) => {
    connections.forEach(conn => conn.send({ type: 'STATE_UPDATE', payload: state }));
  };

  const playTile = (tile: Tile, side: 'left' | 'right') => {
    if (!gameState || gameState.currentTurn !== myPlayerIndex) return;

    const canPlay = canPlayTile(tile, gameState.leftEnd, gameState.rightEnd);
    if ((side === 'left' && canPlay.left) || (side === 'right' && canPlay.right)) {
      playClick();

      const newPlayers = [...gameState.players];
      newPlayers[myPlayerIndex].hand = newPlayers[myPlayerIndex].hand.filter(t => t.id !== tile.id);

      let newBoard = [...gameState.board];
      if (side === 'left') newBoard.unshift(tile);
      else newBoard.push(tile);

      let nextTurn = (gameState.currentTurn + 1) % 4;
      let winner = newPlayers[myPlayerIndex].hand.length === 0 ? myPlayerIndex : null;

      let newScores = [...gameState.scores] as [number, number];
      let gameOver = false;
      let winnerTeam = null;

      if (winner !== null) {
        const result = calculateVenezuelanScore({ ...gameState, players: newPlayers }, winner);
        if (result.team >= 0) {
          newScores[result.team] += result.points;
          if (newScores[result.team] >= 100) {
            gameOver = true;
            winnerTeam = result.team;
          }
        }
      }

      const newState = {
        ...gameState, players: newPlayers, board: newBoard,
        currentTurn: nextTurn,
        leftEnd: newBoard[0].left, rightEnd: newBoard[newBoard.length - 1].right,
        scores: newScores, gameOver, winnerTeam
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
      playClick();
      const newPlayers = [...state.players];
      newPlayers[botIndex].hand = bot.hand.filter(t => t.id !== move.tile.id);
      let newBoard = [...state.board];
      if (move.side === 'left') newBoard.unshift(move.tile);
      else newBoard.push(move.tile);

      let nextTurn = (botIndex + 1) % 4;
      let winner = newPlayers[botIndex].hand.length === 0 ? botIndex : null;
      let newScores = [...state.scores] as [number, number];
      let gameOver = false;
      let winnerTeam = null;

      if (winner !== null) {
        const result = calculateVenezuelanScore({ ...state, players: newPlayers }, winner);
        if (result.team >= 0) {
          newScores[result.team] += result.points;
          if (newScores[result.team] >= 100) { gameOver = true; winnerTeam = result.team; }
        }
      }

      const newState = { ...state, players: newPlayers, board: newBoard, currentTurn: nextTurn, leftEnd: newBoard[0].left, rightEnd: newBoard[newBoard.length - 1].right, scores: newScores, gameOver, winnerTeam };
      setGameState(newState);
      broadcastState(newState);

      if (!gameOver && newPlayers[nextTurn].isBot) setTimeout(() => playBotMove(newState), 1500);
    } else {
      const newState = { ...state, currentTurn: (botIndex + 1) % 4 };
      setGameState(newState);
      broadcastState(newState);
      if (newState.players[newState.currentTurn].isBot) setTimeout(() => playBotMove(newState), 1500);
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
          {gameState.board.map((tile, idx) => (
            <TileComponent key={`${tile.id}-${idx}`} left={tile.left} right={tile.right} isHorizontal />
          ))}
        </div>
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
          const canPlay = canPlayTile(tile, gameState.leftEnd, gameState.rightEnd);
          const isPlayable = isMyTurn && (canPlay.left || canPlay.right);
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
                  {canPlay.left && <button onClick={() => playTile(tile, 'left')} className="bg-blue-500 text-white text-xs px-2 py-1">Izq</button>}
                  {canPlay.right && <button onClick={() => playTile(tile, 'right')} className="bg-blue-500 text-white text-xs px-2 py-1">Der</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
