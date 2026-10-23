'use client';

/**
 * NotchHeader — dark plum band across the top of the workspace.
 * Tab on start edge carries screen title from copy deck and optional close button.
 * Controls, search, or pill tabs sit on the plum band to the right of the tab.
 */

import React from 'react';
import { clsx } from 'clsx';
import { CircleButton } from './CircleButton';
import { X } from 'lucide-react';

export interface NotchHeaderProps {
  title: string;
  onClose?: () => void;
  closeAriaLabel?: string;
  controls?: React.ReactNode;
  className?: string;
}

export function NotchHeader({
  title,
  onClose,
  closeAriaLabel = 'Close',
  controls,
  className,
}: NotchHeaderProps) {
  return (
    <header
      className={clsx(
        'relative w-full bg-[var(--color-canvas)] text-[var(--color-ink)] min-h-[58px] z-40 border-b border-[var(--color-ink-soft)]/20',
        'flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3.5 sm:px-8 py-1.5',
        className
      )}
    >
      <div className="flex items-center gap-3 shrink-0">
        {onClose && (
          <CircleButton
            size="sm"
            icon={<X className="w-3.5 h-3.5" />}
            label={closeAriaLabel}
            onClick={onClose}
            className="text-[var(--color-ink)]"
          />
        )}
        <h1 className="font-semibold text-sm sm:text-base tracking-tight select-none text-[var(--color-ink)]">
          {title}
        </h1>
      </div>

      {/* Controls on the header — wrap onto their own row when they don't fit */}
      <div className="flex flex-wrap justify-end items-center gap-2 py-1">
        {controls}
      </div>
    </header>
  );
}
