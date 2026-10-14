import { readStore, writeStore } from './db';
import type { Patient, CareEvent, VitalObservation, Appointment, ClinicStats, PatientStatus } from './types';
import type { CreatePatientInput } from './schemas';

export async function getPatients(filter?: string, search?: string): Promise<Patient[]> {
  const store = readStore();
  let results = [...store.patients];

  if (search && search.trim() !== '') {
    const q = search.toLowerCase().trim();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q)
    );
  }

  if (filter && filter !== 'all') {
    if (filter === 'recent') {
      results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else if (filter === 'today') {
      results = results.filter((p) => p.lastVisitDate.includes('14 Oct 2026') || p.status === 'New');
    } else if (filter === 'needsAttention') {
      results = results.filter((p) => p.status === 'Needs review' || p.status === 'Critical');
    } else if (filter === 'critical') {
      results = results.filter((p) => p.status === 'Critical');
    }
  }

  return results;
}

export async function getPatientById(id: string): Promise<Patient | null> {
  const store = readStore();
  return store.patients.find((p) => p.id === id || p.mrn === id) || null;
}

export async function createPatient(input: CreatePatientInput): Promise<Patient> {
  const store = readStore();
  const nextSeq = store.patients.length + 1;
  const seqPadded = String(nextSeq).padStart(4, '0');
  const now = new Date();
  const nowIso = now.toISOString();
  const todayFormatted = '14 Oct 2026';

  const newPatient: Patient = {
    id: `p-${Date.now()}`,
    orgId: 'org-demo',
    mrn: `MRN-2026-${seqPadded}`,
    name: input.name,
    sex: input.sex,
    age: input.age,
    dateOfBirth: input.dateOfBirth,
    phone: input.phone,
    status: input.status as PatientStatus,
    primaryConcern: input.primaryConcern,
    socialHistory: input.socialHistory || 'Not recorded',
    carePlan: input.carePlan || 'Standard Clinical Observation',
    lastVisitDate: todayFormatted,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  store.patients.unshift(newPatient);

  // Automatically register an intake care event
  const newCareEvent: CareEvent = {
    id: `ce-${Date.now()}`,
    orgId: 'org-demo',
    patientId: newPatient.id,
    kind: 'visit',
    label: 'Initial Patient Intake',
    summary: `${input.primaryConcern}. Status: ${input.status}.`,
    occurredAt: todayFormatted,
    source: 'staff',
    createdBy: 'Staff Receptionist',
  };
  store.careEvents.unshift(newCareEvent);

  writeStore(store);
  return newPatient;
}

export async function getPatientCareEvents(patientId: string): Promise<CareEvent[]> {
  const store = readStore();
  return store.careEvents.filter((ce) => ce.patientId === patientId);
}

export async function getPatientVitals(patientId: string): Promise<VitalObservation[]> {
  const store = readStore();
  return store.vitals.filter((v) => v.patientId === patientId);
}

export async function getClinicAppointments(): Promise<Appointment[]> {
  const store = readStore();
  return store.appointments;
}

export async function getClinicStats(): Promise<ClinicStats> {
  const store = readStore();
  const totalPatients = store.patients.length;
  const completedToday = store.appointments.filter((a) => a.status === 'completed').length;
  const newAdmits = store.patients.filter((p) => p.status === 'New').length;

  return {
    totalPatients,
    completedToday,
    waitTimes: '12 min',
    newAdmits,
  };
}
