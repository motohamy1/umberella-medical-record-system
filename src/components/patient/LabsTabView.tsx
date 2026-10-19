'use client';

/**
 * LabsTabView — Dedicated Diagnostic Laboratory Panels & Biomarker Trends (Slice S10).
 * Specification: docs/PACK.md §6.5 (Labs) & §11 (S10), docs/design/pages.md §6.3
 * 
 * Features:
 * - Grouped by date (Date heading + test cards)
 * - 5-zone RangeBar showing true measured value relative to reference thresholds
 * - Longitudinal Trend Overlay: interactive line chart with shaded target normal band
 * - Unreviewed indicator (accent neon dot) and doctor "Mark reviewed" action
 * - "+ Record Result" modal sheet
 * - Clean empty state for baseline patient (Nour El-Sayed p-007)
 */

import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Calendar,
  Plus,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
  User,
  ChevronRight,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { LabResult } from '@/data/types';
import { RangeBar } from '@/components/cards/RangeBar';
import { OverlaySheet } from '@/components/overlays/OverlaySheet';
import { en } from '@/i18n/en';

interface LabsTabViewProps {
  patientId: string;
  patientName: string;
  labs?: LabResult[];
  onRecordLab?: (newLab: {
    testName: string;
    value: string;
    unit: string;
    referenceLow?: number;
    referenceHigh?: number;
    status?: 'normal' | 'borderline' | 'abnormal' | 'critical';
    occurredAt?: string;
  }) => Promise<void>;
  onMarkReviewed?: (labId: string) => Promise<void>;
  onShowOnTimeline?: (dateStr: string) => void;
  className?: string;
}

