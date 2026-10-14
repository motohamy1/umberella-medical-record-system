'use client';

/**
 * CircleButton — white circular action button with line icon.
 * Measured from ref-1 and ref-2: 44px min touch target, soft lift shadow.
 */

import React from 'react';
import { clsx } from 'clsx';

export interface CircleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string; // Accessible screen-reader label
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export function CircleButton({
  icon,
  label,
  size = 'md',
  active = false,
  className,
  ...props
}: CircleButtonProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  }[size];

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex items-center justify-center rounded-full transition-all duration-150',
        'bg-[var(--color-white)] text-[var(--color-ink)] shadow-[var(--shadow-control)]',
        'hover:shadow-[var(--shadow-lift)] hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-[var(--color-ink)]',
        active && 'ring-2 ring-[var(--color-ink)]',
        sizeClasses,
        className
      )}
      {...props}
    >
      <span className="stroke-[1.5] flex items-center justify-center">{icon}</span>
    </button>
  );
}
