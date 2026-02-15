/**
 * Game Setup Page — Mobile-First
 *
 * Design: Precision Dark — compact vertical layout for phone screens.
 * Integrates saved player profiles for stat tracking.
 * All controls are large and thumb-friendly. Scrollable if needed.
 */

import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, Monitor, ChevronRight, Crosshair, Zap, Plus, X, Check } from 'lucide-react';
import { GameConfig, GameMode } from '@/lib/game-types';
import { SavedPlayer, getPlayers, savePlayer } from '@/lib/storage';

export default function GameSetup() {
  const params = useParams<{ mode: string }>();
  const mode = (params.mode === 'cricket' ? 'cricket' : 'x01') as GameMode;
  const [, setLocation] = useLocation();

  const [savedPlayers, setSavedPlayers] = useState<SavedPlayer[]>([]);
  const [opponentType, setOpponentType] = useState<'human' | 'computer'>('computer');
  const [player1Id, setPlayer1Id] = useState<string | null>(null);
  const [player1Name, setPlayer1Name] = useState('Player 1');
  const [player2Id, setPlayer2Id] = useState<string | null>(null);
  const [player2Name, setPlayer2Name] = useState('Player 2');
  const [difficulty, setDifficulty] = useState(5);
  const [x01Score, setX01Score] = useState(501);
  const [doubleOut, setDoubleOut] = useState(true);
  const [doubleIn, setDoubleIn] = useState(false);
  const [showPlayerPicker, setShowPlayerPicker] = useState<1 | 2 | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');

  useEffect(() => {
    const players = getPlayers().filter(p => !p.isComputer);
    setSavedPlayers(players);
    // Auto-select first player if available
    if (players.length > 0) {
      setPlayer1Id(players[0].id);
      setPlayer1Name(players[0].name);
    }
    if (players.length > 1) {
      setPlayer2Id(players[1].id);
      setPlayer2Name(players[1].name);
    }
  }, []);

  const selectPlayer = (playerId: string, playerNum: 1 | 2) => {
    const player = savedPlayers.find(p => p.id === playerId);
    if (!player) return;
    if (playerNum === 1) {
      setPlayer1Id(player.id);
      setPlayer1Name(player.name);
    } else {
      setPlayer2Id(player.id);
      setPlayer2Name(player.name);
    }
    setShowPlayerPicker(null);
  };

  const createAndSelect = (playerNum: 1 | 2) => {
    if (!newPlayerName.trim()) return;
    const player = savePlayer({ name: newPlayerName.trim() });
    setSavedPlayers(prev => [...prev, player]);
    selectPlayer(player.id, playerNum);
    setNewPlayerName('');
  };

  const handleStart = () => {
    const config: GameConfig = {
      mode,
      players: [
        { name: player1Name, isComputer: false, playerId: player1Id || undefined },
        {
          name: opponentType === 'computer' ? `CPU (${difficultyLabels[difficulty]})` : player2Name,
          isComputer: opponentType === 'computer',
          difficulty: opponentType === 'computer' ? difficulty : undefined,
          playerId: opponentType === 'human' ? (player2Id || undefined) : undefined,
        },
      ],
      x01StartScore: x01Score,
      doubleIn,
      doubleOut,
    };
    sessionStorage.setItem('gameConfig', JSON.stringify(config));
    setLocation(mode === 'x01' ? '/x01' : '/cricket');
  };

  const difficultyLabels: Record<number, string> = {
    1: 'Beginner', 2: 'Novice', 3: 'Casual', 4: 'Intermediate', 5: 'Average',
    6: 'Skilled', 7: 'Advanced', 8: 'Expert', 9: 'Pro', 10: 'Legendary',
  };

  const isX01 = mode === 'x01';

  return (
    <div className="h-full bg-background flex flex-col pb-[env(safe-area-inset-bottom)]">
      {/* Top bar with safe area padding */}
      <div className="flex items-center gap-3 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] border-b border-border flex-shrink-0">
        <button onClick={() => setLocation('/')} className="p-1 -ml-1 text-muted-foreground active:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isX01 ? 'bg-neon/15' : 'bg-info/15'}`}>
            {isX01 ? <Crosshair className="w-3.5 h-3.5 text-neon" /> : <Zap className="w-3.5 h-3.5 text-info" />}
          </div>
          <span className="font-display font-bold text-foreground">{isX01 ? 'X01' : 'Cricket'} Setup</span>
        </div>
      </div>

      {/* Player picker modal */}
      <AnimatePresence>
        {showPlayerPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowPlayerPicker(null)}
          >
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-card border-t border-border rounded-t-3xl p-5 pb-8 max-h-[70vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-lg text-foreground">Select Player</h3>
                <button onClick={() => setShowPlayerPicker(null)} className="p-1 text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick create */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createAndSelect(showPlayerPicker)}
                  placeholder="New player name"
                  className="flex-1 px-3 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:border-neon/50 focus:outline-none"
                />
                <button
                  onClick={() => createAndSelect(showPlayerPicker)}
                  disabled={!newPlayerName.trim()}
                  className="px-4 py-2.5 rounded-xl bg-neon text-background font-display font-bold text-sm disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Player list */}
              <div className="flex-1 overflow-y-auto divide-y divide-border/50">
                {/* Guest option */}
                <button
                  onClick={() => {
                    if (showPlayerPicker === 1) { setPlayer1Id(null); setPlayer1Name('Player 1'); }
                    else { setPlayer2Id(null); setPlayer2Name('Player 2'); }
                    setShowPlayerPicker(null);
                  }}
                  className="w-full flex items-center gap-3 py-3 px-1 active:bg-accent/50 rounded-lg"
                >
                  <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-display text-muted-foreground">Play as Guest</span>
                </button>

                {savedPlayers.map(p => {
                  const isSelected = (showPlayerPicker === 1 && player1Id === p.id) || (showPlayerPicker === 2 && player2Id === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => selectPlayer(p.id, showPlayerPicker)}
                      className="w-full flex items-center gap-3 py-3 px-1 active:bg-accent/50 rounded-lg"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-neon/15 border border-neon/30' : 'bg-neon/10 border border-neon/20'
                      }`}>
                        <span className="font-display font-bold text-neon text-xs">{p.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-sm font-display font-bold text-foreground flex-1 text-left">{p.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-neon" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable content - flex-1 to fill available space */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* Opponent toggle */}
        <div>
          <label className="block text-xs font-display font-bold text-muted-foreground uppercase tracking-wider mb-2">Opponent</label>
          <div className="grid grid-cols-2 gap-2">
            {(['human', 'computer'] as const).map(type => (
              <button
                key={type}
                onClick={() => setOpponentType(type)}
                className={`flex items-center gap-2.5 p-3.5 rounded-xl border transition-colors ${
                  opponentType === type
                    ? 'border-neon/50 bg-neon/10'
                    : 'border-border bg-card active:bg-accent'
                }`}
              >
                {type === 'human'
                  ? <User className={`w-5 h-5 ${opponentType === type ? 'text-neon' : 'text-muted-foreground'}`} />
                  : <Monitor className={`w-5 h-5 ${opponentType === type ? 'text-neon' : 'text-muted-foreground'}`} />
                }
                <span className={`font-display font-bold text-sm ${opponentType === type ? 'text-foreground' : 'text-foreground'}`}>
                  {type === 'human' ? 'Human' : 'Computer'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Player 1 */}
        <div>
          <label className="block text-xs font-display font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Player 1</label>
          <button
            onClick={() => setShowPlayerPicker(1)}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-input border border-border active:bg-accent transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-neon/10 border border-neon/20 flex items-center justify-center">
              {player1Id ? (
                <span className="font-display font-bold text-neon text-xs">{player1Name.charAt(0).toUpperCase()}</span>
              ) : (
                <User className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <span className="text-sm text-foreground font-display flex-1 text-left">
              {player1Id ? player1Name : 'Guest (no stats)'}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Player 2 / Opponent */}
        {opponentType === 'human' && (
          <div>
            <label className="block text-xs font-display font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Player 2</label>
            <button
              onClick={() => setShowPlayerPicker(2)}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-input border border-border active:bg-accent transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-info/10 border border-info/20 flex items-center justify-center">
                {player2Id ? (
                  <span className="font-display font-bold text-info text-xs">{player2Name.charAt(0).toUpperCase()}</span>
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm text-foreground font-display flex-1 text-left">
                {player2Id ? player2Name : 'Guest (no stats)'}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* AI Difficulty */}
        {opponentType === 'computer' && (
          <div>
            <label className="block text-xs font-display font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Difficulty</label>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-baseline justify-between mb-3">
                <span className="font-display text-3xl font-bold text-neon">{difficulty}</span>
                <span className="text-sm text-muted-foreground font-display">{difficultyLabels[difficulty]}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={difficulty}
                onChange={e => setDifficulty(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-secondary cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neon [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:shadow-neon/30"
              />
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground font-display">
                <span>Wild</span>
                <span>Precise</span>
              </div>
            </div>
          </div>
        )}

        {/* X01 options */}
        {isX01 && (
          <>
            <div>
              <label className="block text-xs font-display font-bold text-muted-foreground uppercase tracking-wider mb-2">Starting Score</label>
              <div className="grid grid-cols-3 gap-2">
                {[301, 501, 701].map(score => (
                  <button
                    key={score}
                    onClick={() => setX01Score(score)}
                    className={`py-3 rounded-xl font-display font-bold text-base transition-colors ${
                      x01Score === score
                        ? 'bg-neon text-background'
                        : 'bg-card border border-border text-foreground active:bg-accent'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-display font-bold text-muted-foreground uppercase tracking-wider mb-1">Rules</label>
              {[
                { label: 'Double Out', desc: 'Must finish on a double', checked: doubleOut, onChange: setDoubleOut },
                { label: 'Double In', desc: 'Must start with a double', checked: doubleIn, onChange: setDoubleIn },
              ].map(rule => (
                <label key={rule.label} className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border active:bg-accent">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    rule.checked ? 'bg-neon border-neon' : 'border-muted-foreground'
                  }`}>
                    {rule.checked && (
                      <svg viewBox="0 0 12 12" className="w-3 h-3 text-background">
                        <path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <input type="checkbox" checked={rule.checked} onChange={e => rule.onChange(e.target.checked)} className="sr-only" />
                  <div>
                    <div className="text-sm font-medium text-foreground">{rule.label}</div>
                    <div className="text-xs text-muted-foreground">{rule.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </>
        )}

        {/* Start button - moved inside content area */}
      </div>

      {/* Sticky Start button at bottom - fixed position */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-background border-t border-border">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleStart}
          className="w-full py-4 rounded-2xl font-display font-bold text-lg bg-neon text-background active:bg-neon/90 flex items-center justify-center gap-2"
        >
          Start Game
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Spacer to prevent content from being hidden behind fixed button */}
      <div className="flex-shrink-0 h-[calc(5rem+env(safe-area-inset-bottom))]" />
    </div>
  );
}
