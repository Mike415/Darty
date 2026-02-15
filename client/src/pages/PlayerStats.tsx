/**
 * Player Stats Page — Mobile-First
 *
 * Design: Precision Dark — detailed stats for a single player.
 * Filter by time period: Today, Week, Month, Year, All Time, or Custom range.
 * Shows X01 and Cricket stats in separate tabs.
 */

import { useState, useEffect, useMemo } from 'react';
import { useLocation, useParams } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowLeft, Target, Crosshair, Calendar, Trophy, Flame, Zap } from 'lucide-react';
import {
  getPlayerById,
  getPlayerGameRecords,
  filterByDateRange,
  getDateRangePreset,
  aggregatePlayerStats,
  DateRange,
  GameRecord,
  SavedPlayer,
} from '@/lib/storage';

type TimePreset = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-3 border ${accent ? 'bg-neon/5 border-neon/20' : 'bg-card border-border'}`}>
      <div className="text-[10px] font-display font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className={`font-display text-xl font-bold leading-none ${accent ? 'text-neon' : 'text-foreground'}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</div>}
    </div>
  );
}

function EmptyState({ mode }: { mode: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
        {mode === 'x01' ? <Target className="w-7 h-7 text-muted-foreground/30" /> : <Crosshair className="w-7 h-7 text-muted-foreground/30" />}
      </div>
      <p className="text-sm text-muted-foreground font-display">No {mode === 'x01' ? 'X01' : 'Cricket'} games in this period</p>
      <p className="text-xs text-muted-foreground/50 mt-1">Play some games to see stats here</p>
    </div>
  );
}

