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
import Link from 'next/link';
import {
  fetchPatientByIdAction,
  fetchPatientEventsAction,
  fetchPatientVitalsAction,
  createVitalAction,
  fetchPatientAllergiesAction,
  fetchPatientLabsAction,
  createCareEventAction,
  fetchPatientMedicationsAction,
  createMedicationAction,
  updateMedicationStatusAction,
  updateMedicationDoseAction,
  updateMedicationAction,
  fetchPatientVisitsAction,
  createVisitAction,
  updateVisitStageAction,
  updateVisitNotesAction,
  createLabResultAction,
  markLabReviewedAction,
  fetchPatientImagingAction,
  createImagingStudyAction,
  fetchPatientGeneticsAction,
  createGeneticFindingAction,
  createAllergyAction,
  updateAllergyAction,
} from '@/data/actions';
import type {
  Patient,
  CareEvent,
  RecordKind,
  VitalObservation,
  Allergy,
  LabResult,
  Medication,
  MedicationStatus,
  Visit,
  VisitStage,
  ImagingStudy,
  GeneticFinding,
  ActiveIngredient,
} from '@/data/types';
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
  const resolvedParams = use(params);
  const patientId = resolvedParams.id;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [careEvents, setCareEvents] = useState<CareEvent[]>([]);
  const [vitals, setVitals] = useState<VitalObservation[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [imaging, setImaging] = useState<ImagingStudy[]>([]);
  const [genetics, setGenetics] = useState<GeneticFinding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);

  // New observation state
  const [entryLabel, setEntryLabel] = useState('');
  const [entrySummary, setEntrySummary] = useState('');
  const [entryKind, setEntryKind] = useState<RecordKind>('visit');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pt, events, vitalsData, allergiesData, labsData, medsData, visitsData, imagingData, geneticsData] = await Promise.all([
        fetchPatientByIdAction(patientId),
        fetchPatientEventsAction(patientId),
        fetchPatientVitalsAction(patientId),
        fetchPatientAllergiesAction(patientId),
        fetchPatientLabsAction(patientId),
        fetchPatientMedicationsAction(patientId),
        fetchPatientVisitsAction(patientId),
        fetchPatientImagingAction(patientId),
        fetchPatientGeneticsAction(patientId),
      ]);
      setPatient(pt);
      setCareEvents(events);
      setVitals(vitalsData);
      setAllergies(allergiesData);
      setLabs(labsData);
      setMedications(medsData);
      setVisits(visitsData);
      setImaging(imagingData);
      setGenetics(geneticsData);
    } catch (err) {
      console.error('Failed to load patient workspace:', err);
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryLabel) return;

    try {
      const todayFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const res = await createCareEventAction({
        patientId,
        kind: entryKind,
        label: entryLabel,
        summary: entrySummary || 'Recorded by clinician',
        occurredAt: todayFormatted,
        source: 'doctor',
        createdBy: 'Dr. Tarek',
      });

      if (res.success && res.data) {
        setCareEvents((prev) => [res.data!, ...prev]);
      } else {
        // Fallback local update
        const fallbackEvent: CareEvent = {
          id: `ce-${Date.now()}`,
          orgId: patient?.orgId || 'org-nile',
          patientId,
          kind: entryKind,
          label: entryLabel,
          summary: entrySummary || 'Recorded by clinician',
          occurredAt: todayFormatted,
          source: 'doctor',
          createdBy: 'Dr. Tarek',
        };
        setCareEvents((prev) => [fallbackEvent, ...prev]);
      }
    } catch (err) {
      console.error('Failed to create care event:', err);
    }

    setIsAddEntryOpen(false);
    setEntryLabel('');
    setEntrySummary('');
  };

  const handleStartMedication = async (newMed: {
    name: string;
    tradeName?: string;
    strength: string;
    activeIngredients?: ActiveIngredient[];
    dosesPerDay: number;
    route: string;
    instructions?: string;
    startDate?: string;
  }) => {
    const res = await createMedicationAction({
      patientId,
      ...newMed,
    });
    if (res.success && res.data) {
      setMedications((prev) => [res.data!, ...prev]);
      const updatedEvents = await fetchPatientEventsAction(patientId);
      setCareEvents(updatedEvents);
    }
  };

  const handleChangeMedicationDose = async (
    medId: string,
    newStrength: string,
    dosesPerDay: number,
    reason: string
  ) => {
    const res = await updateMedicationDoseAction(medId, newStrength, dosesPerDay, reason);
    if (res.success && res.data) {
      setMedications((prev) => prev.map((m) => (m.id === medId ? res.data! : m)));
      const updatedEvents = await fetchPatientEventsAction(patientId);
      setCareEvents(updatedEvents);
    }
  };

  const handleUpdateMedicationStatus = async (
    medId: string,
    status: MedicationStatus,
    reason?: string
  ) => {
    const res = await updateMedicationStatusAction(medId, status, reason);
    if (res.success && res.data) {
      setMedications((prev) => prev.map((m) => (m.id === medId ? res.data! : m)));
      const updatedEvents = await fetchPatientEventsAction(patientId);
      setCareEvents(updatedEvents);
    }
  };

  const handleUpdateMedication = async (
    medId: string,
    data: {
      name?: string;
      tradeName?: string;
      strength?: string;
      dosesPerDay?: number;
      route?: string;
      instructions?: string;
      startDate?: string;
    }
  ) => {
    const res = await updateMedicationAction({ medicationId: medId, ...data });
    if (res.success && res.data) {
      setMedications((prev) => prev.map((m) => (m.id === medId ? res.data! : m)));
      const updatedEvents = await fetchPatientEventsAction(patientId);
      setCareEvents(updatedEvents);
    }
  };

  const handleRecordVisit = async (newVisit: {
    title: string;
    visitType: string;
    reason: string;
    notes?: string;
    plan?: string;
    occurredAt?: string;
  }) => {
    const res = await createVisitAction({
      patientId,
      ...newVisit,
    });
    if (res.success && res.data) {
      setVisits((prev) => [res.data!, ...prev]);
      const updatedEvents = await fetchPatientEventsAction(patientId);
      setCareEvents(updatedEvents);
    }
  };

  const handleUpdateVisitStage = async (visitId: string, stage: VisitStage, notes?: string) => {
    const res = await updateVisitStageAction(visitId, stage, notes);
    if (res.success && res.data) {
      setVisits((prev) => prev.map((v) => (v.id === visitId ? res.data! : v)));
      const updatedEvents = await fetchPatientEventsAction(patientId);
      setCareEvents(updatedEvents);
    }
  };

  const handleUpdateVisitNotes = async (
    visitId: string,
    data: { notes?: string; plan?: string; followUpDate?: string }
  ) => {
    const res = await updateVisitNotesAction(visitId, data);
    if (res.success && res.data) {
      setVisits((prev) => prev.map((v) => (v.id === visitId ? res.data! : v)));
    }
  };

  const handleRecordVital = async (vitalData: {
    metric: string;
    value: string;
    unit: string;
    measuredAt?: string;
  }) => {
    const res = await createVitalAction({
      patientId,
      metric: vitalData.metric,
      value: vitalData.value,
      unit: vitalData.unit,
      measuredAt: vitalData.measuredAt,
      source: 'doctor',
      createdBy: 'Dr. Tarek',
    });
    if (res.success && res.data) {
      setVitals((prev) => [res.data!, ...prev]);
      const updatedEvents = await fetchPatientEventsAction(patientId);
      setCareEvents(updatedEvents);
    }
  };

  const handleRecordLab = async (newLab: {
    testName: string;
    value: string;
    unit: string;
    referenceLow?: number;
    referenceHigh?: number;
    status?: 'normal' | 'borderline' | 'abnormal' | 'critical';
    occurredAt?: string;
  }) => {
    const res = await createLabResultAction({
      patientId,
      ...newLab,
    });
    if (res.success && res.data) {
      setLabs((prev) => [res.data!, ...prev]);
      const updatedEvents = await fetchPatientEventsAction(patientId);
      setCareEvents(updatedEvents);
    }
  };

  const handleMarkLabReviewed = async (labId: string) => {
    const res = await markLabReviewedAction(labId, 'Dr. Tarek');
    if (res.success && res.data) {
      setLabs((prev) => prev.map((l) => (l.id === labId ? res.data! : l)));
    }
  };

  const handleAddAllergy = async (newAllergy: {
    substance: string;
    reaction: string;
    severity: 'mild' | 'moderate' | 'severe' | 'critical';
    status?: string;
  }) => {
    const res = await createAllergyAction({
      patientId,
      ...newAllergy,
    });
    if (res.success && res.data) {
      setAllergies((prev) => [res.data!, ...prev]);
      const updatedEvents = await fetchPatientEventsAction(patientId);
      setCareEvents(updatedEvents);
    }
  };

  const handleUpdateAllergy = async (updated: {
    allergyId: string;
    substance?: string;
    reaction?: string;
    severity?: 'mild' | 'moderate' | 'severe' | 'critical';
    status?: string;
  }) => {
    const res = await updateAllergyAction(updated);
    if (res.success && res.data) {
      setAllergies((prev) => prev.map((a) => (a.id === updated.allergyId ? res.data! : a)));
      const updatedEvents = await fetchPatientEventsAction(patientId);
      setCareEvents(updatedEvents);
    }
  };

  const handleAddGeneticFinding = async (newFinding: {
    finding: string;
    sourceDocument?: string;
    occurredAt?: string;
    interpretation?: string;
  }) => {
    const res = await createGeneticFindingAction({
      patientId,
      ...newFinding,
    });
    if (res.success && res.data) {
      setGenetics((prev) => [res.data!, ...prev]);
      const updatedEvents = await fetchPatientEventsAction(patientId);
      setCareEvents(updatedEvents);
    }
  };

  const handleSaveAIToNote = async (summaryText: string) => {
    const todayFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const latestVisit = visits[0];
    if (latestVisit) {
      const updatedNotes = latestVisit.notes
        ? `${latestVisit.notes}\n\n[AI Clinical Summary - Verified by Clinician on ${todayFormatted}]:\n${summaryText}`
        : `[AI Clinical Summary - Verified by Clinician on ${todayFormatted}]:\n${summaryText}`;
      await handleUpdateVisitNotes(latestVisit.id, { notes: updatedNotes });
    } else {
      await createCareEventAction({
        patientId,
        kind: 'visit',
        label: 'Clinical Progress Note (AI Assisted)',
        summary: summaryText,
        occurredAt: todayFormatted,
        source: 'doctor',
        createdBy: 'Dr. Tarek',
      });
      await loadData();
    }
  };


  if (isLoading) {
    return <PatientWorkspaceSkeleton />;
  }

  // If patient not found and not the demo fallback
  if (!patient && patientId !== 'p-tiffany') {
    return (
      <div className="min-h-screen bg-[var(--color-canvas)] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center text-[var(--color-ink-muted)] mb-4">
          <ArrowLeft className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-bold text-[var(--color-ink)] mb-1">
          Patient Record Not Found
        </h2>
        <p className="text-xs text-[var(--color-ink-muted)] mb-6 max-w-sm">
          No clinical record matches patient ID &quot;{patientId}&quot;. Please return to the clinic directory.
        </p>
        <Link
          href="/clinic"
          className="px-5 py-2.5 rounded-full bg-[var(--color-ink)] text-white text-xs font-bold hover:bg-black transition-all shadow-xs"
        >
          Return to Patients
        </Link>
      </div>
    );
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
        vitals={vitals}
        allergies={allergies}
        labs={labs}
        medications={medications}
        visits={visits}
        onAddEntry={() => setIsAddEntryOpen(true)}
        onStartMedication={handleStartMedication}
        onChangeMedicationDose={handleChangeMedicationDose}
        onUpdateMedicationStatus={handleUpdateMedicationStatus}
        onUpdateMedication={handleUpdateMedication}
        onRecordVisit={handleRecordVisit}
        onUpdateVisitStage={handleUpdateVisitStage}
        onUpdateVisitNotes={handleUpdateVisitNotes}
        onRecordLab={handleRecordLab}
        onRecordVital={handleRecordVital}
        onMarkLabReviewed={handleMarkLabReviewed}
        imaging={imaging}
        genetics={genetics}
        onAddAllergy={handleAddAllergy}
        onUpdateAllergy={handleUpdateAllergy}
        onAddGeneticFinding={handleAddGeneticFinding}
        onSaveAIToNote={handleSaveAIToNote}
        onUploadStudy={async (newStudy) => {
          const res = await createImagingStudyAction({
            patientId,
            ...newStudy,
          });
          if (res.success && res.data) {
            setImaging((prev) => [res.data!, ...prev]);
            await loadData();
          }
        }}
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
