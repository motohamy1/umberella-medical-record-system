'use client';

/**
 * PatientFolderCard — Skeuomorphic folder card representing a patient on Provider Home (§6.2).
 * Conforms faithfully to ref-5 folder silhouette with:
 * 1. Back panel flap: Neutral cardstock silhouette with sloping top-left tab carrying MRN (RTL-mirrored).
 * 2. Front pocket card in gray: Solid surface card holding patient avatar, untruncated name,
 *    demographics, color-coded status badges (Critical=Red, Follow-up=Yellow, Stable=Green),
 *    kebab menu, hairline divider, last visit date, primary concern, and workspace link.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import {
  MoreVertical,
  ArrowUpRight,
  Send,
  Check,
  Trash2,
} from 'lucide-react';
import type { Patient, PatientStatus } from '@/data/types';
import { sendPatientInviteAction, deletePatientAction } from '@/data/actions';
import { getDictionary, type Locale } from '@/i18n';

export interface PatientFolderCardProps {
  patient: Patient;
  className?: string;
  locale?: Locale;
  onOpenWorkspace?: (patientId: string) => void;
  onDeletePatient?: (patientId: string) => void | Promise<void>;
}

export function PatientFolderCard({
  patient,
  className,
  locale = 'en',
  onOpenWorkspace,
  onDeletePatient,
}: PatientFolderCardProps) {
  const router = useRouter();
  const dict = getDictionary(locale);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  const handleCardClick = (e: React.MouseEvent) => {
    if (menuRef.current && menuRef.current.contains(e.target as Node)) {
      return;
    }
    if (onOpenWorkspace) {
      onOpenWorkspace(patient.id);
    } else {
      router.push(`/clinic/patients/${patient.id}`);
    }
  };

  const handleSendInvite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await sendPatientInviteAction(patient.id);
      if (res.success) {
        setInviteSent(true);
        setTimeout(() => setIsMenuOpen(false), 800);
      }
    } catch (err) {
      console.error('Failed to send invite:', err);
    }
  };

  // Status badge colors: Critical = Red, Follow-up = Yellow, Stable = Green
  const getStatusBadge = (status: PatientStatus) => {
    switch (status) {
      case 'Critical':
        return 'bg-red-600 text-white font-bold shadow-2xs';
      case 'Follow-up':
        return 'bg-yellow-400 text-[var(--color-ink)] font-bold shadow-2xs';
      case 'Stable':
        return 'bg-emerald-600 text-white font-semibold shadow-2xs';
      case 'Needs review':
        return 'border border-amber-600 text-amber-800 bg-amber-50 font-semibold shadow-2xs';
      case 'New':
      default:
        return 'bg-[var(--color-white)] text-[var(--color-ink)] font-semibold border border-[var(--color-ink-soft)]/30 shadow-2xs';
    }
  };

  const getStatusLabel = (status: PatientStatus) => {
    switch (status) {
      case 'Critical':
        return dict.folder.statusCritical;
      case 'Needs review':
        return dict.folder.statusNeedsReview;
      case 'Follow-up':
        return dict.folder.statusFollowUp;
      case 'New':
        return dict.folder.statusNew;
      case 'Stable':
        return dict.folder.statusStable;
      default:
        return status;
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    const isGuide = patient.id === 'p-guide-001';
    const confirmed = window.confirm(
      isGuide
        ? 'Are you sure you want to remove this sample guide folder?'
        : `Are you sure you want to delete patient record for ${patient.name}?`
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      if (onDeletePatient) {
        await onDeletePatient(patient.id);
      } else {
        await deletePatientAction(patient.id);
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to delete patient:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={clsx(
        'group relative flex flex-col cursor-pointer select-none transition-all duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]',
        isMenuOpen && 'z-30',
        className
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(`/clinic/patients/${patient.id}`);
        }
      }}
      aria-label={`Patient folder for ${patient.name}, MRN ${patient.mrn}`}
    >
      {/* ── LAYER 1: BACK FOLDER FLAP (Authentic ref-5 folder silhouette) ── */}
      <svg
        className="absolute inset-0 w-full h-full text-[var(--color-frame)] drop-shadow-2xs pointer-events-none rtl:scale-x-[-1]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M 0 94 Q 0 100 6 100 L 94 100 Q 100 100 100 94 L 100 16 Q 100 12 94 12 L 56 12 C 49 12 45 0 39 0 L 6 0 Q 0 0 0 5 Z"
          fill="currentColor"
          stroke="var(--color-ink-soft)"
          strokeOpacity="0.4"
          strokeWidth="0.75"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* ── MRN Printed on Top-Left Back Tab (Mirrors in RTL) ── */}
      <div className="absolute top-1 start-2.5 sm:start-3 z-[1] flex items-center gap-1.5 font-mono text-[8px] sm:text-[8.5px] font-bold text-[var(--color-ink)] tracking-tight whitespace-nowrap">
        <span>{patient.mrn}</span>
        {patient.id === 'p-guide-001' && (
          <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-accent-lemon)] text-[var(--color-ink)] text-[7.5px] font-sans font-extrabold uppercase tracking-wide border border-black/10">
            Guide
          </span>
        )}
      </div>

      {/* ── LAYER 2: FRONT POCKET CARD IN GRAY (ref-5 front pocket & clinical data) ── */}
      <div className="relative mt-6 bg-[var(--color-surface)] rounded-[var(--radius-card)] p-3.5 sm:p-4 shadow-xs border border-[var(--color-ink-soft)]/30 flex flex-col justify-between z-[2] min-h-[168px] transition-all duration-200 group-hover:shadow-md">
        <div>
          {/* Row 1: Avatar, Full Patient Name, and Kebab Menu */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Initials Avatar */}
              <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full bg-[var(--color-white)] border border-[var(--color-ink-soft)]/35 flex items-center justify-center font-bold text-[11px] text-[var(--color-ink)] shrink-0 shadow-2xs">
                {getInitials(patient.name)}
              </div>
              {/* Patient Full Name with full horizontal space */}
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-[13px] text-[var(--color-ink)] leading-tight group-hover:text-[var(--color-ink)]" title={patient.name}>
                  <bdi dir="auto" className="block truncate text-start">
                    {patient.name}
                  </bdi>
                </h3>
              </div>
            </div>

            {/* Kebab Menu Button */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen((prev) => !prev);
                }}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-white)] transition-colors"
                aria-label="Patient options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div
                  className="absolute end-0 top-7 w-48 rounded-xl bg-[var(--color-white)] border border-[var(--color-ink-soft)]/30 shadow-lg py-1.5 z-50 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      router.push(`/clinic/patients/${patient.id}`);
                    }}
                    className="w-full px-3 py-1.5 text-start font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface)] flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
                    <span>{dict.folder.openWorkspace}</span>
                  </button>

                  {!patient.userId && (
                    <button
                      type="button"
                      onClick={handleSendInvite}
                      disabled={inviteSent}
                      className="w-full px-3 py-1.5 text-start font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface)] flex items-center gap-2 cursor-pointer"
                    >
                      {inviteSent ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Invite sent</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
                          <span>{dict.folder.sendInvite}</span>
                        </>
                      )}
                    </button>
                  )}

                  <div className="my-1 border-t border-[var(--color-ink-soft)]/20" />

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full px-3 py-1.5 text-start font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {isDeleting
                        ? 'Removing...'
                        : patient.id === 'p-guide-001'
                        ? 'Remove Sample Guide'
                        : 'Delete Patient'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Demographics on Left, Status Badge on Right */}
          <div className="flex items-center justify-between gap-1.5 mt-1.5 ps-[36px]">
            <span className="text-[11px] text-[var(--color-ink-muted)] leading-none">
              {patient.sex} · {patient.age}y
            </span>
            <span
              className={clsx(
                'px-2 py-0.5 rounded-[var(--radius-pill)] text-[9.5px] select-none shrink-0 tracking-tight leading-none font-semibold',
                getStatusBadge(patient.status)
              )}
            >
              {getStatusLabel(patient.status)}
            </span>
          </div>

          {/* Hairline divider */}
          <div className="my-2.5 border-t border-[var(--color-ink-soft)]/20" />

          {/* Two Clinical Rows: Last visit & Primary concern */}
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--color-ink-muted)]">{dict.folder.lastVisit}</span>
              <span className="font-semibold text-[var(--color-ink)]">{patient.lastVisitDate || 'None'}</span>
            </div>
            <div className="flex items-start justify-between text-[11px] gap-2">
              <span className="text-[var(--color-ink-muted)] shrink-0">{dict.folder.primaryConcern}</span>
              <span className="font-medium text-[var(--color-ink)] text-end truncate">
                {patient.primaryConcern}
              </span>
            </div>
          </div>
        </div>

        {/* Base Row: Folder Active & Quick Workspace Link */}
        <div className="pt-2 mt-2 border-t border-[var(--color-ink-soft)]/15 flex items-center justify-between text-[10px] text-[var(--color-ink-muted)]">
          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-ink-muted)]">
            FOLDER ACTIVE
          </span>
          <span className="inline-flex items-center gap-0.5 font-bold text-[var(--color-ink)] group-hover:underline">
            <span>{dict.schedule.openWorkspace}</span>
            <ArrowUpRight className="w-2.5 h-2.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
