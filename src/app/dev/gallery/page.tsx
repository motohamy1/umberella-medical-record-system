'use client';

/**
 * Dev Gallery — Visual demonstration of all 17 shared components (§4.5).
 * Renders every component in normal, loading, empty, and interactive states.
 * Toggleable between English (LTR) and Arabic (RTL).
 */

import React, { useState } from 'react';
import { AppFrame } from '@/components/primitives/AppFrame';
import { NotchHeader } from '@/components/primitives/NotchHeader';
import { CircleButton } from '@/components/primitives/CircleButton';
import { PillTabs } from '@/components/primitives/PillTabs';
import { FilterRow } from '@/components/primitives/FilterRow';
import { ModuleCard } from '@/components/cards/ModuleCard';
import { IdentityCard } from '@/components/cards/IdentityCard';
import { MetricsStrip } from '@/components/cards/MetricsStrip';
import { RecordRow } from '@/components/cards/RecordRow';
import { RangeBar } from '@/components/cards/RangeBar';
import { MedicationChip } from '@/components/cards/MedicationChip';
import { ImagingThumbCard } from '@/components/cards/ImagingThumbCard';
import { MetricCard } from '@/components/cards/MetricCard';
import { TimelineNode } from '@/components/timeline/TimelineNode';
import { Scrubber } from '@/components/timeline/Scrubber';
import { OverlaySheet } from '@/components/overlays/OverlaySheet';
import { LoadingSkeleton } from '@/components/state/LoadingSkeleton';
import { EmptyState } from '@/components/state/EmptyState';
import { ErrorState } from '@/components/state/ErrorState';
import { PermissionDeniedState } from '@/components/state/PermissionDeniedState';
import { getDictionary, type Locale } from '@/i18n';
import {
  Activity,
  Calendar,
  Heart,
  Pill,
  Search,
  SlidersHorizontal,
  Plus,
  Minus,
  X,
  ArrowUpRight,
  ChevronDown,
} from 'lucide-react';

