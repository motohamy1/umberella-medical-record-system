'use client';

/**
 * FilterRow — Round filter-sliders button followed by multi-select category pills.
 * Selected pills are white, unselected are surface.
 * Sliders button resets all filters.
 */

import React from 'react';
import { clsx } from 'clsx';
import { SlidersHorizontal } from 'lucide-react';
import { CircleButton } from './CircleButton';

export interface FilterItem<T extends string = string> {
  id: T;
  label: string;
}

export interface FilterRowProps<T extends string = string> {
  items: FilterItem<T>[];
  selected: T[];
  onToggle: (id: T) => void;
  onReset: () => void;
  resetLabel?: string;
  className?: string;
}

export function FilterRow<T extends string = string>({
  items,
  selected,
  onToggle,
  onReset,
  resetLabel = 'Reset filters',
  className,
}: FilterRowProps<T>) {
  return (
    <div className={clsx('flex items-center gap-2 overflow-x-auto py-1 scrollbar-none', className)}>
      <CircleButton
        size="sm"
        icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
        label={resetLabel}
        onClick={onReset}
        className={selected.length > 0 ? 'ring-2 ring-[var(--color-ink)]' : undefined}
      />

      <div className="flex items-center gap-1.5">
        {items.map((item) => {
          const isSelected = selected.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(item.id)}
              className={clsx(
                'px-3 py-1 rounded-[var(--radius-pill)] text-xs sm:text-sm font-medium transition-all duration-150 select-none whitespace-nowrap',
                isSelected
                  ? 'bg-[var(--color-white)] text-[var(--color-ink)] shadow-[var(--shadow-control)] font-semibold'
                  : 'bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-white)]/60'
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
