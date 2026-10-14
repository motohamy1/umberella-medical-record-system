'use client';

/**
 * ErrorState — Error feedback state with retry action.
 */

import React from 'react';
import { clsx } from 'clsx';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Retry',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={clsx(
        'w-full py-10 px-6 rounded-[var(--radius-card)] bg-[var(--color-surface)]/70',
        'border border-[var(--color-status-critical)]/40 flex flex-col items-center justify-center text-center',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[var(--color-status-critical)]/15 text-[var(--color-ink)] flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6 stroke-[1.5]" />
      </div>

      <h3 className="text-base font-semibold text-[var(--color-ink)] mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] max-w-sm mb-4">
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-pill)] bg-[var(--color-white)] text-[var(--color-ink)] font-semibold text-xs sm:text-sm shadow-xs hover:shadow-sm active:scale-95 border border-[var(--color-ink-soft)]/40 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 stroke-[2]" />
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  );
}
