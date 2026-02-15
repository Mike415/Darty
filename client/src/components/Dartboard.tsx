/**
 * Interactive SVG Dartboard Component — Mobile-First
 * 
 * Design: Precision Dark — large touch targets for phone screens.
 * Supports two modes:
 *   - Interactive: human taps segments to score
 *   - Spectator: shows animated dart landing markers (for AI turns)
 *
 * Marker positions are computed once per marker ID and cached in a Map
 * so they never shift when new markers are added.
 * Earlier darts are dimmed; the newest dart is brightest.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { BOARD_NUMBERS, DartSegment, createSegment, SINGLE_BULL, DOUBLE_BULL, MISS } from '@/lib/dartboard';

/** A dart marker to display on the board */
export interface DartMarker {
  segment: DartSegment;
  id: number; // unique id for animation key
}

interface DartboardProps {
  onSegmentClick?: (segment: DartSegment) => void;
  disabled?: boolean;
  /** Dart markers to show on the board (for AI visualization) */
  markers?: DartMarker[];
  /** If true, board is view-only (no click handlers) */
  spectatorMode?: boolean;
}

const SVG_SIZE = 440;
const CENTER = SVG_SIZE / 2;
const SCALE = SVG_SIZE / 380;

const R = {
  DOUBLE_BULL: 6.35 * SCALE,
  SINGLE_BULL: 15.9 * SCALE,
  TRIPLE_START: 99 * SCALE,
  TRIPLE_END: 107 * SCALE,
  DOUBLE_START: 162 * SCALE,
  DOUBLE_END: 170 * SCALE,
};

const COLORS = {
  black: '#1a1a1a',
  white: '#e8e0d0',
  red: '#c0392b',
  green: '#1a6b3c',
  wire: '#444',
  numbers: '#c8c4bc',
  hover: 'rgba(0, 255, 136, 0.35)',
};

function polarToSVG(angleDeg: number, radius: number): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(angleRad),
    y: CENTER + radius * Math.sin(angleRad),
  };
}

