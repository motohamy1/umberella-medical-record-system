'use client';

/**
 * PermissionDeniedState — Access control denial feedback.
 */

import React from 'react';
import { clsx } from 'clsx';
import { ShieldAlert } from 'lucide-react';

export interface PermissionDeniedStateProps {
  title?: string;
  message?: string;
  className?: string;
}

export function PermissionDeniedState({
  title = 'Access Restricted',
  message = 'You do not have permission to view or edit this clinical section.',
  className,
}: PermissionDeniedStateProps) {
  return (
    <div
      role="alert"
      className={clsx(
        'w-full py-12 px-6 rounded-[var(--radius-card)] bg-[var(--color-surface)]/50',
        'border border-[var(--color-ink-soft)]/30 flex flex-col items-center justify-center text-center',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[var(--color-surface)] text-[var(--color-ink-muted)] flex items-center justify-center mb-3 shadow-xs">
        <ShieldAlert className="w-6 h-6 stroke-[1.5]" />
      </div>

      <h3 className="text-base font-semibold text-[var(--color-ink)] mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] max-w-sm">
        {message}
      </p>
    </div>
  );
}
