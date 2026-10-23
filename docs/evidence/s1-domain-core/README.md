# S1 Domain Core + RLS + Demo Dataset — Evidence & Verification Record

**Status:** Completed & Verified  
**Date:** 2026-10-19  
**Slice:** S1 Domain Core  
**Specification:** `docs/PACK.md` §8, §9.2, §9.3, §11 (S1)

---

## 1. Deliverables Completed

1. **Database Schema & RLS Specification:**
   - [src/data/schema.sql](file:///c:/Dev/Dev_World/Web_Projects/umbrella-system/src/data/schema.sql): 22 PostgreSQL tables including `organizations`, `memberships`, `patients`, `visits`, `appointments`, `medications`, `vital_observations`, `symptoms`, `lab_results`, `imaging_studies`, `ecg_waveforms`, `allergies`, `hospitalizations`, `procedures`, `documents`, and the unified `care_events` projection index.
   - Row Level Security (RLS) policies enforcing multi-tenant isolation (`org_id`).
   - Migration script in [scripts/migrate.mjs](file:///c:/Dev/Dev_World/Web_Projects/umbrella-system/scripts/migrate.mjs).

2. **Permissions Matrix:**
   - Completed in [docs/design/permissions.md](file:///c:/Dev/Dev_World/Web_Projects/umbrella-system/docs/design/permissions.md).
   - Enforces Doctor (full clinical write & verification), Nurse (read, vitals, symptoms; no prescribing, no verification), Receptionist (demographics & appointments only), Patient (patient observations only, no verification).

3. **Deterministic Demo Dataset Generator:**
   - Implemented in [scripts/seed-demo.mjs](file:///c:/Dev/Dev_World/Web_Projects/umbrella-system/scripts/seed-demo.mjs).
   - Removed all references to `"Tiffany Woodward"` (fixing Hard Rules 1 & 2).
   - Seeded the 8 canonical synthetic patients from §8.3:
     1. **Mostafa Ibrahim (54, M) — HERO patient:** Full 18-month clinical trajectory (§8.5) with 17 visits, 5 medications, 765 vitals, 25 labs, 2 imaging studies, 10 symptoms, 1 hospitalization, 2 ECG waveforms, 1 allergy, 3 documents, and 37 care events.
     2. **Fatma Hassan (67, F):** CKD Stage 3, abnormal creatinine/eGFR.
     3. **Omar Hany (66, M):** Heart failure, critical potassium (6.3 mmol/L).
     4. **Ahmed Nabil (41, M):** Asthma maintenance.
     5. **Salma Reda (29, F):** Hypothyroidism on levothyroxine.
     6. **Kareem Tarek (31, M):** Normal wellness baseline.
     7. **Nour El-Sayed (24, F):** New patient with 0 events (empty states baseline).
     8. **Layla Mahmoud (58, F):** Longitudinal metabolic care.

4. **Repository & Query Functions:**
   - [src/data/repository.ts](file:///c:/Dev/Dev_World/Web_Projects/umbrella-system/src/data/repository.ts): Implements `getPatients()`, `getPatientById()`, `getTimeline()` (§7.2), `getSeries()` (§7.2), `createPatient()`, and provenance-tracking mutations.

5. **Development Data Inspector (`/dev/data`):**
   - [src/app/dev/data/page.tsx](file:///c:/Dev/Dev_World/Web_Projects/umbrella-system/src/app/dev/data/page.tsx): Live table counts across all core tables, hero patient clinical story metrics, interactive buttons ("+30 Days Vitals", "+Random Visit"), and directory table with links to patient workspaces.

---

## 2. Visual Evidence

The following screenshots were captured by Playwright and saved in this directory:

| Viewport | File | Description |
|---|---|---|
| Desktop (1470×1024) | `docs/evidence/s1-domain-core/dev-data-desktop.png` | Table counts, hero patient metrics, and synthetic patient directory |
| Mobile (390×844) | `docs/evidence/s1-domain-core/dev-data-mobile.png` | Responsive inspection layout on mobile |

---

## 3. Test & Guard Execution Record

```text
> npm run guards
Running Guard (a): Raw color literals check...
Running Guard (c): Blocklist scan...
Running Guard (d): No seed/fixture imports check...
✅ All automated guards passed successfully.

> npx tsc --noEmit
clean (0 errors)

> npm test
 ✓ tests/unit/permissions.test.ts (5 tests)
 ✓ tests/unit/domain.test.ts (6 tests)
 ✓ tests/unit/components.test.tsx (8 tests)

Test Files  3 passed (3)
Tests       19 passed (19)
```
