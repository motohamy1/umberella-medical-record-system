# Patient Clinical Workspace — PRD (Core scope: slices S0–S13)

**Status:** ready-for-agent · **Date:** 2026-10-13 · **Source:** `docs/project-brain.md`,
decisions in `docs/adr/0001`–`0011`

## Problem Statement

Clinic staff cannot see one patient's whole clinical story in one place. Records live in
scattered tabs and paper; nobody can answer "what changed since the last visit" without
opening five systems. Patients have no visibility into their own care between visits.

The first build failed: it shipped 18 migrations and two backends before one patient page
worked, seeded demographics with no clinical history, and checked every visual gate against
AI-generated renders instead of the real design — so the app drifted and every screen was
empty.

## Solution

A dual-sided clinical workspace. Staff open a patient's **Workspace** — a plum-framed,
modal-like page with 8 tabs — where a **clinical timeline** across the top projects the
patient's entire history from a unified care-events index. Zoomed out it shows visits as
milestone nodes with icon children; zoomed in it expands each visit into medication chips
and metric cards with averages and deltas. Patients see a separate, narrower app: what's due
next, their own readings, and their care plan.

Everything renders from the database. Roles come from the server. Arabic and English ship
together.

## User Stories

### Authentication and identity

1. As a new staff member, I want to sign in with my clinic account, so that I reach the
   clinic app without choosing a role.
2. As an admin, I want to invite a staff member by email with a role already attached, so
   that nobody self-assigns privileges.
3. As a staff member, I want to reset my password, so that I can recover access.
4. As a user, I want to switch the interface between English and Arabic, so that I work in
   my own language.
5. As a user, I want right-to-left layout in Arabic, so that the interface reads correctly.
6. As the system, I want to resolve identity → membership → role on the server for every
   request, so that privileges are never decided in the browser.
7. As the system, I want a staff session to be unable to render patient routes and vice
   versa, so that the two experiences cannot cross.

### Provider Home

8. As a doctor, I want a grid of patient folders, so that I can find a patient fast.
9. As a doctor, I want each folder to show record-kind chips with dates behind the front
   card, so that I see history without exposing clinical detail on a shared screen.
10. As a doctor, I want a status label on each folder (Stable, New, Follow-up, Needs review,
    Critical), so that I triage at a glance.
11. As a receptionist, I want to search patients by name, MRN, phone or date of birth, so
    that I find anyone from partial information.
12. As a doctor, I want to filter patients by Recent, Today, Needs attention or Critical, so
    that I focus on a subset.
13. As a receptionist, I want to see today's schedule, so that I know who is expected.
14. As a doctor, I want a "Needs attention" list, so that unreviewed critical results surface
    themselves.
15. As an admin, I want a Today stats card with total patients, completed, wait times and new
    admits, so that I understand the day's load.
16. As a receptionist, I want to add a patient, so that new arrivals enter the system.
17. As a doctor, I want to send an invite to a patient who has no account, so that they can
    see their own care.
18. As a doctor, I want folders to page server-side, so that 1,000+ patients stay fast.
19. As a doctor, I want an icon rail with Patients and Schedule, so that I move between the
    two clinic-level views.

### Patient Workspace shell

20. As a doctor, I want the workspace to feel modal with a close button, so that I return to
    Provider Home.
21. As a doctor, I want 8 tabs in a fixed order, reachable at every width, so that navigation
    is predictable.
22. As a doctor, I want the notch title to read "Patient workspace", so that no specialty or
    department is implied.
23. As a doctor, I want a context bar with name, sex, age, MRN and a critical-allergy chip on
    every tab except Overview, so that I never lose patient identity.
24. As a doctor, I want unbuilt tabs to say "Not available yet", so that I am never shown a
    blank panel.

### Overview

25. As a doctor, I want an identity card with photo, name, social history and care plan, so
    that I see the person, not just numbers.
26. As a doctor, I want a vital-metrics strip (diagnosis, pulse, pressure, oxygen,
    temperature) with a "recorded by / when" caption, so that I know how fresh each value is.
