# Patient Clinical Workspace — Rebuild Pack v5 (for Matt Pocock's skills workflow)

Greenfield rebuild. Do not reuse the old repository's code. It is evidence only.

This single file contains everything the agent needs: how to run the workflow, what went wrong, the locked decisions, the reference authority, the design system, a page-by-page design spec, the timeline engine spec, the demo-data spec, the authorization model, the vertical-slice plan, and ready-to-paste kickoff prompts. It replaces v1–v4 and the GSD control pack.

---

# 0. HOW TO USE THIS FILE

1. Create a new empty repository. Copy this file to `docs/PACK.md`.
2. Put the reference images in `docs/reference/` using exactly the names in §3. Rename your uploaded files like this:
   - `main-reference.png` → `ref-1-plum-shell.png`
   - `1791854102928_image.png` (the "Dr+" image) → `ref-2-drplus-overview.png`
   - `Gemini_Generated_Image_m9x7fdm9x7fdm9x7.jpg` (provider home) → `ref-3-provider-home.jpg`
   - `Gemini_Generated_Image_mjjx0kmjjx0kmjjx.jpg` (patient home) → `ref-4-patient-home.jpg`
   - `Screenshot_2026-10-04_020556.png` (folders) → `ref-5-folder-style.png`
   - `Gemini_Generated_Image_mifi98mifi98mifi.jpg` (patient overview) → `ref-X-gemini-overview.jpg` (retired, kept for the record only)
3. Install the skills and configure them once:
   - `npx skills@latest add mattpocock/skills` (select the setup skill and the engineering skills)
   - run `/setup-matt-pocock-skills` (pick your issue tracker: local markdown files is fine; keep the default triage labels; docs layout: `CONTEXT.md` at the root and ADRs in `docs/adr/`).
    Skill names change between releases. Use the ones your installed version exposes. The intended flow, with the usual names, is: grill → to-prd → to-issues → tdd (per issue) → code-review → diagnose (for bugs) → handoff (between sessions).
4. Paste kickoff prompt K1 from §12. Let the agent split this pack into `AGENTS.md` (lean), `CONTEXT.md` (glossary), `docs/design/*`, `docs/adr/*`. Review them.
5. Run the grill skill on the open decisions (§2.2), then to-prd, then to-issues using the slice list in §11. Every issue must be a VERTICAL SLICE: schema + server logic + UI + demo data + test + screenshot, demonstrable end to end. No schema-only or UI-only issues.
6. Work one issue at a time. After each issue the agent produces evidence (§10.4) and you approve before the next issue.

Model note: use your strongest available model for slices S0, S1, S5 and S6 (foundation, data/RLS, timeline). I cannot vouch for any particular model. Judge by the screenshots the agent shows, not by its claims. Visual gates need a model that can actually see images. If yours cannot, you do the visual comparison yourself with the 10-point check in §10.5.

---

# 1. WHAT WENT WRONG IN THE FIRST BUILD (from reading the repository; I did not run it)


| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                | Rule that now prevents it                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The repo's "binding" references were three Gemini-generated images (provider home, patient workspace, patient home). The authentic designer images (the plum-frame "main reference" and the "Dr+" overview) were not in the repo. The Gemini renders are cool blue-grey, heavy neumorphic, contain typos and invented elements. Every later gate checked against the wrong image, so the app drifted. | §3: authentic images govern; the Gemini patient-workspace render is retired; the other two Gemini renders are layout-only.                                        |
| 2   | `seed.sql` creates 7 auth accounts and 6 patients (demographics only). There are no visits, medications, vitals, labs, imaging, events. Every tab and the timeline had nothing to show. The seed also hand-inserts into the auth schema, which is brittle.                                                                                                                                             | §8: full demo dataset, seeded through the auth admin API; no slice is done until it renders seeded data. A dev data inspector exists.                             |
| 3   | 18 migrations (telehealth, payments, messaging, channels, OCR…) existed before one patient page worked end to end. Work was sliced by layer, not by user-visible behavior.                                                                                                                                                                                                                             | §11: vertical slices; later features are blocked until the core patient workspace is approved.                                                                    |
| 4   | The timeline was written against an empty dataset, plus a static preview in the dev gallery. It was never exercised with real history, so layout, lanes, branches and semantic zoom were never tested.                                                                                                                                                                                                 | §7: timeline spec with concrete layout rules; built in gated steps against the seeded hero patient.                                                               |
| 5   | Two backends were mixed: dependencies for Neon + better-auth + S3, migrations and RLS written for Neon.                                                                                                                                                                                                                                                                                                | §2.1: one stack.                                                                                                                                                  |
| 6   | The agent context was bloated and contradictory: a GSD-generated AGENTS.md and an 1,800-line spec. The agent lost the important rules.                                                                                                                                                                                                                                                                 | §9.1: AGENTS.md ≤ 80 lines; details live in docs; each issue loads only what it needs.                                                                            |
| 7   | The agent kept adding elements that are not in the images.                                                                                                                                                                                                                                                                                                                                             | §4.6 closed inventories: anything not listed in a page's inventory does not exist; the agent must submit an inventory table for approval before coding each page. |
| 8   | Earlier agent output: a Doctor / Provider / Patient switcher in the UI; the neon backdrop of the reference used as the page background; "Cardiology" in the title tab; specification words as UI copy; a "+" overlapping a node; 5 of 8 tabs visible; deltas shown as "+10°"; lab bars without range zones.                                                                                            | §9 hard rules and §10 acceptance checks.                                                                                                                          |
| 9   | A blood/clinical entry form was shown in both the doctor and patient experiences, built in the frontend.                                                                                                                                                                                                                                                                                               | §9.3 write policy: separate server-enforced paths per role.                                                                                                       |


---

# 2. DECISIONS

## 2.1 Locked

- **Stack:** Next.js (App Router) + TypeScript (strict) + Tailwind v4 (tokens as CSS variables) + Neon(Postgres, Auth, Row Level Security, Storage) + Zod + D3 modules (`d3-scale`, `d3-zoom`, `d3-selection`, `d3-time`, `d3-quadtree`) + `motion` (Framer Motion) + Vitest + Playwright. GSAP only if a specific SVG choreography cannot be done with `motion`; document why. Local development uses the E CLI. One backend only. (If you prefer another backend, decide it in the grill step before S0 and write an ADR; do not mix.)
- **Product:** dual-sided. Staff (Owner/Admin, Doctor, Nurse, Receptionist) use the clinic app. Patients use the patient app. They are different authenticated experiences with different route groups.
- **No role switcher anywhere in the UI.** The role comes only from the server session and database membership.
- **All clinical writes go through the server under RLS.** Nothing clinical exists only in the browser.
- **The timeline is a projection** over a unified `care_events` index. The database tables are the source of truth.
- **Patient workspace tabs, exact order:** Overview | AI Analytics | Visits | Medications | Labs | Imaging | Allergies | Genetics. Vital Signs live inside Overview. Communication lives in the doctor profile dropdown.
- **Languages:** Arabic + English with RTL from the first component (logical CSS properties). Units: kg, °C, mmHg, mg/dL, western digits for clinical values.
- **UI text** always comes from a per-language copy deck. No specification vocabulary in the UI.
- **Gamification:** deferred to post-core (Later), no gamification in Core (S0–S13).
- **AI** assists and never decides. Nothing AI-produced becomes authoritative without clinician confirmation.

## 2.2 Open decisions (the grill step must resolve these; defaults apply until answered)

