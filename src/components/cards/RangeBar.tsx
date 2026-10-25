'use client';

/**
 * RangeBar — Lab reference range bar (PACK.md §4.5 #10, ref-2).
 * Hatched neutral track with thin colored segments:
 * [ Low | Borderline Low | Normal Target | Borderline High | High ]
 * Clear "Normal Range" indicator per Egyptian clinical laboratory standards.
 * Dark ink marker dot positioned at true measured value.
 */

import React from 'react';
import { clsx } from 'clsx';

export interface RangeBarProps {
  label?: string;
  value: number | string;
  unit?: string;
  min?: number;
  max?: number;
  lowThreshold?: number;
  highThreshold?: number;
  referenceLow?: number;
  referenceHigh?: number;
  showLabels?: boolean;
  className?: string;
}

export function RangeBar({
  label,
  value,
  unit = '',
  min,
  max,
  lowThreshold,
  highThreshold,
  referenceLow,
  referenceHigh,
  showLabels = true,
  className,
}: RangeBarProps) {
  const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value;

  // Resolve thresholds
  const low = lowThreshold !== undefined ? lowThreshold : referenceLow !== undefined ? referenceLow : 0;
  const high = highThreshold !== undefined ? highThreshold : referenceHigh !== undefined ? referenceHigh : 100;

  // Resolve min and max bounds with sensible visual padding
  const autoMin = min !== undefined ? min : Math.max(0, Math.floor(low - (high - low) * 0.4));
  const autoMax = max !== undefined ? max : Math.ceil(high + (high - low) * 0.4);

  const span = autoMax - autoMin > 0 ? autoMax - autoMin : 1;

  // Normalize percentage within min-max clamp
  const clampedValue = Math.min(Math.max(numericValue, autoMin), autoMax);
  const percent = ((clampedValue - autoMin) / span) * 100;

  // 5 Zones: Low, Borderline Low, Normal Target, Borderline High, High
  const normalRange = high - low;
  const borderlineWidth = normalRange * 0.15;

  const lowBound = low;
  const borderlineLowBound = low + borderlineWidth;
  const borderlineHighBound = high - borderlineWidth;
  const highBound = high;

  const lowPercent = Math.max(0, Math.min(100, ((lowBound - autoMin) / span) * 100));
  const borderlineLowPercent = Math.max(0, Math.min(100, ((borderlineLowBound - autoMin) / span) * 100));
  const borderlineHighPercent = Math.max(0, Math.min(100, ((borderlineHighBound - autoMin) / span) * 100));
  const highPercent = Math.max(0, Math.min(100, ((highBound - autoMin) / span) * 100));

  const isLow = numericValue < low;
  const isHigh = numericValue > high;
  const isBorderline = (numericValue >= low && numericValue < borderlineLowBound) || (numericValue > borderlineHighBound && numericValue <= high);

  return (
    <div className={clsx('flex flex-col gap-1 py-1 w-full font-[\'Inter\',sans-serif]', className)}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-semibold text-[var(--color-ink)] truncate">{label}</span>}
          <div className="flex items-baseline gap-1 shrink-0 ml-auto">
            <span
              className={clsx(
                'font-bold',
                isLow || isHigh
                  ? 'text-[var(--color-status-critical)]'
                  : isBorderline
                  ? 'text-[var(--color-status-warning)]'
                  : 'text-[var(--color-ink)]'
              )}
            >
              {value}
            </span>
            {unit && <span className="text-[11px] text-[var(--color-ink-muted)]">{unit}</span>}
          </div>
        </div>
      )}

      {/* 5-Zone Hatched Range Bar Track */}
      <div className="relative w-full h-3 rounded-full bg-[var(--color-surface)] overflow-hidden flex shadow-inner border border-black/5 bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.03),rgba(0,0,0,0.03)_3px,transparent_3px,transparent_6px)]">
        {/* 1. Low zone */}
        <div
          style={{ width: `${lowPercent}%` }}
          className="h-full bg-rose-500/30"
          title={`Low (< ${low})`}
        />
        {/* 2. Borderline Low zone */}
        <div
          style={{ width: `${Math.max(0, borderlineLowPercent - lowPercent)}%` }}
          className="h-full bg-amber-400/30"
          title={`Borderline Low (${low} - ${borderlineLowBound.toFixed(1)})`}
        />
        {/* 3. Normal Target zone */}
        <div
          style={{ width: `${Math.max(0, borderlineHighPercent - borderlineLowPercent)}%` }}
          className="h-full bg-emerald-500/35 border-x border-white/60"
          title={`Normal Target (${borderlineLowBound.toFixed(1)} - ${borderlineHighBound.toFixed(1)})`}
        />
        {/* 4. Borderline High zone */}
        <div
          style={{ width: `${Math.max(0, highPercent - borderlineHighPercent)}%` }}
          className="h-full bg-amber-400/30"
          title={`Borderline High (${borderlineHighBound.toFixed(1)} - ${high})`}
        />
        {/* 5. High zone */}
        <div
          style={{ width: `${Math.max(0, 100 - highPercent)}%` }}
          className="h-full bg-rose-500/30"
          title={`High (> ${high})`}
        />

        {/* Dark Ink Marker Dot with White Ring */}
        <div
          style={{ left: `${percent}%` }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[var(--color-ink)] border-2 border-white shadow-xs transition-all duration-300 pointer-events-none"
          title={`Observed Value: ${value} ${unit}`}
        />
      </div>

      {showLabels && (
        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--color-ink-muted)]">
          <span className="text-[9.5px] font-semibold text-[var(--color-ink)]">
            Normal Range: {low} – {high} {unit}
          </span>
          <span className="text-[9px] text-[var(--color-ink-muted)]">
            Scale: {autoMin}–{autoMax}
          </span>
        </div>
      )}
    </div>
  );
}
