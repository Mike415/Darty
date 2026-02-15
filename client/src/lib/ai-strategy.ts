/**
 * AI Strategy Engine
 * 
 * Smart targeting logic for X01 and Cricket game modes.
 * The strategy is always optimal regardless of difficulty level.
 * Difficulty only affects throw accuracy (spread), not decision-making.
 */

import { aiThrow, DartSegment, createSegment, DOUBLE_BULL, SINGLE_BULL } from './dartboard';

// ============================================================
// X01 Strategy
// ============================================================

/**
 * Standard checkout table for X01 games.
 * Maps remaining score to the optimal sequence of darts to finish.
 * All checkouts must end on a double.
 */
const CHECKOUT_TABLE: Record<number, Array<[number, 1 | 2 | 3]>> = {};

// Build checkout table
function buildCheckoutTable() {
  // 170 is the highest possible checkout (T20, T20, BULL)
  // We'll build common checkouts

  // Single dart finishes (doubles only, 2-40 even numbers + 50)
  for (let i = 1; i <= 20; i++) {
    CHECKOUT_TABLE[i * 2] = [[i, 2]];
  }
  CHECKOUT_TABLE[50] = [[25, 2]]; // Bullseye

  // Two dart finishes
  for (let first = 1; first <= 20; first++) {
    for (const mult of [1, 2, 3] as const) {
      const firstScore = first * mult;
      const remaining = firstScore;
      // Check if we can finish with a double after this
      for (let d = 1; d <= 20; d++) {
        const total = remaining + d * 2;
        if (total <= 170 && !CHECKOUT_TABLE[total]) {
          CHECKOUT_TABLE[total] = [[first, mult], [d, 2]];
        }
      }
      // Bull finish
      const totalBull = remaining + 50;
      if (totalBull <= 170 && !CHECKOUT_TABLE[totalBull]) {
        CHECKOUT_TABLE[totalBull] = [[first, mult], [25, 2]];
      }
    }
  }
  // Also single bull + double
  for (let d = 1; d <= 20; d++) {
    const total = 25 + d * 2;
    if (!CHECKOUT_TABLE[total]) {
      CHECKOUT_TABLE[total] = [[25, 1], [d, 2]];
    }
  }

  // Three dart finishes for higher scores
  for (let a = 1; a <= 20; a++) {
    for (const am of [1, 2, 3] as const) {
      for (let b = 1; b <= 20; b++) {
        for (const bm of [1, 2, 3] as const) {
          for (let d = 1; d <= 20; d++) {
            const total = a * am + b * bm + d * 2;
            if (total <= 170 && !CHECKOUT_TABLE[total]) {
              CHECKOUT_TABLE[total] = [[a, am], [b, bm], [d, 2]];
            }
          }
          // Bull finish
          const totalBull = a * am + b * bm + 50;
          if (totalBull <= 170 && !CHECKOUT_TABLE[totalBull]) {
            CHECKOUT_TABLE[totalBull] = [[a, am], [b, bm], [25, 2]];
          }
        }
      }
    }
  }

  // Optimize: prefer T20 heavy paths for common checkouts
  // Override with well-known optimal checkouts
  const optimalCheckouts: Record<number, Array<[number, 1 | 2 | 3]>> = {
    170: [[20, 3], [20, 3], [25, 2]],
    167: [[20, 3], [19, 3], [25, 2]],
    164: [[20, 3], [18, 3], [25, 2]],
    161: [[20, 3], [17, 3], [25, 2]],
    160: [[20, 3], [20, 3], [20, 2]],
    158: [[20, 3], [20, 3], [19, 2]],
    157: [[20, 3], [19, 3], [20, 2]],
    156: [[20, 3], [20, 3], [18, 2]],
    155: [[20, 3], [19, 3], [19, 2]],
    154: [[20, 3], [18, 3], [20, 2]],
    153: [[20, 3], [19, 3], [18, 2]],
    152: [[20, 3], [20, 3], [16, 2]],
    151: [[20, 3], [17, 3], [20, 2]],
    150: [[20, 3], [18, 3], [18, 2]],
    149: [[20, 3], [19, 3], [16, 2]],
    148: [[20, 3], [16, 3], [20, 2]],
    147: [[20, 3], [17, 3], [18, 2]],
    146: [[20, 3], [18, 3], [16, 2]],
    145: [[20, 3], [15, 3], [20, 2]],
    144: [[20, 3], [20, 3], [12, 2]],
    143: [[20, 3], [17, 3], [16, 2]],
    142: [[20, 3], [14, 3], [20, 2]],
    141: [[20, 3], [19, 3], [12, 2]],
    140: [[20, 3], [20, 3], [10, 2]],
    139: [[20, 3], [13, 3], [20, 2]],
    138: [[20, 3], [18, 3], [12, 2]],
    137: [[20, 3], [19, 3], [10, 2]],
    136: [[20, 3], [20, 3], [8, 2]],
    135: [[20, 3], [17, 3], [12, 2]],
    134: [[20, 3], [14, 3], [16, 2]],
    133: [[20, 3], [19, 3], [8, 2]],
    132: [[20, 3], [20, 3], [6, 2]],
    131: [[20, 3], [13, 3], [16, 2]],
    130: [[20, 3], [18, 3], [8, 2]],
    129: [[19, 3], [20, 3], [6, 2]],
    128: [[20, 3], [20, 3], [4, 2]],
    127: [[20, 3], [17, 3], [8, 2]],
    126: [[19, 3], [19, 3], [6, 2]],
    125: [[20, 3], [19, 3], [4, 2]],
    124: [[20, 3], [16, 3], [8, 2]],
    123: [[19, 3], [16, 3], [9, 2]],
    122: [[18, 3], [20, 3], [4, 2]],
    121: [[20, 3], [11, 3], [14, 2]],
    120: [[20, 3], [20, 1], [20, 2]],
    119: [[19, 3], [12, 3], [13, 2]],
    118: [[20, 3], [18, 1], [20, 2]],
    117: [[20, 3], [17, 1], [20, 2]],
    116: [[20, 3], [16, 1], [20, 2]],
    115: [[20, 3], [15, 1], [20, 2]],
    114: [[20, 3], [14, 1], [20, 2]],
    113: [[20, 3], [13, 1], [20, 2]],
    112: [[20, 3], [12, 1], [20, 2]],
    111: [[20, 3], [19, 1], [16, 2]],
    110: [[20, 3], [18, 1], [16, 2]],
    109: [[20, 3], [17, 1], [16, 2]],
    108: [[20, 3], [16, 1], [16, 2]],
    107: [[19, 3], [18, 1], [16, 2]],
    106: [[20, 3], [14, 1], [16, 2]],
    105: [[20, 3], [13, 1], [16, 2]],
    104: [[18, 3], [18, 1], [16, 2]],
    103: [[20, 3], [11, 1], [16, 2]],
    102: [[20, 3], [10, 1], [16, 2]],
    101: [[20, 3], [9, 1], [16, 2]],
    100: [[20, 3], [20, 2]],
    99: [[19, 3], [10, 1], [16, 2]],
    98: [[20, 3], [6, 1], [16, 2]],
    97: [[19, 3], [8, 1], [16, 2]],
    96: [[20, 3], [20, 2]],
    95: [[20, 3], [3, 1], [16, 2]],
    94: [[18, 3], [8, 1], [16, 2]],
    93: [[19, 3], [4, 1], [16, 2]],
    92: [[20, 3], [20, 2]],
    91: [[17, 3], [20, 2]],
    90: [[20, 3], [18, 1], [6, 2]],
    89: [[19, 3], [16, 2]],
    88: [[16, 3], [20, 2]],
    87: [[17, 3], [18, 2]],
    86: [[18, 3], [16, 2]],
    85: [[15, 3], [20, 2]],
    84: [[20, 3], [12, 2]],
    83: [[17, 3], [16, 2]],
    82: [[14, 3], [20, 2]],
    81: [[19, 3], [12, 2]],
    80: [[20, 3], [10, 2]],
    79: [[13, 3], [20, 2]],
    78: [[18, 3], [12, 2]],
    77: [[19, 3], [10, 2]],
    76: [[20, 3], [8, 2]],
    75: [[17, 3], [12, 2]],
    74: [[14, 3], [16, 2]],
    73: [[19, 3], [8, 2]],
    72: [[20, 3], [6, 2]],
    71: [[13, 3], [16, 2]],
    70: [[18, 3], [8, 2]],
    69: [[19, 3], [6, 2]],
    68: [[20, 3], [4, 2]],
    67: [[17, 3], [8, 2]],
    66: [[10, 3], [18, 2]],
    65: [[19, 3], [4, 2]],
    64: [[16, 3], [8, 2]],
    63: [[13, 3], [12, 2]],
    62: [[10, 3], [16, 2]],
    61: [[15, 3], [8, 2]],
    60: [[20, 1], [20, 2]],
    59: [[19, 1], [20, 2]],
    58: [[18, 1], [20, 2]],
    57: [[17, 1], [20, 2]],
    56: [[16, 1], [20, 2]],
    55: [[15, 1], [20, 2]],
    54: [[14, 1], [20, 2]],
    53: [[13, 1], [20, 2]],
    52: [[12, 1], [20, 2]],
    51: [[11, 1], [20, 2]],
    50: [[25, 2]],
    49: [[9, 1], [20, 2]],
    48: [[8, 1], [20, 2]],
    47: [[7, 1], [20, 2]],
    46: [[6, 1], [20, 2]],
    45: [[5, 1], [20, 2]],
    44: [[4, 1], [20, 2]],
    43: [[3, 1], [20, 2]],
    42: [[10, 1], [16, 2]],
    41: [[9, 1], [16, 2]],
  };

  Object.assign(CHECKOUT_TABLE, optimalCheckouts);
}

