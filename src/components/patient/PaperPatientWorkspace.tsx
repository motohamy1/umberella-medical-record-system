'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Plus, SlidersHorizontal, ChevronRight, X, Heart, Activity, FileText, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Patient, CareEvent } from '@/data/types';

interface PaperPatientWorkspaceProps {
  patient: Patient;
  careEvents?: CareEvent[];
  onAddEntry?: () => void;
}

export function PaperPatientWorkspace({
  patient,
  careEvents = [],
  onAddEntry,
}: PaperPatientWorkspaceProps) {
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<'Overview' | 'AI Analysis' | 'Visits' | 'Labs' | 'Imaging' | 'Genetics'>('Overview');

  // Filter pills state
  const [activeFilters, setActiveFilters] = useState<string[]>(['Office Visits', 'Medications', 'Labs']);

  // Selected event on timeline (for interactive preview popover)
  const [selectedEventId, setSelectedEventId] = useState<string | null>('mri-1');
  const [isMriModalOpen, setIsMriModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [timelineWindow, setTimelineWindow] = useState<'2020' | '2021' | '2022' | 'all'>('2022');

  // Close modal on Escape key
  useEffect(() => {
    if (!isMriModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMriModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMriModalOpen]);

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const timelineEventsMap: Record<string, {
    title: string;
    category: string;
    date: string;
    details: string;
    status: string;
    metrics?: string;
    actionLabel?: string;
    onAction?: () => void;
  }> = {
    'visit-1': {
      title: 'Consultation & Initial Triage',
      category: 'Clinical Visit',
      date: '12 May 2026',
      details: 'Emergency clinical encounter following cranial trauma. Neurological baseline documented. Attending: Dr. Tarek.',
      status: 'Completed',
      metrics: 'GCS 15 • Normotensive',
    },
    'med-1': {
      title: 'Analgesic & Supportive Pharmacotherapy',
      category: 'Medication Order',
      date: '16 May 2026',
      details: 'Acetaminophen 500mg PO PRN q6h; Ibuprofen 400mg with meals. Monitored for gastrointestinal tolerance.',
      status: 'Active',
      metrics: '2 Prescriptions Dispensed',
    },
    'visit-2': {
      title: 'Post-Trauma Follow-Up Visit',
      category: 'Clinical Visit',
      date: '04 June 2026',
      details: 'Evaluation of intermittent fronto-temporal headaches. Reduced photophobia reported. Scheduled diagnostic neuroimaging.',
      status: 'Completed',
      metrics: 'BP 118/76 • HR 78 bpm',
    },
    'lab-1': {
      title: 'Comprehensive Metabolic Panel',
      category: 'Laboratory Investigation',
      date: '15 June 2026',
      details: 'Serum electrolytes, fasting glycemia (83 mg/dL), and renal profile within normative clinical intervals.',
      status: 'Normal',
      metrics: '3 Panels Reported',
    },
    'mri-1': {
      title: 'Brain & Thoracic MRI Study (3.0T)',
      category: 'Imaging Examination',
      date: '18 June 2026',
      details: 'Axial T1/T2 FLAIR sequences. Ventricular symmetry preserved. No evidence of mass effect, herniation, or acute hematoma.',
      status: 'Verified',
      metrics: 'Siemens Prisma 3.0T',
      actionLabel: 'Inspect MRI Study',
      onAction: () => setIsMriModalOpen(true),
    },
    'visit-3': {
      title: 'Mid-Summer Ambulatory Review',
      category: 'Clinical Visit',
      date: '02 August 2026',
      details: 'Stable recovery trajectory. Physical therapy and cognitive rest adherence reviewed.',
      status: 'Completed',
      metrics: 'HR 84 bpm • SpO2 99%',
    },
    'visit-4': {
      title: 'Multidisciplinary Care Coordination',
      category: 'Clinical Visit',
      date: '24 August 2026',
      details: 'Finalizing ambulatory care plan and cleared for gradual return to regular activities.',
      status: 'Completed',
      metrics: 'Stable Triage',
    },
    'lab-2': {
      title: 'Endocrine & Metabolic Follow-Up',
      category: 'Laboratory Investigation',
      date: '07 September 2026',
      details: 'Fasting lipid panel and glycation assessment. All values stable across longitudinal timeline projection.',
      status: 'Normal',
      metrics: '6 Analytes Normal',
    },
  };

  const stepladderTabs = [
    {
      id: 'Overview',
      label: 'Overview',
      stepClass: 'w-[118px] sm:w-[136px] h-[68px] sm:h-[76px] mt-0 rounded-[20px] font-bold text-sm sm:text-base',
      bgClass: 'bg-[var(--color-accent-neon)] text-[var(--color-ink)] shadow-md',
      activeRing: 'ring-2 ring-black/20',
    },
    {
      id: 'AI Analysis',
      label: 'AI Analysis',
      stepClass: 'w-[106px] sm:w-[122px] h-[60px] sm:h-[68px] mt-1.5 sm:mt-2 rounded-[18px] font-semibold text-xs sm:text-sm',
      bgClass: 'bg-[var(--color-tab-slate1)] text-[var(--color-white)] shadow-xs',
      activeRing: 'ring-2 ring-[var(--color-accent-neon)]',
    },
    {
      id: 'Visits',
      label: 'Visits',
      stepClass: 'w-[88px] sm:w-[102px] h-[56px] sm:h-[64px] mt-3 sm:mt-3.5 rounded-[18px] font-medium text-xs',
      bgClass: 'bg-[var(--color-tab-slate2)] text-[var(--color-white)] shadow-xs',
      activeRing: 'ring-2 ring-[var(--color-accent-neon)]',
    },
    {
      id: 'Labs',
      label: 'Labs',
      stepClass: 'w-[80px] sm:w-[94px] h-[48px] sm:h-[56px] mt-5 sm:mt-5.5 rounded-[16px] font-medium text-xs',
      bgClass: 'bg-[var(--color-tab-slate1)] text-[var(--color-white)] shadow-xs',
      activeRing: 'ring-2 ring-[var(--color-accent-neon)]',
    },
    {
      id: 'Imaging',
      label: 'Imaging',
      stepClass: 'w-[72px] sm:w-[84px] h-[44px] sm:h-[52px] mt-6.5 sm:mt-7 rounded-[16px] font-medium text-[11px] sm:text-xs',
      bgClass: 'bg-[var(--color-tab-slate3)] text-[var(--color-white)] shadow-xs',
      activeRing: 'ring-2 ring-[var(--color-accent-neon)]',
    },
    {
      id: 'Genetics',
      label: 'Genetics',
      stepClass: 'w-[62px] sm:w-[72px] h-[38px] sm:h-[44px] mt-8 sm:mt-8.5 rounded-[14px] font-medium text-[10px] sm:text-[11px]',
      bgClass: 'bg-[var(--color-tab-slate4)] text-[var(--color-white)] shadow-xs',
      activeRing: 'ring-2 ring-[var(--color-accent-neon)]',
    },
  ] as const;

  const filterOptions = [
    'Office Visits',
    'Medications',
    'Labs',
    'Procedures',
    'Hospitalizations',
    'Imaging',
  ];

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)] font-['Inter',system-ui,sans-serif] selection:bg-[var(--color-accent-neon)] selection:text-[var(--color-ink)] p-3 sm:p-6 lg:p-8 flex flex-col justify-start items-center">
      <div className="w-full max-w-[1400px] flex flex-col gap-4 sm:gap-6">
        
        {/* ========================================================================= */}
        {/* TOP BAR / HEADER                                                         */}
        {/* ========================================================================= */}
        <header className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-3">
            <Link
              href="/clinic"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 hover:bg-white text-xs font-semibold text-[var(--color-ink)] transition-all shadow-xs"
              title="Return to Clinic patient list"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Patients</span>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-ink)]">
              ClinicUmberella
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--color-ink-muted)] px-2.5 py-1 rounded-full bg-white/50">
              Workspace Mode: Clinical View
            </span>
            <button
              type="button"
              onClick={onAddEntry}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-ink)] text-white text-xs font-semibold hover:bg-black transition-all shadow-xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Entry</span>
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* PATIENT SUMMARY & SYSTEM MODULES (TOP SECTION)                            */}
        {/* ========================================================================= */}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">

          {/* Patient Profile Card (Left) — Aligned Height & Same Bottom Line */}
          <div className="lg:col-span-4 xl:col-span-3 bg-[var(--color-surface-subtle)] rounded-[24px] p-3.5 sm:p-4 flex flex-col justify-between h-full shadow-sm border border-white/60 relative overflow-hidden">
            <div className="flex flex-col gap-2.5">
              {/* Top Identity Block */}
              <div className="flex items-start gap-3">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl overflow-hidden shrink-0 bg-stone-200 border-2 border-white shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/tiffany-woodward-portrait.jpg"
                    alt={patient.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/tiffany-woodward.png';
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-medium text-[var(--color-ink-muted)] uppercase tracking-wider block">
                    {patient.sex}, {patient.age}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-[var(--color-ink)] leading-snug mt-0.5 truncate">
                    {patient.name}
                  </h2>
                  <span className="text-[10px] text-[var(--color-ink-muted)] font-mono block mt-0.5">
                    {patient.mrn}
                  </span>
                </div>
              </div>

              {/* Social History Card */}
              <div className="p-2 sm:p-2.5 rounded-[12px] bg-[var(--color-surface-muted)] flex items-center justify-between gap-2 border border-white/40">
                <div className="min-w-0">
                  <span className="text-[10px] font-medium text-[var(--color-ink-muted)] block">
                    Social History:
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-ink)] block truncate">
                    {patient.socialHistory || 'Alcohol, Tobacco'}
                  </span>
                </div>
                <button
                  type="button"
                  className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shrink-0 shadow-xs"
                  title="View social history"
                >
                  <ArrowUpRight className="w-3 h-3 stroke-[2]" />
                </button>
              </div>

              {/* Care Plan Card */}
              <div className="p-2 sm:p-2.5 rounded-[12px] bg-[var(--color-surface-muted)] flex items-center justify-between gap-2 border border-white/40">
                <div className="min-w-0">
                  <span className="text-[10px] font-medium text-[var(--color-ink-muted)] block">
                    Care Plan:
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-ink)] block truncate">
                    {patient.carePlan || 'ED care plan'}
                  </span>
                </div>
                <button
                  type="button"
                  className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shrink-0 shadow-xs"
                  title="View care plan details"
                >
                  <ArrowUpRight className="w-3 h-3 stroke-[2]" />
                </button>
              </div>
            </div>

            {/* Bottom Anchor Notch Handle */}
            <div className="pt-1.5 flex flex-col items-center">
              <div className="w-12 h-1 bg-white rounded-full opacity-90 shadow-2xs" />
            </div>
          </div>

          {/* Perspective System Modules, Diagnosis & Vital Signs (Right Column) */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between gap-2.5 sm:gap-3 h-full">

            {/* 1. Body System Perspective Stepladder Tabs (Unbounded, free animation, no internal scroll frame) */}
            <div className="flex items-start gap-1.5 sm:gap-2.5 overflow-visible py-1">
              {stepladderTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    type="button"
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`relative flex flex-col justify-between p-3 select-none cursor-pointer shrink-0 transition-shadow ${tab.stepClass} ${tab.bgClass} ${
                      isActive ? `${tab.activeRing} scale-[1.03] shadow-md z-10` : 'hover:opacity-90 opacity-90'
                    }`}
                  >
                    <span className="leading-tight">{tab.label}</span>
                    {isActive && (
                      <motion.span
                        layoutId="stepladder-active-dot"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                        className="w-1.5 h-1.5 rounded-full bg-current opacity-75 self-end"
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* 2. Patient Clinical Diagnosis & Live Vital Signs Section (Aligned to Same Bottom Line) */}
            <div className="flex-1 flex flex-col justify-end">
              <AnimatePresence mode="wait">
                {activeTab === 'Overview' ? (
                  <motion.div
                    key="tab-overview"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                    className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-3.5 items-stretch h-full"
                  >
                    {/* Diagnosis & Clinical Impression Card (7 cols) */}
                    <div className="xl:col-span-7 bg-[var(--color-surface-subtle)] rounded-[22px] p-3.5 sm:p-4 border border-white/60 shadow-xs flex flex-col justify-between gap-2 h-full">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider">
                              Clinical Diagnosis
                            </span>
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--color-status-warning)]/20 text-[var(--color-ink)] border border-[var(--color-status-warning)]/30">
                              {patient.status}
                            </span>
                          </div>
                          <h3 className="text-sm sm:text-base font-bold text-[var(--color-ink)] leading-snug mt-0.5">
                            {patient.primaryConcern || 'Post-Traumatic Cephalalgia & Mild Concussion'}
                          </h3>
                        </div>

                        <span className="px-2 py-0.5 rounded-md bg-[var(--color-white)] text-[9.5px] font-mono font-semibold text-[var(--color-ink-muted)] border border-black/5 shrink-0">
                          ICD-10: S06.0X0A
                        </span>
                      </div>

                      <p className="text-[11px] text-[var(--color-ink-muted)] line-clamp-2 leading-relaxed">
                        Emergency clinical evaluation following acute closed cranial trauma. Patient reports intermittent fronto-temporal cephalalgia and photosensitivity. Neurological exam GCS 15 with intact cranial nerves.
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[var(--color-border-grid)] text-[10.5px]">
                        <div className="flex items-center gap-1.5 text-[var(--color-ink)] font-medium">
                          <span className="text-[var(--color-ink-muted)]">Attending:</span>
                          <span>Dr. Tarek • Neurology</span>
                        </div>
                        <div className="flex items-center gap-1 text-[var(--color-ink-muted)] font-mono text-[9.5px]">
                          <span>Pathway:</span>
                          <span className="font-semibold text-[var(--color-ink)] bg-[var(--color-white)] px-1.5 py-0.5 rounded border border-black/5">
                            {patient.carePlan || 'ED Protocol'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Live Vital Signs Panel (5 cols) */}
                    <div className="xl:col-span-5 bg-[var(--color-surface-subtle)] rounded-[22px] p-3 sm:p-3.5 border border-white/60 shadow-xs flex flex-col justify-between gap-2 h-full">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider">
                          Current Vital Signs
                        </span>
                        <span className="flex items-center gap-1 text-[9.5px] font-semibold text-[var(--color-status-success)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-status-success)] animate-pulse" />
                          Telemetry Active
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                        <div className="p-2 rounded-[12px] bg-[var(--color-surface-muted)] border border-white/40 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[9.5px] text-[var(--color-ink-muted)]">
                            <span className="font-medium">Heart Rate</span>
                            <Activity className="w-2.5 h-2.5 text-[var(--color-status-success)]" />
                          </div>
                          <div className="mt-0.5 flex items-baseline gap-1">
                            <span className="text-sm sm:text-base font-bold text-[var(--color-ink)] leading-none">89</span>
                            <span className="text-[9px] font-medium text-[var(--color-ink-muted)]">bpm</span>
                          </div>
                          <span className="text-[8px] text-[var(--color-ink-muted)] mt-0.5 truncate">Normal sinus</span>
                        </div>

                        <div className="p-2 rounded-[12px] bg-[var(--color-surface-muted)] border border-white/40 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[9.5px] text-[var(--color-ink-muted)]">
                            <span className="font-medium">Blood Pressure</span>
                            <Heart className="w-2.5 h-2.5 text-[var(--color-status-success)]" />
                          </div>
                          <div className="mt-0.5 flex items-baseline gap-1">
                            <span className="text-sm sm:text-base font-bold text-[var(--color-ink)] leading-none">118/76</span>
                            <span className="text-[9px] font-medium text-[var(--color-ink-muted)]">mmHg</span>
                          </div>
                          <span className="text-[8px] text-[var(--color-ink-muted)] mt-0.5 truncate">Normotensive</span>
                        </div>

                        <div className="p-2 rounded-[12px] bg-[var(--color-surface-muted)] border border-white/40 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[9.5px] text-[var(--color-ink-muted)]">
                            <span className="font-medium">SpO2 Oxygen</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-status-success)]" />
                          </div>
                          <div className="mt-0.5 flex items-baseline gap-1">
                            <span className="text-sm sm:text-base font-bold text-[var(--color-ink)] leading-none">98</span>
                            <span className="text-[9px] font-medium text-[var(--color-ink-muted)]">%</span>
                          </div>
                          <span className="text-[8px] text-[var(--color-ink-muted)] mt-0.5 truncate">Room air</span>
                        </div>

                        <div className="p-2 rounded-[12px] bg-[var(--color-surface-muted)] border border-white/40 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[9.5px] text-[var(--color-ink-muted)]">
                            <span className="font-medium">Glucose</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-status-success)]" />
                          </div>
                          <div className="mt-0.5 flex items-baseline gap-1">
                            <span className="text-sm sm:text-base font-bold text-[var(--color-ink)] leading-none">83</span>
                            <span className="text-[9px] font-medium text-[var(--color-ink-muted)]">mg/dL</span>
                          </div>
                          <span className="text-[8px] text-[var(--color-ink-muted)] mt-0.5 truncate">Fasting glycemia</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`tab-domain-${activeTab}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                    className="bg-[var(--color-surface-subtle)] rounded-[22px] p-3.5 sm:p-4 border border-white/60 shadow-xs flex flex-col justify-between gap-2 h-full min-h-[140px]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider">
                            Perspective Domain
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--color-accent-neon)] text-[var(--color-ink)]">
                            {activeTab}
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-[var(--color-ink)] leading-snug mt-0.5">
                          {activeTab === 'AI Analysis' && 'Longitudinal Trend & Trajectory Inference'}
                          {activeTab === 'Visits' && 'Clinical Encounters & Specialty Consultations'}
                          {activeTab === 'Labs' && 'Biochemical Markers & Longitudinal Lab Trends'}
                          {activeTab === 'Imaging' && 'Diagnostic Scans, PACS & Modality Records'}
                          {activeTab === 'Genetics' && 'Genomic Panels & Pharmacogenetic Markers'}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-[var(--color-white)] text-[9.5px] font-mono font-semibold text-[var(--color-ink-muted)] border border-black/5 shrink-0">
                        Perspective Filtered
                      </span>
                    </div>

                    <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed">
                      {activeTab === 'AI Analysis' && 'AI telemetry synthesis indicates stable post-concussive recovery with reducing headache frequency. Medication adherence verified.'}
                      {activeTab === 'Visits' && 'Chronological visit records spanning May to September 2026. 4 consultations logged with Dr. Tarek (Neurology).'}
                      {activeTab === 'Labs' && 'Longitudinal panels reflect normative fasting glycemia (83 mg/dL) and consistent electrolyte balance across all clinic milestone tests.'}
                      {activeTab === 'Imaging' && 'Contrast MRI study completed 18 June 2026. Normal ventricular kinetics and absence of acute intracranial lesions documented.'}
                      {activeTab === 'Genetics' && 'Targeted pharmacogenomic profile shows standard CYP2C19 and CYP2D6 metabolizer status. No contraindications flagged.'}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[var(--color-border-grid)] text-[10.5px]">
                      <div className="flex items-center gap-1.5 text-[var(--color-ink)] font-medium">
                        <span className="text-[var(--color-ink-muted)]">Active Scope:</span>
                        <span>{activeTab} Domain Telemetry</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('Overview')}
                        className="px-2 py-0.5 rounded bg-[var(--color-white)] hover:bg-stone-50 border border-black/5 text-[9.5px] font-semibold text-[var(--color-ink)] transition-colors cursor-pointer"
                      >
                        Return to Clinical Overview
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>


        {/* ========================================================================= */}
        {/* TIMELINE FILTERS TOOLBAR (DIRECTLY ABOVE CARE TIMELINE)                   */}
        {/* ========================================================================= */}
        <div className="w-full flex flex-wrap items-center justify-between gap-3 px-1 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="w-8 h-8 rounded-full bg-[var(--color-white)] flex items-center justify-center text-[var(--color-ink-muted)] shadow-xs hover:text-[var(--color-ink)] shrink-0 border border-black/5 transition-colors"
              title="Filter settings"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            {filterOptions.map((opt) => {
              const isSelected = activeFilters.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleFilter(opt)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shadow-xs cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[var(--color-white)] text-[var(--color-ink)] font-semibold border border-black/10 scale-102'
                      : 'bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)] hover:bg-white/80'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[var(--color-white)] border border-black/5 shadow-xs">
              Timeline Filter: {activeFilters.length} active
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARE TIMELINE SECTION (CENTER CANVAS)                                     */}
        {/* ========================================================================= */}
        <section className="bg-transparent rounded-[28px] p-4 sm:p-6 relative overflow-hidden flex flex-col gap-6">
          
          {/* Timeline Months Grid Header */}
          <div className="relative w-full">
            
            {/* Main Axis Line */}
            <div className="w-full h-[1.5px] bg-[var(--color-axis-line)] absolute top-12 left-0 right-0 z-0" />

            {/* Branch Lines SVG Background */}
            <svg
              className="w-full h-44 absolute top-12 left-0 pointer-events-none z-0"
              viewBox="0 0 1000 120"
              preserveAspectRatio="none"
              fill="none"
              stroke="var(--color-border-hairline)"
              strokeWidth="1.2"
            >
              {/* Branch curves descending down to events */}
              <path d="M50 0 v50" />
              <path d="M160 0 v35 c0 15 15 25 35 25" />
              <path d="M340 0 v45" />
              <path d="M520 0 v40" />
              <path d="M680 0 v45" />
              <path d="M860 0 v50" />
            </svg>

            {/* Month Grid Markers & Events Container */}
            <div className="relative z-10 w-full min-h-[220px]">
              
              {/* Month Columns Labels */}
              <div className="grid grid-cols-4 w-full text-xs font-medium text-[var(--color-ink-muted)] pt-2 mb-6">
                <div className="pl-4 border-l border-[var(--color-border-grid)] h-40">May</div>
                <div className="pl-4 border-l border-[var(--color-border-grid)] h-40">June</div>
                <div className="pl-4 border-l border-[var(--color-border-grid)] h-40">August</div>
                <div className="pl-4 border-l border-[var(--color-border-grid)] h-40">September</div>
              </div>

              {/* TIMELINE EVENT NODES (Absolute/Relative placement matching Paper) */}
              
              {/* 1. Office Visit (May) - On Axis */}
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="absolute left-[7%] top-[34px] -translate-x-1/2 cursor-pointer z-10"
                onClick={() => setSelectedEventId((prev) => (prev === 'visit-1' ? null : 'visit-1'))}
                title="Office Visit - 12 May"
              >
                <div
                  className={`w-7 h-7 rounded-full bg-[var(--color-accent-neon)] flex items-center justify-center shadow-md transition-all duration-200 ${
                    selectedEventId === 'visit-1'
                      ? 'scale-125 ring-4 ring-[var(--color-accent-neon)]/90 ring-offset-2 ring-offset-[var(--color-canvas)] shadow-lift z-30'
                      : 'hover:scale-110'
                  }`}
                >
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-[var(--color-ink)]" fill="none" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M6 2h4a1 1 0 011 1v1H5V3a1 1 0 011-1z" />
                    <rect x="3" y="4" width="10" height="10" rx="1.5" />
                    <line x1="6" y1="7.5" x2="10" y2="7.5" />
                    <line x1="6" y1="10.5" x2="9" y2="10.5" />
                  </svg>
                </div>
              </motion.div>

              {/* 2. Medication Pill Pin (May) - Below Axis */}
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="absolute left-[17%] top-[78px] -translate-x-1/2 cursor-pointer z-10"
                onClick={() => setSelectedEventId((prev) => (prev === 'med-1' ? null : 'med-1'))}
                title="Medications - 16 May"
              >
                <div
                  className={`w-8 h-8 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center shadow-xs transition-all duration-200 relative border border-white ${
                    selectedEventId === 'med-1'
                      ? 'scale-125 ring-4 ring-[var(--color-accent-neon)] ring-offset-2 ring-offset-[var(--color-canvas)] shadow-lift z-30'
                      : 'hover:scale-110'
                  }`}
                >
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-accent-neon)] text-[var(--color-ink)] text-[10px] font-bold flex items-center justify-center shadow-xs">
                    2
                  </span>
                  <svg viewBox="0 0 16 16" className="w-4 h-4 stroke-[var(--color-ink-muted)]" fill="none" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M7 3a3.5 3.5 0 015 5L7 13a3.5 3.5 0 01-5-5L7 3z" />
                    <line x1="5.5" y1="6.5" x2="10.5" y2="11.5" />
                  </svg>
                </div>
              </motion.div>

              {/* 3. Office Visit (June) - On Axis */}
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="absolute left-[26%] top-[34px] -translate-x-1/2 cursor-pointer z-10"
                onClick={() => setSelectedEventId((prev) => (prev === 'visit-2' ? null : 'visit-2'))}
                title="Office Visit - 04 June"
              >
                <div
                  className={`w-7 h-7 rounded-full bg-[var(--color-accent-neon)] flex items-center justify-center shadow-md transition-all duration-200 ${
                    selectedEventId === 'visit-2'
                      ? 'scale-125 ring-4 ring-[var(--color-accent-neon)]/90 ring-offset-2 ring-offset-[var(--color-canvas)] shadow-lift z-30'
                      : 'hover:scale-110'
                  }`}
                >
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-[var(--color-ink)]" fill="none" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M6 2h4a1 1 0 011 1v1H5V3a1 1 0 011-1z" />
                    <rect x="3" y="4" width="10" height="10" rx="1.5" />
                    <line x1="6" y1="7.5" x2="10" y2="7.5" />
                    <line x1="6" y1="10.5" x2="9" y2="10.5" />
                  </svg>
                </div>
              </motion.div>

              {/* 4. Standalone Pill Pin (June) */}
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="absolute left-[31%] top-[82px] -translate-x-1/2 cursor-pointer z-10"
                onClick={() => setSelectedEventId((prev) => (prev === 'med-1' ? null : 'med-1'))}
                title="Maintenance Medication"
              >
                <div className="w-7 h-7 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 border border-white">
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-[var(--color-ink-muted)]" fill="none" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M7 3a3.5 3.5 0 015 5L7 13a3.5 3.5 0 01-5-5L7 3z" />
                  </svg>
                </div>
              </motion.div>

              {/* 5. Labs Flask Pin (June) */}
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="absolute left-[36%] top-[102px] -translate-x-1/2 cursor-pointer z-10"
                onClick={() => setSelectedEventId((prev) => (prev === 'lab-1' ? null : 'lab-1'))}
                title="Laboratory Investigation - 15 June"
              >
                <div
                  className={`w-8 h-8 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center shadow-xs transition-all duration-200 relative border border-white ${
                    selectedEventId === 'lab-1'
                      ? 'scale-125 ring-4 ring-[var(--color-accent-neon)] ring-offset-2 ring-offset-[var(--color-canvas)] shadow-lift z-30'
                      : 'hover:scale-110'
                  }`}
                >
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-accent-neon)] text-[var(--color-ink)] text-[10px] font-bold flex items-center justify-center shadow-xs">
                    3
                  </span>
                  <svg viewBox="0 0 16 16" className="w-4 h-4 stroke-[var(--color-ink-muted)]" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2h4M7 2v3.5L3 13a1 1 0 001 1h8a1 1 0 001-1L9 5.5V2M4.5 10.5h7" />
                  </svg>
                </div>
              </motion.div>

              {/* 6. Labs Flask Pin (June high) */}
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="absolute left-[40%] top-[84px] -translate-x-1/2 cursor-pointer z-10"
                onClick={() => setSelectedEventId((prev) => (prev === 'lab-1' ? null : 'lab-1'))}
                title="Laboratory Profile"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 relative border border-white">
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-accent-neon)] text-[var(--color-ink)] text-[10px] font-bold flex items-center justify-center shadow-xs">
                    2
                  </span>
                  <svg viewBox="0 0 16 16" className="w-4 h-4 stroke-[var(--color-ink-muted)]" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2h4M7 2v3.5L3 13a1 1 0 001 1h8a1 1 0 001-1L9 5.5V2M4.5 10.5h7" />
                  </svg>
                </div>
              </motion.div>

              {/* 7. MRI EXAMINATION CARD (Late June / July) */}
              <motion.div
                whileHover={{ y: -3, scale: 1.02 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                className="absolute left-[54%] top-[86px] -translate-x-1/2 z-20 group"
              >
                <div className="relative">
                  {/* Stem line connecting to timeline marker */}
                  <div className="w-[1.5px] h-9 bg-[var(--color-border-hairline)] absolute -top-9 left-1/2 -translate-x-1/2" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-surface-subtle)] border-2 border-[var(--color-border-hairline)] absolute -top-9 left-1/2 -translate-x-1/2" />

                  {/* Card Container */}
                  <div
                    onClick={() => {
                      setSelectedEventId('mri-1');
                      setIsMriModalOpen(true);
                    }}
                    className={`w-40 sm:w-48 h-26 sm:h-32 rounded-[20px] overflow-hidden bg-stone-900 border-2 border-white shadow-lift relative cursor-pointer transition-all duration-200 ${
                      selectedEventId === 'mri-1'
                        ? 'ring-4 ring-[var(--color-accent-neon)] ring-offset-2 ring-offset-[var(--color-canvas)]'
                        : 'group-hover:ring-4 group-hover:ring-[var(--color-accent-neon)]/40'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/mri-scan.jpg"
                      alt="MRI Examination"
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    />

                    {/* Modality Tag */}
                    <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-[var(--color-ink)]/90 text-white text-[10px] font-bold tracking-wider backdrop-blur-xs">
                      MRI
                    </div>

                    {/* Forward Open Study Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEventId('mri-1');
                        setIsMriModalOpen(true);
                      }}
                      className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-[var(--color-ink)] text-white flex items-center justify-center hover:bg-black transition-all shadow-md group-hover:scale-105"
                      title="Inspect MRI Study"
                    >
                      <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* 8. Office Visit (August) - On Axis */}
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="absolute left-[58%] top-[34px] -translate-x-1/2 cursor-pointer z-10"
                onClick={() => setSelectedEventId((prev) => (prev === 'visit-3' ? null : 'visit-3'))}
                title="Ambulatory Review - 02 August"
              >
                <div
                  className={`w-7 h-7 rounded-full bg-[var(--color-accent-neon)] flex items-center justify-center shadow-md transition-all duration-200 ${
                    selectedEventId === 'visit-3'
                      ? 'scale-125 ring-4 ring-[var(--color-accent-neon)]/90 ring-offset-2 ring-offset-[var(--color-canvas)] shadow-lift z-30'
                      : 'hover:scale-110'
                  }`}
                >
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-[var(--color-ink)]" fill="none" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M6 2h4a1 1 0 011 1v1H5V3a1 1 0 011-1z" />
                    <rect x="3" y="4" width="10" height="10" rx="1.5" />
                    <line x1="6" y1="7.5" x2="10" y2="7.5" />
                    <line x1="6" y1="10.5" x2="9" y2="10.5" />
                  </svg>
                </div>
              </motion.div>

              {/* 9. Standalone Flask Node (Mid August) */}
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="absolute left-[73%] top-[94px] -translate-x-1/2 cursor-pointer z-10"
                onClick={() => setSelectedEventId((prev) => (prev === 'lab-2' ? null : 'lab-2'))}
                title="Mid August Follow-Up"
              >
                <div className="w-7 h-7 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 border border-white">
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-[var(--color-ink-muted)]" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2h4M7 2v3.5L3 13a1 1 0 001 1h8a1 1 0 001-1L9 5.5V2M4.5 10.5h7" />
                  </svg>
                </div>
              </motion.div>

              {/* 10. Office Visit (Late August) - On Axis */}
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="absolute left-[72%] top-[34px] -translate-x-1/2 cursor-pointer z-10"
                onClick={() => setSelectedEventId((prev) => (prev === 'visit-4' ? null : 'visit-4'))}
                title="Care Coordination - 24 August"
              >
                <div
                  className={`w-7 h-7 rounded-full bg-[var(--color-accent-neon)] flex items-center justify-center shadow-md transition-all duration-200 ${
                    selectedEventId === 'visit-4'
                      ? 'scale-125 ring-4 ring-[var(--color-accent-neon)]/90 ring-offset-2 ring-offset-[var(--color-canvas)] shadow-lift z-30'
                      : 'hover:scale-110'
                  }`}
                >
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-[var(--color-ink)]" fill="none" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M6 2h4a1 1 0 011 1v1H5V3a1 1 0 011-1z" />
                    <rect x="3" y="4" width="10" height="10" rx="1.5" />
                    <line x1="6" y1="7.5" x2="10" y2="7.5" />
                    <line x1="6" y1="10.5" x2="9" y2="10.5" />
                  </svg>
                </div>
              </motion.div>

              {/* 11. Labs Flask Pin (September) - Count 6 */}
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="absolute left-[87%] top-[86px] -translate-x-1/2 cursor-pointer z-10"
                onClick={() => setSelectedEventId((prev) => (prev === 'lab-2' ? null : 'lab-2'))}
                title="Laboratory Investigation - 07 September"
              >
                <div
                  className={`w-8 h-8 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center shadow-xs transition-all duration-200 relative border border-white ${
                    selectedEventId === 'lab-2'
                      ? 'scale-125 ring-4 ring-[var(--color-accent-neon)] ring-offset-2 ring-offset-[var(--color-canvas)] shadow-lift z-30'
                      : 'hover:scale-110'
                  }`}
                >
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-accent-neon)] text-[var(--color-ink)] text-[10px] font-bold flex items-center justify-center shadow-xs">
                    6
                  </span>
                  <svg viewBox="0 0 16 16" className="w-4 h-4 stroke-[var(--color-ink-muted)]" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2h4M7 2v3.5L3 13a1 1 0 001 1h8a1 1 0 001-1L9 5.5V2M4.5 10.5h7" />
                  </svg>
                </div>
              </motion.div>

              {/* 12. Add Event Button on far right of Axis */}
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="absolute right-0 top-[34px] cursor-pointer z-10"
              >
                <button
                  type="button"
                  onClick={onAddEntry}
                  className="w-7 h-7 rounded-full bg-[var(--color-ink)] text-white flex items-center justify-center hover:bg-black transition-all shadow-md active:scale-90"
                  title="Add clinical timeline event"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
              </motion.div>
            </div>
          </div>

          {/* Animated Event Details Callout Drawer */}
          <AnimatePresence>
            {selectedEventId && timelineEventsMap[selectedEventId] && (
              <motion.div
                key={`drawer-${selectedEventId}`}
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="w-full bg-[var(--color-surface-subtle)] rounded-[22px] p-4 sm:p-5 border border-white/80 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--color-accent-neon)] text-[var(--color-ink)] flex items-center justify-center shrink-0 shadow-xs font-bold text-sm">
                    <Activity className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider">
                        {timelineEventsMap[selectedEventId].category}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-white)] text-[var(--color-ink)] border border-black/5">
                        {timelineEventsMap[selectedEventId].date}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-status-success)]/20 text-[var(--color-ink)]">
                        {timelineEventsMap[selectedEventId].status}
                      </span>
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-[var(--color-ink)] mt-0.5 leading-snug">
                      {timelineEventsMap[selectedEventId].title}
                    </h4>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-1 leading-relaxed max-w-3xl">
                      {timelineEventsMap[selectedEventId].details}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[var(--color-white)] text-[var(--color-ink-muted)] border border-black/5 shadow-2xs">
                    {timelineEventsMap[selectedEventId].metrics}
                  </span>
                  {timelineEventsMap[selectedEventId].actionLabel && (
                    <button
                      type="button"
                      onClick={timelineEventsMap[selectedEventId].onAction}
                      className="px-3.5 py-1.5 rounded-full bg-[var(--color-ink)] text-white text-xs font-bold hover:bg-black transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      {timelineEventsMap[selectedEventId].actionLabel}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedEventId(null)}
                    className="w-7 h-7 rounded-full bg-[var(--color-white)] hover:bg-stone-100 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shadow-2xs transition-colors cursor-pointer"
                    title="Dismiss Event Details"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========================================================================= */}
          {/* HISTORY RANGE SCRUBBER BAR (MINI-MAP)                                    */}
          {/* ========================================================================= */}
          <div className="flex items-center gap-3 pt-2 w-full">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shadow-xs"
                title="Zoom out"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(2, z + 0.25))}
                className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shadow-xs"
                title="Zoom in"
              >
                +
              </button>
            </div>

            {/* Interactive Dot Matrix Scrubber Track */}
            <div className="flex-1 h-9 rounded-full bg-white flex items-center px-4 relative overflow-hidden shadow-xs border border-black/5">
              
              {/* Year Labels along the track */}
              <div className="w-full flex items-center justify-between text-[11px] font-medium text-[var(--color-ink-muted)] z-10 px-2 select-none">
                <button
                  type="button"
                  onClick={() => setTimelineWindow('2020')}
                  className={`hover:text-[var(--color-ink)] transition-colors ${timelineWindow === '2020' ? 'font-bold text-[var(--color-ink)]' : ''}`}
                >
                  2020
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineWindow('2021')}
                  className={`hover:text-[var(--color-ink)] transition-colors ${timelineWindow === '2021' ? 'font-bold text-[var(--color-ink)]' : ''}`}
                >
                  2021
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineWindow('2022')}
                  className={`hover:text-[var(--color-ink)] transition-colors ${timelineWindow === '2022' ? 'font-bold text-[var(--color-ink)]' : ''}`}
                >
                  2022
                </button>
              </div>

              {/* Background Activity Dots Matrix */}
              <div className="absolute inset-0 flex items-center justify-around px-6 pointer-events-none opacity-45">
                {Array.from({ length: 48 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-[2px] items-center">
                    <span className="w-[2px] h-[2px] rounded-full bg-[var(--color-ink-muted)]" />
                    <span className="w-[2px] h-[2px] rounded-full bg-[var(--color-ink-muted)] opacity-40" />
                    <span className="w-[2px] h-[2px] rounded-full bg-[var(--color-ink-muted)]" />
                    <span className="w-[2px] h-[2px] rounded-full bg-[var(--color-ink-muted)] opacity-40" />
                  </div>
                ))}
              </div>

              {/* Selected Range Highlight Window (Right section) */}
              <div className="absolute right-1 top-1 bottom-1 w-28 sm:w-36 rounded-full bg-[var(--color-ink)] flex items-center justify-around px-3 text-white shadow-sm cursor-grab active:cursor-grabbing z-20">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="flex flex-col gap-[2px] items-center opacity-60">
                    <span className="w-[2px] h-[2px] rounded-full bg-white" />
                    <span className="w-[2px] h-[2px] rounded-full bg-white opacity-40" />
                    <span className="w-[2px] h-[2px] rounded-full bg-white" />
                  </div>
                ))}
                {/* Drag Grip Handle */}
                <div className="w-1 h-3.5 bg-white rounded-full ml-auto opacity-80" />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* HEALTH RECORDS CARDS (BOTTOM SECTION - 3 SIGNATURE NOTCHED CARDS)         */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
          
          {/* 1. Vital Signs History Card (~50% width) */}
          <div className="lg:col-span-6 bg-[var(--color-surface-subtle)] rounded-[24px] p-5 sm:p-6 flex flex-col justify-between shadow-sm border border-white/60 relative min-h-[170px] overflow-hidden">
            
            {/* Top Scoop Notch Header */}
            <div className="flex items-center justify-between relative z-10">
              <h3 className="text-sm sm:text-base font-bold text-[var(--color-ink)]">
                Vital Signs History
              </h3>

              {/* White center notch handle bar */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-14 h-1.5 bg-white rounded-full shadow-2xs" />

              <button
                type="button"
                className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shadow-xs"
                title="Expand Vital Signs"
              >
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>

            {/* Middle Values & Callout */}
            <div className="flex items-baseline justify-between relative z-10 mt-2">
              <div>
                <span className="text-[11px] font-medium text-[var(--color-ink-muted)] block">
                  Heart Rate
                </span>
                <span className="text-sm font-semibold text-[var(--color-ink)]">
                  89 bpm
                </span>
              </div>

              {/* Peak Reading Callout (120 bpm) */}
              <div className="px-3 py-1 rounded-full bg-white text-[var(--color-ink)] text-xs font-bold shadow-lift flex items-center gap-1.5 border border-black/5 animate-pulse">
                <span className="text-sm font-extrabold">120</span>
                <span className="text-[10px] text-[var(--color-ink-muted)]">bpm</span>
              </div>
            </div>

            {/* Smooth Sine/ECG Waveform Canvas */}
            <div className="relative w-full h-14 mt-2">
              <svg
                viewBox="0 0 227 31"
                className="w-full h-full text-[var(--color-ink-muted)]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                preserveAspectRatio="none"
              >
                <path
                  d="M0.000 13.965C14.654 35.440 29.715 36.156 37.042 15.396C44.776 -6.079 58.209 -2.500 65.943 10.386C76.526 27.566 85.482 3.943 95.658 6.090C105.020 5.375 107.056 21.123 120.081 18.260C131.479 16.112 132.700 6.090 140.434 8.238C151.832 11.101 154.681 28.998 165.265 21.123C180.326 6.806 180.733 3.227 188.060 6.806C198.236 10.386 208.412 26.850 227.137 18.976"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {/* Highlight Dot on Peak */}
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-ink)] border-2 border-white absolute top-2 right-[28%] shadow-xs" />
            </div>
          </div>

          {/* 2. Records Card (~25% width) */}
          <div className="lg:col-span-3 bg-[var(--color-surface-subtle)] rounded-[24px] p-5 sm:p-6 flex flex-col justify-between shadow-sm border border-white/60 relative min-h-[170px] overflow-hidden">
            
            {/* Top Scoop Notch Header */}
            <div className="flex items-center justify-between relative z-10">
              <h3 className="text-sm sm:text-base font-bold text-[var(--color-ink)]">
                Records
              </h3>

              {/* White center notch handle bar */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-14 h-1.5 bg-white rounded-full shadow-2xs" />

              <button
                type="button"
                className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shadow-xs"
                title="Expand Records"
              >
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>

            {/* Date + Soft Coral Record Capsule */}
            <div className="flex items-center gap-3 mt-4">
              <div className="text-center shrink-0 pr-1">
                <span className="text-2xl sm:text-3xl font-bold text-[var(--color-ink)] leading-none block">
                  7
                </span>
                <span className="text-[11px] font-medium text-[var(--color-ink-muted)] uppercase block mt-0.5">
                  Sep
                </span>
              </div>

              {/* Coral Capsule Card */}
              <div className="flex-1 p-2.5 rounded-[18px] bg-[var(--color-status-critical)] flex items-center gap-2.5 shadow-xs border border-white/40 cursor-pointer hover:opacity-95 transition-all">
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 shadow-2xs">
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-[var(--color-ink)]" fill="none" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M6 2h4a1 1 0 011 1v1H5V3a1 1 0 011-1z" />
                    <rect x="3" y="4" width="10" height="10" rx="1.5" />
                    <line x1="6" y1="7.5" x2="10" y2="7.5" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-semibold text-[var(--color-ink)] truncate">
                  Office visit
                </span>
              </div>
            </div>
          </div>

          {/* 3. Labs Card (~25% width) */}
          <div className="lg:col-span-3 bg-[var(--color-surface-subtle)] rounded-[24px] p-5 sm:p-6 flex flex-col justify-between shadow-sm border border-white/60 relative min-h-[170px] overflow-hidden">
            
            {/* Top Scoop Notch Header */}
            <div className="flex items-center justify-between relative z-10">
              <h3 className="text-sm sm:text-base font-bold text-[var(--color-ink)]">
                Labs
              </h3>

              {/* White center notch handle bar */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-14 h-1.5 bg-white rounded-full shadow-2xs" />

              <button
                type="button"
                className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shadow-xs"
                title="Expand Labs"
              >
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>

            {/* Test Value */}
            <div className="flex items-baseline justify-between mt-2">
              <div>
                <span className="text-[11px] font-medium text-[var(--color-ink-muted)] block">
                  Glucose
                </span>
                <span className="text-sm sm:text-base font-bold text-[var(--color-ink)]">
                  83 mg/dL
                </span>
              </div>
              <span className="text-[10px] font-semibold text-[var(--color-status-success)] bg-[var(--color-status-success)]/30 px-2 py-0.5 rounded-full">
                Normal
              </span>
            </div>

            {/* 5-Zone Reference Gauge with Hatched Texture */}
            <div className="relative w-full h-8 flex flex-col justify-end mt-1">
              
              {/* Hatched textured lines */}
              <div className="absolute inset-0 flex items-center justify-around pointer-events-none opacity-25 overflow-hidden">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-[1px] h-4 bg-[var(--color-ink-muted)] rotate-35 origin-top-left"
                  />
                ))}
              </div>

              {/* Indicator Needle at 83 mg/dL */}
              <div className="absolute bottom-2 left-[44%] -translate-x-1/2 flex flex-col items-center z-10">
                <div className="w-2 h-2 rounded-full bg-[var(--color-ink)] border border-white shadow-2xs" />
                <div className="w-[1.5px] h-3.5 bg-[var(--color-ink)]" />
              </div>

              {/* 5 Colored Range Bands */}
              <div className="w-full h-1.5 flex items-center rounded-full overflow-hidden shadow-2xs">
                {/* Low: Red/Peach */}
                <div className="w-[15%] h-full bg-[var(--color-status-warning)]" title="Low (< 70)" />
                {/* Borderline low: Amber */}
                <div className="w-[15%] h-full bg-[var(--color-status-warning)]" title="Borderline (70 - 79)" />
                {/* Target Normal: Green */}
                <div className="w-[40%] h-full bg-[var(--color-status-success)]" title="Normal (80 - 100)" />
                {/* Borderline high: Amber */}
                <div className="w-[15%] h-full bg-[var(--color-status-warning)]" title="Borderline (100 - 125)" />
                {/* High: Red/Peach */}
                <div className="w-[15%] h-full bg-[var(--color-status-warning)]" title="High (> 125)" />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE MRI SCAN MODAL                                                */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isMriModalOpen && (
          <motion.div
            key="mri-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsMriModalOpen(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              key="mri-modal-panel"
              initial={{ opacity: 0, scale: 0.95, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-2xl bg-white rounded-[28px] overflow-hidden shadow-2xl border border-stone-200 flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-full bg-[var(--color-ink)] text-white text-xs font-bold">
                    MRI Study
                  </span>
                  <h3 className="text-base font-bold text-[var(--color-ink)]">
                    Thoracic & Cardiac Cross Section (Contrast)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMriModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 bg-black flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/mri-scan.jpg"
                  alt="High Resolution MRI"
                  className="max-h-[420px] w-auto object-contain rounded-lg"
                />
              </div>

              <div className="p-5 bg-stone-50 text-xs text-[var(--color-ink-muted)] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--color-ink)]">
                    Impression: Normal ventricular wall kinetics. No acute ischemia.
                  </p>
                  <p className="text-[11px] mt-0.5">
                    Acquired: 18 Aug 2026 • Modality: Siemens 3.0T MAGNETOM Prisma
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMriModalOpen(false)}
                  className="px-4 py-2 rounded-full bg-[var(--color-ink)] text-white font-bold hover:bg-black transition-all cursor-pointer"
                >
                  Close Study
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
