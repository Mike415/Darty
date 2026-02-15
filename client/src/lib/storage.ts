/**
 * Storage Layer — localStorage persistence for players and game history.
 * 
 * Stores:
 * - SavedPlayer profiles with unique IDs
 * - GameRecord entries for every completed game
 * - All data keyed under 'dart-counter-*' in localStorage
 */

import { nanoid } from 'nanoid';

// ─── Player Profiles ───────────────────────────────────────────────

export interface SavedPlayer {
  id: string;
  name: string;
  createdAt: string; // ISO date
  isComputer?: boolean;
  difficulty?: number;
}

const PLAYERS_KEY = 'dart-counter-players';

export function getPlayers(): SavedPlayer[] {
  try {
    const raw = localStorage.getItem(PLAYERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function savePlayer(player: Omit<SavedPlayer, 'id' | 'createdAt'>): SavedPlayer {
  const players = getPlayers();
  const newPlayer: SavedPlayer = {
    ...player,
    id: nanoid(8),
    createdAt: new Date().toISOString(),
  };
  players.push(newPlayer);
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
  return newPlayer;
}

export function updatePlayer(id: string, updates: Partial<Pick<SavedPlayer, 'name'>>): void {
  const players = getPlayers();
  const idx = players.findIndex(p => p.id === id);
  if (idx >= 0) {
    players[idx] = { ...players[idx], ...updates };
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
  }
}

export function deletePlayer(id: string): void {
  const players = getPlayers().filter(p => p.id !== id);
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
}

export function getPlayerById(id: string): SavedPlayer | undefined {
  return getPlayers().find(p => p.id === id);
}

// ─── Game Records ──────────────────────────────────────────────────

export interface X01GameStats {
  startScore: number;
  finalRemaining: number;
  dartsThrown: number;
  rounds: number;
  totalScore: number;
  averagePerDart: number;
  averagePerTurn: number;
  highestTurn: number;
  oneEighties: number;
  tonPlus: number;
  checkoutAttempts: number;
  checkoutHits: number;
  doubleOut: boolean;
  doubleIn: boolean;
}

export interface CricketGameStats {
  dartsThrown: number;
  rounds: number;
  totalMarks: number;
  totalPoints: number;
  averageMarksPerRound: number;
  numbersClosedFirst: number; // how many of the 7 numbers this player closed first
}

export interface GameRecordPlayer {
  playerId: string; // references SavedPlayer.id, or 'cpu-X' for computer
  name: string;
  isComputer: boolean;
  difficulty?: number;
  won: boolean;
  x01Stats?: X01GameStats;
  cricketStats?: CricketGameStats;
}

export interface GameRecord {
  id: string;
  mode: 'x01' | 'cricket';
  playedAt: string; // ISO date
  durationSeconds: number;
  players: [GameRecordPlayer, GameRecordPlayer];
  winnerId: string;
}

const GAMES_KEY = 'dart-counter-games';

export function getGameRecords(): GameRecord[] {
  try {
    const raw = localStorage.getItem(GAMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveGameRecord(record: Omit<GameRecord, 'id'>): GameRecord {
  const records = getGameRecords();
  const newRecord: GameRecord = { ...record, id: nanoid(10) };
  records.push(newRecord);
  localStorage.setItem(GAMES_KEY, JSON.stringify(records));
  return newRecord;
}

export function getPlayerGameRecords(playerId: string): GameRecord[] {
  return getGameRecords().filter(g => g.players.some(p => p.playerId === playerId));
}

// ─── Stats Aggregation ─────────────────────────────────────────────

export interface DateRange {
  start: Date;
  end: Date;
}

export function filterByDateRange(records: GameRecord[], range?: DateRange): GameRecord[] {
  if (!range) return records;
  return records.filter(r => {
    const d = new Date(r.playedAt);
    return d >= range.start && d <= range.end;
  });
}

export function getDateRangePreset(preset: 'today' | 'week' | 'month' | 'year'): DateRange {
  const now = new Date();
  const start = new Date(now);
  switch (preset) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      break;
  }
  return { start, end: now };
}

export interface AggregatedX01Stats {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  totalDartsThrown: number;
  averagePerDart: number;
  averagePerTurn: number;
  bestAvgPerTurn: number;
  highestTurn: number;
  total180s: number;
  totalTonPlus: number;
  totalCheckoutAttempts: number;
  totalCheckoutHits: number;
  checkoutRate: number;
  bestGame: { dartsThrown: number; avgPerTurn: number } | null;
}

export interface AggregatedCricketStats {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  totalDartsThrown: number;
  totalMarks: number;
  totalPoints: number;
  averageMarksPerRound: number;
  bestMarksPerRound: number;
  averagePointsPerGame: number;
}

export interface AggregatedPlayerStats {
  playerId: string;
  playerName: string;
  totalGames: number;
  totalWins: number;
  overallWinRate: number;
  x01: AggregatedX01Stats;
  cricket: AggregatedCricketStats;
}

export function aggregatePlayerStats(playerId: string, records: GameRecord[]): AggregatedPlayerStats {
  const playerRecords = records.filter(g => g.players.some(p => p.playerId === playerId));
  const player = getPlayerById(playerId);
  const playerName = player?.name || 'Unknown';

  // X01 stats
  const x01Records = playerRecords.filter(g => g.mode === 'x01');
  const x01PlayerEntries = x01Records.map(g => g.players.find(p => p.playerId === playerId)!).filter(Boolean);
  const x01Won = x01PlayerEntries.filter(p => p.won).length;

  let totalX01Darts = 0, totalX01Score = 0, bestAvg = 0, highestTurn = 0;
  let total180s = 0, totalTonPlus = 0, totalCheckAttempts = 0, totalCheckHits = 0;
  let bestGame: { dartsThrown: number; avgPerTurn: number } | null = null;

  for (const entry of x01PlayerEntries) {
    const s = entry.x01Stats;
    if (!s) continue;
    totalX01Darts += s.dartsThrown;
    totalX01Score += s.totalScore;
    if (s.averagePerTurn > bestAvg) bestAvg = s.averagePerTurn;
    if (s.highestTurn > highestTurn) highestTurn = s.highestTurn;
    total180s += s.oneEighties;
    totalTonPlus += s.tonPlus;
    totalCheckAttempts += s.checkoutAttempts;
    totalCheckHits += s.checkoutHits;
    if (entry.won && (!bestGame || s.dartsThrown < bestGame.dartsThrown)) {
      bestGame = { dartsThrown: s.dartsThrown, avgPerTurn: s.averagePerTurn };
    }
  }

  // Cricket stats
  const cricketRecords = playerRecords.filter(g => g.mode === 'cricket');
  const cricketPlayerEntries = cricketRecords.map(g => g.players.find(p => p.playerId === playerId)!).filter(Boolean);
  const cricketWon = cricketPlayerEntries.filter(p => p.won).length;

  let totalCricketDarts = 0, totalMarks = 0, totalCricketPoints = 0;
  let bestMPR = 0;

  for (const entry of cricketPlayerEntries) {
    const s = entry.cricketStats;
    if (!s) continue;
    totalCricketDarts += s.dartsThrown;
    totalMarks += s.totalMarks;
    totalCricketPoints += s.totalPoints;
    if (s.averageMarksPerRound > bestMPR) bestMPR = s.averageMarksPerRound;
  }

  const totalGames = playerRecords.length;
  const totalWins = x01Won + cricketWon;

  return {
    playerId,
    playerName,
    totalGames,
    totalWins,
    overallWinRate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
    x01: {
      gamesPlayed: x01Records.length,
      gamesWon: x01Won,
      winRate: x01Records.length > 0 ? (x01Won / x01Records.length) * 100 : 0,
      totalDartsThrown: totalX01Darts,
      averagePerDart: totalX01Darts > 0 ? totalX01Score / totalX01Darts : 0,
      averagePerTurn: totalX01Darts > 0 ? (totalX01Score / totalX01Darts) * 3 : 0,
      bestAvgPerTurn: bestAvg,
      highestTurn,
      total180s,
      totalTonPlus,
      totalCheckoutAttempts: totalCheckAttempts,
      totalCheckoutHits: totalCheckHits,
      checkoutRate: totalCheckAttempts > 0 ? (totalCheckHits / totalCheckAttempts) * 100 : 0,
      bestGame,
    },
    cricket: {
      gamesPlayed: cricketRecords.length,
      gamesWon: cricketWon,
      winRate: cricketRecords.length > 0 ? (cricketWon / cricketRecords.length) * 100 : 0,
      totalDartsThrown: totalCricketDarts,
      totalMarks,
      totalPoints: totalCricketPoints,
      averageMarksPerRound: totalCricketDarts > 0 ? totalMarks / (totalCricketDarts / 3) : 0,
      bestMarksPerRound: bestMPR,
      averagePointsPerGame: cricketRecords.length > 0 ? totalCricketPoints / cricketRecords.length : 0,
    },
  };
}
