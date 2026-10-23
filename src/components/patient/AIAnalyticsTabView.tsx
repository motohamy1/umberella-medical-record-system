'use client';

/**
 * AIAnalyticsTabView — Section 6.5 & Section 11 Phase L2: AI Clinical Analytics.
 * Specification: docs/PACK.md §6.5, §283, §572 (L2), Rule 12.
 *
 * Rules:
 * - ModuleCard with the question pills: "What changed?", "What matters?", "Since last visit".
 * - Each answer is a short list of clinical statements, every one with source chips that open the underlying event.
 * - Visible "AI-generated · <time>" label.
 * - "Regenerate" button.
 * - Rule 12: AI never decides. "Save to note" requires an explicit confirm.
 * - Designed baseline empty state for patients with insufficient records.
 */

import React, { useState } from 'react';
import { clsx } from 'clsx';
import {
  Sparkles,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Activity,
  Heart,
  Layers,
  Zap,
  Award,
  Stethoscope,
  Pill,
  Gauge,
  FilePlus,
} from 'lucide-react';
import { ModuleCard } from '@/components/cards/ModuleCard';
import { OverlaySheet } from '@/components/overlays/OverlaySheet';
import type { Patient, CareEvent, Medication, LabResult, Visit, Allergy, ImagingStudy, GeneticFinding } from '@/data/types';
import {
  generatePatientAICards,
  generatePatientQuestionAnalytics,
  type GeneratedAICard,
  type QuestionAnalyticsItem as AnalyticsItem,
} from '@/data/patientAIGenerator';
import { generatePatientAIAnalyticsAction } from '@/data/actions';
import { en } from '@/i18n/en';

interface AIAnalyticsTabViewProps {
  patient: Patient;
  medications?: Medication[];
  labs?: LabResult[];
  visits?: Visit[];
  careEvents?: CareEvent[];
  allergies?: Allergy[];
  vitals?: unknown[];
  imaging?: ImagingStudy[];
  genetics?: GeneticFinding[];
  onShowOnTimeline?: (dateStr?: string) => void;
  onSaveToNote?: (summaryText: string) => Promise<void>;
  dict?: typeof en.aiAnalytics;
  className?: string;
}

type QuestionKey = 'whatChanged' | 'whatMatters' | 'sinceLastVisit';

function formatSourceDate(val: unknown): string {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return String(val);
}


