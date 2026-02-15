/**
 * CricketGrid — Unified Marks + Input Component
 * 
 * Design: Precision Dark — mobile-first, large touch targets.
 * 
 * Simplified layout per row (5 columns):
 *   [P1 marks] | [Single] [Double] [Triple] | [P2 marks]
 * 
 * The number label is integrated into the Single button.
 * Both players share the same input area — no per-side duplication.
 * Buttons are tall and wide for easy thumb tapping.
 */

import { useCallback } from 'react';
import { DartSegment, createSegment, SINGLE_BULL, DOUBLE_BULL, MISS } from '@/lib/dartboard';
import { CRICKET_NUMBERS } from '@/lib/game-types';

interface CricketGridProps {
  onScore: (segment: DartSegment) => void;
  disabled?: boolean;
  p1Marks: Record<number, number>;
  p2Marks: Record<number, number>;
  currentPlayer: 0 | 1;
}

function MarkDisplay({ count, color }: { count: number; color: 'green' | 'blue' }) {
  if (count === 0) return <span className="text-muted-foreground/20 text-[10px]">—</span>;
  const cls = color === 'green'
    ? (count >= 3 ? 'text-neon' : 'text-neon/70')
    : (count >= 3 ? 'text-info' : 'text-info/70');
  return (
    <svg viewBox="0 0 28 28" className={`w-5 h-5 ${cls}`}>
      {count >= 1 && <line x1="7" y1="7" x2="21" y2="21" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />}
      {count >= 2 && <line x1="21" y1="7" x2="7" y2="21" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />}
      {count >= 3 && <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2.5" fill="none" />}
    </svg>
  );
}

export default function CricketGrid({ onScore, disabled = false, p1Marks, p2Marks }: CricketGridProps) {

  const handleHit = useCallback((num: number, multiplier: 1 | 2 | 3) => {
    if (disabled) return;
    if (num === 25) {
      onScore(multiplier >= 2 ? DOUBLE_BULL : SINGLE_BULL);
    } else {
      onScore(createSegment(num, multiplier));
    }
  }, [disabled, onScore]);

  const handleMiss = useCallback(() => {
    if (disabled) return;
    onScore(MISS);
  }, [disabled, onScore]);

  const isBothClosed = (num: number) => p1Marks[num] >= 3 && p2Marks[num] >= 3;

  return (
    <div className="w-full px-2">
      {/* Header */}
      <div className="grid grid-cols-[44px_1fr_1fr_1fr_44px] gap-1 mb-1">
        <div className="flex items-center justify-center">
          <span className="text-[9px] font-display font-bold text-neon/70 uppercase tracking-wider">P1</span>
        </div>
        <div className="flex items-center justify-center">
          <span className="text-[9px] font-display font-bold text-muted-foreground/40 uppercase tracking-wider">Single</span>
        </div>
        <div className="flex items-center justify-center">
          <span className="text-[9px] font-display font-bold text-muted-foreground/40 uppercase tracking-wider">Double</span>
        </div>
        <div className="flex items-center justify-center">
          <span className="text-[9px] font-display font-bold text-muted-foreground/40 uppercase tracking-wider">Triple</span>
        </div>
        <div className="flex items-center justify-center">
          <span className="text-[9px] font-display font-bold text-info/70 uppercase tracking-wider">P2</span>
        </div>
      </div>

      {/* Number rows */}
      {CRICKET_NUMBERS.map(num => {
        const closed = isBothClosed(num);
        const isBull = num === 25;
        const p1Closed = p1Marks[num] >= 3;
        const p2Closed = p2Marks[num] >= 3;

        const baseBtnCls = 'rounded-xl font-display font-bold text-sm transition-all select-none';
        const disabledCls = 'bg-card/15 text-muted-foreground/15';
        const activeSingle = 'bg-card/50 border border-border/40 text-foreground active:bg-neon/20 active:text-neon active:border-neon/40 active:scale-95';
        const activeDouble = 'bg-card/50 border border-border/40 text-foreground active:bg-amber-500/20 active:text-amber-400 active:border-amber-500/40 active:scale-95';
        const activeTriple = 'bg-card/50 border border-border/40 text-foreground active:bg-info/20 active:text-info active:border-info/40 active:scale-95';

        return (
          <div
            key={num}
            className={`grid grid-cols-[44px_1fr_1fr_1fr_44px] gap-1 mb-1 ${closed ? 'opacity-15' : ''}`}
          >
            {/* P1 marks */}
            <div className={`flex items-center justify-center rounded-xl py-3 ${p1Closed ? 'bg-neon/10' : 'bg-card/20'}`}>
              <MarkDisplay count={p1Marks[num]} color="green" />
            </div>

            {/* Single button — shows the number prominently */}
            <button
              onClick={() => handleHit(num, 1)}
              disabled={disabled || closed}
              className={`py-3 ${baseBtnCls} ${disabled || closed ? disabledCls : activeSingle}`}
            >
              {isBull ? '25' : num}
            </button>

            {/* Double button */}
            <button
              onClick={() => handleHit(num, 2)}
              disabled={disabled || closed}
              className={`py-3 ${baseBtnCls} ${disabled || closed ? disabledCls : activeDouble}`}
            >
              {isBull ? 'D-Bull' : `D${num}`}
            </button>

            {/* Triple button (or disabled for Bull) */}
            {isBull ? (
              <div className={`py-3 ${baseBtnCls} ${disabledCls} flex items-center justify-center`}>
                —
              </div>
            ) : (
              <button
                onClick={() => handleHit(num, 3)}
                disabled={disabled || closed}
                className={`py-3 ${baseBtnCls} ${disabled || closed ? disabledCls : activeTriple}`}
              >
                T{num}
              </button>
            )}

            {/* P2 marks */}
            <div className={`flex items-center justify-center rounded-xl py-3 ${p2Closed ? 'bg-info/10' : 'bg-card/20'}`}>
              <MarkDisplay count={p2Marks[num]} color="blue" />
            </div>
          </div>
        );
      })}

      {/* Miss button */}
      <div className="mt-1">
        <button
          onClick={handleMiss}
          disabled={disabled}
          className={`w-full py-3.5 rounded-xl font-display font-bold text-sm transition-all select-none ${
            disabled
              ? 'bg-card/15 text-muted-foreground/15'
              : 'bg-card/50 border border-border/40 text-muted-foreground active:bg-destructive/20 active:text-destructive active:border-destructive/40 active:scale-[0.98]'
          }`}
        >
          MISS
        </button>
      </div>
    </div>
  );
}
