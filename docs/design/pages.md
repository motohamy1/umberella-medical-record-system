# Page-by-page design spec

Percentages are of the canvas width at a **1470 px** viewport. All colors are tokens
(`tokens.md`). All text comes from the copy deck. All data comes from the database through
the data layer.

## Closed inventories — the cure for "the agent keeps adding things"

Anything not in a page's INVENTORY **does not exist**. No extra cards, banners, stats,
tooltips, badges, toggles, gradients, illustrations, rails, footers or marketing copy.

**Before coding any page** the agent outputs an inventory table — element → region of the
reference image → data field or copy key. Any element without a source row is deleted. The
**owner approves the table, then coding starts.** Any addition is a product decision
needing explicit owner approval.

## App map

```
/login  /signup  /invite/[token]  /reset-password     (no role picker anywhere)
/clinic                          Provider Home        (staff only)
/clinic/schedule                 Today's schedule     (staff only, from the icon rail — ADR-0010)
/clinic/patients/[id]            Patient Workspace    (staff only)
    /overview  /ai-analytics  /visits (+/[visitId])  /medications
    /labs  /imaging  /allergies  /genetics
/clinic/members  /clinic/audit                        (admin only, later slice)
/patient                         Patient Home         (patient only)
/dev/gallery  /dev/data                               (development only, 404 in prod)
```

Server middleware and server components resolve identity → membership → role and redirect
to the role's home. A staff session can never render `/patient/*` and a patient session can
never render `/clinic/*`.

## Quality gates (every page and tab)

1. **Designed states** — loading skeleton, empty state with the relevant add action, error
   with retry, permission-denied, saving/pending. Never a blank panel.
2. **Responsive** — desktop 1470×1024, tablet 1024, mobile 390×844. Mobile is not a shrunk
   desktop: the timeline gets touch-first controls and a compact scrubber; the three bottom
   cards stack; the workspace tabs collapse to a scrollable pill row with an overflow menu;
   folders become 1–2 columns.
3. **Accessibility** — keyboard reachability for every control, visible focus, sufficient
   contrast on `canvas` and `frame`, touch targets ≥44 px, reduced motion, screen-reader
   labels for timeline nodes, icon buttons and status labels.
4. **Evidence** — `docs/evidence/<issue>/`: Playwright screenshots at 1470×1024 and 390×844
   in English/LTR and Arabic/RTL, the matching reference crop beside each, the deviation
   list, and test/guard/RLS output. Without these an issue is not done.

## Owner's 10-point check (after each UI issue)

1. Put the app and the reference side by side at the same width.
2. Is there ONE thin horizontal axis with nodes on it?
3. Do connectors have rounded, axis-aligned elbows (not faint curves)?
4. Are the modules compact and fixed-width?
5. Can you add, edit and delete an event and see it appear?
6. Does the scrubber move the timeline and the timeline move the scrubber?
7. Is every visible word product language?
8. Do all 8 tabs exist in order and are they reachable?
9. One accent color only, and a page background that is not the bright yellow?
10. Is any clinical content identical to the reference images? (It must not be.)

---

## 6.1 Auth pages (login, signup, invite, reset password) — no reference image

