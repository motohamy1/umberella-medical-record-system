import { getDb, readStore, writeStore } from './db';
import type {
  Patient,
  CareEvent,
  VitalObservation,
  Appointment,
  ClinicStats,
  PatientStatus,
  TimelineData,
  Milestone,
  TimelineEvent,
  SeriesPoint,
  RecordKind,
  ProvenanceSource,
  Allergy,
  LabResult,
  Medication,
  MedicationEvent,
  MedicationStatus,
  Visit,
  VisitStage,
  VisitStatus,
  ImagingStudy,
  GeneticFinding,
  ChatMessage,
  MessageChannel,
  MessageRole,
  MessageDeliveryStatus,
} from './types';
import type { CreatePatientInput } from './schemas';

/**
 * Helper to format short date for folder chips (e.g., "14 Oct")
 */
function formatChipDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${monthNames[d.getMonth()]}`;
    }
  } catch {}
  return String(dateStr).slice(0, 6);
}

/**
 * Defensive date to ISO string converter for database row columns.
 * Prevents PostgreSQL TIMESTAMP Date objects from causing React child rendering errors.
 */
function toISO(val: unknown): string {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function toISOOrNull(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function toISOOrUndefined(val: unknown): string | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

/**
 * Retrieve patient directory with search & status filters, with folder chips populated from care_events.
 */
export async function getPatients(
  filter?: string,
  search?: string,
  limit?: number,
  offset?: number
): Promise<Patient[]> {
  const sql = getDb();
  if (sql) {
    try {
      let query = `SELECT * FROM patients WHERE deleted_at IS NULL`;
      const params: any[] = [];

      if (search && search.trim() !== '') {
        params.push(`%${search.trim().toLowerCase()}%`);
        query += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(mrn) LIKE $${params.length} OR phone LIKE $${params.length})`;
      }

      if (filter && filter !== 'all') {
        if (filter === 'needsAttention') {
          query += ` AND status IN ('Needs review', 'Critical')`;
        } else if (filter === 'critical') {
          query += ` AND status = 'Critical'`;
        } else if (filter === 'today') {
          query += ` AND (last_visit_date LIKE '%14 Oct 2026%' OR status = 'New')`;
        }
      }

      if (filter === 'recent') {
        query += ` ORDER BY updated_at DESC, created_at DESC`;
      } else {
        query += ` ORDER BY created_at DESC`;
      }

      if (typeof limit === 'number') {
        params.push(limit);
        query += ` LIMIT $${params.length}`;
        if (typeof offset === 'number' && offset > 0) {
          params.push(offset);
          query += ` OFFSET $${params.length}`;
        }
      }

      const rows = (await (sql as any).query(query, params)) as any[];
      const patients: Patient[] = rows.map((r) => ({
        id: r.id,
        orgId: r.org_id,
        mrn: r.mrn,
        name: r.name,
        sex: r.sex,
        age: r.age,
        dateOfBirth: r.date_of_birth,
        phone: r.phone,
        status: r.status,
        userId: r.user_id,
        primaryConcern: r.primary_concern,
        socialHistory: r.social_history,
        carePlan: r.care_plan,
        lastVisitDate: toISO(r.last_visit_date),
        createdAt: toISO(r.created_at),
        updatedAt: toISO(r.updated_at),
      }));

      // Populate care event chips in a single batch query
      if (patients.length > 0) {
        try {
          const patientIds = patients.map((p) => p.id);
          const events = (await (sql as any).query(
            `SELECT patient_id, kind, occurred_at FROM care_events WHERE patient_id = ANY($1) ORDER BY occurred_at DESC`,
            [patientIds]
          )) as any[];
          const eventsByPatient: Record<string, any[]> = {};
          for (const ev of events) {
            if (!eventsByPatient[ev.patient_id]) eventsByPatient[ev.patient_id] = [];
            eventsByPatient[ev.patient_id].push(ev);
          }
          for (const p of patients) {
            let pEvents = eventsByPatient[p.id] || [];
            if (pEvents.length === 0) {
              const localEvents = (readStore().careEvents || []).filter((e: CareEvent) => e.patientId === p.id);
              if (localEvents.length > 0) {
                pEvents = localEvents.map((e: CareEvent) => ({
                  kind: e.kind,
                  occurred_at: e.occurredAt,
                }));
              }
            }
            p.recordChips = pEvents.slice(0, 4).map((e) => ({
              kind: e.kind,
              date: formatChipDate(e.occurred_at),
            }));
            p.extraChipCount = Math.max(0, pEvents.length - 4);
          }
        } catch {
          const store = readStore();
          const allEvents = store.careEvents || [];
          for (const p of patients) {
            const pEvents = allEvents.filter((e: CareEvent) => e.patientId === p.id);
            p.recordChips = pEvents.slice(0, 4).map((e: CareEvent) => ({
              kind: e.kind,
              date: formatChipDate(e.occurredAt),
            }));
            p.extraChipCount = Math.max(0, pEvents.length - 4);
          }
        }
      }

      return patients;
    } catch (err) {
      console.warn('Neon query failed, using store fallback:', err);
    }
  }

  // Fallback to local store
  const store = readStore();
  let results = [...(store.patients || [])];

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
      results = results.filter((p) => (p.lastVisitDate && p.lastVisitDate.includes('14 Oct 2026')) || p.status === 'New');
    } else if (filter === 'needsAttention') {
      results = results.filter((p) => p.status === 'Needs review' || p.status === 'Critical');
    } else if (filter === 'critical') {
      results = results.filter((p) => p.status === 'Critical');
    }
  }

  // Attach care event chips from store
  const allEvents = store.careEvents || [];
  for (const p of results) {
    const patientEvents = allEvents
      .filter((e: CareEvent) => e.patientId === p.id)
      .sort((a: CareEvent, b: CareEvent) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    p.recordChips = patientEvents.slice(0, 4).map((e: CareEvent) => ({
      kind: e.kind,
      date: formatChipDate(e.occurredAt),
    }));
    p.extraChipCount = Math.max(0, patientEvents.length - 4);
  }

  if (typeof limit === 'number') {
    const start = offset || 0;
    return results.slice(start, start + limit);
  }

  return results;
}

/**
 * Retrieve a single patient by ID or MRN.
 */
export async function getPatientById(id: string): Promise<Patient | null> {
  const sql = getDb();
  if (sql) {
    try {
      const rows = (await sql`
        SELECT * FROM patients WHERE (id = ${id} OR mrn = ${id}) AND deleted_at IS NULL LIMIT 1;
      `) as any[];
      if (rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          orgId: r.org_id,
          mrn: r.mrn,
          name: r.name,
          sex: r.sex,
          age: r.age,
          dateOfBirth: r.date_of_birth,
          phone: r.phone,
          status: r.status,
          userId: r.user_id,
          primaryConcern: r.primary_concern,
          socialHistory: r.social_history,
          carePlan: r.care_plan,
          lastVisitDate: toISO(r.last_visit_date),
          createdAt: toISO(r.created_at),
          updatedAt: toISO(r.updated_at),
        };
      }
    } catch (err) {
      console.warn('Neon query failed, using store fallback:', err);
    }
  }

  const store = readStore();
  return (store.patients || []).find((p: Patient) => p.id === id || p.mrn === id) || null;
}

/**
 * getTimeline(patientId, from, to, kinds[]): Projection over care_events.
 * Defined in PACK.md §7.2 & §11 (S1).
 */
export async function getTimeline(
  patientId: string,
  from?: string,
  to?: string,
  kinds?: RecordKind[]
): Promise<TimelineData> {
  const store = readStore();
  const allEvents = (store.careEvents || []).filter((ce: CareEvent) => ce.patientId === patientId);

  // Filter kinds
  const filteredEvents = kinds && kinds.length > 0
    ? allEvents.filter((e: CareEvent) => kinds.includes(e.kind))
    : allEvents;

  // Filter dates if specified
  const fromTime = from ? new Date(from).getTime() : 0;
  const toTime = to ? new Date(to).getTime() : Infinity;

  const inWindow = filteredEvents.filter((e: CareEvent) => {
    const t = new Date(e.occurredAt).getTime();
    return t >= fromTime && t <= toTime;
  });

  // Extract milestones (visits)
  const milestones: Milestone[] = inWindow
    .filter((e: CareEvent) => e.kind === 'visit')
    .map((e: CareEvent) => ({
      id: e.id,
      at: e.occurredAt,
      title: e.label,
    }));

  const events: TimelineEvent[] = inWindow.map((e: CareEvent) => ({
    id: e.id,
    kind: e.kind,
    at: e.occurredAt,
    visitId: e.visitId,
    label: e.label,
    summary: e.summary,
  }));

  return { milestones, events };
}

