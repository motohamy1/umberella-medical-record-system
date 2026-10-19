'use server';

import {
  createPatient,
  getPatients,
  getPatientById,
  getClinicStats,
  getClinicAppointments,
  getPatientCareEvents,
  getPatientVitals,
  getPatientAllergies,
  getPatientLabs,
  sendPatientInvite,
  createCareEvent,
  getPatientMedications,
  getPatientMedicationEvents,
  createMedication,
  updateMedicationStatus,
  updateMedicationDose,
  getPatientVisits,
  getVisitById,
  getVisitVitals,
  createVisit,
  updateVisitStage,
  updateVisitNotes,
  getLabTrends,
  markLabReviewed,
  createLabResult,
  type LabTrendPoint,
  getPatientImaging,
  getImagingStudyById,
  createImagingStudy,
  createAllergy,
  updateAllergy,
  deleteAllergy,
  getPatientGenetics,
  createGeneticFinding,
  recordPatientObservation,
  recordPatientMedicationTaken,
  getPatientHomeData,
  type PatientObservationInput,
} from './repository';
import { generateSignedMediaUrl } from '@/lib/signedAccess';
import { readStore, writeStore } from './db';
import { CreatePatientSchema } from './schemas';
import type {
  Patient,
  ClinicStats,
  Appointment,
  CareEvent,
  VitalObservation,
  Allergy,
  LabResult,
  RecordKind,
  ProvenanceSource,
  Medication,
  MedicationEvent,
  MedicationStatus,
  Visit,
  VisitStage,
  VisitStatus,
  ImagingStudy,
  GeneticFinding,
} from './types';

export interface ActionState<T> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createPatientAction(
  _prevState: ActionState<Patient>,
  formData: FormData
): Promise<ActionState<Patient>> {
  try {
    const rawData = {
      name: formData.get('name') as string,
      sex: formData.get('sex') as string,
      age: formData.get('age') as string,
      dateOfBirth: formData.get('dateOfBirth') as string,
      phone: formData.get('phone') as string,
      status: formData.get('status') as string,
      primaryConcern: formData.get('primaryConcern') as string,
      socialHistory: (formData.get('socialHistory') as string) || undefined,
      carePlan: (formData.get('carePlan') as string) || undefined,
    };

    const parsed = CreatePatientSchema.safeParse(rawData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const fieldName = issue.path[0] as string;
        fieldErrors[fieldName] = issue.message;
      }
      return {
        success: false,
        error: 'Please correct the validation errors in the form.',
        fieldErrors,
      };
    }

    const created = await createPatient(parsed.data);
    return {
      success: true,
      data: created,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create patient';
    return {
      success: false,
      error: message,
    };
  }
}

export async function fetchPatientsAction(
  filter?: string,
  search?: string,
  limit?: number,
  offset?: number
): Promise<Patient[]> {
  return getPatients(filter, search, limit, offset);
}

export async function sendPatientInviteAction(patientId: string): Promise<{ success: boolean; inviteToken: string }> {
  return sendPatientInvite(patientId);
}

export async function fetchPatientByIdAction(id: string): Promise<Patient | null> {
  return getPatientById(id);
}

export async function fetchClinicStatsAction(): Promise<ClinicStats> {
  return getClinicStats();
}

export async function fetchClinicAppointmentsAction(): Promise<Appointment[]> {
  return getClinicAppointments();
}

export async function fetchPatientEventsAction(patientId: string): Promise<CareEvent[]> {
  return getPatientCareEvents(patientId);
}

export async function fetchPatientVitalsAction(patientId: string): Promise<VitalObservation[]> {
  return getPatientVitals(patientId);
}

export async function fetchPatientAllergiesAction(patientId: string): Promise<Allergy[]> {
  return getPatientAllergies(patientId);
}

export async function fetchPatientLabsAction(patientId: string): Promise<LabResult[]> {
  return getPatientLabs(patientId);
}

/**
 * Dev Data actions per PACK.md §8.1 & §11
 */
