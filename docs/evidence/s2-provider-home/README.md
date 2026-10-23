# S2 Provider Home — Evidence & Verification Record

**Status:** Completed & Verified  
**Date:** 2026-10-19  
**Slice:** S2 Provider Home  
**Specification:** `docs/PACK.md` §6.2, §10.4, §11 (S2)

---

## 1. Deliverables Completed

1. **Closed Inventory Adherence (`docs/PACK.md` §4.6 & §12 K3):**
   - Strictly followed the approved closed inventory table.
   - Omitted all disallowed Gemini defects (no left icon rail per D6, no floating toggle bar, no pink panels, no wait times or new admits in stats per D7, no multicolor sparklines, no earnings, no marketing copy).

2. **Skeuomorphic PatientFolderCard (`ref-5` shape & `ref-3` content):**
   - Implemented in [src/components/cards/PatientFolderCard.tsx](file:///c:/Dev/Dev_World/Web_Projects/umbrella-system/src/components/cards/PatientFolderCard.tsx).
   - **Clean 2-Layer Folder Anatomy:**
     1. **Back Panel Flap:** Physical cardstock silhouette with top-left tab carrying the patient's MRN (e.g., `MRN-2026-0814`) with dedicated horizontal space and zero text wrapping (`rtl:scale-x-[-1]` auto-mirrored for Arabic RTL).
     2. **Front Pocket Card in Gray:** Clean, solid surface card (`var(--color-surface)`) overlapping the back panel, holding patient avatar, full untruncated name, demographics, color-coded status badge, kebab menu, hairline divider, last visit date, primary concern, and workspace link.
   - **Status Badges Color Coding:**
     - `Critical`: bold Red (`bg-red-600 text-white`)
     - `Follow-up`: vibrant Yellow (`bg-yellow-400 text-ink`)
     - `Stable`: rich Green (`bg-emerald-600 text-white`)
     - `Needs review`: outlined amber (`border-amber-600 text-amber-800`)
     - `New`: clean neutral surface
   - **Kebab Menu:** Includes *Open workspace* and *Send invite* (rendered only when patient has no linked account: `userId === null`).
   - **Interactive Navigation:** Entire folder card is clickable and navigates to the patient workspace (`/clinic/patients/[id]`).

3. **Header Band (`NotchHeader`):**
   - Plum notch titled `"Patients"` (`dict.screens.patients`).
   - White Search pill with magnifier icon and placeholder from copy deck; filters across name, MRN, phone, and date of birth.
   - Primary action `"Add patient"` with accent fill, ink text, and plus icon; opens the interactive `AddPatientSheet`.
   - Notifications button with unread dot indicator.
   - Doctor Profile Menu: avatar + Dr. Tarek + chevron, opening a styled dropdown containing Communication, Members, Audit, Language (EN/AR), and Sign out.

4. **Left Column (~22%): "Today's schedule":**
   - `ModuleCard` with appointment count badge.
   - Appointment rows on `surface` with time in large text, patient name, visit type, and two small CircleButtons:
     1. Open workspace (arrow icon)
     2. Open visit notes / encounter summary (file icon)
   - Empty state for zero appointments (`dict.states.noAppointments`).

5. **Center Column (~54%): "Patients":**
   - Title row with patient count badge.
   - 4 single-select filter pills: `Recent`, `Today`, `Needs attention`, `Critical`.
   - 3-column desktop grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`), responsive down to 2 columns on tablet and 1-2 on mobile.
   - Server pagination with `"Load more"` button handling 1,000+ patients.
   - Loading skeleton state and empty state when 0 matches.

6. **Right Column (~24%): "Needs attention" & "Today" Stats:**
   - **Needs Attention:** Lists patients with status `Needs review` or `Critical` (Omar Hany, Fatma Hassan) with alert icon and a red indicator dot on critical items.
   - **Today Stats:** Exactly 2 tiles (`Total patients` and `Completed today`) per D7, each with a number and monochrome ink sparkline.

7. **1,000-Patient Pagination Test:**
   - Implemented in [tests/unit/provider-home.test.tsx](file:///c:/Dev/Dev_World/Web_Projects/umbrella-system/tests/unit/provider-home.test.tsx).
   - Validates server pagination slices (`PAGE_SIZE = 9`), sub-millisecond search across 1,000 records, and category filtering.

---

## 2. Visual Evidence

Playwright screenshots were captured and saved in this directory:

| Viewport | File | Description |
|---|---|---|
| Desktop (1470×1024) | `desktop-en.png` | English/LTR view: Schedule, 3-column patient folder grid, Needs Attention, and Today stats |
| Desktop (1470×1024) | `desktop-ar.png` | Arabic/RTL view: complete mirrored layout with logical properties and Arabic copy deck |
| Desktop (1470×1024) | `desktop-search-filter.png` | Real-time search filter demonstrating instant directory narrowing |
| Mobile (390×844) | `mobile-en.png` | Responsive mobile layout (English/LTR) |
| Mobile (390×844) | `mobile-ar.png` | Responsive mobile layout (Arabic/RTL) |

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
 ✓ tests/unit/provider-home.test.tsx (7 tests)
   ✓ loads all 8 folders with MRN, chips, status badges, and last visit
   ✓ verifies empty state for the new patient folder content (§11)
   ✓ filters directory by search query across name, MRN, and phone
   ✓ correctly applies the 4 canonical filters: Recent, Today, Needs attention, Critical
   ✓ verifies Today Schedule contains appointments with required properties
   ✓ verifies Clinic Stats contains totalPatients and completedToday (D7)
   ✓ executes the 1,000-patient server pagination test (§11 requirement)

Test Files  4 passed (4)
Tests       26 passed (26)
```
