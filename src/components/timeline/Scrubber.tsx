'use client';

/**
 * Scrubber — History density scrubber track (ref-2).
 * White pill track, density dots, year labels, dark window overlay.
 * Controls zoom in/out with CircleButtons.
 */

import React from 'react';
import { clsx } from 'clsx';
import { Plus, Minus } from 'lucide-react';
import { CircleButton } from '../primitives/CircleButton';

export interface ScrubberProps {
  years?: string[];
  windowPosition?: number; // 0 to 100 percentage
  windowWidth?: number; // 10 to 100 percentage
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  className?: string;
}

export function Scrubber({
  years = ['2024', '2025', '2026'],
  windowPosition = 40,
  windowWidth = 35,
  onZoomIn,
  onZoomOut,
  className,
}: ScrubberProps) {
  return (
    <div className={clsx('flex items-center gap-3 w-full', className)}>
      {/* Zoom buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <CircleButton
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          label="Zoom in"
          onClick={onZoomIn}
        />
        <CircleButton
          size="sm"
          icon={<Minus className="w-3.5 h-3.5" />}
          label="Zoom out"
          onClick={onZoomOut}
        />
      </div>

      {/* Scrubber track */}
      <div className="relative flex-1 h-11 bg-[var(--color-white)] rounded-[var(--radius-pill)] border border-[var(--color-ink-soft)]/30 overflow-hidden flex flex-col justify-between px-4 py-1.5 shadow-xs select-none">
        {/* Synthetic density dots */}
        <div className="flex items-center justify-between w-full h-4 opacity-75">
          {Array.from({ length: 48 }).map((_, i) => {
            const height = (i % 5 === 0 ? 3 : (i % 3 === 0 ? 2 : 1));
            return (
              <div key={i} className="flex flex-col gap-0.5 items-center">
                {Array.from({ length: height }).map((_, d) => (
                  <span
                    key={d}
                    className="w-1 h-1 rounded-full bg-[var(--color-ink-soft)]"
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Dark visible window overlay */}
        <div
          style={{
            left: `${windowPosition}%`,
            width: `${windowWidth}%`,
          }}
          className="absolute top-1 bottom-1 rounded-[var(--radius-pill)] bg-[var(--color-ink)]/90 backdrop-blur-xs flex items-center justify-between px-2 cursor-grab active:cursor-grabbing shadow-sm border border-[var(--color-ink)]"
        >
          <span className="w-1 h-3 rounded-full bg-[var(--color-white)]/60" />
          <span className="text-[10px] font-mono font-medium text-[var(--color-white)] select-none">
            Zoomed View
          </span>
          <span className="w-1 h-3 rounded-full bg-[var(--color-white)]/60" />
        </div>

        {/* Year labels at bottom */}
        <div className="flex justify-between items-center text-[10px] text-[var(--color-ink-muted)] font-medium pt-0.5 border-t border-[var(--color-ink-soft)]/20">
          {years.map((y) => (
            <span key={y}>{y}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
