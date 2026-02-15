/**
 * Cricket Score Input Component — Mobile-First
 * 
 * Inspired by reference: a grid of cricket numbers (20-15 + Bull)
 * where each number has 3 tappable columns representing single/double/triple hits.
 * Tapping a column registers that many marks on the number.
 * Also includes a Miss button and an Undo action.
 */

import { useCallback } from 'react';
import { DartSegment, createSegment, SINGLE_BULL, DOUBLE_BULL, MISS } from '@/lib/dartboard';
import { CRICKET_NUMBERS } from '@/lib/game-types';

interface CricketInputProps {
  onScore: (segment: DartSegment) => void;
  disabled?: boolean;
  /** Current marks per number for the active player — used for visual feedback */
  playerMarks: Record<number, number>;
  /** Opponent marks per number */
  opponentMarks: Record<number, number>;
}

export default function CricketInput({ onScore, disabled = false, playerMarks, opponentMarks }: CricketInputProps) {

  const handleHit = useCallback((num: number, multiplier: 1 | 2 | 3) => {
    if (disabled) return;
    if (num === 25) {
      if (multiplier >= 2) {
        onScore(DOUBLE_BULL);
      } else {
        onScore(SINGLE_BULL);
      }
    } else {
      onScore(createSegment(num, multiplier));
    }
  }, [disabled, onScore]);

  const handleMiss = useCallback(() => {
    if (disabled) return;
    onScore(MISS);
  }, [disabled, onScore]);

  return (
    <div className="w-full space-y-1.5">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-1.5 px-1">
        <div />
        <div className="text-center text-[10px] font-display font-bold text-muted-foreground uppercase tracking-wider">
          Single
        </div>
        <div className="text-center text-[10px] font-display font-bold text-muted-foreground uppercase tracking-wider">
          Double
        </div>
        <div className="text-center text-[10px] font-display font-bold text-muted-foreground uppercase tracking-wider">
          Triple
        </div>
      </div>

      {/* Number rows */}
      {CRICKET_NUMBERS.map(num => {
        const myMarks = playerMarks[num] || 0;
        const oppMarks = opponentMarks[num] || 0;
        const isClosed = myMarks >= 3 && oppMarks >= 3;
        const isMyClosed = myMarks >= 3;
        const isBull = num === 25;

        return (
          <div
            key={num}
            className={`grid gap-1.5 ${isBull ? 'grid-cols-[1fr_1fr_1fr_1fr]' : 'grid-cols-[1fr_1fr_1fr_1fr]'} ${isClosed ? 'opacity-30' : ''}`}
          >
            {/* Number label */}
            <div className="flex items-center justify-center">
              <div className={`w-full py-3 rounded-xl flex items-center justify-center gap-1.5 ${
                isMyClosed ? 'bg-neon/10 border border-neon/20' : 'bg-card/50'
              }`}>
                <span className={`font-display font-bold text-base ${
                  isMyClosed ? 'text-neon' : 'text-foreground'
                }`}>
                  {isBull ? 'Bull' : num}
                </span>
                {/* Mark indicator dots */}
                {myMarks > 0 && myMarks < 3 && (
                  <div className="flex gap-0.5">
                    {Array.from({ length: myMarks }).map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-neon" />
                    ))}
                  </div>
                )}
                {isMyClosed && (
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-neon">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    <line x1="5" y1="5" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="11" y1="5" x2="5" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
              </div>
            </div>

            {/* Single */}
            <button
              onClick={() => handleHit(num, 1)}
              disabled={disabled || isClosed}
              className={`py-3 rounded-xl font-display font-bold text-sm transition-all ${
                disabled || isClosed
                  ? 'bg-card/30 text-muted-foreground/30'
                  : 'bg-card border border-border text-foreground active:bg-neon/20 active:text-neon active:border-neon/40 active:scale-95'
              }`}
            >
              {isBull ? '25' : num}
            </button>

            {/* Double */}
            <button
              onClick={() => handleHit(num, 2)}
              disabled={disabled || isClosed}
              className={`py-3 rounded-xl font-display font-bold text-sm transition-all ${
                disabled || isClosed
                  ? 'bg-card/30 text-muted-foreground/30'
                  : 'bg-card border border-border text-foreground active:bg-destructive/20 active:text-destructive active:border-destructive/40 active:scale-95'
              }`}
            >
              {isBull ? '50' : `D${num}`}
            </button>

            {/* Triple (not available for Bull) */}
            {isBull ? (
              <div className="py-3 rounded-xl bg-card/10 flex items-center justify-center">
                <span className="text-muted-foreground/20 text-xs">—</span>
              </div>
            ) : (
              <button
                onClick={() => handleHit(num, 3)}
                disabled={disabled || isClosed}
                className={`py-3 rounded-xl font-display font-bold text-sm transition-all ${
                  disabled || isClosed
                    ? 'bg-card/30 text-muted-foreground/30'
                    : 'bg-card border border-border text-foreground active:bg-info/20 active:text-info active:border-info/40 active:scale-95'
                }`}
              >
                T{num}
              </button>
            )}
          </div>
        );
      })}

      {/* Miss button */}
      <button
        onClick={handleMiss}
        disabled={disabled}
        className={`w-full py-3 rounded-xl font-display font-bold text-sm transition-all mt-1 ${
          disabled
            ? 'bg-card/30 text-muted-foreground/30'
            : 'bg-card border border-border text-muted-foreground active:bg-destructive/20 active:text-destructive active:scale-[0.98]'
        }`}
      >
        MISS
      </button>
    </div>
  );
}