- D1. Arabic + English from day one. Default: yes.
- D2. Overview top-right slot: the vital-metrics strip from the main reference (diagnosis, pulse, pressure, oxygen, temperature) OR something else. Default: metrics strip. The tiles need a body-system field on every diagnosis and add little clinical value now. Say "tiles" to switch, and see §6.4.
- D3. Provider Home has no authentic reference (only a Gemini render). Default: its layout, restyled with the authentic theme (§6.2).
- D4. Folder colors. Default: neutral bodies with the single accent for status. Alternative: a restrained status-colored mode in muted tones. Never a rainbow.
- D5. What surrounds the frame on desktop. Default: the frame fills the viewport. A margin, if any, uses the frame or canvas color, never the accent yellow. (creamy color)
- D6. The Gemini provider-home render has a left icon rail with 6 unlabeled icons. Default: omit.
- D7. Provider Home stats: default Total patients and Completed today only (the render also shows Wait times and New admits, which need data you may not collect).
- D8. Drug catalog source for Egyptian medication names (needed at the OCR slice).
- D9. OCR/vision provider and patient-image consent (needed at the OCR slice).
- D10. Hosting region and legal review before any real data (Egypt Personal Data Protection Law No. 151 of 2020 and its regulations; consult a qualified lawyer). (this will be in post production only)
- D11. Telehealth: buy a WebRTC provider. Payments: verify what is available in Egypt. WhatsApp Business: requires an approved account and templates. All three are deferred until the core is approved.(post production not now)
- D12. One person who is both staff and a patient. Default: two accounts, no switch.

---

# 3. REFERENCE AUTHORITY

Store as `docs/reference/<name>`. Image content (names, clinical values, "Cardiology", IDs) is illustrative and never product content. The text inside the images contains typos ("Diagnosys", "Imagings", "2 Mao", "Mays"). Never copy typos.


| File                        | What it is                                                                                                                                                                                                                                              | Governs                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ref-1-plum-shell.png`      | The "main reference" (813×526): creamy frame, notch header with close button and title tab, pill tabs, identity card, vital-metrics strip, filter row, two-milestone timeline with medication chips and metric cards, lane pager, bottom scrubber       | THEME (colors, geometry, shadows), the SHELL of every workspace screen, and the zoomed-in "treatment dynamics" timeline lens                                          |
| `ref-2-drplus-overview.png` | The original "MedUmberella" overview (1200×900): identity card with context rows, filter row, month-column timeline with icon nodes, count badges, imaging thumbnail, zoom buttons, density scrubber, bottom cards (Vital Signs History, Records, Labs) | The OVERVIEW page layout, the zoomed-out timeline lens, the scrubber and zoom buttons, the bottom cards, record rows, range bars                                      |
| `ref-3-provider-home.jpg`   | Gemini render (2576×1405)                                                                                                                                                                                                                               | LAYOUT ONLY of Provider Home (§6.2)                                                                                                                                   |
| `ref-4-patient-home.jpg`    | Gemini render (2576×1405)                                                                                                                                                                                                                               | LAYOUT ONLY of Patient Home (§6.7)                                                                                                                                    |
| `ref-5-folder-style.png`    | tiny screenshot (107×147)                                                                                                                                                                                                                               | SHAPE ONLY of the patient folder (open folder, tab, peeking cards). No measurements, no colors                                                                        |
| `ref-X-gemini-overview.jpg` | Gemini render of the patient overview                                                                                                                                                                                                                   | RETIRED. It is an AI redraw of Dr+ with invented elements (vitals card grid, "ECG" trend cards, range pills). Use `ref-2` instead. Keep the file only for the record. |


Conflict rule: authentic images (ref-1, ref-2) win over every Gemini render. Where ref-1 and ref-2 disagree, §6.4 says which wins. Where no authentic image exists for a screen (Provider Home, Patient Home, the secondary tabs), the page spec below governs and no new visual language is invented.

Known defects in the Gemini renders that must NOT be copied.  
But, cool blue-grey surfaces; no plum frame; heavy neumorphic shadows; multicolor sparklines; gradient fills; pastel colored circular buttons; a pastel red alert block; a 3D pill with an alarm clock; a tablet bezel; the heading "Next Action' Hero Card" (a leaked prompt label); typos; duplicated names; a filter toggle bar overlapping the folder grid; an overlapping floating bar; a different yellow (`#FCCC00`) on the Add Patient button.

---

# 4. DESIGN SYSTEM

## 4.1 Tokens (measured from ref-1 and ref-2; the agent re-samples and freezes them in `docs/design/tokens.md`)


| Token                            | Value (approx.)                 | Use                                                                                 |
| -------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| `frame`                          | `#2D1B3D`                       | the dark plum outer frame and header band                                           |
| `frameSide`                      | `#4A3558`                       | lighter plum side borders (banded frame structure)                                  |
| `canvas`                         | `#E0E0D8`                       | workspace background (warm greige; not white, not cool grey)                        |
| `surface`                        | `#E9ECE5`                       | identity card, inactive pills, secondary modules                                    |
| `surfaceRaised`                  | `#F0EFEB`                       | bottom cards, timeline cards                                                        |
| `white`                          | `#FCFCFC`                       | active pills, circle buttons, scrubber track, cards                                 |
| `ink`                            | `#252D2F` (to `#030200`)        | text, axis line, dark nodes, "+" node, scrubber window, value pills                 |
| `inkMuted`                       | `#8B8D8C`                       | secondary text, medication chips (dark grey), grey tiles                            |
| `inkSoft`                        | `#B1B1AF`                       | dots, hairlines                                                                     |
| `accent`                         | `#F4FF48`                       | the ONE accent: milestone nodes, active emphasis, count badges, delta-improved fill |
| `recordVisit`                    | `#E9ACA7`                       | tint of a visit row in the Records card (the only evidenced record tint)            |
| `statusSuccess/Warning/Critical` | muted green / orange / red-pink | ONLY in range bars, status labels, critical alerts                                  |


**The bright yellow area around the application in ref-1 and ref-2 is a presentation backdrop, not part of the app.** Never use it as a page background. ref-2's black device border is also not part of the app: the dark plum frame replaces it.

Raw color literals are forbidden outside the token file. Components use semantic token classes only.

## 4.2 Geometry and depth

- Very rounded geometry: pills fully rounded; cards about 24–28 px radius at a 1470 px viewport; large tiles about 32 px; the frame about 40 px. Use ONE radius scale (pill, card, tile, frame). Measure proportions from the images.
- Shadows are soft and shallow: a faint 3–6 px lift on raised cards and circle buttons. you can add inner shadows, neumorphic double shadows, glass blur, gradients.
- Strokes: timeline axis about 1.5 px ink; branches about 1 px ink at reduced opacity; hairlines about 1 px `inkSoft`.
- Icons: thin line icons (about 1.5 px stroke), one set, rounded caps. Circle icon buttons are white circles with a line icon.

## 4.3 Typography

One neutral grotesk (for example Inter or Manrope) and an Arabic companion (for example IBM Plex Sans Arabic or Noto Sans Arabic). Record the choice in an ADR. Hierarchy as seen in ref-2: small labels (12 px, `inkMuted`), body 14 px, card titles about 20 px regular, key values large and light (28–36 px), logo/brand bold. Clinical values always show their unit in a smaller size.

## 4.4 Motion

Fast (150–250 ms), subtle, interruptible, `prefers-reduced-motion` respected. `motion` for panel/overlay/layout transitions and the folder → workspace transition. Timeline pan/zoom is direct manipulation (no easing lag). No decorative animation.

## 4.5 Shared components (build once in S0, show every state in `/dev/gallery` using mock props)

