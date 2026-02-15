/**
 * Game Types & Shared State Definitions
 */

import { DartSegment } from './dartboard';

export type GameMode = 'x01' | 'cricket';
export type OpponentType = 'human' | 'computer';

export interface Player {
  name: string;
  isComputer: boolean;
  difficulty?: number; // 1-10 for computer players
  playerId?: string; // references SavedPlayer.id for stat tracking
}

export interface GameConfig {
  mode: GameMode;
  players: [Player, Player];
  x01StartScore?: number; // 301, 501, 701, etc.
  doubleIn?: boolean;
  doubleOut?: boolean;
}

// X01 specific state
export interface X01PlayerState {
  remaining: number;
  dartsThrown: number;
  rounds: number;
  hasStarted: boolean; // For double-in rule
  turnHistory: X01Turn[];
  stats: {
    totalScore: number;
    highestTurn: number;
    averagePerDart: number;
    averagePerTurn: number;
    checkoutAttempts: number;
    checkoutHits: number;
    oneEighties: number;
    tonPlus: number; // 100+
  };
}

export interface X01Turn {
  darts: DartSegment[];
  totalScore: number;
  isBust: boolean;
  remaining: number;
}

// Cricket specific state
export interface CricketPlayerState {
  marks: Record<number, number>; // number -> mark count (0-3+)
  points: number;
  dartsThrown: number;
  rounds: number;
  turnHistory: CricketTurn[];
}

export interface CricketTurn {
  darts: DartSegment[];
  marksScored: number;
  pointsScored: number;
}

export interface GameState {
  config: GameConfig;
  currentPlayerIndex: 0 | 1;
  currentDartInTurn: number; // 0, 1, 2
  currentTurnDarts: DartSegment[];
  isGameOver: boolean;
  winner: number | null; // 0 or 1
  x01State?: [X01PlayerState, X01PlayerState];
  cricketState?: [CricketPlayerState, CricketPlayerState];
}

export const CRICKET_NUMBERS = [20, 19, 18, 17, 16, 15, 25];

export function createInitialX01State(startScore: number): X01PlayerState {
  return {
    remaining: startScore,
    dartsThrown: 0,
    rounds: 0,
    hasStarted: false,
    turnHistory: [],
    stats: {
      totalScore: 0,
      highestTurn: 0,
      averagePerDart: 0,
      averagePerTurn: 0,
      checkoutAttempts: 0,
      checkoutHits: 0,
      oneEighties: 0,
      tonPlus: 0,
    },
  };
}

export function createInitialCricketState(): CricketPlayerState {
  const marks: Record<number, number> = {};
  CRICKET_NUMBERS.forEach(n => marks[n] = 0);
  return {
    marks,
    points: 0,
    dartsThrown: 0,
    rounds: 0,
    turnHistory: [],
  };
}
