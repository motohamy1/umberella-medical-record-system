'use client';

/**
 * ModuleCard — Container card in surfaceRaised with shallow shadow.
 * Carries top title, optional up-right arrow CircleButton, and optional center handle hump (ref-2).
 */

import React from 'react';
import { clsx } from 'clsx';
import { ArrowUpRight } from 'lucide-react';
import { CircleButton } from '../primitives/CircleButton';

export interface ModuleCardProps {
  title?: string;
  badge?: React.ReactNode;
  onExpand?: () => void;
  expandLabel?: string;
  hasHandleHump?: boolean;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function ModuleCard({
  title,
  badge,
  onExpand,
  expandLabel = 'Expand details',
  hasHandleHump = false,
  children,
  className,
  contentClassName,
}: ModuleCardProps) {
  return (
    <section
      className={clsx(
        'relative bg-[var(--color-surface-raised)] rounded-[var(--radius-card)]',
        'p-4 sm:p-5 shadow-[var(--shadow-raised)] flex flex-col',
        className
      )}
    >
      {/* Top center gentle handle hump from ref-2 */}
      {hasHandleHump && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-[var(--color-ink-soft)]/50 rounded-full" />
      )}

      {(title || onExpand || badge) && (
        <header className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            {title && (
              <h2 className="text-base sm:text-lg font-medium text-[var(--color-ink)] tracking-tight">
                {title}
              </h2>
            )}
            {badge}
          </div>

          {onExpand && (
            <CircleButton
              size="sm"
              icon={<ArrowUpRight className="w-3.5 h-3.5" />}
              label={expandLabel}
              onClick={onExpand}
            />
          )}
        </header>
      )}

      <div className={clsx('flex-1', contentClassName)}>{children}</div>
    </section>
  );
}
