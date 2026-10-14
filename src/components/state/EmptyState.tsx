'use client';

/**
 * EmptyState — Designed empty state with relevant add/create action.
 * Never a blank panel (hard rule §10.1).
 */

import React from 'react';
import { clsx } from 'clsx';
import { Plus, Inbox } from 'lucide-react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'w-full py-12 px-6 rounded-[var(--radius-card)] bg-[var(--color-surface)]/40',
        'border border-dashed border-[var(--color-ink-soft)]/50',
        'flex flex-col items-center justify-center text-center',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-ink-muted)] mb-3 shadow-xs">
        {icon || <Inbox className="w-6 h-6 stroke-[1.5]" />}
      </div>

      <h3 className="text-base font-semibold text-[var(--color-ink)] mb-1">{title}</h3>
      {description && (
        <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] max-w-sm mb-4">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-pill)] bg-[var(--color-accent)] text-[var(--color-ink)] font-semibold text-xs sm:text-sm shadow-xs hover:shadow-sm active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2]" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