export async function fetchDevSummaryAction() {
  const store = readStore();
  const patients = store.patients || [];
  const visits = store.visits || [];
  const vitals = store.vitals || [];
  const labs = store.labs || [];
  const imaging = store.imaging || [];
  const appointments = store.appointments || [];
  const careEvents = store.careEvents || [];
  const medications = store.medications || [];

  return {
    tableCounts: {
      patients: patients.length,
      careEvents: careEvents.length,
      visits: visits.length,
      vitals: vitals.length,
      labs: labs.length,
      imaging: imaging.length,
      appointments: appointments.length,
      medications: medications.length,
    },
    heroPatient: patients.find((p: Patient) => p.id === 'p-001') || null,
    heroVitalsCount: vitals.filter((v: VitalObservation) => v.patientId === 'p-001').length,
    heroVisitsCount: visits.filter((v: any) => v.patientId === 'p-001').length,
    heroEventsCount: careEvents.filter((c: CareEvent) => c.patientId === 'p-001').length,
  };
}

export async function add30DaysVitalsAction(patientId: string): Promise<{ added: number }> {
  const store = readStore();
  const newVitals: VitalObservation[] = [];
  const now = new Date();

  for (let i = 1; i <= 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString();
    const sys = 124 + Math.round(Math.random() * 8 - 4);
    const dia = 80 + Math.round(Math.random() * 6 - 3);

    newVitals.push({
      id: `vit-extra-${Date.now()}-${i}`,
      orgId: 'org-nile',
      patientId,
      metric: 'pressure',
      value: `${sys}/${dia}`,
      unit: 'mmHg',
      measuredAt: dateStr,
      source: 'patient',
    });
  }

  store.vitals = [...newVitals, ...(store.vitals || [])];
  writeStore(store);
  return { added: newVitals.length };
}

export async function addRandomVisitAction(patientId: string): Promise<{ success: boolean }> {
  const store = readStore();
  const visitId = `vst-extra-${Date.now()}`;
  const now = new Date().toISOString();

  const newVisit = {
    id: visitId,
    orgId: 'org-nile',
    patientId,
    title: 'Ad-hoc Progress Encounter',
    visitType: 'Follow-up',
    reason: 'Interim blood pressure and metabolic evaluation',
    notes: 'Patient attended clinic for scheduled progress assessment. Tolerating therapy.',
    status: 'completed',
    stage: 'after',
    occurredAt: now,
    source: 'doctor',
    createdBy: 'Dr. Tarek',
  };

  const newCareEvent: CareEvent = {
    id: `ce-extra-${Date.now()}`,
    orgId: 'org-nile',
    patientId,
    kind: 'visit',
    occurredAt: now,
    visitId,
    label: newVisit.title,
    summary: 'Interim blood pressure and metabolic evaluation',
    source: 'doctor',
    createdBy: 'Dr. Tarek',
  };

  store.visits = [newVisit, ...(store.visits || [])];
  store.careEvents = [newCareEvent, ...(store.careEvents || [])];
  writeStore(store);
  return { success: true };
}

