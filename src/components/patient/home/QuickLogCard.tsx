'use client';

/**
 * QuickLogCard — Section 6.7 Patient Home: Quick Log.
 * Two labeled groups of neutral white CircleButtons with line icons and labels:
 * - Symptoms: Fever, Cough, Headache
 * - Vitals: Heart rate, Weight, Mood
 * A tap opens a tiny Sheet to enter the value (symptoms: severity).
 * Below: a pill note field "Add a quick note…".
 * Saves go through patient observation path (§9.3), marked "patient-reported".
 */

import React, { useState } from 'react';
import { clsx } from 'clsx';
import {
  Thermometer,
  Wind,
  Headphones,
  Heart,
  Scale,
  Smile,
  Send,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { ModuleCard } from '@/components/cards/ModuleCard';
import { OverlaySheet } from '@/components/overlays/OverlaySheet';
import type { CopyDeck } from '@/i18n';
import { en } from '@/i18n/en';
import type { PatientObservationInput } from '@/data/repository';

interface QuickLogCardProps {
  patientId: string;
  patientName: string;
  onSaveObservation?: (input: PatientObservationInput) => Promise<void>;
  dict?: CopyDeck['patientHome'];
  className?: string;
}

type ActiveLogType =
  | { kind: 'symptom'; name: 'Fever' | 'Cough' | 'Headache' }
  | { kind: 'vital'; metric: 'pulse' | 'weight' | 'mood'; label: string; unit: string }
  | null;

export function QuickLogCard({
  patientId,
  patientName,
  onSaveObservation,
  dict = en.patientHome,
  className,
}: QuickLogCardProps) {
  const [activeLog, setActiveLog] = useState<ActiveLogType>(null);
  const [quickNote, setQuickNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Modal form states
  const [symptomSeverity, setSymptomSeverity] = useState<'mild' | 'moderate' | 'severe'>('mild');
  const [symptomNotes, setSymptomNotes] = useState('');
  const [vitalValue, setVitalValue] = useState('');

  const handleOpenSymptom = (name: 'Fever' | 'Cough' | 'Headache') => {
    setActiveLog({ kind: 'symptom', name });
    setSymptomSeverity('mild');
    setSymptomNotes('');
  };

  const handleOpenVital = (metric: 'pulse' | 'weight' | 'mood', label: string, unit: string) => {
    setActiveLog({ kind: 'vital', metric, label, unit });
    setVitalValue(metric === 'pulse' ? '72' : metric === 'weight' ? '78' : 'Good');
  };

  const handleCloseModal = () => {
    setActiveLog(null);
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLog || isSubmitting) return;

    try {
      setIsSubmitting(true);
      if (activeLog.kind === 'symptom') {
        if (onSaveObservation) {
          await onSaveObservation({
            patientId,
            kind: 'symptom',
            symptomName: activeLog.name,
            severity: symptomSeverity,
            notes: symptomNotes || undefined,
          });
        }
        showFeedback(`Reported symptom "${activeLog.name}" (${symptomSeverity})`);
      } else {
        if (onSaveObservation) {
          await onSaveObservation({
            patientId,
            kind: 'vitals',
            metric: activeLog.metric,
            value: vitalValue,
            unit: activeLog.unit,
          });
        }
        showFeedback(`Recorded ${activeLog.label}: ${vitalValue} ${activeLog.unit}`);
      }
      setActiveLog(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      if (onSaveObservation) {
        await onSaveObservation({
          patientId,
          kind: 'note',
          notes: quickNote.trim(),
        });
      }
      showFeedback('Quick note saved to care timeline');
      setQuickNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4000);
  };

  return (
    <ModuleCard
      title={dict.quickLog}
      className={clsx('h-full flex flex-col justify-between', className)}
      data-testid="quick-log-card"
    >
      <div className="flex flex-col gap-4">
        {feedbackMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/60 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Group 1: Symptoms */}
        <div>
          <span className="text-[11px] font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider block mb-2">
            {dict.symptoms}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'Fever' as const, label: dict.fever, icon: Thermometer },
              { id: 'Cough' as const, label: dict.cough, icon: Wind },
              { id: 'Headache' as const, label: dict.headache, icon: Headphones },
            ].map((sym) => {
              const Icon = sym.icon;
              return (
                <button
                  key={sym.id}
                  type="button"
                  onClick={() => handleOpenSymptom(sym.id)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white hover:bg-stone-50 border border-black/10 text-xs font-medium text-[var(--color-ink)] shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer"
                  data-testid={`quick-log-symptom-${sym.id.toLowerCase()}`}
                >
                  <Icon className="w-3.5 h-3.5 text-[var(--color-ink-muted)] stroke-[1.75]" />
                  <span>{sym.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Group 2: Vitals */}
        <div>
          <span className="text-[11px] font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider block mb-2">
            {dict.vitals}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { metric: 'pulse' as const, label: dict.heartRate, unit: 'bpm', icon: Heart },
              { metric: 'weight' as const, label: dict.weight, unit: 'kg', icon: Scale },
              { metric: 'mood' as const, label: dict.mood, unit: '', icon: Smile },
            ].map((vit) => {
              const Icon = vit.icon;
              return (
                <button
                  key={vit.metric}
                  type="button"
                  onClick={() => handleOpenVital(vit.metric, vit.label, vit.unit)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white hover:bg-stone-50 border border-black/10 text-xs font-medium text-[var(--color-ink)] shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer"
                  data-testid={`quick-log-vital-${vit.metric}`}
                >
                  <Icon className="w-3.5 h-3.5 text-[var(--color-ink-muted)] stroke-[1.75]" />
                  <span>{vit.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Pill Note Field */}
        <form onSubmit={handleQuickNoteSubmit} className="mt-1 pt-3 border-t border-black/5">
          <div className="flex items-center gap-2 p-1.5 rounded-full bg-white border border-black/15 shadow-2xs focus-within:ring-2 focus-within:ring-[var(--color-accent-neon)] transition-all">
            <input
              type="text"
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder={dict.addNotePlaceholder}
              className="flex-1 px-3 py-1 text-xs text-[var(--color-ink)] bg-transparent border-none focus:outline-hidden"
              data-testid="input-quick-note"
            />
            <button
              type="submit"
              disabled={!quickNote.trim() || isSubmitting}
              className="w-7 h-7 rounded-full bg-[var(--color-ink)] hover:bg-black text-white flex items-center justify-center shrink-0 disabled:opacity-40 transition-colors cursor-pointer"
              title="Save quick note"
              data-testid="submit-quick-note"
            >
              <Send className="w-3 h-3 stroke-[2]" />
            </button>
          </div>
        </form>
      </div>

      {/* Tiny Sheet Overlay for Observation Entry */}
      <OverlaySheet
        isOpen={Boolean(activeLog)}
        onClose={handleCloseModal}
        title={
          activeLog?.kind === 'symptom'
            ? `Report Symptom: ${activeLog.name}`
            : activeLog
            ? `Record Observation: ${activeLog.label}`
            : 'Quick Observation'
        }
      >
        <p className="text-xs text-[var(--color-ink-muted)] -mt-2 mb-4">
          Recorded under patient-reported clinical stream (§9.3)
        </p>

        <form onSubmit={handleSubmitModal} className="flex flex-col gap-4 text-left">
          {activeLog?.kind === 'symptom' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1.5">
                  {dict.severity}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['mild', 'moderate', 'severe'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSymptomSeverity(lvl)}
                      className={clsx(
                        'py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer capitalize text-center',
                        symptomSeverity === lvl
                          ? 'bg-[var(--color-ink)] text-white border-transparent shadow-xs'
                          : 'bg-white text-[var(--color-ink)] border-black/10 hover:bg-stone-50'
                      )}
                      data-testid={`select-severity-${lvl}`}
                    >
                      {lvl === 'mild' ? dict.mild : lvl === 'moderate' ? dict.moderate : dict.severe}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">
                  Additional Notes (Optional)
                </label>
                <input
                  type="text"
                  value={symptomNotes}
                  onChange={(e) => setSymptomNotes(e.target.value)}
                  placeholder="e.g. Started after lunch, accompanied by chills"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-accent-neon)]"
                  data-testid="input-symptom-notes"
                />
              </div>
            </>
          ) : activeLog ? (
            <div>
              <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">
                Measured Value ({activeLog.unit || 'Score'})
              </label>
              {activeLog.metric === 'mood' ? (
                <div className="grid grid-cols-3 gap-2">
                  {['Great', 'Good', 'Fatigued'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setVitalValue(m)}
                      className={clsx(
                        'py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center',
                        vitalValue === m
                          ? 'bg-[var(--color-ink)] text-white border-transparent shadow-xs'
                          : 'bg-white text-[var(--color-ink)] border-black/10 hover:bg-stone-50'
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    value={vitalValue}
                    onChange={(e) => setVitalValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 bg-white text-sm text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-accent-neon)]"
                    data-testid="input-vital-value"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-mono text-[var(--color-ink-muted)]">
                    {activeLog.unit}
                  </span>
                </div>
              )}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-black/5 mt-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
            >
              {dict.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-full text-xs font-bold bg-[var(--color-ink)] hover:bg-black text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
              data-testid="submit-observation"
            >
              {isSubmitting ? 'Saving...' : dict.saveObservation}
            </button>
          </div>
        </form>
      </OverlaySheet>
    </ModuleCard>
  );
}
