# Demo data system

**Rule: no slice is accepted until the screens it touches render seeded data, and until the
owner can add data through the real UI and watch it appear.** Governed by ADR-0005.

## Commands and tools

- `npm run db:reset` resets the local database and applies migrations.
- `npm run seed:demo` is **idempotent and deterministic** — seeded PRNG, fixed timestamps
  relative to a fixed anchor date, **no `now()` inside the generator logic**. Runs only when
  `NODE_ENV` is not production. Accounts are created through the **Neon Auth admin API**,
  never by inserting into the auth schema. The service-role key is read only by this script
  and never reaches the app.
- `/dev/data` (development only, 404 in production, owner account required): a table of row
  counts per table and per patient, a "Reseed demo data" button, "Add 30 days of vitals to
  this patient", "Add a random visit to this patient", and links opening each patient's
  workspace. It uses the **same server actions as the product**.
- **Dev sign-in buttons:** one per seeded account, performing a REAL sign-in as that user.
  They never switch the role of the current session.
- A Playwright smoke test runs after seeding and asserts the minimum content below.

## Accounts (dev password from an environment variable, never committed)

- Organization A **"Nile Care Clinic"**: `owner@`, `doctor@`, `nurse@`, `reception@`,
  `patient@` (linked to the hero patient). Organization B **"Delta Family Clinic"**:
  `owner.b@` and one doctor (for cross-organization isolation tests). One unaffiliated account
  with no membership. All addresses use a reserved test domain.

The seed must populate `appointments.actual_start` / `actual_end` (ADR-0010) or the Wait
times tile renders empty on Provider Home.

## Patients (organization A; all synthetic; names are NOT taken from any reference image)

| # | Patient | Status | Story |
| --- | --- | --- | --- |
| 1 | **Mostafa Ibrahim, 54, M — HERO** | Follow-up | Hypertension + type 2 diabetes. Full 18-month history below. Linked to `patient@`. |
| 2 | Fatma Hassan, 67, F | Needs review | Hypertension with CKD stage 3. ~12 visits over 2 years; eGFR and creatinine trending; an unreviewed abnormal lab. |
| 3 | Omar Hany, 66, M | Critical | Heart failure follow-up. An unreviewed CRITICAL lab (potassium 6.3 mmol/L) from today. |
| 4 | Ahmed Nabil, 41, M | Stable | Asthma. 4 visits; inhaler medications; a mild symptom log. |
| 5 | Salma Reda, 29, F | Stable | Hypothyroidism on levothyroxine; TSH every 3 months. |
| 6 | Kareem Tarek, 31, M | Stable | Three routine visits, normal results. |
| 7 | Nour El-Sayed, 24, F | New | Demographics only, zero events — exercises every designed empty state. |
| 8 | Layla Mahmoud, 58, F | — | **PERFORMANCE patient (dev flag only).** Five years of generated history, 5,000+ events. |

Also create today's appointments (4–5) and a few attention items so Provider Home is full.

## Minimum content the smoke test asserts (hero patient)

≥17 visits · ≥4 medications with start, change and stop events · ≥150 vital readings ·
≥12 lab results across ≥5 dates · ≥2 imaging studies with image files · ≥10 symptom
entries · 1 hospitalization · 2 ECG waveform samples · 1 allergy · ≥3 documents · the
default timeline view shows ≥20 events across ≥4 month columns. Provider Home shows 8
folders (the performance patient may be hidden unless a flag is on). The new patient shows
only empty states.

## Hero patient clinical story

**The owner, a clinician, must review this for plausibility; values are illustrative.**
Anchor "today" is the seed's fixed date. The 18 months before it:

| When | Event |
| --- | --- |
| month 1, day 3 | Emergency department visit for hypertensive urgency; hospitalization 1 night. |
| month 1, day 10 | Visit 1 (new patient): diagnoses hypertension and type 2 diabetes. Start amlodipine 5 mg once daily; start metformin 500 mg twice daily. Labs: HbA1c 9.1 %, fasting glucose 168 mg/dL, LDL 162 mg/dL, creatinine 0.9 mg/dL. ECG: sinus rhythm (waveform sample). Symptom: headache. Allergy recorded: penicillin (rash, moderate). |
| months 2–3 | Visits 2–3, about monthly. Month 3: clinic BP still 152/94, amlodipine 5 → 10 mg; start atorvastatin 20 mg. Symptoms: dizziness after the increase; mild ankle swelling. |
| month 4 | Visit 4. Echocardiogram ordered. |
| month 5 | Echo done (mild left ventricular hypertrophy, EF 60 %). Imaging study with image file. |
| month 6 | Visit 5. HbA1c 8.2 %. BP 138/86. |
| month 7 | Visit 6. BP 140/90 on amlodipine 10 mg: add perindopril 4 mg. Labs: potassium 4.3 mmol/L, creatinine 1.0. |
| month 8 | Visit 7. Dry cough (symptom) → STOP perindopril; START telmisartan 40 mg. |
| months 9–10 | Visits 8–9. BP 132/82 then 130/80. Month 10: HbA1c 7.4 %; metformin 500 → 850 mg twice daily. |
| months 11–14 | Monthly visits; BP 128–132 / 78–82; LDL 98 mg/dL; ECG sample 2. |
| month 15 | HbA1c 6.9 %. |
| months 16–17 | Stable visits. |
| month 18 | Latest visit; labs; next follow-up planned in the next 5 weeks. |

**Generator rules.** Home BP readings 2–3 per week (source: patient-reported) plus a clinic
reading at every visit (source: staff). Systolic trends 168 → 128, diastolic 102 → 80 in
steps after each medication change, with seeded noise of about ±6 and ±4. Pulse 78 ± 6.
SpO₂ 97–99 %. Temperature 36.5–36.9 °C. Weight 94 → 88 kg. Fasting glucose 168 → 112
mg/dL. **Every record carries provenance** (created_by role, source, verification). Three
prescription scans and one lab PDF are generated placeholder images/documents, clearly
synthetic.

## Add flows (real product features, also the way you create more demo data)

The "+" end node on the timeline and the "+" buttons on each tab open an Add sheet. Slice S7
builds: visit, vital reading, symptom, medication (start). Later slices add lab result,
imaging upload, allergy, genetics. Each form is minimal, validated with Zod, saved through a
server action under RLS, writes provenance, and updates the UI without a reload. **A role
that may not add a kind never sees that kind's form.**