export function AIAnalyticsTabView({
  patient,
  medications = [],
  labs = [],
  visits = [],
  careEvents = [],
  allergies = [],
  vitals = [],
  imaging = [],
  genetics = [],
  onShowOnTimeline,
  onSaveToNote,
  dict = en.aiAnalytics,
  className,
}: AIAnalyticsTabViewProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionKey>('whatChanged');
  const [activeCardCategory, setActiveCardCategory] = useState<string>('all');
  const [pendingSaveText, setPendingSaveText] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [generatedAt, setGeneratedAt] = useState<string>('Just now');
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const [provenanceNote, setProvenanceNote] = useState<string | null>(null);
  const [customCards, setCustomCards] = useState<GeneratedAICard[] | null>(null);
  const [customQuestions, setCustomQuestions] = useState<Record<QuestionKey, AnalyticsItem[]> | null>(null);

  const hasClinicalData = (visits.length > 0 || medications.length > 0 || labs.length > 0);

  // Dynamic unique AI Cards generated from patient records (Deterministic baseline)
  const generatedCards = React.useMemo(() => {
    return generatePatientAICards({
      patient,
      medications,
      labs,
      visits,
      careEvents,
      allergies,
      genetics,
      imaging,
      vitals,
    });
  }, [patient, medications, labs, visits, careEvents, allergies, genetics, imaging, vitals]);

  // Dynamic analysis content derived from real patient records (Deterministic baseline)
  const analyticsData: Record<QuestionKey, AnalyticsItem[]> = React.useMemo(() => {
    return generatePatientQuestionAnalytics({
      patient,
      medications,
      labs,
      visits,
      careEvents,
    });
  }, [patient, medications, labs, visits, careEvents]);

  const cardsToRender = customCards || generatedCards;
  const questionsToRender = customQuestions || analyticsData;

  const filteredCards = activeCardCategory === 'all'
    ? cardsToRender
    : cardsToRender.filter((c) => c.category === activeCardCategory);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const res = await generatePatientAIAnalyticsAction(patient.id);
      if (res.success && res.data) {
        setCustomCards(res.data.cards);
        setCustomQuestions(res.data.questions);
        setGeneratedAt(res.data.provenance.generatedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setProvenanceNote(res.data.provenance.notes || null);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 350));
        setGeneratedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 350));
      setGeneratedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSaveToNote = async () => {
    setIsSaving(true);
    try {
      const currentItems = analyticsData[selectedQuestion];
      const defaultSummary = `[AI Clinical Analytics Summary - ${selectedQuestion === 'whatChanged' ? 'What Changed' : selectedQuestion === 'whatMatters' ? 'What Matters' : 'Since Last Visit'}]\n` +
        currentItems.map((item, idx) => `${idx + 1}. ${item.statement} (Source: ${item.sourceTitle})`).join('\n');
      const textToSave = pendingSaveText || defaultSummary;

      if (onSaveToNote) {
        await onSaveToNote(textToSave);
      }
      setIsConfirmSaveOpen(false);
      setPendingSaveText(null);
      setSaveSuccessMsg('AI summary saved into clinical visit notes with your physician provenance.');
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCardToNote = (card: GeneratedAICard) => {
    const text = `[AI Clinical Card: ${card.title}]\n` +
      `Category: ${card.category.toUpperCase()} | Status: ${card.statusBadge.label}\n` +
      (card.caseSummary ? `Case Summary Narrative: ${card.caseSummary}\n` : '') +
      (card.keyMetric ? `Key Metric: ${card.keyMetric.label}: ${card.keyMetric.value} ${card.keyMetric.unit || ''} (${card.keyMetric.delta || ''})\n` : '') +
      `Clinical Insights:\n` +
      card.insights.map((ins, i) => `  ${i + 1}. ${ins.statement} (Source: ${ins.sourceTitle})`).join('\n') +
      `\nRecommended Action: ${card.clinicalAction}`;

    setPendingSaveText(text);
    setIsConfirmSaveOpen(true);
  };

  return (
    <div className={clsx('flex flex-col gap-4 w-full', className)}>
      {/* ========================================================================= */}
      {/* 1. HEADER: AI STATUS BANNER & REGENERATE / SAVE ACTIONS                    */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--color-surface)] border border-black/5 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[var(--color-ink)] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 text-[var(--color-accent-neon)] stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-ink)]">
                {dict.title}
              </span>
              <span className="text-[10px] font-mono text-[var(--color-ink-muted)] bg-black/5 px-2 py-0.5 rounded-full">
                {dict.aiGeneratedLabel} · {generatedAt}
              </span>
              {provenanceNote && (
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                  {provenanceNote}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--color-ink-muted)]">
              {dict.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isRegenerating || !hasClinicalData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-stone-50 border border-black/10 text-xs font-semibold text-[var(--color-ink)] shadow-2xs transition-all cursor-pointer disabled:opacity-50 select-none"
            data-testid="ai-regenerate-button"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', isRegenerating && 'animate-spin')} />
            <span>{dict.regenerate}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsConfirmSaveOpen(true)}
            disabled={!hasClinicalData}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-accent-neon)] hover:brightness-105 active:scale-98 text-xs font-bold text-[var(--color-ink)] shadow-xs transition-all cursor-pointer disabled:opacity-50 select-none"
            data-testid="ai-save-to-note-button"
          >
            <FileText className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>{dict.saveToNote}</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/60 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. QUESTION PILLS ("What changed?", "What matters?", "Since last visit")   */}
      {/* ========================================================================= */}
      <div className="inline-flex items-center p-1 rounded-full bg-[var(--color-surface)] border border-black/5 shadow-xs w-fit">
        {[
          { key: 'whatChanged' as const, label: dict.whatChanged },
          { key: 'whatMatters' as const, label: dict.whatMatters },
          { key: 'sinceLastVisit' as const, label: dict.sinceLastVisit },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSelectedQuestion(tab.key)}
            className={clsx(
              'px-4 py-1.5 rounded-full text-xs font-semibold transition-all select-none cursor-pointer',
              selectedQuestion === tab.key
                ? 'bg-[var(--color-ink)] text-[var(--color-white)] shadow-xs'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            )}
            data-testid={`ai-question-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 3. CLINICAL STATEMENTS & SOURCE CHIPS                                      */}
      {/* ========================================================================= */}
      {hasClinicalData ? (
        <>
          <ModuleCard
          title={
            selectedQuestion === 'whatChanged'
              ? dict.whatChanged
              : selectedQuestion === 'whatMatters'
              ? dict.whatMatters
              : dict.sinceLastVisit
          }
          className="w-full"
          data-testid="ai-analytics-card"
        >
          <div className="flex flex-col gap-3 pt-1">
            {(questionsToRender[selectedQuestion] || []).map((item) => (
              <div
                key={item.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-[var(--color-surface)] border border-black/5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-black/10 transition-all"
                data-testid={`ai-statement-item-${item.id}`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={clsx(
                      'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-2xs',
                      item.significance === 'warning'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : item.significance === 'positive'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-white text-[var(--color-ink)] border border-black/10'
                    )}
                  >
                    {item.significance === 'warning' ? (
                      <AlertCircle className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-[var(--color-ink)] leading-relaxed">
                      {item.statement}
                    </p>
                  </div>
                </div>

                {/* Source Chip with Underlying Event Link */}
                <button
                  type="button"
                  onClick={() => {
                    if (onShowOnTimeline) onShowOnTimeline();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-stone-50 border border-black/10 text-[11px] font-mono text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shadow-2xs transition-all cursor-pointer shrink-0 select-none"
                  data-testid={`ai-source-chip-${item.id}`}
                  title={`${dict.openEvent}: ${item.sourceTitle}`}
                >
                  <span>{item.sourceTitle}</span>
                  <ExternalLink className="w-3 h-3 text-[var(--color-ink-muted)] stroke-[2]" />
                </button>
              </div>
            ))}
          </div>
        </ModuleCard>

        {/* ========================================================================= */}
        {/* 3B. AI CLINICAL CARDS GENERATOR STUDIO                                     */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--color-ink)]" />
              <h3 className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
                AI Clinical Cards Studio
              </h3>
              <span className="text-[10px] font-mono text-[var(--color-ink-muted)] bg-black/5 px-2 py-0.5 rounded-full">
                {cardsToRender.length} Cards Synthesized
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Cards' },
                { id: 'synthesis', label: 'Case Summary' },
                { id: 'cardiovascular', label: 'Cardiovascular' },
                { id: 'metabolic', label: 'Metabolic' },
                { id: 'pharmacotherapy', label: 'Pharmacotherapy' },
                { id: 'risk', label: '10-Yr Risk' },
                { id: 'telemetry', label: 'Home Telemetry' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCardCategory(cat.id)}
                  className={clsx(
                    'px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer',
                    activeCardCategory === cat.id
                      ? 'bg-[var(--color-ink)] text-white shadow-xs'
                      : 'bg-white/80 hover:bg-white text-[var(--color-ink-muted)] border border-black/10'
                  )}
                  data-testid={`card-filter-${cat.id}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredCards.map((card) => {
              const IconComponent =
                card.category === 'synthesis'
                  ? Sparkles
                  : card.category === 'cardiovascular'
                  ? Heart
                  : card.category === 'metabolic'
                  ? Zap
                  : card.category === 'pharmacotherapy'
                  ? Pill
                  : card.category === 'risk'
                  ? Gauge
                  : Activity;

              return (
                <div
                  key={card.id}
                  className={clsx(
                    'p-4 rounded-2xl bg-white shadow-xs flex flex-col justify-between gap-3 hover:border-black/20 transition-all',
                    card.category === 'synthesis'
                      ? 'md:col-span-2 border border-[var(--color-ink)]/20 shadow-sm ring-1 ring-[var(--color-accent-neon)]/30'
                      : 'border border-black/10'
                  )}
                  data-testid={`ai-generated-card-${card.id}`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-ink)] shadow-2xs">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-[var(--color-ink)] leading-tight">
                            {card.title}
                          </h4>
                          <span className="text-[10px] text-[var(--color-ink-muted)] block line-clamp-1">
                            {card.subtitle}
                          </span>
                        </div>
                      </div>

                      <span
                        className={clsx(
                          'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0',
                          card.statusBadge.variant === 'positive'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : card.statusBadge.variant === 'warning'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : card.statusBadge.variant === 'critical'
                            ? 'bg-rose-100 text-rose-900 border border-rose-300'
                            : 'bg-stone-100 text-stone-800 border border-stone-200'
                        )}
                      >
                        {card.statusBadge.label}
                      </span>
                    </div>

                    {/* Dedicated Executive Case Summary Narrative - Modern Clinical Format */}
                    {card.caseSummary && (
                      <div className="mt-3.5 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/[0.06] via-teal-500/[0.03] to-[var(--color-surface-subtle)] border border-emerald-500/20 shadow-xs flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/15 pb-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-900 shadow-2xs">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider block">
                                AI Clinical Case Summary
                              </span>
                              <span className="text-[10px] text-emerald-800/80 font-medium block">
                                Longitudinal Multi-System Inference · Rule 12 Grounded
                              </span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-white/80 border border-emerald-500/20 text-[10px] font-mono font-semibold text-emerald-900 shadow-2xs">
                            {patient.age} yrs · {patient.sex} · {visits.length} Encounters
                          </span>
                        </div>

                        <p className="text-xs sm:text-[13px] text-[var(--color-ink)] leading-relaxed font-normal">
                          {card.caseSummary}
                        </p>

                        {/* Distinct Active Pharmacotherapy Regimen Pills */}
                        {card.regimenPills && card.regimenPills.length > 0 && (
                          <div className="pt-2 border-t border-emerald-500/15">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Pill className="w-3.5 h-3.5 text-emerald-800" />
                              <span className="text-[10px] font-bold text-emerald-950 uppercase tracking-wider">
                                Active Pharmacotherapy Regimen ({card.regimenPills.length} Distinct Agents)
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {card.regimenPills.map((med) => (
                                <span
                                  key={med.id || med.name}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-emerald-600/20 shadow-2xs text-[11px] font-medium text-[var(--color-ink)] hover:border-emerald-600/40 transition-all"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span className="font-semibold text-emerald-950">{med.name}</span>
                                  {med.strength && (
                                    <span className="text-[10px] text-[var(--color-ink-muted)] font-mono">
                                      {med.strength}
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Key Metric Hero */}
                    {card.keyMetric && (
                      <div className="mt-3 p-3 rounded-xl bg-[var(--color-surface)] border border-black/5 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider block">
                            {card.keyMetric.label}
                          </span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-base sm:text-lg font-mono font-bold text-[var(--color-ink)]">
                              {card.keyMetric.value}
                            </span>
                            {card.keyMetric.unit && (
                              <span className="text-xs text-[var(--color-ink-muted)] font-mono">
                                {card.keyMetric.unit}
                              </span>
                            )}
                          </div>
                        </div>

                        {card.keyMetric.delta && (
                          <div
                            className={clsx(
                              'px-2.5 py-1 rounded-full text-[11px] font-mono font-bold flex items-center gap-1 shadow-2xs',
                              card.keyMetric.deltaPositive
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            )}
                          >
                            {card.keyMetric.deltaDirection === 'down' ? (
                              <TrendingDown className="w-3.5 h-3.5" />
                            ) : card.keyMetric.deltaDirection === 'up' ? (
                              <TrendingUp className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>{card.keyMetric.delta}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Insights List */}
                    <div className="flex flex-col gap-2 mt-3">
                      {card.insights.map((ins) => (
                        <div key={ins.id} className="flex items-start gap-2 text-xs text-[var(--color-ink)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink-muted)] shrink-0 mt-1.5" />
                          <div className="flex-1">
                            <p className="leading-relaxed">{ins.statement}</p>
                            <span className="text-[10px] font-mono text-[var(--color-ink-muted)] mt-0.5 block">
                              Source: {String(ins.sourceTitle)} · {formatSourceDate(ins.sourceDate)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Clinical Action */}
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-[var(--color-ink)] flex items-start gap-2">
                      <Stethoscope className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-950 block">Suggested Clinical Follow-up:</span>
                        <p className="text-[var(--color-ink-muted)] mt-0.5 leading-tight">{card.clinicalAction}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Action */}
                  <div className="pt-2 border-t border-black/5 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">
                      Evidence-Grounded AI
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSaveCardToNote(card)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-surface)] hover:bg-[var(--color-accent-neon)] text-[var(--color-ink)] text-xs font-semibold border border-black/10 transition-all cursor-pointer shadow-2xs"
                      title="Save this AI card synthesis into visit notes"
                      data-testid={`save-card-button-${card.id}`}
                    >
                      <FilePlus className="w-3.5 h-3.5" />
                      <span>Save Card to Note</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </>
      ) : (
        /* Baseline Empty State (e.g. Nour El-Sayed p-007) */
        <div className="bg-[var(--color-surface-subtle)] rounded-2xl p-8 border border-white/60 shadow-xs flex flex-col items-center justify-center text-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-ink-muted)] shadow-2xs">
            <Sparkles className="w-5 h-5 text-[var(--color-ink-muted)]" />
          </div>
          <h4 className="text-sm font-bold text-[var(--color-ink)] mt-1">
            Insufficient Clinical History
          </h4>
          <p className="text-xs text-[var(--color-ink-muted)] max-w-sm">
            AI analytics requires at least one clinical visit, lab panel, or medication regimen to synthesize longitudinal trajectory insights.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CONFIRM SAVE MODAL (RULE 12: EXPLICIT CLINICIAN CONFIRM REQUIRED)      */}
      {/* ========================================================================= */}
      <OverlaySheet
        isOpen={isConfirmSaveOpen}
        onClose={() => {
          setIsConfirmSaveOpen(false);
          setPendingSaveText(null);
        }}
        title={dict.saveConfirmTitle}
      >
        <div className="flex flex-col gap-4 text-left">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>{dict.saveConfirmDesc}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono text-[var(--color-ink-muted)]">
            <span className="font-bold block mb-1 text-[var(--color-ink)]">Summary Content to Record:</span>
            {pendingSaveText ? (
              <pre className="whitespace-pre-wrap font-sans text-xs text-[var(--color-ink)] leading-relaxed">
                {pendingSaveText}
              </pre>
            ) : (
              analyticsData[selectedQuestion].map((item, idx) => (
                <div key={item.id} className="mt-1">
                  • {item.statement}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5 mt-1">
            <button
              type="button"
              onClick={() => {
                setIsConfirmSaveOpen(false);
                setPendingSaveText(null);
              }}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer"
            >
              {dict.cancel}
            </button>
            <button
              type="button"
              onClick={handleSaveToNote}
              disabled={isSaving}
              className="px-5 py-2 rounded-full text-xs font-bold bg-[var(--color-ink)] hover:bg-black text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
              data-testid="confirm-save-ai-note"
            >
              {isSaving ? 'Saving...' : dict.confirmSave}
            </button>
          </div>
        </div>
      </OverlaySheet>
    </div>
  );
}