1. **AppFrame**: dark plum rounded frame filling the viewport; the canvas sits inside it.
2. **NotchHeader**: a dark plum band across the top. At the left the canvas rises into a tab that carries (optionally) a white circular close button and the screen title; the tab joins the canvas through a concave curve. Right of the tab the plum band carries pills or controls. The title text comes from the copy deck. The close button returns to the previous screen.
3. **PillTabs**: white active pill (with its icon), inactive pills in `surface` with icon + label, fully rounded, compact height.
4. **CircleButton**: white circle, line icon (search, filter-sliders, up-right arrow, plus, minus, close, chevrons).
5. **FilterRow**: a round filter-sliders button followed by pills. Selected pills are white; unselected are `surface`.
6. **IdentityCard**: rounded `surface` card; photo (rounded), small "Sex, Age" label, bold name, then stacked rows with a label, a value and an up-right arrow.
7. **MetricsStrip**: columns of small label over large value with unit.
8. **ModuleCard**: `surfaceRaised` card with title (left), optional circular up-right arrow button (right), content, and (bottom cards only) a short handle line with a gentle raised hump at top center, as in ref-2.
9. **RecordRow**: left date (day number + month), then a rounded pill (tinted for visits) with a white circle icon and the record title.
10. **RangeBar**: a hatched neutral bar with thin colored segments (low / borderline / normal / borderline / high) and a dark marker dot placed at the true value position. Label above: test name, value + unit.
11. **MedicationChip**: dark-grey pill with a white circle icon at the left, name, and a multiplier (`×2`) meaning doses per day.
12. **MetricCard** (timeline, zoomed-in): title, circular up-right button, small day label, hatched sparkline with accent fill, a dark value pill at the selected reading, "Average …" at the bottom-left and a delta pill at the bottom-right.
13. **ChipSet** (symptoms), **WaveformCard** (ECG with softly highlighted regions), **ImagingThumbCard** (rounded image, dark modality label chip at top-left, dark round arrow button at bottom-right).
14. **TimelineNode** variants: milestone (accent circle with a document icon), child (white circle with a kind icon, optional accent count badge), dot (small grey), end node (dark circle with "+").
15. **Scrubber**: described in §7.
16. **Overlay/Sheet**: for details and forms (focus trap, scroll lock, Escape closes).
17. **State components**: designed loading skeletons (token-based), empty states (with the relevant "add" action), error with retry, permission-denied, saving/pending indicator.

## 4.6 Closed inventories (the cure for "the agent keeps adding things")

Each page spec in §6 ends with an INVENTORY: the complete list of elements on that page. Rules:

- Anything not in the inventory does not exist. No extra cards, banners, stats, tooltips, badges, toggles, gradients, illustrations, rails, footers or marketing copy.
- Before coding a page, the agent outputs an inventory table: element → region of the reference image → data field or copy key. Any element without a source row is deleted. The owner approves the table, then coding starts.
- Any addition is a product decision that needs the owner's explicit approval.

---

# 5. APP MAP

```
/login  /signup  /invite/[token]  /reset-password        (no role picker anywhere)
/clinic                      Provider Home                (staff only)
/clinic/patients/[id]        Patient Workspace            (staff only)
    /overview  /ai-analytics  /visits (+/[visitId])  /medications  /labs  /imaging  /allergies  /genetics
/clinic/members  /clinic/audit                            (admin only, later slice)
/patient                     Patient Home                 (patient only)
/dev/gallery  /dev/data                                   (development only, 404 in production)
```

Server middleware and server components resolve identity → membership → role and redirect to the role's home. A staff session can never render `/patient/*` and a patient session can never render `/clinic/*`.

---

# 6. PAGE-BY-PAGE DESIGN SPEC

Conventions: percentages are of the canvas width at a 1470 px viewport. All colors are tokens. All text comes from the copy deck. All data comes from the database through the data layer.

## 6.1 Auth pages (login, signup, invite, reset password) — no reference image

Inside the AppFrame. NotchHeader tab title "Sign in" (or "Create account", "Reset password"), no close button. Right of the tab: a language switch pill (EN | AR). Canvas: one centered ModuleCard (max width about 420 px) with the app wordmark, the form fields (pill-shaped inputs on `surface`), one primary button (accent fill, ink text, pill) and secondary text links. Invite page shows the clinic name and the role being granted (read-only). There is no role selector: the role comes from the invite or from the database.

INVENTORY: wordmark, title, fields, primary button, secondary links, language switch, inline error text. Nothing else.

## 6.2 Provider Home (`/clinic`) — layout from ref-3, theme from ref-1/ref-2

```
┌ NotchHeader ───────────────────────────────────────────────────────────────────────────┐
│ [Patients]                (Search patients…)  [＋ Add patient]  (🔔)  (avatar Dr. Name ⌄) │
├─ canvas ───────────────────────────────────────────────────────────────────────────────┤
│ ┌ Today's schedule  (4) ┐ ┌ Patients ─────── [Recent][Today][Needs attention][Critical] ┐ ┌ Needs attention (4) ┐
│ │ ┌─────────────────────┐ │ │  ┌folder┐ ┌folder┐ ┌folder┐                              │ │ ▢ name · reason · 10m │
│ │ │ 1:00 PM  Name       │ │ │  ┌folder┐ ┌folder┐ ┌folder┐                              │ │ ▢ …                   │
│ │ │ Check-up  (⚕)(📋)   │ │ │  ┌folder┐ ┌folder┐ ┌folder┐          (load more)          │ └───────────────────────┘
│ │ └─────────────────────┘ │ │                                                           │ ┌ Today ───────────────┐
│ │ …                       │ │                                                           │ │ Total patients  190  │
│ └─────────────────────────┘ └───────────────────────────────────────────────────────────┘ │ Completed       25   │
                                                                                            └──────────────────────┘
```

- **Header band (dark plum):** left tab titled "Patients" (no close button). Right: search pill (white, magnifier, placeholder from copy deck; searches name, MRN, phone, date of birth), the primary button "Add patient" (accent fill, ink text, pill, plus icon; the scan-prescription entry joins this button only in the OCR slice), a bell CircleButton with a small dot only when something is unread, and the doctor's avatar + name + chevron opening a dropdown: Communication, Members (admins), Audit (admins), Language, Sign out.
- **Left column (~22%) "Today's schedule":** ModuleCard with a count badge. Each appointment is a rounded `surface` row: a time block (time in large text), patient name, visit type, and two small CircleButtons (open workspace, open visit notes). Empty state: "No appointments today".
- **Center (~54%) "Patients":** ModuleCard. Title row: title at left, the four filter pills at right (single select: Recent, Today, Needs attention, Critical). Grid of folders, 3 columns on desktop (2 on tablet, 1–2 on mobile). "Load more" at the bottom (no infinite scroll surprises); the list must handle 1,000+ patients with server pagination.
- **Folder anatomy (ref-5 shape; ref-3 information):**
  - a tab at top-left of the back panel showing the MRN;
  - tucked behind the front card, up to 4 small chips, each a record-kind line icon + short date, and "+N" at the right when more exist. Chips show ONLY record kind and date. No clinical images, results or diagnoses (the screen can be seen by other people);
  - the front pocket card: avatar (initials fallback), name, "Sex · Age", and a status label at the right;
  - a hairline, then two rows: "Last visit" with the date, "Primary concern" with one truncated line;
  - kebab menu: Open workspace; Send invite (only when the patient has no linked account).
  - Status labels: Stable and New (neutral `surface`), Follow-up (accent fill), Needs review (outlined), Critical (ink fill, white text). No other colors. Folder bodies are neutral (D4).
  - Click opens the Patient Workspace with a short folder → workspace transition.
- **Right column (~24%):** "Needs attention" ModuleCard: rows with avatar, patient name, reason (for example "Unreviewed critical lab"), time ago, and a small ink warning icon; a tiny red dot appears only on critical items. Under it, a "Today" ModuleCard with two tiles: Total patients and Completed today, each with a number and a monochrome `ink` sparkline (D7).
- **Data:** `patients`, `care_events` (for the chips and last visit), `appointments`, attention rules (§8.5).
- **States:** skeleton folders while loading; empty state "No patients yet" with an Add patient action; error with retry; permission-denied.

INVENTORY: notch tab, search pill, Add patient button, bell, doctor menu, schedule card and rows, patients card, 4 filter pills, folders (tab, chips, +N, front card, status label, kebab), load-more, attention card and rows, stats card with 2 tiles. Nothing else: no left icon rail (D6), no floating toggle bar, no pink panel, no multicolor sparklines, no earnings, no marketing.