/**
 * getSeries(patientId, metric, from, to): Numerical time-series for sparklines and metric cards.
 * Defined in PACK.md §7.2 & §11 (S1).
 */
export async function getSeries(
  patientId: string,
  metric: string,
  from?: string,
  to?: string
): Promise<SeriesPoint[]> {
  const store = readStore();
  const vitals = (store.vitals || []).filter(
    (v: VitalObservation) => v.patientId === patientId && v.metric === metric
  );

  const fromTime = from ? new Date(from).getTime() : 0;
  const toTime = to ? new Date(to).getTime() : Infinity;

  const inRange = vitals.filter((v: VitalObservation) => {
    const t = new Date(v.measuredAt).getTime();
    return t >= fromTime && t <= toTime;
  });

  return inRange
    .sort((a: VitalObservation, b: VitalObservation) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())
    .map((v: VitalObservation) => {
      if (metric === 'pressure') {
        const [sys, dia] = v.value.split('/').map((s: string) => parseFloat(s) || 0);
        return {
          at: v.measuredAt,
          value: sys,
          systolic: sys,
          diastolic: dia,
        };
      }
      return {
        at: v.measuredAt,
        value: parseFloat(v.value) || 0,
      };
    });
}

/**
 * Register a new patient.
 */
export async function createPatient(input: CreatePatientInput): Promise<Patient> {
  const store = readStore();
  const nextSeq = (store.patients?.length || 0) + 1;
  const seqPadded = String(nextSeq).padStart(4, '0');
  const nowIso = new Date().toISOString();
  const todayFormatted = '14 Oct 2026';

  const newPatient: Patient = {
    id: `p-${Date.now()}`,
    orgId: 'org-nile',
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

  const sql = getDb();
  if (sql) {
    try {
      await (sql as any).query(
        `INSERT INTO patients (id, org_id, mrn, name, sex, age, date_of_birth, phone, status, primary_concern, social_history, care_plan, last_visit_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          newPatient.id,
          newPatient.orgId,
          newPatient.mrn,
          newPatient.name,
          newPatient.sex,
          newPatient.age,
          newPatient.dateOfBirth,
          newPatient.phone,
          newPatient.status,
          newPatient.primaryConcern,
          newPatient.socialHistory,
          newPatient.carePlan,
          newPatient.lastVisitDate,
          newPatient.createdAt,
          newPatient.updatedAt,
        ]
      );
    } catch (err) {
      console.warn('Neon insert patient failed, fallback to store:', err);
    }
  }

  store.patients = [newPatient, ...(store.patients || [])];

  // Intake care event
  const newCareEvent: CareEvent = {
    id: `ce-${Date.now()}`,
    orgId: 'org-nile',
    patientId: newPatient.id,
    kind: 'visit',
    label: 'Initial Patient Intake',
    summary: `${input.primaryConcern}. Status: ${input.status}.`,
    occurredAt: todayFormatted,
    source: 'staff',
    createdBy: 'Staff Receptionist',
  };

  store.careEvents = [newCareEvent, ...(store.careEvents || [])];
  writeStore(store);

  return newPatient;
}

/**
 * Soft-delete a patient and remove them from the active clinic directory.
 */
export async function deletePatient(id: string): Promise<boolean> {
  const sql = getDb();
  if (sql) {
    try {
      await (sql as any).query(`UPDATE patients SET deleted_at = NOW() WHERE id = $1`, [id]);
    } catch (err) {
      console.warn('Neon delete patient failed, fallback to store:', err);
    }
  }

  const store = readStore();
  if (store.patients) {
    store.patients = store.patients.filter((p: Patient) => p.id !== id);
    writeStore(store);
  }

  return true;
}

export async function getPatientCareEvents(patientId: string): Promise<CareEvent[]> {
  const store = readStore();
  return (store.careEvents || []).filter((ce: CareEvent) => ce.patientId === patientId);
}

export async function getPatientVitals(patientId: string): Promise<VitalObservation[]> {
  const store = readStore();
  return (store.vitals || []).filter((v: VitalObservation) => v.patientId === patientId);
}

export async function createVital(input: {
  patientId: string;
  visitId?: string | null;
  metric: 'pulse' | 'pressure' | 'oxygen' | 'temp' | 'glucose' | 'weight' | 'mood' | string;
  value: string;
  unit: string;
  measuredAt?: string;
  source?: ProvenanceSource;
  createdBy?: string;
}): Promise<VitalObservation> {
  const store = readStore();
  const patient = (store.patients || []).find((p: Patient) => p.id === input.patientId);
  const orgId = patient?.orgId || 'org-nile';
  const now = input.measuredAt || new Date().toISOString();
  const vitalId = `vit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const allowedMetrics: Array<'pulse' | 'pressure' | 'oxygen' | 'temp' | 'glucose' | 'weight' | 'mood'> = [
    'pulse', 'pressure', 'oxygen', 'temp', 'glucose', 'weight', 'mood'
  ];
  const metric = allowedMetrics.includes(input.metric as any)
    ? (input.metric as 'pulse' | 'pressure' | 'oxygen' | 'temp' | 'glucose' | 'weight' | 'mood')
    : 'pulse';

  const newVital: VitalObservation = {
    id: vitalId,
    orgId,
    patientId: input.patientId,
    visitId: input.visitId || null,
    metric,
    value: input.value,
    unit: input.unit || '',
    measuredAt: now,
    source: input.source || 'doctor',
    createdBy: input.createdBy || 'Clinician',
    verifiedBy: null,
  };

  const sql = getDb();
  if (sql) {
    try {
      await (sql as any).query(
        `INSERT INTO vital_observations (id, org_id, patient_id, visit_id, metric, value, unit, measured_at, source, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [newVital.id, newVital.orgId, newVital.patientId, newVital.visitId, newVital.metric, newVital.value, newVital.unit, newVital.measuredAt, newVital.source, newVital.createdBy]
      );
    } catch (err) {
      console.warn('Neon insert vital failed, fallback to store:', err);
    }
  }

  store.vitals = [newVital, ...(store.vitals || [])];

  const careEvent: CareEvent = {
    id: `ce-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    orgId,
    patientId: input.patientId,
    visitId: input.visitId || null,
    kind: 'vitals',
    label: `${metric.charAt(0).toUpperCase() + metric.slice(1)}: ${input.value} ${input.unit || ''}`.trim(),
    summary: `${metric} observation: ${input.value} ${input.unit || ''}`.trim(),
    occurredAt: now,
    sourceTable: 'vital_observations',
    sourceId: newVital.id,
    source: input.source || 'doctor',
    createdBy: input.createdBy || 'Clinician',
  };
  store.careEvents = [careEvent, ...(store.careEvents || [])];

  writeStore(store);
  return newVital;
}

export async function getClinicAppointments(): Promise<Appointment[]> {
  const sql = getDb();
  if (sql) {
    try {
      const rows = (await (sql as any).query(
        `SELECT * FROM appointments ORDER BY scheduled_time ASC`
      )) as any[];
      if (rows && rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          orgId: r.org_id,
          patientId: r.patient_id,
          patientName: r.patient_name,
          scheduledTime: toISO(r.scheduled_time),
          visitType: r.visit_type,
          status: r.status,
          actualStart: toISOOrNull(r.actual_start),
          actualEnd: toISOOrNull(r.actual_end),
        }));
      }
    } catch (err) {
      console.warn('Neon query appointments failed, fallback to store:', err);
    }
  }
  const store = readStore();
  return store.appointments || [];
}

export async function getClinicStats(): Promise<ClinicStats> {
  const sql = getDb();
  if (sql) {
    try {
      const pCountRes = await (sql as any).query(`SELECT count(*)::int as count FROM patients WHERE deleted_at IS NULL`);
      const aCountRes = await (sql as any).query(`SELECT count(*)::int as count FROM appointments WHERE status = 'completed'`);
      const totalPatients = pCountRes[0]?.count ?? 0;
      const completedToday = aCountRes[0]?.count ?? 0;
      return {
        totalPatients,
        completedToday,
        waitTimes: '12 min',
        newAdmits: 0,
      };
    } catch (err) {
      console.warn('Neon query stats failed, fallback to store:', err);
    }
  }
  const store = readStore();
  const pts = store.patients || [];
  const apts = store.appointments || [];

  const completed = apts.filter((a: Appointment) => a.status === 'completed').length;

  return {
    totalPatients: pts.length,
    completedToday: completed,
    waitTimes: '12 min',
    newAdmits: 0,
  };
}

export async function sendPatientInvite(patientId: string): Promise<{ success: boolean; inviteToken: string }> {
  const token = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const sql = getDb();
  if (sql) {
    try {
      const pRows = (await (sql as any).query(`SELECT * FROM patients WHERE id = $1`, [patientId])) as any[];
      if (pRows.length > 0) {
        const p = pRows[0];
        await (sql as any).query(
          `INSERT INTO invites (id, org_id, email, role, token, expires_at)
           VALUES ($1, $2, $3, 'patient', $4, NOW() + INTERVAL '7 days')`,
          [`inv-${Date.now()}`, p.org_id, `${p.mrn.toLowerCase()}@patient.clinic`, token]
        );
        return { success: true, inviteToken: token };
      }
    } catch (err) {
      console.warn('Neon send invite failed, fallback to store:', err);
    }
  }
  return { success: true, inviteToken: token };
}

export async function getPatientAllergies(patientId: string): Promise<Allergy[]> {
  const sql = getDb();
  if (sql) {
    try {
      const rows = (await (sql as any).query(
        `SELECT * FROM allergies WHERE patient_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
        [patientId]
      )) as any[];
      if (rows && rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          orgId: r.org_id,
          patientId: r.patient_id,
          substance: r.substance,
          reaction: r.reaction,
          severity: r.severity,
          status: r.status,
          source: r.source,
          createdBy: r.created_by,
          createdAt: toISO(r.created_at),
        }));
      }
    } catch (err) {
      console.warn('Neon query allergies failed, fallback to store:', err);
    }
  }
  const store = readStore();
  return (store.allergies || []).filter((a: Allergy) => a.patientId === patientId);
}

export async function getPatientLabs(patientId: string): Promise<LabResult[]> {
  const sql = getDb();
  if (sql) {
    try {
      const rows = (await (sql as any).query(
        `SELECT * FROM lab_results WHERE patient_id = $1 AND deleted_at IS NULL ORDER BY occurred_at DESC`,
        [patientId]
      )) as any[];
      if (rows && rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          orgId: r.org_id,
          patientId: r.patient_id,
          testName: r.test_name,
          value: r.value,
          unit: r.unit,
          referenceLow: r.reference_low,
          referenceHigh: r.reference_high,
          status: r.status,
          occurredAt: toISO(r.occurred_at),
          reviewedBy: r.reviewed_by,
          reviewedAt: toISOOrUndefined(r.reviewed_at),
          source: r.source,
          createdBy: r.created_by,
        }));
      }
    } catch (err) {
      console.warn('Neon query labs failed, fallback to store:', err);
    }
  }
  const store = readStore();
  return (store.labs || [])
    .filter((l: LabResult) => l.patientId === patientId)
    .sort((a: LabResult, b: LabResult) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

export async function createCareEvent(eventData: {
  patientId: string;
  kind: RecordKind;
  label: string;
  summary: string;
  occurredAt?: string;
  source?: ProvenanceSource;
  createdBy?: string;
}): Promise<CareEvent> {
  const store = readStore();
  const patient = (store.patients || []).find((p: Patient) => p.id === eventData.patientId);
  const now = eventData.occurredAt || new Date().toISOString();

  const newEvent: CareEvent = {
    id: `ce-${Date.now()}`,
    orgId: patient?.orgId || 'org-nile',
    patientId: eventData.patientId,
    kind: eventData.kind,
    label: eventData.label,
    summary: eventData.summary || 'Recorded by clinician',
    occurredAt: now,
    source: eventData.source || 'doctor',
    createdBy: eventData.createdBy || 'Dr. Tarek',
  };

  store.careEvents = [newEvent, ...(store.careEvents || [])];

  // If vitals, also record in vitals store
  if (eventData.kind === 'vitals') {
    const val = eventData.summary.includes('/') ? eventData.summary.split(' ')[0] : '120/80';
    store.vitals = [
      {
        id: `vit-${Date.now()}`,
        orgId: newEvent.orgId,
        patientId: eventData.patientId,
        metric: 'pressure',
        value: val,
        unit: 'mmHg',
        measuredAt: now,
        source: eventData.source || 'doctor',
      },
      ...(store.vitals || []),
    ];
  }

  writeStore(store);
  return newEvent;
}

export async function getPatientMedications(patientId: string): Promise<Medication[]> {
  const sql = getDb();
  if (sql) {
    try {
      const rows = (await (sql as any).query(
        `SELECT * FROM medications WHERE patient_id = $1 AND deleted_at IS NULL ORDER BY start_date DESC`,
        [patientId]
      )) as any[];
      if (rows && rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          orgId: r.org_id,
          patientId: r.patient_id,
          name: r.name,
          strength: r.strength,
          dosesPerDay: r.doses_per_day,
          route: r.route,
          instructions: r.instructions,
          status: r.status,
          startDate: toISO(r.start_date),
          endDate: toISOOrNull(r.end_date),
          source: r.source,
          createdBy: r.created_by,
          createdAt: toISO(r.created_at),
          verifiedBy: r.verified_by,
          verifiedAt: toISOOrNull(r.verified_at),
        }));
      }
    } catch (err) {
      console.warn('Neon query medications failed, fallback to store:', err);
    }
  }
  const store = readStore();
  return (store.medications || []).filter((m: Medication) => m.patientId === patientId);
}

export async function getPatientMedicationEvents(patientId: string): Promise<MedicationEvent[]> {
  const sql = getDb();
  if (sql) {
    try {
      const rows = (await (sql as any).query(
        `SELECT * FROM medication_events WHERE patient_id = $1 AND deleted_at IS NULL ORDER BY occurred_at DESC`,
        [patientId]
      )) as any[];
      if (rows && rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          orgId: r.org_id,
          patientId: r.patient_id,
          medicationId: r.medication_id,
          eventType: r.event_type,
          detail: r.detail,
          occurredAt: toISO(r.occurred_at),
          source: r.source,
          createdBy: r.created_by,
          createdAt: toISO(r.created_at),
        }));
      }
    } catch (err) {
      console.warn('Neon query medication_events failed, fallback to store:', err);
    }
  }
  const store = readStore();
  return (store.medicationEvents || []).filter((e: MedicationEvent) => e.patientId === patientId);
}

export async function createMedication(input: {
  patientId: string;
  name: string;
  strength: string;
  dosesPerDay?: number;
  route?: string;
  instructions?: string;
  startDate?: string;
  source?: ProvenanceSource;
  createdBy?: string;
}): Promise<Medication> {
  const store = readStore();
  const patient = (store.patients || []).find((p: Patient) => p.id === input.patientId);
  const now = input.startDate || new Date().toISOString();
  const medId = `med-${Date.now()}`;
  const orgId = patient?.orgId || 'org-nile';

  const newMed: Medication = {
    id: medId,
    orgId,
    patientId: input.patientId,
    name: input.name,
    strength: input.strength,
    dosesPerDay: input.dosesPerDay || 1,
    route: input.route || 'oral',
    instructions: input.instructions || '',
    status: 'active',
    startDate: now,
    source: input.source || 'doctor',
    createdBy: input.createdBy || 'Dr. Tarek',
    createdAt: now,
  };

  const sql = getDb();
  if (sql) {
    try {
      await (sql as any).query(
        `INSERT INTO medications (id, org_id, patient_id, name, strength, doses_per_day, route, instructions, status, start_date, source, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [newMed.id, newMed.orgId, newMed.patientId, newMed.name, newMed.strength, newMed.dosesPerDay, newMed.route, newMed.instructions, newMed.status, newMed.startDate, newMed.source, newMed.createdBy]
      );
    } catch (err) {
      console.warn('Neon insert medication failed, fallback to store:', err);
    }
  }

  store.medications = [newMed, ...(store.medications || [])];

  // Record medication start event
  const medEvent: MedicationEvent = {
    id: `me-${Date.now()}`,
    orgId,
    patientId: input.patientId,
    medicationId: medId,
    eventType: 'start',
    detail: `${input.name} ${input.strength} initiated (${input.dosesPerDay || 1}x daily)`,
    occurredAt: now,
    source: input.source || 'doctor',
    createdBy: input.createdBy || 'Dr. Tarek',
  };
  store.medicationEvents = [medEvent, ...(store.medicationEvents || [])];

  // Project onto timeline care_events
  const careEvent: CareEvent = {
    id: `ce-${Date.now()}`,
    orgId,
    patientId: input.patientId,
    kind: 'medication',
    label: `Start: ${input.name} ${input.strength}`,
    summary: `${input.name} ${input.strength} (${input.dosesPerDay || 1}x daily, ${input.route || 'oral'})`,
    occurredAt: now,
    sourceTable: 'medication_events',
    sourceId: medEvent.id,
    source: input.source || 'doctor',
    createdBy: input.createdBy || 'Dr. Tarek',
  };
  store.careEvents = [careEvent, ...(store.careEvents || [])];

  writeStore(store);
  return newMed;
}

export async function updateMedicationStatus(
  medicationId: string,
  newStatus: MedicationStatus,
  reason?: string
): Promise<Medication | null> {
  const store = readStore();
  const index = (store.medications || []).findIndex((m: Medication) => m.id === medicationId);
  if (index === -1) return null;

  const current = store.medications[index];
  const now = new Date().toISOString();
  const updated: Medication = {
    ...current,
    status: newStatus,
    endDate: newStatus === 'stopped' || newStatus === 'completed' ? now : current.endDate,
  };
  store.medications[index] = updated;

  // Add medication event
  const eventType: 'start' | 'change' | 'pause' | 'stop' =
    newStatus === 'paused' ? 'pause' : newStatus === 'stopped' ? 'stop' : 'change';

  const medEvent: MedicationEvent = {
    id: `me-${Date.now()}`,
    orgId: current.orgId,
    patientId: current.patientId,
    medicationId: current.id,
    eventType,
    detail: reason || `Medication status changed to ${newStatus}`,
    occurredAt: now,
    source: 'doctor',
    createdBy: 'Dr. Tarek',
  };
  store.medicationEvents = [medEvent, ...(store.medicationEvents || [])];

  // Project onto timeline care_events
  const careEvent: CareEvent = {
    id: `ce-${Date.now()}`,
    orgId: current.orgId,
    patientId: current.patientId,
    kind: 'medication',
    label: `${newStatus === 'paused' ? 'Pause' : newStatus === 'stopped' ? 'Stop' : 'Update'}: ${current.name}`,
    summary: reason || `Medication status changed to ${newStatus}`,
    occurredAt: now,
    sourceTable: 'medication_events',
    sourceId: medEvent.id,
    source: 'doctor',
    createdBy: 'Dr. Tarek',
  };
  store.careEvents = [careEvent, ...(store.careEvents || [])];

  writeStore(store);
  return updated;
}

export async function updateMedicationDose(
  medicationId: string,
  newStrength: string,
  newDosesPerDay: number,
  reason?: string
): Promise<Medication | null> {
  const store = readStore();
  const index = (store.medications || []).findIndex((m: Medication) => m.id === medicationId);
  if (index === -1) return null;

  const current = store.medications[index];
  const now = new Date().toISOString();
  const oldStrength = current.strength;
  const updated: Medication = {
    ...current,
    strength: newStrength,
    dosesPerDay: newDosesPerDay,
  };
  store.medications[index] = updated;

  const detail = reason || `Titrated from ${oldStrength} to ${newStrength} (${newDosesPerDay}x daily)`;

  const medEvent: MedicationEvent = {
    id: `me-${Date.now()}`,
    orgId: current.orgId,
    patientId: current.patientId,
    medicationId: current.id,
    eventType: 'change',
    detail,
    occurredAt: now,
    source: 'doctor',
    createdBy: 'Dr. Tarek',
  };
  store.medicationEvents = [medEvent, ...(store.medicationEvents || [])];

  const careEvent: CareEvent = {
    id: `ce-${Date.now()}`,
    orgId: current.orgId,
    patientId: current.patientId,
    kind: 'medication',
    label: `Change: ${current.name} ${newStrength}`,
    summary: detail,
    occurredAt: now,
    sourceTable: 'medication_events',
    sourceId: medEvent.id,
    source: 'doctor',
    createdBy: 'Dr. Tarek',
  };
  store.careEvents = [careEvent, ...(store.careEvents || [])];

  writeStore(store);
  return updated;
}

export async function getPatientVisits(patientId: string): Promise<Visit[]> {
  const sql = getDb();
  if (sql) {
    try {
      const rows = (await (sql as any).query(
        `SELECT * FROM visits WHERE patient_id = $1 AND deleted_at IS NULL ORDER BY occurred_at DESC`,
        [patientId]
      )) as any[];
      if (rows && rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          orgId: r.org_id,
          patientId: r.patient_id,
          title: r.title,
          visitType: r.visit_type,
          reason: r.reason,
          notes: r.notes,
          status: r.status,
          stage: r.stage || 'after',
          occurredAt: toISO(r.occurred_at),
          source: r.source,
          createdBy: r.created_by,
          createdAt: toISO(r.created_at),
          updatedBy: r.updated_by,
          updatedAt: toISO(r.updated_at),
          verifiedBy: r.verified_by,
          verifiedAt: toISOOrNull(r.verified_at),
          aiGenerated: r.ai_generated,
        }));
      }
    } catch (err) {
      console.warn('Neon query visits failed, fallback to store:', err);
    }
  }
  const store = readStore();
  const visits = (store.visits || []).filter((v: Visit) => v.patientId === patientId);
  return visits.sort(
    (a: Visit, b: Visit) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
}

export async function getVisitById(visitId: string): Promise<Visit | null> {
  const sql = getDb();
  if (sql) {
    try {
      const rows = (await (sql as any).query(
        `SELECT * FROM visits WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
        [visitId]
      )) as any[];
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          orgId: r.org_id,
          patientId: r.patient_id,
          title: r.title,
          visitType: r.visit_type,
          reason: r.reason,
          notes: r.notes,
          status: r.status,
          stage: r.stage || 'after',
          occurredAt: toISO(r.occurred_at),
          source: r.source,
          createdBy: r.created_by,
          createdAt: toISO(r.created_at),
          updatedBy: r.updated_by,
          updatedAt: toISO(r.updated_at),
          verifiedBy: r.verified_by,
          verifiedAt: toISOOrNull(r.verified_at),
          aiGenerated: r.ai_generated,
        };
      }
    } catch (err) {
      console.warn('Neon query visitById failed, fallback to store:', err);
    }
  }
  const store = readStore();
  return (store.visits || []).find((v: Visit) => v.id === visitId) || null;
}

export async function getVisitVitals(visitId: string): Promise<VitalObservation[]> {
  const sql = getDb();
  if (sql) {
    try {
      const rows = (await (sql as any).query(
        `SELECT * FROM vital_observations WHERE visit_id = $1 AND deleted_at IS NULL ORDER BY measured_at DESC`,
        [visitId]
      )) as any[];
      if (rows && rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          orgId: r.org_id,
          patientId: r.patient_id,
          visitId: r.visit_id,
          metric: r.metric,
          value: r.value,
          unit: r.unit,
          measuredAt: toISO(r.measured_at),
          source: r.source,
          createdBy: r.created_by,
          verifiedBy: r.verified_by,
        }));
      }
    } catch (err) {
      console.warn('Neon query visit vitals failed, fallback to store:', err);
    }
  }
  const store = readStore();
  return (store.vitals || []).filter((v: VitalObservation) => v.visitId === visitId);
}

export async function createVisit(input: {
  patientId: string;
  title: string;
  visitType: string;
  reason?: string;
  notes?: string;
  plan?: string;
  occurredAt?: string;
  stage?: VisitStage;
  status?: VisitStatus;
}): Promise<Visit> {
  const store = readStore();
  const patient = (store.patients || []).find((p: Patient) => p.id === input.patientId);
  const now = input.occurredAt || new Date().toISOString();
  const visitId = `vst-${Date.now()}`;
  const orgId = patient?.orgId || 'org-nile';

  const newVisit: Visit = {
    id: visitId,
    orgId,
    patientId: input.patientId,
    title: input.title,
    visitType: input.visitType || 'Follow-up',
    reason: input.reason || 'Clinical consultation and review',
    notes: input.notes || 'Encounter conducted by attending clinician.',
    plan: input.plan || '',
    status: input.status || 'completed',
    stage: input.stage || 'after',
    occurredAt: now,
    source: 'doctor',
    createdBy: 'Dr. Tarek',
    createdAt: now,
    verifiedBy: 'Dr. Tarek',
    verifiedAt: now,
  };

  store.visits = [newVisit, ...(store.visits || [])];

  // Update patient's lastVisitDate
  if (patient) {
    patient.lastVisitDate = new Date(now).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  // Project onto timeline care_events
  const careEvent: CareEvent = {
    id: `ce-${Date.now()}`,
    orgId,
    patientId: input.patientId,
    kind: 'visit',
    label: input.title,
    summary: input.reason || 'Clinical encounter with Dr. Tarek',
    occurredAt: now,
    sourceTable: 'visits',
    sourceId: visitId,
    source: 'doctor',
    createdBy: 'Dr. Tarek',
  };
  store.careEvents = [careEvent, ...(store.careEvents || [])];

  writeStore(store);
  return newVisit;
}

export async function updateVisitStage(
  visitId: string,
  stage: VisitStage,
  notes?: string
): Promise<Visit | null> {
  const store = readStore();
  const index = (store.visits || []).findIndex((v: Visit) => v.id === visitId);
  if (index === -1) return null;

  const current = store.visits[index];
  const updatedStatus: VisitStatus =
    stage === 'before' ? 'scheduled' : stage === 'during' ? 'in-progress' : 'completed';

  const updated: Visit = {
    ...current,
    stage,
    status: updatedStatus,
    notes: notes || current.notes,
    updatedAt: new Date().toISOString(),
  };

  store.visits[index] = updated;
  writeStore(store);
  return updated;
}

export async function updateVisitNotes(
  visitId: string,
  data: {
    notes?: string;
    plan?: string;
    assessment?: string;
    followUpDate?: string;
  }
): Promise<Visit | null> {
  const store = readStore();
  const index = (store.visits || []).findIndex((v: Visit) => v.id === visitId);
  if (index === -1) return null;

  const current = store.visits[index];
  const updated: Visit = {
    ...current,
    notes: data.notes !== undefined ? data.notes : current.notes,
    plan: data.plan !== undefined ? data.plan : current.plan,
    assessment: data.assessment !== undefined ? data.assessment : current.assessment,
    followUpDate: data.followUpDate !== undefined ? data.followUpDate : current.followUpDate,
    updatedAt: new Date().toISOString(),
  };

  store.visits[index] = updated;
  writeStore(store);
  return updated;
}

/**
 * ============================================================================
 * SLICE S10: LABS REPOSITORY METHODS (PACK.md §6.5 & §11)
 * ============================================================================
 */

export interface LabTrendPoint {
  id: string;
  at: string;
  value: number;
  unit: string;
  referenceLow?: number;
  referenceHigh?: number;
  status: 'normal' | 'borderline' | 'abnormal' | 'critical';
  reviewedBy?: string;
  reviewedAt?: string;
}

export async function getLabTrends(
  patientId: string,
  testName: string
): Promise<LabTrendPoint[]> {
  const allLabs = await getPatientLabs(patientId);
  const matched = allLabs.filter(
    (l) => l.testName.toLowerCase().trim() === testName.toLowerCase().trim()
  );

  return matched
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
    .map((l) => ({
      id: l.id,
      at: l.occurredAt,
      value: parseFloat(l.value) || 0,
      unit: l.unit,
      referenceLow: l.referenceLow,
      referenceHigh: l.referenceHigh,
      status: l.status,
      reviewedBy: l.reviewedBy,
      reviewedAt: l.reviewedAt,
    }));
}

export async function markLabReviewed(
  labId: string,
  reviewedBy: string = 'Dr. Tarek'
): Promise<LabResult | null> {
  const sql = getDb();
  const now = new Date().toISOString();

  if (sql) {
    try {
      const rows = (await (sql as any).query(
        `UPDATE lab_results
         SET reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $2 AND deleted_at IS NULL
         RETURNING *`,
        [reviewedBy, labId]
      )) as any[];
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          orgId: r.org_id,
          patientId: r.patient_id,
          testName: r.test_name,
          value: r.value,
          unit: r.unit,
          referenceLow: r.reference_low,
          referenceHigh: r.reference_high,
          status: r.status,
          occurredAt: toISO(r.occurred_at),
          reviewedBy: r.reviewed_by,
          reviewedAt: toISOOrUndefined(r.reviewed_at),
          source: r.source,
          createdBy: r.created_by,
        };
      }
    } catch (err) {
      console.warn('Neon markLabReviewed failed, fallback to store:', err);
    }
  }

  const store = readStore();
  const index = (store.labs || []).findIndex((l: LabResult) => l.id === labId);
  if (index === -1) return null;

  const current = store.labs[index];
  const updated: LabResult = {
    ...current,
    reviewedBy,
    reviewedAt: now,
  };
  store.labs[index] = updated;
  writeStore(store);
  return updated;
}

export async function createLabResult(input: {
  patientId: string;
  testName: string;
  value: string;
  unit: string;
  referenceLow?: number;
  referenceHigh?: number;
  status?: 'normal' | 'borderline' | 'abnormal' | 'critical';
  occurredAt?: string;
  source?: ProvenanceSource;
  createdBy?: string;
}): Promise<LabResult> {
  const store = readStore();
  const patient = (store.patients || []).find((p: Patient) => p.id === input.patientId);
  const orgId = patient?.orgId || 'org-nile';
  const now = input.occurredAt || new Date().toISOString();
  const labId = `lab-${Date.now()}`;

  // Automatically derive status if not explicitly given
  let computedStatus: 'normal' | 'borderline' | 'abnormal' | 'critical' = input.status || 'normal';
  if (!input.status && input.referenceLow !== undefined && input.referenceHigh !== undefined) {
    const num = parseFloat(input.value);
    if (!isNaN(num)) {
      if (num < input.referenceLow || num > input.referenceHigh) {
        computedStatus = 'abnormal';
      }
    }
  }

  const newLab: LabResult = {
    id: labId,
    orgId,
    patientId: input.patientId,
    testName: input.testName,
    value: input.value,
    unit: input.unit,
    referenceLow: input.referenceLow,
    referenceHigh: input.referenceHigh,
    status: computedStatus,
    occurredAt: now,
    reviewedBy: 'Dr. Tarek',
    reviewedAt: now,
    source: input.source || 'doctor',
    createdBy: input.createdBy || 'Dr. Tarek',
  };

  const sql = getDb();
  if (sql) {
    try {
      await (sql as any).query(
        `INSERT INTO lab_results (id, org_id, patient_id, test_name, value, unit, reference_low, reference_high, status, occurred_at, reviewed_by, reviewed_at, source, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          newLab.id,
          newLab.orgId,
          newLab.patientId,
          newLab.testName,
          newLab.value,
          newLab.unit,
          newLab.referenceLow || null,
          newLab.referenceHigh || null,
          newLab.status,
          newLab.occurredAt,
          newLab.reviewedBy,
          newLab.reviewedAt,
          newLab.source,
          newLab.createdBy,
        ]
      );
    } catch (err) {
      console.warn('Neon createLabResult insert failed, fallback to store:', err);
    }
  }

  store.labs = [newLab, ...(store.labs || [])];
  writeStore(store);

  // Project to timeline care_events
  await createCareEvent({
    patientId: input.patientId,
    kind: 'lab',
    label: `Lab Result: ${newLab.testName} ${newLab.value} ${newLab.unit}`,
    summary: `Recorded ${newLab.testName} (${newLab.status}) - Ref: ${newLab.referenceLow ?? '-'}-${newLab.referenceHigh ?? '-'} ${newLab.unit}`,
    occurredAt: now,
    source: 'doctor',
    createdBy: newLab.createdBy,
  });

  return newLab;
}

/**
 * Retrieve patient imaging studies.
 */
export async function getPatientImaging(patientId: string): Promise<ImagingStudy[]> {
  const sql = getDb();
  if (sql) {
    try {
      const res = await (sql as any).query(
        `SELECT id, org_id as "orgId", patient_id as "patientId", visit_id as "visitId",
                modality, title, report_text as "reportText", image_path as "imagePath",
                occurred_at as "occurredAt", source, created_by as "createdBy",
                created_at as "createdAt"
         FROM imaging_studies
         WHERE patient_id = $1 AND deleted_at IS NULL
         ORDER BY occurred_at DESC`,
        [patientId]
      );
      if (res && res.rows && res.rows.length > 0) {
        return res.rows.map((r: any) => ({
          ...r,
          occurredAt: toISO(r.occurredAt),
          createdAt: toISO(r.createdAt),
        }));
      }
    } catch (err) {
      console.warn('Neon getPatientImaging failed, fallback to store:', err);
    }
  }

  const store = readStore();
  return (store.imaging || [])
    .filter((img: ImagingStudy) => img.patientId === patientId)
    .sort((a: ImagingStudy, b: ImagingStudy) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

/**
 * Retrieve a single imaging study by ID.
 */
export async function getImagingStudyById(studyId: string): Promise<ImagingStudy | null> {
  const sql = getDb();
  if (sql) {
    try {
      const res = await (sql as any).query(
        `SELECT id, org_id as "orgId", patient_id as "patientId", visit_id as "visitId",
                modality, title, report_text as "reportText", image_path as "imagePath",
                occurred_at as "occurredAt", source, created_by as "createdBy",
                created_at as "createdAt"
         FROM imaging_studies
         WHERE id = $1 AND deleted_at IS NULL`,
        [studyId]
      );
      if (res && res.rows && res.rows[0]) {
        return res.rows[0];
      }
    } catch (err) {
      console.warn('Neon getImagingStudyById failed, fallback to store:', err);
    }
  }

  const store = readStore();
  const found = (store.imaging || []).find((img: ImagingStudy) => img.id === studyId);
  return found || null;
}

/**
 * Create/Upload a new imaging study with provenance and care_events projection.
 */
export async function createImagingStudy(input: {
  patientId: string;
  modality: string;
  title: string;
  reportText?: string;
  imagePath?: string;
  occurredAt?: string;
  source?: ProvenanceSource;
  createdBy?: string;
}): Promise<ImagingStudy> {
  const store = readStore();
  const patient = (store.patients || []).find((p: Patient) => p.id === input.patientId);
  const orgId = patient?.orgId || 'org-nile';
  const now = input.occurredAt || new Date().toISOString();
  const studyId = `img-${Date.now()}`;

  const newStudy: ImagingStudy = {
    id: studyId,
    orgId,
    patientId: input.patientId,
    modality: input.modality,
    title: input.title,
    reportText: input.reportText || null,
    imagePath: input.imagePath || '/imaging/echo-hero-1.png',
    occurredAt: now,
    source: input.source || 'doctor',
    createdBy: input.createdBy || 'Dr. Tarek',
    createdAt: new Date().toISOString(),
  };

  const sql = getDb();
  if (sql) {
    try {
      await (sql as any).query(
        `INSERT INTO imaging_studies (id, org_id, patient_id, modality, title, report_text, image_path, occurred_at, source, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          newStudy.id,
          newStudy.orgId,
          newStudy.patientId,
          newStudy.modality,
          newStudy.title,
          newStudy.reportText,
          newStudy.imagePath,
          newStudy.occurredAt,
          newStudy.source,
          newStudy.createdBy,
        ]
      );
    } catch (err) {
      console.warn('Neon createImagingStudy insert failed, fallback to store:', err);
    }
  }

  store.imaging = [newStudy, ...(store.imaging || [])];
  writeStore(store);

  // Project to timeline care_events
  await createCareEvent({
    patientId: input.patientId,
    kind: 'imaging',
    label: `${newStudy.modality}: ${newStudy.title}`,
    summary: newStudy.reportText || `${newStudy.modality} radiological study recorded`,
    occurredAt: now,
    source: 'doctor',
    createdBy: newStudy.createdBy,
  });

  return newStudy;
}

/**
 * Create a new allergy record for a patient.
 */
export async function createAllergy(input: {
  patientId: string;
  substance: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  status?: string;
  source?: ProvenanceSource;
  createdBy?: string;
}): Promise<Allergy> {
  const store = readStore();
  const patient = (store.patients || []).find((p: Patient) => p.id === input.patientId);
  const orgId = patient?.orgId || 'org-nile';
  const now = new Date().toISOString();
  const allergyId = `alg-${Date.now()}`;

  const newAllergy: Allergy = {
    id: allergyId,
    orgId,
    patientId: input.patientId,
    substance: input.substance,
    reaction: input.reaction,
    severity: input.severity,
    status: input.status || 'active',
    source: input.source || 'doctor',
    createdBy: input.createdBy || 'Dr. Tarek',
    createdAt: now,
  };

  const sql = getDb();
  if (sql) {
    try {
      await (sql as any).query(
        `INSERT INTO allergies (id, org_id, patient_id, substance, reaction, severity, status, source, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          newAllergy.id,
          newAllergy.orgId,
          newAllergy.patientId,
          newAllergy.substance,
          newAllergy.reaction,
          newAllergy.severity,
          newAllergy.status,
          newAllergy.source,
          newAllergy.createdBy,
          newAllergy.createdAt,
        ]
      );
    } catch (err) {
      console.warn('Neon createAllergy insert failed, fallback to store:', err);
    }
  }

  store.allergies = [newAllergy, ...(store.allergies || [])];
  writeStore(store);

  // Project to timeline care_events
  await createCareEvent({
    patientId: input.patientId,
    kind: 'symptom',
    label: `Allergy: ${newAllergy.substance}`,
    summary: `${newAllergy.severity.toUpperCase()} sensitivity — Reaction: ${newAllergy.reaction}`,
    occurredAt: now,
    source: 'doctor',
    createdBy: newAllergy.createdBy,
  });

  return newAllergy;
}

/**
 * Update an existing allergy record.
 */
export async function updateAllergy(input: {
  allergyId: string;
  substance?: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'critical';
  status?: string;
}): Promise<Allergy | null> {
  const store = readStore();
  const index = (store.allergies || []).findIndex((a: Allergy) => a.id === input.allergyId);
  if (index === -1) return null;

  const current = store.allergies[index];
  const updated: Allergy = {
    ...current,
    ...(input.substance !== undefined && { substance: input.substance }),
    ...(input.reaction !== undefined && { reaction: input.reaction }),
    ...(input.severity !== undefined && { severity: input.severity }),
    ...(input.status !== undefined && { status: input.status }),
  };

  const sql = getDb();
  if (sql) {
    try {
      await (sql as any).query(
        `UPDATE allergies
         SET substance = $1, reaction = $2, severity = $3, status = $4
         WHERE id = $5`,
        [updated.substance, updated.reaction, updated.severity, updated.status, updated.id]
      );
    } catch (err) {
      console.warn('Neon updateAllergy failed, fallback to store:', err);
    }
  }

  store.allergies[index] = updated;
  writeStore(store);
  return updated;
}

/**
 * Delete / mark deleted an allergy record.
 */
export async function deleteAllergy(allergyId: string): Promise<boolean> {
  const sql = getDb();
  if (sql) {
    try {
      await (sql as any).query(
        `UPDATE allergies SET deleted_at = NOW() WHERE id = $1`,
        [allergyId]
      );
    } catch (err) {
      console.warn('Neon deleteAllergy failed, fallback to store:', err);
    }
  }

  const store = readStore();
  const index = (store.allergies || []).findIndex((a: Allergy) => a.id === allergyId);
  if (index === -1) return false;

  store.allergies.splice(index, 1);
  writeStore(store);
  return true;
}

/**
 * Retrieve patient genetic and genomic findings.
 */
export async function getPatientGenetics(patientId: string): Promise<GeneticFinding[]> {
  const sql = getDb();
  if (sql) {
    try {
      const res = await (sql as any).query(
        `SELECT id, org_id as "orgId", patient_id as "patientId", finding,
                source_document as "sourceDocument", occurred_at as "occurredAt",
                source, created_by as "createdBy", created_at as "createdAt"
         FROM genetic_findings
         WHERE patient_id = $1 AND deleted_at IS NULL
         ORDER BY occurred_at DESC`,
        [patientId]
      );
      if (res && res.rows && res.rows.length > 0) {
        return res.rows.map((r: any) => ({
          ...r,
          occurredAt: toISO(r.occurredAt),
          createdAt: toISO(r.createdAt),
        }));
      }
    } catch (err) {
      console.warn('Neon getPatientGenetics failed, fallback to store:', err);
    }
  }

  const store = readStore();
  return (store.geneticFindings || [])
    .filter((g: GeneticFinding) => g.patientId === patientId)
    .sort((a: GeneticFinding, b: GeneticFinding) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

/**
 * Create a new genetic finding record.
 */
export async function createGeneticFinding(input: {
  patientId: string;
  finding: string;
  sourceDocument?: string;
  occurredAt?: string;
  interpretation?: string;
  source?: ProvenanceSource;
  createdBy?: string;
}): Promise<GeneticFinding> {
  const store = readStore();
  const patient = (store.patients || []).find((p: Patient) => p.id === input.patientId);
  const orgId = patient?.orgId || 'org-nile';
  const now = input.occurredAt || new Date().toISOString();
  const findingId = `gen-${Date.now()}`;

  const newFinding: GeneticFinding = {
    id: findingId,
    orgId,
    patientId: input.patientId,
    finding: input.finding,
    sourceDocument: input.sourceDocument || null,
    occurredAt: now,
    interpretation: input.interpretation || null,
    source: input.source || 'doctor',
    createdBy: input.createdBy || 'Dr. Tarek',
    createdAt: new Date().toISOString(),
  };

  const sql = getDb();
  if (sql) {
    try {
      await (sql as any).query(
        `INSERT INTO genetic_findings (id, org_id, patient_id, finding, source_document, occurred_at, source, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          newFinding.id,
          newFinding.orgId,
          newFinding.patientId,
          newFinding.finding,
          newFinding.sourceDocument,
          newFinding.occurredAt,
          newFinding.source,
          newFinding.createdBy,
        ]
      );
    } catch (err) {
      console.warn('Neon createGeneticFinding insert failed, fallback to store:', err);
    }
  }

  store.geneticFindings = [newFinding, ...(store.geneticFindings || [])];
  writeStore(store);

  // Project to timeline care_events
  await createCareEvent({
    patientId: input.patientId,
    kind: 'lab',
    label: `Genetics: ${newFinding.finding}`,
    summary: newFinding.sourceDocument || newFinding.interpretation || 'Genomic finding recorded',
    occurredAt: now,
    source: 'doctor',
    createdBy: newFinding.createdBy,
  });

  return newFinding;
}

/**
 * ============================================================================
 * SLICE S13: PATIENT HOME REPOSITORY METHODS (PACK.md §6.7 & §11)
 * ============================================================================
 */

export interface PatientObservationInput {
  patientId: string;
  kind: 'vitals' | 'symptom' | 'note';
  metric?: 'pulse' | 'pressure' | 'oxygen' | 'temp' | 'glucose' | 'weight' | 'mood';
  value?: string;
  unit?: string;
  symptomName?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  notes?: string;
}

/**
 * Record a patient observation (vital, symptom, or note) via the patient observation path (§9.3).
 * Always tagged with source: 'patient' and null verification fields.
 */
export async function recordPatientObservation(input: PatientObservationInput): Promise<CareEvent> {
  const store = readStore();
  const patient = (store.patients || []).find((p: Patient) => p.id === input.patientId);
  const patientName = patient?.name || 'Patient';
  const orgId = patient?.orgId || 'org-nile';
  const now = new Date().toISOString();

  let label = 'Patient-reported observation';
  let summary = input.notes || 'Recorded via Patient Home quick log';

  let sourceTable = 'symptoms';
  let sourceId = `sym-pt-${Date.now()}`;

  if (input.kind === 'vitals' && input.metric) {
    label = `Patient ${input.metric.charAt(0).toUpperCase() + input.metric.slice(1)}: ${input.value} ${input.unit || ''}`.trim();
    summary = `Patient-reported ${input.metric} measurement: ${input.value} ${input.unit || ''}`.trim();

    // Persist to vital_observations with source: 'patient'
    const vitalId = `vit-pt-${Date.now()}`;
    sourceTable = 'vital_observations';
    sourceId = vitalId;

    const newVital: VitalObservation = {
      id: vitalId,
      orgId,
      patientId: input.patientId,
      metric: input.metric,
      value: input.value || '',
      unit: input.unit || '',
      measuredAt: now,
      source: 'patient',
      createdBy: patientName,
      verifiedBy: null,
    };

    const sql = getDb();
    if (sql) {
      try {
        await (sql as any).query(
          `INSERT INTO vital_observations (id, org_id, patient_id, metric, value, unit, measured_at, source, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [newVital.id, newVital.orgId, newVital.patientId, newVital.metric, newVital.value, newVital.unit, newVital.measuredAt, newVital.source, newVital.createdBy]
        );
      } catch (err) {
        console.warn('Neon recordPatientObservation vital insert fallback to store:', err);
      }
    }

    store.vitals = [newVital, ...(store.vitals || [])];
  } else if (input.kind === 'symptom' && input.symptomName) {
    label = `Patient Symptom: ${input.symptomName}`;
    summary = `Reported severity: ${input.severity || 'mild'}${input.notes ? ` · Note: ${input.notes}` : ''}`;
    sourceTable = 'symptoms';
    sourceId = `sym-pt-${Date.now()}`;

    const sql = getDb();
    if (sql) {
      try {
        await (sql as any).query(
          `INSERT INTO symptoms (id, org_id, patient_id, symptom, severity, occurred_at, source, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [sourceId, orgId, input.patientId, input.symptomName, input.severity || 'mild', now, 'patient', patientName]
        );
      } catch (err) {
        console.warn('Neon recordPatientObservation symptom insert fallback to store:', err);
      }
    }
  }

  // Create care_event projection with source: 'patient'
  const eventId = `ce-pt-${Date.now()}`;
  const careEventKind = input.kind === 'note' ? 'symptom' : input.kind;
  const careEvent: CareEvent = {
    id: eventId,
    orgId,
    patientId: input.patientId,
    kind: careEventKind,
    label,
    summary,
    occurredAt: now,
    source: 'patient',
    createdBy: patientName,
    sourceTable,
    sourceId,
    verifiedBy: null,
    verifiedAt: null,
  };

  const sql = getDb();
  if (sql) {
    try {
      await (sql as any).query(
        `INSERT INTO care_events (id, org_id, patient_id, kind, label, summary, occurred_at, source, created_by, source_table, source_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [careEvent.id, careEvent.orgId, careEvent.patientId, careEvent.kind, careEvent.label, careEvent.summary, careEvent.occurredAt, careEvent.source, careEvent.createdBy, careEvent.sourceTable, careEvent.sourceId]
      );
    } catch (err) {
      console.warn('Neon recordPatientObservation careEvent fallback to store:', err);
    }
  }

  store.careEvents = [careEvent, ...(store.careEvents || [])];
  writeStore(store);

  return careEvent;
}

/**
 * Record dose taken by the patient from Next Up card.
 */
export async function recordPatientMedicationTaken(input: {
  patientId: string;
  medicationId: string;
  medicationName: string;
}): Promise<CareEvent> {
  const store = readStore();
  const patient = (store.patients || []).find((p: Patient) => p.id === input.patientId);
  const patientName = patient?.name || 'Patient';
  const orgId = patient?.orgId || 'org-nile';
  const now = new Date().toISOString();

  const medEventId = `me-pt-${Date.now()}`;
  const medEvent: MedicationEvent = {
    id: medEventId,
    orgId,
    patientId: input.patientId,
    medicationId: input.medicationId,
    eventType: 'start',
    detail: 'Dose taken by patient',
    occurredAt: now,
    source: 'patient',
    createdBy: patientName,
  };
  store.medicationEvents = [medEvent, ...(store.medicationEvents || [])];

  const eventId = `ce-pt-med-${Date.now()}`;
  const careEvent: CareEvent = {
    id: eventId,
    orgId,
    patientId: input.patientId,
    kind: 'medication',
    label: `Dose Taken: ${input.medicationName}`,
    summary: `Patient confirmed dose taken at ${new Date(now).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
    occurredAt: now,
    source: 'patient',
    createdBy: patientName,
    sourceTable: 'medication_events',
    sourceId: medEventId,
    verifiedBy: null,
    verifiedAt: null,
  };

  const sql = getDb();
  if (sql) {
    try {
      await (sql as any).query(
        `INSERT INTO care_events (id, org_id, patient_id, kind, label, summary, occurred_at, source, created_by, source_table, source_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [careEvent.id, careEvent.orgId, careEvent.patientId, careEvent.kind, careEvent.label, careEvent.summary, careEvent.occurredAt, careEvent.source, careEvent.createdBy, careEvent.sourceTable, careEvent.sourceId]
      );
    } catch (err) {
      console.warn('Neon recordPatientMedicationTaken careEvent fallback to store:', err);
    }
  }

  store.careEvents = [careEvent, ...(store.careEvents || [])];
  writeStore(store);
  return careEvent;
}

/**
 * Retrieve aggregated Patient Home data for Section 6.7.
 */
export async function getPatientHomeData(patientId: string) {
  const [patient, medications, vitals, careEvents, appointments] = await Promise.all([
    getPatientById(patientId),
    getPatientMedications(patientId),
    getPatientVitals(patientId),
    getPatientCareEvents(patientId),
    getClinicAppointments(),
  ]);

  const activeMeds = (medications || []).filter((m: Medication) => m.status === 'active');
  const nextDueMedication = activeMeds[0] || null;

  // Filter blood pressure readings
  const bpVitals = (vitals || [])
    .filter((v: VitalObservation) => v.metric === 'pressure')
    .sort((a: VitalObservation, b: VitalObservation) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());
  
  const latestBp = bpVitals.length > 0 ? bpVitals[bpVitals.length - 1].value : '118/76';

  // Filter glucose readings
  const glucoseVitals = (vitals || [])
    .filter((v: VitalObservation) => v.metric === 'glucose')
    .sort((a: VitalObservation, b: VitalObservation) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());

  const latestGlucose = glucoseVitals.length > 0 ? glucoseVitals[glucoseVitals.length - 1].value : '83';

  // Patient upcoming appointment
  const nextAppt = (appointments || []).find((a: Appointment) => a.patientId === patientId && a.status === 'scheduled') || {
    id: 'apt-next',
    scheduledTime: 'Tomorrow, 09:00 AM',
    visitType: 'Follow-up Consultation',
    doctorName: 'Dr. Tarek',
  };

  return {
    patient,
    nextDueMedication,
    allActiveMedications: activeMeds,
    latestBp,
    bpReadings: bpVitals.slice(-6).map((v: VitalObservation) => {
      const parts = v.value.split('/');
      return {
        at: v.measuredAt,
        systolic: parseInt(parts[0], 10) || 120,
        diastolic: parseInt(parts[1], 10) || 80,
      };
    }),
    latestGlucose,
    glucoseReadings: glucoseVitals.slice(-6).map((v: VitalObservation) => ({
      at: v.measuredAt,
      value: parseFloat(v.value) || 85,
    })),
    nextAppointment: nextAppt,
    carePlanGoal: patient?.carePlan ? `Goal: ${patient.carePlan}` : 'Goal: Maintain BP < 130/80 mmHg & regular physical activity',
  };
}

/**
 * Confirm and prescribe an OCR-extracted prescription item (Phase L1).
 * Writes to medications table with source: 'ocr', verified by clinician.
 */
export async function confirmAndPrescribeOCRItem(input: {
  patientId: string;
  item: {
    medicationName: string;
    strength: string;
    route?: string;
    dosesPerDay?: number;
    instructions?: string;
    catalogMatch?: string;
  };
  doctorName?: string;
}): Promise<Medication> {
  const doctorName = input.doctorName || 'Dr. Tarek';
  return createMedication({
    patientId: input.patientId,
    name: input.item.medicationName,
    strength: input.item.strength,
    route: input.item.route || 'Oral',
    dosesPerDay: input.item.dosesPerDay || 1,
    instructions: input.item.instructions || `${input.item.medicationName} ${input.item.strength}`,
    source: 'ocr',
    createdBy: doctorName,
  });
}

import {
  sendWhatsAppMessage,
  sendTelegramMessage,
  renderTemplate,
} from './messagingAdapters';

const DEFAULT_SEED_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-seed-1',
    orgId: 'org-nile',
    patientId: 'p-tiffany',
    senderRole: 'doctor',
    senderName: 'Dr. Tarek',
    channel: 'in_app',
    content: 'Hello Tiffany, I reviewed your follow-up notes. How are your symptoms progressing?',
    sentAt: '2026-10-18T10:15:00Z',
    status: 'read',
  },
  {
    id: 'msg-seed-2',
    orgId: 'org-nile',
    patientId: 'p-tiffany',
    senderRole: 'patient',
    senderName: 'Tiffany Woodward',
    channel: 'in_app',
    content: 'Good morning Dr. Tarek! The headaches have significantly decreased since starting the new medication.',
    sentAt: '2026-10-18T10:22:00Z',
    status: 'read',
  },
  {
    id: 'msg-seed-3',
    orgId: 'org-nile',
    patientId: 'p-tiffany',
    senderRole: 'doctor',
    senderName: 'Dr. Tarek',
    channel: 'whatsapp',
    content: 'Excellent news. Please continue the regimen and record your blood pressure twice weekly in the app.',
    sentAt: '2026-10-18T10:30:00Z',
    status: 'delivered',
    metadata: {
      recipientPhone: '+1 (555) 382-9012',
      consentObtained: true,
    },
  },
];

export async function getPatientMessages(patientId: string): Promise<ChatMessage[]> {
  const store = readStore();
  if (!store.chat_messages) {
    store.chat_messages = [...DEFAULT_SEED_MESSAGES];
    writeStore(store);
  }
  return (store.chat_messages || []).filter((m: ChatMessage) => m.patientId === patientId);
}

export async function sendChatMessage(input: {
  patientId: string;
  senderRole: MessageRole;
  senderName: string;
  channel: MessageChannel;
  content: string;
  metadata?: ChatMessage['metadata'];
}): Promise<ChatMessage> {
  const store = readStore();
  if (!store.chat_messages) {
    store.chat_messages = [...DEFAULT_SEED_MESSAGES];
  }

  const patient = (store.patients || []).find((p: Patient) => p.id === input.patientId);
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    orgId: patient?.orgId || 'org-nile',
    patientId: input.patientId,
    senderRole: input.senderRole,
    senderName: input.senderName,
    channel: input.channel,
    content: input.content,
    sentAt: new Date().toISOString(),
    status: input.channel === 'in_app' ? 'delivered' : 'sent',
    metadata: input.metadata,
  };

  store.chat_messages.push(newMsg);
  writeStore(store);
  return newMsg;
}

export async function dispatchExternalNotification(input: {
  patientId: string;
  channel: 'whatsapp' | 'telegram';
  templateName?: string;
  templateParams?: Record<string, string>;
  customContent?: string;
  recipientPhone?: string;
  telegramChatId?: string;
  consentObtained: boolean;
  senderName?: string;
}): Promise<{ success: boolean; message: ChatMessage }> {
  const store = readStore();
  const patient = (store.patients || []).find((p: Patient) => p.id === input.patientId);
  const senderName = input.senderName || 'Dr. Tarek';

  let content = input.customContent || '';
  let externalId = '';

  if (input.channel === 'whatsapp') {
    const phone = input.recipientPhone || patient?.phone || '+20 100 000 0000';
    const result = await sendWhatsAppMessage({
      recipientPhone: phone,
      content: input.customContent,
      templateName: input.templateName,
      templateParams: {
        patientName: patient?.name || 'Patient',
        clinicName: 'Nile Health Clinic',
        ...input.templateParams,
      },
      consentObtained: input.consentObtained,
    });
    externalId = result.messageId;
    if (input.templateName) {
      content = renderTemplate(input.templateName, 'en', {
        patientName: patient?.name || 'Patient',
        clinicName: 'Nile Health Clinic',
        ...input.templateParams,
      });
    }
  } else {
    const chatId = input.telegramChatId || patient?.name?.toLowerCase().replace(/\s+/g, '_') || 'patient_tg';
    const result = await sendTelegramMessage({
      chatId,
      content: input.customContent,
      templateName: input.templateName,
      templateParams: {
        patientName: patient?.name || 'Patient',
        clinicName: 'Nile Health Clinic',
        ...input.templateParams,
      },
      consentObtained: input.consentObtained,
    });
    externalId = result.messageId;
    if (input.templateName) {
      content = renderTemplate(input.templateName, 'en', {
        patientName: patient?.name || 'Patient',
        clinicName: 'Nile Health Clinic',
        ...input.templateParams,
      });
    }
  }

  const savedMessage = await sendChatMessage({
    patientId: input.patientId,
    senderRole: 'doctor',
    senderName,
    channel: input.channel,
    content,
    metadata: {
      externalId,
      recipientPhone: input.recipientPhone || patient?.phone,
      telegramChatId: input.telegramChatId,
      templateName: input.templateName,
      consentObtained: input.consentObtained,
    },
  });

  return { success: true, message: savedMessage };
}