export default function DevGalleryPage() {
  const [locale, setLocale] = useState<Locale>('en');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['medications', 'labs']);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const dict = getDictionary(locale);

  const toggleFilter = (id: string) => {
    setSelectedFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const tabs = [
    { id: 'overview', label: dict.screens.overview, icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'ai-analytics', label: dict.screens.aiAnalytics },
    { id: 'visits', label: dict.screens.visits, icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'medications', label: dict.screens.medications, icon: <Pill className="w-3.5 h-3.5" /> },
    { id: 'labs', label: dict.screens.labs },
    { id: 'imaging', label: dict.screens.imaging },
    { id: 'allergies', label: dict.screens.allergies },
    { id: 'genetics', label: dict.screens.genetics },
  ];

  const filterItems = [
    { id: 'office-visits', label: dict.filters.officeVisits },
    { id: 'medications', label: dict.filters.medications },
    { id: 'labs', label: dict.filters.labs },
    { id: 'procedures', label: dict.filters.procedures },
    { id: 'hospitalizations', label: dict.filters.hospitalizations },
    { id: 'imaging', label: dict.filters.imaging },
  ];

  const mockMetrics = [
    { id: 'dx', label: dict.metrics.diagnosis, value: 'Hypertension', isDiagnosis: true },
    { id: 'pulse', label: dict.metrics.pulse, value: 78, unit: 'bpm' },
    { id: 'bp', label: dict.metrics.pressure, value: '128/82', unit: 'mmHg' },
    { id: 'o2', label: dict.metrics.oxygen, value: 98, unit: '%' },
    { id: 'temp', label: dict.metrics.temp, value: 36.7, unit: '°C' },
    { id: 'glucose', label: dict.metrics.glucose, value: 112, unit: 'mg/dL' },
  ];

  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <AppFrame margin>
        <NotchHeader
          title="Component Gallery (§4.5)"
          controls={
            <div className="flex items-center gap-2">
              <PillTabs
                tabs={tabs}
                activeTab={activeTab}
                onChange={setActiveTab}
              />
              <button
                type="button"
                onClick={() => setLocale((l) => (l === 'en' ? 'ar' : 'en'))}
                className="px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-surface)] text-[var(--color-ink)] text-xs font-bold hover:bg-[var(--color-white)] transition-all shrink-0"
              >
                {locale === 'en' ? 'العربية (RTL)' : 'English (LTR)'}
              </button>
            </div>
          }
        />

        <main className="flex-1 p-4 sm:p-6 space-y-8 overflow-y-auto max-h-[calc(100vh-100px)]">
          {/* Section 1: Primitives */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
              1. Primitives: CircleButtons, PillTabs, FilterRow
            </h2>

            <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)]/60 flex flex-wrap items-center gap-4">
              <CircleButton size="sm" icon={<Search className="w-3.5 h-3.5" />} label="Search" />
              <CircleButton size="md" icon={<SlidersHorizontal className="w-4 h-4" />} label="Filter" />
              <CircleButton size="md" icon={<ArrowUpRight className="w-4 h-4" />} label="Expand" />
              <CircleButton size="md" icon={<Plus className="w-4 h-4" />} label="Add" />
              <CircleButton size="md" icon={<Minus className="w-4 h-4" />} label="Minus" />
              <CircleButton size="md" icon={<X className="w-4 h-4" />} label="Close" />
              <CircleButton size="lg" icon={<ChevronDown className="w-5 h-5" />} label="Chevron" />
              <button
                type="button"
                onClick={() => setIsOverlayOpen(true)}
                className="px-4 py-2 rounded-[var(--radius-pill)] bg-[var(--color-accent)] text-[var(--color-ink)] text-xs font-bold shadow-xs hover:shadow-sm"
              >
                Open Overlay Sheet Demo
              </button>
            </div>

            <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)]/60">
              <span className="text-xs text-[var(--color-ink-muted)] block mb-2 font-medium">FilterRow (Multi-select)</span>
              <FilterRow
                items={filterItems}
                selected={selectedFilters}
                onToggle={toggleFilter}
                onReset={() => setSelectedFilters([])}
              />
            </div>
          </section>

          {/* Section 2: Identity & Metrics */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
              2. IdentityCard & MetricsStrip
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4">
                <IdentityCard
                  name="Mostafa Ibrahim"
                  sexAndAge="Male, 54"
                  mrn="MRN-2026-0814"
                  criticalAllergy="Penicillin (Moderate)"
                  contextRows={[
                    { id: '1', label: 'Social history', value: 'Non-smoker, active' },
                    { id: '2', label: 'Care plan', value: 'HTN & T2D Management 2026' },
                  ]}
                />
              </div>

              <div className="md:col-span-8">
                <MetricsStrip
                  metrics={mockMetrics}
                  recordedCaption="Recorded 14 Oct 2026 by Dr. Tarek"
                />
              </div>
            </div>
          </section>

          {/* Section 3: Bottom Cards */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
              3. ModuleCard, RecordRow & RangeBar
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ModuleCard title="Vital Signs History" hasHandleHump onExpand={() => {}}>
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-[var(--color-ink-muted)]">Heart rate</span>
                    <span className="text-lg font-bold text-[var(--color-ink)]">78 bpm</span>
                  </div>
                  <div className="h-20 bg-[var(--color-white)] rounded-xl p-3 flex items-center justify-center border border-[var(--color-ink-soft)]/20">
                    <span className="text-xs text-[var(--color-ink-muted)]">Smooth vital trendline curve</span>
                  </div>
                </div>
              </ModuleCard>

              <ModuleCard title="Records" hasHandleHump onExpand={() => {}}>
                <div className="space-y-1">
                  <RecordRow
                    dateDay="14"
                    dateMonth="Oct"
                    title="Routine Clinical Follow-up"
                    isVisit
                  />
                  <RecordRow
                    dateDay="02"
                    dateMonth="Sep"
                    title="Comprehensive Metabolic Panel"
                    kind="lab"
                  />
                  <RecordRow
                    dateDay="18"
                    dateMonth="Aug"
                    title="Standard 12-Lead Electrocardiogram"
                    kind="procedure"
                  />
                </div>
              </ModuleCard>

              <ModuleCard title="Labs" hasHandleHump onExpand={() => {}}>
                <div className="space-y-3">
                  <RangeBar
                    label="Fasting Blood Glucose"
                    value={112}
                    unit="mg/dL"
                    min={60}
                    max={200}
                    lowThreshold={70}
                    highThreshold={125}
                  />
                  <RangeBar
                    label="Hemoglobin A1c"
                    value={6.9}
                    unit="%"
                    min={4.0}
                    max={12.0}
                    lowThreshold={4.5}
                    highThreshold={7.0}
                  />
                </div>
              </ModuleCard>
            </div>
          </section>

          {/* Section 4: Timeline Components */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
              4. Timeline Marks: TimelineNodes, MedicationChips, MetricCards & Scrubber
            </h2>

            <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)]/60 space-y-4">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-ink-muted)] font-medium">Milestone (L2):</span>
                  <TimelineNode variant="milestone" size="lg" badgeCount={3} />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-ink-muted)] font-medium">Child Node:</span>
                  <TimelineNode variant="child" size="md" icon={<Heart className="w-3.5 h-3.5" />} badgeCount={2} />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-ink-muted)] font-medium">Axis Dot:</span>
                  <TimelineNode variant="dot" />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-ink-muted)] font-medium">End Node (+):</span>
                  <TimelineNode variant="endNode" />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-ink-muted)] font-medium">MedicationChip:</span>
                  <MedicationChip name="Metformin 500mg" dosesPerDay={2} />
                  <MedicationChip name="Telmisartan 40mg" dosesPerDay={1} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <MetricCard
                  title="Blood Pressure"
                  currentReading="128/82"
                  unit="mmHg"
                  periodLabel="2 weeks since previous visit"
                  averageValue="130/84"
                  deltaValue="-4 mmHg"
                  deltaDirection="improving"
                  onExpand={() => {}}
                />

                <MetricCard
                  title="Fasting Glucose"
                  currentReading={168}
                  unit="mg/dL"
                  periodLabel="Month 1"
                  averageValue={172}
                  deltaValue="+12 mg/dL"
                  deltaDirection="worsening"
                  onExpand={() => {}}
                />
              </div>

              <div className="pt-2">
                <span className="text-xs text-[var(--color-ink-muted)] block mb-2 font-medium">Timeline Scrubber (ref-2)</span>
                <Scrubber />
              </div>

              <div className="pt-4 border-t border-[var(--color-ink-soft)]/20">
                <span className="text-xs text-[var(--color-ink-muted)] block mb-3 font-medium">
                  ImagingThumbCard (§4.5 #13 — Modality chip top-left, dark round arrow button bottom-right)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl">
                  <ImagingThumbCard
                    id="gal-img-1"
                    modality="Echocardiogram"
                    title="Transthoracic Echocardiogram (2D/Doppler)"
                    occurredAt="2025-09-04T10:00:00.000Z"
                    imagePath="/imaging/echo-hero-1.png"
                    reportText="Mild left ventricular concentric hypertrophy. LVEF 60%."
                    onClick={() => {}}
                  />
                  <ImagingThumbCard
                    id="gal-img-2"
                    modality="Ultrasound"
                    title="Renal Duplex Ultrasound"
                    occurredAt="2026-05-02T10:00:00.000Z"
                    imagePath="/imaging/renal-us-hero.png"
                    reportText="Normal bilateral kidney size and cortical echogenicity."
                    onClick={() => {}}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: State Components */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
              5. Designed States: Skeletons, Empty, Error, Permission Denied
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ModuleCard title="Loading Skeleton">
                <LoadingSkeleton variant="card" count={1} />
              </ModuleCard>

              <ModuleCard title="Empty State">
                <EmptyState
                  title={dict.states.noPatients}
                  actionLabel={dict.common.add}
                  onAction={() => {}}
                />
              </ModuleCard>

              <ModuleCard title="Error State">
                <ErrorState
                  message={dict.states.errorOccurred}
                  retryLabel={dict.common.retry}
                  onRetry={() => {}}
                />
              </ModuleCard>

              <ModuleCard title="Permission Denied">
                <PermissionDeniedState
                  message={dict.states.permissionDenied}
                />
              </ModuleCard>
            </div>
          </section>
        </main>
      </AppFrame>

      {/* Overlay Sheet Demo */}
      <OverlaySheet
        isOpen={isOverlayOpen}
        onClose={() => setIsOverlayOpen(false)}
        title="Clinical Record Details (Overlay Demo)"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-ink)]">
            This overlay sheet displays full clinical notes and records with focus trap, backdrop dimming, and Escape key dismissal.
          </p>
          <div className="p-4 rounded-xl bg-[var(--color-surface)] space-y-2">
            <span className="text-xs text-[var(--color-ink-muted)] uppercase tracking-wider block font-semibold">
              Event Metadata
            </span>
            <div className="text-xs text-[var(--color-ink)] space-y-1">
              <p>Provenance: Staff (Doctor)</p>
              <p>Verified: Yes (Dr. Tarek)</p>
              <p>Encounter: Outpatient Visit</p>
            </div>
          </div>
        </div>
      </OverlaySheet>
    </div>
  );
}
