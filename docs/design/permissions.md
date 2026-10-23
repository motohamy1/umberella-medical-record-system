# Permissions & Authorization Specification (S1)

**Status:** Approved · **Date:** 2026-10-19 · **Governed by:** ADR-0002, PACK.md §9.3

The core principle is server-enforced authorization: the server and database enforce all access and write rules; the UI only hides what the server already forbids. Hiding is never the security boundary.

---

## 1. Permission Matrix

| Capability | Owner / Admin | Doctor | Nurse | Receptionist | Patient |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Clinic Administration** (members, invites, audit logs) | ✓ | ✗ | ✗ | ✗ | ✗ |
| **All Clinical Records (Read)** | ✓ | ✓ | ✓ | ✗ | Own record only |
| **All Clinical Records (Write)** | ✗ | ✓ | Limited (below) | ✗ | Patient observations only |
| **Clinical Verification** (`verified_by`, `verified_at`) | ✗ | ✓ | ✗ | ✗ | ✗ |
| **Prescribe & Titrate** (start, change, pause, stop medication) | ✗ | ✓ | ✗ | ✗ | ✗ |
| **Write Vital Signs** | ✗ | ✓ | ✓ (Clinic vitals) | ✗ | ✓ (Home readings only) |
| **Write Symptoms** | ✗ | ✓ | ✓ | ✗ | ✓ (Patient-reported) |
| **Write Administrative Data** (demographics, phone, contacts) | ✓ | ✓ | ✗ | ✓ | ✗ |
| **Schedule Appointments** | ✓ | ✓ | ✓ | ✓ | ✗ |

### Limited Capabilities Breakdown:
- **Nurse Writes:**
  - May insert `vital_observations` with `source = 'staff'`.
  - May insert `symptoms` with `source = 'staff'`.
  - May record visit stage transitions and intake vitals during consultation.
  - **Forbidden:** Prescribing medications, signing off lab results, or marking diagnoses as verified.
- **Receptionist Writes:**
  - May create new patient demographics (`patients`).
  - May schedule, update, or cancel `appointments`.
  - **Forbidden:** Reading or writing any clinical tables (`visits`, `medications`, `vitals`, `labs`, `imaging`, `allergies`, etc.).
- **Patient Writes:**
  - Restricted strictly to patient-generated observations (home BP, blood glucose, weight, heart rate, symptoms, mood).
  - Can only insert rows where `source = 'patient'`.
  - Prohibited from setting `verified_by`, `verified_at`, diagnoses, orders, or doctor notes.

---

## 2. Write Policy & Provenance Enforcement

There is **no single clinical form shared by both experiences**.

1. **Staff Write Path:**
   - Auth session: Clinician (Doctor or Nurse).
   - Provenance headers: `source = 'doctor' | 'staff'`, `created_by = session.user.id`.
   - Direct verification attributes set only by Doctors.

2. **Patient Observation Path:**
   - Auth session: Patient linked via `patients.user_id = auth.uid()`.
   - Provenance headers: `source = 'patient'`, `created_by = session.user.id`.
   - `verified_by` and `verified_at` remain null.
   - Displayed in clinician UI with a "Patient-reported" badge.

3. **Database Constraints & RLS:**
   - Table-level CHECK constraints: `source in ('staff', 'doctor', 'patient', 'ocr', 'import', 'system')`.
   - Trigger / RLS constraint: `IF role = 'patient' THEN NEW.source MUST BE 'patient' AND NEW.verified_by IS NULL`.

---

## 3. Row Level Security (RLS) Rules

All tables have RLS enabled:
- **Multi-Tenant Isolation:** `org_id = current_setting('app.current_org_id', true)::text`. Cross-organization queries return 0 rows.
- **Role Isolation:**
  - Staff (`owner`, `doctor`, `nurse`, `receptionist`) can only query their active organization.
  - Patients can only query their own patient row (`patients.user_id = current_setting('app.current_user_id', true)::text`) and clinical rows linked to their `patient_id`.