export async function createCareEventAction(eventData: {
  patientId: string;
  kind: RecordKind;
  label: string;
  summary: string;
  occurredAt?: string;
  source?: ProvenanceSource;
  createdBy?: string;
}): Promise<ActionState<CareEvent>> {
  try {
    const created = await createCareEvent(eventData);
    return {
      success: true,
      data: created,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create clinical entry';
    return {
      success: false,
      error: message,
    };
  }
}

export async function fetchPatientMedicationsAction(patientId: string): Promise<Medication[]> {
  return getPatientMedications(patientId);
}

export async function fetchPatientMedicationEventsAction(patientId: string): Promise<MedicationEvent[]> {
  return getPatientMedicationEvents(patientId);
}

export async function createMedicationAction(input: {
  patientId: string;
  name: string;
  strength: string;
  dosesPerDay?: number;
  route?: string;
  instructions?: string;
  startDate?: string;
}): Promise<ActionState<Medication>> {
  try {
    if (!input.name || !input.strength) {
      return {
        success: false,
        error: 'Medication name and strength are required.',
      };
    }
    const created = await createMedication(input);
    return {
      success: true,
      data: created,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to prescribe medication';
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateMedicationStatusAction(
  medicationId: string,
  newStatus: MedicationStatus,
  reason?: string
): Promise<ActionState<Medication>> {
  try {
    const updated = await updateMedicationStatus(medicationId, newStatus, reason);
    if (!updated) {
      return {
        success: false,
        error: 'Medication not found',
      };
    }
    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update medication status';
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateMedicationDoseAction(
  medicationId: string,
  newStrength: string,
  newDosesPerDay: number,
  reason?: string
): Promise<ActionState<Medication>> {
  try {
    const updated = await updateMedicationDose(medicationId, newStrength, newDosesPerDay, reason);
    if (!updated) {
      return {
        success: false,
        error: 'Medication not found',
      };
    }
    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update medication dose';
    return {
      success: false,
      error: message,
    };
  }
}

export async function fetchPatientVisitsAction(patientId: string): Promise<Visit[]> {
  return getPatientVisits(patientId);
}

export async function fetchVisitByIdAction(
  visitId: string
): Promise<{ visit: Visit | null; vitals: VitalObservation[] }> {
  const [visit, vitals] = await Promise.all([
    getVisitById(visitId),
    getVisitVitals(visitId),
  ]);
  return { visit, vitals };
}

export async function createVisitAction(input: {
  patientId: string;
  title: string;
  visitType: string;
  reason?: string;
  notes?: string;
  plan?: string;
  occurredAt?: string;
  stage?: VisitStage;
  status?: VisitStatus;
}): Promise<ActionState<Visit>> {
  try {
    if (!input.title) {
      return {
        success: false,
        error: 'Visit title is required',
      };
    }
    const created = await createVisit(input);
    return {
      success: true,
      data: created,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record visit';
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateVisitStageAction(
  visitId: string,
  stage: VisitStage,
  notes?: string
): Promise<ActionState<Visit>> {
  try {
    const updated = await updateVisitStage(visitId, stage, notes);
    if (!updated) {
      return {
        success: false,
        error: 'Visit not found',
      };
    }
    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update visit stage';
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateVisitNotesAction(
  visitId: string,
  data: {
    notes?: string;
    plan?: string;
    assessment?: string;
    followUpDate?: string;
  }
): Promise<ActionState<Visit>> {
  try {
    const updated = await updateVisitNotes(visitId, data);
    if (!updated) {
      return {
        success: false,
        error: 'Visit not found',
      };
    }
    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update clinical documentation';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * ============================================================================
 * SLICE S10: LABS SERVER ACTIONS (PACK.md §6.5 & §11)
 * ============================================================================
 */

export async function fetchLabTrendsAction(
  patientId: string,
  testName: string
): Promise<LabTrendPoint[]> {
  return getLabTrends(patientId, testName);
}

export async function markLabReviewedAction(
  labId: string,
  reviewedBy: string = 'Dr. Tarek'
): Promise<ActionState<LabResult>> {
  try {
    const updated = await markLabReviewed(labId, reviewedBy);
    if (!updated) {
      return {
        success: false,
        error: 'Lab result not found',
      };
    }
    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to mark lab reviewed';
    return {
      success: false,
      error: message,
    };
  }
}

export async function createLabResultAction(input: {
  patientId: string;
  testName: string;
  value: string;
  unit: string;
  referenceLow?: number;
  referenceHigh?: number;
  status?: 'normal' | 'borderline' | 'abnormal' | 'critical';
  occurredAt?: string;
}): Promise<ActionState<LabResult>> {
  try {
    if (!input.testName || !input.value) {
      return {
        success: false,
        error: 'Test name and observed value are required',
      };
    }
    const created = await createLabResult({
      ...input,
      source: 'doctor',
      createdBy: 'Dr. Tarek',
    });
    return {
      success: true,
      data: created,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record lab result';
    return {
      success: false,
      error: message,
    };
  }
}

export async function fetchPatientImagingAction(patientId: string): Promise<ImagingStudy[]> {
  return getPatientImaging(patientId);
}

export async function fetchImagingStudyByIdAction(studyId: string): Promise<ImagingStudy | null> {
  return getImagingStudyById(studyId);
}

export async function createImagingStudyAction(input: {
  patientId: string;
  modality: string;
  title: string;
  reportText?: string;
  imagePath?: string;
  occurredAt?: string;
}): Promise<ActionState<ImagingStudy>> {
  try {
    if (!input.title || !input.modality) {
      return {
        success: false,
        error: 'Study title and modality are required',
      };
    }
    const created = await createImagingStudy({
      ...input,
      source: 'doctor',
      createdBy: 'Dr. Tarek',
    });
    return {
      success: true,
      data: created,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record imaging study';
    return {
      success: false,
      error: message,
    };
  }
}

export async function getSignedStudyUrlAction(imagePath: string): Promise<string> {
  return generateSignedMediaUrl(imagePath, 300);
}

export async function createAllergyAction(input: {
  patientId: string;
  substance: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  status?: string;
}): Promise<ActionState<Allergy>> {
  try {
    if (!input.substance || !input.reaction) {
      return {
        success: false,
        error: 'Substance and clinical reaction description are required.',
      };
    }
    const created = await createAllergy({
      ...input,
      source: 'doctor',
      createdBy: 'Dr. Tarek',
    });
    return {
      success: true,
      data: created,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record allergy';
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateAllergyAction(input: {
  allergyId: string;
  substance?: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'critical';
  status?: string;
}): Promise<ActionState<Allergy>> {
  try {
    const updated = await updateAllergy(input);
    if (!updated) {
      return {
        success: false,
        error: 'Allergy record not found.',
      };
    }
    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update allergy';
    return {
      success: false,
      error: message,
    };
  }
}

export async function deleteAllergyAction(allergyId: string): Promise<ActionState<boolean>> {
  try {
    const res = await deleteAllergy(allergyId);
    return {
      success: res,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete allergy';
    return {
      success: false,
      error: message,
    };
  }
}

export async function fetchPatientGeneticsAction(patientId: string): Promise<GeneticFinding[]> {
  return getPatientGenetics(patientId);
}

export async function createGeneticFindingAction(input: {
  patientId: string;
  finding: string;
  sourceDocument?: string;
  occurredAt?: string;
  interpretation?: string;
}): Promise<ActionState<GeneticFinding>> {
  try {
    if (!input.finding) {
      return {
        success: false,
        error: 'Genomic finding description is required.',
      };
    }
    const created = await createGeneticFinding({
      ...input,
      source: 'doctor',
      createdBy: 'Dr. Tarek',
    });
    return {
      success: true,
      data: created,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record genomic finding';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * ============================================================================
 * SLICE S13: PATIENT HOME SERVER ACTIONS (PACK.md §6.7 & §11)
 * ============================================================================
 */

export async function fetchPatientHomeDataAction(patientId: string) {
  return getPatientHomeData(patientId);
}

export async function recordPatientObservationAction(
  input: PatientObservationInput
): Promise<ActionState<CareEvent>> {
  try {
    const event = await recordPatientObservation(input);
    return {
      success: true,
      data: event,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record patient observation';
    return {
      success: false,
      error: message,
    };
  }
}

export async function recordPatientMedicationTakenAction(input: {
  patientId: string;
  medicationId: string;
  medicationName: string;
}): Promise<ActionState<CareEvent>> {
  try {
    const event = await recordPatientMedicationTaken(input);
    return {
      success: true,
      data: event,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record dose taken';
    return {
      success: false,
      error: message,
    };
  }
}



