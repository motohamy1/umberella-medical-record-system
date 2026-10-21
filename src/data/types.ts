export type PatientStatus = 'Stable' | 'New' | 'Follow-up' | 'Needs review' | 'Critical';
export type Sex = 'Male' | 'Female' | 'Other';
export type RecordKind = 'visit' | 'medication' | 'lab' | 'imaging' | 'procedure' | 'hospitalization' | 'vitals' | 'symptom';
export type ProvenanceSource = 'staff' | 'doctor' | 'patient' | 'ocr' | 'import' | 'system';

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
  userId?: string | null;
  photoPath?: string | null;
  primaryConcern: string;
  socialHistory?: string;
  carePlan?: string;
  lastVisitDate: string;
  recordChips?: Array<{ kind: RecordKind; date: string }>;
  extraChipCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CareEvent {
  id: string;
  orgId: string;
  patientId: string;
  kind: RecordKind;
  occurredAt: string;
  endedAt?: string | null;
  visitId?: string | null;
  sourceTable?: string;
  sourceId?: string;
  label: string;
  summary: string;
  source: ProvenanceSource;
  createdBy: string;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
}

export interface Milestone {
  id: string;
  at: string;
  title: string;
}

export interface TimelineEvent {
  id: string;
  kind: RecordKind;
  at: string;
  endAt?: string | null;
  visitId?: string | null;
  label: string;
  summary?: string;
  value?: string;
  unit?: string;
  status?: string;
  flags?: Record<string, unknown>;
}

export interface TimelineData {
  milestones: Milestone[];
  events: TimelineEvent[];
}

export interface SeriesPoint {
  at: string;
  value: number;
  systolic?: number;
  diastolic?: number;
}

export interface VitalObservation {
  id: string;
  orgId: string;
  patientId: string;
  visitId?: string | null;
  metric: 'pulse' | 'pressure' | 'oxygen' | 'temp' | 'glucose' | 'weight' | 'mood';
  value: string;
  unit: string;
  measuredAt: string;
  source: ProvenanceSource;
  createdBy?: string;
  verifiedBy?: string | null;
}

export interface Appointment {
  id: string;
  orgId: string;
  patientId: string;
  patientName: string;
  scheduledTime: string;
  visitType: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  actualStart?: string | null;
  actualEnd?: string | null;
}

export type VisitStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
export type VisitStage = 'before' | 'during' | 'after';

export interface Visit {
  id: string;
  orgId: string;
  patientId: string;
  title: string;
  visitType: string;
  reason?: string;
  notes?: string;
  status: VisitStatus;
  stage: VisitStage;
  occurredAt: string;
  source: ProvenanceSource;
  createdBy: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  aiGenerated?: boolean;
  assessment?: string;
  plan?: string;
  followUpDate?: string;
}

export interface ClinicStats {
  totalPatients: number;
  completedToday: number;
  waitTimes: string;
  newAdmits: number;
}

export interface Allergy {
  id: string;
  orgId: string;
  patientId: string;
  substance: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  status: string;
  source: ProvenanceSource;
  createdBy: string;
  createdAt: string;
}

export interface LabResult {
  id: string;
  orgId: string;
  patientId: string;
  testName: string;
  value: string;
  unit: string;
  referenceLow?: number;
  referenceHigh?: number;
  status: 'normal' | 'borderline' | 'abnormal' | 'critical';
  occurredAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  source: ProvenanceSource;
  createdBy: string;
}

export type MedicationStatus = 'active' | 'paused' | 'stopped' | 'completed';

export interface Medication {
  id: string;
  orgId: string;
  patientId: string;
  name: string;
  strength: string;
  dosesPerDay: number;
  route: string;
  instructions?: string;
  status: MedicationStatus;
  startDate: string;
  endDate?: string | null;
  source: ProvenanceSource;
  createdBy: string;
  createdAt?: string;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
}

export interface MedicationEvent {
  id: string;
  orgId: string;
  patientId: string;
  medicationId: string;
  eventType: 'start' | 'change' | 'pause' | 'stop';
  detail?: string;
  occurredAt: string;
  source: ProvenanceSource;
  createdBy: string;
  createdAt?: string;
}

export type ImagingModality = 'Echocardiogram' | 'Ultrasound' | 'MRI' | 'CT' | 'X-Ray';

export interface ImagingStudy {
  id: string;
  orgId: string;
  patientId: string;
  visitId?: string | null;
  modality: ImagingModality | string;
  title: string;
  reportText?: string | null;
  imagePath?: string | null;
  occurredAt: string;
  source: ProvenanceSource;
  createdBy: string;
  createdAt?: string;
}

export interface GeneticFinding {
  id: string;
  orgId: string;
  patientId: string;
  finding: string;
  sourceDocument?: string | null;
  occurredAt: string;
  interpretation?: string | null;
  source: ProvenanceSource;
  createdBy: string;
  createdAt?: string;
}

export type MessageChannel = 'in_app' | 'whatsapp' | 'telegram';
export type MessageRole = 'doctor' | 'patient' | 'system';
export type MessageDeliveryStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ChatMessage {
  id: string;
  orgId: string;
  patientId: string;
  senderRole: MessageRole;
  senderName: string;
  channel: MessageChannel;
  content: string;
  sentAt: string;
  status: MessageDeliveryStatus;
  metadata?: {
    externalId?: string;
    recipientPhone?: string;
    telegramChatId?: string;
    templateName?: string;
    consentObtained?: boolean;
  };
}

