'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Peer, { DataConnection } from 'peerjs';
import { generateDeck, shuffleDeck, dealHands, GameState, Tile } from '@/engine/dominoEngine';
import { getBotMove } from '@/engine/aiBot';
import Scoreboard from '@/components/Scoreboard';

export default function Room() {
  const params = useParams();
  const roomId = params.id as string;

  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [isHost, setIsHost] = useState(false);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myName, setMyName] = useState('');

  useEffect(() => {
    const newPeer = new Peer(roomId);

    newPeer.on('open', (id) => {
      console.log('Conectado con ID:', id);
      setIsHost(id === roomId);
    });

    newPeer.on('connection', (conn) => {
      setConnections(prev => [...prev, conn]);
      conn.on('data', (data) => handleNetworkData(data, conn));
    });

    setPeer(newPeer);

    return () => { newPeer.destroy(); };
  }, [roomId]);

  const handleNetworkData = (data: any, conn?: DataConnection) => {
    if (data.type === 'STATE_UPDATE') {
      setGameState(data.payload);
    } else if (data.type === 'PLAYER_MOVE') {
      if (isHost) processMove(data.payload);
    }
  };

  const startGame = () => {
    const deck = shuffleDeck(generateDeck());
    const playerCount = connections.length + 1;
    const finalCount = playerCount < 4 ? 4 : playerCount;

    const { hands, boneyard } = dealHands(deck, finalCount);

    const players = [
      { id: 'host', name: myName || 'Tú', isBot: false, hand: hands[0], score: 0 },
      ...connections.map((conn, i) => ({ id: conn.peer, name: `Jugador ${i+2}`, isBot: false, hand: hands[i+1], score: 0 }))
    ];

    for (let i = players.length; i < finalCount; i++) {
      players.push({ id: `bot-${i}`, name: `Bot CPU ${i}`, isBot: true, hand: hands[i], score: 0 });
    }

    const initialState: GameState = {
      players,
      board: [],
      currentTurn: 0,
      boneyard,
      leftEnd: null,
      rightEnd: null,
      gameOver: false,
      winnerIndex: null
    };

    setGameState(initialState);
    broadcastState(initialState);
  };

  const broadcastState = (state: GameState) => {
    connections.forEach(conn => conn.send({ type: 'STATE_UPDATE', payload: state }));
  };

  const processMove = (move: { tileId: string, side: 'left' | 'right' }) => {
    if (!gameState) return;

    const player = gameState.players[gameState.currentTurn];
    const tile = player.hand.find(t => t.id === move.tileId);
    if (!tile) return;

    const newPlayers = [...gameState.players];
    newPlayers[gameState.currentTurn].hand = player.hand.filter(t => t.id !== move.tileId);

    let newBoard = [...gameState.board];
    if (move.side === 'left') newBoard.unshift(tile);
    else newBoard.push(tile);

    const newState = {
      ...gameState,
      players: newPlayers,
      board: newBoard,
      currentTurn: (gameState.currentTurn + 1) % gameState.players.length,
      leftEnd: newBoard[0].left,
      rightEnd: newBoard[newBoard.length - 1].right
    };

    setGameState(newState);
    broadcastState(newState);

    if (newState.players[newState.currentTurn].isBot) {
      setTimeout(() => playBotMove(newState), 1500);
    }
  };

  const playBotMove = (state: GameState) => {
    const bot = state.players[state.currentTurn];
    const move = getBotMove(bot.hand, state.leftEnd, state.rightEnd);
    if (move) {
      processMove({ tileId: move.tile.id, side: move.side });
    } else {
      processMove({ tileId: 'pass', side: 'left' });
    }
  };

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl text-gray-800">Sala de Espera: {roomId}</h1>
        <input
          type="text"
          placeholder="Tu nombre (ej. El Profe)"
          value={myName}
          onChange={(e) => setMyName(e.target.value)}
          className="p-2 text-base border-2 border-gray-800 bg-white"
        />
        <p>Comparte el enlace de esta página con tus amigos: {typeof window !== 'undefined' ? window.location.href : ''}</p>
        {isHost && (
          <button
            onClick={startGame}
            className="bg-green-700 text-white px-6 py-3 border-b-4 border-green-900 active:border-b-0 mt-4"
          >
            ¡Empezar Partida! (Bots rellenarán si faltan)
          </button>
        )}
        {!isHost && <p>Esperando a que el Host empiece...</p>}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 relative">
      <Scoreboard players={gameState.players.map(p => ({ name: p.name, score: p.score }))} />

      <div className="table-wood w-full h-[60vh] mt-12 p-8 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="flex flex-wrap justify-center gap-1 bg-black/20 p-2 rounded max-w-3xl">
          {gameState.board.map(tile => (
            <div key={tile.id} className="domino-tile">
              <div className="flex-1 flex items-center justify-center">{tile.left}</div>
              <div className="flex-1 flex items-center justify-center">{tile.right}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-black/50 p-4 flex justify-center gap-2 border-t-4 border-gray-800">
        {gameState.players[0].hand.map(tile => (
          <div key={tile.id} className="domino-tile cursor-pointer hover:-translate-y-2 transition-transform">
            <div className="flex-1 flex items-center justify-center">{tile.left}</div>
            <div className="flex-1 flex items-center justify-center">{tile.right}</div>
          </div>
        ))}
      </div>

      {gameState.gameOver && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
          <h1 className="text-4xl text-yellow-400 mb-4 animate-bounce">¡VICTORIA!</h1>
          <button className="bg-blue-600 text-white px-6 py-3 border-b-4 border-blue-800">Revancha</button>
        </div>
      )}
    </div>
  );
}