27. As a doctor, I want stale values to show their date, so that I never trust old data.
28. As a doctor, I want a critical allergy chip on the identity card, so that safety
    information is unmissable.
29. As a doctor, I want a filter row for six record kinds, so that I narrow the timeline.
30. As a doctor, I want three bottom cards — Vital Signs History, Records, Labs — each opening
    a fuller view, so that I can drill in.

### Clinical timeline

31. As a doctor, I want one horizontal axis with visit milestones on it, so that history
    reads as a line.
32. As a doctor, I want month labels and hairlines, so that I orient in time.
33. As a doctor, I want child nodes per record kind with count badges, so that I see what
    happened at each visit.
34. As a doctor, I want rounded, axis-aligned connectors that never cross, so that the
    diagram stays legible.
35. As a doctor, I want to pan and zoom, so that I move between years and days.
36. As a doctor, I want a scrubber with two-way sync, so that I navigate long histories.
37. As a doctor, I want zooming into a visit to show medication chips and metric cards with
    averages and deltas, so that I see treatment dynamics.
38. As a doctor, I want deltas to carry units and read as an association, never a cause, so
    that I do not misread them.
39. As a doctor, I want a "+" node to add an event, so that recording happens in context.
40. As a doctor, I want to add, edit and delete an event and see the timeline change
    immediately, so that the view is always current.
41. As a keyboard user, I want to reach and open any event, so that the timeline is not
    mouse-only.
42. As a doctor, I want the timeline to stay at 60 fps on a 5,000-event patient, so that
    long histories are usable.

### Clinical tabs

43. As a doctor, I want a Visits tab grouped by month, so that I find a consultation fast.
44. As a doctor, I want a Visit page with before / during / after segments, so that I see the
    workflow state.
45. As a doctor, I want a Medications tab with current and history, so that I see the regimen.
46. As a doctor, I want to change a dose, pause or stop a medication, so that treatment stays
    current.
47. As a doctor, I want "Show on timeline" on a medication, so that I jump to its start.
48. As a nurse, I want to add vitals at a visit, so that observations are recorded.
49. As a doctor, I want a Labs tab with range bars and a trend overlay, so that I see values
    against reference ranges.
50. As a doctor, I want to mark a lab reviewed, so that unreviewed results clear.
51. As a doctor, I want an Imaging grid with a viewer, so that I inspect studies.
52. As a doctor, I want imaging media behind short-lived signed URLs, so that files are never
    public.
53. As a doctor, I want an Allergies tab, so that reactions and severity are recorded.
54. As a doctor, I want a Genetics tab, so that findings have a home.
55. As a nurse, I want to be unable to start a medication, so that prescribing stays with
    doctors.

### Patient app

56. As a patient, I want to see my next due medication with a "Log taken" action, so that I
    follow my regimen.
57. As a patient, I want a health snapshot of blood pressure and glucose against my target
    range, so that I know where I stand.
58. As a patient, I want to log symptoms and vitals quickly, so that recording takes seconds.
59. As a patient, I want my care plan checklist, next appointment and goal, so that I know
    what to do.
60. As a doctor, I want patient-entered readings marked "patient-reported" and never
    verified, so that provenance is unambiguous.

### Cross-cutting

61. As a developer, I want every page to have loading, empty, error and permission-denied
    states, so that nothing renders blank.
62. As a user, I want every control keyboard-reachable with visible focus and ≥44 px targets,
    so that the app is accessible.
63. As a user, I want reduced motion respected, so that animation never harms me.
64. As a mobile user, I want a touch-first timeline and stacked cards, so that the app works
    on a phone.
65. As the owner, I want a dev data inspector and one-click reseed, so that demos are
    reproducible.
66. As the owner, I want dev sign-in per seeded account, so that I can demo any role.
67. As the owner, I want screenshot evidence for every UI slice, so that I verify visually.
68. As a developer, I want CI guards on color literals, UI string literals, reference content
    and role switchers, so that the hard rules are enforced, not remembered.

## Implementation Decisions

**Stack** (ADR-0001): Next.js App Router, TypeScript strict, Tailwind v4 with tokens as CSS
variables, Neon (Postgres, Auth, RLS, Storage), Zod, D3 modules for time math, `motion` for
transitions, Vitest, Playwright. One backend. No second API server.

