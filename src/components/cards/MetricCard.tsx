'use client';

/**
 * MetricCard — Zoomed-in timeline metric card (ref-1).
 * Title, ↗ button, sparkline with accent fill,
 * reading pill, period average, and delta pill with metric unit.
 */

import React from 'react';
import { clsx } from 'clsx';
import { ArrowUpRight } from 'lucide-react';
import { CircleButton } from '../primitives/CircleButton';

export interface MetricCardProps {
  title: string;
  currentReading: string | number;
  unit: string;
  periodLabel?: string;
  averageValue: string | number;
  deltaValue: string; // e.g. "+10 mmHg" or "-4 bpm" (ALWAYS with unit!)
  deltaDirection?: 'improving' | 'worsening' | 'neutral';
  onExpand?: () => void;
  className?: string;
}

export function MetricCard({
  title,
  currentReading,
  unit,
  periodLabel = 'Last 14 days',
  averageValue,
  deltaValue,
  deltaDirection = 'neutral',
  onExpand,
  className,
}: MetricCardProps) {
  return (
    <article
      className={clsx(
        'w-[268px] bg-[var(--color-surface-raised)] rounded-[var(--radius-card)] p-4 shadow-sm flex flex-col justify-between border border-[var(--color-ink-soft)]/20',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="font-semibold text-sm text-[var(--color-ink)]">{title}</h3>
          <span className="text-[11px] text-[var(--color-ink-muted)]">{periodLabel}</span>
        </div>
        {onExpand && (
          <CircleButton
            size="sm"
            icon={<ArrowUpRight className="w-3 h-3" />}
            label={`Expand ${title}`}
            onClick={onExpand}
          />
        )}
      </div>

      {/* Sparkline & Current Reading */}
      <div className="py-2 flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-[var(--color-ink)] leading-none">
            {currentReading}
          </span>
          <span className="text-xs text-[var(--color-ink-muted)]">{unit}</span>
        </div>

        {/* Decorative mini sparkline curve */}
        <svg className="w-20 h-7 overflow-visible" viewBox="0 0 80 28" fill="none">
          <path
            d="M 2 22 Q 20 8, 40 18 T 78 6"
            stroke="var(--color-ink)"
            strokeWidth="1.5"
            fill="none"
          />
          <circle cx="78" cy="6" r="3.5" fill="var(--color-accent)" stroke="var(--color-ink)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Bottom stats: Average & Delta */}
      <div className="pt-2 border-t border-[var(--color-ink-soft)]/20 flex items-center justify-between text-xs">
        <span className="text-[var(--color-ink-muted)]">
          Avg: <strong className="text-[var(--color-ink)] font-semibold">{averageValue} {unit}</strong>
        </span>

        {/* Delta pill */}
        <span
          className={clsx(
            'px-2 py-0.5 rounded-[var(--radius-pill)] font-semibold text-[11px] flex items-center gap-1',
            deltaDirection === 'improving' && 'bg-[var(--color-accent)] text-[var(--color-ink)]',
            deltaDirection === 'worsening' && 'bg-[var(--color-status-critical)]/20 text-[var(--color-ink)]',
            deltaDirection === 'neutral' && 'bg-[var(--color-surface)] text-[var(--color-ink-muted)]'
          )}
        >
          {deltaDirection === 'worsening' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-status-critical)]" />
          )}
          {deltaValue}
        </span>
      </div>
    </article>
  );
}