Inside the AppFrame. NotchHeader tab title "Sign in" (or "Create account", "Reset
password"), **no close button**. Right of the tab: a language switch pill (EN | AR).
Canvas: one centered ModuleCard (max width ~420 px) with the app wordmark, pill-shaped
inputs on `surface`, one primary button (accent fill, ink text, pill) and secondary text
links. The invite page shows the clinic name and the role being granted, read-only. **There
is no role selector** — the role comes from the invite or from the database.

INVENTORY: wordmark, title, fields, primary button, secondary links, language switch,
inline error text. **Nothing else.**

## 6.2 Provider Home (`/clinic`) — layout from ref-3, theme from ref-1/ref-2

```
┌ NotchHeader ───────────────────────────────────────────────────────────────┐
│ [Patients]        (Search patients…)  [＋ Add patient]  (🔔)  (avatar Name ⌄) │
├─ canvas ───────────────────────────────────────────────────────────────────┤
│ ┌ Today's schedule (4)┐ ┌ Patients ── [Recent][Today][Needs att][Critical]─┐ ┌ Needs attention (4)┐
│ │ 1:00 PM  Name       │ │  ┌folder┐ ┌folder┐ ┌folder┐                      │ │ ▢ name · reason·10m│
│ │ Check-up   (⚕)(📋)  │ │  ┌folder┐ ┌folder┐ ┌folder┐          (load more) │ │ ▢ …                │
│ └─────────────────────┘ └──────────────────────────────────────────────────┘ │ ┌ Today ───────────┐
│                                                                              │ │ Total patients 190│
│                                                                              │ │ Completed      25│
│                                                                              │ └──────────────────┘
```

- **Header band (dark plum):** left tab titled "Patients", no close button. Right: search pill
  (white, magnifier, placeholder from the copy deck; searches name, MRN, phone, date of
  birth); primary "Add patient" button (accent fill, ink text, pill, plus icon — the
  scan-prescription entry joins this button only in the OCR slice); a bell CircleButton with
  a small dot only when something is unread; the doctor's avatar + name + chevron opening a
  dropdown: Communication, Members (admins), Audit (admins), Language, Sign out.
- **Left icon rail (ADR-0010, owner override of D6):** a narrow rail of white CircleButtons
  with line icons, restyled with the authentic theme (no pastel circles, no neumorphism).
  **Only two destinations ship**: Patients (→ `/clinic`, this page) and Schedule (→ today's
  schedule, promoted to its own clinic-level page). Visits, Medications and Labs are
  per-patient tabs inside a workspace, not clinic-level pages; Settings does not exist — the
  render's other four icons ship later, each as its own slice with an owner-approved
  inventory. The rail is **never a switcher** and never changes privileges (hard rule 5).
  Every icon carries an accessible label (hover/focus tooltip + screen-reader name) and a
  ≥44 px touch target.
- **Left column (~22%) "Today's schedule":** ModuleCard with a count badge. Each
  appointment is a rounded `surface` row: a time block (time in large text), patient name,
  visit type, and two small CircleButtons (open workspace, open visit notes). Empty state:
  "No appointments today".
- **Center (~54%) "Patients":** ModuleCard. Title row: title left, the four filter pills
  right (single select: Recent, Today, Needs attention, Critical). Grid of folders, 3
  columns desktop (2 tablet, 1–2 mobile). "Load more" at the bottom — no infinite-scroll
  surprises. Server pagination; must handle 1,000+ patients.
- **Folder anatomy** (ref-5 shape, ref-3 information):
  - a tab at top-left of the back panel showing the MRN;
  - tucked behind the front card, up to 4 small chips, each a record-kind line icon + short
    date, and "+N" at the right when more exist. **Chips show ONLY record kind and date** —
    no clinical images, results or diagnoses (the screen can be seen by other people);
  - the front pocket card: avatar (initials fallback), name, "Sex · Age", status label at
    the right;
  - a hairline, then two rows: "Last visit" with the date, "Primary concern" with one
    truncated line;
  - kebab menu: Open workspace; Send invite (only when the patient has no linked account).
  - **Status labels** (ADR-0007): Stable and New (neutral `surface`), Follow-up (accent
    fill), Needs review (outlined), Critical (ink fill, white text). No other colors.
  - Click opens the Patient Workspace with a short folder → workspace transition.
- **Right column (~24%):** "Needs attention" ModuleCard: rows with avatar, patient name,
  reason (e.g. "Unreviewed critical lab"), time ago, and a small ink warning icon; a tiny
  red dot only on critical items. Under it a "Today" ModuleCard with **four tiles**
  (ADR-0010, owner override of D7): Total patients, Completed today, **Wait times**, **New
  admits** — each a number and a monochrome `ink` sparkline. Never multicolour.
  - Wait times need two columns §9.2 does not define, added in S1:
    `appointments.actual_start` and `appointments.actual_end` (timestamptz, nullable).
    Wait time = `actual_start − scheduled_start`, shown as the day's median.
  - New admits = patients whose first-ever visit is today, derived from `visits` (no new
    column).
- **Data:** `patients`, `care_events` (chips, last visit), `appointments`, attention rules.
- **States:** skeleton folders while loading; empty "No patients yet" with an Add patient
  action; error with retry; permission-denied.

INVENTORY: notch tab, search pill, Add patient button, bell, doctor menu, **icon rail (2
icons)**, schedule card and rows, patients card, 4 filter pills, folders (tab, chips, +N,
front card, status label, kebab), load-more, attention card and rows, stats card with **4
tiles**. **Nothing else: no floating toggle bar, no pink panel, no multicolor sparklines,
no earnings, no marketing.**

## 6.3 Patient Workspace shell (`/clinic/patients/[id]/*`) — ref-1

Modal-like page; the close button closes it. The frame can expand or shrink to its content,
and fields are editable where the role permits.

- **NotchHeader:** the canvas tab carries a white circular close button (returns to
  Provider Home) and the title "Patient workspace" from the copy deck. **NEVER a specialty
  or department name.** Right of the tab on the dark plum band: the 8 PillTabs in the exact
  order — Overview, AI Analytics, Visits, Medications, Labs, Imaging, Allergies, Genetics.
  The active tab is the white pill. If the width is short the tabs **scroll horizontally**
  to reach the rest, with the overflowing part faded/muted at the edge — **no arrow
  buttons**. All 8 are reachable at every width; nothing is clipped silently.
- **Overview** shows the IdentityCard instead of a context bar. **All other tabs** show a
  one-line **PatientContextBar** under the notch (avatar, name, "Sex · Age", MRN, and a
  critical-allergy chip when one exists). This bar and the "recorded by / when" caption
  under the metrics strip are the **only** elements added beyond the images, for
  patient-safety reasons.
- Tabs for unbuilt slices render a designed "Not available yet" state (never a blank panel).

## 6.4 Overview (`/overview`) — layout from ref-2, shell from ref-1

- **IdentityCard (ref-2):** ~22% wide, as tall as the metrics strip plus filter row. Photo
  (rounded square; neutral avatar placeholder when none), small "Sex, Age", bold name. At
  the bottom two stacked rounded rows: "Social history" (the recorded habits text) and
  "Care plan" (the active care-plan title). Each has an up-right arrow opening an Overlay
  with the full text. A critical allergy chip appears under the name when one exists.
- **MetricsStrip (ref-1)** (ADR-0008): to the right of the card. Five columns, small label
  over large value with unit — Diagnosis (primary active diagnosis, large text), Pulse
  (bpm), Pressure (mmHg), Oxygen (%), Temperature (°C). Under the strip one small caption:
  "Recorded <date> by <name>". A value older than the patient's last visit shows its date
  in `inkMuted`.
- **FilterRow (both references):** a white round filter-sliders button, then six pills —
  Office visits, Medications, Labs, Procedures, Hospitalizations, Imaging. Multi-select. No
  selection means all kinds. Selected = white pill, unselected = `surface`. The sliders
  button resets the filter. **There is no "All" pill.** The row sits directly above the
  timeline, never above the identity card.
- **Timeline region:** `timeline.md`. Fills the full width, height sized to its content, no
  dead area underneath.
- **Zoom buttons and scrubber:** a row below the timeline — two white CircleButtons (+ and
  −) and the scrubber pill.
- **Bottom cards (ref-2)** in a 3-column row (~45% / 27% / 27%), each a ModuleCard with a
  short handle line, the gentle raised hump at its top center, and a circular up-right
  button at its top-right:
  1. **Vital Signs History** — label "Heart rate" with the latest value and unit; a smooth
     line over the last 30 days with a dot marker at the latest reading and a white bubble
     showing the value at the hovered/selected point. ↗ opens an Overlay with the full
     history and a metric switcher (Heart rate, Blood pressure, Oxygen, Temperature,
     Weight) as pills.
  2. **Records** — the most recent record as a RecordRow (day + month left, rounded pill
     with a white circle icon and the title; visit rows use `recordVisit`). Up to 3 rows. ↗
     opens the full record list.
  3. **Labs** — the latest result as a label (test name, value + unit) over a RangeBar with
     the dark marker at the value's position. Up to 2 tests. ↗ opens the Labs tab.
  The cards continue below the first viewport; the page scrolls inside the frame.
- **States:** the whole page has a skeleton; each region has its own empty state (e.g. "No
  vital signs yet" with an Add reading action, if the role may add).

INVENTORY: notch (close, title, 8 tabs), IdentityCard (photo, sex/age, name, 2 context
rows, allergy chip), MetricsStrip + caption, filter round button + 6 pills, timeline region,
zoom buttons, scrubber, 3 bottom cards with their ↗ buttons, the "+" end node. **Nothing
else: no vitals card grid, no ECG trend cards, no range pills (Week/Month/Months), no wavy
decorations, no extra banners.**

## 6.5 Other patient tabs — no authentic reference; same grammar, closed inventories

Common to all: PatientContextBar, then a title row with the module title at the left and,
where the role may add, a "+" CircleButton at the right; content in ModuleCards; details
open in an Overlay; unreviewed or new items carry a small accent dot; every list has a
designed empty state with the relevant add action.

- **Visits (`/visits`, `/visits/[visitId]`):** list grouped by month (month heading +
  RecordRows, visit tint). Row click opens the Visit page: a three-segment pill
  (Before · During · After) showing the workflow state, and sections — reason, notes,
  vitals taken at the visit, orders, plan, follow-up date. Doctors write notes and plans;
  nurses add vitals; receptionists schedule.
  INVENTORY: month headings, rows, "+" new visit, the Visit page's segments and sections.
- **Medications (`/medications`):** pills "Current | History". Each row: MedicationChip
  (name with ×N doses/day), strength, route, start date, status label; row actions (doctor
  only): Change dose, Pause, Stop, and "Show on timeline" (opens Overview focused on that
  medication's start date, at the zoomed-in lens). "+" starts a medication.
  INVENTORY: the two pills, rows, row actions, "+".
- **Labs (`/labs`):** results grouped by date. Each test is a row with name, value + unit,
  RangeBar; clicking opens an Overlay with the trend (values over time on a line with the
  reference band shaded). Unreviewed results show an accent dot; doctors have "Mark
  reviewed". "+" adds a result.
  INVENTORY: grouped rows, RangeBars, trend overlay, mark reviewed, "+".
- **Imaging (`/imaging`):** grid (3 columns) of ImagingThumbCards (modality chip, round
  arrow button, date under it). Click opens a viewer Overlay with the image and the report
  text. Media are reached only through short-lived signed access. "+" uploads a study.
  INVENTORY: the grid, viewer, "+".
- **Allergies (`/allergies`):** rows — substance, reaction, severity label, status.
  Doctors add and edit. A critical allergy also shows in the Overview identity card and the
  PatientContextBar. INVENTORY: rows, "+".
- **Genetics (`/genetics`):** restrained rows — finding, source document, date. Nothing
  decorative. INVENTORY: rows, "+".
- **AI Analytics (`/ai-analytics`, later slice):** ModuleCard with the question pills "What
  changed?", "What matters?", "Since last visit"; each answer is a short list of statements,
  every one with source chips that open the underlying event. A visible "AI-generated ·
  <time>" label and a Regenerate button. "Save to note" requires an explicit confirm. Until
  the slice ships: "Not available yet".

## 6.6 Communication (later slice)

From the doctor dropdown: a right-side Sheet with a conversation list and a thread
(messages, composer). Same primitives. No new visual language.

## 6.7 Patient Home (`/patient`) — layout from ref-4, theme from ref-1/ref-2

NotchHeader: tab titled "My care", no close button. Right: bell CircleButton, and avatar +
name opening a dropdown (Language, Sign out). Canvas: a 2×2 arrangement (stacked on
mobile): **Next up**, **Health snapshot**, **Quick log**, **My care plan**.

- **Next up:** the next due medication from the active plan. A flat line icon in a white
  circle (**NO 3D pill, NO clock illustration**). Caption, the medication name and strength
  in large text, the instruction, and a primary "Log taken" button (accent fill). If
  nothing is due: "Nothing due right now".
- **Health snapshot:** two ModuleCards. Blood pressure — a monochrome sparkline of the last
  readings, the last value with unit, the target range from the care plan. Blood glucose —
  the last readings as markers on a RangeBar-style strip, the target range. Units mmHg and
  mg/dL.
- **Quick log:** two labeled groups of neutral white CircleButtons with line icons and
  labels: Symptoms (fever, cough, headache) and Vitals (heart rate, weight, mood). A tap
  opens a tiny Sheet to enter the value (symptoms: severity). Below, a pill note field "Add
  a quick note…". Saves go through the patient observation path, marked "patient-reported"
  on the doctor's side.
- **My care plan:** a Daily checklist (checkbox rows, subtle "2 of 3 done"), the next
  appointment (doctor, date and time), and a goal line (e.g. "Maintain 66 kg").
- Heading text is plain. **Never the leaked label "Next Action' Hero Card".**

INVENTORY: notch (title, bell, profile menu), the four cards and their contents as listed.
**Nothing else: no tablet frame, no pastel buttons, no 3D, no points, no streaks.**

## 6.8 Later screens (members, audit, earnings, billing, telehealth room, OCR verification)

No references. Each is built from the shared primitives, with an inventory table approved by
the owner **BEFORE** coding. OCR verification: original image on one side, extracted fields
on the other, low-confidence fields highlighted with an accent outline, every field
editable, a single "Confirm" action; nothing is saved to the record before confirmation.
