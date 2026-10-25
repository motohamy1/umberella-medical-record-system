'use client';

import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Plus, SlidersHorizontal, Heart, Activity, MessageSquare, FileCode, ShieldCheck, Sparkles, Pill, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InteractiveTimeline } from '@/components/timeline/InteractiveTimeline';
import { OverlaySheet } from '@/components/overlays/OverlaySheet';
import { CommunicationModal } from '@/components/communication/CommunicationModal';
import { FHIRInteroperabilityModal } from '@/components/fhir/FHIRInteroperabilityModal';
import { ComplianceCenterModal } from '@/components/compliance/ComplianceCenterModal';
import { deletePatientAction } from '@/data/actions';
import type {
  Patient,
  CareEvent,
  VitalObservation,
  Allergy,
  LabResult,
  Medication,
  MedicationStatus,
  Visit,
  VisitStage,
  VisitStatus,
  ImagingStudy,
  GeneticFinding,
  ActiveIngredient,
} from '@/data/types';
import { MedicationsTabView } from './MedicationsTabView';
import { VisitsTabView } from './VisitsTabView';
import { LabsTabView } from './LabsTabView';
import { ImagingTabView } from './ImagingTabView';
import { AllergiesTabView } from './AllergiesTabView';
import { GeneticsTabView } from './GeneticsTabView';
import { AIAnalyticsTabView } from './AIAnalyticsTabView';
import { PatientContextBar } from './PatientContextBar';
import { generatePatientAICards } from '@/data/patientAIGenerator';

interface PaperPatientWorkspaceProps {
  patient: Patient;
  careEvents?: CareEvent[];
  vitals?: VitalObservation[];
  allergies?: Allergy[];
  labs?: LabResult[];
  medications?: Medication[];
  visits?: Visit[];
  imaging?: ImagingStudy[];
  genetics?: GeneticFinding[];
  onAddEntry?: () => void;
  onUploadStudy?: (study: {
    modality: string;
    title: string;
    reportText?: string;
    imagePath?: string;
    occurredAt?: string;
  }) => Promise<void>;
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
  onChangeMedicationDose?: (medId: string, newStrength: string, dosesPerDay: number, reason: string) => Promise<void>;
  onUpdateMedicationStatus?: (medId: string, status: MedicationStatus, reason?: string) => Promise<void>;
  onRecordVisit?: (newVisit: {
    title: string;
    visitType: string;
    reason: string;
    notes?: string;
    plan?: string;
  }) => Promise<void>;
  onUpdateVisitStage?: (visitId: string, stage: VisitStage, notes?: string) => Promise<void>;
  onUpdateVisitNotes?: (visitId: string, data: { notes?: string; plan?: string; followUpDate?: string }) => Promise<void>;
  onRecordLab?: (newLab: {
    testName: string;
    value: string;
    unit: string;
    referenceLow?: number;
    referenceHigh?: number;
    status?: 'normal' | 'borderline' | 'abnormal' | 'critical';
    occurredAt?: string;
  }) => Promise<void>;
  onMarkLabReviewed?: (labId: string) => Promise<void>;
  onAddAllergy?: (newAllergy: {
    substance: string;
    reaction: string;
    severity: 'mild' | 'moderate' | 'severe' | 'critical';
    status?: string;
  }) => Promise<void>;
  onUpdateAllergy?: (updated: {
    allergyId: string;
    substance?: string;
    reaction?: string;
    severity?: 'mild' | 'moderate' | 'severe' | 'critical';
    status?: string;
  }) => Promise<void>;
  onAddGeneticFinding?: (newFinding: {
    finding: string;
    sourceDocument?: string;
    occurredAt?: string;
    interpretation?: string;
  }) => Promise<void>;
  onSaveAIToNote?: (summaryText: string) => Promise<void>;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function parseRecordDayMonth(dateStr?: string): { day: string; month: string } {
  if (!dateStr) return { day: '14', month: 'Oct' };
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return { day: String(d.getDate()), month: monthNames[d.getMonth()] };
    }
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length >= 2 && !isNaN(parseInt(parts[0], 10))) {
      return { day: parts[0], month: parts[1].slice(0, 3) };
    }
  } catch {}
  return { day: '14', month: 'Oct' };
}

