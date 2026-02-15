/**
 * Cricket Game Page — Mobile-First
 *
 * Design: Precision Dark — optimized for phone screens.
 * Uses unified CricketGrid that merges marks display + score input.
 * Score panels stay above. Marks on the outside, input in the middle.
 *
 * Undo system: stores a snapshot of the full game state before each dart.
 * Can undo one dart at a time, going back through previous turns indefinitely.
 *
 * - Human turn: CricketGrid with shared tappable input
 * - AI turn: Dartboard in spectator mode with animated dart markers
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Undo2 } from 'lucide-react';
import PostGameStats from '@/components/PostGameStats';
import Dartboard, { DartMarker } from '@/components/Dartboard';
import CricketGrid from '@/components/CricketGrid';
import { DartSegment, MISS } from '@/lib/dartboard';
import {
  GameConfig,
  CricketPlayerState,
  createInitialCricketState,
  CRICKET_NUMBERS,
} from '@/lib/game-types';
import { executeAiCricketTurn, CricketState } from '@/lib/ai-strategy';

const _VICTORY_IMG = 'https://private-us-east-1.manuscdn.com/sessionFile/tppsv2qntT8KQaqeNNRWhC/sandbox/dchVwPMByFmCuapungHC0j-img-3_1770986408000_na1fn_dmljdG9yeS1zY2VuZQ.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvdHBwc3YycW50VDhLUWFxZU5OUldoQy9zYW5kYm94L2RjaFZ3UE1CeUZtQ3VhcHVuZ0hDMGotaW1nLTNfMTc3MDk4NjQwODAwMF9uYTFmbl9kbWxqZEc5eWVTMXpZMlZ1WlEucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=tx0qcSVo85rWdAOfpE3K6n9suyjqaFQpgCf9TvwT5POs1hT-zLZdhCIkjgNWuTpk1OphQ0m3C304d6faLkzfe9KbDDcxx9Aso1xSPytV1Ry-9ypD9YsHcgaEMIjJd4689fFBz5MK76ZpOP7p9RiUx2eUUX8ue8MWoo43RrEdjsXMuoen6N2wcYIW6SOpJeUAb24obHfz0t7H6vx1dhvyM9b8e~v0RCv9Pw8Jgjb1UN7O8BGyPDULX4AwskS9F1xVwPS2rHsLzIhxQ0b6qbHMmkrKkaWVb3M6sWjTOwea3f-ySlWvDqqSjuwl2MCCrLgHMuOHCQYTBSPOAy9TS-hTFw__';

const AI_DART_DELAY = 1500;
const AI_RESULT_PAUSE = 2500;
const AI_START_DELAY = 600;

let markerIdCounter = 1000;

// Snapshot of the full cricket game state at any point in time
interface CricketSnapshot {
  playerStates: [CricketPlayerState, CricketPlayerState];
  currentPlayer: 0 | 1;
  currentTurnDarts: DartSegment[];
  turnMarks: number;
  turnPoints: number;
}

function deepCloneCricketState(s: CricketPlayerState): CricketPlayerState {
  return {
    ...s,
    marks: { ...s.marks },
    turnHistory: s.turnHistory.map(t => ({ ...t, darts: [...t.darts] })),
  };
}

function cloneSnapshot(snap: CricketSnapshot): CricketSnapshot {
  return {
    playerStates: [deepCloneCricketState(snap.playerStates[0]), deepCloneCricketState(snap.playerStates[1])],
    currentPlayer: snap.currentPlayer,
    currentTurnDarts: [...snap.currentTurnDarts],
    turnMarks: snap.turnMarks,
    turnPoints: snap.turnPoints,
  };
}

export default function CricketGame() {
  const [, setLocation] = useLocation();
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [playerStates, setPlayerStates] = useState<[CricketPlayerState, CricketPlayerState] | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<0 | 1>(0);
  const [currentTurnDarts, setCurrentTurnDarts] = useState<DartSegment[]>([]);
  const [turnMarks, setTurnMarks] = useState(0);
  const [turnPoints, setTurnPoints] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiMarkers, setAiMarkers] = useState<DartMarker[]>([]);
  const [aiTurnComplete, setAiTurnComplete] = useState(false);
  const [aiTurnResult, setAiTurnResult] = useState<{ darts: DartSegment[]; marks: number; points: number } | null>(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Undo history — stores a snapshot BEFORE each dart is thrown
  const [undoHistory, setUndoHistory] = useState<CricketSnapshot[]>([]);

  // Track game start time for duration calculation
  const [gameStartTime] = useState(() => Date.now());

  useEffect(() => {
    const stored = sessionStorage.getItem('gameConfig');
    if (!stored) { setLocation('/'); return; }
    const cfg: GameConfig = JSON.parse(stored);
    if (cfg.mode !== 'cricket') { setLocation('/'); return; }
    setConfig(cfg);
    setPlayerStates([createInitialCricketState(), createInitialCricketState()]);
  }, [setLocation]);

  const checkWin = useCallback((states: [CricketPlayerState, CricketPlayerState]): number | null => {
    for (let p = 0; p < 2; p++) {
      const allClosed = CRICKET_NUMBERS.every(n => states[p].marks[n] >= 3);
      if (allClosed && states[p].points >= states[1 - p].points) return p;
    }
    return null;
  }, []);

  const processCricketDart = useCallback((
    segment: DartSegment,
    states: [CricketPlayerState, CricketPlayerState],
    playerIdx: number
  ) => {
    const newStates = [
      { ...states[0], marks: { ...states[0].marks } },
      { ...states[1], marks: { ...states[1].marks } },
    ] as [CricketPlayerState, CricketPlayerState];

    const hitNumber = segment.number === 25 ? 25 : segment.number;
    let marksAdded = 0;
    let pointsAdded = 0;

    if (!CRICKET_NUMBERS.includes(hitNumber)) return { newStates, marksAdded: 0, pointsAdded: 0 };

    const opponentMarks = newStates[1 - playerIdx].marks[hitNumber];
    const hitsToApply = segment.multiplier;

    for (let i = 0; i < hitsToApply; i++) {
      const myMarks = newStates[playerIdx].marks[hitNumber];
      if (myMarks < 3) {
        newStates[playerIdx].marks[hitNumber] = myMarks + 1;
        marksAdded++;
      } else if (opponentMarks < 3) {
        const pointValue = hitNumber === 25 ? 25 : hitNumber;
        newStates[playerIdx].points += pointValue;
        pointsAdded += pointValue;
      }
    }

    return { newStates, marksAdded, pointsAdded };
  }, []);

  const endTurn = useCallback((darts: DartSegment[], marks: number, points: number, states: [CricketPlayerState, CricketPlayerState], player: 0 | 1) => {
    const newStates = [...states] as [CricketPlayerState, CricketPlayerState];
    const state = { ...newStates[player] };
    state.turnHistory = [...state.turnHistory, { darts, marksScored: marks, pointsScored: points }];
    state.dartsThrown += darts.length;
    state.rounds += 1;
    state.marks = { ...states[player].marks };
    state.points = states[player].points;
    newStates[player] = state;
    setPlayerStates(newStates);

    const winResult = checkWin(newStates);
    if (winResult !== null) { setIsGameOver(true); setWinner(winResult); return; }

    setCurrentPlayer(prev => (prev === 0 ? 1 : 0) as 0 | 1);
    setCurrentTurnDarts([]); setTurnMarks(0); setTurnPoints(0);
  }, [checkWin]);

  // AI turn
  useEffect(() => {
    if (!config || !playerStates || isGameOver || aiThinking) return;
    const player = config.players[currentPlayer];
    if (!player.isComputer) return;

    setAiThinking(true);
    setAiMarkers([]);
    setAiTurnComplete(false);
    setAiTurnResult(null);

    const cp = currentPlayer;

    aiTimeoutRef.current = setTimeout(() => {
      const aiState: CricketState = {
        playerMarks: { ...playerStates[cp].marks },
        opponentMarks: { ...playerStates[1 - cp].marks },
        playerPoints: playerStates[cp].points,
        opponentPoints: playerStates[1 - cp].points,
      };
      const darts = executeAiCricketTurn(aiState, player.difficulty || 5);

      let currentStates = playerStates;
      let totalMarks = 0, totalPoints = 0;
      const dartResults: Array<{ dart: DartSegment; marksAdded: number; pointsAdded: number }> = [];
      for (const dart of darts) {
        const result = processCricketDart(dart, currentStates, cp);
        currentStates = result.newStates;
        totalMarks += result.marksAdded;
        totalPoints += result.pointsAdded;
        dartResults.push({ dart, marksAdded: result.marksAdded, pointsAdded: result.pointsAdded });
      }

      const markers: DartMarker[] = [];
      const timers: ReturnType<typeof setTimeout>[] = [];

      darts.forEach((dart, i) => {
        const t = setTimeout(() => {
          markers.push({ segment: dart, id: ++markerIdCounter });
          setAiMarkers([...markers]);
          setCurrentTurnDarts(darts.slice(0, i + 1));
          const mSoFar = dartResults.slice(0, i + 1).reduce((s, r) => s + r.marksAdded, 0);
          const pSoFar = dartResults.slice(0, i + 1).reduce((s, r) => s + r.pointsAdded, 0);
          setTurnMarks(mSoFar);
          setTurnPoints(pSoFar);
        }, i * AI_DART_DELAY);
        timers.push(t);
      });

      const showResultTime = darts.length * AI_DART_DELAY + 300;
      const t2 = setTimeout(() => {
        setAiTurnComplete(true);
        setAiTurnResult({ darts, marks: totalMarks, points: totalPoints });
      }, showResultTime);
      timers.push(t2);

      const endTime = showResultTime + AI_RESULT_PAUSE;
      const t3 = setTimeout(() => {
        endTurn(darts, totalMarks, totalPoints, currentStates, cp);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, config, playerStates, isGameOver]);

  const handleDartScore = useCallback((segment: DartSegment) => {
    if (!config || !playerStates || isGameOver) return;
    if (config.players[currentPlayer].isComputer) return;

    // Save snapshot BEFORE this dart
    const snapshot: CricketSnapshot = {
      playerStates: [deepCloneCricketState(playerStates[0]), deepCloneCricketState(playerStates[1])],
      currentPlayer,
      currentTurnDarts: [...currentTurnDarts],
      turnMarks,
      turnPoints,
    };
    setUndoHistory(prev => [...prev, snapshot]);

    const result = processCricketDart(segment, playerStates, currentPlayer);
    const newDarts = [...currentTurnDarts, segment];
    const newMarks = turnMarks + result.marksAdded;
    const newPoints = turnPoints + result.pointsAdded;

    setCurrentTurnDarts(newDarts);
    setTurnMarks(newMarks);
    setTurnPoints(newPoints);
    setPlayerStates(result.newStates);

    const winResult = checkWin(result.newStates);
    if (winResult !== null) {
      // Record the winning player's final turn stats before ending the game
      const finalStates = [...result.newStates] as [CricketPlayerState, CricketPlayerState];
      const winnerState = { ...finalStates[currentPlayer] };
      winnerState.turnHistory = [...winnerState.turnHistory, { darts: newDarts, marksScored: newMarks, pointsScored: newPoints }];
      winnerState.dartsThrown += newDarts.length;
      winnerState.rounds += 1;
      finalStates[currentPlayer] = winnerState;
      setPlayerStates(finalStates);
      setIsGameOver(true);
      setWinner(winResult);
      return;
    }
    if (newDarts.length >= 3) {
      setTimeout(() => endTurn(newDarts, newMarks, newPoints, result.newStates, currentPlayer), 400);
    }
  }, [config, playerStates, currentPlayer, currentTurnDarts, turnMarks, turnPoints, isGameOver, processCricketDart, checkWin, endTurn]);

  // Undo — restores the snapshot from before the last dart
  const handleUndo = useCallback(() => {
    if (undoHistory.length === 0 || aiThinking) return;
    const prev = undoHistory[undoHistory.length - 1];
    const restored = cloneSnapshot(prev);
    setPlayerStates(restored.playerStates);
    setCurrentPlayer(restored.currentPlayer);
    setCurrentTurnDarts(restored.currentTurnDarts);
    setTurnMarks(restored.turnMarks);
    setTurnPoints(restored.turnPoints);
    setIsGameOver(false);
    setWinner(null);
    setUndoHistory(h => h.slice(0, -1));
  }, [undoHistory, aiThinking]);

  const handleRematch = () => {
    setPlayerStates([createInitialCricketState(), createInitialCricketState()]);
    setCurrentPlayer(0); setCurrentTurnDarts([]); setTurnMarks(0); setTurnPoints(0);
    setIsGameOver(false); setWinner(null); setAiMarkers([]);
    setAiTurnComplete(false); setAiTurnResult(null); setUndoHistory([]);
  };

  const handleViewStats = (playerId: string) => {
    setLocation(`/stats/${playerId}`);
  };

  if (!config || !playerStates) return null;

  const isAiTurn = config.players[currentPlayer].isComputer;
  const inputDisabled = isAiTurn || currentTurnDarts.length >= 3;
  const canUndo = undoHistory.length > 0 && !aiThinking;

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
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
      <div className="flex items-center justify-between px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] border-b border-border flex-shrink-0">
        <button onClick={() => isGameOver ? setLocation('/') : setShowQuitConfirm(true)} className="p-1.5 -ml-1.5 rounded-lg text-muted-foreground active:text-foreground active:bg-accent">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-display font-bold text-muted-foreground tracking-wide uppercase">Cricket</span>
        {canUndo ? (
          <button onClick={handleUndo} className="p-1.5 -mr-1.5 rounded-lg text-muted-foreground active:text-foreground active:bg-accent transition-colors">
            <Undo2 className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* Score panels - LARGER */}
      <div className="grid grid-cols-2 flex-shrink-0">
        {[0, 1].map(idx => {
          const state = playerStates[idx];
          const isActive = currentPlayer === idx && !isGameOver;
          const isWinner = winner === idx;
          const textColor = idx === 0 ? 'text-neon' : 'text-info';
          return (
            <div key={idx} className={`relative py-4 px-4 text-center transition-colors duration-300 ${
              isActive ? (idx === 0 ? 'bg-neon/8' : 'bg-info/8') : ''
            } ${idx === 0 ? 'border-r border-border/30' : ''}`}>
              {isActive && (
                <div className={`absolute top-0 left-0 right-0 h-1 ${idx === 0 ? 'bg-neon' : 'bg-info'}`} />
              )}
              <div className={`text-xs font-display font-bold uppercase tracking-wider truncate ${
                isActive ? textColor : 'text-muted-foreground'
              }`}>
                {config.players[idx].name}
                {isActive && <span className={`ml-1.5 inline-block w-2 h-2 rounded-full ${idx === 0 ? 'bg-neon' : 'bg-info'} animate-pulse align-middle`} />}
              </div>
              <motion.div
                key={state.points}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                className={`font-display text-4xl font-bold leading-none mt-1 ${
                  isWinner ? 'text-neon glow-green-text' : 'text-foreground'
                }`}
              >
                {state.points}
              </motion.div>
              <div className="text-[10px] text-muted-foreground/50 mt-1 font-display uppercase">Points</div>
            </div>
          );
        })}
      </div>

      {/* Turn info bar - LARGER */}
      {!isGameOver && (
        <div className="flex items-center justify-between px-4 py-3 border-y border-border flex-shrink-0 bg-card/30">
          <div className="flex items-center gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className={`min-w-[48px] h-10 rounded-lg flex items-center justify-center text-sm font-display font-bold px-2 transition-all duration-200 ${
                i < currentTurnDarts.length
                  ? 'bg-neon/15 text-neon border border-neon/30'
                  : i === currentTurnDarts.length
                  ? 'border-2 border-dashed border-neon/30 text-muted-foreground/40'
                  : 'bg-card/30 border border-border/30 text-muted-foreground/15'
              }`}>
                {i < currentTurnDarts.length ? currentTurnDarts[i].label : ''}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm font-display font-bold">
            {/* Only show marks/points after AI turn is complete, or during human turn */}
            {(!aiThinking || aiTurnComplete) && (
              <>
                {turnMarks > 0 && <span className="text-neon">+{turnMarks} marks</span>}
                {turnPoints > 0 && <span className="text-warning">+{turnPoints}pts</span>}
              </>
            )}
            {aiThinking && !aiTurnComplete && (
              <span className="text-neon/70 animate-pulse">{config.players[currentPlayer].name} throwing...</span>
            )}
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isGameOver && winner !== null ? (
          <PostGameStats
            config={config}
            winner={winner}
            gameStartTime={gameStartTime}
            onRematch={handleRematch}
            onHome={() => setLocation('/')}
            onViewStats={handleViewStats}
            cricketStates={playerStates}
          />
        ) : isAiTurn ? (
          /* AI turn — show dartboard with animated markers + result overlay */
          <div className="w-full relative px-4 py-2">
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
                    <div className="flex items-center justify-center gap-4">
                      {aiTurnResult.marks > 0 && (
                        <div>
                          <div className="font-display text-2xl font-bold text-neon">{aiTurnResult.marks}</div>
                          <div className="text-[10px] text-muted-foreground">marks</div>
                        </div>
                      )}
                      {aiTurnResult.points > 0 && (
                        <div>
                          <div className="font-display text-2xl font-bold text-warning">{aiTurnResult.points}</div>
                          <div className="text-[10px] text-muted-foreground">points</div>
                        </div>
                      )}
                      {aiTurnResult.marks === 0 && aiTurnResult.points === 0 && (
                        <div className="font-display text-xl font-bold text-muted-foreground">No score</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* Human turn — unified CricketGrid with marks + input merged */
          <div className="w-full py-2">
            {/* Submit button - always visible, fills remaining darts with misses */}
            <div className="px-4 mb-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  // Fill remaining darts with misses (including all 3 if none thrown)
                  let darts = [...currentTurnDarts];
                  const states = playerStates;
                  const marks = turnMarks;
                  const points = turnPoints;

                  while (darts.length < 3) {
                    // Save snapshot before each miss
                    const snapshot: CricketSnapshot = {
                      playerStates: [deepCloneCricketState(states[0]), deepCloneCricketState(states[1])],
                      currentPlayer,
                      currentTurnDarts: [...darts],
                      turnMarks: marks,
                      turnPoints: points,
                    };
                    setUndoHistory(prev => [...prev, snapshot]);
                    darts.push(MISS);
                  }

                  // End the turn
                  endTurn(darts, marks, points, states, currentPlayer);
                }}
                className={`w-full py-3 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 ${
                  currentTurnDarts.length >= 3
                    ? 'bg-muted/20 text-muted-foreground border border-border/30'
                    : 'bg-neon/20 text-neon border border-neon/30 active:bg-neon/30'
                }`}
                disabled={currentTurnDarts.length >= 3}
              >
                {currentTurnDarts.length >= 3
                  ? 'Turn Complete'
                  : currentTurnDarts.length === 0
                  ? 'Submit Turn (3 misses)'
                  : `Submit Turn (${3 - currentTurnDarts.length} miss${3 - currentTurnDarts.length !== 1 ? 'es' : ''})`}
              </motion.button>
            </div>
            <CricketGrid
              onScore={handleDartScore}
              disabled={inputDisabled}
              p1Marks={playerStates[0].marks}
              p2Marks={playerStates[1].marks}
              currentPlayer={currentPlayer}
            />
          </div>
        )}
      </div>
    </div>
  );
}
