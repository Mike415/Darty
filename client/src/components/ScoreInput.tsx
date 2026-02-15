/**
 * Quick Score Input Component — Mobile-First
 * 
 * Design: Precision Dark — large buttons for thumb-friendly scoring.
 * Number grid fills width, multiplier tabs at top.
 */

import { useState, useCallback } from 'react';
import { DartSegment, createSegment, SINGLE_BULL, DOUBLE_BULL, MISS } from '@/lib/dartboard';

interface ScoreInputProps {
  onScore: (segment: DartSegment) => void;
  disabled?: boolean;
}

export default function ScoreInput({ onScore, disabled = false }: ScoreInputProps) {
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);

  const handleNumberClick = useCallback((num: number) => {
    if (disabled) return;
    if (num === 25) {
      onScore(multiplier === 2 ? DOUBLE_BULL : SINGLE_BULL);
    } else {
      onScore(createSegment(num, multiplier));
    }
    setMultiplier(1);
  }, [disabled, multiplier, onScore]);

  const handleMiss = useCallback(() => {
    if (disabled) return;
    onScore(MISS);
    setMultiplier(1);
  }, [disabled, onScore]);

  return (
    <div className="space-y-2">
      {/* Multiplier tabs */}
      <div className="grid grid-cols-3 gap-1.5">
        {([1, 2, 3] as const).map(m => {
          const labels = { 1: 'Single', 2: 'Double', 3: 'Triple' };
          const isActive = multiplier === m;
          return (
            <button
              key={m}
              onClick={() => setMultiplier(m)}
              disabled={disabled}
              className={`py-2.5 rounded-xl text-sm font-display font-bold transition-colors ${
                isActive
                  ? m === 3 ? 'bg-neon text-background' :
                    m === 2 ? 'bg-destructive text-white' :
                    'bg-foreground text-background'
                  : 'bg-card border border-border text-muted-foreground active:bg-accent'
              } ${disabled ? 'opacity-40' : ''}`}
            >
              {labels[m]}
            </button>
          );
        })}
      </div>

      {/* Number grid — 4 columns for bigger buttons on mobile */}
      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            disabled={disabled}
            className={`py-3 rounded-xl text-sm font-display font-bold transition-colors ${
              disabled
                ? 'opacity-40 bg-card text-muted-foreground'
                : 'bg-card border border-border text-foreground active:bg-neon/20 active:text-neon active:border-neon/30'
            }`}
          >
            {multiplier === 3 ? `T${num}` : multiplier === 2 ? `D${num}` : num}
          </button>
        ))}
      </div>

      {/* Bull + Miss row */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={() => handleNumberClick(25)}
          disabled={disabled}
          className={`py-3.5 rounded-xl font-display font-bold text-sm transition-colors ${
            disabled
              ? 'opacity-40 bg-card text-muted-foreground'
              : multiplier === 2
                ? 'bg-destructive/20 border border-destructive/40 text-destructive active:bg-destructive/30'
                : 'bg-card border border-border text-foreground active:bg-neon/20 active:text-neon'
          }`}
        >
          {multiplier === 2 ? 'BULL (50)' : '25'}
        </button>
        <button
          onClick={handleMiss}
          disabled={disabled}
          className={`py-3.5 rounded-xl font-display font-bold text-sm transition-colors ${
            disabled
              ? 'opacity-40 bg-card text-muted-foreground'
              : 'bg-card border border-border text-muted-foreground active:bg-destructive/20 active:text-destructive'
          }`}
        >
          MISS
        </button>
      </div>
    </div>
  );
}