## 6.3 Patient Workspace shell (`/clinic/patients/[id]/*`) — ref-1 (make it a modal like page and when the user click close button it closed) + (also it should have cabability to expand or shrink according to data and be editable fields)

- **NotchHeader:** the canvas tab carries a white circular close button (returns to Provider Home) and the title "Patient workspace" from the copy deck. NEVER a specialty or department name. Right of the tab on the dark plum band: the 8 PillTabs in the exact order: Overview, AI Analytics, Visits, Medications, Labs, Imaging, Allergies, Genetics. The active tab is the white pill. If the width is short the tabs row is horizontally scrollable to reach out-of-screen tabs (plain horizontal scroll without arrow overlays or fade masks). All 8 are reachable at every width.
- **Overview** shows the IdentityCard instead of a context bar. **All other tabs** show a one-line **PatientContextBar** under the notch (avatar, name, "Sex · Age", MRN, and a critical-allergy chip when one exists). This bar and the "recorded by / when" caption under the metrics strip are the only elements added beyond the images, for patient-safety reasons.
- Tabs for unbuilt slices render a designed "Not available yet" state (never a blank panel).

## 6.4 Overview (`/overview`) — layout from ref-2, shell from ref-1

```
┌ NotchHeader ──────────────────────────────────────────────────────────────────────────────┐
│ [✕ Patient workspace]            (Overview)(AI Analytics)(Visits)(Medications)(Labs)(…)     │
├ canvas ───────────────────────────────────────────────────────────────────────────────────┤
│ ┌ IdentityCard ──────┐ ┌ MetricsStrip ───────────────────────────────────────────────────┐ │
│ │ [photo] Female, 24 │ │ Diagnosis       Pulse    Pressure   Oxygen   Temp      Glucose │ │
│ │         Full name  │ │ Hypertension    89 bpm   100/67     98 %     36.8 °C      83 mg/dL │ │
│ │ Social history   ↗ │ │ Recorded <date> by <name>                                          │ │
│ │ Care plan        ↗ │ └────────────────────────────────────────────────────────────────────┘ │
│ └────────────────────┘ (⚙)  [Office visits] [Medications] [Labs] [Procedures] [Hospitalizations] [Imaging]
│ ───────────────────────────── TIMELINE REGION (§7) ────────────────────────────────────(＋)─│
│ (＋)(－)  [ scrubber pill: density dots · year labels · dark visible window ]               │
│ ┌ Vital Signs History ↗ ──────────────┐ ┌ Records ↗ ────────┐ ┌ Labs ↗ ──────────────┐   │
│ │ Heart rate 89 bpm   (bubble: value) │ │ 7 Sep  [Office visit]│ │ Glucose 83 mg/dL     │   │
│ │ smooth line with marker             │ │ …                    │ │ RangeBar             │   │
│ └─────────────────────────────────────┘ └──────────────────────┘ └──────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

- **IdentityCard (ref-2):** about 22% wide, as tall as the metrics strip plus filter row. Photo (rounded square; neutral avatar placeholder when no photo), small "Sex, Age", bold name. At the bottom two stacked rounded rows: "Social history" (value: the text, e.g. the recorded habits) and "Care plan" (value: the active care-plan title). Each has an up-right arrow that opens an Overlay with the full text. A critical allergy chip appears under the name when one exists.
- **MetricsStrip (ref-1):** to the right of the card. Five columns, small label over large value with unit: Diagnosis (primary active diagnosis, large text), Pulse (bpm), Pressure (mmHg), Oxygen (%), Temperature (°C). Under the strip, one small caption line: "Recorded <date> by <name>". If a value is older than the patient's last visit, show its date in `inkMuted`. If D2 = "tiles", replace the strip with the Dr+ SystemTiles: one large accent tile (system with the highest share; label from data; percent; dark round arrow button) followed by four tiles of decreasing size in `inkMuted` and `inkSoft` with white text. The tiles are data-driven and hidden when no diagnosis has a body-system value.
- **FilterRow (both references):** a white round filter-sliders button, then six pills: Office visits, Medications, Labs, Procedures, Hospitalizations, Imaging. Multi-select. No selection means all kinds. Selected = white pill, unselected = `surface`. The sliders button resets the filter. There is no "All" pill. The row sits directly above the timeline, never above the identity card.
- **Timeline region:** §7. Fills the full width, height sized to its content, no dead area underneath.
- **Zoom buttons and scrubber:** a row below the timeline: two white CircleButtons (+ and −) and the scrubber pill (§7.5).
- **Bottom cards (ref-2)** in a 3-column row (about 45%, 27%, 27%), each a ModuleCard with a short handle line and the gentle raised hump at its top center and a circular up-right button at its top-right:
  1. **Vital Signs History:** label "Heart rate" with the latest value and unit; a smooth line over the last 30 days with a dot marker at the latest reading and a white bubble showing the value ("120 bpm" style) at the hovered/selected point. The ↗ button opens an Overlay with the full history and a metric switcher (Heart rate, Blood pressure, Oxygen, Temperature, Weight) as pills.
  2. **Records:** the most recent record as a RecordRow (day + month at left, rounded pill with a white circle icon and the title; visit rows use `recordVisit`). Shows up to 3 rows. ↗ opens the full record list.
  3. **Labs:** the latest result as a label (test name, value + unit) over a RangeBar with the dark marker at the value's position. Shows up to 2 tests. ↗ opens the Labs tab.
  The cards continue below the first viewport; the page scrolls inside the frame.
- **States:** the whole page has a skeleton; each region has its own empty state (for example "No vital signs yet" with an Add reading action, if the role may add).

INVENTORY: notch (close, title, 8 tabs), IdentityCard (photo, sex/age, name, 2 context rows, allergy chip), MetricsStrip + caption, filter round button + 6 pills, timeline region, zoom buttons, scrubber, 3 bottom cards with their ↗ buttons, the "+" end node. Nothing else: no vitals card grid, no ECG trend cards, no range pills (Week/Month/Months), no wavy decorations, no extra banners.

## 6.5 Other patient tabs — no authentic reference; same grammar, closed inventories

Common to all: PatientContextBar, then a title row with the module title at the left and, where the role may add, a "+" CircleButton at the right; content in ModuleCards; details open in an Overlay; unreviewed or new items carry a small accent dot; every list has a designed empty state with the relevant add action.

- **Visits (`/visits`, `/visits/[visitId]`):** list grouped by month (month heading + RecordRows, visit tint). Row click opens the Visit page: a three-segment pill (Before · During · After) showing the workflow state, and sections: reason, notes, vitals taken at the visit, orders, plan, follow-up date. Doctors write notes and plans; nurses add vitals; receptionists schedule. INVENTORY: month headings, rows, "+" new visit, the Visit page's segments and sections.
- **Medications (`/medications`):** pills "Current | History". Each row: MedicationChip (name with ×N doses/day), strength, route, start date, status label; row actions (doctor only): Change dose, Pause, Stop, and "Show on timeline" (opens Overview focused on that medication's start date, at the zoomed-in lens). "+" starts a medication. INVENTORY: the two pills, rows, row actions, "+".
- **Labs (`/labs`):** results grouped by date. Each test is a row with name, value + unit, RangeBar; clicking opens an Overlay with the trend (the values over time on a line with the reference band shaded). Unreviewed results show an accent dot; doctors have "Mark reviewed". "+" adds a result. INVENTORY: grouped rows, RangeBars, trend overlay, mark reviewed, "+".
- **Imaging (`/imaging`):** grid (3 columns) of ImagingThumbCards (modality chip, round arrow button, date under it). Click opens a viewer Overlay with the image and the report text. Media are reached only through short-lived signed access. "+" uploads a study. INVENTORY: the grid, viewer, "+".
- **Allergies (`/allergies`):** rows: substance, reaction, severity label, status. Doctors add and edit. A critical allergy also shows in the Overview identity card and the PatientContextBar. INVENTORY: rows, "+".
- **Genetics (`/genetics`):** restrained rows: finding, source document, date. Nothing decorative. INVENTORY: rows, "+".
- **AI Analytics (`/ai-analytics`, later slice):** ModuleCard with the question pills "What changed?", "What matters?", "Since last visit"; each answer is a short list of statements, every one with source chips that open the underlying event. A visible "AI-generated · <time>" label and a Regenerate button. "Save to note" requires an explicit confirm. Until the slice ships: "Not available yet".

## 6.6 Communication (later slice)

From the doctor dropdown: a right-side Sheet with a conversation list and a thread (messages, composer). Same primitives. No new visual language.

## 6.7 Patient Home (`/patient`) — layout from ref-4, theme from ref-1/ref-2

NotchHeader: tab titled "My care", no close button. Right: bell CircleButton, and avatar + name opening a dropdown (Language, Sign out). Canvas: a 2×2 arrangement (stacked on mobile):

```
┌ Next up ────────────────────────────┐ ┌ Health snapshot ───────────────────┐
│ (flat pill icon in a circle)        │ │ ┌ Blood pressure ───────────────┐  │
│ Medication reminder                 │ │ │ sparkline · last 122/81 mmHg  │  │
│ Medication name + strength (large)  │ │ │ Target 110–130 / 70–90        │  │
│ Take 1 tablet at 8:00 AM            │ │ └───────────────────────────────┘  │
│ [ Log taken ]                       │ │ ┌ Blood glucose ────────────────┐  │
└─────────────────────────────────────┘ │ │ last readings · Target 80–120 │  │
┌ Quick log ──────────────────────────┐ │ └───────────────────────────────┘  │
│ Symptoms: (fever)(cough)(headache)  │ └────────────────────────────────────┘
│ Vitals:   (heart rate)(weight)(mood)│ ┌ My care plan ──────────────────────┐
│ [ Add a quick note… ]               │ │ Daily checklist (2 of 3 done)      │
└─────────────────────────────────────┘ │ Next appointment · Goal            │
                                        └────────────────────────────────────┘