export default function PlayerStats() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const playerId = params.id || '';

  const [player, setPlayer] = useState<SavedPlayer | null>(null);
  const [allRecords, setAllRecords] = useState<GameRecord[]>([]);
  const [timePreset, setTimePreset] = useState<TimePreset>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'x01' | 'cricket'>('overview');

  useEffect(() => {
    const p = getPlayerById(playerId);
    if (!p) { setLocation('/players'); return; }
    setPlayer(p);
    setAllRecords(getPlayerGameRecords(playerId));
  }, [playerId, setLocation]);

  const dateRange: DateRange | undefined = useMemo(() => {
    if (timePreset === 'all') return undefined;
    if (timePreset === 'custom') {
      if (!customStart || !customEnd) return undefined;
      return { start: new Date(customStart + 'T00:00:00'), end: new Date(customEnd + 'T23:59:59') };
    }
    return getDateRangePreset(timePreset);
  }, [timePreset, customStart, customEnd]);

  const filteredRecords = useMemo(() => filterByDateRange(allRecords, dateRange), [allRecords, dateRange]);
  const stats = useMemo(() => aggregatePlayerStats(playerId, filteredRecords), [playerId, filteredRecords]);

  if (!player) return null;

  const presets: { key: TimePreset; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
    { key: 'all', label: 'All' },
    { key: 'custom', label: 'Custom' },
  ];

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header with safe area padding */}
      <div className="flex items-center gap-3 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] border-b border-border flex-shrink-0">
        <button onClick={() => setLocation('/players')} className="p-1.5 -ml-1.5 rounded-lg text-muted-foreground active:text-foreground active:bg-accent">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-neon/10 border border-neon/20 flex items-center justify-center flex-shrink-0">
            <span className="font-display font-bold text-neon text-xs">{player.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-foreground text-sm truncate">{player.name}</div>
            <div className="text-[10px] text-muted-foreground/60">{stats.totalGames} games played</div>
          </div>
        </div>
      </div>

      {/* Time filter */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {presets.map(p => (
            <button
              key={p.key}
              onClick={() => setTimePreset(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold whitespace-nowrap transition-colors ${
                timePreset === p.key
                  ? 'bg-neon text-background'
                  : 'bg-card border border-border text-muted-foreground active:bg-accent'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {timePreset === 'custom' && (
          <div className="flex gap-2 mt-2">
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-input border border-border text-foreground text-xs focus:border-neon/50 focus:outline-none"
            />
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-input border border-border text-foreground text-xs focus:border-neon/50 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border flex-shrink-0">
        {(['overview', 'x01', 'cricket'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-display font-bold uppercase tracking-wider transition-colors relative ${
              activeTab === tab ? 'text-neon' : 'text-muted-foreground active:text-foreground'
            }`}
          >
            {tab === 'overview' ? 'Overview' : tab === 'x01' ? 'X01' : 'Cricket'}
            {activeTab === tab && (
              <motion.div layoutId="statsTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Games" value={stats.totalGames} accent />
              <StatCard label="Wins" value={stats.totalWins} />
              <StatCard label="Win %" value={stats.totalGames > 0 ? `${stats.overallWinRate.toFixed(0)}%` : '—'} />
            </div>

            {/* Recent games */}
            <div>
              <h3 className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider mb-2">Recent Games</h3>
              {filteredRecords.length === 0 ? (
                <p className="text-xs text-muted-foreground/50 py-4 text-center">No games in this period</p>
              ) : (
                <div className="space-y-1.5">
                  {filteredRecords
                    .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
                    .slice(0, 10)
                    .map(game => {
                      const playerEntry = game.players.find(p => p.playerId === playerId)!;
                      const opponent = game.players.find(p => p.playerId !== playerId)!;
                      const won = playerEntry.won;
                      return (
                        <div key={game.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            won ? 'bg-neon/10' : 'bg-destructive/10'
                          }`}>
                            {won ? <Trophy className="w-4 h-4 text-neon" /> : <span className="text-destructive text-xs font-bold">L</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-display font-bold text-foreground">{game.mode.toUpperCase()}</span>
                              <span className="text-[10px] text-muted-foreground">vs {opponent.name}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground/50">
                              {new Date(game.playedAt).toLocaleDateString()} • {new Date(game.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div className="text-right">
                            {game.mode === 'x01' && playerEntry.x01Stats && (
                              <div className="text-xs font-display font-bold text-foreground">{playerEntry.x01Stats.averagePerTurn.toFixed(1)} avg</div>
                            )}
                            {game.mode === 'cricket' && playerEntry.cricketStats && (
                              <div className="text-xs font-display font-bold text-foreground">{playerEntry.cricketStats.averageMarksPerRound.toFixed(2)} MPR</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'x01' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {stats.x01.gamesPlayed === 0 ? (
              <EmptyState mode="x01" />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="Games" value={stats.x01.gamesPlayed} />
                  <StatCard label="Win Rate" value={`${stats.x01.winRate.toFixed(0)}%`} accent />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="Avg / Turn" value={stats.x01.averagePerTurn.toFixed(1)} accent sub="3-dart average" />
                  <StatCard label="Best Avg" value={stats.x01.bestAvgPerTurn.toFixed(1)} sub="Single game best" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <StatCard label="Highest" value={stats.x01.highestTurn} />
                  <StatCard label="180s" value={stats.x01.total180s} accent />
                  <StatCard label="100+" value={stats.x01.totalTonPlus} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="Checkout %" value={stats.x01.totalCheckoutAttempts > 0 ? `${stats.x01.checkoutRate.toFixed(0)}%` : '—'} sub={`${stats.x01.totalCheckoutHits}/${stats.x01.totalCheckoutAttempts}`} />
                  <StatCard label="Total Darts" value={stats.x01.totalDartsThrown.toLocaleString()} />
                </div>
                {stats.x01.bestGame && (
                  <div className="rounded-xl p-3.5 bg-neon/5 border border-neon/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Flame className="w-4 h-4 text-neon" />
                      <span className="text-xs font-display font-bold text-neon uppercase tracking-wider">Best Win</span>
                    </div>
                    <div className="text-sm text-foreground font-display">
                      {stats.x01.bestGame.dartsThrown} darts • {stats.x01.bestGame.avgPerTurn.toFixed(1)} avg/turn
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'cricket' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {stats.cricket.gamesPlayed === 0 ? (
              <EmptyState mode="cricket" />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="Games" value={stats.cricket.gamesPlayed} />
                  <StatCard label="Win Rate" value={`${stats.cricket.winRate.toFixed(0)}%`} accent />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="Avg MPR" value={stats.cricket.averageMarksPerRound.toFixed(2)} accent sub="Marks per round" />
                  <StatCard label="Best MPR" value={stats.cricket.bestMarksPerRound.toFixed(2)} sub="Single game best" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="Total Marks" value={stats.cricket.totalMarks.toLocaleString()} />
                  <StatCard label="Avg Pts/Game" value={stats.cricket.averagePointsPerGame.toFixed(0)} />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <StatCard label="Total Darts" value={stats.cricket.totalDartsThrown.toLocaleString()} />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
