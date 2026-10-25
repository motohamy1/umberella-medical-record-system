'use client';

/**
 * MedicationsTabView — Dedicated clinical prescription management view (Slice S8).
 * Specification: docs/PACK.md §11 (S8), docs/design/pages.md §6
 * 
 * Features:
 * - Chronological grouping by prescription start date with clear date headers
 * - Multi-ingredient combination drugs support (Trade Name, active ingredients builder, concentration)
 * - Start date picker defaulting to current date with custom backdating capability
 * - Filter pills: "Current | History"
 * - Active medications listing: MedicationChip, strength, route, dosage frequency, instructions, start date, status
 * - History view: discontinued / past medications with stop dates, reasons, and durations
 * - Doctor row actions: Change dose, Pause/Resume, Stop (discontinue)
 * - "Show on timeline": switches to Overview tab and jumps timeline to the prescription start date in L3 lens
 * - Cross-referencing allergy sensitivity banner (e.g. Penicillin sensitivity flag)
 * - Modal sheets for Start Medication, Change Dose, and Discontinue
 */

import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Pill,
  Plus,
  Trash2,
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
  Scan,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Medication, Allergy, MedicationStatus, ActiveIngredient } from '@/data/types';
import { MedicationChip } from '@/components/cards/MedicationChip';
import { OverlaySheet } from '@/components/overlays/OverlaySheet';
import { PrescriptionOCRModal } from './PrescriptionOCRModal';
import { en } from '@/i18n/en';