export function PaperPatientWorkspace({
  patient,
  careEvents = [],
  vitals = [],
  allergies = [],
  labs = [],
  medications = [],
  visits = [],
  imaging = [],
  genetics = [],
  onAddEntry,
  onUploadStudy,
  onStartMedication,
  onChangeMedicationDose,
  onUpdateMedicationStatus,
  onRecordVisit,
  onUpdateVisitStage,
  onUpdateVisitNotes,
  onRecordLab,
  onMarkLabReviewed,
  onAddAllergy,
  onUpdateAllergy,
  onAddGeneticFinding,
  onSaveAIToNote,
}: PaperPatientWorkspaceProps) {
  // Navigation tabs state: 8 canonical tabs per docs/PACK.md §2.1 & §6.3
  const [activeTab, setActiveTab] = useState<
    'Overview' | 'AI Analysis' | 'Visits' | 'Medications' | 'Labs' | 'Imaging' | 'Allergies' | 'Genetics'
  >('Overview');

  // Derive critical allergy if present
  const criticalAllergyItem =
    allergies.find((a) => a.severity === 'critical' && a.status === 'active') ||
    allergies.find((a) => a.severity === 'critical') ||
    null;

  // Filter pills state
  const [activeFilters, setActiveFilters] = useState<string[]>(['Office Visits', 'Medications', 'Labs', 'Procedures', 'Hospitalizations', 'Imaging']);

  const [isMriModalOpen, setIsMriModalOpen] = useState(false);

  // Five interactive detail overlay sheet states
  const [isSocialHistoryOpen, setIsSocialHistoryOpen] = useState(false);
  const [isCarePlanOpen, setIsCarePlanOpen] = useState(false);
  const [isVitalsOpen, setIsVitalsOpen] = useState(false);
  const [isRecordsOpen, setIsRecordsOpen] = useState(false);
  const [isLabsOpen, setIsLabsOpen] = useState(false);
  const [isCommunicationOpen, setIsCommunicationOpen] = useState(false);
  const [isFHIROpen, setIsFHIROpen] = useState(false);
  const [isComplianceOpen, setIsComplianceOpen] = useState(false);
  const router = useRouter();
  const [isDeletingGuide, setIsDeletingGuide] = useState(false);

  const handleRemoveGuidePatient = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to remove this sample guide folder? Your patient list will be completely clean.'
    );
    if (!confirmed) return;
    try {
      setIsDeletingGuide(true);
      const res = await deletePatientAction(patient.id);
      if (res.success) {
        router.push('/clinic');
      } else {
        alert(res.error || 'Failed to remove sample folder');
      }
    } catch (err) {
      console.error('Failed to remove sample patient:', err);
    } finally {
      setIsDeletingGuide(false);
    }
  };

  // Derive latest clinical vitals dynamically from patient record
  const isDemo = patient.id === 'p-tiffany' || patient.id === 'p-guide-001';
  const sortedVitals = [...vitals].sort(
    (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()
  );
  const pulseObs = sortedVitals.find((v) => v.metric === 'pulse');
  const pressureObs = sortedVitals.find((v) => v.metric === 'pressure');
  const oxygenObs = sortedVitals.find((v) => v.metric === 'oxygen');
  const glucoseObs =
    sortedVitals.find((v) => v.metric === 'glucose') ||
    labs.find((l) => l.testName.toLowerCase().includes('glucose'));

  const latestPulse = pulseObs ? pulseObs.value : (isDemo ? '78' : '—');
  const latestPressure = pressureObs ? pressureObs.value : (isDemo ? '118/76' : '—');
  const latestOxygen = oxygenObs ? oxygenObs.value : (isDemo ? '98' : '—');
  const latestGlucose = glucoseObs ? glucoseObs.value : (isDemo ? '83' : '—');
  const hasTelemetry = Boolean(pulseObs || pressureObs || oxygenObs || glucoseObs || isDemo);

  const { day: recordDay, month: recordMonth } = parseRecordDayMonth(
    patient.lastVisitDate || careEvents[0]?.occurredAt
  );

  // Compute rich AI Summary Response across patient history, past & present conditions, meds, labs & telemetry
  const { aiSummaryText, aiRegimenPills } = React.useMemo(() => {
    const cards = generatePatientAICards({
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
    const synthesis = cards.find((c) => c.category === 'synthesis');
    return {
      aiSummaryText:
        synthesis?.caseSummary ||
        `${patient.name} is a ${patient.age}-year-old ${patient.sex.toLowerCase()} evaluated for ${
          patient.primaryConcern || 'chronic care management'
        }. Over ${visits?.length || 0} recorded clinical encounters, active pharmacotherapy and structured lifestyle interventions have achieved clinical stabilization with favorable multi-system biomarker trends.`,
      aiRegimenPills: synthesis?.regimenPills || [],
    };
  }, [patient, medications, labs, visits, careEvents, allergies, genetics, imaging, vitals]);

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
      stepClass: 'w-[118px] sm:w-[136px] h-[68px] sm:h-[76px] mt-0 rounded-[20px] text-sm sm:text-base',
      fontClass: 'font-semibold',
      inactiveBgClass: 'bg-[var(--color-tab-slate1)] text-[var(--color-white)] shadow-xs',
    },
    {
      id: 'AI Analysis',
      label: 'AI Analysis',
      stepClass: 'w-[106px] sm:w-[122px] h-[60px] sm:h-[68px] mt-1.5 sm:mt-2 rounded-[18px] text-xs sm:text-sm',
      fontClass: 'font-semibold',
      inactiveBgClass: 'bg-[var(--color-tab-slate1)] text-[var(--color-white)] shadow-xs',
    },
    {
      id: 'Visits',
      label: 'Visits',
      stepClass: 'w-[88px] sm:w-[102px] h-[56px] sm:h-[64px] mt-3 sm:mt-3.5 rounded-[18px] text-xs',
      fontClass: 'font-medium',
      inactiveBgClass: 'bg-[var(--color-tab-slate2)] text-[var(--color-white)] shadow-xs',
    },
    {
      id: 'Medications',
      label: 'Medications',
      stepClass: 'w-[84px] sm:w-[98px] h-[52px] sm:h-[60px] mt-4 sm:mt-4.5 rounded-[16px] text-xs',
      fontClass: 'font-medium',
      inactiveBgClass: 'bg-[var(--color-tab-slate1)] text-[var(--color-white)] shadow-xs',
    },
    {
      id: 'Labs',
      label: 'Labs',
      stepClass: 'w-[80px] sm:w-[94px] h-[48px] sm:h-[56px] mt-5 sm:mt-5.5 rounded-[16px] text-xs',
      fontClass: 'font-medium',
      inactiveBgClass: 'bg-[var(--color-tab-slate2)] text-[var(--color-white)] shadow-xs',
    },
    {
      id: 'Imaging',
      label: 'Imaging',
      stepClass: 'w-[72px] sm:w-[84px] h-[44px] sm:h-[52px] mt-6.5 sm:mt-7 rounded-[16px] font-medium text-[11px] sm:text-xs',
      fontClass: 'font-medium',
      inactiveBgClass: 'bg-[var(--color-tab-slate3)] text-[var(--color-white)] shadow-xs',
    },
    {
      id: 'Allergies',
      label: 'Allergies',
      stepClass: 'w-[64px] sm:w-[74px] h-[40px] sm:h-[46px] mt-7.5 sm:mt-8 rounded-[16px] font-medium text-[11px] sm:text-xs',
      fontClass: 'font-medium',
      inactiveBgClass: 'bg-[var(--color-tab-slate3)] text-[var(--color-white)] shadow-xs',
    },
    {
      id: 'Genetics',
      label: 'Genetics',
      stepClass: 'w-[62px] sm:w-[72px] h-[36px] sm:h-[42px] mt-8.5 sm:mt-9 rounded-[14px] font-medium text-[10px] sm:text-[11px]',
      fontClass: 'font-medium',
      inactiveBgClass: 'bg-[var(--color-tab-slate4)] text-[var(--color-white)] shadow-xs',
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
            <span className="hidden md:inline text-xs font-medium text-[var(--color-ink-muted)] px-2.5 py-1 rounded-full bg-white/50">
              Workspace Mode: Clinical View
            </span>
            <button
              type="button"
              onClick={() => setIsCommunicationOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 rounded-full bg-white hover:bg-stone-50 border border-black/10 text-[var(--color-ink)] text-xs font-semibold transition-all shadow-xs active:scale-95 cursor-pointer"
              data-testid="message-patient-button"
            >
              <MessageSquare className="w-3.5 h-3.5 stroke-[2.2] text-[var(--color-ink)]" />
              <span className="hidden sm:inline">Message Patient</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFHIROpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 rounded-full bg-white hover:bg-stone-50 border border-black/10 text-[var(--color-ink)] text-xs font-semibold transition-all shadow-xs active:scale-95 cursor-pointer"
              data-testid="fhir-interop-btn"
            >
              <FileCode className="w-3.5 h-3.5 stroke-[2.2] text-[var(--color-ink)]" />
              <span className="hidden sm:inline">FHIR R4</span>
            </button>
            <button
              type="button"
              onClick={() => setIsComplianceOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 rounded-full bg-white hover:bg-stone-50 border border-black/10 text-[var(--color-ink)] text-xs font-semibold transition-all shadow-xs active:scale-95 cursor-pointer"
              data-testid="compliance-modal-btn"
            >
              <ShieldCheck className="w-3.5 h-3.5 stroke-[2.2] text-emerald-700" />
              <span className="hidden sm:inline">Compliance</span>
            </button>
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
        {/* INTERACTIVE GUIDE WALKTHROUGH BANNER (For Sample Patient)                 */}
        {/* ========================================================================= */}
        {patient.id === 'p-guide-001' && (
          <div className="w-full bg-[var(--color-surface)] border border-[var(--color-ink-soft)]/40 rounded-[20px] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[var(--color-accent-lemon)] flex items-center justify-center shrink-0 text-[var(--color-ink)] shadow-2xs">
                <Sparkles className="w-5 h-5 text-[var(--color-ink)]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-ink)] text-white text-[10px] font-bold tracking-wider uppercase">
                    Interactive Walkthrough
                  </span>
                  <h3 className="font-bold text-sm sm:text-base text-[var(--color-ink)]">
                    Explore Paper Chart Workspace & Clinical Modules
                  </h3>
                </div>
                <p className="text-xs text-[var(--color-ink-muted)] mt-1 max-w-2xl leading-relaxed">
                  This is a sample wireframe patient folder demonstrating vital trend charts, stepladder clinical tabs, AI clinical synthesis, visits, labs, and DICOM imaging inspection. You can test adding records or remove this sample folder whenever you are ready.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={handleRemoveGuidePatient}
                disabled={isDeletingGuide}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingGuide ? 'Removing...' : 'Remove Sample Folder'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PATIENT SUMMARY & SYSTEM MODULES (TOP SECTION)                            */}
        {/* ========================================================================= */}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">

          {/* Patient Profile Card (Left) — Aligned Height & Same Bottom Line */}
          <div className="lg:col-span-4 xl:col-span-3 bg-[var(--color-surface-subtle)] rounded-[24px] p-3.5 sm:p-4 flex flex-col justify-between h-full shadow-sm border border-white/60 relative overflow-hidden">
            <div className="flex flex-col gap-2.5">
              {/* Top Identity Block */}
              <div className="flex items-start gap-3">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl overflow-hidden shrink-0 bg-stone-200 border-2 border-white shadow-xs flex items-center justify-center select-none">
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
                  ) : patient.id === 'p-tiffany' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/tiffany-woodward-portrait.jpg"
                      alt={patient.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/tiffany-woodward.png';
                      }}
                    />
                  ) : (
                    <span className="text-sm sm:text-base font-bold text-[var(--color-ink)] tracking-wider">
                      {getInitials(patient.name)}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-medium text-[var(--color-ink-muted)] uppercase tracking-wider block">
                    {patient.sex}, {patient.age}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-[var(--color-ink)] leading-snug mt-0.5 truncate" title={patient.name}>
                    <bdi dir="auto" className="block truncate text-start">
                      {patient.name}
                    </bdi>
                  </h2>
                  <span className="text-[10px] text-[var(--color-ink-muted)] font-mono block mt-0.5">
                    {patient.mrn}
                  </span>
                </div>
              </div>

              {/* Critical allergy chip on identity block */}
              {criticalAllergyItem && (
                <button
                  type="button"
                  onClick={() => setActiveTab('Allergies')}
                  className="px-2.5 py-1 bg-[var(--color-status-critical)]/15 text-[var(--color-ink)] rounded-[var(--radius-pill)] border border-[var(--color-status-critical)]/40 text-xs font-semibold flex items-center gap-1.5 w-fit hover:bg-[var(--color-status-critical)]/25 transition-colors cursor-pointer"
                  data-testid="overview-critical-allergy-badge"
                  title="Critical allergy alert — Click to view in Allergies tab"
                >
                  <span className="w-2 h-2 rounded-full bg-[var(--color-status-critical)] animate-pulse" />
                  <span>Critical: {criticalAllergyItem.substance} ({criticalAllergyItem.reaction})</span>
                </button>
              )}

              {/* Social History Card */}
              <div className="p-2 sm:p-2.5 rounded-[12px] bg-[var(--color-surface-muted)] flex items-center justify-between gap-2 border border-white/40">
                <div className="min-w-0">
                  <span className="text-[10px] font-medium text-[var(--color-ink-muted)] block">
                    Social History:
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-ink)] block truncate">
                    {patient.socialHistory || 'Non-smoker, active lifestyle'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSocialHistoryOpen(true)}
                  className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shrink-0 shadow-xs cursor-pointer hover:scale-105 transition-all"
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
                    {patient.carePlan || 'Standard Clinical Protocol'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCarePlanOpen(true)}
                  className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shrink-0 shadow-xs cursor-pointer hover:scale-105 transition-all"
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

            {/* 1. Body System Perspective Stepladder Tabs (scrollable horizontally in mobile layout, single row) */}
            <div className="flex flex-nowrap items-start gap-1.5 sm:gap-2.5 overflow-x-auto max-w-full py-1 pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                    className={`relative flex flex-col justify-between p-3 select-none cursor-pointer shrink-0 transition-all border-0 outline-none ${tab.stepClass} ${
                      isActive
                        ? 'bg-[var(--color-accent-neon)] text-[var(--color-ink)] font-bold scale-[1.03] shadow-md z-10'
                        : `${tab.inactiveBgClass} ${tab.fontClass} hover:opacity-90 opacity-90`
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
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-3.5 items-stretch h-full"
                  >
                    {/* Diagnosis & Clinical Impression Card (7 cols) */}
                    <div className="md:col-span-7 bg-[var(--color-surface-subtle)] rounded-[22px] p-3.5 sm:p-4 border border-white/60 shadow-xs flex flex-col justify-between gap-2 h-full">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider">
                              Clinical Diagnosis
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                patient.status === 'Critical'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : patient.status === 'Follow-up' || patient.status === 'Needs review'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : patient.status === 'Stable'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-sky-100 text-sky-800 border-sky-300'
                              }`}
                            >
                              {patient.status}
                            </span>
                          </div>
                          <h3 className="text-sm sm:text-base font-bold text-[var(--color-ink)] leading-snug mt-0.5">
                            {patient.primaryConcern || 'Clinical Care & Follow-Up Evaluation'}
                          </h3>
                        </div>

                        <span className="px-2 py-0.5 rounded-md bg-[var(--color-white)] text-[9.5px] font-mono font-semibold text-[var(--color-ink-muted)] border border-black/5 shrink-0">
                          {patient.id === 'p-001' ? 'ICD-10: I10 / E11.9' : patient.id === 'p-007' ? 'ICD-10: Z00.00' : 'ICD-10: S06.0X0A'}
                        </span>
                      </div>

                      <p className="text-[11px] text-[var(--color-ink-muted)] line-clamp-2 leading-relaxed">
                        {patient.primaryConcern
                          ? `${patient.name} presenting for ${patient.primaryConcern.toLowerCase()}. Active protocol: ${patient.carePlan || 'Standard care management'}. Longitudinal vitals and clinical trajectory monitored.`
                          : 'Comprehensive clinical evaluation following intake triage. Longitudinal vitals and clinical trajectory monitored.'}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[var(--color-border-grid)] text-[10.5px]">
                        <div className="flex items-center gap-1.5 text-[var(--color-ink)] font-medium">
                          <span className="text-[var(--color-ink-muted)]">Attending:</span>
                          <span>Dr. Tarek • {patient.primaryConcern?.toLowerCase().includes('neuro') ? 'Neurology' : 'Internal Medicine'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[var(--color-ink-muted)] font-mono text-[9.5px]">
                          <span>Pathway:</span>
                          <span className="font-semibold text-[var(--color-ink)] bg-[var(--color-white)] px-1.5 py-0.5 rounded border border-black/5">
                            {patient.carePlan || 'Clinical Protocol'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Live Vital Signs Panel (5 cols) */}
                    <div className="md:col-span-5 bg-[var(--color-surface-subtle)] rounded-[22px] p-3 sm:p-3.5 border border-white/60 shadow-xs flex flex-col justify-between gap-2 h-full">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider">
                          Current Vital Signs
                        </span>
                        <span className={clsx(
                          'flex items-center gap-1 text-[9.5px] font-semibold',
                          hasTelemetry ? 'text-[var(--color-status-success)]' : 'text-[var(--color-ink-muted)]'
                        )}>
                          <span className={clsx(
                            'w-1.5 h-1.5 rounded-full',
                            hasTelemetry ? 'bg-[var(--color-status-success)] animate-pulse' : 'bg-black/20'
                          )} />
                          {hasTelemetry ? 'Telemetry Active' : 'No Vitals Logged'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                        <div className="p-2 rounded-[12px] bg-[var(--color-surface-muted)] border border-white/40 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[9.5px] text-[var(--color-ink-muted)]">
                            <span className="font-medium">Heart Rate</span>
                            <Activity className="w-2.5 h-2.5 text-[var(--color-status-success)]" />
                          </div>
                          <div className="mt-0.5 flex items-baseline gap-1">
                            <span className="text-sm sm:text-base font-bold text-[var(--color-ink)] leading-none">{latestPulse}</span>
                            <span className="text-[9px] font-medium text-[var(--color-ink-muted)]">bpm</span>
                          </div>
                          <span className="text-[8px] text-[var(--color-ink-muted)] mt-0.5 truncate">{pulseObs ? "Normal sinus" : (isDemo ? "Normal sinus" : "Not recorded")}</span>
                        </div>

                        <div className="p-2 rounded-[12px] bg-[var(--color-surface-muted)] border border-white/40 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[9.5px] text-[var(--color-ink-muted)]">
                            <span className="font-medium">Blood Pressure</span>
                            <Heart className="w-2.5 h-2.5 text-[var(--color-status-success)]" />
                          </div>
                          <div className="mt-0.5 flex items-baseline gap-1">
                            <span className="text-sm sm:text-base font-bold text-[var(--color-ink)] leading-none">{latestPressure}</span>
                            <span className="text-[9px] font-medium text-[var(--color-ink-muted)]">mmHg</span>
                          </div>
                          <span className="text-[8px] text-[var(--color-ink-muted)] mt-0.5 truncate">{pressureObs ? "Normotensive" : (isDemo ? "Normotensive" : "Not recorded")}</span>
                        </div>

                        <div className="p-2 rounded-[12px] bg-[var(--color-surface-muted)] border border-white/40 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[9.5px] text-[var(--color-ink-muted)]">
                            <span className="font-medium">SpO2 Oxygen</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-status-success)]" />
                          </div>
                          <div className="mt-0.5 flex items-baseline gap-1">
                            <span className="text-sm sm:text-base font-bold text-[var(--color-ink)] leading-none">{latestOxygen}</span>
                            <span className="text-[9px] font-medium text-[var(--color-ink-muted)]">%</span>
                          </div>
                          <span className="text-[8px] text-[var(--color-ink-muted)] mt-0.5 truncate">{oxygenObs ? "Room air" : (isDemo ? "Room air" : "Not recorded")}</span>
                        </div>

                        <div className="p-2 rounded-[12px] bg-[var(--color-surface-muted)] border border-white/40 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[9.5px] text-[var(--color-ink-muted)]">
                            <span className="font-medium">Glucose</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-status-success)]" />
                          </div>
                          <div className="mt-0.5 flex items-baseline gap-1">
                            <span className="text-sm sm:text-base font-bold text-[var(--color-ink)] leading-none">{latestGlucose}</span>
                            <span className="text-[9px] font-medium text-[var(--color-ink-muted)]">mg/dL</span>
                          </div>
                          <span className="text-[8px] text-[var(--color-ink-muted)] mt-0.5 truncate">{glucoseObs ? "Fasting glycemia" : (isDemo ? "Fasting glycemia" : "Not recorded")}</span>
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
                    className="bg-[var(--color-surface-subtle)] rounded-[22px] p-3.5 sm:p-4 border border-white/60 shadow-xs flex flex-col justify-between gap-2.5 h-full min-h-[140px]"
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
                          {activeTab === 'AI Analysis' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              Executive AI Case Summary
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-[var(--color-ink)] leading-snug mt-0.5">
                          {activeTab === 'AI Analysis' && `AI Clinical Case Summary · ${patient.name}`}
                          {activeTab === 'Visits' && 'Clinical Encounters & Specialty Consultations'}
                          {activeTab === 'Labs' && 'Biochemical Markers & Longitudinal Lab Trends'}
                          {activeTab === 'Imaging' && 'Diagnostic Scans, PACS & Modality Records'}
                          {activeTab === 'Genetics' && 'Genomic Panels & Pharmacogenetic Markers'}
                          {activeTab === 'Allergies' && 'Substance Sensitivities & Adverse Reactions'}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-[var(--color-white)] text-[9.5px] font-mono font-semibold text-[var(--color-ink-muted)] border border-black/5 shrink-0">
                        {activeTab === 'AI Analysis' ? 'Rule 12 Grounded' : 'Perspective Filtered'}
                      </span>
                    </div>

                    {activeTab === 'AI Analysis' ? (
                      <div className="flex flex-col gap-2.5">
                        {/* Executive AI Clinical Narrative Summary */}
                        <div className="p-3.5 rounded-xl bg-white/80 border border-black/5 shadow-2xs flex flex-col gap-2">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[var(--color-ink)]" />
                            <span className="text-[10px] font-bold text-[var(--color-ink)] uppercase tracking-wider">
                              AI Executive Case Synthesis · Full Patient History & Dashboard Integration
                            </span>
                          </div>
                          <p className="text-xs sm:text-[12px] text-[var(--color-ink)] leading-relaxed font-normal">
                            {aiSummaryText}
                          </p>

                          {/* Distinct Active Pharmacotherapy Regimen Pills */}
                          {aiRegimenPills && aiRegimenPills.length > 0 && (
                            <div className="pt-2 border-t border-black/5 flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider flex items-center gap-1 mr-1">
                                <Pill className="w-3 h-3 text-[var(--color-ink)]" />
                                Active Regimen:
                              </span>
                              {aiRegimenPills.map((med) => (
                                <span
                                  key={med.id || med.name}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-black/10 shadow-2xs text-[10.5px] font-medium text-[var(--color-ink)]"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span className="font-semibold">{med.name}</span>
                                  {med.strength && (
                                    <span className="text-[9.5px] text-[var(--color-ink-muted)] font-mono">
                                      {med.strength}
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Key Clinical Metric Badges (Patient Personalized) */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {patient.id === 'p-008' ? (
                            <>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Metabolic: HbA1c 6.4% · Amaryl Deprescribed</span>
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Hemodynamics: 122/80 mmHg · 98% Telemetry Adherence</span>
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-[10px] font-semibold text-rose-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                <span>Safety Alert: Sulfonamides & NSAIDs Contraindicated</span>
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-900">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>Bone Density: Osteopenia T-score -1.8 · Vit D 34 ng/mL</span>
                              </span>
                            </>
                          ) : patient.id === 'p-001' ? (
                            <>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Hemodynamics: 125/83 mmHg · Controlled on Dual Therapy</span>
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Glycemic Control: Fasting 111 mg/dL · T2D Monitored</span>
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-[10px] font-semibold text-rose-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                <span>Critical Allergy Alert: Codeine (Bronchospasm Risk)</span>
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Adherence: 100% Prescription Telemetry Adherence</span>
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Trajectory: Controlled on Guideline Care</span>
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Vitals: Normative Baseline</span>
                              </span>
                              {criticalAllergyItem && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-[10px] font-semibold text-rose-800">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  <span>Allergy Alert: {criticalAllergyItem.substance} ({criticalAllergyItem.reaction})</span>
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed">
                        {activeTab === 'Visits' && `Chronological visit records on file for ${patient.name}. ${careEvents.filter(e => e.kind === 'visit').length || 4} clinical encounters logged with attending physician.`}
                        {activeTab === 'Labs' && `Longitudinal panels reflect normative fasting glycemia (${latestGlucose} mg/dL) and consistent electrolyte balance across all clinic milestone tests.`}
                        {activeTab === 'Imaging' && 'Diagnostic scan modality records archived. Thoracic cross sections and neuroimaging reviewed without acute compromise.'}
                        {activeTab === 'Genetics' && 'Targeted pharmacogenomic profile shows standard CYP2C19 and CYP2D6 metabolizer status. No contraindications flagged.'}
                        {activeTab === 'Allergies' && (
                          allergies.length > 0 ? (
                            <div className="flex flex-col gap-1.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {allergies.map((alg) => (
                                  <span
                                    key={alg.id}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-[10.5px] font-semibold text-rose-800"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    <span>{alg.substance}:</span>
                                    <span className="font-normal">{alg.reaction} ({alg.severity})</span>
                                  </span>
                                ))}
                              </div>
                              <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed mt-0.5">
                                Active allergy reconciliation confirmed by attending clinician. Cross-reactivity alerts enabled across clinical order entry.
                              </p>
                            </div>
                          ) : (
                            <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed">
                              No Known Drug Allergies (NKDA) or severe environmental adverse reactions documented. Annual allergy reconciliation completed by clinical intake team.
                            </p>
                          )
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[var(--color-border-grid)] text-[10.5px]">
                      <div className="flex items-center gap-1.5 text-[var(--color-ink)] font-medium">
                        <span className="text-[var(--color-ink-muted)]">Active Scope:</span>
                        <span>{activeTab === 'AI Analysis' ? 'Comprehensive AI Patient Dossier Synthesis' : `${activeTab} Domain Telemetry`}</span>
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
        {/* PATIENT CONTEXT BAR (NON-OVERVIEW TABS)                                    */}
        {/* ========================================================================= */}
        {activeTab !== 'Overview' && (
          <PatientContextBar
            patient={patient}
            criticalAllergy={criticalAllergyItem}
            onAllergyClick={() => setActiveTab('Allergies')}
          />
        )}

        {/* ========================================================================= */}
        {/* PERSPECTIVE / MAIN BODY: MEDICATIONS, VISITS, LABS, IMAGING, ALLERGIES, GENETICS, OR OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'Medications' ? (
          <div className="pt-2">
            <MedicationsTabView
              patientId={patient.id}
              medications={medications}
              allergies={allergies}
              onShowOnTimeline={() => {
                setActiveTab('Overview');
              }}
              onStartMedication={onStartMedication}
              onChangeDose={onChangeMedicationDose}
              onUpdateStatus={onUpdateMedicationStatus}
            />
          </div>
        ) : activeTab === 'Visits' ? (
          <div className="pt-2">
            <VisitsTabView
              patientId={patient.id}
              patientName={patient.name}
              patient={patient}
              visits={visits}
              vitals={vitals}
              onShowOnTimeline={() => {
                setActiveTab('Overview');
              }}
              onRecordVisit={onRecordVisit}
              onUpdateVisitStage={onUpdateVisitStage}
              onUpdateVisitNotes={onUpdateVisitNotes}
            />
          </div>
        ) : activeTab === 'Labs' ? (
          <div className="pt-2">
            <LabsTabView
              patientId={patient.id}
              patientName={patient.name}
              labs={labs}
              onRecordLab={onRecordLab}
              onMarkReviewed={onMarkLabReviewed}
              onShowOnTimeline={() => {
                setActiveTab('Overview');
              }}
            />
          </div>
        ) : activeTab === 'Imaging' ? (
          <div className="pt-2">
            <ImagingTabView
              patientId={patient.id}
              patientName={patient.name}
              imaging={imaging}
              onUploadStudy={onUploadStudy}
              onShowOnTimeline={() => {
                setActiveTab('Overview');
              }}
            />
          </div>
        ) : activeTab === 'Allergies' ? (
          <div className="pt-2">
            <AllergiesTabView
              patientId={patient.id}
              patientName={patient.name}
              allergies={allergies}
              onAddAllergy={onAddAllergy}
              onUpdateAllergy={onUpdateAllergy}
              onShowOnTimeline={() => {
                setActiveTab('Overview');
              }}
            />
          </div>
        ) : activeTab === 'Genetics' ? (
          <div className="pt-2">
            <GeneticsTabView
              patientId={patient.id}
              patientName={patient.name}
              genetics={genetics}
              onAddFinding={onAddGeneticFinding}
              onShowOnTimeline={() => {
                setActiveTab('Overview');
              }}
            />
          </div>
        ) : activeTab === 'AI Analysis' ? (
          <div className="pt-2">
            <AIAnalyticsTabView
              patient={patient}
              medications={medications}
              labs={labs}
              visits={visits}
              careEvents={careEvents}
              allergies={allergies}
              vitals={vitals}
              imaging={imaging}
              genetics={genetics}
              onShowOnTimeline={() => {
                setActiveTab('Overview');
              }}
              onSaveToNote={onSaveAIToNote}
            />
          </div>
        ) : (
          <>
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

        <InteractiveTimeline careEvents={careEvents} onAddEntry={onAddEntry} activeFilters={activeFilters} onNavigateToTab={(tab) => setActiveTab(tab as any)} />

        {/* ========================================================================= */}
        {/* HEALTH RECORDS CARDS (BOTTOM SECTION - 3 SIGNATURE NOTCHED CARDS)         */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
          
          {/* 1. Vital Signs History Card (~50% width) */}
          <div className="lg:col-span-6 bg-[var(--color-surface-subtle)] rounded-[24px] p-4 sm:p-5 flex flex-col justify-between shadow-sm border border-white/60 relative min-h-[170px] overflow-hidden">
            
            {/* Top Scoop Notch Header */}
            <div className="flex items-center justify-between relative z-10">
              <h3 className="text-sm sm:text-base font-bold text-[var(--color-ink)]">
                Vital Signs History
              </h3>

              {/* White center notch handle bar */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-14 h-1.5 bg-white rounded-full shadow-2xs" />

              <button
                type="button"
                onClick={() => setIsVitalsOpen(true)}
                className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shadow-xs cursor-pointer hover:scale-105 transition-all"
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
                  {latestPulse !== '—' ? `${latestPulse} bpm` : 'Not recorded'}
                </span>
              </div>

              {/* Peak Reading Callout */}
              {latestPulse !== '—' && !isNaN(parseInt(latestPulse, 10)) ? (
                <div className="px-3 py-1 rounded-full bg-white text-[var(--color-ink)] text-xs font-bold shadow-lift flex items-center gap-1.5 border border-black/5 animate-pulse">
                  <span className="text-sm font-extrabold">{Math.max(120, parseInt(latestPulse, 10) + 12)}</span>
                  <span className="text-[10px] text-[var(--color-ink-muted)]">bpm peak</span>
                </div>
              ) : (
                <div className="px-2.5 py-1 rounded-full bg-white text-[var(--color-ink-muted)] text-[11px] font-medium border border-black/5 flex items-center gap-1">
                  <span>No telemetry</span>
                </div>
              )}
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
          <div className="lg:col-span-3 bg-[var(--color-surface-subtle)] rounded-[24px] p-4 sm:p-5 flex flex-col justify-between shadow-sm border border-white/60 relative min-h-[170px] overflow-hidden">
            
            {/* Top Scoop Notch Header */}
            <div className="flex items-center justify-between relative z-10">
              <h3 className="text-sm sm:text-base font-bold text-[var(--color-ink)]">
                Records
              </h3>

              {/* White center notch handle bar */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-14 h-1.5 bg-white rounded-full shadow-2xs" />

              <button
                type="button"
                onClick={() => setIsRecordsOpen(true)}
                className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shadow-xs cursor-pointer hover:scale-105 transition-all"
                title="Expand Records"
              >
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>

            {/* Date + Soft Coral Record Capsule */}
            <div className="flex items-center gap-2.5 sm:gap-3 mt-4 w-full min-w-0">
              <div className="text-center shrink-0 pr-0.5">
                <span className="text-2xl sm:text-3xl font-bold text-[var(--color-ink)] leading-none block">
                  {recordDay}
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-[var(--color-ink-muted)] uppercase block mt-0.5">
                  {recordMonth}
                </span>
              </div>

              {/* Coral Capsule Card */}
              <div
                onClick={() => setIsRecordsOpen(true)}
                title={careEvents[0]?.label || 'Office visit'}
                className="flex-1 min-w-0 px-2.5 py-2 sm:py-2.5 rounded-[18px] bg-[var(--color-status-critical)] flex items-center gap-2 sm:gap-2.5 shadow-xs border border-white/40 cursor-pointer hover:opacity-95 transition-all overflow-hidden"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white flex items-center justify-center shrink-0 shadow-2xs">
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-[var(--color-ink)]" fill="none" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M6 2h4a1 1 0 011 1v1H5V3a1 1 0 011-1z" />
                    <rect x="3" y="4" width="10" height="10" rx="1.5" />
                    <line x1="6" y1="7.5" x2="10" y2="7.5" />
                  </svg>
                </div>
                <span className="text-xs sm:text-[13px] font-semibold text-[var(--color-ink)] truncate min-w-0 block">
                  {careEvents[0]?.label || 'Office visit'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Labs Card (~25% width) */}
          <div className="lg:col-span-3 bg-[var(--color-surface-subtle)] rounded-[24px] p-4 sm:p-5 flex flex-col justify-between shadow-sm border border-white/60 relative min-h-[170px] overflow-hidden">
            
            {/* Top Scoop Notch Header */}
            <div className="flex items-center justify-between relative z-10">
              <h3 className="text-sm sm:text-base font-bold text-[var(--color-ink)]">
                Labs
              </h3>

              {/* White center notch handle bar */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-14 h-1.5 bg-white rounded-full shadow-2xs" />

              <button
                type="button"
                onClick={() => setActiveTab('Labs')}
                className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shadow-xs cursor-pointer hover:scale-105 transition-all"
                title="Open Labs Tab"
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
                  {latestGlucose} mg/dL
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

              {/* Indicator Needle */}
              <div className="absolute bottom-2 left-[44%] -translate-x-1/2 flex flex-col items-center z-10">
                <div className="w-2 h-2 rounded-full bg-[var(--color-ink)] border border-white shadow-2xs" />
                <div className="w-[1.5px] h-3.5 bg-[var(--color-ink)]" />
              </div>

              {/* 5 Colored Range Bands */}
              <div className="w-full h-1.5 flex items-center rounded-full overflow-hidden shadow-2xs">
                {/* Low */}
                <div className="w-[15%] h-full bg-[var(--color-status-warning)]" title="Low (< 70)" />
                {/* Borderline low */}
                <div className="w-[15%] h-full bg-[var(--color-status-warning)]" title="Borderline (70 - 79)" />
                {/* Target Normal */}
                <div className="w-[40%] h-full bg-[var(--color-status-success)]" title="Normal (80 - 100)" />
                {/* Borderline high */}
                <div className="w-[15%] h-full bg-[var(--color-status-warning)]" title="Borderline (100 - 125)" />
                {/* High */}
                <div className="w-[15%] h-full bg-[var(--color-status-warning)]" title="High (> 125)" />
              </div>
            </div>
          </div>
        </section>
        </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5 INTERACTIVE EXPANSION DETAIL OVERLAYS                                     */}
      {/* ========================================================================= */}

      {/* 1. Social History & Lifestyle Overlay */}
      <OverlaySheet
        isOpen={isSocialHistoryOpen}
        onClose={() => setIsSocialHistoryOpen(false)}
        title="Social History & Lifestyle Profile"
        className="max-w-xl"
      >
        <div className="space-y-4 text-xs font-['Inter',sans-serif]">
          {/* Identity snippet */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
            <div>
              <span className="text-[10px] text-[var(--color-ink-muted)] block">Patient</span>
              <span className="font-bold text-sm text-[var(--color-ink)]">{patient.name}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[var(--color-ink-muted)] block">MRN</span>
              <span className="font-mono text-xs font-semibold text-[var(--color-ink)]">{patient.mrn}</span>
            </div>
          </div>

          {/* Structured Lifestyle Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider block mb-1">
                Tobacco & Smoking
              </span>
              <span className="font-semibold text-xs text-[var(--color-ink)]">
                {patient.socialHistory?.toLowerCase().includes('smoker') && !patient.socialHistory?.toLowerCase().includes('non-smoker')
                  ? 'Active Smoker'
                  : 'Non-Smoker (Lifelong)'}
              </span>
              <span className="text-[10px] text-[var(--color-ink-muted)] block mt-0.5">Zero pack-years documented</span>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider block mb-1">
                Alcohol Consumption
              </span>
              <span className="font-semibold text-xs text-[var(--color-ink)]">
                {patient.socialHistory?.toLowerCase().includes('alcohol') ? 'Occasional / Social' : 'None Reported'}
              </span>
              <span className="text-[10px] text-[var(--color-ink-muted)] block mt-0.5">No risk criteria flagged</span>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider block mb-1">
                Physical Activity
              </span>
              <span className="font-semibold text-xs text-[var(--color-ink)]">
                {patient.socialHistory?.toLowerCase().includes('active') ? 'Active (Regular exercise)' : 'Moderate Ambulatory'}
              </span>
              <span className="text-[10px] text-[var(--color-ink-muted)] block mt-0.5">Cardiovascular baseline stable</span>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider block mb-1">
                Living & Environment
              </span>
              <span className="font-semibold text-xs text-[var(--color-ink)]">Independent Urban</span>
              <span className="text-[10px] text-[var(--color-ink-muted)] block mt-0.5">Stable social support network</span>
            </div>
          </div>

          {/* Clinical Narrative */}
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
            <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider block mb-1.5">
              Documented Clinical Summary
            </span>
            <p className="text-xs text-[var(--color-ink)] leading-relaxed">
              {patient.socialHistory || 'Non-smoker, active lifestyle, balanced dietary regimen with adequate hydration and sleep hygiene.'}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-200 text-[11px] text-[var(--color-ink-muted)]">
            <span>Reconciled by: Dr. Tarek (Attending)</span>
            <span>Last verified: {patient.lastVisitDate || '14 Oct 2026'}</span>
          </div>
        </div>
      </OverlaySheet>

      {/* 2. Clinical Care Plan Overlay */}
      <OverlaySheet
        isOpen={isCarePlanOpen}
        onClose={() => setIsCarePlanOpen(false)}
        title="Active Clinical Care Plan & Protocols"
        className="max-w-xl"
      >
        <div className="space-y-4 text-xs font-['Inter',sans-serif]">
          {/* Plan title card */}
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider">
                Primary Protocol
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Active Protocol
              </span>
            </div>
            <h4 className="text-sm font-bold text-[var(--color-ink)]">
              {patient.carePlan || 'Standard Clinical Management Protocol'}
            </h4>
            <p className="text-[11px] text-[var(--color-ink-muted)] mt-1">
              Targeting clinical stabilization, symptom mitigation, and longitudinal milestone tracking.
            </p>
          </div>

          {/* Clinical Objectives & Milestones */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider block">
              Key Action Items & Objectives
            </span>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                1
              </div>
              <div className="flex-1">
                <span className="font-semibold text-xs text-[var(--color-ink)] block">
                  Longitudinal Telemetry & Vitals Tracking
                </span>
                <span className="text-[11px] text-[var(--color-ink-muted)] block mt-0.5">
                  Maintain blood pressure target below 130/80 mmHg and monitor resting pulse stability.
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                2
              </div>
              <div className="flex-1">
                <span className="font-semibold text-xs text-[var(--color-ink)] block">
                  Pharmacotherapy & Adherence Review
                </span>
                <span className="text-[11px] text-[var(--color-ink-muted)] block mt-0.5">
                  Adhere strictly to prescribed oral regimens and verify tolerance during follow-up encounters.
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                3
              </div>
              <div className="flex-1">
                <span className="font-semibold text-xs text-[var(--color-ink)] block">
                  Diagnostic Panel Scheduling
                </span>
                <span className="text-[11px] text-[var(--color-ink-muted)] block mt-0.5">
                  Repeat periodic metabolic markers and renal parameters as outlined in clinical pathway.
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-200 text-[11px] text-[var(--color-ink-muted)]">
            <span>Care Coordinator: Dr. Tarek</span>
            <span>Next Review: Scheduled 30-day interval</span>
          </div>
        </div>
      </OverlaySheet>

      {/* 3. Longitudinal Vital Signs Telemetry Overlay */}
      <OverlaySheet
        isOpen={isVitalsOpen}
        onClose={() => setIsVitalsOpen(false)}
        title="Longitudinal Vital Signs Telemetry"
        className="max-w-2xl"
      >
        <div className="space-y-4 text-xs font-['Inter',sans-serif]">
          {/* Vitals Summary Strip */}
          <div className="grid grid-cols-4 gap-2">
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center">
              <span className="text-[10px] text-[var(--color-ink-muted)] uppercase font-semibold block">Pulse</span>
              <span className="text-base font-bold text-[var(--color-ink)] mt-0.5 block">{latestPulse}</span>
              <span className="text-[9px] text-[var(--color-ink-muted)]">bpm</span>
            </div>
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center">
              <span className="text-[10px] text-[var(--color-ink-muted)] uppercase font-semibold block">Blood Pressure</span>
              <span className="text-base font-bold text-[var(--color-ink)] mt-0.5 block">{latestPressure}</span>
              <span className="text-[9px] text-[var(--color-ink-muted)]">mmHg</span>
            </div>
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center">
              <span className="text-[10px] text-[var(--color-ink-muted)] uppercase font-semibold block">SpO2</span>
              <span className="text-base font-bold text-[var(--color-ink)] mt-0.5 block">{latestOxygen}</span>
              <span className="text-[9px] text-[var(--color-ink-muted)]">%</span>
            </div>
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center">
              <span className="text-[10px] text-[var(--color-ink-muted)] uppercase font-semibold block">Glucose</span>
              <span className="text-base font-bold text-[var(--color-ink)] mt-0.5 block">{latestGlucose}</span>
              <span className="text-[9px] text-[var(--color-ink-muted)]">mg/dL</span>
            </div>
          </div>

          {/* Longitudinal Log Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider">
                Recorded Observations ({sortedVitals.length} total)
              </span>
              <span className="text-[10px] text-[var(--color-ink-muted)]">Showing latest entries</span>
            </div>

            <div className="max-h-[340px] overflow-y-auto border border-stone-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100 text-[10px] font-bold uppercase text-[var(--color-ink-muted)] border-b border-stone-200 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Metric</th>
                    <th className="py-2 px-3">Reading</th>
                    <th className="py-2 px-3">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {sortedVitals.slice(0, 15).map((v) => (
                    <tr key={v.id} className="hover:bg-stone-50 transition-colors">
                      <td className="py-2 px-3 text-[11px] font-mono text-[var(--color-ink-muted)]">
                        {v.measuredAt ? v.measuredAt.slice(0, 10) : '14 Oct 2026'}
                      </td>
                      <td className="py-2 px-3 capitalize font-semibold text-[var(--color-ink)]">
                        {v.metric}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-[var(--color-ink)]">
                        {v.value} {v.unit}
                      </td>
                      <td className="py-2 px-3 text-[11px] text-[var(--color-ink-muted)]">
                        {v.createdBy || v.source}
                      </td>
                    </tr>
                  ))}
                  {sortedVitals.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-[var(--color-ink-muted)]">
                        Initial intake telemetry recorded. Awaiting longitudinal connected device readings.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </OverlaySheet>

      {/* 4. Complete Patient Health Records Overlay */}
      <OverlaySheet
        isOpen={isRecordsOpen}
        onClose={() => setIsRecordsOpen(false)}
        title="Complete Patient Health Records"
        className="max-w-2xl"
      >
        <div className="space-y-4 text-xs font-['Inter',sans-serif]">
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
            <div>
              <span className="text-[10px] text-[var(--color-ink-muted)] uppercase font-semibold block">Total Events</span>
              <span className="text-sm font-bold text-[var(--color-ink)]">{careEvents.length || 8} entries logged</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[var(--color-ink-muted)] uppercase font-semibold block">Latest Encounter</span>
              <span className="font-semibold text-xs text-[var(--color-ink)]">{patient.lastVisitDate || '14 Oct 2026'}</span>
            </div>
          </div>

          {/* Event List */}
          <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
            {(careEvents.length > 0 ? careEvents : Object.values(timelineEventsMap)).map((event, idx) => {
              const title = 'label' in event ? event.label : event.title;
              const summary = 'summary' in event ? event.summary : event.details;
              const date = 'occurredAt' in event ? event.occurredAt : event.date;
              const kind = 'kind' in event ? event.kind : event.category;

              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-stone-50 border border-stone-200 hover:border-stone-300 transition-colors flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white text-[var(--color-ink)] border border-stone-200 uppercase">
                        {kind}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">
                        {typeof date === 'string' ? date.slice(0, 10) : '2026'}
                      </span>
                    </div>
                    <h5 className="font-bold text-xs text-[var(--color-ink)] truncate">{title}</h5>
                    <p className="text-[11px] text-[var(--color-ink-muted)] line-clamp-2 mt-0.5">
                      {summary}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </OverlaySheet>

      {/* 5. Diagnostic Laboratory Investigations Overlay */}
      <OverlaySheet
        isOpen={isLabsOpen}
        onClose={() => setIsLabsOpen(false)}
        title="Diagnostic Laboratory Investigations"
        className="max-w-2xl"
      >
        <div className="space-y-4 text-xs font-['Inter',sans-serif]">
          {/* Highlight zone card */}
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider">
                Glycemic & Metabolic Marker Status
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Normal Range
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-[var(--color-ink)]">{latestGlucose} mg/dL</span>
              <span className="text-[11px] text-[var(--color-ink-muted)]">Fasting Glucose • Target: 70 - 99 mg/dL</span>
            </div>
          </div>

          {/* Labs Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider">
                Diagnostic Analytes ({labs.length || 4} tests)
              </span>
              <span className="text-[10px] text-[var(--color-ink-muted)]">Verified Clinical Results</span>
            </div>

            <div className="max-h-[340px] overflow-y-auto border border-stone-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100 text-[10px] font-bold uppercase text-[var(--color-ink-muted)] border-b border-stone-200 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Test</th>
                    <th className="py-2 px-3">Result</th>
                    <th className="py-2 px-3">Reference Range</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {(labs.length > 0 ? labs : [
                    { id: 'l1', testName: 'Fasting Blood Glucose', value: latestGlucose, unit: 'mg/dL', referenceLow: 70, referenceHigh: 99, status: 'normal' },
                    { id: 'l2', testName: 'Hemoglobin A1c', value: '5.4', unit: '%', referenceLow: 4.0, referenceHigh: 5.6, status: 'normal' },
                    { id: 'l3', testName: 'Serum Creatinine', value: '0.88', unit: 'mg/dL', referenceLow: 0.6, referenceHigh: 1.2, status: 'normal' },
                    { id: 'l4', testName: 'Total Cholesterol', value: '168', unit: 'mg/dL', referenceLow: 125, referenceHigh: 200, status: 'normal' },
                  ]).map((test) => (
                    <tr key={test.id} className="hover:bg-stone-50 transition-colors">
                      <td className="py-2 px-3 font-semibold text-[var(--color-ink)]">
                        {test.testName}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-[var(--color-ink)]">
                        {test.value} {test.unit}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-[var(--color-ink-muted)]">
                        {test.referenceLow !== undefined && test.referenceHigh !== undefined
                          ? `${test.referenceLow} - ${test.referenceHigh} ${test.unit}`
                          : 'Normative interval'}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            test.status === 'normal'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : test.status === 'borderline'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}
                        >
                          {test.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </OverlaySheet>

      {/* Phase L3: In-App & External Communication Drawer */}
      <CommunicationModal
        isOpen={isCommunicationOpen}
        onClose={() => setIsCommunicationOpen(false)}
        patient={patient}
      />

      {/* Phase L7: HL7 FHIR R4 Interoperability Modal */}
      <FHIRInteroperabilityModal
        isOpen={isFHIROpen}
        onClose={() => setIsFHIROpen(false)}
        patient={patient}
      />

      {/* Phase L8: Security, Egypt PDPL Law 151/2020 Compliance Center Modal */}
      <ComplianceCenterModal
        isOpen={isComplianceOpen}
        onClose={() => setIsComplianceOpen(false)}
        patient={patient}
      />
    </div>
  );
}
