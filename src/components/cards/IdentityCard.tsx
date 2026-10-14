'use client';

/**
 * IdentityCard — Left patient identity card in Overview (ref-2).
 * Surface fill, rounded avatar, demographics, and context rows with ↗ buttons.
 */

import React from 'react';
import { clsx } from 'clsx';
import { ArrowUpRight, User } from 'lucide-react';
import { CircleButton } from '../primitives/CircleButton';

export interface ContextRowItem {
  id: string;
  label: string;
  value: string;
  onOpen?: () => void;
}

export interface IdentityCardProps {
  name: string;
  sexAndAge: string;
  mrn?: string;
  photoUrl?: string;
  criticalAllergy?: string;
  contextRows?: ContextRowItem[];
  className?: string;
}

export function IdentityCard({
  name,
  sexAndAge,
  mrn,
  photoUrl,
  criticalAllergy,
  contextRows = [],
  className,
}: IdentityCardProps) {
  return (
    <article
      className={clsx(
        'bg-[var(--color-surface)] rounded-[var(--radius-card)] p-4 sm:p-5 flex flex-col justify-between shadow-sm',
        className
      )}
    >
      <div>
        {/* Top identity block */}
        <div className="flex items-start gap-3.5 mb-3">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-white)] flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-[var(--color-ink-soft)]/20">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-7 h-7 text-[var(--color-ink-muted)] stroke-[1.5]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wider">
              {sexAndAge}
            </p>
            <h1 className="text-lg sm:text-xl font-bold text-[var(--color-ink)] truncate leading-tight mt-0.5">
              {name}
            </h1>
            {mrn && (
              <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 font-mono">
                {mrn}
              </p>
            )}
          </div>
        </div>

        {criticalAllergy && (
          <div className="mb-3 px-2.5 py-1 bg-[var(--color-status-critical)]/15 text-[var(--color-ink)] rounded-[var(--radius-pill)] border border-[var(--color-status-critical)]/40 text-xs font-semibold flex items-center gap-1.5 w-fit">
            <span className="w-2 h-2 rounded-full bg-[var(--color-status-critical)]" />
            <span>{criticalAllergy}</span>
          </div>
        )}
      </div>

      {/* Stacked context rows */}
      {contextRows.length > 0 && (
        <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-[var(--color-ink-soft)]/20">
          {contextRows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--color-white)]/70 hover:bg-[var(--color-white)] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  {row.label}
                </span>
                <span className="block text-xs sm:text-sm font-semibold text-[var(--color-ink)] truncate">
                  {row.value}
                </span>
              </div>
              {row.onOpen && (
                <CircleButton
                  size="sm"
                  icon={<ArrowUpRight className="w-3 h-3" />}
                  label={`Open ${row.label}`}
                  onClick={row.onOpen}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
