/**
 * PostGameStats — shown after game ends, before rematch/home.
 *
 * Design: Precision Dark — detailed comparison of both players' performance.
 * X01: avg/turn, highest turn, 180s, 100+, checkout rate, darts thrown
 * Cricket: avg marks/round, total marks, total points, darts thrown, rounds
 */

import { motion } from 'framer-motion';
import { Trophy, RotateCcw, Home, BarChart3 } from 'lucide-react';
import { X01PlayerState, CricketPlayerState, GameConfig, CRICKET_NUMBERS } from '@/lib/game-types';
import { saveGameRecord, getPlayers, X01GameStats, CricketGameStats, GameRecordPlayer } from '@/lib/storage';
import { useEffect, useRef } from 'react';

const VICTORY_IMG = 'https://private-us-east-1.manuscdn.com/sessionFile/tppsv2qntT8KQaqeNNRWhC/sandbox/dchVwPMByFmCuapungHC0j-img-3_1770986408000_na1fn_dmljdG9yeS1zY2VuZQ.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvdHBwc3YycW50VDhLUWFxZU5OUldoQy9zYW5kYm94L2RjaFZ3UE1CeUZtQ3VhcHVuZ0hDMGotaW1nLTNfMTc3MDk4NjQwODAwMF9uYTFmbl9kbWxqZEc5eWVTMXpZMlZ1WlEucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=tx0qcSVo85rWdAOfpE3K6n9suyjqaFQpgCf9TvwT5POs1hT-zLZdhCIkjgNWuTpk1OphQ0m3C304d6faLkzfe9KbDDcxx9Aso1xSPytV1Ry-9ypD9YsHcgaEMIjJd4689fFBz5MK76ZpOP7p9RiUx2eUUX8ue8MWoo43RrEdjsXMuoen6N2wcYIW6SOpJeUAb24obHfz0t7H6vx1dhvyM9b8e~v0RCv9Pw8Jgjb1UN7O8BGyPDULX4AwskS9F1xVwPS2rHsLzIhxQ0b6qbHMmkrKkaWVb3M6sWjTOwea3f-ySlWvDqqSjuwl2MCCrLgHMuOHCQYTBSPOAy9TS-hTFw__';

interface StatRow {
  label: string;
  values: [string, string];
  highlight?: 0 | 1 | null; // which player has the better value
}

interface PostGameStatsProps {
  config: GameConfig;
  winner: number;
  gameStartTime: number; // timestamp ms
  onRematch: () => void;
  onHome: () => void;
  onViewStats?: (playerId: string) => void;
  // X01 specific
  x01States?: [X01PlayerState, X01PlayerState];
  // Cricket specific
  cricketStates?: [CricketPlayerState, CricketPlayerState];
}

