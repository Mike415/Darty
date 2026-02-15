/**
 * Dartboard Geometry & AI Engine
 * 
 * Standard dartboard layout with accurate segment positions.
 * The board is modeled in polar coordinates (angle, radius) for realistic
 * throw simulation. The AI uses Gaussian spread around target points,
 * with difficulty 1-10 controlling the standard deviation.
 */

// Standard dartboard number order (clockwise from top)
export const BOARD_NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// Each segment spans 18 degrees (360/20)
export const SEGMENT_ANGLE = 18;

// Board radii (in mm from center, standard board)
export const BOARD_RADII = {
  DOUBLE_BULL: 6.35,    // Inner bull (double bull / bullseye)
  SINGLE_BULL: 15.9,    // Outer bull (single bull)
  INNER_SINGLE_START: 15.9,
  TRIPLE_START: 99,     // Triple ring inner edge
  TRIPLE_END: 107,      // Triple ring outer edge
  OUTER_SINGLE_START: 107,
  DOUBLE_START: 162,    // Double ring inner edge
  DOUBLE_END: 170,      // Double ring outer edge (board edge)
};

export type DartSegment = {
  number: number;       // 0-20 (0 = bull)
  multiplier: 1 | 2 | 3; // single, double, triple
  label: string;        // e.g., "T20", "D16", "S5", "BULL", "25"
  score: number;        // Total points
};

export const MISS: DartSegment = { number: 0, multiplier: 1, label: "MISS", score: 0 };
export const SINGLE_BULL: DartSegment = { number: 25, multiplier: 1, label: "25", score: 25 };
export const DOUBLE_BULL: DartSegment = { number: 25, multiplier: 2, label: "BULL", score: 50 };

/**
 * Get the angle (in degrees, 0 = top/12 o'clock, clockwise) for a given board number
 */
export function getSegmentAngle(num: number): number {
  const idx = BOARD_NUMBERS.indexOf(num);
  if (idx === -1) return 0;
  // Each segment is 18 degrees wide, centered on its position
  return idx * SEGMENT_ANGLE;
}

/**
 * Get the center angle for a segment number
 */
export function getSegmentCenterAngle(num: number): number {
  return getSegmentAngle(num);
}

/**
 * Get the radius for a target zone
 */
export function getTargetRadius(multiplier: 1 | 2 | 3, isBull: boolean = false): number {
  if (isBull) {
    return multiplier === 2 ? 0 : BOARD_RADII.DOUBLE_BULL + (BOARD_RADII.SINGLE_BULL - BOARD_RADII.DOUBLE_BULL) / 2;
  }
  switch (multiplier) {
    case 3: return (BOARD_RADII.TRIPLE_START + BOARD_RADII.TRIPLE_END) / 2;
    case 2: return (BOARD_RADII.DOUBLE_START + BOARD_RADII.DOUBLE_END) / 2;
    case 1: return (BOARD_RADII.INNER_SINGLE_START + BOARD_RADII.TRIPLE_START) / 2;
  }
}

/**
 * Convert polar (angle in degrees, radius in mm) to cartesian (x, y in mm)
 * Angle 0 = top, clockwise
 */
export function polarToCartesian(angleDeg: number, radius: number): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: radius * Math.cos(angleRad),
    y: radius * Math.sin(angleRad),
  };
}

/**
 * Convert cartesian (x, y) to polar (angle, radius)
 */
export function cartesianToPolar(x: number, y: number): { angle: number; radius: number } {
  const radius = Math.sqrt(x * x + y * y);
  let angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
  if (angle < 0) angle += 360;
  return { angle, radius };
}

/**
 * Determine which segment a point (x, y) in mm from center lands on
 */
export function getSegmentAtPoint(x: number, y: number): DartSegment {
  const { angle, radius } = cartesianToPolar(x, y);

  // Miss - outside the board
  if (radius > BOARD_RADII.DOUBLE_END) {
    return MISS;
  }

  // Double bull (bullseye)
  if (radius <= BOARD_RADII.DOUBLE_BULL) {
    return DOUBLE_BULL;
  }

  // Single bull (outer bull)
  if (radius <= BOARD_RADII.SINGLE_BULL) {
    return SINGLE_BULL;
  }

  // Determine which number segment
  // Segments are centered on their angle, so offset by half a segment
  let adjustedAngle = (angle + SEGMENT_ANGLE / 2) % 360;
  const segmentIndex = Math.floor(adjustedAngle / SEGMENT_ANGLE);
  const number = BOARD_NUMBERS[segmentIndex % 20];

  // Determine multiplier based on radius
  let multiplier: 1 | 2 | 3 = 1;
  if (radius >= BOARD_RADII.TRIPLE_START && radius <= BOARD_RADII.TRIPLE_END) {
    multiplier = 3;
  } else if (radius >= BOARD_RADII.DOUBLE_START && radius <= BOARD_RADII.DOUBLE_END) {
    multiplier = 2;
  }

  const prefix = multiplier === 3 ? "T" : multiplier === 2 ? "D" : "S";
  return {
    number,
    multiplier,
    label: `${prefix}${number}`,
    score: number * multiplier,
  };
}

