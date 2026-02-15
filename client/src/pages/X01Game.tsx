/**
 * X01 Game Page — Mobile-First
 *
 * Design: Precision Dark — optimized for phone screens.
 * - Human turn: shows ScoreInput keypad (fast number entry)
 * - AI turn: shows Dartboard in spectator mode with animated dart markers
 *
 * Undo system: stores a snapshot of the full game state before each dart.
 * Can undo one dart at a time, going back through previous turns indefinitely.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Undo2 } from 'lucide-react';
import PostGameStats from '@/components/PostGameStats';
import Dartboard, { DartMarker } from '@/components/Dartboard';
import ScoreInput from '@/components/ScoreInput';
import { DartSegment, MISS } from '@/lib/dartboard';
import {
  GameConfig,
  X01PlayerState,
  X01Turn,
  createInitialX01State,
} from '@/lib/game-types';
import { executeAiX01Turn, getCheckoutSuggestion } from '@/lib/ai-strategy';

// Victory image moved to PostGameStats component
const _VICTORY_IMG = 'https://private-us-east-1.manuscdn.com/sessionFile/tppsv2qntT8KQaqeNNRWhC/sandbox/dchVwPMByFmCuapungHC0j-img-3_1770986408000_na1fn_dmljdG9yeS1zY2VuZQ.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvdHBwc3YycW50VDhLUWFxZU5OUldoQy9zYW5kYm94L2RjaFZ3UE1CeUZtQ3VhcHVuZ0hDMGotaW1nLTNfMTc3MDk4NjQwODAwMF9uYTFmbl9kbWxqZEc5eWVTMXpZMlZ1WlEucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=tx0qcSVo85rWdAOfpE3K6n9suyjqaFQpgCf9TvwT5POs1hT-zLZdhCIkjgNWuTpk1OphQ0m3C304d6faLkzfe9KbDDcxx9Aso1xSPytV1Ry-9ypD9YsHcgaEMIjJd4689fFBz5MK76ZpOP7p9RiUx2eUUX8ue8MWoo43RrEdjsXMuoen6N2wcYIW6SOpJeUAb24obHfz0t7H6vx1dhvyM9b8e~v0RCv9Pw8Jgjb1UN7O8BGyPDULX4AwskS9F1xVwPS2rHsLzIhxQ0b6qbHMmkrKkaWVb3M6sWjTOwea3f-ySlWvDqqSjuwl2MCCrLgHMuOHCQYTBSPOAy9TS-hTFw__';

const AI_DART_DELAY = 1500;
const AI_RESULT_PAUSE = 2500;
const AI_START_DELAY = 600;

let markerIdCounter = 0;

// Snapshot of the full game state at any point in time
interface GameSnapshot {
  playerStates: [X01PlayerState, X01PlayerState];
  currentPlayer: 0 | 1;
  currentTurnDarts: DartSegment[];
  turnScore: number;
  isBust: boolean;
}

function deepCloneX01State(s: X01PlayerState): X01PlayerState {
  return {
    ...s,
    turnHistory: s.turnHistory.map(t => ({ ...t, darts: [...t.darts] })),
    stats: { ...s.stats },
  };
}

function cloneSnapshot(snap: GameSnapshot): GameSnapshot {
  return {
    playerStates: [deepCloneX01State(snap.playerStates[0]), deepCloneX01State(snap.playerStates[1])],
    currentPlayer: snap.currentPlayer,
    currentTurnDarts: [...snap.currentTurnDarts],
    turnScore: snap.turnScore,
    isBust: snap.isBust,
  };
}

export default function X01Game() {
  const [, setLocation] = useLocation();
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [playerStates, setPlayerStates] = useState<[X01PlayerState, X01PlayerState] | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<0 | 1>(0);
  const [currentTurnDarts, setCurrentTurnDarts] = useState<DartSegment[]>([]);
  const [turnScore, setTurnScore] = useState(0);
  const [isBust, setIsBust] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiMarkers, setAiMarkers] = useState<DartMarker[]>([]);
  const [aiTurnComplete, setAiTurnComplete] = useState(false);
  const [aiTurnResult, setAiTurnResult] = useState<{ darts: DartSegment[]; total: number; bust: boolean } | null>(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Undo history — stores a snapshot BEFORE each dart is thrown
  const [undoHistory, setUndoHistory] = useState<GameSnapshot[]>([]);

  // Track game start time for duration calculation
  const [gameStartTime] = useState(() => Date.now());

  useEffect(() => {
    const stored = sessionStorage.getItem('gameConfig');
    if (!stored) { setLocation('/'); return; }
    const cfg: GameConfig = JSON.parse(stored);
    if (cfg.mode !== 'x01') { setLocation('/'); return; }
    setConfig(cfg);
    setPlayerStates([
      createInitialX01State(cfg.x01StartScore || 501),
      createInitialX01State(cfg.x01StartScore || 501),
    ]);
  }, [setLocation]);

  // AI turn
  useEffect(() => {
    if (!config || !playerStates || isGameOver || aiThinking) return;
    const player = config.players[currentPlayer];
    if (!player.isComputer) return;

    setAiThinking(true);
    setAiMarkers([]);
    setAiTurnComplete(false);
    setAiTurnResult(null);

    aiTimeoutRef.current = setTimeout(() => {
      const state = playerStates[currentPlayer];
      const darts = executeAiX01Turn(state.remaining, player.difficulty || 5);

      let remaining = state.remaining;
      let bust = false;
      const validDarts: DartSegment[] = [];
      let totalScore = 0;

      for (const dart of darts) {
        const newRemaining = remaining - dart.score;
        if (config.doubleOut && newRemaining === 0 && dart.multiplier !== 2) {
          bust = true; validDarts.push(dart); break;
        }
        if (newRemaining < 0 || (config.doubleOut && newRemaining === 1)) {
          bust = true; validDarts.push(dart); break;
        }
        validDarts.push(dart);
        totalScore += dart.score;
        remaining = newRemaining;
        if (remaining === 0) break;
      }

      const markers: DartMarker[] = [];
      const timers: ReturnType<typeof setTimeout>[] = [];

      validDarts.forEach((dart, i) => {
        const t = setTimeout(() => {
          markers.push({ segment: dart, id: ++markerIdCounter });
          setAiMarkers([...markers]);
          setCurrentTurnDarts(validDarts.slice(0, i + 1));
          setTurnScore(bust && i === validDarts.length - 1 ? 0 : validDarts.slice(0, i + 1).reduce((s, d) => s + d.score, 0));
          if (bust && i === validDarts.length - 1) setIsBust(true);
        }, i * AI_DART_DELAY);
        timers.push(t);
      });

      const showResultTime = validDarts.length * AI_DART_DELAY + 300;
      const t2 = setTimeout(() => {
        setAiTurnComplete(true);
        setAiTurnResult({ darts: validDarts, total: bust ? 0 : totalScore, bust });
      }, showResultTime);
      timers.push(t2);

      const endTime = showResultTime + AI_RESULT_PAUSE;
      const t3 = setTimeout(() => {
        endTurn(validDarts, bust ? 0 : totalScore, bust, bust ? state.remaining : remaining);
        setAiThinking(false);
        setAiMarkers([]);
        setAiTurnComplete(false);
        setAiTurnResult(null);
      }, endTime);
      timers.push(t3);

      aiTimersRef.current = timers;
    }, AI_START_DELAY);

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
      aiTimersRef.current.forEach(t => clearTimeout(t));
    };
  }, [currentPlayer, config, playerStates, isGameOver]);

  const handleDartScore = useCallback((segment: DartSegment) => {
    if (!config || !playerStates || isGameOver || isBust) return;
    if (config.players[currentPlayer].isComputer) return;

    // Save snapshot BEFORE this dart
    const snapshot: GameSnapshot = {
      playerStates: [deepCloneX01State(playerStates[0]), deepCloneX01State(playerStates[1])],
      currentPlayer,
      currentTurnDarts: [...currentTurnDarts],
      turnScore,
      isBust: false,
    };
    setUndoHistory(prev => [...prev, snapshot]);

    const state = playerStates[currentPlayer];
    const currentRemaining = state.remaining - turnScore;
    const newRemaining = currentRemaining - segment.score;

    // Double-in check
    if (config.doubleIn && !state.hasStarted && segment.multiplier !== 2) {
      const newDarts = [...currentTurnDarts, MISS];
      setCurrentTurnDarts(newDarts);
      if (newDarts.length >= 3) endTurn(newDarts, turnScore, false, currentRemaining);
      return;
    }

    // Double-out bust check
    if (config.doubleOut && newRemaining === 0 && segment.multiplier !== 2) {
      const newDarts = [...currentTurnDarts, segment];
      setCurrentTurnDarts(newDarts); setIsBust(true);
      setTimeout(() => endTurn(newDarts, 0, true, state.remaining), 800);
      return;
    }

    // Over-score or 1-remaining bust
    if (newRemaining < 0 || (config.doubleOut && newRemaining === 1)) {
      const newDarts = [...currentTurnDarts, segment];
      setCurrentTurnDarts(newDarts); setIsBust(true);
      setTimeout(() => endTurn(newDarts, 0, true, state.remaining), 800);
      return;
    }

    const newTurnScore = turnScore + segment.score;
    const newDarts = [...currentTurnDarts, segment];
    setCurrentTurnDarts(newDarts);
    setTurnScore(newTurnScore);

    if (newRemaining === 0) {
      setTimeout(() => endTurn(newDarts, newTurnScore, false, 0), 400);
      return;
    }
    if (newDarts.length >= 3) {
      setTimeout(() => endTurn(newDarts, newTurnScore, false, newRemaining), 400);
    }
  }, [config, playerStates, currentPlayer, currentTurnDarts, turnScore, isGameOver, isBust]);

  const endTurn = (darts: DartSegment[], score: number, bust: boolean, remaining: number) => {
    if (!playerStates || !config) return;
    const newStates = [...playerStates] as [X01PlayerState, X01PlayerState];
    const state = { ...newStates[currentPlayer] };

    const turn: X01Turn = { darts, totalScore: bust ? 0 : score, isBust: bust, remaining: bust ? state.remaining : remaining };
    state.turnHistory = [...state.turnHistory, turn];
    state.dartsThrown += darts.length;
    state.rounds += 1;

    if (!bust) {
      state.remaining = remaining;
      state.hasStarted = true;
      state.stats.totalScore += score;
      if (score > state.stats.highestTurn) state.stats.highestTurn = score;
      if (score === 180) state.stats.oneEighties += 1;
      if (score >= 100) state.stats.tonPlus += 1;
    }
    state.stats.averagePerDart = state.dartsThrown > 0 ? state.stats.totalScore / state.dartsThrown : 0;
    state.stats.averagePerTurn = state.rounds > 0 ? state.stats.totalScore / state.rounds : 0;

    if (state.remaining <= 170 && !bust) {
      state.stats.checkoutAttempts += 1;
      if (remaining === 0) state.stats.checkoutHits += 1;
    }

    newStates[currentPlayer] = state;
    setPlayerStates(newStates);

    if (remaining === 0 && !bust) {
      setIsGameOver(true); setWinner(currentPlayer); return;
    }

    setCurrentPlayer(prev => (prev === 0 ? 1 : 0) as 0 | 1);
    setCurrentTurnDarts([]); setTurnScore(0); setIsBust(false);
  };

  // Undo — restores the snapshot from before the last dart
  const handleUndo = useCallback(() => {
    if (undoHistory.length === 0 || aiThinking) return;
    const prev = undoHistory[undoHistory.length - 1];
    const restored = cloneSnapshot(prev);
    setPlayerStates(restored.playerStates);
    setCurrentPlayer(restored.currentPlayer);
    setCurrentTurnDarts(restored.currentTurnDarts);
    setTurnScore(restored.turnScore);
    setIsBust(restored.isBust);
    setIsGameOver(false);
    setWinner(null);
    setUndoHistory(h => h.slice(0, -1));
  }, [undoHistory, aiThinking]);

  const handleRematch = () => {
    if (!config) return;
    setPlayerStates([createInitialX01State(config.x01StartScore || 501), createInitialX01State(config.x01StartScore || 501)]);
    setCurrentPlayer(0); setCurrentTurnDarts([]); setTurnScore(0); setIsBust(false);
    setIsGameOver(false); setWinner(null); setAiMarkers([]);
    setAiTurnComplete(false); setAiTurnResult(null); setUndoHistory([]);
  };

  const handleViewStats = (playerId: string) => {
    setLocation(`/stats/${playerId}`);
  };

  if (!config || !playerStates) return null;

  const isAiTurn = config.players[currentPlayer].isComputer;
  const isHumanTurn = !isAiTurn;
  const currentState = playerStates[currentPlayer];
  const currentRemaining = currentState.remaining - (isBust ? 0 : turnScore);
  const checkout = getCheckoutSuggestion(currentRemaining);
  const inputDisabled = isAiTurn || currentTurnDarts.length >= 3 || isBust;
  const canUndo = undoHistory.length > 0 && !aiThinking;

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]">
      {/* Quit confirmation dialog */}
      <AnimatePresence>
        {showQuitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-6"
            onClick={() => setShowQuitConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 shadow-2xl"
            >
              <h3 className="font-display font-bold text-lg text-foreground mb-2">Quit Game?</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Quitting will lose all progress in this game.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowQuitConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-display font-bold text-sm bg-card border border-border text-foreground active:bg-accent transition-colors"
                >
                  Return
                </button>
                <button
                  onClick={() => setLocation('/')}
                  className="flex-1 py-3 rounded-xl font-display font-bold text-sm bg-destructive text-white active:bg-destructive/90 transition-colors"
                >
                  Quit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with safe area padding */}
      <div className="flex items-center justify-between px-4 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] border-b border-border flex-shrink-0">
        <button onClick={() => isGameOver ? setLocation('/') : setShowQuitConfirm(true)} className="p-1.5 -ml-1.5 rounded-lg text-muted-foreground active:text-foreground active:bg-accent">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-display font-bold text-muted-foreground tracking-wide">
          {config.x01StartScore}{config.doubleOut ? ' • Double Out' : ''}
        </span>
        {canUndo ? (
          <button onClick={handleUndo} className="p-1.5 -mr-1.5 rounded-lg text-muted-foreground active:text-foreground active:bg-accent transition-colors">
            <Undo2 className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-[1fr_auto_1fr] flex-shrink-0 border-b border-border">
        {[0, 1].map(idx => {
          const state = playerStates[idx];
          const isActive = currentPlayer === idx && !isGameOver;
          const isWinner = winner === idx;
          // For active player, show checkout based on current remaining (after darts this turn)
          // For inactive player, show checkout based on their full remaining
          const effectiveRemaining = isActive ? state.remaining - turnScore : state.remaining;
          const checkoutPath = getCheckoutSuggestion(effectiveRemaining);
          return (
            <div key={idx} className={`relative py-3 px-3 text-center transition-colors duration-300 ${
              isActive ? (idx === 0 ? 'bg-neon/8' : 'bg-info/8') : ''
            }`}>
              {isActive && (
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${idx === 0 ? 'bg-neon' : 'bg-info'}`} />
              )}
              <div className={`text-[11px] font-display font-bold uppercase tracking-wider truncate mb-1 ${
                isActive ? (idx === 0 ? 'text-neon' : 'text-info') : 'text-muted-foreground'
              }`}>
                {config.players[idx].name}
              </div>
              <motion.div
                key={isActive ? effectiveRemaining : state.remaining}
                initial={{ scale: 1.08, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`font-display text-[2.5rem] font-bold leading-none ${
                  isWinner ? 'text-neon glow-green-text' : isActive ? 'text-foreground' : 'text-muted-foreground/60'
                }`}
              >
                {isWinner ? '✓' : isActive ? effectiveRemaining : state.remaining}
              </motion.div>
              <div className="text-[10px] text-muted-foreground/70 mt-1 font-display">
                Avg {state.stats.averagePerTurn.toFixed(1)}
              </div>
              {checkoutPath && !isGameOver && !isBust && (
                <div className="text-[9px] text-neon/80 font-display font-bold mt-0.5 truncate">
                  {checkoutPath}
                </div>
              )}
            </div>
          );
        })}
        {/* Center divider */}
        <div className="flex items-center justify-center order-2 col-start-2 row-start-1 px-1">
          <div className="w-px h-full bg-border" />
        </div>
      </div>

      {/* Turn info bar */}
      {!isGameOver && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0 bg-card/40">
          <div className="flex items-center gap-2">
            {/* Dart slots */}
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className={`min-w-[40px] h-8 rounded-lg flex items-center justify-center text-xs font-display font-bold px-1.5 transition-all duration-200 ${
                  i < currentTurnDarts.length
                    ? 'bg-neon/15 text-neon border border-neon/30'
                    : i === currentTurnDarts.length && !isBust
                    ? 'border-2 border-dashed border-neon/30 text-muted-foreground/40'
                    : 'bg-card/50 border border-border/50 text-muted-foreground/20'
                }`}>
                  {i < currentTurnDarts.length ? currentTurnDarts[i].label : ''}
                </div>
              ))}
            </div>
            <AnimatePresence>
              {isBust && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-display font-bold text-destructive glow-red-text"
                >
                  BUST!
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-2">
            {checkout && isHumanTurn && !isBust && currentTurnDarts.length === 0 && (
              <span className="text-[10px] text-neon/60 font-display font-bold hidden min-[340px]:inline truncate max-w-[100px]">{checkout}</span>
            )}
            <span className={`font-display font-bold text-xl tabular-nums w-12 text-right transition-colors ${
              isBust ? 'text-destructive' : turnScore > 0 ? 'text-neon' : 'text-foreground/40'
            }`}>
              {turnScore}
            </span>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden px-4 py-3 relative">
        {/* AI thinking indicator - overlaid on top */}
        <AnimatePresence>
          {aiThinking && !aiTurnComplete && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-0 left-0 right-0 z-10 px-4 py-2 text-xs text-neon/80 font-display font-bold bg-neon/10 backdrop-blur-sm text-center border-b border-neon/20"
            >
              <span className="animate-pulse">{config.players[currentPlayer].name} is throwing...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {isGameOver && winner !== null ? (
          <PostGameStats
            config={config}
            winner={winner}
            gameStartTime={gameStartTime}
            onRematch={handleRematch}
            onHome={() => setLocation('/')}
            onViewStats={handleViewStats}
            x01States={playerStates}
          />
        ) : isAiTurn ? (
          /* AI turn — show dartboard with animated markers + result overlay */
          <div className="w-full relative pt-8">
            <Dartboard spectatorMode markers={aiMarkers} />

            <AnimatePresence>
              {aiTurnComplete && aiTurnResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl px-6 py-5 text-center shadow-2xl shadow-black/40 min-w-[200px]">
                    <div className="text-[10px] font-display font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      {config.players[currentPlayer].name}
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      {aiTurnResult.darts.map((d, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-neon/10 border border-neon/20 text-neon font-display font-bold text-sm">
                          {d.label}
                        </span>
                      ))}
                    </div>
                    <div className={`font-display text-3xl font-bold ${
                      aiTurnResult.bust ? 'text-destructive' : 'text-neon glow-green-text'
                    }`}>
                      {aiTurnResult.bust ? 'BUST' : aiTurnResult.total}
                    </div>
                    {!aiTurnResult.bust && (
                      <div className="text-xs text-muted-foreground mt-1">points scored</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* Human turn — show keypad */
          <div className="w-full">
            <ScoreInput onScore={handleDartScore} disabled={inputDisabled} />
          </div>
        )}
      </div>

      {/* Bottom turn history */}
      {!isGameOver && playerStates[0].turnHistory.length + playerStates[1].turnHistory.length > 0 && (
        <div className="flex-shrink-0 border-t border-border px-4 py-2 bg-card/30">
          <div className="space-y-0.5 max-h-[48px] overflow-hidden">
            {[...playerStates[0].turnHistory.map((t, i) => ({ ...t, player: 0, round: i })),
              ...playerStates[1].turnHistory.map((t, i) => ({ ...t, player: 1, round: i }))]
              .sort((a, b) => b.round - a.round || b.player - a.player)
              .slice(0, 2)
              .map((turn, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <span className={`font-display font-bold w-16 truncate ${turn.player === 0 ? 'text-neon/70' : 'text-info/70'}`}>
                    {config.players[turn.player].name}
                  </span>
                  <span className="text-muted-foreground/60 flex-1 truncate font-mono text-[10px]">
                    {turn.darts.map(d => d.label).join('  ')}
                  </span>
                  <span className={`font-bold font-display tabular-nums ${turn.isBust ? 'text-destructive' : 'text-foreground/70'}`}>
                    {turn.isBust ? 'BUST' : turn.totalScore}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
