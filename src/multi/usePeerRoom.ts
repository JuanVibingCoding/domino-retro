import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { GameState, GameAction, Player } from '@/engine/types';
import { generateDeck, shuffleDeck, dealHands, findSixDoubleOwner } from '@/engine/dominoEngine';
import { reduceState } from '@/engine/reducer';
import { getBotMove } from '@/engine/aiBot';
import { HostMessage, GuestMessage, PlayerSlot, JoinMessage, ActionMessage } from './protocol';

interface UsePeerRoomReturn {
  isHost: boolean;
  isReady: boolean;
  gameState: GameState | null;
  lobby: PlayerSlot[];
  playerIndex: number;
  roomId: string;
  sendAction: (action: GameAction) => void;
  startGame: () => void;
  connected: boolean;
}

export function usePeerRoom(roomId: string, myName: string): UsePeerRoomReturn {
  const [isHost, setIsHost] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lobby, setLobby] = useState<PlayerSlot[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const connsRef = useRef<Map<number, DataConnection>>(new Map());
  const lobbyRef = useRef<PlayerSlot[]>([]);

  const broadcastState = useCallback((state: GameState) => {
    setGameState(state);
    connsRef.current.forEach(conn => {
      if (conn.open) {
        conn.send({ t: 'STATE', state } as HostMessage);
      }
    });
  }, []);

  const handleBotTurn = useCallback(() => {
    setGameState(prev => {
      if (!prev || prev.gameOver || prev.phase !== 'playing') return prev;
      const current = prev.players[prev.currentTurn];
      if (!current?.isBot) return prev;

      const isFirstMove = prev.board.length === 0 && prev.roundStarter === prev.currentTurn;
      const mustPlayDouble = isFirstMove && prev.roundNumber === 1;
      const move = getBotMove(current.hand, prev.leftEnd, prev.rightEnd, {
        isFirstMoveOfRound: mustPlayDouble,
      });

      const action: GameAction = move
        ? { type: 'PLAY', playerIndex: prev.currentTurn, tile: move.tile, side: move.side }
        : { type: 'PASS', playerIndex: prev.currentTurn };

      const newState = reduceState(prev, action);
      broadcastState(newState);
      return newState;
    });
  }, [broadcastState]);

  const handleRoundOver = useCallback(() => {
    setGameState(prev => {
      if (!prev || prev.phase !== 'roundOver') return prev;
      const nextStarter = (prev.roundStarter + 1) % prev.players.length;
      const deck = shuffleDeck(generateDeck());
      const { hands } = dealHands(deck, prev.players.length);
      const newState = reduceState(prev, { type: 'NEXT_ROUND', nextStarter, hands });
      broadcastState(newState);
      return newState;
    });
  }, [broadcastState]);

  useEffect(() => {
    if (!isHost || !gameState || gameState.phase !== 'playing' || gameState.gameOver) return;
    const current = gameState.players[gameState.currentTurn];
    if (!current?.isBot) return;

    const timeout = setTimeout(handleBotTurn, 900 + Math.random() * 600);
    return () => clearTimeout(timeout);
  }, [gameState, isHost, handleBotTurn]);

  useEffect(() => {
    if (!isHost || !gameState || gameState.phase !== 'roundOver') return;
    const timeout = setTimeout(handleRoundOver, 2500);
    return () => clearTimeout(timeout);
  }, [gameState, isHost, handleRoundOver]);

  useEffect(() => {
    let destroyed = false;

    const tryHost = () => {
      const peer = new Peer(roomId);
      peerRef.current = peer;

      peer.on('open', () => {
        if (destroyed) return;
        setIsHost(true);
        setConnected(true);
        setIsReady(true);
        setLobby([{ name: myName, isBot: false, connected: true }]);
        lobbyRef.current = [{ name: myName, isBot: false, connected: true }];

        peer.on('connection', (conn) => {
          conn.on('data', (data) => {
            const msg = data as GuestMessage;
            if (msg.t === 'JOIN') {
              setLobby(prev => {
                const newLobby = [...prev];
                const slotIndex = newLobby.findIndex(s => s.isBot);
                if (slotIndex !== -1) {
                  newLobby[slotIndex] = { name: msg.name, isBot: false, connected: true };
                } else if (newLobby.length < 4) {
                  newLobby.push({ name: msg.name, isBot: false, connected: true });
                }
                lobbyRef.current = newLobby;
                return newLobby;
              });
              const newIdx = lobbyRef.current.filter(s => !s.isBot).length - 1;
              connsRef.current.set(newIdx, conn);
              conn.send({ t: 'ASSIGN', playerIndex: newIdx, roster: lobbyRef.current } as HostMessage);
            } else if (msg.t === 'ACTION') {
              setGameState(prev => {
                if (!prev) return prev;
                if (msg.action.type === 'PLAY' || msg.action.type === 'PASS') {
                  const newState = reduceState(prev, msg.action);
                  broadcastState(newState);
                  return newState;
                }
                return prev;
              });
            }
          });

          conn.on('close', () => {
            connsRef.current.forEach((c, idx) => {
              if (c === conn) connsRef.current.delete(idx);
            });
          });
        });
      });

      peer.on('error', () => {
        if (destroyed) return;
        peer.destroy();
        tryGuest();
      });
    };

    const tryGuest = () => {
      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', () => {
        if (destroyed) return;
        const conn = peer.connect(roomId, { reliable: true });
        connRef.current = conn;

        conn.on('open', () => {
          if (destroyed) return;
          setConnected(true);
          setIsReady(true);
          conn.send({ t: 'JOIN', name: myName } as JoinMessage);
        });

        conn.on('data', (data) => {
          const msg = data as HostMessage;
          if (msg.t === 'ASSIGN') {
            setPlayerIndex(msg.playerIndex);
            setLobby(msg.roster);
          } else if (msg.t === 'STATE') {
            setGameState(msg.state);
          }
        });

        conn.on('close', () => setConnected(false));
      });

      peer.on('error', () => setConnected(false));
    };

    const conns = connsRef.current;

    tryHost();

    return () => {
      destroyed = true;
      conns.forEach(conn => conn.close());
      conns.clear();
      connRef.current?.close();
      peerRef.current?.destroy();
    };
  }, [roomId, myName, broadcastState]);

  const sendAction = useCallback((action: GameAction) => {
    if (isHost) {
      setGameState(prev => {
        if (!prev) return prev;
        if (action.type === 'PLAY' || action.type === 'PASS') {
          const newState = reduceState(prev, action);
          broadcastState(newState);
          return newState;
        }
        return prev;
      });
    } else {
      const conn = connRef.current;
      if (conn?.open) {
        conn.send({ t: 'ACTION', action } as ActionMessage);
      }
    }
  }, [isHost, broadcastState]);

  const startGame = useCallback(() => {
    if (!isHost) return;

    const deck = shuffleDeck(generateDeck());
    const { hands } = dealHands(deck, 4);

    const realPlayers = lobby.filter(s => !s.isBot);
    const botCount = 4 - realPlayers.length;

    const playerList = [
      ...realPlayers.map(s => ({ name: s.name, isBot: false })),
      ...Array.from({ length: botCount }, (_, i) => ({ name: `CPU ${i + 1}`, isBot: true })),
    ];

    const teams: (0 | 1)[] = [0, 1, 0, 1];
    const players: Player[] = playerList.map((p, i) => ({
      id: p.isBot ? `bot-${i}` : `player-${i}`,
      name: p.name,
      isBot: p.isBot,
      hand: hands[i],
      team: teams[i],
      passed: false,
    }));

    const sixSixOwner = findSixDoubleOwner(players);
    const firstStarter = sixSixOwner !== -1 ? sixSixOwner : 0;

    const initialState: GameState = {
      players,
      board: [],
      currentTurn: firstStarter,
      leftEnd: null,
      rightEnd: null,
      scores: [0, 0],
      gameOver: false,
      winnerTeam: null,
      log: ['¡Partida iniciada! Buscando el 6-6...'],
      phase: 'dealing',
      lastPlayerToPlay: null,
      roundStarter: firstStarter,
      roundNumber: 1,
      goalScore: 100,
    };

    broadcastState(initialState);

    setTimeout(() => {
      const playingState: GameState = {
        ...initialState,
        phase: 'playing',
        log: [`${players[firstStarter].name} tiene la cochina (6-6). ¡Empieza!`],
      };
      broadcastState(playingState);
    }, 1500);
  }, [isHost, lobby, broadcastState]);

  return {
    isHost,
    isReady,
    gameState,
    lobby,
    playerIndex,
    roomId,
    sendAction,
    startGame,
    connected,
  };
}
