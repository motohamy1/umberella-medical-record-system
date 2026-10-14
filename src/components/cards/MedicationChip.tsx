'use client';

/**
 * MedicationChip — Medication mark for timeline and cards (ref-1).
 * Pill with white circular icon, medication name, and ×N doses/day multiplier.
 */

import React from 'react';
import { clsx } from 'clsx';
import { Pill } from 'lucide-react';

export interface MedicationChipProps {
  name: string;
  dosage?: string;
  dosesPerDay?: number;
  className?: string;
  onClick?: () => void;
}

export function MedicationChip({
  name,
  dosage,
  dosesPerDay = 1,
  className,
  onClick,
}: MedicationChipProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={clsx(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-pill)]',
        'bg-[var(--color-white)] text-[var(--color-ink)] border border-[var(--color-ink-soft)]/30',
        'shadow-xs text-xs sm:text-sm font-medium transition-all select-none',
        onClick && 'cursor-pointer hover:shadow-sm hover:scale-[1.02]',
        className
      )}
    >
      <span className="w-5 h-5 rounded-full bg-[var(--color-surface)] flex items-center justify-center shrink-0">
        <Pill className="w-3 h-3 text-[var(--color-ink)]" />
      </span>

      <span className="font-semibold text-[var(--color-ink)] truncate">{name}</span>
      {dosage && <span className="text-[var(--color-ink-muted)] text-xs">{dosage}</span>}

      {dosesPerDay > 1 && (
        <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-ink-muted)] text-[11px] font-mono font-bold">
          ×{dosesPerDay}
        </span>
      )}
    </div>
  );
}
