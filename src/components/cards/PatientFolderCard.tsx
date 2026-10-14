'use client';

/**
 * PatientFolderCard — Skeuomorphic folder card representing a patient on Provider Home (§6.2).
 * Shows back panel MRN tab, front card with avatar, name, sex/age, status badge,
 * last visit, and primary concern.
 */

import React from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { ArrowUpRight } from 'lucide-react';
import type { Patient, PatientStatus } from '@/data/types';

export interface PatientFolderCardProps {
  patient: Patient;
  className?: string;
}

export function PatientFolderCard({ patient, className }: PatientFolderCardProps) {
  const getStatusBadge = (status: PatientStatus) => {
    switch (status) {
      case 'Critical':
        return 'bg-[var(--color-ink)] text-[var(--color-white)]';
      case 'Needs review':
        return 'border border-[var(--color-ink)] text-[var(--color-ink)] bg-transparent';
      case 'Follow-up':
        return 'bg-[var(--color-accent)] text-[var(--color-ink)] font-semibold';
      case 'New':
      case 'Stable':
      default:
        return 'bg-[var(--color-surface)] text-[var(--color-ink)]';
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className={clsx(
        'relative group flex flex-col rounded-[var(--radius-card)] transition-transform duration-150 hover:-translate-y-0.5',
        className
      )}
    >
      {/* Back tab: MRN */}
      <div className="flex items-center ps-4">
        <div className="px-3 py-1 bg-[var(--color-surface)] rounded-t-lg border-t border-x border-[var(--color-ink-soft)]/30 text-[10px] font-mono font-bold text-[var(--color-ink-muted)]">
          {patient.mrn}
        </div>
      </div>

      {/* Main Front Folder Card */}
      <div className="relative bg-[var(--color-surface-raised)] rounded-[var(--radius-card)] p-4 shadow-sm border border-[var(--color-ink-soft)]/25 flex flex-col justify-between min-h-[168px]">
        {/* Top: Avatar, Name & Status */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-[var(--color-white)] border border-[var(--color-ink-soft)]/20 flex items-center justify-center font-bold text-xs text-[var(--color-ink)] shrink-0 shadow-xs">
                {getInitials(patient.name)}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-[var(--color-ink)] truncate leading-tight">
                  {patient.name}
                </h3>
                <span className="text-[11px] text-[var(--color-ink-muted)]">
                  {patient.sex} · {patient.age}y
                </span>
              </div>
            </div>

            <span
              className={clsx(
                'px-2 py-0.5 rounded-[var(--radius-pill)] text-[10px] font-semibold shrink-0 select-none',
                getStatusBadge(patient.status)
              )}
            >
              {patient.status}
            </span>
          </div>

          {/* Hairline divider */}
          <div className="my-2.5 border-t border-[var(--color-ink-soft)]/15" />

          {/* Details: Last visit & Primary concern */}
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--color-ink-muted)]">Last visit:</span>
              <span className="font-medium text-[var(--color-ink)]">{patient.lastVisitDate}</span>
            </div>
            <div className="flex items-start justify-between text-[11px] gap-2">
              <span className="text-[var(--color-ink-muted)] shrink-0">Concern:</span>
              <span className="font-medium text-[var(--color-ink)] text-end truncate">
                {patient.primaryConcern}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Action: Open Workspace */}
        <div className="pt-2 mt-2 border-t border-[var(--color-ink-soft)]/15 flex justify-end">
          <Link
            href={`/clinic/patients/${patient.id}`}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-ink)] hover:underline"
          >
            <span>Open workspace</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
