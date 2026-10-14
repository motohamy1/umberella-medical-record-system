'use client';

/**
 * RecordRow — Single row in Records card (ref-2).
 * Day number + month at start, followed by rounded pill with white circle icon.
 * Visits tinted with recordVisit token.
 */

import React from 'react';
import { clsx } from 'clsx';
import { Calendar, FileText, Activity } from 'lucide-react';

export type RecordKind = 'visit' | 'procedure' | 'lab' | 'document' | 'other';

export interface RecordRowProps {
  dateDay: string;
  dateMonth: string;
  title: string;
  kind?: RecordKind;
  isVisit?: boolean;
  onClick?: () => void;
  className?: string;
}

export function RecordRow({
  dateDay,
  dateMonth,
  title,
  kind = 'visit',
  isVisit = false,
  onClick,
  className,
}: RecordRowProps) {
  const getIcon = () => {
    switch (kind) {
      case 'visit':
        return <Calendar className="w-3.5 h-3.5 text-[var(--color-ink)]" />;
      case 'lab':
        return <Activity className="w-3.5 h-3.5 text-[var(--color-ink)]" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-[var(--color-ink)]" />;
    }
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={clsx(
        'flex items-center gap-3 py-1.5 transition-all text-sm group',
        onClick && 'cursor-pointer hover:opacity-90',
        className
      )}
    >
      {/* Date column */}
      <div className="w-12 shrink-0 text-start leading-tight">
        <span className="block font-bold text-sm text-[var(--color-ink)]">{dateDay}</span>
        <span className="block text-xs uppercase text-[var(--color-ink-muted)]">{dateMonth}</span>
      </div>

      {/* Pill with icon and title */}
      <div
        className={clsx(
          'flex-1 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-pill)] border transition-shadow',
          isVisit
            ? 'bg-[var(--color-record-visit)]/30 border-[var(--color-record-visit)] text-[var(--color-ink)]'
            : 'bg-[var(--color-surface)] border-[var(--color-ink-soft)]/30 text-[var(--color-ink)]'
        )}
      >
        <span className="w-6 h-6 rounded-full bg-[var(--color-white)] flex items-center justify-center shrink-0 shadow-xs">
          {getIcon()}
        </span>
        <span className="font-medium truncate">{title}</span>
      </div>
    </div>
  );
}
