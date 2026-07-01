import {
  GameState, GameAction, Tile,
  generateDeck, shuffleDeck, canPlayTile, getOrientedTile,
  getNextTurn, resolveRound, isTrancado, findSixDoubleOwner,
} from './dominoEngine';

export function reduceState(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const { players, hands, starterIndex } = action;
      const newPlayers = players.map((p, i) => ({
        ...p,
        hand: hands[i],
        passed: false,
      }));
      return {
        ...state,
        players: newPlayers,
        board: [],
        currentTurn: starterIndex,
        leftEnd: null,
        rightEnd: null,
        scores: [0, 0],
        gameOver: false,
        winnerTeam: null,
        log: ['¡Partida iniciada! Buscando el 6-6...'],
        phase: 'dealing',
        lastPlayerToPlay: null,
        roundStarter: starterIndex,
        roundNumber: 1,
      };
    }

    case 'DEAL': {
      const { hands } = action;
      const newPlayers = state.players.map((p, i) => ({
        ...p,
        hand: hands[i],
        passed: false,
      }));
      return {
        ...state,
        players: newPlayers,
        board: [],
        leftEnd: null,
        rightEnd: null,
        phase: 'playing',
        log: [...state.log, 'Nueva mano — repartiendo fichas...'],
      };
    }

    case 'PLAY': {
      const { playerIndex, tile, side } = action;
      const player = state.players[playerIndex];
      const validTile = player.hand.find(t => t.id === tile.id);
      if (!validTile) return state;

      const canPlay = canPlayTile(validTile, state.leftEnd, state.rightEnd);
      if (!((side === 'left' && canPlay.left) || (side === 'right' && canPlay.right))) return state;

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

      const nextTurn = getNextTurn(playerIndex, state.players.length);
      const log = [...state.log, `${player.name} jugó [${validTile.left}|${validTile.right}]`];

      const newState: GameState = {
        ...state,
        players: newPlayers,
        board: newBoard,
        currentTurn: nextTurn,
        leftEnd: newBoard[0].tile.left,
        rightEnd: newBoard[newBoard.length - 1].tile.right,
        log,
        lastPlayerToPlay: playerIndex,
      };

      if (newPlayers[playerIndex].hand.length === 0) {
        log.push(`¡${player.name} se fue!`);
        return resolveRoundState({ ...newState, log }, playerIndex);
      }

      if (isTrancado(newPlayers, newState.leftEnd, newState.rightEnd)) {
        log.push('¡Trancado! Nadie puede jugar.');
        return resolveRoundState({ ...newState, log }, null);
      }

      return newState;
    }

    case 'PASS': {
      const { playerIndex } = action;
      const player = state.players[playerIndex];
      const newPlayers = state.players.map((p, i) =>
        i === playerIndex ? { ...p, passed: true } : p
      );
      const nextTurn = getNextTurn(playerIndex, state.players.length);
      const log = [...state.log, `${player.name} pasó.`];

      if (isTrancado(newPlayers, state.leftEnd, state.rightEnd)) {
        log.push('¡Trancado! Nadie puede jugar.');
        return resolveRoundState({ ...state, players: newPlayers, log }, null);
      }

      return {
        ...state,
        players: newPlayers,
        currentTurn: nextTurn,
        log,
      };
    }

    case 'NEXT_ROUND': {
      const { nextStarter, hands } = action;
      const newPlayers = state.players.map((p, i) => ({
        ...p,
        hand: hands[i],
        passed: false,
      }));
      return {
        ...state,
        players: newPlayers,
        board: [],
        currentTurn: nextStarter,
        leftEnd: null,
        rightEnd: null,
        phase: 'playing',
        log: [`Nueva mano — turno de ${state.players[nextStarter].name}`],
        lastPlayerToPlay: null,
        roundStarter: nextStarter,
        roundNumber: state.roundNumber + 1,
      };
    }

    case 'REMATCH': {
      const deck = shuffleDeck(generateDeck());
      const { hands } = deal(deck, state.players.length);
      const starter = findSixDoubleOwner(state.players);
      const firstStarter = starter !== -1 ? starter : (state.roundStarter + 1) % state.players.length;
      const newPlayers = state.players.map((p, i) => ({
        ...p,
        hand: hands[i],
        passed: false,
      }));
      return {
        ...state,
        players: newPlayers,
        board: [],
        currentTurn: firstStarter,
        leftEnd: null,
        rightEnd: null,
        scores: [0, 0],
        gameOver: false,
        winnerTeam: null,
        log: ['¡Revancha! Buscando el 6-6...'],
        phase: 'dealing',
        lastPlayerToPlay: null,
        roundStarter: firstStarter,
        roundNumber: 1,
      };
    }

    default:
      return state;
  }
}

function resolveRoundState(state: GameState, winnerPlayerIndex: number | null): GameState {
  const result = resolveRound(state.players, winnerPlayerIndex, state.lastPlayerToPlay);
  const newScores: [number, number] = [...state.scores];
  newScores[result.winnerTeam] += result.points;

  const isZapato = result.winnerTeam === 0 ? newScores[1] === 0 : newScores[0] === 0;
  const reachedGoal = newScores[result.winnerTeam] >= state.goalScore;

  const newLog = [...state.log];
  newLog.push(`${result.winnerTeam === 0 ? 'Nosotros' : 'Ellos'} ganaron la ronda — ${result.points} pts.`);

  if (isZapato) {
    newLog.push(`¡ZAPATO! ${result.winnerTeam === 0 ? 'Nosotros' : 'Ellos'} barrieron la mesa.`);
  }

  if (reachedGoal) {
    return {
      ...state,
      scores: newScores,
      log: newLog,
      gameOver: true,
      winnerTeam: result.winnerTeam,
      phase: 'gameOver',
    };
  }

  return {
    ...state,
    scores: newScores,
    log: newLog,
    phase: 'roundOver',
  };
}

function deal(deck: Tile[], playerCount: number): { hands: Tile[][] } {
  const hands: Tile[][] = [];
  const remaining = [...deck];
  for (let i = 0; i < playerCount; i++) {
    hands.push(remaining.splice(0, 7));
  }
  return { hands };
}