export default function PostGameStats({
  config,
  winner,
  gameStartTime,
  onRematch,
  onHome,
  onViewStats,
  x01States,
  cricketStates,
}: PostGameStatsProps) {
  const savedRef = useRef(false);

  // Save game record on mount
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;

    const duration = Math.round((Date.now() - gameStartTime) / 1000);
    const allPlayers = getPlayers();

    // Find or create player IDs
    const getPlayerId = (idx: number): string => {
      const p = config.players[idx];
      if (p.isComputer) return `cpu-${p.difficulty || 5}`;
      // Use playerId from config if available (set during GameSetup)
      if (p.playerId) return p.playerId;
      // Fallback: try to match by name
      const saved = allPlayers.find(sp => sp.name.toLowerCase() === p.name.toLowerCase() && !sp.isComputer);
      return saved?.id || `guest-${p.name}`;
    };

    const buildX01Stats = (state: X01PlayerState): X01GameStats => ({
      startScore: config.x01StartScore || 501,
      finalRemaining: state.remaining,
      dartsThrown: state.dartsThrown,
      rounds: state.rounds,
      totalScore: state.stats.totalScore,
      averagePerDart: state.stats.averagePerDart,
      averagePerTurn: state.stats.averagePerTurn,
      highestTurn: state.stats.highestTurn,
      oneEighties: state.stats.oneEighties,
      tonPlus: state.stats.tonPlus,
      checkoutAttempts: state.stats.checkoutAttempts,
      checkoutHits: state.stats.checkoutHits,
      doubleOut: config.doubleOut || false,
      doubleIn: config.doubleIn || false,
    });

    const buildCricketStats = (state: CricketPlayerState): CricketGameStats => {
      const totalMarks = CRICKET_NUMBERS.reduce((sum, n) => sum + Math.min(state.marks[n], 3), 0);
      const rounds = state.rounds || 1;
      return {
        dartsThrown: state.dartsThrown,
        rounds: state.rounds,
        totalMarks,
        totalPoints: state.points,
        averageMarksPerRound: totalMarks / rounds,
        numbersClosedFirst: 0, // could be computed if tracked
      };
    };

    const players: [GameRecordPlayer, GameRecordPlayer] = [0, 1].map(idx => ({
      playerId: getPlayerId(idx),
      name: config.players[idx].name,
      isComputer: config.players[idx].isComputer,
      difficulty: config.players[idx].difficulty,
      won: winner === idx,
      x01Stats: x01States ? buildX01Stats(x01States[idx]) : undefined,
      cricketStats: cricketStates ? buildCricketStats(cricketStates[idx]) : undefined,
    })) as [GameRecordPlayer, GameRecordPlayer];

    saveGameRecord({
      mode: config.mode,
      playedAt: new Date().toISOString(),
      durationSeconds: duration,
      players,
      winnerId: getPlayerId(winner),
    });
  }, [config, winner, gameStartTime, x01States, cricketStates]);

  // Build stat rows
  const statRows: StatRow[] = [];

  if (x01States) {
    const [p1, p2] = x01States;
    const rows: Array<{ label: string; v1: number; v2: number; format?: (n: number) => string; higherBetter?: boolean }> = [
      { label: 'Avg / Turn', v1: p1.stats.averagePerTurn, v2: p2.stats.averagePerTurn, format: n => n.toFixed(1), higherBetter: true },
      { label: 'Avg / Dart', v1: p1.stats.averagePerDart, v2: p2.stats.averagePerDart, format: n => n.toFixed(1), higherBetter: true },
      { label: 'Highest Turn', v1: p1.stats.highestTurn, v2: p2.stats.highestTurn, higherBetter: true },
      { label: '180s', v1: p1.stats.oneEighties, v2: p2.stats.oneEighties, higherBetter: true },
      { label: '100+', v1: p1.stats.tonPlus, v2: p2.stats.tonPlus, higherBetter: true },
      { label: 'Checkout', v1: p1.stats.checkoutHits, v2: p2.stats.checkoutHits, higherBetter: true },
      { label: 'Darts Thrown', v1: p1.dartsThrown, v2: p2.dartsThrown, higherBetter: false },
      { label: 'Rounds', v1: p1.rounds, v2: p2.rounds, higherBetter: false },
    ];

    for (const row of rows) {
      const fmt = row.format || ((n: number) => String(n));
      statRows.push({
        label: row.label,
        values: [
          row.label === 'Checkout' ? `${p1.stats.checkoutHits}/${p1.stats.checkoutAttempts}` : fmt(row.v1),
          row.label === 'Checkout' ? `${p2.stats.checkoutHits}/${p2.stats.checkoutAttempts}` : fmt(row.v2),
        ],
        highlight: row.v1 === row.v2 ? null : (row.higherBetter ? (row.v1 > row.v2 ? 0 : 1) : (row.v1 < row.v2 ? 0 : 1)),
      });
    }
  }

  if (cricketStates) {
    const [p1, p2] = cricketStates;
    const p1Marks = CRICKET_NUMBERS.reduce((s, n) => s + Math.min(p1.marks[n], 3), 0);
    const p2Marks = CRICKET_NUMBERS.reduce((s, n) => s + Math.min(p2.marks[n], 3), 0);
    const p1MPR = p1.rounds > 0 ? p1Marks / p1.rounds : 0;
    const p2MPR = p2.rounds > 0 ? p2Marks / p2.rounds : 0;

    statRows.push(
      { label: 'Marks / Round', values: [p1MPR.toFixed(2), p2MPR.toFixed(2)], highlight: p1MPR === p2MPR ? null : (p1MPR > p2MPR ? 0 : 1) },
      { label: 'Total Marks', values: [String(p1Marks), String(p2Marks)], highlight: p1Marks === p2Marks ? null : (p1Marks > p2Marks ? 0 : 1) },
      { label: 'Points', values: [String(p1.points), String(p2.points)], highlight: p1.points === p2.points ? null : (p1.points > p2.points ? 0 : 1) },
      { label: 'Darts Thrown', values: [String(p1.dartsThrown), String(p2.dartsThrown)], highlight: p1.dartsThrown === p2.dartsThrown ? null : (p1.dartsThrown < p2.dartsThrown ? 0 : 1) },
      { label: 'Rounds', values: [String(p1.rounds), String(p2.rounds)], highlight: p1.rounds === p2.rounds ? null : (p1.rounds < p2.rounds ? 0 : 1) },
    );
  }

  // Find saved player IDs for "View Stats" buttons
  const allPlayers = getPlayers();
  const savedPlayerIds = config.players.map(p => {
    if (p.isComputer) return null;
    if (p.playerId) return p.playerId;
    const saved = allPlayers.find(sp => sp.name.toLowerCase() === p.name.toLowerCase() && !sp.isComputer);
    return saved?.id || null;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full h-full flex flex-col">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-4 pt-2">
        {/* Victory banner */}
        <div className="relative w-full h-24 rounded-2xl overflow-hidden mb-4 flex-shrink-0">
          <img src={VICTORY_IMG} alt="Victory" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <Trophy className="w-6 h-6 text-warning mx-auto mb-1 drop-shadow-lg" />
            <h2 className="font-display text-xl font-bold text-foreground">{config.players[winner].name} Wins!</h2>
          </div>
        </div>

        {/* Stats table */}
        <div className="rounded-2xl border border-border overflow-hidden mb-4">
          {/* Player names header */}
          <div className="grid grid-cols-[1fr_auto_1fr] bg-card/60 border-b border-border">
            <div className={`py-2.5 px-3 text-center ${winner === 0 ? 'bg-neon/8' : ''}`}>
              <span className={`text-xs font-display font-bold truncate ${winner === 0 ? 'text-neon' : 'text-foreground'}`}>
                {config.players[0].name}
              </span>
            </div>
            <div className="flex items-center px-1"><div className="w-px h-full bg-border" /></div>
            <div className={`py-2.5 px-3 text-center ${winner === 1 ? 'bg-neon/8' : ''}`}>
              <span className={`text-xs font-display font-bold truncate ${winner === 1 ? 'text-neon' : 'text-foreground'}`}>
                {config.players[1].name}
              </span>
            </div>
          </div>

          {/* Stat rows */}
          {statRows.map((row, i) => (
            <div key={i} className={`grid grid-cols-[1fr_auto_1fr] ${i % 2 === 0 ? 'bg-card/30' : ''} ${i < statRows.length - 1 ? 'border-b border-border/50' : ''}`}>
              <div className="py-2 px-3 text-center">
                <span className={`text-sm font-display font-bold tabular-nums ${
                  row.highlight === 0 ? 'text-neon' : 'text-foreground/70'
                }`}>
                  {row.values[0]}
                </span>
              </div>
              <div className="flex items-center justify-center px-2 min-w-[80px]">
                <span className="text-[10px] font-display font-bold text-muted-foreground uppercase tracking-wider text-center leading-tight">
                  {row.label}
                </span>
              </div>
              <div className="py-2 px-3 text-center">
                <span className={`text-sm font-display font-bold tabular-nums ${
                  row.highlight === 1 ? 'text-neon' : 'text-foreground/70'
                }`}>
                  {row.values[1]}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* View stats buttons */}
        {savedPlayerIds.some(id => id !== null) && (
          <div className="flex gap-2 mb-4">
            {savedPlayerIds.map((id, idx) => id && onViewStats ? (
              <button
                key={idx}
                onClick={() => onViewStats(id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-card border border-border text-muted-foreground font-display font-bold text-xs active:bg-accent transition-colors"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                {config.players[idx].name} Stats
              </button>
            ) : null)}
          </div>
        )}
      </div>

      {/* Fixed action buttons at bottom */}
      <div className="flex-shrink-0 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-background border-t border-border">
        <div className="flex gap-3">
          <button
            onClick={onHome}
            className="flex-1 py-3.5 rounded-xl bg-card border border-border text-foreground font-display font-bold text-sm active:bg-accent transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Home
          </button>
          <button
            onClick={onRematch}
            className="flex-1 py-3.5 rounded-xl bg-neon text-background font-display font-bold text-sm active:bg-neon/90 flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Rematch
          </button>
        </div>
      </div>
    </motion.div>
  );
}
