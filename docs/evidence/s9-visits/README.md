# S9 Visits Tab & Encounter Page — Evidence & Verification Record

**Status:** Completed & Verified  
**Date:** 2026-10-19  
**Slice:** S9 Visits Tab & Encounter Page  
**Specification:** `docs/PACK.md` §11 (S9), `docs/design/pages.md` §6.5 (`/visits`), `docs/design/permissions.md`

---

## 1. Deliverables Completed

### A. Visits Data Layer & Repository Actions
- **Types Definition ([src/data/types.ts](file:///c:/Dev/Dev_World/Web_Projects/umbrella-system/src/data/types.ts)):**
  - Added `VisitStatus` (`'completed' | 'in-progress' | 'scheduled' | 'cancelled'`).
  - Added `VisitStage` (`'before' | 'during' | 'after'`).
  - Added `Visit` interface with full provenance tracking (`patientId`, `visitType`, `reason`, `notes`, `plan`, `stage`, `status`, `occurredAt`, `createdBy`, `verifiedBy`, `verifiedAt`).
- **Repository Methods ([src/data/repository.ts](file:///c:/Dev/Dev_World/Web_Projects/umbrella-system/src/data/repository.ts)):**
  - `getPatientVisits(patientId)`: Retrieves chronological visits sorted descending by `occurredAt`, querying Neon PostgreSQL with store fallback.
  - `getVisitById(visitId)`: Fetches a single visit with full clinical documentation.
  - `getVisitVitals(visitId)`: Fetches all objective vital sign telemetry measured during that specific visit encounter.
  - `createVisit(input)`: Records new or scheduled clinical consultation with automatic projection to `care_events` timeline.
  - `updateVisitStage(visitId, stage, notes)`: Transitions encounter workflow stage (`before` -> `during` -> `after`) and syncs status.
  - `updateVisitNotes(visitId, data)`: Updates SOAP documentation, Assessment & Care Plan, and recommended follow-up date.
- **Server Actions ([src/data/actions.ts](file:///c:/Dev/Dev_World/Web_Projects/umbrella-system/src/data/actions.ts)):**
  - `fetchPatientVisitsAction(patientId)`
  - `fetchVisitByIdAction(visitId)`
  - `createVisitAction(input)`
  - `updateVisitStageAction(visitId, stage, notes)`
  - `updateVisitNotesAction(visitId, data)`

### B. Dedicated Visits Tab Component ([src/components/patient/VisitsTabView.tsx](file:///c:/Dev/Dev_World/Web_Projects/umbrella-system/src/components/patient/VisitsTabView.tsx))
- **Month Grouping & Encounters List:**
  - Automatically groups visits chronologically by Month and Year (e.g., `October 2026`, `September 2026`, `May 2025`).
  - Month heading dividers with encounter count badges (`N visits`).
  - Filter pills: `[ All | Completed | In progress | Scheduled ]` with real-time count badge.
  - Encounter Cards:
    - Date capsule with calendar icon.
    - Title and specialty tag (e.g. `Endocrinology`, `Cardiology`, `Preventive Care`).
    - 3-segment stage pill indicator showing current workflow status (`Before · During · After`).
    - Attending physician (`Dr. Tarek`).
    - Chief complaint preview.
    - Verified clinical encounter badge.
    - `"Show on timeline"` link jumping straight to the encounter on the interactive timeline.
- **Three-Segment Encounter Detail Sheet (`[ Before · During · After ]`):**
  - **Before Stage:**
    - Pre-consultation clinical intake banner and triage instructions.
    - Chief complaint / clinical indication review.
    - Pre-visit clinical checklist (ID & MRN validation, allergy reconciliation, consent on file).
    - Quick advance action: `"Advance to Encounter (During)"`.
  - **During Stage:**
    - Objective vitals telemetry taken at the encounter (Blood Pressure, Heart Rate/Pulse, SpO2, Temperature, Glucose).
    - SOAP clinical notes editor (Subjective, Objective, Assessment, Plan).
    - `"Save Clinical Notes"` action to persist documentation.
    - Quick advance action: `"Complete Encounter (After)"`.
  - **After Stage:**
    - Clinical notes recap.
    - Assessment & Care Plan editor (titration orders, dietary guidance).
    - Follow-up date / recall interval input (e.g., `4 weeks - HbA1c re-evaluation`).
    - Clinician verification seal (`Dr. Tarek · Nile Care Attending Physician · RLS Locked`).
- **Schedule / Record New Visit Modal:**
  - Action button `+ New Visit` opening modal form with title, visit type, reason, notes, and plan.
- **Empty State Baseline:**
  - Zero-state card with stethoscope icon, description, and action button for patients with no visits (e.g., Nour El-Sayed `p-007`).

### C. Patient Workspace Integration ([src/app/(clinic)/clinic/patients/[id]/page.tsx](file:///c:/Dev/Dev_World/Web_Projects/umbrella-system/src/app/(clinic)/clinic/patients/[id]/page.tsx))
- Loaded visits in `Promise.all` alongside patient, care events, vitals, allergies, labs, and medications.
- Wired `handleRecordVisit`, `handleUpdateVisitStage`, `handleUpdateVisitNotes` to `<PaperPatientWorkspace />`.

### D. Copy Decks & Language Support
- Fully localized English and Arabic strings in [src/i18n/en.ts](file:///c:/Dev/Dev_World/Web_Projects/umbrella-system/src/i18n/en.ts) and [src/i18n/ar.ts](file:///c:/Dev/Dev_World/Web_Projects/umbrella-system/src/i18n/ar.ts).

---

## 2. Test Execution & Verification

### Vitest Unit Tests (`tests/unit/visits.test.tsx`)
10 tests verifying month grouping, filter pills, 3-segment switcher, Before/During/After stages, SOAP notes editing, stage advancing, baseline zero-state, and repository queries:
1. `renders month groupings and visit rows with title, type, and date capsule`
2. `filters encounters by status tab pills`
3. `opens the encounter detail modal when an encounter row is clicked`
4. `displays Before stage details: Pre-Consultation intake checklist & Chief Complaint`
5. `displays During stage details: objective vitals telemetry and SOAP notes editor`
6. `invokes onUpdateVisitNotes when clinical notes are edited and saved`
7. `advances stage and invokes onUpdateVisitStage when stage button is clicked`
8. `renders baseline empty state when no visits exist (p-007 baseline)`
9. `getPatientVisits returns seeded visits for hero patient p-001`
10. `getVisitById and getVisitVitals return specific encounter details and telemetry`

```text
 ✓ tests/unit/domain.test.ts (6 tests)
 ✓ tests/unit/timeline.test.tsx (10 tests)
 ✓ tests/unit/components.test.tsx (8 tests)
 ✓ tests/unit/permissions.test.ts (5 tests)
 ✓ tests/unit/medications.test.tsx (10 tests)
 ✓ tests/unit/visits.test.tsx (10 tests)

 Test Files  7 passed (7)
      Tests  56 passed (56)
   Duration  14.58s
```

### Architectural Guard Validation
```text
> npm run guards
Running Guard (a): Raw color literals check...
Running Guard (c): Blocklist scan...
Running Guard (d): No seed/fixture imports check...
✅ All automated guards passed successfully.
```

### TypeScript Clean Compilation
```text
> npx tsc --noEmit
exited with code 0.
```