**Authorization** (ADR-0002): two route groups with server guards; role from membership;
write policy split per role with database-level constraints so a patient session cannot write
a non-patient source or a verification field even by calling the API directly.

**Data model** (§9.2): every clinical table carries `org_id` and RLS. A `care_events` index
row per timeline-relevant record, maintained in the same transaction as the source row.
Provenance fields (`source`, `created_by`, `verified_by`, `ai_generated`) on every clinically
meaningful row. Soft delete for clinical rows. **Plus two new columns from ADR-0010:**
`appointments.actual_start`, `appointments.actual_end`.

**Timeline** (ADR-0004, `docs/design/timeline.md`): D3 owns time math and never mutates
React-owned DOM; React renders from pure layout functions; per-frame motion is `translate`
only. Two lenses from one component. Lane assignment and region height per ADR-0011.

**Design system** (`docs/design/tokens.md`, `components.md`): tokens as CSS variables, one
radius scale, one accent, shared components built once in S0 with every state in
`/dev/gallery`.

**Demo data** (ADR-0005, `docs/design/demo-data.md`): deterministic idempotent seed through
the auth admin API, 8 patients including a hero with an 18-month story and a 5,000-event
performance patient behind a dev flag.

**Copy deck** (ADR-0006): per-language EN/AR files; no user-facing literals in components;
RTL via logical properties.

**Slicing** (§11): 14 vertical slices S0–S13, each with schema + server + UI + seed + test +
evidence, one at a time, owner approval between.

## Testing Decisions

- Tests assert **external behaviour** — rendered output, HTTP status, database visibility as
  a role — never implementation details. A passing build is necessary but never sufficient.
- **RLS negative tests (S1)** are the core of the safety story: for each role, route access
  and direct database access, positive and negative; every forbidden write attempted directly
  against API and database as the wrong role is rejected; cross-org reads return nothing.
- **Timeline acceptance** (`docs/design/timeline.md`): ≥20 events across ≥4 month columns on
  the hero patient's default view; ≥2 milestones expanding at L3; add/edit/delete reflected
  without reload; deltas carry units; keyboard-only user can open any event.
- **Playwright evidence** at 1470×1024 and 390×844 in EN/LTR and AR/RTL, beside the matching
  reference crop, with a deviation list — saved to `docs/evidence/<slice>/`.
- **CI guards** (§9.5): no raw color literals outside the token file; no user-facing string
  literals outside the copy deck; source scan failing on reference sample content (the
  reference patient names, "Cardiology", exact sample numbers like "180/120"); no seed/fixture
  imports from application code; a test failing if any file under `src/app` renders a control
  that changes the session's role.
- **Smoke test** after seeding asserting the minimum content in `demo-data.md`.

## Out of Scope (the "Later" list)

Prescription OCR and verification · AI Analytics · in-app Communication, then WhatsApp and
Telegram · Telehealth · Payments · Offline and sync · FHIR mapping · security and compliance
hardening including the D10 legal gate · native mobile apps · predictive risk models ·
external lab/PACS/pharmacy integrations.

D8 (drug catalog), D9 (OCR provider and consent), D10 (hosting region, Egypt PDPL 151/2020
legal review) and D11 (telehealth, payments, WhatsApp) are deferred and block nothing in
Core.

## Further Notes

**Accepted risks** (ADR-0011): the hero clinical story ships without clinician review, so
every visual gate compares against unsigned-off data — if a screenshot looks wrong, check the
story before blaming the renderer. `ref-5-folder-style.png` is 107×147, too small for
measurements, so S2 needs owner judgement on folder proportions. §6.3's tab-overflow rule was
implemented as the owner's inline note (horizontally scrollable pill row, faded tail, no
arrows), overriding §2.1's "More" pill.

**Sequencing**: the product must be fully usable and approved before any Later item starts.
Use the strongest available model for S0, S1, S5 and S6. Visual gates need a model that can
see images; otherwise the owner runs the 10-point check in `docs/design/pages.md`.
