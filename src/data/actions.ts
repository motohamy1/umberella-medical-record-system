'use server';

import { createPatient, getPatients, getPatientById, getClinicStats, getClinicAppointments, getPatientCareEvents, getPatientVitals } from './repository';
import { CreatePatientSchema } from './schemas';
import type { Patient, ClinicStats, Appointment, CareEvent, VitalObservation } from './types';

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

export async function fetchPatientsAction(filter?: string, search?: string): Promise<Patient[]> {
  return getPatients(filter, search);
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
