-- =========================================================================
-- PATIENT CLINICAL WORKSPACE — S1 CORE DATABASE SCHEMA & RLS
-- Governed by: PACK.md §9.2, §9.3, docs/design/permissions.md, ADR-0001
-- =========================================================================

-- Extension for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZATIONS
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. MEMBERSHIPS
CREATE TABLE IF NOT EXISTS memberships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'doctor', 'nurse', 'receptionist', 'patient')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, org_id)
);

-- 3. INVITES
CREATE TABLE IF NOT EXISTS invites (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'doctor', 'nurse', 'receptionist', 'patient')),
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ
);

-- 4. PATIENTS
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    mrn TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other')),
    age INTEGER NOT NULL,
    date_of_birth DATE NOT NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Stable', 'New', 'Follow-up', 'Needs review', 'Critical')),
    user_id TEXT, -- nullable link to patient auth account
    photo_path TEXT,
    primary_concern TEXT,
    social_history TEXT,
    care_plan TEXT,
    last_visit_date TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_patients_org ON patients(org_id);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);

-- 5. VISITS
CREATE TABLE IF NOT EXISTS visits (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    visit_type TEXT NOT NULL,
    reason TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
    stage TEXT DEFAULT 'after' CHECK (stage IN ('before', 'during', 'after')),
    occurred_at TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL DEFAULT 'doctor' CHECK (source IN ('staff', 'doctor', 'patient', 'ocr', 'import', 'system')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id, occurred_at);

-- 6. APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    scheduled_time TEXT NOT NULL,
    visit_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. MEDICATIONS
CREATE TABLE IF NOT EXISTS medications (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    strength TEXT NOT NULL,
    doses_per_day INTEGER NOT NULL DEFAULT 1,
    route TEXT NOT NULL DEFAULT 'oral',
    instructions TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped', 'completed')),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    source TEXT NOT NULL DEFAULT 'doctor' CHECK (source IN ('staff', 'doctor', 'patient', 'ocr', 'import', 'system')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- 8. MEDICATION EVENTS
CREATE TABLE IF NOT EXISTS medication_events (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('start', 'change', 'pause', 'stop')),
    detail TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL DEFAULT 'doctor' CHECK (source IN ('staff', 'doctor', 'patient', 'ocr', 'import', 'system')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 9. VITAL OBSERVATIONS
CREATE TABLE IF NOT EXISTS vital_observations (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id TEXT REFERENCES visits(id) ON DELETE SET NULL,
    metric TEXT NOT NULL CHECK (metric IN ('pulse', 'pressure', 'oxygen', 'temp', 'glucose', 'weight', 'mood')),
    value TEXT NOT NULL,
    unit TEXT NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('staff', 'doctor', 'patient', 'ocr', 'import', 'system')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vitals_patient_metric ON vital_observations(patient_id, metric, measured_at);

-- 10. SYMPTOMS
CREATE TABLE IF NOT EXISTS symptoms (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id TEXT REFERENCES visits(id) ON DELETE SET NULL,
    symptom TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
    occurred_at TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('staff', 'doctor', 'patient', 'ocr', 'import', 'system')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 11. LAB RESULTS
CREATE TABLE IF NOT EXISTS lab_results (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id TEXT REFERENCES visits(id) ON DELETE SET NULL,
    test_name TEXT NOT NULL,
    value TEXT NOT NULL,
    unit TEXT NOT NULL,
    reference_low NUMERIC,
    reference_high NUMERIC,
    status TEXT NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'borderline', 'abnormal', 'critical')),
    occurred_at TIMESTAMPTZ NOT NULL,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    source TEXT NOT NULL DEFAULT 'staff' CHECK (source IN ('staff', 'doctor', 'patient', 'ocr', 'import', 'system')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 12. IMAGING STUDIES
CREATE TABLE IF NOT EXISTS imaging_studies (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id TEXT REFERENCES visits(id) ON DELETE SET NULL,
    modality TEXT NOT NULL,
    title TEXT NOT NULL,
    report_text TEXT,
    image_path TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL DEFAULT 'staff' CHECK (source IN ('staff', 'doctor', 'patient', 'ocr', 'import', 'system')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 13. ECG WAVEFORMS
CREATE TABLE IF NOT EXISTS ecg_waveforms (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id TEXT REFERENCES visits(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    samples JSONB NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL DEFAULT 'staff' CHECK (source IN ('staff', 'doctor', 'patient', 'ocr', 'import', 'system')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 14. ALLERGIES
CREATE TABLE IF NOT EXISTS allergies (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    substance TEXT NOT NULL,
    reaction TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),
    status TEXT NOT NULL DEFAULT 'active',
    source TEXT NOT NULL DEFAULT 'doctor' CHECK (source IN ('staff', 'doctor', 'patient', 'ocr', 'import', 'system')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 15. GENETIC FINDINGS
CREATE TABLE IF NOT EXISTS genetic_findings (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    finding TEXT NOT NULL,
    source_document TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL DEFAULT 'doctor' CHECK (source IN ('staff', 'doctor', 'patient', 'ocr', 'import', 'system')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 16. HOSPITALIZATIONS
CREATE TABLE IF NOT EXISTS hospitalizations (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    facility TEXT NOT NULL,
    admitted_at TIMESTAMPTZ NOT NULL,
    discharged_at TIMESTAMPTZ,
    source TEXT NOT NULL DEFAULT 'staff' CHECK (source IN ('staff', 'doctor', 'patient', 'ocr', 'import', 'system')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 17. PROCEDURES
CREATE TABLE IF NOT EXISTS procedures (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id TEXT REFERENCES visits(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    notes TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL DEFAULT 'doctor' CHECK (source IN ('staff', 'doctor', 'patient', 'ocr', 'import', 'system')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 18. DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id TEXT REFERENCES visits(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    document_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL DEFAULT 'staff' CHECK (source IN ('staff', 'doctor', 'patient', 'ocr', 'import', 'system')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 19. DIAGNOSES
CREATE TABLE IF NOT EXISTS diagnoses (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    body_system TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'inactive')),
    diagnosed_at TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL DEFAULT 'doctor' CHECK (source IN ('staff', 'doctor', 'patient', 'ocr', 'import', 'system')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 20. CARE PLANS & TASKS
CREATE TABLE IF NOT EXISTS care_plans (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    goal TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'inactive')),
    source TEXT NOT NULL DEFAULT 'doctor' CHECK (source IN ('staff', 'doctor', 'patient', 'ocr', 'import', 'system')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS care_tasks (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    care_plan_id TEXT NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    due_time TEXT,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ
);

-- 21. UNIFIED TIMELINE INDEX: CARE_EVENTS
CREATE TABLE IF NOT EXISTS care_events (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('visit', 'medication', 'lab', 'procedure', 'hospitalization', 'imaging', 'vitals', 'symptom')),
    occurred_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    visit_id TEXT REFERENCES visits(id) ON DELETE SET NULL,
    source_table TEXT NOT NULL,
    source_id TEXT NOT NULL,
    label TEXT NOT NULL,
    summary TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('staff', 'doctor', 'patient', 'ocr', 'import', 'system')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_care_events_timeline ON care_events(patient_id, kind, occurred_at);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE imaging_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecg_waveforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE genetic_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_events ENABLE ROW LEVEL SECURITY;

-- Helper policies based on session context (app.current_org_id, app.current_user_id, app.current_role)
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'patients', 'visits', 'appointments', 'medications', 'medication_events',
        'vital_observations', 'symptoms', 'lab_results', 'imaging_studies',
        'ecg_waveforms', 'allergies', 'genetic_findings', 'hospitalizations',
        'procedures', 'documents', 'diagnoses', 'care_plans', 'care_tasks', 'care_events'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I', t);
        EXECUTE format('
            CREATE POLICY tenant_isolation_policy ON %I
            FOR ALL
            USING (
                org_id = NULLIF(current_setting(''app.current_org_id'', true), '''')
            )
            WITH CHECK (
                org_id = NULLIF(current_setting(''app.current_org_id'', true), '''')
            )
        ', t);
    END LOOP;
END $$;
