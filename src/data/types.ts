export type PatientStatus = 'Stable' | 'New' | 'Follow-up' | 'Needs review' | 'Critical';
export type Sex = 'Male' | 'Female' | 'Other';
export type RecordKind = 'visit' | 'medication' | 'lab' | 'imaging' | 'procedure' | 'hospitalization' | 'vitals';

export interface Patient {
  id: string;
  orgId: string;
  mrn: string;
  name: string;
  sex: Sex;
  age: number;
  dateOfBirth: string;
  phone: string;
  status: PatientStatus;
  primaryConcern: string;
  socialHistory?: string;
  carePlan?: string;
  lastVisitDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CareEvent {
  id: string;
  orgId: string;
  patientId: string;
  kind: RecordKind;
  label: string;
  summary: string;
  occurredAt: string;
  source: 'staff' | 'doctor' | 'patient' | 'system';
  createdBy: string;
}

export interface VitalObservation {
  id: string;
  orgId: string;
  patientId: string;
  metric: 'pulse' | 'pressure' | 'oxygen' | 'temp' | 'glucose' | 'weight';
  value: string;
  unit: string;
  measuredAt: string;
  source: 'staff' | 'patient';
}

export interface Appointment {
  id: string;
  orgId: string;
  patientId: string;
  patientName: string;
  scheduledTime: string;
  visitType: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface ClinicStats {
  totalPatients: number;
  completedToday: number;
  waitTimes: string;
  newAdmits: number;
}
