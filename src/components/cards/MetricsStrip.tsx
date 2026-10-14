'use client';

/**
 * MetricsStrip — Top vital metrics bar (ref-1).
 * Columns of small label over large value with unit.
 * Bottom caption line: "Recorded <date> by <name>".
 * Degree sign ONLY for temperature.
 */

import React from 'react';
import { clsx } from 'clsx';

export interface MetricItem {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  isDiagnosis?: boolean;
}

export interface MetricsStripProps {
  metrics: MetricItem[];
  recordedCaption?: string;
  className?: string;
}

export function MetricsStrip({
  metrics,
  recordedCaption,
  className,
}: MetricsStripProps) {
  return (
    <div
      className={clsx(
        'bg-[var(--color-surface)] rounded-[var(--radius-card)] p-4 sm:p-5 flex flex-col justify-between shadow-sm',
        className
      )}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 items-baseline">
        {metrics.map((m) => (
          <div key={m.id} className="flex flex-col">
            <span className="text-xs font-medium text-[var(--color-ink-muted)] mb-1">
              {m.label}
            </span>
            <div className="flex items-baseline gap-1">
              <span
                className={clsx(
                  'font-semibold text-[var(--color-ink)] leading-none',
                  m.isDiagnosis ? 'text-sm sm:text-base truncate' : 'text-xl sm:text-2xl font-light'
                )}
              >
                {m.value}
              </span>
              {m.unit && (
                <span className="text-xs font-normal text-[var(--color-ink-muted)]">
                  {m.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {recordedCaption && (
        <p className="text-xs text-[var(--color-ink-muted)] mt-4 pt-2 border-t border-[var(--color-ink-soft)]/20">
          {recordedCaption}
        </p>
      )}
    </div>
  );
}