```

- **Next up:** the next due medication from the active plan. A flat line icon in a white circle (NO 3D pill, NO clock illustration). Caption, the medication name and strength in large text, the instruction, and a primary "Log taken" button (accent fill). If nothing is due: "Nothing due right now".
- **Health snapshot:** two ModuleCards. Blood pressure: a monochrome sparkline of the last readings, the last value with unit, the target range from the care plan. Blood glucose: the last readings as markers on a RangeBar-style strip, the target range. Units in mmHg and mg/dL.
- **Quick log:** two labeled groups of neutral white CircleButtons with line icons and labels: Symptoms (fever, cough, headache) and Vitals (heart rate, weight, mood). A tap opens a tiny Sheet to enter the value (symptoms: severity). Below, a pill note field "Add a quick note…". Saves go through the patient observation path (§9.3), marked "patient-reported" on the doctor's side.
- **My care plan:** a Daily checklist (checkbox rows, subtle "2 of 3 done"), the next appointment (doctor, date and time), and a goal line (for example "Maintain 66 kg").
- Heading text is plain ("Next up", "Health snapshot", "Quick log", "My care plan"). Never the leaked label "Next Action' Hero Card".

INVENTORY: notch (title, bell, profile menu), the four cards and their contents as listed. Nothing else: no tablet frame, no pastel buttons, no 3D, no points, no streaks.

## 6.8 Later screens (members, audit, earnings, billing, telehealth room, OCR verification)

No references. Each is built from the shared primitives, with an inventory table approved by the owner BEFORE coding. OCR verification: original image on one side, extracted fields on the other, low-confidence fields highlighted with an accent outline, every field editable, a single "Confirm" action; nothing is saved to the record before confirmation.

---

# 7. THE CLINICAL TIMELINE (the product's signature)

## 7.1 Principles

- Data-driven from the `care_events` index. Nothing hard-coded. Add, edit and delete an event and the timeline updates without a reload.
- D3 owns time math (scales, zoom behavior, quadtree collision queries). React renders the SVG/DOM from pure layout functions. D3 never mutates React-owned DOM. Per-frame motion during a gesture is imperative `transform` writes on existing marks (translate, never scale, so circles stay circular and text never stretches); structure (clusters, lanes, connectors) is recomputed when a gesture ends or the level changes.
- ONE component renders two lenses of the same data, chosen by zoom level: the zoomed-out lens from ref-2 and the zoomed-in lens from ref-1.

## 7.2 Data contract

`getTimeline(patientId, from, to, kinds[])` returns milestones and events:

- **Milestone** = a visit: `{ id, at, title }`.
- **Event**: `{ id, kind, at, endAt?, visitId?, label, value?, unit?, status?, flags }`.
- **Kinds and the filter row:** Office visits (visits and everything recorded at them: vitals, symptoms, ECG, patient-reported entries); Medications (started, changed, paused, stopped); Labs; Procedures; Hospitalizations; Imaging. Documents attach to their parent event.
- **Parent assignment:** `visitId` if present; otherwise the nearest previous milestone within 14 days; otherwise the event is an orphan (a dot on the axis, or a child hanging from the axis).
- Series for metric cards: `getSeries(patientId, metric, from, to)`.

## 7.3 Layout rules (what makes it look like the references)

**The axis.** A thin horizontal line across the region near its top, extending off both edges (it continues beyond the viewport). Month hairlines (faint vertical lines) mark month starts; month names sit at the bottom of the region (zoomed-out lens). A dark circle with "+" ends the axis at the right edge of the region (it opens the Add sheet).

**Milestones.** Accent circles with a document icon, sitting ON the axis at the visit's time. Diameter about 44 px (L2), 36 px (L3), 28 px (L1). Milestones closer than 1.2 node diameters merge into one cluster node with a count badge; zooming in splits them.

**Dots.** Small grey circles on the axis for events that are not drawn as branches at the current level; size grows with the count in the bucket (about 5–11 px).

**Connectors.** Axis-aligned segments only (vertical and horizontal) with every corner rounded by the token radius. Route: drop vertically from the axis (or from the milestone node's bottom) to the lane's y, run horizontally to the child's x, and, if needed, drop into the child. Never diagonal, never loose Béziers, no crossing other connectors (assign lanes to avoid crossings). Ink at reduced opacity, about 1 px.

**Zoom levels (px per day, tunable on the seeded data):**


| Level                                 | px/day   | What is drawn                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L1 (years)                            | &lt; 1.5 | small milestone nodes, grey density dots with counts, year/quarter labels. No branches.                                                                                                                                                                                                                                                                                                                                                                            |
| L2 (months) — DEFAULT, the ref-2 lens | 1.5–9    | milestones; per milestone, white circle child nodes (one per kind, with the kind icon and an accent count badge when more than one), hanging through rounded-elbow connectors, staggered horizontally so they never collide; imaging events with media show an ImagingThumbCard under their node; month names at the bottom.                                                                                                                                       |
| L3 (weeks) — the ref-1 lens           | 9–30     | each milestone expands: MedicationChips (for medication events in the interval) stacked at the left and joined by an elbow to compact fixed-width MetricCards (blood pressure first, then the metric most recently outside target), a SymptomsCard (chips), a WaveformCard (only when ECG waveform data exists), a lab RangeBar card. Date label at the milestone ("14 Aug") with an interval label under it ("2 weeks since previous visit", computed from data). |
| L4 (days)                             | ≥ 30     | every individual event gets its own node/card. Metric cards show per-reading points.                                                                                                                                                                                                                                                                                                                                                                               |


**MetricCard semantics (L3).** The card covers the period since the previous milestone. The sparkline plots the readings in that period; the dark value pill sits at the last reading; "Average" is the mean over the period; the delta pill compares that average with the previous period's average. Format: signed value with the metric's unit (for example "+10 mmHg"). A small red dot marks movement away from the target range; an accent-filled pill marks movement toward it; otherwise neutral. The tooltip says "change since previous visit": an association, never a causal claim. A degree sign appears only for temperature.

**Fixed-width modules.** Modules never stretch to fill the container. Width token about 256–280 px at 1470. When a column has more than two stacked modules, a vertical lane pager (two chevron pill buttons) appears at the left of that column and pages the lanes.

**Default view.** L2, spanning about the last 5 months ending now. The "+" end node stays at the right edge of the region.

**Transitions.** Level changes crossfade in about 150 ms; modules keep stable keys so the user perceives expansion, not replacement. Reduced motion: no transition.

## 7.4 Interaction

- Drag to pan; trackpad horizontal scroll pans; Ctrl/⌘ + wheel or pinch zooms around the cursor; the + and − buttons zoom around the viewport center (×1.5); double-click a milestone zooms to it (L3).
- Click an event node: an Overlay detail card anchored at the node with kind-specific content and an "Open in <tab>" link. Click a cluster: zoom into its range. Esc or click outside closes.
- Keyboard: nodes are focusable (roving tabindex); arrows move between nodes; Enter opens; + and − zoom; Home and End jump to the first and last events. A polite live region announces the visible date range.
- The filter row narrows the kinds shown and the scrubber density; the axis recomposes over the filtered set.

## 7.5 Scrubber (ref-2)

A white pill track below the timeline spanning the patient's full history (first event to one month after today). Inside: a density dot matrix (one column per week; up to 4 stacked dots by event count, `inkSoft`, larger dots for larger counts) and year labels along the bottom edge. A dark `ink` pill overlays the visible window, with tiny white dots and rounded end caps; drag the window to pan, drag the end caps to zoom. Two-way sync with the timeline. Left of the track: the + and − white CircleButtons. Density respects the active filter. Height about 44 px.

## 7.6 Performance

Render only marks in the viewport plus one screen on each side; cluster before render; keep the DOM under about 400 timeline nodes; 60 fps pan on the performance-test patient (5,000+ events); a latency budget for the timeline query defined in the plan and verified on the large patient.

## 7.7 Build steps (gated; owner approval after each; map to slices S4–S6 in §11)

- T1. Axis, month hairlines and labels, milestones, dots, from data, default view, L2 only. No zoom yet.
- T2. L2 children: icon nodes, count badges, rounded-elbow connectors, imaging thumbnail, end "+" node.
- T3. Pan, zoom, level switching, zoom buttons, double-click zoom.
- T4. Scrubber with two-way sync.
- T5. L3 lens: MedicationChips, MetricCards with average and delta, SymptomsCard, WaveformCard, lab card, interval labels, lane pager.
- T6. Filters, detail overlays, keyboard, add/edit from the timeline, performance patient.

After each step: Playwright screenshots (1470×1024 and 390×844, LTR and RTL) beside the reference crop (ref-2 for T1–T4, ref-1 for T5), with a deviation list; stop for approval.

## 7.8 Timeline acceptance

- On the seeded hero patient the default view shows at least 20 events across at least 4 month columns; at L3 at least two milestones expand with chips and metric cards.
- Everything comes from the database: adding a vital reading or medication from the UI changes the timeline immediately; deleting it (soft delete with undo) removes it.
- The "+" end node never overlaps a node; connectors never cross modules; no module is wider than its token; no dead area below the region.
- All 8 tabs and the filter row are in the places shown in §6.4.
- Deltas always carry the metric's unit.
- A keyboard-only user can reach and open any event.

---

# 8. DEMO DATA SYSTEM (fixes "every page is empty")

Rule: **no slice is accepted until the screens it touches render seeded data, and until the owner can add data through the real UI and watch it appear.**

## 8.1 Commands and tools

- `npm run db:reset` resets the local database and applies migrations.
- `npm run seed:demo` is idempotent and deterministic (seeded random generator, fixed timestamps relative to a fixed anchor date; no `now()` inside the generator logic). It runs only when `NODE_ENV` is not production. Accounts are created through the **O Auth admin API** (never by inserting into the auth schema). The service-role key is read only by this script and never reaches the app.
- `/dev/data` (development only; 404 in production; requires the owner account): a table of row counts per table and per patient, a "Reseed demo data" button, "Add 30 days of vitals to this patient", "Add a random visit to this patient", and links that open each patient's workspace. It uses the same server actions as the product.
- Dev sign-in buttons: one per seeded account, performing a REAL sign-in as that user. They never switch the role of the current session.
- A Playwright smoke test runs after seeding and asserts the minimum content in §8.4.

## 8.2 Accounts (dev password from an environment variable, never committed)

Organization A "Nile Care Clinic": `owner@`, `doctor@`, `nurse@`, `reception@`, `patient@` (linked to the hero patient). Organization B "Delta Family Clinic": `owner.b@` and one doctor (for cross-organization isolation tests). One unaffiliated account with no membership. All addresses use a reserved test domain.

## 8.3 Patients (organization A; all synthetic; names are not taken from any reference image)

1. **Mostafa Ibrahim, 54, M — the HERO patient.** Hypertension and type 2 diabetes. Full 18-month history (§8.5). Linked to `patient@`. Status: Follow-up.
2. **Fatma Hassan, 67, F.** Hypertension with chronic kidney disease (stage 3). About 12 visits over 2 years; eGFR and creatinine trending; an unreviewed abnormal lab. Status: Needs review.
3. **Omar Hany, 66, M.** Heart failure follow-up. An unreviewed CRITICAL lab (potassium 6.3 mmol/L) from today. Status: Critical.
4. **Ahmed Nabil, 41, M.** Asthma. 4 visits; inhaler medications; a mild symptom log. Status: Stable.
5. **Salma Reda, 29, F.** Hypothyroidism on levothyroxine; TSH every 3 months. Status: Stable.
6. **Kareem Tarek, 31, M.** Three routine visits, normal results. Status: Stable.
7. **Nour El-Sayed, 24, F.** NEW patient: demographics only, zero events (this exercises every designed empty state). Status: New.
8. **Layla Mahmoud, 58, F — the PERFORMANCE patient (dev flag only).** Five years of generated history, 5,000+ events, to test timeline performance.

Also create today's appointments (4–5) and a few attention items so that Provider Home is full.

## 8.4 Minimum content the smoke test asserts (hero patient)

At least 17 visits; at least 4 medications with start, change and stop events; at least 150 vital readings; at least 12 lab results across at least 5 dates; at least 2 imaging studies with image files; at least 10 symptom entries; 1 hospitalization; 2 ECG waveform samples; 1 allergy; at least 3 documents; the default timeline view shows at least 20 events across at least 4 month columns. Provider Home shows 8 folders (the performance patient may be hidden unless a flag is on). The new patient shows only empty states.

## 8.5 Hero patient clinical story (the owner, a clinician, must review for plausibility; values are illustrative)

Anchor "today" is the seed's fixed date. The 18 months before it:


| When            | Event                                                                                                                                                                                                                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| month 1, day 3  | Emergency department visit for hypertensive urgency; hospitalization 1 night.                                                                                                                                                                                                                                                      |
| month 1, day 10 | Visit 1 (new patient): diagnoses hypertension and type 2 diabetes. Start amlodipine 5 mg once daily; start metformin 500 mg twice daily. Labs: HbA1c 9.1 %, fasting glucose 168 mg/dL, LDL 162 mg/dL, creatinine 0.9 mg/dL. ECG: sinus rhythm (waveform sample). Symptom: headache. Allergy recorded: penicillin (rash, moderate). |
| months 2–3      | Visits 2–3, about monthly. Month 3: clinic BP still 152/94, amlodipine 5 → 10 mg; start atorvastatin 20 mg. Symptoms: dizziness after the increase; mild ankle swelling.                                                                                                                                                           |
| month 4         | Visit 4. Echocardiogram ordered.                                                                                                                                                                                                                                                                                                   |
| month 5         | Echo done (mild left ventricular hypertrophy, EF 60 %). Imaging study with image file.                                                                                                                                                                                                                                             |
| month 6         | Visit 5. HbA1c 8.2 %. BP 138/86.                                                                                                                                                                                                                                                                                                   |
| month 7         | Visit 6. BP 140/90 on amlodipine 10 mg: add perindopril 4 mg. Labs: potassium 4.3 mmol/L, creatinine 1.0.                                                                                                                                                                                                                          |
| month 8         | Visit 7. Dry cough (symptom) → STOP perindopril; START telmisartan 40 mg.                                                                                                                                                                                                                                                          |
| months 9–10     | Visits 8–9. BP 132/82 then 130/80. Month 10: HbA1c 7.4 %; metformin 500 → 850 mg twice daily.                                                                                                                                                                                                                                      |
| months 11–14    | Monthly visits; BP 128–132 / 78–82; LDL 98 mg/dL; ECG sample 2.                                                                                                                                                                                                                                                                    |
| month 15        | HbA1c 6.9 %.                                                                                                                                                                                                                                                                                                                       |
| months 16–17    | Stable visits.                                                                                                                                                                                                                                                                                                                     |
| month 18        | Latest visit; labs; next follow-up planned in the next 5 weeks.                                                                                                                                                                                                                                                                    |


Generator rules: home BP readings 2–3 per week (source: patient-reported) plus a clinic reading at every visit (source: staff). Systolic trends 168 → 128, diastolic 102 → 80 in steps after each medication change, with seeded noise of about ±6 and ±4. Pulse 78 ± 6. SpO₂ 97–99 %. Temperature 36.5–36.9 °C. Weight 94 → 88 kg. Fasting glucose 168 → 112 mg/dL. Every record carries provenance (created_by role, source, verification). Three prescription scans and one lab PDF are generated placeholder images/documents (clearly synthetic).

## 8.6 Add flows (real product features, also the way you create more demo data)

The "+" end node on the timeline and the "+" buttons on each tab open an Add sheet. Slice S7 builds: visit, vital reading, symptom, medication (start). Later slices add lab result, imaging upload, allergy, genetics. Each form is minimal, validated with Zod, saved through a server action under RLS, writes provenance, and updates the UI without a reload. A role that may not add a kind never sees that kind's form (§9.3).

---

# 9. DATA, AUTHORIZATION, AND HARD RULES

## 9.1 AGENTS.md (≤ 80 lines) must contain only

Project one-liner; the stack; commands (dev, test, seed, db reset, lint); the 12 hard rules of §9.4; the pointers "design: docs/design/, pages: docs/PACK.md §6, timeline: §7, demo data: §8, glossary: CONTEXT.md, decisions: docs/adr/"; and the evidence rule (§10.4). Nothing else. Long specs live in docs and are loaded only when the issue needs them.

## 9.2 Data model (Postgres; every table has `org_id` and RLS)

- Identity: `organizations`, `memberships(user_id, org_id, role)`, `invites`.
- People: `patients` (demographics, MRN sequence, status, `user_id` nullable link to the patient's account, photo path).
- Care: `visits`, `appointments`, `medications` + `medication_events` (start, change, pause, stop), `vital_observations` (metric, value, unit, `measured_at`, source), `symptoms`, `lab_results` (test, value, unit, reference low/high, status, reviewed_by), `imaging_studies` + media paths, `ecg_waveforms` (samples), `allergies`, `genetic_findings`, `procedures`, `hospitalizations`, `documents`, `diagnoses` (with an optional `body_system` for D2 tiles), `care_plans`, `care_tasks`.
- **`care_events`:** an index row per timeline-relevant record: `(id, org_id, patient_id, kind, occurred_at, ended_at, visit_id, source_table, source_id, label, summary, provenance fields)`. It is maintained by database triggers or the server write path in the same transaction as the source row. The timeline reads only this index plus series queries.
- **Provenance on every clinically meaningful row:** `source` (staff | doctor | patient | ocr | import | system), `created_by`, `created_at`, `updated_by`, `updated_at`, `verified_by`, `verified_at`, `ai_generated`. Soft delete (`deleted_at`) for clinical rows.
- Storage: private buckets; short-lived signed URLs; no public URLs for medical files.

## 9.3 Authorization (server-enforced; the UI only hides what the server forbids)

- Identity → membership → role is resolved on the server for every request. Two route groups with server guards (`/clinic/*`, `/patient/*`); the "sign in as" dev helper performs a real sign-in; there is NO role switcher, toggle, tab, query parameter or dev bar that changes privileges.
- **Write policy** (the "blood form" fix). There is no single clinical form shared by both experiences.
  - Staff entry (Doctor, Nurse per permission matrix): provider-authored records with provenance `staff`/`doctor`.
  - Patient entry: a separate, limited path for patient-generated observations only (home blood pressure, glucose, weight, heart rate, symptoms, mood). Stored with source `patient`, never verified, and unable to set provider-only fields (verification, diagnosis, orders, interpretation). Doctors see them marked "patient-reported".
  - Database: INSERT/UPDATE policies per table and role, plus constraints so a patient session cannot write a non-patient source or any verification field even by calling the API directly.
- **Permission matrix** (write it as a table in `docs/design/permissions.md` in S1): Owner/Admin (members, billing, audit); Doctor (all clinical read/write, verify, prescribe); Nurse (read; write vitals, symptoms, administrative data; no prescribing, no verification); Receptionist (patients' demographics and appointments; no clinical content); Patient (own record read; patient-generated observations write).
- **Tests (S1):** for each role, route access and direct database access, positive and negative; every forbidden write attempted directly against the API and the database as the wrong role is rejected; cross-organization reads return nothing; a patient session requesting a staff route is denied, and the reverse.

## 9.4 The 12 hard rules (also the content of AGENTS.md)

1. No clinical content, names, IDs or numbers in components. Everything renders from the database through the data layer. No component imports seed or fixture files.
2. No copying of any content from the reference images, including the word "Cardiology". Typos in the images are never copied.
3. Authentic references win over Gemini renders. Colors only from tokens. No raw color literals outside the token file. The yellow backdrop around the reference is never used as the page background.
4. The notch title shows the screen title from the copy deck. Never a specialty or department.
5. No role, dashboard or workspace switcher in the UI. Roles come from the server.
6. All UI text comes from the copy deck (English and Arabic). No specification or developer vocabulary in the UI.
7. Every page has a closed inventory. Nothing outside it exists. The inventory table is approved before coding.
8. Every clinical write goes through the server under RLS. No clinical data exists only in the browser.
9. Every value shows its unit; deltas carry the metric's unit; a degree sign only for temperature. "Change since" wording: an association, never causal.
10. No work from a later slice. One issue at a time. Vertical slices only.
11. Every slice must render seeded data and ship screenshot evidence. A passing build is necessary but never sufficient.
12. AI never decides: no autonomous diagnosis or prescribing; AI output stays a suggestion until a clinician confirms; uncertain OCR fields are flagged, never guessed.

## 9.5 Automated guards (run in CI and before every acceptance)

(a) no raw color literals outside the token file; (b) no user-facing string literals in components outside the copy deck; (c) a source scan that fails on a blocklist of reference sample content in application code (the reference patient names, "Cardiology", exact sample number strings such as "180/120" and "135/92"); (d) no imports of seed or fixture folders from application code; (e) a test that fails if any file under `src/app` renders a control that changes the session's role. Medication names may appear in seed data and the drug catalog only.

---

# 10. QUALITY GATES

## 10.1 Every page and tab has designed states

Loading skeleton (token-based, not "Loading…"), empty state with the relevant add action, error with retry, permission-denied, saving/pending. Never a blank panel.

## 10.2 Responsive

Desktop 1470×1024, tablet 1024, mobile 390×844. Mobile is not a shrunk desktop: the timeline gets touch-first controls and a compact scrubber; the three bottom cards stack; the workspace tabs collapse to a scrollable pill row with an overflow menu; folders become 1–2 columns.

## 10.3 Accessibility

Keyboard reachability for every control; visible focus; sufficient contrast on `canvas` and `frame`; touch targets at least 44 px; reduced motion; screen-reader labels for timeline nodes, icon buttons and status labels.

## 10.4 Evidence (every UI issue)

Save to `docs/evidence/<issue>/`: Playwright screenshots at 1470×1024 and 390×844 in English/LTR and Arabic/RTL; the matching reference crop beside each screenshot; the deviation list; test, guard and RLS output. Without these an issue is not done.

## 10.5 Owner's 10-point check (you do this after each UI issue)

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

# 11. VERTICAL SLICES (the issue list for to-issues; one at a time)

Each slice includes its migrations, server logic, UI, seed data, tests, evidence and a demo script for the owner.

**Core (the product must be fully usable and approved before anything below "Later")**

- **S0 Foundation.** Repo, lean AGENTS.md, CONTEXT.md, ADRs; tokens file measured from ref-1/ref-2 (`docs/design/tokens.md`); AppFrame, NotchHeader and all shared components (§4.5) with every state in `/dev/gallery` using mock props; copy deck mechanism (EN/AR, RTL with logical properties); the guards of §9.5 in CI; N local; auth (login, signup, invite, reset); membership and role resolution; the two route groups with guards; seeded accounts (admin API). Demo: sign in as each role and land on its own empty shell; the gallery compared against the references. D5 (the frame margin) proposed with a screenshot.
- **S1 Domain core + RLS + the complete demo dataset + `/dev/data`.** All tables of §9.2 with RLS; the permission matrix; the full RLS test suite; the seed of §8 (all 8 patients, the hero story, the performance patient behind a flag); the `care_events` index; repository/query functions (`getPatients`, `getPatient`, `getTimeline`, `getSeries`, mutations that write provenance). Demo: `/dev/data` shows the counts and the hero patient's data in raw tables. Negative authorization tests all pass.
- **S2 Provider Home.** §6.2 with real data. Demo: eight folders with correct chips, statuses and last visit; search; the four filters; schedule; attention list; stats; empty state for the new patient's folder content; 1,000-patient pagination test.
- **S3 Patient Workspace shell + Overview (static regions).** §6.3 and §6.4 without the timeline: notch with 8 tabs, IdentityCard with the two overlays, MetricsStrip with the caption, FilterRow, bottom cards with their ↗ overlays, PatientContextBar on other tabs, designed placeholders for unbuilt tabs. Demo: the hero patient's Overview matches ref-2/ref-1 outside the timeline region.
- **S4 Timeline T1 + T2** (§7.7): axis, milestones, dots, month labels, L2 children, connectors, imaging thumbnail, end node. Demo: the hero's default view against ref-2.
- **S5 Timeline T3 + T4:** pan, zoom, levels, buttons, scrubber with two-way sync.
- **S6 Timeline T5 + T6:** the L3 lens (chips, metric cards, deltas, symptoms, waveform, lab card, interval labels, lane pager), filters, detail overlays, keyboard, performance patient.
- **S7 Add flows from the timeline and tabs:** visit, vital reading, symptom, medication start; role-aware (a nurse cannot start a medication; the patient path is separate).
- **S8 Medications tab** (lifecycle: change, pause, stop; "Show on timeline").
- **S9 Visits tab and the Visit page** (before / during / after).
- **S10 Labs tab** (RangeBars, trend overlay, review).
- **S11 Imaging tab** (grid, viewer, upload, signed access).
- **S12 Allergies and Genetics tabs.**
- **S13 Patient Home** (§6.7, patient routes only, patient observation path, care plan checklist).

**Later (only after S0–S13 are approved; each gets its own PRD, inventory and slices)**

- L1 Prescription OCR + verification (needs D8, D9). L2 AI Analytics (§6.5). L3 Communication in-app, then WhatsApp and Telegram adapters. L4 Telehealth. L5 Payments. L6 Offline and sync (local draft → queued → syncing → synced / failed / conflict; never claim "saved" while local). L7 FHIR mapping. L8 Security and compliance hardening (including the compliance gate of D10 before any real data) and final QA.

**Post-release only:** native mobile apps; predictive risk models (only with a clinical validation methodology); integrations with external lab/PACS/pharmacy systems.

---

# 12. KICKOFF PROMPTS (paste in order)

## K1 — Split the pack and set up the repo (once)

```text
Read docs/PACK.md completely. Do not write application code yet.

1. Create a lean AGENTS.md (≤ 80 lines) exactly as specified in §9.1.
2. Create CONTEXT.md with the glossary in Appendix A.
3. Create docs/adr/ with the decision records listed in Appendix B (each ≤ 30 lines, from §2).
4. Split §4–§8 into docs/design/ files: tokens.md (leave values to be measured in S0), components.md, pages.md (§6), timeline.md (§7), demo-data.md (§8), permissions.md (stub, filled in S1).
5. Check that docs/reference/ contains the images named in §3. List any that are missing.
6. Report: contradictions you found in the pack, decisions in §2.2 that are still open, and anything in the references you cannot determine. Ask me before assuming.
Do not add anything that is not in the pack.
```

## K2 — Grill, PRD, issues

```text
Use the grilling skill on the open decisions in docs/PACK.md §2.2 and on anything ambiguous in §6 and §7. Ask one question at a time, with your recommended answer. When we are done, record the answers in docs/adr/.
Then use the PRD skill to write a PRD for the Core scope (slices S0–S13 only).
Then use the issues skill to turn the PRD into vertical-slice issues following §11 exactly: each issue contains migrations, server logic, UI, seed data, tests, evidence and a demo script. No horizontal issues. No Later items.
```

## K3 — Per issue (repeat)

```text
Work on issue <ID> only. Follow the tdd skill.
Before coding any UI: output the inventory table for each page or component you will touch (element → region of the reference image → data field or copy key). Wait for my approval.
Then implement with seeded data (docs/design/demo-data.md). Run the guards (§9.5) and all tests. Produce the evidence folder (§10.4) and stop. Do not start another issue. Do not touch anything outside this issue.
If the reference image and the pack disagree, stop and ask.
```

## K4 — Review and bug fixing

```text
Review the diff since <commit> with the code-review skill against docs/PACK.md and the hard rules in §9.4. Report violations with file and line. Do not fix them in the same step.
For bugs, use the diagnose skill: reproduce first, then a minimal fix, then a regression test.
```

---

# APPENDIX A — CONTEXT.md glossary (domain language)

- **Patient folder**: the visual representation of a patient on Provider Home (open folder with a tab, record-kind chips, front card).
- **Workspace**: the page for one patient with 8 tabs.
- **Milestone**: a visit node on the timeline axis.
- **Care event**: one row in the unified index of timeline-relevant records. The timeline is a projection of care events.
- **Lens**: the way the timeline draws a milestone at a zoom level. Zoomed-out lens (L2, from ref-2) = icon nodes. Zoomed-in lens (L3, from ref-1) = medication chips and metric cards.
- **Delta / change since**: the difference between a metric's average in this period and the previous period. An association, not causation.
- **Provenance**: who/what created a record and whether a clinician verified it.
- **Patient-reported**: a record created through the patient observation path (source = patient).
- **Copy deck**: the per-language file of every UI string.
- **Slice**: a vertical unit of work (schema + server + UI + seed + test + evidence).
- **Inventory**: the closed list of elements a page may contain.

# APPENDIX B — ADRs to write in K1/K2

1. One backend: (stack). 2. Roles and routing (no switcher; server-enforced). 3. Reference authority (§3, Gemini overview retired). 4. Timeline engine (D3 math + React render; two lenses; levels). 5. Demo data and dev tools. 6. Copy deck, languages and units. 7. Folder colors (D4). 8. Overview top-right slot (D2). 9. Frame margin (D5).

# END OF PACK