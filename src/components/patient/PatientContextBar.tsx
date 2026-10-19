'use client';

/**
 * PatientContextBar — Compact patient context bar for non-Overview tabs.
 * Specification: docs/PACK.md §6.3 & §6.5
 * Displays: avatar, name, "Sex · Age", MRN, and a critical-allergy chip when one exists.
 */

import React from 'react';
import { clsx } from 'clsx';
import { User, AlertTriangle } from 'lucide-react';
import type { Patient, Allergy } from '@/data/types';

interface PatientContextBarProps {
  patient: Patient;
  criticalAllergy?: Allergy | null;
  onAllergyClick?: () => void;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function PatientContextBar({
  patient,
  criticalAllergy,
  onAllergyClick,
  className,
}: PatientContextBarProps) {
  return (
    <div
      className={clsx(
        'w-full flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-[16px] bg-[var(--color-surface)] border border-black/5 shadow-2xs mb-4',
        className
      )}
      data-testid="patient-context-bar"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-[var(--color-surface-subtle)] border border-black/10 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
          {patient.photoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={patient.photoPath}
              alt={patient.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="text-xs font-bold text-[var(--color-ink)]">
              {getInitials(patient.name)}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
          <span className="text-sm font-bold text-[var(--color-ink)] truncate">
            {patient.name}
          </span>
          <span className="text-xs text-[var(--color-ink-muted)]">
            {patient.sex} · {patient.age} yrs
          </span>
          <span className="text-xs font-mono text-[var(--color-ink-muted)]">
            {patient.mrn}
          </span>
        </div>
      </div>

      {criticalAllergy && (
        <button
          type="button"
          onClick={onAllergyClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-status-critical)]/15 border border-[var(--color-status-critical)]/40 text-[var(--color-ink)] text-xs font-semibold hover:bg-[var(--color-status-critical)]/25 transition-colors cursor-pointer"
          title={`Critical allergy alert: ${criticalAllergy.substance}`}
          data-testid="context-critical-allergy-chip"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--color-status-critical)] animate-pulse" />
          <AlertTriangle className="w-3 h-3 text-[var(--color-status-critical)]" />
          <span>
            Critical: {criticalAllergy.substance} ({criticalAllergy.reaction})
          </span>
        </button>
      )}
    </div>
  );
}
