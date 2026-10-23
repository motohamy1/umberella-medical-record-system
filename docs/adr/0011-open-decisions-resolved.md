# ADR-0011: Open decisions resolved (D1, D2, D4, D5, D12) and accepted risks

**Status:** Accepted · **Date:** 2026-10-13

## Resolved

| ID | Decision | Answer |
| --- | --- | --- |
| **D1** | Languages | Arabic + English from day one, RTL via logical CSS properties. Every slice's evidence includes Arabic/RTL screenshots. (Confirms ADR-0006.) |
| **D2** | Overview top-right slot | **MetricsStrip** from ref-1. Tiles deferred; ADR-0008 keeps the alternative. |
| **D4** | Folder colors | **Neutral bodies**, status as four label styles only. ADR-0007 keeps the muted-tint alternative. |
| **D5** | Frame margin | **Frame fills the viewport**, no margin. S0 still proposes this with a screenshot. |
| **D12** | Staff who is also a patient | **Two accounts, no switcher.** Confirms ADR-0002 and hard rule 5. |

ADR-0007, ADR-0008 and ADR-0009 move from *Proposed* to **Accepted** on these answers.

## L3 lane algorithm (fills the §7.3 gap)

§7.3 lists what L3 draws but never how connectors avoid crossing or how the region's
height is computed. Resolved as: assign each milestone a horizontal lane slot; order lanes
so connectors never cross (a milestone's children always run to its own side, milestones
sorted by time); compute region height as the deepest lane stack, re-measured when the
level or filter changes. Recorded in `docs/design/timeline.md`.

## Accepted risks (recorded, not silently ignored)

1. **The hero clinical story ships unreviewed.** §8.5 requires a clinician to review the
   18-month hypertension + type 2 diabetes trajectory for plausibility; the owner chose to
   ship it as synthetic demo data. Consequence: every visual gate from S1 onward compares
   against data no clinician has signed off. If a screenshot looks wrong, check the story
   before blaming the renderer. Reopen by editing `docs/design/demo-data.md`.
2. **D8 and D9 are still open** (drug catalog source; OCR provider and image consent).
   Both are needed only at the OCR slice, so neither is recorded as an ADR yet.
3. **D10 and D11 are deferred** to post-production by the owner — hosting region and legal
   review under Egypt PDPL 151/2020; telehealth, payments and WhatsApp Business. Nothing in
   the Core scope depends on them, but no real patient data may enter the system before D10
   clears.
