'use client';

/**
 * AppFrame — Dark plum rounded outer frame enclosing the clinical workspace.
 * Uses banded depth structure: top/bottom bands in frame, sides in frameSide.
 * Inner workspace is canvas.
 */

import React from 'react';
import { clsx } from 'clsx';

export interface AppFrameProps {
  children: React.ReactNode;
  className?: string;
  margin?: boolean; // For desktop preview/letterboxing per D5
}

export function AppFrame({ children, className }: AppFrameProps) {
  return (
    <div
      className={clsx(
        'w-full min-h-screen flex flex-col bg-[var(--color-canvas)] text-[var(--color-ink)] overflow-x-hidden',
        className
      )}
    >
      {children}
    </div>
  );
}