export function LabsTabView({
  patientId,
  patientName,
  labs = [],
  onRecordLab,
  onMarkReviewed,
  onShowOnTimeline,
  className,
}: LabsTabViewProps) {
  const dict = en.labs;
  const [filterStatus, setFilterStatus] = useState<'all' | 'abnormal' | 'normal' | 'unreviewed'>('all');
  const [selectedTestName, setSelectedTestName] = useState<string | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Record Lab Form State
  const [newTestName, setNewTestName] = useState('Hemoglobin A1c');
  const [customTestName, setCustomTestName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newUnit, setNewUnit] = useState('%');
  const [newRefLow, setNewRefLow] = useState('4.0');
  const [newRefHigh, setNewRefHigh] = useState('5.6');
  const [newStatus, setNewStatus] = useState<'normal' | 'borderline' | 'abnormal' | 'critical'>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Common standard laboratory panel presets
  const standardPresets: { [key: string]: { unit: string; low: number; high: number } } = {
    'Hemoglobin A1c': { unit: '%', low: 4.0, high: 5.6 },
    'Fasting Blood Glucose': { unit: 'mg/dL', low: 70, high: 99 },
    'LDL Cholesterol': { unit: 'mg/dL', low: 0, high: 100 },
    'Serum Creatinine': { unit: 'mg/dL', low: 0.7, high: 1.3 },
    'Serum Potassium': { unit: 'mmol/L', low: 3.5, high: 5.0 },
    'Total Cholesterol': { unit: 'mg/dL', low: 120, high: 200 },
    'HDL Cholesterol': { unit: 'mg/dL', low: 40, high: 60 },
    'Triglycerides': { unit: 'mg/dL', low: 50, high: 150 },
    'Other / Custom Biomarker': { unit: '', low: 0, high: 100 },
  };

  const handlePresetChange = (name: string) => {
    setNewTestName(name);
    const preset = standardPresets[name];
    if (preset) {
      setNewUnit(preset.unit);
      setNewRefLow(String(preset.low));
      setNewRefHigh(String(preset.high));
    }
  };

  // Filter labs
  const filteredLabs = useMemo(() => {
    if (filterStatus === 'all') return labs;
    if (filterStatus === 'abnormal') return labs.filter((l) => l.status === 'abnormal' || l.status === 'critical');
    if (filterStatus === 'normal') return labs.filter((l) => l.status === 'normal' || l.status === 'borderline');
    if (filterStatus === 'unreviewed') return labs.filter((l) => !l.reviewedAt || !l.reviewedBy);
    return labs;
  }, [labs, filterStatus]);

  // Group labs chronologically by Date
  const groupedLabs = useMemo(() => {
    const groups: { [dateStr: string]: LabResult[] } = {};
    for (const l of filteredLabs) {
      try {
        const d = new Date(l.occurredAt);
        const formatted = !isNaN(d.getTime())
          ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'Other Dates';
        if (!groups[formatted]) {
          groups[formatted] = [];
        }
        groups[formatted].push(l);
      } catch {
        if (!groups['Other Dates']) groups['Other Dates'] = [];
        groups['Other Dates'].push(l);
      }
    }
    return groups;
  }, [filteredLabs]);

  // Longitudinal trend series for selected test
  const trendHistory = useMemo(() => {
    if (!selectedTestName) return [];
    return labs
      .filter((l) => l.testName.toLowerCase().trim() === selectedTestName.toLowerCase().trim())
      .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  }, [labs, selectedTestName]);

  // Trend summary delta
  const trendDelta = useMemo(() => {
    if (trendHistory.length < 2) return null;
    const first = parseFloat(trendHistory[0].value);
    const latest = parseFloat(trendHistory[trendHistory.length - 1].value);
    if (isNaN(first) || isNaN(latest)) return null;
    const diff = latest - first;
    const isImproved = diff < 0; // For glucose, HbA1c, LDL lower is improved
    return {
      diff: diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`,
      unit: trendHistory[0].unit,
      isImproved,
      firstDate: new Date(trendHistory[0].occurredAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      latestDate: new Date(trendHistory[trendHistory.length - 1].occurredAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
    };
  }, [trendHistory]);

  const handleMarkReviewed = async (e: React.MouseEvent, labId: string) => {
    e.stopPropagation();
    if (!onMarkReviewed) return;
    setReviewingId(labId);
    try {
      await onMarkReviewed(labId);
    } finally {
      setReviewingId(null);
    }
  };

  const handleCreateLab = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = newTestName === 'Other / Custom Biomarker' ? customTestName : newTestName;
    if (!finalName || !newValue) return;

    setIsSubmitting(true);
    try {
      if (onRecordLab) {
        await onRecordLab({
          testName: finalName,
          value: newValue,
          unit: newUnit,
          referenceLow: newRefLow ? parseFloat(newRefLow) : undefined,
          referenceHigh: newRefHigh ? parseFloat(newRefHigh) : undefined,
          status: newStatus,
          occurredAt: new Date().toISOString(),
        });
      }
      setIsRecordModalOpen(false);
      setNewValue('');
      setCustomTestName('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={clsx('flex flex-col gap-4 w-full font-[\'Inter\',sans-serif]', className)}>
      {/* ========================================================================= */}
      {/* 1. TOP TOOLBAR: FILTER PILLS, COUNT BADGE, RECORD ACTION                  */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filters */}
          <div className="inline-flex items-center p-1 rounded-full bg-[var(--color-surface)] border border-black/5 shadow-xs">
            {(['all', 'abnormal', 'normal', 'unreviewed'] as const).map((st) => {
              const isSelected = filterStatus === st;
              const count =
                st === 'all'
                  ? labs.length
                  : st === 'abnormal'
                  ? labs.filter((l) => l.status === 'abnormal' || l.status === 'critical').length
                  : st === 'normal'
                  ? labs.filter((l) => l.status === 'normal' || l.status === 'borderline').length
                  : labs.filter((l) => !l.reviewedAt || !l.reviewedBy).length;

              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-xs font-semibold transition-all select-none capitalize flex items-center gap-1.5 cursor-pointer',
                    isSelected
                      ? 'bg-[var(--color-ink)] text-[var(--color-white)] shadow-xs'
                      : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                  )}
                >
                  <span>
                    {st === 'all'
                      ? dict.all
                      : st === 'abnormal'
                      ? dict.abnormal
                      : st === 'normal'
                      ? dict.normal
                      : dict.unreviewed}
                  </span>
                  <span
                    className={clsx(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                      isSelected ? 'bg-white/20 text-white' : 'bg-black/5 text-[var(--color-ink-muted)]'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="text-xs font-mono font-medium text-[var(--color-ink-muted)] px-2.5 py-1 rounded-full bg-white/60 border border-black/5 shadow-2xs">
            {filteredLabs.length} {dict.title}
          </span>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={() => setIsRecordModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-accent-neon)] hover:brightness-105 active:scale-98 text-xs font-bold text-[var(--color-ink)] shadow-xs transition-all cursor-pointer select-none"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{dict.recordLab}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. LAB PANELS LIST GROUPED BY DATE                                        */}
      {/* ========================================================================= */}
      {Object.keys(groupedLabs).length === 0 ? (
        <div className="bg-[var(--color-surface-subtle)] rounded-2xl p-8 border border-white/60 shadow-xs flex flex-col items-center justify-center text-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-ink-muted)]">
            <FlaskConical className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-[var(--color-ink)] mt-1">
            {dict.noLabs}
          </h4>
          <p className="text-xs text-[var(--color-ink-muted)] max-w-sm">
            {dict.noLabsDesc}
          </p>
          <button
            type="button"
            onClick={() => setIsRecordModalOpen(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-ink)] text-white text-xs font-semibold shadow-xs hover:bg-black transition-all"
          >
            <Plus className="w-3 h-3" />
            <span>{dict.recordLab}</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(groupedLabs).map(([dateStr, dateLabs]) => (
            <div key={dateStr} className="flex flex-col gap-2.5">
              {/* Date Heading Divider */}
              <div className="flex items-center gap-2 px-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full bg-white text-xs font-mono font-bold text-[var(--color-ink)] border border-black/5 shadow-2xs">
                  <Calendar className="w-3 h-3 text-[var(--color-ink-muted)]" />
                  <span>{dateStr}</span>
                </div>
                <span className="h-px flex-1 bg-black/10" />
                <span className="text-[10px] font-mono font-medium text-[var(--color-ink-muted)]">
                  {dateLabs.length} {dateLabs.length === 1 ? 'test' : 'tests'}
                </span>
              </div>

              {/* Lab Test Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dateLabs.map((lab) => {
                  const isUnreviewed = !lab.reviewedAt || !lab.reviewedBy;
                  const isAbnormal = lab.status === 'abnormal' || lab.status === 'critical';

                  return (
                    <div
                      key={lab.id}
                      onClick={() => setSelectedTestName(lab.testName)}
                      role="button"
                      tabIndex={0}
                      className="bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface)] rounded-2xl p-4 border border-white/80 hover:border-black/15 shadow-xs transition-all cursor-pointer flex flex-col gap-3 group select-none relative"
                    >
                      {/* Card Header: Test Name, Status Pill, Unreviewed Dot, Trend Icon */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {isUnreviewed && (
                            <span
                              className="w-2 h-2 rounded-full bg-[var(--color-accent-neon)] ring-2 ring-amber-300 animate-pulse shrink-0"
                              title="Unreviewed by clinician"
                            />
                          )}
                          <span className="text-sm font-bold text-[var(--color-ink)] truncate group-hover:text-black">
                            {lab.testName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Status Pill */}
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider',
                              lab.status === 'normal'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : lab.status === 'borderline'
                                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                : lab.status === 'critical'
                                ? 'bg-purple-900 text-white'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            )}
                          >
                            {lab.status}
                          </span>

                          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink)] shadow-2xs group-hover:scale-105 transition-all">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>

                      {/* RangeBar Component with 5-Zone Track */}
                      <div className="w-full">
                        <RangeBar
                          label=""
                          value={lab.value}
                          unit={lab.unit}
                          lowThreshold={lab.referenceLow}
                          highThreshold={lab.referenceHigh}
                          referenceLow={lab.referenceLow}
                          referenceHigh={lab.referenceHigh}
                          showLabels={true}
                        />
                      </div>

                      {/* Card Footer: Reviewer status & Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-black/5 text-xs text-[var(--color-ink-muted)]">
                        <div className="flex items-center gap-1.5">
                          {lab.reviewedBy ? (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-800 font-medium">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>{lab.reviewedBy}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-amber-800">
                              Awaiting Review
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isUnreviewed && onMarkReviewed && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkReviewed(e, lab.id)}
                              disabled={reviewingId === lab.id}
                              className="px-2.5 py-1 rounded-full bg-white hover:bg-stone-50 border border-black/10 text-[11px] font-semibold text-[var(--color-ink)] shadow-2xs cursor-pointer"
                            >
                              {reviewingId === lab.id ? 'Reviewing...' : dict.markReviewed}
                            </button>
                          )}

                          <span className="text-[11px] font-semibold text-[var(--color-ink)] flex items-center gap-1 group-hover:underline">
                            <TrendingUp className="w-3 h-3 text-[var(--color-ink-muted)]" />
                            <span>View Trend</span>
                          </span>
                        </div>
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
      {/* 3. LONGITUDINAL BIOMARKER TREND OVERLAY SHEET                             */}
      {/* ========================================================================= */}
      <OverlaySheet
        isOpen={Boolean(selectedTestName)}
        onClose={() => setSelectedTestName(null)}
        title={selectedTestName ? `${selectedTestName} Trend Analysis` : 'Biomarker Trend'}
        className="max-w-2xl"
      >
        {selectedTestName && (
          <div className="flex flex-col gap-5 p-4 sm:p-6 font-['Inter',sans-serif]">
            {/* Header Telemetry Summary */}
            {trendHistory.length > 0 && (
              <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-black/5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-[var(--color-ink-muted)]">
                    Latest Reading ({new Date(trendHistory[trendHistory.length - 1].occurredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-extrabold text-[var(--color-ink)] font-mono">
                      {trendHistory[trendHistory.length - 1].value}
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-ink-muted)]">
                      {trendHistory[trendHistory.length - 1].unit}
                    </span>
                  </div>
                </div>

                {trendDelta && (
                  <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-white border border-black/5 shadow-2xs">
                    {trendDelta.isImproved ? (
                      <TrendingDown className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                    )}
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--color-ink)]">
                        {trendDelta.diff} {trendDelta.unit}
                      </span>
                      <span className="text-[10px] text-[var(--color-ink-muted)] font-mono">
                        {trendDelta.firstDate} → {trendDelta.latestDate}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SVG Longitudinal Trend Visualizer */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-ink)]">
                  Longitudinal Progression
                </span>
                <span className="text-[10px] font-mono text-[var(--color-ink-muted)] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20 border border-emerald-500/40" />
                  <span>Target Range ({trendHistory[0]?.referenceLow ?? '-'} - {trendHistory[0]?.referenceHigh ?? '-'} {trendHistory[0]?.unit})</span>
                </span>
              </div>

              {trendHistory.length > 1 ? (
                <div className="w-full bg-white rounded-2xl p-4 border border-black/5 shadow-xs">
                  <svg viewBox="0 0 500 160" className="w-full h-40 overflow-visible">
                    <defs>
                      <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>

                    {(() => {
                      const values = trendHistory.map((t) => parseFloat(t.value) || 0);
                      const refLow = trendHistory[0].referenceLow ?? Math.min(...values);
                      const refHigh = trendHistory[0].referenceHigh ?? Math.max(...values);
                      const minVal = Math.min(...values, refLow) * 0.9;
                      const maxVal = Math.max(...values, refHigh) * 1.1;
                      const valRange = maxVal - minVal > 0 ? maxVal - minVal : 1;

                      const getY = (val: number) => 135 - ((val - minVal) / valRange) * 110;
                      const getX = (idx: number) => 40 + (idx / (trendHistory.length - 1)) * 420;

                      const bandTop = getY(refHigh);
                      const bandBottom = getY(refLow);

                      const points = trendHistory.map((t, idx) => ({
                        x: getX(idx),
                        y: getY(parseFloat(t.value) || 0),
                        val: t.value,
                        date: new Date(t.occurredAt).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
                      }));

                      const pathStr = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                      return (
                        <>
                          {/* Shaded Reference Target Band */}
                          <rect
                            x={30}
                            y={bandTop}
                            width={440}
                            height={Math.max(4, bandBottom - bandTop)}
                            fill="url(#bandGrad)"
                            rx={4}
                          />
                          <line
                            x1={30}
                            y1={bandTop}
                            x2={470}
                            y2={bandTop}
                            stroke="rgb(16, 185, 129)"
                            strokeWidth="1"
                            strokeDasharray="4 3"
                            strokeOpacity="0.5"
                          />
                          <line
                            x1={30}
                            y1={bandBottom}
                            x2={470}
                            y2={bandBottom}
                            stroke="rgb(16, 185, 129)"
                            strokeWidth="1"
                            strokeDasharray="4 3"
                            strokeOpacity="0.5"
                          />

                          {/* Data Connecting Line */}
                          <path
                            d={pathStr}
                            fill="none"
                            stroke="var(--color-ink)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Data Point Dots & Labels */}
                          {points.map((p, i) => (
                            <g key={i}>
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={4.5}
                                fill="var(--color-ink)"
                                stroke="white"
                                strokeWidth="2"
                                className="transition-all hover:scale-125"
                              />
                              {/* Value Label above dot */}
                              <text
                                x={p.x}
                                y={p.y - 10}
                                textAnchor="middle"
                                className="text-[10px] font-mono font-bold fill-[var(--color-ink)]"
                              >
                                {p.val}
                              </text>
                              {/* Date label at bottom */}
                              <text
                                x={p.x}
                                y={150}
                                textAnchor="middle"
                                className="text-[9px] font-mono fill-[var(--color-ink-muted)]"
                              >
                                {p.date}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-stone-100 text-center text-xs text-[var(--color-ink-muted)]">
                  Only 1 measurement recorded for this biomarker. Additional historical readings will generate a longitudinal trend line.
                </div>
              )}
            </div>

            {/* Historical Readings Table */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[var(--color-ink)]">
                {dict.history}
              </span>
              <div className="bg-white rounded-2xl border border-black/5 overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-surface)] border-b border-black/5 text-[11px] font-bold text-[var(--color-ink-muted)]">
                      <th className="p-3">{dict.date}</th>
                      <th className="p-3">{dict.value}</th>
                      <th className="p-3">{dict.status}</th>
                      <th className="p-3">{dict.clinician}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendHistory.map((t, i) => (
                      <tr key={t.id || i} className="border-b border-black/5 last:border-none hover:bg-stone-50">
                        <td className="p-3 font-mono font-semibold text-[var(--color-ink)]">
                          {new Date(t.occurredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-3 font-bold font-mono">
                          {t.value} {t.unit}
                        </td>
                        <td className="p-3">
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase',
                              t.status === 'normal'
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-rose-50 text-rose-800'
                            )}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3 text-[var(--color-ink-muted)]">
                          {t.reviewedBy || 'Pending'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </OverlaySheet>

      {/* ========================================================================= */}
      {/* 4. MODAL: RECORD NEW LAB RESULT SHEET                                      */}
      {/* ========================================================================= */}
      <OverlaySheet
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title={dict.newLabTitle}
        className="max-w-md"
      >
        <form onSubmit={handleCreateLab} className="flex flex-col gap-4 p-4 sm:p-6 font-['Inter',sans-serif]">
          {/* Test Preset Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--color-ink)]">
              {dict.testName}
            </label>
            <select
              value={newTestName}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs font-semibold text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
            >
              {Object.keys(standardPresets).map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </div>

          {newTestName === 'Other / Custom Biomarker' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--color-ink)]">
                Custom Test Name *
              </label>
              <input
                type="text"
                value={customTestName}
                onChange={(e) => setCustomTestName(e.target.value)}
                placeholder="e.g. Ferritin, TSH, Vitamin D"
                required
                className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
              />
            </div>
          )}

          {/* Value and Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--color-ink)]">
                {dict.testValue} *
              </label>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="e.g. 6.5"
                required
                className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs font-bold text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--color-ink)]">
                {dict.testUnit}
              </label>
              <input
                type="text"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="e.g. mg/dL, %"
                className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
              />
            </div>
          </div>

          {/* Reference Low & High */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--color-ink)]">
                {dict.refLow}
              </label>
              <input
                type="text"
                value={newRefLow}
                onChange={(e) => setNewRefLow(e.target.value)}
                placeholder="e.g. 4.0"
                className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--color-ink)]">
                {dict.refHigh}
              </label>
              <input
                type="text"
                value={newRefHigh}
                onChange={(e) => setNewRefHigh(e.target.value)}
                placeholder="e.g. 5.6"
                className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
              />
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--color-ink)]">
              {dict.status}
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs text-[var(--color-ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-ink)]"
            >
              <option value="normal">Normal</option>
              <option value="borderline">Borderline</option>
              <option value="abnormal">Abnormal</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5">
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(false)}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[var(--color-ink-muted)] hover:text-black"
            >
              {dict.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-full bg-[var(--color-ink)] text-white text-xs font-bold shadow-xs hover:bg-black transition-all cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : dict.saveLab}
            </button>
          </div>
        </form>
      </OverlaySheet>
    </div>
  );
}
