'use client';

/**
 * NextUpCard — Section 6.7 Patient Home: Next Up.
 * Next due medication from active care plan.
 * Flat line icon in a white circle (NO 3D pill, NO clock illustration).
 * Caption, medication name + strength in large text, instruction, and primary "Log taken" button.
 * Empty state: "Nothing due right now".
 */

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Pill, CheckCircle2, Sparkles } from 'lucide-react';
import { ModuleCard } from '@/components/cards/ModuleCard';
import type { Medication } from '@/data/types';
import type { CopyDeck } from '@/i18n';
import { en } from '@/i18n/en';

interface NextUpCardProps {
  medication?: Medication | null;
  onLogTaken?: (medicationId: string, medicationName: string) => Promise<void>;
  dict?: CopyDeck['patientHome'];
  className?: string;
}

export function NextUpCard({
  medication,
  onLogTaken,
  dict = en.patientHome,
  className,
}: NextUpCardProps) {
  const [isLogging, setIsLogging] = useState(false);
  const [isLoggedToday, setIsLoggedToday] = useState(false);

  const handleLog = async () => {
    if (!medication || isLogging || isLoggedToday) return;
    try {
      setIsLogging(true);
      if (onLogTaken) {
        await onLogTaken(medication.id, `${medication.name} ${medication.strength}`);
      }
      setIsLoggedToday(true);
    } finally {
      setIsLogging(false);
    }
  };

  const hasDueMed = Boolean(medication && !isLoggedToday);

  return (
    <ModuleCard
      title={dict.nextUp}
      className={clsx('h-full flex flex-col justify-between', className)}
      data-testid="next-up-card"
    >
      {hasDueMed && medication ? (
        <div className="flex flex-col justify-between h-full pt-1 pb-1">
          <div className="flex items-start gap-4">
            {/* Flat line icon in a white circle (NO 3D pill, NO clock illustration) */}
            <div className="w-12 h-12 rounded-full bg-[var(--color-surface)] border border-black/5 flex items-center justify-center text-[var(--color-ink)] shadow-2xs shrink-0">
              <Pill className="w-5 h-5 stroke-[1.75]" />
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider block">
                {dict.medicationReminder}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-[var(--color-ink)] leading-tight mt-1 truncate">
                {medication.name} <span className="font-medium text-lg text-[var(--color-ink-muted)]">{medication.strength}</span>
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] mt-1.5 leading-relaxed">
                {medication.instructions || 'Take 1 tablet daily with meals'}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-black/5">
            <span className="text-xs font-mono text-[var(--color-ink-muted)]">
              Oral · Daily Morning Regimen
            </span>

            <button
              type="button"
              onClick={handleLog}
              disabled={isLogging}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-accent-neon)] text-[var(--color-ink)] font-bold text-xs sm:text-sm shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              data-testid="log-taken-button"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2]" />
              <span>{isLogging ? 'Logging...' : dict.logTaken}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="py-8 flex flex-col items-center justify-center text-center h-full">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 mb-3 shadow-2xs">
            <CheckCircle2 className="w-6 h-6 stroke-[2]" />
          </div>
          <h4 className="text-base font-bold text-[var(--color-ink)] mb-1">
            {isLoggedToday ? dict.doseLogged : dict.nothingDue}
          </h4>
          <p className="text-xs text-[var(--color-ink-muted)] max-w-xs">
            {isLoggedToday
              ? 'Today\'s scheduled dose has been recorded into your clinical care timeline.'
              : 'All scheduled pharmacotherapy doses are currently up to date.'}
          </p>
        </div>
      )}
    </ModuleCard>
  );
}
