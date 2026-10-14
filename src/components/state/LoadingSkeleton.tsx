'use client';

/**
 * LoadingSkeleton — Token-based designed skeleton states.
 * No generic spinning wheels; uses pulsing surface cards.
 */

import React from 'react';
import { clsx } from 'clsx';

export interface LoadingSkeletonProps {
  variant?: 'card' | 'folder' | 'row' | 'timeline';
  count?: number;
  className?: string;
}

export function LoadingSkeleton({
  variant = 'card',
  count = 1,
  className,
}: LoadingSkeletonProps) {
  const items = Array.from({ length: count });

  if (variant === 'folder') {
    return (
      <div className={clsx('grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4', className)}>
        {items.map((_, i) => (
          <div
            key={i}
            className="h-48 rounded-[var(--radius-card)] bg-[var(--color-surface)]/70 animate-pulse p-4 flex flex-col justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-ink-soft)]/30" />
              <div className="flex-1 space-y-2">
                <div className="w-24 h-3 rounded bg-[var(--color-ink-soft)]/30" />
                <div className="w-36 h-4 rounded bg-[var(--color-ink-soft)]/40" />
              </div>
            </div>
            <div className="space-y-2 pt-4 border-t border-[var(--color-ink-soft)]/20">
              <div className="w-full h-3 rounded bg-[var(--color-ink-soft)]/20" />
              <div className="w-2/3 h-3 rounded bg-[var(--color-ink-soft)]/20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'row') {
    return (
      <div className={clsx('space-y-2', className)}>
        {items.map((_, i) => (
          <div
            key={i}
            className="h-10 rounded-[var(--radius-pill)] bg-[var(--color-surface)]/60 animate-pulse flex items-center px-4"
          >
            <div className="w-20 h-3 rounded bg-[var(--color-ink-soft)]/30" />
            <div className="w-40 h-3 ms-4 rounded bg-[var(--color-ink-soft)]/20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={clsx('space-y-3', className)}>
      {items.map((_, i) => (
        <div
          key={i}
          className="h-32 rounded-[var(--radius-card)] bg-[var(--color-surface-raised)] animate-pulse p-4 flex flex-col justify-between"
        >
          <div className="w-32 h-4 rounded bg-[var(--color-ink-soft)]/30" />
          <div className="w-full h-12 rounded bg-[var(--color-surface)]/80" />
        </div>
      ))}
    </div>
  );
}
