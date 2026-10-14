'use client';

/**
 * Patient Clinical Workspace Shell & Overview.
 * Designed directly from Paper MCP Canvas (Node ID: E9-0, File: 01M4V9HMNRE3TZY6ZKW2A941AE).
 * Implements the authentic Umbrella design system:
 * - Patient profile card with portrait, social history, care plan, and notch handle
 * - Body system perspective tabs (Overview, AI Analysis, Visits, Labs, Imaging, Genetics)
 * - Visit filter pills (Office Visits, Medications, Labs, Procedures, Hospitalizations, Imaging)
 * - Care timeline with organic branch connections, event badges, MRI scan card, and scrubber
 * - Signature 3 notched bottom health record cards (Vital Signs History with ECG wave, Records with date capsule, Labs with 5-zone range gauge)
 */

import React, { useState, useEffect, useCallback, use, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { fetchPatientByIdAction, fetchPatientEventsAction } from '@/data/actions';
import type { Patient, CareEvent, RecordKind } from '@/data/types';
import { PaperPatientWorkspace } from '@/components/patient/PaperPatientWorkspace';
import { OverlaySheet } from '@/components/overlays/OverlaySheet';
import { ArrowLeft } from 'lucide-react';

interface PatientPageProps {
  params: Promise<{ id: string }>;
}

function PatientWorkspaceSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--color-canvas)] flex items-center justify-center p-12">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-3 border-[var(--color-ink)] border-t-transparent animate-spin" />
        <span className="text-xs font-semibold text-[var(--color-ink-muted)]">
          Loading Umbrella Clinical Workspace...
        </span>
      </div>
    </div>
  );
}

function PatientWorkspaceContent({ params }: PatientPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const patientId = resolvedParams.id;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [careEvents, setCareEvents] = useState<CareEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);

  // New observation state
  const [entryLabel, setEntryLabel] = useState('');
  const [entrySummary, setEntrySummary] = useState('');
  const [entryKind, setEntryKind] = useState<RecordKind>('visit');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pt, events] = await Promise.all([
        fetchPatientByIdAction(patientId),
        fetchPatientEventsAction(patientId),
      ]);
      setPatient(pt);
      setCareEvents(events);
    } catch (err) {
      console.error('Failed to load patient workspace:', err);
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryLabel) return;

    const newEvent: CareEvent = {
      id: `ce-${Date.now()}`,
      orgId: patient?.orgId || 'org-demo',
      patientId,
      kind: entryKind,
      label: entryLabel,
      summary: entrySummary || 'Recorded by clinician',
      occurredAt: '14 Oct 2026',
      source: 'doctor',
      createdBy: 'Dr. Tarek',
    };

    setCareEvents((prev) => [newEvent, ...prev]);
    setIsAddEntryOpen(false);
    setEntryLabel('');
    setEntrySummary('');
  };

  if (isLoading) {
    return <PatientWorkspaceSkeleton />;
  }

  // Fallback demo patient if specific ID not found
  const activePatient: Patient = patient || {
    id: 'p-tiffany',
    orgId: 'org-demo',
    mrn: 'MRN-2026-0924',
    name: 'Tiffany Woodward',
    sex: 'Female',
    age: 24,
    dateOfBirth: '2002-06-18',
    phone: '+1 (555) 382-9012',
    status: 'Needs review',
    primaryConcern: 'Neurological evaluation & acute ED visit',
    socialHistory: 'Alcohol, Tobacco',
    carePlan: 'ED care plan',
    lastVisitDate: '07 Sep 2026',
    createdAt: '2026-01-05T08:00:00Z',
    updatedAt: '2026-09-07T14:30:00Z',
  };

  return (
    <div className="w-full min-h-screen bg-[var(--color-canvas)]">
      <PaperPatientWorkspace
        patient={activePatient}
        careEvents={careEvents}
        onAddEntry={() => setIsAddEntryOpen(true)}
      />

      {/* Add Observation / Clinical Note Sheet */}
      <OverlaySheet
        isOpen={isAddEntryOpen}
        onClose={() => setIsAddEntryOpen(false)}
        title="Add Clinical Entry / Observation"
      >
        <form onSubmit={handleAddEntry} className="space-y-4 font-['Inter',sans-serif]">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
              Record Kind
            </label>
            <select
              value={entryKind}
              onChange={(e) => setEntryKind(e.target.value as RecordKind)}
              className="w-full px-3.5 py-2 rounded-xl bg-stone-100 border border-stone-200 text-xs sm:text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
            >
              <option value="visit">Clinical Visit / Consultation</option>
              <option value="vitals">Vital Signs Reading</option>
              <option value="lab">Lab Result</option>
              <option value="medication">Medication Order</option>
              <option value="procedure">Clinical Procedure</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
              Event Title / Label *
            </label>
            <input
              type="text"
              required
              value={entryLabel}
              onChange={(e) => setEntryLabel(e.target.value)}
              placeholder="e.g. Fasting Glucose or Brain MRI Scan"
              className="w-full px-3.5 py-2 rounded-xl bg-stone-100 border border-stone-200 text-xs sm:text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
              Clinical Findings / Summary
            </label>
            <textarea
              rows={3}
              value={entrySummary}
              onChange={(e) => setEntrySummary(e.target.value)}
              placeholder="e.g. 83 mg/dL, normal fasting glycemia, patient asymptomatic"
              className="w-full px-3.5 py-2 rounded-xl bg-stone-100 border border-stone-200 text-xs sm:text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsAddEntryOpen(false)}
              className="px-4 py-2 rounded-full bg-stone-100 text-[var(--color-ink)] text-xs font-semibold hover:bg-stone-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-[var(--color-ink)] text-white text-xs font-bold shadow-xs hover:bg-black active:scale-95 transition-all"
            >
              Save Entry
            </button>
          </div>
        </form>
      </OverlaySheet>
    </div>
  );
}

export default function PatientWorkspacePage(props: PatientPageProps) {
  return (
    <Suspense fallback={<PatientWorkspaceSkeleton />}>
      <PatientWorkspaceContent {...props} />
    </Suspense>
  );
}