/**
 * Get adjacent numbers on the dartboard (clockwise neighbors)
 */
export function getAdjacentNumbers(num: number): [number, number] {
  const idx = BOARD_NUMBERS.indexOf(num);
  if (idx === -1) return [num, num];
  const left = BOARD_NUMBERS[(idx - 1 + 20) % 20];
  const right = BOARD_NUMBERS[(idx + 1) % 20];
  return [left, right];
}

/**
 * Box-Muller transform for generating normally distributed random numbers
 */
function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * AI Throw Simulation
 * 
 * The AI aims at a target point on the board and applies Gaussian noise.
 * Difficulty 1 = very inaccurate (large spread), Difficulty 10 = very accurate (small spread).
 * 
 * The spread is applied in both angular and radial directions independently,
 * which naturally causes darts to land on adjacent segments when inaccurate.
 * 
 * @param targetNumber - The number the AI is aiming for (0 for bull)
 * @param targetMultiplier - 1=single, 2=double, 3=triple
 * @param difficulty - 1-10 difficulty level
 * @returns The segment where the dart actually lands
 */
export function aiThrow(
  targetNumber: number,
  targetMultiplier: 1 | 2 | 3,
  difficulty: number
): DartSegment {
  const isBull = targetNumber === 0 || targetNumber === 25;

  // Calculate target point in cartesian coordinates
  let targetX: number, targetY: number;

  if (isBull) {
    // Aiming at bull - target is center
    const targetRadius = targetMultiplier === 2 ? 0 : (BOARD_RADII.DOUBLE_BULL + BOARD_RADII.SINGLE_BULL) / 2;
    // Random angle for bull since it's circular
    const randomAngle = Math.random() * 360;
    const point = polarToCartesian(randomAngle, targetRadius);
    targetX = point.x;
    targetY = point.y;
  } else {
    const targetAngle = getSegmentCenterAngle(targetNumber);
    const targetRadius = getTargetRadius(targetMultiplier);
    const point = polarToCartesian(targetAngle, targetRadius);
    targetX = point.x;
    targetY = point.y;
  }

  // Calculate spread based on difficulty
  // Difficulty 1: ~60mm standard deviation (very wild)
  // Difficulty 5: ~25mm standard deviation (moderate)
  // Difficulty 10: ~4mm standard deviation (very precise)
  // Using exponential decay for more natural feel
  const spreadMM = 70 * Math.exp(-0.28 * difficulty);

  // Apply Gaussian noise to x and y independently
  const actualX = targetX + gaussianRandom() * spreadMM;
  const actualY = targetY + gaussianRandom() * spreadMM;

  // Determine where the dart actually landed
  return getSegmentAtPoint(actualX, actualY);
}

/**
 * Create a DartSegment from a number and multiplier
 */
export function createSegment(number: number, multiplier: 1 | 2 | 3): DartSegment {
  if (number === 25) {
    return multiplier === 2 ? DOUBLE_BULL : SINGLE_BULL;
  }
  if (number === 0) return MISS;
  const prefix = multiplier === 3 ? "T" : multiplier === 2 ? "D" : "S";
  return {
    number,
    multiplier,
    label: `${prefix}${number}`,
    score: number * multiplier,
  };
}

/**
 * All possible dart segments for input selection
 */
export function getAllSegments(): DartSegment[] {
  const segments: DartSegment[] = [];
  // Numbers 1-20 with single, double, triple
  for (let n = 1; n <= 20; n++) {
    segments.push(createSegment(n, 1));
    segments.push(createSegment(n, 2));
    segments.push(createSegment(n, 3));
  }
  // Bulls
  segments.push(SINGLE_BULL);
  segments.push(DOUBLE_BULL);
  segments.push(MISS);
  return segments;
}