buildCheckoutTable();

export interface X01Target {
  number: number;
  multiplier: 1 | 2 | 3;
}

/**
 * Determine what the AI should aim for in X01
 */
export function getX01Target(remaining: number, dartsInTurn: number): X01Target {
  const dartsLeft = 3 - dartsInTurn;

  // Can we check out?
  if (remaining <= 170 && CHECKOUT_TABLE[remaining]) {
    const checkout = CHECKOUT_TABLE[remaining];
    if (checkout.length <= dartsLeft) {
      // Aim for the first dart in the checkout sequence
      return { number: checkout[0][0], multiplier: checkout[0][1] };
    }
  }

  // If remaining is odd and <= 40, we need to set up for a double
  // Hit a single to make it even
  if (remaining <= 40 && remaining % 2 === 1) {
    // Aim for single 1 to make it even (then double to finish)
    return { number: 1, multiplier: 1 };
  }

  // If remaining is even and <= 40, go for the double
  if (remaining <= 40 && remaining % 2 === 0) {
    return { number: remaining / 2, multiplier: 2 };
  }

  // Score as much as possible - aim for T20
  if (remaining > 180) {
    return { number: 20, multiplier: 3 };
  }

  // Try to leave a good checkout number
  // Preferred leaves: 32 (D16), 40 (D20), 36 (D18), 24 (D12), 16 (D8)
  const preferredLeaves = [32, 40, 36, 24, 16, 20, 28, 50];

  // Calculate best target to leave a good number
  const possibleTargets: Array<{ target: X01Target; leave: number; priority: number }> = [];

  for (let n = 1; n <= 20; n++) {
    for (const m of [3, 1, 2] as const) {
      const score = n * m;
      const leave = remaining - score;
      if (leave < 2) continue; // Can't check out from less than 2
      if (leave > 170) continue; // Can't check out from more than 170

      const leaveIdx = preferredLeaves.indexOf(leave);
      const priority = leaveIdx >= 0 ? leaveIdx : 100;

      // Prefer higher scores that leave checkable numbers
      const hasCheckout = CHECKOUT_TABLE[leave] !== undefined;
      if (hasCheckout) {
        possibleTargets.push({ target: { number: n, multiplier: m }, leave, priority });
      }
    }
  }

  if (possibleTargets.length > 0) {
    // Sort by priority (preferred leaves first), then by highest score
    possibleTargets.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const aScore = a.target.number * a.target.multiplier;
      const bScore = b.target.number * b.target.multiplier;
      return bScore - aScore;
    });
    return possibleTargets[0].target;
  }

  // Default: aim for T20
  return { number: 20, multiplier: 3 };
}

