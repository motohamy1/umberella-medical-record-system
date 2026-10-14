'use client';

/**
 * RangeBar — Lab reference range bar (ref-2).
 * Hatched neutral track with low/normal/high colored zones.
 * Dark marker dot positioned at actual value.
 */

import React from 'react';
import { clsx } from 'clsx';

export interface RangeBarProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  lowThreshold: number;
  highThreshold: number;
  className?: string;
}

export function RangeBar({
  label,
  value,
  unit,
  min,
  max,
  lowThreshold,
  highThreshold,
  className,
}: RangeBarProps) {
  // Normalize percentage within min-max clamp
  const clampedValue = Math.min(Math.max(value, min), max);
  const percent = ((clampedValue - min) / (max - min)) * 100;

  const lowPercent = ((lowThreshold - min) / (max - min)) * 100;
  const highPercent = ((highThreshold - min) / (max - min)) * 100;

  const isLow = value < lowThreshold;
  const isHigh = value > highThreshold;

  return (
    <div className={clsx('flex flex-col gap-1.5 py-1', className)}>
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <span className="font-medium text-[var(--color-ink)]">{label}</span>
        <div className="flex items-baseline gap-1">
          <span
            className={clsx(
              'font-bold',
              isLow || isHigh ? 'text-[var(--color-status-warning)]' : 'text-[var(--color-ink)]'
            )}
          >
            {value}
          </span>
          <span className="text-xs text-[var(--color-ink-muted)]">{unit}</span>
        </div>
      </div>

      {/* Range bar track */}
      <div className="relative w-full h-3 rounded-full bg-[var(--color-surface)] overflow-hidden flex shadow-inner">
        {/* Low zone */}
        <div
          style={{ width: `${lowPercent}%` }}
          className="h-full bg-[var(--color-status-warning)]/40"
          title={`Low: < ${lowThreshold}`}
        />
        {/* Normal target zone */}
        <div
          style={{ width: `${highPercent - lowPercent}%` }}
          className="h-full bg-[var(--color-status-success)]/40 border-x border-[var(--color-white)]/60"
          title={`Normal: ${lowThreshold} - ${highThreshold}`}
        />
        {/* High zone */}
        <div
          style={{ width: `${100 - highPercent}%` }}
          className="h-full bg-[var(--color-status-critical)]/40"
          title={`High: > ${highThreshold}`}
        />

        {/* Marker dot */}
        <div
          style={{ left: `${percent}%` }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[var(--color-ink)] border-2 border-[var(--color-white)] shadow-xs transition-all duration-300"
          title={`Value: ${value} ${unit}`}
        />
      </div>

      <div className="flex justify-between text-[10px] text-[var(--color-ink-muted)]">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}
