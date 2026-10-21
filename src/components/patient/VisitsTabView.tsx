'use client';

/**
 * VisitsTabView — Dedicated clinical encounter management view (Slice S9).
 * Specification: docs/PACK.md §11 (S9), docs/design/pages.md §6.5
 * 
 * Features:
 * - Grouped by month (Month heading + RecordRows, visit tint)
 * - Three-segment encounter detail sheet: [ Before · During · After ]
 * - Before: Chief complaint, pre-visit checklist, scheduled time, patient context
 * - During: Objective vitals taken at visit (BP, Pulse, SpO2, Temp, Glucose), SOAP clinical notes
 * - After: Post-encounter summary, orders & prescriptions, Care Plan, follow-up date, clinician verification
 * - "+ New Visit" schedule/record sheet
 * - Empty state for baseline patient (Nour El-Sayed p-007)
 */

import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Calendar,
  Clock,
  Plus,
  ArrowRight,
  User,
  Activity,
  FileText,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  ClipboardList,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Patient, Visit, VitalObservation, VisitStage, VisitStatus } from '@/data/types';
import { OverlaySheet } from '@/components/overlays/OverlaySheet';
import { TelehealthRoomModal } from '@/components/telehealth/TelehealthRoomModal';
import { en } from '@/i18n/en';

interface VisitsTabViewProps {
  patientId: string;
  patientName: string;
  patient?: Patient;
  visits: Visit[];
  vitals?: VitalObservation[];
  onShowOnTimeline?: (dateStr: string) => void;
  onRecordVisit?: (newVisit: {
    title: string;
    visitType: string;
    reason: string;
    notes?: string;
    plan?: string;
    occurredAt?: string;
  }) => Promise<void>;
  onUpdateVisitStage?: (visitId: string, stage: VisitStage, notes?: string) => Promise<void>;
  onUpdateVisitNotes?: (visitId: string, data: { notes?: string; plan?: string; followUpDate?: string }) => Promise<void>;
  className?: string;
}