// ============================================================
// Cricket Strategy
// ============================================================

export interface CricketState {
  // Marks for each player on numbers 15-20 and bull (25)
  // 0 = not hit, 1 = single mark, 2 = double mark, 3+ = closed
  playerMarks: Record<number, number>;
  opponentMarks: Record<number, number>;
  playerPoints: number;
  opponentPoints: number;
}

export const CRICKET_NUMBERS = [20, 19, 18, 17, 16, 15, 25];

/**
 * Determine what the AI should aim for in Cricket
 */
export function getCricketTarget(state: CricketState): { number: number; multiplier: 1 | 2 | 3 } {
  // Strategy priorities:
  // 1. Close numbers that opponent has points on (stop bleeding)
  // 2. Score on open numbers where we're ahead (pile on points)
  // 3. Close numbers starting from highest value
  // 4. If behind, focus on scoring; if ahead, focus on closing

  const pointDiff = state.playerPoints - state.opponentPoints;
  const isAhead = pointDiff > 0;

  // Find numbers where opponent is scoring on us (they have 3+ marks, we have < 3)
  const bleedingNumbers = CRICKET_NUMBERS.filter(
    n => state.opponentMarks[n] >= 3 && state.playerMarks[n] < 3
  );

  // Find numbers where we can score (we have 3+ marks, opponent has < 3)
  const scoringNumbers = CRICKET_NUMBERS.filter(
    n => state.playerMarks[n] >= 3 && state.opponentMarks[n] < 3
  );

  // Find numbers neither player has closed
  const openNumbers = CRICKET_NUMBERS.filter(
    n => state.playerMarks[n] < 3
  );

  // Priority 1: Stop bleeding on high-value numbers
  if (bleedingNumbers.length > 0) {
    // Close the highest value bleeding number
    const target = bleedingNumbers.sort((a, b) => b - a)[0];
    return { number: target, multiplier: target === 25 ? 1 : 3 };
  }

  // Priority 2: If behind, score on open numbers
  if (!isAhead && scoringNumbers.length > 0) {
    const target = scoringNumbers.sort((a, b) => b - a)[0];
    return { number: target, multiplier: target === 25 ? 2 : 3 };
  }

  // Priority 3: Close numbers from highest to lowest
  if (openNumbers.length > 0) {
    // Prefer numbers where we already have marks (closer to closing)
    const sorted = openNumbers.sort((a, b) => {
      const aMarks = state.playerMarks[a];
      const bMarks = state.playerMarks[b];
      // Prefer numbers with more marks (closer to closing)
      if (aMarks !== bMarks) return bMarks - aMarks;
      // Then prefer higher numbers
      return b - a;
    });
    const target = sorted[0];
    return { number: target, multiplier: target === 25 ? (state.playerMarks[target] === 0 ? 1 : 2) : 3 };
  }

  // All closed - aim for bull to score
  return { number: 25, multiplier: 2 };
}