function createArcPath(
  startAngle: number, endAngle: number,
  innerRadius: number, outerRadius: number
): string {
  const start1 = polarToSVG(startAngle, outerRadius);
  const end1 = polarToSVG(endAngle, outerRadius);
  const start2 = polarToSVG(endAngle, innerRadius);
  const end2 = polarToSVG(startAngle, innerRadius);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${start1.x} ${start1.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${end1.x} ${end1.y}`,
    `L ${start2.x} ${start2.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${end2.x} ${end2.y}`,
    'Z',
  ].join(' ');
}

/** Convert a DartSegment to an approximate SVG position on the board */
function segmentToSVGPosition(segment: DartSegment): { x: number; y: number } {
  if (segment.score === 0) {
    const angle = Math.random() * 360;
    const r = (R.DOUBLE_END + 10) * (0.95 + Math.random() * 0.1);
    return polarToSVG(angle, r);
  }
  if (segment.number === 25) {
    if (segment.multiplier === 2) {
      const angle = Math.random() * 360;
      const r = R.DOUBLE_BULL * Math.random() * 0.7;
      return polarToSVG(angle, r);
    }
    const angle = Math.random() * 360;
    const r = R.DOUBLE_BULL + (R.SINGLE_BULL - R.DOUBLE_BULL) * (0.3 + Math.random() * 0.5);
    return polarToSVG(angle, r);
  }
  const idx = BOARD_NUMBERS.indexOf(segment.number);
  if (idx === -1) return { x: CENTER, y: CENTER };
  const segAngle = 18;
  const baseAngle = idx * segAngle;
  const angleOffset = (Math.random() - 0.5) * segAngle * 0.6;
  const angle = baseAngle + angleOffset;

  let radius: number;
  switch (segment.multiplier) {
    case 3:
      radius = (R.TRIPLE_START + R.TRIPLE_END) / 2 + (Math.random() - 0.5) * (R.TRIPLE_END - R.TRIPLE_START) * 0.5;
      break;
    case 2:
      radius = (R.DOUBLE_START + R.DOUBLE_END) / 2 + (Math.random() - 0.5) * (R.DOUBLE_END - R.DOUBLE_START) * 0.5;
      break;
    default:
      radius = R.SINGLE_BULL + (R.TRIPLE_START - R.SINGLE_BULL) * (0.2 + Math.random() * 0.6);
      break;
  }

  return polarToSVG(angle, radius);
}

export default function Dartboard({ onSegmentClick, disabled = false, markers = [], spectatorMode = false }: DartboardProps) {
  const [lastTapped, setLastTapped] = useState<string | null>(null);

  // ---- Stable marker position cache ----
  // Positions are computed once per marker ID and stored in a Map.
  // When new markers arrive, only the new ones get positions computed.
  // Existing markers keep their original positions — no shifting.
  const positionCacheRef = useRef<Map<number, { x: number; y: number }>>(new Map());

  const markerPositions = useMemo(() => {
    const cache = positionCacheRef.current;

    // If markers is empty, clear the cache (new turn)
    if (markers.length === 0) {
      cache.clear();
      return [];
    }

    // Compute positions only for new markers
    for (const m of markers) {
      if (!cache.has(m.id)) {
        cache.set(m.id, segmentToSVGPosition(m.segment));
      }
    }

    // Clean up stale entries (IDs no longer in markers)
    const currentIds = new Set(markers.map(m => m.id));
    Array.from(cache.keys()).forEach(key => {
      if (!currentIds.has(key)) cache.delete(key);
    });

    return markers.map(m => ({
      ...cache.get(m.id)!,
      id: m.id,
      segment: m.segment,
    }));
  }, [markers]);

  const totalMarkers = markerPositions.length;

  const segmentAngle = 360 / 20;

  const segments = useMemo(() => {
    const result: Array<{
      path: string; segment: DartSegment; color: string; zone: string; key: string;
    }> = [];

    BOARD_NUMBERS.forEach((num, idx) => {
      const startAngle = idx * segmentAngle - segmentAngle / 2;
      const endAngle = startAngle + segmentAngle;
      const isEven = idx % 2 === 0;

      result.push({
        path: createArcPath(startAngle, endAngle, R.DOUBLE_START, R.DOUBLE_END),
        segment: createSegment(num, 2), color: isEven ? COLORS.red : COLORS.green,
        zone: 'double', key: `d-${num}`,
      });
      result.push({
        path: createArcPath(startAngle, endAngle, R.TRIPLE_END, R.DOUBLE_START),
        segment: createSegment(num, 1), color: isEven ? COLORS.black : COLORS.white,
        zone: 'outer-single', key: `os-${num}`,
      });
      result.push({
        path: createArcPath(startAngle, endAngle, R.TRIPLE_START, R.TRIPLE_END),
        segment: createSegment(num, 3), color: isEven ? COLORS.red : COLORS.green,
        zone: 'triple', key: `t-${num}`,
      });
      result.push({
        path: createArcPath(startAngle, endAngle, R.SINGLE_BULL, R.TRIPLE_START),
        segment: createSegment(num, 1), color: isEven ? COLORS.black : COLORS.white,
        zone: 'inner-single', key: `is-${num}`,
      });
    });
    return result;
  }, []);

  const handleClick = useCallback((segment: DartSegment, key: string) => {
    if (disabled || spectatorMode || !onSegmentClick) return;
    setLastTapped(key);
    setTimeout(() => setLastTapped(null), 300);
    onSegmentClick(segment);
  }, [disabled, spectatorMode, onSegmentClick]);

  const handleMissClick = useCallback(() => {
    if (disabled || spectatorMode || !onSegmentClick) return;
    setLastTapped('miss');
    setTimeout(() => setLastTapped(null), 300);
    onSegmentClick(MISS);
  }, [disabled, spectatorMode, onSegmentClick]);

  const isInteractive = !disabled && !spectatorMode && !!onSegmentClick;

  return (
    <div className="w-full aspect-square max-w-[400px] mx-auto relative">
      <svg
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        className="w-full h-full select-none touch-none"
        style={{ filter: disabled && !spectatorMode ? 'brightness(0.5)' : 'drop-shadow(0 0 24px rgba(0, 255, 136, 0.12))' }}
      >
        {/* Miss area */}
        <circle cx={CENTER} cy={CENTER} r={CENTER} fill="#060608"
          onClick={handleMissClick} className={isInteractive ? 'cursor-pointer' : ''} />

        {/* Board rim */}
        <circle cx={CENTER} cy={CENTER} r={R.DOUBLE_END + 3} fill="none" stroke="#222" strokeWidth="3" />

        {/* Segments */}
        {segments.map(seg => {
          const isTapped = lastTapped === seg.key;
          return (
            <g key={seg.key}>
              <path d={seg.path} fill={seg.color} stroke={COLORS.wire} strokeWidth="0.6"
                className={isInteractive ? 'cursor-pointer' : ''}
                onClick={() => handleClick(seg.segment, seg.key)} />
              {isTapped && <path d={seg.path} fill={COLORS.hover} stroke="none" pointerEvents="none" />}
            </g>
          );
        })}

        {/* Single bull */}
        <circle cx={CENTER} cy={CENTER} r={R.SINGLE_BULL} fill={COLORS.green}
          stroke={COLORS.wire} strokeWidth="0.6"
          className={isInteractive ? 'cursor-pointer' : ''}
          onClick={() => handleClick(SINGLE_BULL, 'sb')} />
        {lastTapped === 'sb' && <circle cx={CENTER} cy={CENTER} r={R.SINGLE_BULL} fill={COLORS.hover} pointerEvents="none" />}

        {/* Double bull */}
        <circle cx={CENTER} cy={CENTER} r={R.DOUBLE_BULL} fill={COLORS.red}
          stroke={COLORS.wire} strokeWidth="0.6"
          className={isInteractive ? 'cursor-pointer' : ''}
          onClick={() => handleClick(DOUBLE_BULL, 'db')} />
        {lastTapped === 'db' && <circle cx={CENTER} cy={CENTER} r={R.DOUBLE_BULL} fill={COLORS.hover} pointerEvents="none" />}

        {/* Number labels */}
        {BOARD_NUMBERS.map((num, idx) => {
          const angle = idx * segmentAngle;
          const pos = polarToSVG(angle, R.DOUBLE_END + 15);
          return (
            <text key={`n-${num}`} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central"
              fill={COLORS.numbers} fontSize="15" fontFamily="'Space Grotesk', sans-serif" fontWeight="700"
              pointerEvents="none">
              {num}
            </text>
          );
        })}

        {/* Glow ring */}
        <circle cx={CENTER} cy={CENTER} r={R.DOUBLE_END + 1} fill="none" stroke="rgba(0,255,136,0.12)" strokeWidth="1.5" />

        {/* Dart markers for AI visualization */}
        {markerPositions.map((marker, idx) => {
          const isNewest = idx === totalMarkers - 1;
          // Earlier darts are dimmer; newest is full brightness
          const dimOpacity = isNewest ? 1.0 : 0.35;
          const dotColor = isNewest ? '#00ff88' : '#00ff88';
          const labelColor = isNewest ? '#00ff88' : 'rgba(0,255,136,0.5)';
          const dotSize = isNewest ? 6 : 4;
          const innerDotSize = isNewest ? 2.5 : 1.5;

          return (
            <g key={marker.id} opacity={dimOpacity}>
              {/* Impact ring animation — only on newest dart */}
              {isNewest && (
                <circle cx={marker.x} cy={marker.y} r="4" fill="none"
                  stroke="rgba(0,255,136,0.7)" strokeWidth="2">
                  <animate attributeName="r" from="4" to="20" dur="0.6s" fill="freeze" />
                  <animate attributeName="opacity" from="0.9" to="0" dur="0.6s" fill="freeze" />
                </circle>
              )}
              {/* Dart point — outer glow */}
              <circle cx={marker.x} cy={marker.y} r={dotSize} fill={dotColor}>
                {isNewest && (
                  <>
                    <animate attributeName="r" from="0" to={String(dotSize)} dur="0.25s" fill="freeze" />
                    <animate attributeName="opacity" from="0" to="1" dur="0.2s" fill="freeze" />
                  </>
                )}
              </circle>
              {/* Dart point — inner white */}
              <circle cx={marker.x} cy={marker.y} r={innerDotSize} fill="#fff">
                {isNewest && (
                  <>
                    <animate attributeName="r" from="0" to={String(innerDotSize)} dur="0.25s" fill="freeze" />
                    <animate attributeName="opacity" from="0" to="1" dur="0.2s" fill="freeze" />
                  </>
                )}
              </circle>
              {/* Dart number label */}
              <text x={marker.x} y={marker.y - 12} textAnchor="middle" dominantBaseline="auto"
                fill={labelColor} fontSize={isNewest ? '11' : '9'} fontFamily="'Space Grotesk', sans-serif"
                fontWeight="700" pointerEvents="none">
                {marker.segment.label}
                {isNewest && (
                  <animate attributeName="opacity" from="0" to="1" dur="0.25s" begin="0.15s" fill="freeze" />
                )}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tap feedback overlay (interactive mode only) */}
      {lastTapped && isInteractive && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm border border-neon/30 px-3 py-1 rounded-lg text-xs font-display font-bold text-neon pointer-events-none z-10 animate-in fade-in duration-150">
          {lastTapped === 'miss' ? 'MISS' :
           lastTapped === 'sb' ? '25' :
           lastTapped === 'db' ? 'BULL (50)' :
           (() => {
             const seg = segments.find(s => s.key === lastTapped);
             return seg ? `${seg.segment.label} (${seg.segment.score})` : '';
           })()}
        </div>
      )}
    </div>
  );
}