export function VisitsTabView({
  patientId,
  patientName,
  patient,
  visits = [],
  vitals = [],
  onShowOnTimeline,
  onRecordVisit,
  onUpdateVisitStage,
  onUpdateVisitNotes,
  className,
}: VisitsTabViewProps) {
  const dict = en.visits;
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'in-progress' | 'scheduled'>('all');
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [encounterStage, setEncounterStage] = useState<VisitStage>('after');
  const [isNewVisitOpen, setIsNewVisitOpen] = useState(false);
  const [isTelehealthOpen, setIsTelehealthOpen] = useState(false);

  // New Visit form state
  const [newTitle, setNewTitle] = useState('');
  const [newVisitType, setNewVisitType] = useState('Routine Follow-up');
  const [newReason, setNewReason] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newPlan, setNewPlan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit notes state in Encounter Sheet
  const [editNotes, setEditNotes] = useState('');
  const [editPlan, setEditPlan] = useState('');
  const [editFollowUp, setEditFollowUp] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Filter visits
  const filteredVisits = useMemo(() => {
    if (filterStatus === 'all') return visits;
    return visits.filter((v) => v.status === filterStatus);
  }, [visits, filterStatus]);

  // Group visits chronologically by Month Year (e.g., "October 2026", "September 2026")
  const groupedVisits = useMemo(() => {
    const groups: { [key: string]: Visit[] } = {};
    for (const v of filteredVisits) {
      try {
        const d = new Date(v.occurredAt);
        const monthYear = !isNaN(d.getTime())
          ? d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
          : 'Other Dates';
        if (!groups[monthYear]) {
          groups[monthYear] = [];
        }
        groups[monthYear].push(v);
      } catch {
        if (!groups['Other Dates']) groups['Other Dates'] = [];
        groups['Other Dates'].push(v);
      }
    }
    return groups;
  }, [filteredVisits]);

  // Format date helper
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  // Open detail sheet handler
  const handleOpenVisitDetail = (visit: Visit) => {
    setSelectedVisit(visit);
    setEncounterStage(visit.stage || 'after');
    setEditNotes(visit.notes || '');
    setEditPlan(visit.plan || '');
    setEditFollowUp(visit.followUpDate || '4 weeks');
  };

  // Handle stage transition inside Encounter Sheet
  const handleAdvanceStage = async (targetStage: VisitStage) => {
    if (!selectedVisit || !onUpdateVisitStage) return;
    setIsSavingNotes(true);
    try {
      await onUpdateVisitStage(selectedVisit.id, targetStage, editNotes);
      setEncounterStage(targetStage);
      setSelectedVisit((prev) => (prev ? { ...prev, stage: targetStage } : null));
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Handle saving clinical notes
  const handleSaveNotes = async () => {
    if (!selectedVisit || !onUpdateVisitNotes) return;
    setIsSavingNotes(true);
    try {
      await onUpdateVisitNotes(selectedVisit.id, {
        notes: editNotes,
        plan: editPlan,
        followUpDate: editFollowUp,
      });
      setSelectedVisit((prev) =>
        prev
          ? {
              ...prev,
              notes: editNotes,
              plan: editPlan,
              followUpDate: editFollowUp,
            }
          : null
      );
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Handle create new visit
  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    setIsSubmitting(true);
    try {
      if (onRecordVisit) {
        await onRecordVisit({
          title: newTitle,
          visitType: newVisitType,
          reason: newReason || 'Routine clinical encounter',
          notes: newNotes,
          plan: newPlan,
        });
      }
      setIsNewVisitOpen(false);
      setNewTitle('');
      setNewReason('');
      setNewNotes('');
      setNewPlan('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Vitals linked to selected visit
  const visitVitals = useMemo(() => {
    if (!selectedVisit) return [];
    return vitals.filter((v) => v.visitId === selectedVisit.id);
  }, [vitals, selectedVisit]);

  return (
    <div className={clsx('flex flex-col gap-4 w-full', className)}>
      {/* ========================================================================= */}
      {/* 1. TOP BAR: TITLE, ENCOUNTER COUNT, STATUS PILLS & NEW VISIT BUTTON       */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filters */}
          <div className="inline-flex items-center p-1 rounded-full bg-[var(--color-surface)] border border-black/5 shadow-xs">
            {(['all', 'completed', 'in-progress', 'scheduled'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-semibold transition-all select-none capitalize',
                  filterStatus === st
                    ? 'bg-[var(--color-ink)] text-[var(--color-white)] shadow-xs'
                    : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                )}
              >
                {st === 'all'
                  ? dict.all
                  : st === 'completed'
                  ? dict.completed
                  : st === 'in-progress'
                  ? dict.inProgress
                  : dict.scheduled}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono font-medium text-[var(--color-ink-muted)] px-2.5 py-1 rounded-full bg-white/60 border border-black/5 shadow-2xs">
            {filteredVisits.length} {dict.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTelehealthOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-stone-900 hover:bg-black active:scale-98 text-xs font-bold text-white shadow-xs transition-all cursor-pointer select-none"
            data-testid="start-telehealth-btn"
          >
            <Video className="w-3.5 h-3.5 text-emerald-400 stroke-[2.2]" />
            <span>Start Telehealth Consult</span>
          </button>
          <button
            type="button"
            onClick={() => setIsNewVisitOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-accent-neon)] hover:brightness-105 active:scale-98 text-xs font-bold text-[var(--color-ink)] shadow-xs transition-all cursor-pointer select-none"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{dict.scheduleVisit}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CHRONOLOGICAL VISITS LIST GROUPED BY MONTH                              */}
      {/* ========================================================================= */}
      {Object.keys(groupedVisits).length === 0 ? (
        <div className="bg-[var(--color-surface-subtle)] rounded-2xl p-8 border border-white/60 shadow-xs flex flex-col items-center justify-center text-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-ink-muted)]">
            <Stethoscope className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-[var(--color-ink)] mt-1">
            {dict.noVisits}
          </h4>
          <p className="text-xs text-[var(--color-ink-muted)] max-w-sm">
            {dict.noVisitsDesc}
          </p>
          <button
            type="button"
            onClick={() => setIsNewVisitOpen(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-ink)] text-white text-xs font-semibold shadow-xs hover:bg-black transition-all"
          >
            <Plus className="w-3 h-3" />
            <span>{dict.scheduleVisit}</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {Object.entries(groupedVisits).map(([monthYear, monthVisits]) => (
            <div key={monthYear} className="flex flex-col gap-2.5">
              {/* Month Heading */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  {monthYear}
                </span>
                <span className="h-px flex-1 bg-black/10" />
                <span className="text-[10px] font-mono font-medium text-[var(--color-ink-muted)]">
                  {monthVisits.length} {monthVisits.length === 1 ? 'visit' : 'visits'}
                </span>
              </div>

              {/* Month Visit Rows */}
              <div className="flex flex-col gap-2">
                {monthVisits.map((visit) => {
                  const stage = visit.stage || 'after';
                  const isCompleted = visit.status === 'completed';

                  return (
                    <div
                      key={visit.id}
                      onClick={() => handleOpenVisitDetail(visit)}
                      role="button"
                      tabIndex={0}
                      className="bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface)] rounded-2xl p-4 border border-white/80 hover:border-black/15 shadow-xs transition-all cursor-pointer flex flex-col gap-2.5 group select-none"
                    >
                      {/* Row Header: Date Capsule, Title, Stage, Clinician, Arrow */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {/* Date capsule */}
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-xs font-mono font-semibold text-[var(--color-ink)] border border-black/5 shadow-2xs">
                            <Calendar className="w-3 h-3 text-[var(--color-ink-muted)]" />
                            <span>{formatDate(visit.occurredAt)}</span>
                          </div>

                          {/* Title */}
                          <span className="text-sm font-bold text-[var(--color-ink)] group-hover:text-black">
                            {visit.title}
                          </span>

                          {/* Visit Type Tag */}
                          <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface)] text-[11px] font-mono font-medium text-[var(--color-ink-muted)] border border-black/5">
                            {visit.visitType}
                          </span>

                          {/* Three-segment Stage Pill Indicator */}
                          <div className="inline-flex items-center p-0.5 rounded-full bg-stone-200/60 text-[10px] font-bold">
                            <span
                              className={clsx(
                                'px-2 py-0.5 rounded-full transition-all',
                                stage === 'before'
                                  ? 'bg-amber-400 text-stone-900 shadow-2xs'
                                  : 'text-stone-500'
                              )}
                            >
                              {dict.before}
                            </span>
                            <span
                              className={clsx(
                                'px-2 py-0.5 rounded-full transition-all',
                                stage === 'during'
                                  ? 'bg-[var(--color-accent-neon)] text-[var(--color-ink)] shadow-2xs'
                                  : 'text-stone-500'
                              )}
                            >
                              {dict.during}
                            </span>
                            <span
                              className={clsx(
                                'px-2 py-0.5 rounded-full transition-all',
                                stage === 'after'
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'text-stone-500'
                              )}
                            >
                              {dict.after}
                            </span>
                          </div>
                        </div>

                        {/* Right: Clinician & Arrow */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--color-ink-muted)] flex items-center gap-1">
                            <User className="w-3 h-3 text-[var(--color-ink-muted)]" />
                            <span>{visit.createdBy || 'Dr. Tarek'}</span>
                          </span>

                          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink)] group-hover:translate-x-0.5 transition-all shadow-2xs">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      {/* Row Content: Chief Complaint & Notes summary */}
                      {visit.reason && (
                        <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
                          <span className="font-semibold text-[var(--color-ink)]">{dict.reason}:</span>
                          <span className="truncate">{visit.reason}</span>
                        </div>
                      )}

                      {/* Bottom strip: Vitals Preview if recorded at visit */}
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-[var(--color-ink-muted)] pt-1 border-t border-black/5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Verified Clinical Encounter
                          </span>
                          <span>·</span>
                          <span>{visit.notes ? `${visit.notes.slice(0, 80)}...` : 'Encounter evaluated'}</span>
                        </div>

                        {onShowOnTimeline && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onShowOnTimeline(visit.occurredAt);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-ink)] hover:underline"
                          >
                            <Calendar className="w-3 h-3 text-[var(--color-ink-muted)]" />
                            <span>Show on timeline</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL: VISIT DETAIL SHEET [ BEFORE · DURING · AFTER ]                   */}
      {/* ========================================================================= */}
      <OverlaySheet
        isOpen={Boolean(selectedVisit)}
        onClose={() => setSelectedVisit(null)}
        title={selectedVisit ? `${selectedVisit.title} (${formatDate(selectedVisit.occurredAt)})` : 'Encounter Details'}
        className="max-w-2xl"
      >
        {selectedVisit && (
          <div className="flex flex-col gap-4 p-4 sm:p-6 font-['Inter',sans-serif]">
            {/* Header Stage Switcher: [ Before · During · After ] */}
            <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-[var(--color-surface)] border border-black/5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider">
                  {dict.workflowState}
                </span>
                <span className="text-xs text-[var(--color-ink-muted)]">
                  {dict.clinician}: <strong>{selectedVisit.createdBy || 'Dr. Tarek'}</strong>
                </span>
              </div>

              {/* 3-Segment Switcher */}
              <div className="grid grid-cols-3 gap-1 bg-stone-200/70 p-1 rounded-xl">
                {(['before', 'during', 'after'] as const).map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setEncounterStage(stage)}
                    className={clsx(
                      'py-1.5 rounded-lg text-xs font-bold transition-all select-none flex items-center justify-center gap-1.5 cursor-pointer',
                      encounterStage === stage
                        ? 'bg-white text-[var(--color-ink)] shadow-xs'
                        : 'text-stone-600 hover:text-black'
                    )}
                  >
                    <span>
                      {stage === 'before'
                        ? dict.before
                        : stage === 'during'
                        ? dict.during
                        : dict.after}
                    </span>
                    {selectedVisit.stage === stage && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-neon)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* =================================================================== */}
            {/* STAGE 1: BEFORE                                                     */}
            {/* =================================================================== */}
            {encounterStage === 'before' && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3 text-xs"
              >
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900">
                  <h4 className="font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-800" />
                    <span>Pre-Consultation Clinical Intake & Triage</span>
                  </h4>
                  <p className="text-[11.5px] text-amber-800/90 mt-1">
                    Scheduled encounter with {patientName}. Review clinical baseline and chief complaint before initiating examination.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-bold text-[var(--color-ink)]">{dict.reason}:</span>
                  <div className="p-3 rounded-xl bg-white border border-black/10 text-stone-800">
                    {selectedVisit.reason || 'Routine follow-up consultation'}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-bold text-[var(--color-ink)]">Pre-visit Checklist:</span>
                  <div className="p-3 rounded-xl bg-white border border-black/10 flex flex-col gap-1.5 text-stone-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Identification & MRN validated</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Allergy reconciliation confirmed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Consent on file</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleAdvanceStage('during')}
                    disabled={isSavingNotes}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-accent-neon)] text-[var(--color-ink)] font-bold text-xs shadow-xs hover:brightness-105 active:scale-98"
                  >
                    <span>Advance to Encounter (During)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* =================================================================== */}
            {/* STAGE 2: DURING (OBJECTIVE VITALS & SOAP CLINICAL NOTES)              */}
            {/* =================================================================== */}
            {encounterStage === 'during' && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3.5 text-xs"
              >
                {/* Vitals Taken at Visit */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-600" />
                      <span>{dict.vitalsTaken}</span>
                    </span>
                    <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">
                      Nurse Intake Telemetry
                    </span>
                  </div>

                  {visitVitals.length === 0 ? (
                    <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-black/5 text-stone-500 text-center">
                      No vitals recorded specifically for this visit ID. Standard clinical telemetry active on Overview tab.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {visitVitals.map((vit) => (
                        <div
                          key={vit.id}
                          className="p-2.5 rounded-xl bg-white border border-black/5 shadow-2xs flex flex-col"
                        >
                          <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase">
                            {vit.metric}
                          </span>
                          <span className="text-sm font-bold text-[var(--color-ink)] mt-0.5">
                            {vit.value} <span className="text-xs font-normal text-[var(--color-ink-muted)]">{vit.unit}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SOAP Clinical Notes Editor */}
                <div className="flex flex-col gap-1.5">
                  <span className="font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>{dict.notes} (SOAP Format)</span>
                  </span>
                  <textarea
                    rows={4}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Enter subjective history, objective exam findings, and clinical assessment..."
                    className="w-full p-3 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)] leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-black/5">
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="px-3.5 py-1.5 rounded-full bg-white hover:bg-stone-50 border border-black/10 text-xs font-semibold text-[var(--color-ink)] shadow-2xs"
                  >
                    {isSavingNotes ? 'Saving...' : dict.saveNotes}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAdvanceStage('after')}
                    disabled={isSavingNotes}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xs hover:bg-emerald-700 active:scale-98"
                  >
                    <span>{dict.completeEncounter} (After)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* =================================================================== */}
            {/* STAGE 3: AFTER (PLAN, ORDERS & CLINICIAN SIGNATURE)                  */}
            {/* =================================================================== */}
            {encounterStage === 'after' && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3.5 text-xs"
              >
                {/* Clinical Notes Recap */}
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-[var(--color-ink)]">{dict.notes}:</span>
                  <div className="p-3 rounded-xl bg-white border border-black/10 text-stone-800 leading-relaxed whitespace-pre-wrap">
                    {editNotes || selectedVisit.notes || 'Routine encounter verified.'}
                  </div>
                </div>

                {/* Care Plan & Prescriptions */}
                <div className="flex flex-col gap-1.5">
                  <span className="font-bold text-[var(--color-ink)]">{dict.plan}:</span>
                  <textarea
                    rows={2}
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value)}
                    placeholder="Document care plan, titration orders, or dietary recommendations..."
                    className="w-full p-2.5 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
                  />
                </div>

                {/* Follow-up date */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-[var(--color-ink)]">{dict.followUp}:</label>
                  <input
                    type="text"
                    value={editFollowUp}
                    onChange={(e) => setEditFollowUp(e.target.value)}
                    placeholder="e.g. 4 weeks - HbA1c re-evaluation"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
                  />
                </div>

                {/* Clinician Signature & Stamp */}
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <span className="font-bold block">{dict.verifiedBy}</span>
                      <span className="text-[11px] text-emerald-800">
                        Dr. Tarek · Nile Care Attending Physician · RLS Locked
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-[10px] font-mono font-bold text-emerald-800">
                    STAGE: AFTER
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-black/5">
                  {onShowOnTimeline && (
                    <button
                      type="button"
                      onClick={() => {
                        onShowOnTimeline(selectedVisit.occurredAt);
                        setSelectedVisit(null);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-ink)] hover:underline"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
                      <span>Show this encounter on timeline</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="px-4 py-2 rounded-full bg-[var(--color-ink)] text-white font-bold text-xs shadow-xs hover:bg-black active:scale-98"
                  >
                    {isSavingNotes ? 'Saving...' : 'Save & Close'}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </OverlaySheet>

      {/* ========================================================================= */}
      {/* 4. MODAL: SCHEDULE / RECORD NEW VISIT                                     */}
      {/* ========================================================================= */}
      <OverlaySheet
        isOpen={isNewVisitOpen}
        onClose={() => setIsNewVisitOpen(false)}
        title={dict.newVisitTitle}
        className="max-w-md"
      >
        <form onSubmit={handleCreateVisit} className="flex flex-col gap-4 p-4 sm:p-6 text-xs">
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-[var(--color-ink)]">
              Encounter Title *
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Routine Follow-up, Comprehensive Review"
              className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-[var(--color-ink)]">
              {dict.visitType}
            </label>
            <select
              value={newVisitType}
              onChange={(e) => setNewVisitType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
            >
              <option value="Routine Follow-up">{dict.routineFollowUp}</option>
              <option value="New Patient">{dict.newPatient}</option>
              <option value="Urgent Care">{dict.urgentCare}</option>
              <option value="Telehealth Consult">{dict.telehealth}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-[var(--color-ink)]">
              {dict.chiefComplaint}
            </label>
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="e.g. Chronic hypertension follow-up and glycemic review"
              className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-[var(--color-ink)]">
              {dict.notes} (Optional)
            </label>
            <textarea
              rows={2}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Initial clinical notes..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
            <button
              type="button"
              onClick={() => setIsNewVisitOpen(false)}
              className="px-3.5 py-1.5 rounded-full font-semibold text-[var(--color-ink-muted)] hover:bg-black/5"
            >
              {dict.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-full bg-[var(--color-accent-neon)] text-[var(--color-ink)] font-bold shadow-xs hover:brightness-105 active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : dict.saveVisit}
            </button>
          </div>
        </form>
      </OverlaySheet>

      {/* Phase L4: Telehealth Video Consultation Room */}
      <TelehealthRoomModal
        isOpen={isTelehealthOpen}
        onClose={() => setIsTelehealthOpen(false)}
        patient={
          patient || {
            id: patientId,
            name: patientName,
            orgId: 'org-nile',
            mrn: `MRN-${patientId}`,
            sex: 'Other',
            age: 40,
            dateOfBirth: '1984-01-01',
            status: 'Needs review',
            phone: '+20 100 000 0000',
            primaryConcern: 'Clinical consultation',
            lastVisitDate: '2026-10-14',
            createdAt: '',
            updatedAt: '',
          }
        }
        visit={selectedVisit || visits[0]}
        onUpdateVisitStage={onUpdateVisitStage}
        onUpdateVisitNotes={onUpdateVisitNotes}
      />
    </div>
  );
}
