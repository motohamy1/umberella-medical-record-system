'use client';

/**
 * PillTabs — Fully rounded tab strip for workspace navigation.
 * Active pill in white, inactive in surface.
 * Plain horizontal scroll on narrow viewports without arrow overlays or masks.
 */

import React from 'react';
import { clsx } from 'clsx';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface PillTabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
}

export function PillTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className,
}: PillTabsProps<T>) {
  return (
    <nav
      aria-label="Tabs"
      className={clsx(
        'flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-full',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-pill)] text-xs sm:text-sm font-medium transition-all duration-150 whitespace-nowrap select-none',
              isActive
                ? 'bg-[var(--color-white)] text-[var(--color-ink)] shadow-[var(--shadow-control)]'
                : 'bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-white)]/80',
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {tab.icon && <span className="w-3.5 h-3.5 flex items-center justify-center">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