/**
 * Execute an AI turn (throws 3 darts)
 */
export function executeAiX01Turn(
  remaining: number,
  difficulty: number
): DartSegment[] {
  const darts: DartSegment[] = [];
  let currentRemaining = remaining;

  for (let i = 0; i < 3; i++) {
    if (currentRemaining <= 0) break;

    const target = getX01Target(currentRemaining, i);
    const result = aiThrow(target.number, target.multiplier, difficulty);

    // Check for bust
    const newRemaining = currentRemaining - result.score;
    if (newRemaining < 0 || newRemaining === 1 || (newRemaining === 0 && result.multiplier !== 2)) {
      // Bust - remaining stays the same, but we record the throw
      darts.push(result);
      break; // Turn is over on bust
    }

    darts.push(result);
    currentRemaining = newRemaining;

    if (currentRemaining === 0) break; // Checkout!
  }

  return darts;
}

/**
 * Execute an AI Cricket turn (throws 3 darts)
 */
export function executeAiCricketTurn(
  state: CricketState,
  difficulty: number
): DartSegment[] {
  const darts: DartSegment[] = [];
  const currentState = { ...state, playerMarks: { ...state.playerMarks } };

  for (let i = 0; i < 3; i++) {
    const target = getCricketTarget(currentState);
    const result = aiThrow(target.number, target.multiplier, difficulty);
    darts.push(result);

    // Update state for next dart decision
    const hitNumber = result.number === 25 ? 25 : result.number;
    if (CRICKET_NUMBERS.includes(hitNumber)) {
      const marks = result.multiplier;
      currentState.playerMarks[hitNumber] = (currentState.playerMarks[hitNumber] || 0) + marks;
    }
  }

  return darts;
}

/**
 * Get checkout suggestion for display
 */
export function getCheckoutSuggestion(remaining: number): string | null {
  if (remaining > 170 || remaining < 2) return null;
  const checkout = CHECKOUT_TABLE[remaining];
  if (!checkout) return null;

  return checkout.map(([num, mult]) => {
    if (num === 25) return mult === 2 ? 'BULL' : '25';
    const prefix = mult === 3 ? 'T' : mult === 2 ? 'D' : 'S';
    return `${prefix}${num}`;
  }).join(' → ');
}
