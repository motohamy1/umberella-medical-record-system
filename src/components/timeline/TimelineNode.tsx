'use client';

/**
 * TimelineNode — Axis node marks for the clinical timeline.
 * Variants:
 *  - milestone: accent circle with document icon
 *  - child: white circle with kind icon and optional accent badge
 *  - dot: small neutral grey dot on axis
 *  - endNode: dark ink circle with "+" at end of timeline axis
 */

import React from 'react';
import { clsx } from 'clsx';
import { FileText, Plus } from 'lucide-react';

export type TimelineNodeVariant = 'milestone' | 'child' | 'dot' | 'endNode';

export interface TimelineNodeProps {
  variant: TimelineNodeVariant;
  size?: 'sm' | 'md' | 'lg'; // 28px (L1), 36px (L3), 44px (L2)
  icon?: React.ReactNode;
  badgeCount?: number;
  label?: string;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function TimelineNode({
  variant,
  size = 'md',
  icon,
  badgeCount,
  label,
  isSelected = false,
  onClick,
  className,
}: TimelineNodeProps) {
  if (variant === 'dot') {
    return (
      <div
        className={clsx(
          'w-2 h-2 rounded-full bg-[var(--color-ink-soft)] transition-all duration-200 hover:scale-150',
          isSelected && 'scale-150 bg-[var(--color-accent-neon)] ring-2 ring-[var(--color-ink)]',
          className
        )}
        title={label}
      />
    );
  }

  if (variant === 'endNode') {
    return (
      <button
        type="button"
        aria-label={label || 'Add event'}
        onClick={onClick}
        className={clsx(
          'w-9 h-9 rounded-full bg-[var(--color-ink)] text-[var(--color-white)] flex items-center justify-center',
          'shadow-sm hover:scale-110 active:scale-95 transition-all duration-200 ease-[var(--motion-easing-standard)] select-none',
          className
        )}
      >
        <Plus className="w-4 h-4 stroke-[2]" />
      </button>
    );
  }

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  }[size];

  if (variant === 'milestone') {
    return (
      <button
        type="button"
        aria-label={label || 'Visit milestone'}
        onClick={onClick}
        className={clsx(
          'relative rounded-full bg-[var(--color-accent)] text-[var(--color-ink)] flex items-center justify-center',
          'border-2 border-[var(--color-ink)] shadow-sm hover:scale-110 select-none',
          'transition-all duration-200 ease-[var(--motion-easing-standard)]',
          isSelected && 'scale-115 ring-3 ring-[var(--color-accent-neon)] ring-offset-2 ring-offset-[var(--color-canvas)] shadow-lift z-10',
          sizeClasses,
          className
        )}
      >
        {icon || <FileText className="w-4 h-4" />}
        {badgeCount && badgeCount > 1 && (
          <span className="absolute -top-1 -end-1 px-1.5 py-0.2 rounded-full bg-[var(--color-ink)] text-[var(--color-white)] text-[10px] font-bold">
            {badgeCount}
          </span>
        )}
      </button>
    );
  }

  // child variant
  return (
    <button
      type="button"
      aria-label={label || 'Timeline event'}
      onClick={onClick}
      className={clsx(
        'relative rounded-full bg-[var(--color-white)] text-[var(--color-ink)] flex items-center justify-center',
        'border border-[var(--color-ink-soft)]/40 shadow-xs hover:shadow-sm hover:scale-105 select-none',
        'transition-all duration-200 ease-[var(--motion-easing-standard)]',
        isSelected && 'scale-115 ring-3 ring-[var(--color-accent-neon)] ring-offset-2 ring-offset-[var(--color-canvas)] shadow-lift z-10',
        sizeClasses,
        className
      )}
    >
      {icon}
      {badgeCount && badgeCount > 1 && (
        <span className="absolute -top-1 -end-1 px-1.5 py-0.2 rounded-full bg-[var(--color-accent)] text-[var(--color-ink)] text-[10px] font-bold border border-[var(--color-ink)]">
          {badgeCount}
        </span>
      )}
    </button>
  );
}
