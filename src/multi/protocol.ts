import { GameAction, GameState } from '@/engine/types';

export interface PlayerSlot {
  name: string;
  isBot: boolean;
  connected: boolean;
}

// Guest → Host
export interface JoinMessage {
  t: 'JOIN';
  name: string;
}

export interface ActionMessage {
  t: 'ACTION';
  action: GameAction;
}

export interface LeaveMessage {
  t: 'LEAVE';
}

// Host → Guest
export interface AssignMessage {
  t: 'ASSIGN';
  playerIndex: number;
  roster: PlayerSlot[];
}

export interface StateMessage {
  t: 'STATE';
  state: GameState;
}

export interface StartMessage {
  t: 'START';
}

export interface FullMessage {
  t: 'FULL';
}

export type HostMessage = AssignMessage | StateMessage | StartMessage | FullMessage;
export type GuestMessage = JoinMessage | ActionMessage | LeaveMessage;