interface MedicationsTabViewProps {
  patientId: string;
  medications: Medication[];
  allergies?: Allergy[];
  onShowOnTimeline?: (dateStr: string) => void;
  onStartMedication?: (newMed: {
    name: string;
    tradeName?: string;
    strength: string;
    activeIngredients?: ActiveIngredient[];
    dosesPerDay: number;
    route: string;
    instructions?: string;
    startDate?: string;
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
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [selectedMedForDose, setSelectedMedForDose] = useState<Medication | null>(null);
  const [selectedMedForStop, setSelectedMedForStop] = useState<Medication | null>(null);

  // Form states: New Medication
  const [newTradeName, setNewTradeName] = useState('');
  const [newName, setNewName] = useState('');
  const [newStrength, setNewStrength] = useState('');
  const [newStartDate, setNewStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newDosesPerDay, setNewDosesPerDay] = useState(1);
  const [newRoute, setNewRoute] = useState('Oral');
  const [newInstructions, setNewInstructions] = useState('');
  const [activeIngredientsList, setActiveIngredientsList] = useState<ActiveIngredient[]>([
    { name: '', strength: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states: Change Dose
  const [doseStrength, setDoseStrength] = useState('');
  const [dosePerDay, setDosePerDay] = useState(1);
  const [doseReason, setDoseReason] = useState('');

  // Form states: Stop
  const [stopReason, setStopReason] = useState('');

  // Split medications into current and history
  const currentMeds = useMemo(() => {
    return medications.filter(
      (m) => m.status === 'active' || m.status === 'paused'
    );
  }, [medications]);

  const historyMeds = useMemo(() => {
    return medications.filter(
      (m) => m.status === 'stopped' || m.status === 'completed'
    );
  }, [medications]);

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

  // Group medications chronologically by Start Date
  const groupedCurrentMeds = useMemo(() => {
    const groups: { [dateStr: string]: Medication[] } = {};
    for (const med of currentMeds) {
      const formatted = med.startDate ? formatDate(med.startDate) : 'Recorded Today';
      if (!groups[formatted]) {
        groups[formatted] = [];
      }
      groups[formatted].push(med);
    }
    return groups;
  }, [currentMeds]);

  const groupedHistoryMeds = useMemo(() => {
    const groups: { [dateStr: string]: Medication[] } = {};
    for (const med of historyMeds) {
      const formatted = med.endDate ? formatDate(med.endDate) : (med.startDate ? formatDate(med.startDate) : 'Past Prescriptions');
      if (!groups[formatted]) {
        groups[formatted] = [];
      }
      groups[formatted].push(med);
    }
    return groups;
  }, [historyMeds]);

  // Quick preset combinations (e.g. Sugarlo Plus, Augmentin, Exforge)
  const comboPresets = [
    {
      trade: 'Sugarlo Plus 50/1000',
      generic: 'Vildagliptin + Metformin',
      strength: '50/1000 mg',
      route: 'Oral',
      doses: 2,
      instructions: '1 tablet twice daily with meals',
      ingredients: [
        { name: 'Vildagliptin (DPP-4 inhibitor)', strength: '50 mg' },
        { name: 'Metformin HCl (Biguanide)', strength: '1000 mg' },
      ],
    },
    {
      trade: 'Augmentin 1g',
      generic: 'Amoxicillin + Clavulanate',
      strength: '1000 mg',
      route: 'Oral',
      doses: 2,
      instructions: '1 tablet every 12 hours after meals',
      ingredients: [
        { name: 'Amoxicillin Trihydrate', strength: '875 mg' },
        { name: 'Clavulanic Acid (as Potassium)', strength: '125 mg' },
      ],
    },
    {
      trade: 'Exforge 5/160',
      generic: 'Amlodipine + Valsartan',
      strength: '5/160 mg',
      route: 'Oral',
      doses: 1,
      instructions: '1 tablet once daily in the morning',
      ingredients: [
        { name: 'Amlodipine Besylate (CCB)', strength: '5 mg' },
        { name: 'Valsartan (ARB)', strength: '160 mg' },
      ],
    },
    {
      trade: 'Concor Plus 5/12.5',
      generic: 'Bisoprolol + Hydrochlorothiazide',
      strength: '5/12.5 mg',
      route: 'Oral',
      doses: 1,
      instructions: '1 tablet once daily in the morning',
      ingredients: [
        { name: 'Bisoprolol Fumarate (Beta-Blocker)', strength: '5 mg' },
        { name: 'Hydrochlorothiazide (Thiazide Diuretic)', strength: '12.5 mg' },
      ],
    },
  ];

  const applyComboPreset = (preset: typeof comboPresets[0]) => {
    setNewTradeName(preset.trade);
    setNewName(preset.generic);
    setNewStrength(preset.strength);
    setNewRoute(preset.route);
    setNewDosesPerDay(preset.doses);
    setNewInstructions(preset.instructions);
    setActiveIngredientsList(preset.ingredients);
  };

  const handleAddIngredientRow = () => {
    setActiveIngredientsList((prev) => [...prev, { name: '', strength: '' }]);
  };

  const handleRemoveIngredientRow = (idx: number) => {
    setActiveIngredientsList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleIngredientChange = (idx: number, field: 'name' | 'strength', val: string) => {
    setActiveIngredientsList((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  // Cross-reference allergy check (e.g. penicillin sensitivity)
  const hasPenicillinAllergy = allergies.some(
    (a) => a.substance.toLowerCase().includes('penicillin') && a.status === 'active'
  );

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
    const resolvedGenericName = newName.trim() || newTradeName.trim();
    if (!resolvedGenericName || !newStrength) return;

    // Filter valid active ingredients
    const validIngredients = activeIngredientsList.filter(
      (ing) => ing.name.trim().length > 0
    );

    setIsSubmitting(true);
    try {
      if (onStartMedication) {
        await onStartMedication({
          name: resolvedGenericName,
          tradeName: newTradeName.trim() || undefined,
          strength: newStrength.trim(),
          activeIngredients: validIngredients.length > 0 ? validIngredients : undefined,
          dosesPerDay: newDosesPerDay,
          route: newRoute,
          instructions: newInstructions.trim() || undefined,
          startDate: newStartDate ? new Date(newStartDate).toISOString() : new Date().toISOString(),
        });
      }
      setIsAddOpen(false);
      setNewName('');
      setNewTradeName('');
      setNewStrength('');
      setNewInstructions('');
      setNewDosesPerDay(1);
      setActiveIngredientsList([{ name: '', strength: '' }]);
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
    <div className={clsx('flex flex-col gap-4 w-full font-[\'Inter\',sans-serif]', className)}>
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
              'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 select-none cursor-pointer',
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
              'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 select-none cursor-pointer',
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOcrOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-surface)] hover:bg-white border border-black/10 text-xs font-semibold text-[var(--color-ink)] shadow-2xs hover:shadow-xs transition-all cursor-pointer select-none"
            data-testid="scan-prescription-ocr-button"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>{en.ocr.scanPrescription}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-accent-neon)] hover:brightness-105 active:scale-98 text-xs font-bold text-[var(--color-ink)] shadow-xs transition-all cursor-pointer select-none"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{dict.startMedication}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ACTIVE / CURRENT MEDICATIONS LIST GROUPED CHRONOLOGICALLY BY DATE      */}
      {/* ========================================================================= */}
      {filterMode === 'current' && (
        <div className="flex flex-col gap-4">
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
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-ink)] text-white text-xs font-semibold shadow-xs hover:bg-black transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{dict.startMedication}</span>
              </button>
            </div>
          ) : (
            Object.entries(groupedCurrentMeds).map(([dateStr, meds]) => (
              <div key={dateStr} className="flex flex-col gap-2.5">
                {/* Chronological Date Header */}
                <div className="flex items-center gap-2 px-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full bg-white text-xs font-mono font-bold text-[var(--color-ink)] border border-black/5 shadow-2xs">
                    <Calendar className="w-3 h-3 text-[var(--color-ink-muted)]" />
                    <span>{dateStr}</span>
                  </div>
                  <span className="h-px flex-1 bg-black/10" />
                  <span className="text-[10px] font-mono font-medium text-[var(--color-ink-muted)]">
                    {meds.length} {meds.length === 1 ? 'prescription' : 'prescriptions'}
                  </span>
                </div>

                {/* Medication Cards */}
                <div className="flex flex-col gap-3">
                  {meds.map((med) => {
                    const isPaused = med.status === 'paused';
                    const displayName = med.tradeName || med.name;

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
                              name={displayName}
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

                        {/* Active Ingredients Pills / Combinations Breakdown */}
                        {med.activeIngredients && med.activeIngredients.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-white/60 border border-black/5">
                            <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider shrink-0">
                              Active Ingredients:
                            </span>
                            {med.activeIngredients.map((ing, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50/80 text-indigo-950 border border-indigo-200/50 text-[10.5px] font-semibold"
                              >
                                <span>{ing.name}</span>
                                {ing.strength && (
                                  <span className="font-mono text-[9.5px] text-indigo-700 bg-indigo-100/60 px-1 py-0.2 rounded">
                                    {ing.strength}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        ) : med.activeIngredientsText ? (
                          <div className="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)] px-1">
                            <span className="font-semibold text-[var(--color-ink)]">Active:</span>
                            <span>{med.activeIngredientsText}</span>
                          </div>
                        ) : null}

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
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PAST / DISCONTINUED MEDICATIONS (HISTORY)                               */}
      {/* ========================================================================= */}
      {filterMode === 'history' && (
        <div className="flex flex-col gap-4">
          {historyMeds.length === 0 ? (
            <div className="bg-[var(--color-surface-subtle)] rounded-2xl p-8 border border-white/60 shadow-xs flex flex-col items-center justify-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-ink-muted)]">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-[var(--color-ink)] mt-1">
                {dict.noMedicationsHistory}
              </h4>
              <p className="text-xs text-[var(--color-ink-muted)] max-w-sm">
                No past or discontinued prescriptions recorded for this patient.
              </p>
            </div>
          ) : (
            Object.entries(groupedHistoryMeds).map(([dateStr, meds]) => (
              <div key={dateStr} className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2 px-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full bg-white text-xs font-mono font-bold text-[var(--color-ink)] border border-black/5 shadow-2xs">
                    <Calendar className="w-3 h-3 text-[var(--color-ink-muted)]" />
                    <span>{dateStr}</span>
                  </div>
                  <span className="h-px flex-1 bg-black/10" />
                </div>

                <div className="flex flex-col gap-3">
                  {meds.map((med) => (
                    <div
                      key={med.id}
                      className="bg-[var(--color-surface-subtle)] opacity-80 hover:opacity-100 rounded-2xl p-4 border border-white/60 shadow-xs transition-all flex flex-col gap-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <MedicationChip
                            name={med.tradeName || med.name}
                            dosage={med.strength}
                            dosesPerDay={med.dosesPerDay}
                          />

                          <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface)] text-[11px] font-mono font-medium text-[var(--color-ink-muted)] border border-black/5">
                            {med.route}
                          </span>

                          <span className="px-2 py-0.5 rounded-md bg-stone-200 text-stone-700 text-[10.5px] font-semibold">
                            {med.status === 'completed' ? dict.completedStatus : 'Discontinued'}
                          </span>
                        </div>

                        {onShowOnTimeline && (
                          <button
                            type="button"
                            onClick={() => onShowOnTimeline(med.startDate)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-[11px] font-medium text-[var(--color-ink)] border border-black/5 shadow-2xs hover:bg-[var(--color-surface)] cursor-pointer"
                          >
                            <Calendar className="w-3 h-3 text-[var(--color-ink-muted)]" />
                            <span>{dict.showOnTimeline}</span>
                          </button>
                        )}
                      </div>

                      {med.stopReason && (
                        <div className="text-xs text-rose-800 bg-rose-50/60 px-3 py-1.5 rounded-xl border border-rose-100 flex items-center gap-2">
                          <XCircle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                          <span>Discontinuation reason: <strong>{med.stopReason}</strong></span>
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
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: START NEW MEDICATION (MULTI-INGREDIENTS & COMBINATIONS)         */}
      {/* ========================================================================= */}
      <OverlaySheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Start Medication & Prescription"
        className="max-w-lg"
      >
        <form onSubmit={handleSubmitNewMed} className="flex flex-col gap-4 p-4 sm:p-6">
          {/* Quick Egyptian Combination Presets */}
          <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-[var(--color-surface)] border border-black/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-muted)] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              Quick Combination Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {comboPresets.map((preset) => (
                <button
                  type="button"
                  key={preset.trade}
                  onClick={() => applyComboPreset(preset)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-black/10 hover:border-black/30 text-[11px] font-semibold text-[var(--color-ink)] shadow-2xs transition-all cursor-pointer text-start"
                >
                  {preset.trade}
                </button>
              ))}
            </div>
          </div>

          {/* Prescription Date Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--color-ink)]">
              Prescription Date *
            </label>
            <input
              type="date"
              required
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs font-semibold text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
            />
          </div>

          {/* Trade Name and Strength */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--color-ink)]">
                Trade / Brand Name *
              </label>
              <input
                type="text"
                required
                value={newTradeName}
                onChange={(e) => setNewTradeName(e.target.value)}
                placeholder="e.g. Sugarlo Plus 50/1000, Augmentin"
                className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs font-bold text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--color-ink)]">
                Concentration / Overall Strength *
              </label>
              <input
                type="text"
                required
                value={newStrength}
                onChange={(e) => setNewStrength(e.target.value)}
                placeholder="e.g. 50/1000 mg, 1g, 5/160 mg"
                className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs font-semibold text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
              />
            </div>
          </div>

          {/* Generic Scientific Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-ink-muted)]">
              Scientific / Generic Classification (Optional)
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Vildagliptin + Metformin, Amoxicillin + Clavulanate"
              className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
            />
          </div>

          {/* Multi-Active Ingredients Builder */}
          <div className="flex flex-col gap-2 p-3 rounded-2xl bg-sky-50/50 border border-sky-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-sky-950 block">Active Ingredients Breakdown</span>
                <span className="text-[10.5px] text-sky-800/80">Support for single or combination multi-ingredient drugs</span>
              </div>
              <button
                type="button"
                onClick={handleAddIngredientRow}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-sky-900 border border-sky-200 text-[11px] font-bold shadow-2xs hover:bg-sky-50 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Ingredient</span>
              </button>
            </div>

            <div className="flex flex-col gap-2 mt-1">
              {activeIngredientsList.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                    placeholder={`Ingredient ${idx + 1} (e.g. Vildagliptin)`}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-sky-200 text-xs text-sky-950 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  />
                  <input
                    type="text"
                    value={ing.strength}
                    onChange={(e) => handleIngredientChange(idx, 'strength', e.target.value)}
                    placeholder="Strength (e.g. 50 mg)"
                    className="w-32 px-2.5 py-1.5 rounded-lg bg-white border border-sky-200 text-xs text-sky-950 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  />
                  {activeIngredientsList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredientRow(idx)}
                      className="p-1.5 text-rose-600 hover:bg-rose-100/50 rounded-lg transition-colors cursor-pointer"
                      title="Remove ingredient"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Doses Per Day & Route */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--color-ink)]">
                Frequency (Doses / Day)
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
                <option value={0.5}>Every other day</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--color-ink)]">
                Administration Route
              </label>
              <select
                value={newRoute}
                onChange={(e) => setNewRoute(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
              >
                <option value="Oral">Oral (PO)</option>
                <option value="Sublingual">Sublingual (SL)</option>
                <option value="Subcutaneous">Subcutaneous (SC)</option>
                <option value="Intravenous">Intravenous (IV)</option>
                <option value="Intramuscular">Intramuscular (IM)</option>
                <option value="Inhalation">Inhalation</option>
                <option value="Topical">Topical</option>
              </select>
            </div>
          </div>

          {/* Instructions */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--color-ink)]">
              {dict.instructions}
            </label>
            <textarea
              rows={2}
              value={newInstructions}
              onChange={(e) => setNewInstructions(e.target.value)}
              placeholder="e.g. Take 1 tablet twice daily with meals. Do not chew."
              className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[var(--color-ink-muted)] hover:bg-black/5 cursor-pointer"
            >
              {dict.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-full bg-[var(--color-accent-neon)] text-[var(--color-ink)] text-xs font-bold shadow-xs hover:brightness-105 active:scale-98 disabled:opacity-50 cursor-pointer"
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
        title={`${dict.changeDoseTitle}: ${selectedMedForDose?.tradeName || selectedMedForDose?.name}`}
        className="max-w-md"
      >
        <form onSubmit={handleSubmitChangeDose} className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-black/5 text-xs flex flex-col gap-1">
            <span className="text-[10.5px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider">
              Current Prescription
            </span>
            <span className="font-semibold text-[var(--color-ink)]">
              {selectedMedForDose?.tradeName || selectedMedForDose?.name} {selectedMedForDose?.strength} ({selectedMedForDose?.dosesPerDay}× daily)
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
                <option value={1}>1× daily</option>
                <option value={2}>2× daily</option>
                <option value={3}>3× daily</option>
                <option value={4}>4× daily</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--color-ink)]">
              Clinical Reason
            </label>
            <input
              type="text"
              value={doseReason}
              onChange={(e) => setDoseReason(e.target.value)}
              placeholder="e.g. Target HbA1c not reached, upward titration"
              className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
            <button
              type="button"
              onClick={() => setSelectedMedForDose(null)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[var(--color-ink-muted)] hover:bg-black/5 cursor-pointer"
            >
              {dict.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-full bg-[var(--color-ink)] text-white text-xs font-semibold shadow-xs hover:bg-black disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Updating...' : 'Save New Dose'}
            </button>
          </div>
        </form>
      </OverlaySheet>

      {/* ========================================================================= */}
      {/* 7. MODAL: STOP / DISCONTINUE MEDICATION                                   */}
      {/* ========================================================================= */}
      <OverlaySheet
        isOpen={Boolean(selectedMedForStop)}
        onClose={() => setSelectedMedForStop(null)}
        title={`'Discontinue Prescription:' ${selectedMedForStop?.tradeName || selectedMedForStop?.name}`}
        className="max-w-md"
      >
        <form onSubmit={handleSubmitStopMed} className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/60 text-xs text-rose-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p>
              Stopping this prescription will mark it discontinued and move it to the historical medication record.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--color-ink)]">
              Discontinuation Reason *
            </label>
            <textarea
              rows={3}
              required
              value={stopReason}
              onChange={(e) => setStopReason(e.target.value)}
              placeholder="e.g. Adverse gastrointestinal effect, clinical target met, substituted with alternative"
              className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
            <button
              type="button"
              onClick={() => setSelectedMedForStop(null)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[var(--color-ink-muted)] hover:bg-black/5 cursor-pointer"
            >
              {dict.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-full bg-rose-600 text-white text-xs font-semibold shadow-xs hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Stopping...' : 'Confirm Discontinue'}
            </button>
          </div>
        </form>
      </OverlaySheet>

      {/* ========================================================================= */}
      {/* 8. MODAL: PRESCRIPTION OCR SCANNER (AI Rx Digitize)                       */}
      {/* ========================================================================= */}
      <PrescriptionOCRModal
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        patientId={patientId}
        onMedicationAdded={() => {
          setIsOcrOpen(false);
        }}
      />
    </div>
  );
}
