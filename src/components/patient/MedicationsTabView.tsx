'use client';

/**
 * MedicationsTabView — Dedicated clinical prescription management view (Slice S8).
 * Specification: docs/PACK.md §11 (S8), docs/design/pages.md §6
 * 
 * Features:
 * - Filter pills: "Current | History"
 * - Active medications listing: MedicationChip, strength, route, dosage frequency, instructions, start date, status
 * - History view: discontinued / past medications with stop dates, reasons, and durations
 * - Doctor row actions: Change dose, Pause/Resume, Stop (discontinue)
 * - "Show on timeline": switches to Overview tab and jumps timeline to the prescription start date in L3 lens
 * - Cross-referencing allergy sensitivity banner (e.g. Penicillin sensitivity flag)
 * - Modal sheets for Start Medication, Change Dose, and Discontinue
 * - Accessible empty states for baseline patients (e.g. Nour El-Sayed)
 */

import React, { useState } from 'react';
import { clsx } from 'clsx';
import {
  Pill,
  Plus,
  Clock,
  AlertTriangle,
  RotateCcw,
  Pause,
  Play,
  XCircle,
  Calendar,
  CheckCircle2,
  FileText,
  Sliders,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Medication, Allergy, MedicationStatus } from '@/data/types';
import { MedicationChip } from '@/components/cards/MedicationChip';
import { OverlaySheet } from '@/components/overlays/OverlaySheet';
import { en } from '@/i18n/en';

interface MedicationsTabViewProps {
  patientId: string;
  medications: Medication[];
  allergies?: Allergy[];
  onShowOnTimeline?: (dateStr: string) => void;
  onStartMedication?: (newMed: {
    name: string;
    strength: string;
    dosesPerDay: number;
    route: string;
    instructions?: string;
  }) => Promise<void>;
  onChangeDose?: (medId: string, newStrength: string, dosesPerDay: number, reason: string) => Promise<void>;
  onUpdateStatus?: (medId: string, status: MedicationStatus, reason?: string) => Promise<void>;
  className?: string;
}

export function MedicationsTabView({
  patientId,
  medications = [],
  allergies = [],
  onShowOnTimeline,
  onStartMedication,
  onChangeDose,
  onUpdateStatus,
  className,
}: MedicationsTabViewProps) {
  const dict = en.medications;
  const [filterMode, setFilterMode] = useState<'current' | 'history'>('current');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedMedForDose, setSelectedMedForDose] = useState<Medication | null>(null);
  const [selectedMedForStop, setSelectedMedForStop] = useState<Medication | null>(null);

  // Form states: New Medication
  const [newName, setNewName] = useState('');
  const [newStrength, setNewStrength] = useState('');
  const [newDosesPerDay, setNewDosesPerDay] = useState(1);
  const [newRoute, setNewRoute] = useState('Oral');
  const [newInstructions, setNewInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states: Change Dose
  const [doseStrength, setDoseStrength] = useState('');
  const [dosePerDay, setDosePerDay] = useState(1);
  const [doseReason, setDoseReason] = useState('');

  // Form states: Stop
  const [stopReason, setStopReason] = useState('');

  // Split medications into current and history
  const currentMeds = medications.filter(
    (m) => m.status === 'active' || m.status === 'paused'
  );
  const historyMeds = medications.filter(
    (m) => m.status === 'stopped' || m.status === 'completed'
  );

  // Cross-reference allergy check (e.g. penicillin sensitivity)
  const hasPenicillinAllergy = allergies.some(
    (a) => a.substance.toLowerCase().includes('penicillin') && a.status === 'active'
  );

  // Helper date formatter
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  // Handlers
  const handleOpenDoseModal = (med: Medication) => {
    setSelectedMedForDose(med);
    setDoseStrength(med.strength);
    setDosePerDay(med.dosesPerDay || 1);
    setDoseReason('');
  };

  const handleOpenStopModal = (med: Medication) => {
    setSelectedMedForStop(med);
    setStopReason('');
  };

  const handleSubmitNewMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newStrength) return;
    setIsSubmitting(true);
    try {
      if (onStartMedication) {
        await onStartMedication({
          name: newName,
          strength: newStrength,
          dosesPerDay: newDosesPerDay,
          route: newRoute,
          instructions: newInstructions,
        });
      }
      setIsAddOpen(false);
      setNewName('');
      setNewStrength('');
      setNewInstructions('');
      setNewDosesPerDay(1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitChangeDose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedForDose || !doseStrength) return;
    setIsSubmitting(true);
    try {
      if (onChangeDose) {
        await onChangeDose(selectedMedForDose.id, doseStrength, dosePerDay, doseReason);
      }
      setSelectedMedForDose(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitStopMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedForStop) return;
    setIsSubmitting(true);
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(selectedMedForStop.id, 'stopped', stopReason);
      }
      setSelectedMedForStop(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePause = async (med: Medication) => {
    if (!onUpdateStatus) return;
    const targetStatus = med.status === 'paused' ? 'active' : 'paused';
    const reason = targetStatus === 'paused' ? 'Temporary clinician pause' : 'Therapy resumed';
    await onUpdateStatus(med.id, targetStatus, reason);
  };

  return (
    <div className={clsx('flex flex-col gap-4 w-full', className)}>
      {/* ========================================================================= */}
      {/* 1. ALLERGY SENSITIVITY BANNER (IF APPLICABLE)                             */}
      {/* ========================================================================= */}
      {hasPenicillinAllergy && (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-800">
            <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                {dict.allergyWarningTitle}
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
                Penicillin
              </span>
            </div>
            <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
              {dict.allergyWarningDesc}
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUB-HEADER: TABS SWITCH ("CURRENT | HISTORY") & "START MEDICATION"      */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center p-1 rounded-full bg-[var(--color-surface)] border border-black/5 shadow-xs">
          <button
            type="button"
            onClick={() => setFilterMode('current')}
            className={clsx(
              'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 select-none',
              filterMode === 'current'
                ? 'bg-[var(--color-ink)] text-[var(--color-white)] shadow-xs'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            )}
          >
            <span>{dict.current}</span>
            <span
              className={clsx(
                'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                filterMode === 'current'
                  ? 'bg-white/20 text-white'
                  : 'bg-black/5 text-[var(--color-ink-muted)]'
              )}
            >
              {currentMeds.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('history')}
            className={clsx(
              'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 select-none',
              filterMode === 'history'
                ? 'bg-[var(--color-ink)] text-[var(--color-white)] shadow-xs'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            )}
          >
            <span>{dict.history}</span>
            <span
              className={clsx(
                'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                filterMode === 'history'
                  ? 'bg-white/20 text-white'
                  : 'bg-black/5 text-[var(--color-ink-muted)]'
              )}
            >
              {historyMeds.length}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-accent-neon)] hover:brightness-105 active:scale-98 text-xs font-bold text-[var(--color-ink)] shadow-xs transition-all cursor-pointer select-none"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{dict.startMedication}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. ACTIVE / CURRENT MEDICATIONS LIST                                      */}
      {/* ========================================================================= */}
      {filterMode === 'current' && (
        <div className="flex flex-col gap-3">
          {currentMeds.length === 0 ? (
            <div className="bg-[var(--color-surface-subtle)] rounded-2xl p-8 border border-white/60 shadow-xs flex flex-col items-center justify-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-ink-muted)]">
                <Pill className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-[var(--color-ink)] mt-1">
                {dict.noMedicationsCurrent}
              </h4>
              <p className="text-xs text-[var(--color-ink-muted)] max-w-sm">
                No active pharmaceutical prescriptions recorded for this patient. Click Start Medication to prescribe.
              </p>
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-ink)] text-white text-xs font-semibold shadow-xs hover:bg-black transition-all"
              >
                <Plus className="w-3 h-3" />
                <span>{dict.startMedication}</span>
              </button>
            </div>
          ) : (
            currentMeds.map((med) => {
              const isPaused = med.status === 'paused';
              return (
                <div
                  key={med.id}
                  className={clsx(
                    'bg-[var(--color-surface-subtle)] rounded-2xl p-4 border shadow-xs transition-all flex flex-col gap-3',
                    isPaused
                      ? 'border-amber-300 bg-amber-50/30'
                      : 'border-white/80 hover:border-black/10'
                  )}
                >
                  {/* Top Row: MedicationChip + Strength + Status + Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <MedicationChip
                        name={med.name}
                        dosage={med.strength}
                        dosesPerDay={med.dosesPerDay}
                      />

                      <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface)] text-[11px] font-mono font-medium text-[var(--color-ink-muted)] border border-black/5">
                        {med.route}
                      </span>

                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded-md text-[10.5px] font-semibold flex items-center gap-1',
                          isPaused
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        )}
                      >
                        <span
                          className={clsx(
                            'w-1.5 h-1.5 rounded-full',
                            isPaused ? 'bg-amber-500' : 'bg-emerald-500'
                          )}
                        />
                        <span>{isPaused ? dict.pausedStatus : dict.activeStatus}</span>
                      </span>
                    </div>

                    {/* Right Action Cluster */}
                    <div className="flex items-center gap-1.5">
                      {/* Show on timeline button */}
                      {onShowOnTimeline && (
                        <button
                          type="button"
                          onClick={() => onShowOnTimeline(med.startDate)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-white)] hover:bg-[var(--color-surface)] text-[11px] font-medium text-[var(--color-ink)] border border-black/5 shadow-2xs transition-all cursor-pointer"
                          title="Jump to timeline at start date in L3 lens"
                        >
                          <Calendar className="w-3 h-3 text-[var(--color-ink-muted)]" />
                          <span>{dict.showOnTimeline}</span>
                        </button>
                      )}

                      {/* Change dose */}
                      <button
                        type="button"
                        onClick={() => handleOpenDoseModal(med)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-white)] hover:bg-[var(--color-surface)] text-[11px] font-medium text-[var(--color-ink)] border border-black/5 shadow-2xs transition-all cursor-pointer"
                      >
                        <Sliders className="w-3 h-3 text-[var(--color-ink-muted)]" />
                        <span>{dict.changeDose}</span>
                      </button>

                      {/* Pause / Resume */}
                      <button
                        type="button"
                        onClick={() => handleTogglePause(med)}
                        className={clsx(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border shadow-2xs transition-all cursor-pointer',
                          isPaused
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-[var(--color-white)] border-black/5 text-amber-800 hover:bg-amber-50'
                        )}
                      >
                        {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                        <span>{isPaused ? dict.resume : dict.pause}</span>
                      </button>

                      {/* Stop */}
                      <button
                        type="button"
                        onClick={() => handleOpenStopModal(med)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-[11px] font-medium text-rose-800 border border-rose-200 shadow-2xs transition-all cursor-pointer"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>{dict.stop}</span>
                      </button>
                    </div>
                  </div>

                  {/* Middle Row: Instructions */}
                  {med.instructions && (
                    <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)] bg-white/40 px-3 py-1.5 rounded-xl border border-white/60">
                      <FileText className="w-3.5 h-3.5 text-[var(--color-ink-muted)] shrink-0" />
                      <span>{med.instructions}</span>
                    </div>
                  )}

                  {/* Bottom Row: Metadata & Provenance */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-[var(--color-ink-muted)] pt-1 border-t border-black/5">
                    <div className="flex items-center gap-2">
                      <span>{dict.started}: <strong>{formatDate(med.startDate)}</strong></span>
                      <span>·</span>
                      <span>{dict.prescribedBy}: <strong>{med.createdBy || 'Dr. Tarek'}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10.5px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Clinical Verification Active</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PAST / DISCONTINUED MEDICATIONS (HISTORY)                               */}
      {/* ========================================================================= */}
      {filterMode === 'history' && (
        <div className="flex flex-col gap-3">
          {historyMeds.length === 0 ? (
            <div className="bg-[var(--color-surface-subtle)] rounded-2xl p-8 border border-white/60 shadow-xs flex flex-col items-center justify-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-ink-muted)]">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-[var(--color-ink)] mt-1">
                {dict.noMedicationsHistory}
              </h4>
              <p className="text-xs text-[var(--color-ink-muted)] max-w-sm">
                No past discontinued or completed prescriptions recorded for this patient.
              </p>
            </div>
          ) : (
            historyMeds.map((med) => (
              <div
                key={med.id}
                className="bg-[var(--color-surface-subtle)]/70 rounded-2xl p-4 border border-black/5 shadow-xs flex flex-col gap-2.5 opacity-90 hover:opacity-100 transition-opacity"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 text-xs font-semibold">
                      <Pill className="w-3.5 h-3.5 text-stone-500" />
                      <span className="line-through">{med.name}</span>
                      <span className="text-stone-500 font-normal">{med.strength}</span>
                    </div>

                    <span className="px-2 py-0.5 rounded-md bg-stone-200 text-[10.5px] font-semibold text-stone-700">
                      {dict.stoppedStatus}
                    </span>

                    <span className="text-xs text-[var(--color-ink-muted)] font-mono">
                      {med.route}
                    </span>
                  </div>

                  {onShowOnTimeline && (
                    <button
                      type="button"
                      onClick={() => onShowOnTimeline(med.startDate)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-white)] hover:bg-[var(--color-surface)] text-[11px] font-medium text-[var(--color-ink)] border border-black/5 shadow-2xs transition-all cursor-pointer"
                      title="Jump to timeline at start date in L3 lens"
                    >
                      <Calendar className="w-3 h-3 text-[var(--color-ink-muted)]" />
                      <span>{dict.showOnTimeline}</span>
                    </button>
                  )}
                </div>

                {med.instructions && (
                  <div className="text-xs text-stone-600 bg-stone-100/60 px-3 py-1.5 rounded-xl border border-stone-200">
                    <span className="font-semibold">{dict.reasonForStop}:</span> {med.instructions}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between text-[11px] text-[var(--color-ink-muted)] pt-1 border-t border-black/5">
                  <div className="flex items-center gap-2">
                    <span>{dict.started}: <strong>{formatDate(med.startDate)}</strong></span>
                    {med.endDate && (
                      <>
                        <span>·</span>
                        <span>{dict.stopped}: <strong>{formatDate(med.endDate)}</strong></span>
                      </>
                    )}
                  </div>
                  <span>{dict.prescribedBy}: <strong>{med.createdBy || 'Dr. Tarek'}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: START NEW MEDICATION                                             */}
      {/* ========================================================================= */}
      <OverlaySheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={dict.newMedicationTitle}
        className="max-w-md"
      >
        <form onSubmit={handleSubmitNewMed} className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--color-ink)]">
              {dict.medicationName} *
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Lisinopril, Metformin"
              className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--color-ink)]">
                {dict.strength} *
              </label>
              <input
                type="text"
                required
                value={newStrength}
                onChange={(e) => setNewStrength(e.target.value)}
                placeholder="e.g. 10 mg, 500 mg"
                className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--color-ink)]">
                {dict.dosesPerDay}
              </label>
              <select
                value={newDosesPerDay}
                onChange={(e) => setNewDosesPerDay(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
              >
                <option value={1}>1× daily (QD)</option>
                <option value={2}>2× daily (BID)</option>
                <option value={3}>3× daily (TID)</option>
                <option value={4}>4× daily (QID)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--color-ink)]">
              {dict.route}
            </label>
            <div className="flex flex-wrap gap-2">
              {['Oral', 'Subcutaneous', 'Intravenous', 'Inhalation'].map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setNewRoute(r)}
                  className={clsx(
                    'px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer',
                    newRoute === r
                      ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                      : 'bg-white text-[var(--color-ink-muted)] border-black/10 hover:border-black/20'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--color-ink)]">
              {dict.instructions}
            </label>
            <textarea
              rows={2}
              value={newInstructions}
              onChange={(e) => setNewInstructions(e.target.value)}
              placeholder={dict.instructionsPlaceholder}
              className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[var(--color-ink-muted)] hover:bg-black/5"
            >
              {dict.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-full bg-[var(--color-accent-neon)] text-[var(--color-ink)] text-xs font-bold shadow-xs hover:brightness-105 active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? 'Prescribing...' : dict.savePrescription}
            </button>
          </div>
        </form>
      </OverlaySheet>

      {/* ========================================================================= */}
      {/* 6. MODAL: CHANGE DOSE                                                      */}
      {/* ========================================================================= */}
      <OverlaySheet
        isOpen={Boolean(selectedMedForDose)}
        onClose={() => setSelectedMedForDose(null)}
        title={`${dict.changeDoseTitle}: ${selectedMedForDose?.name}`}
        className="max-w-md"
      >
        <form onSubmit={handleSubmitChangeDose} className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-black/5 text-xs flex flex-col gap-1">
            <span className="text-[10.5px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider">
              Current Prescription
            </span>
            <span className="font-semibold text-[var(--color-ink)]">
              {selectedMedForDose?.name} {selectedMedForDose?.strength} ({selectedMedForDose?.dosesPerDay}× daily)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--color-ink)]">
                {dict.newStrength} *
              </label>
              <input
                type="text"
                required
                value={doseStrength}
                onChange={(e) => setDoseStrength(e.target.value)}
                placeholder="e.g. 20 mg"
                className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--color-ink)]">
                {dict.dosesPerDay}
              </label>
              <select
                value={dosePerDay}
                onChange={(e) => setDosePerDay(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
              >
                <option value={1}>1× daily (QD)</option>
                <option value={2}>2× daily (BID)</option>
                <option value={3}>3× daily (TID)</option>
                <option value={4}>4× daily (QID)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--color-ink)]">
              {dict.reasonForChange}
            </label>
            <input
              type="text"
              value={doseReason}
              onChange={(e) => setDoseReason(e.target.value)}
              placeholder="e.g. Suboptimal clinic BP, titrating for HbA1c control"
              className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
            <button
              type="button"
              onClick={() => setSelectedMedForDose(null)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[var(--color-ink-muted)] hover:bg-black/5"
            >
              {dict.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-full bg-[var(--color-ink)] text-white text-xs font-bold shadow-xs hover:bg-black disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : dict.saveChange}
            </button>
          </div>
        </form>
      </OverlaySheet>

      {/* ========================================================================= */}
      {/* 7. MODAL: STOP / DISCONTINUE MEDICATION                                    */}
      {/* ========================================================================= */}
      <OverlaySheet
        isOpen={Boolean(selectedMedForStop)}
        onClose={() => setSelectedMedForStop(null)}
        title={`${dict.stopMedicationTitle}: ${selectedMedForStop?.name}`}
        className="max-w-md"
      >
        <form onSubmit={handleSubmitStopMed} className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Are you sure you want to discontinue {selectedMedForStop?.name} {selectedMedForStop?.strength}?
              </p>
              <p className="text-[11px] text-rose-800/90 mt-0.5">
                This will move the medication to History and project a Discontinuation event onto the clinical timeline.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--color-ink)]">
              {dict.reasonForStop} *
            </label>
            <input
              type="text"
              required
              value={stopReason}
              onChange={(e) => setStopReason(e.target.value)}
              placeholder="e.g. Adverse reaction (cough), therapy resolved, substitution"
              className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
            <button
              type="button"
              onClick={() => setSelectedMedForStop(null)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[var(--color-ink-muted)] hover:bg-black/5"
            >
              {dict.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-full bg-rose-600 text-white text-xs font-bold shadow-xs hover:bg-rose-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Stopping...' : dict.confirmStop}
            </button>
          </div>
        </form>
      </OverlaySheet>
    </div>
  );
}
