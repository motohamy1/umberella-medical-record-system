# The clinical timeline — the product's signature

Governed by ADR-0004: D3 owns time math, React renders from pure layout functions, one
component draws two lenses.

## Principles

- Data-driven from the `care_events` index. Nothing hard-coded. Add, edit and delete an
  event and the timeline updates **without a reload**.
- D3 never mutates React-owned DOM. Per-frame motion during a gesture is imperative
  `transform` writes on existing marks — **translate, never scale**, so circles stay
  circular and text never stretches. Structure (clusters, lanes, connectors) is recomputed
  when a gesture ends or the level changes.

## Data contract

`getTimeline(patientId, from, to, kinds[])` returns milestones and events:

- **Milestone** = a visit: `{ id, at, title }`.
- **Event**: `{ id, kind, at, endAt?, visitId?, label, value?, unit?, status?, flags }`.
- **Kinds and the filter row:** Office visits (visits and everything recorded at them —
  vitals, symptoms, ECG, patient-reported entries); Medications (started, changed, paused,
  stopped); Labs; Procedures; Hospitalizations; Imaging. Documents attach to their parent
  event.
- **Parent assignment:** `visitId` if present; otherwise the nearest previous milestone
  within 14 days; otherwise the event is an orphan (a dot on the axis, or a child hanging
  from the axis).
- Series for metric cards: `getSeries(patientId, metric, from, to)`.

## Layout rules

**The axis.** A thin horizontal line across the region near its top, extending off both
edges (it continues beyond the viewport). Month hairlines (faint vertical lines) mark month
starts; month names sit at the bottom of the region (zoomed-out lens). A dark circle with
"+" ends the axis at the right edge of the region and opens the Add sheet.

**Milestones.** Accent circles with a document icon, sitting ON the axis at the visit's
time. Diameter ~44 px (L2), 36 px (L3), 28 px (L1). Milestones closer than 1.2 node
diameters merge into one cluster node with a count badge; zooming in splits them.

**Dots.** Small grey circles on the axis for events not drawn as branches at the current
level; size grows with the count in the bucket (~5–11 px).

**Connectors.** Axis-aligned segments only (vertical and horizontal) with every corner
rounded by the token radius. Route: drop vertically from the axis (or from the milestone
node's bottom) to the lane's y, run horizontally to the child's x, and, if needed, drop into
the child. **Never diagonal, never loose Béziers, no crossing other connectors** — assign
lanes to avoid crossings. Ink at reduced opacity, ~1 px.

**Zoom levels** (px per day, tunable on the seeded data):

| Level | px/day | What is drawn |
| --- | --- | --- |
| **L1** years | < 1.5 | small milestone nodes, grey density dots with counts, year/quarter labels. No branches. |
| **L2** months — DEFAULT, the ref-2 lens | 1.5–9 | milestones; per milestone, white circle child nodes (one per kind, with the kind icon and an accent count badge when more than one), hanging through rounded-elbow connectors, staggered horizontally so they never collide; imaging events with media show an ImagingThumbCard under their node; month names at the bottom. |
| **L3** weeks — the ref-1 lens | 9–30 | each milestone expands: MedicationChips (for medication events in the interval) stacked at the left and joined by an elbow to compact fixed-width MetricCards (blood pressure first, then the metric most recently outside target), a SymptomsCard (chips), a WaveformCard (only when ECG waveform data exists), a lab RangeBar card. Date label at the milestone ("14 Aug") with an interval label under it ("2 weeks since previous visit", computed from data). |
| **L4** days | ≥ 30 | every individual event gets its own node/card. Metric cards show per-reading points. |

**MetricCard semantics (L3).** The card covers the period since the previous milestone. The
sparkline plots the readings in that period; the dark value pill sits at the last reading;
"Average" is the mean over the period; the delta pill compares that average with the
previous period's average. Format: signed value with the metric's unit (e.g. "+10 mmHg"). A
small red dot marks movement away from the target range; an accent-filled pill marks
movement toward it; otherwise neutral. The tooltip says "change since previous visit" —
**an association, never a causal claim**. A degree sign appears only for temperature.

**Fixed-width modules.** Modules never stretch to fill the container. Width token
~256–280 px at 1470. When a column has more than two stacked modules, a vertical lane pager
(two chevron pill buttons) appears at the left of that column and pages the lanes.

**Lane assignment and region height (ADR-0011).** §7.3 originally listed what L3 draws
without saying how connectors avoid crossing or how the region's height is computed.
Resolved: assign each milestone a horizontal lane slot; order lanes so connectors never
cross — a milestone's children always run to its own side, milestones sorted by time;
compute region height as the deepest lane stack, re-measured when the level or filter
changes. This is what delivers "no dead area underneath".

**Default view.** L2, spanning about the last 5 months ending now. The "+" end node stays
at the right edge of the region.

**Transitions.** Level changes crossfade in ~150 ms; modules keep stable keys so the user
perceives expansion, not replacement. Reduced motion: no transition.

## Interaction

- Drag to pan; trackpad horizontal scroll pans; Ctrl/⌘ + wheel or pinch zooms around the
  cursor; the + and − buttons zoom around the viewport center (×1.5); double-click a
  milestone zooms to it (L3).
- Click an event node: an Overlay detail card anchored at the node with kind-specific
  content and an "Open in <tab>" link. Click a cluster: zoom into its range. Esc or click
  outside closes.
- Keyboard: nodes are focusable (roving tabindex); arrows move between nodes; Enter opens;
  + and − zoom; Home and End jump to the first and last events. A polite live region
  announces the visible date range.

## Scrubber (ref-2)

A white pill track below the timeline spanning the patient's full history (first event to
one month after today). Inside: a density dot matrix (one column per week; up to 4 stacked
dots by event count, `inkSoft`, larger dots for larger counts) and year labels along the
bottom edge. A dark `ink` pill overlays the visible window, with tiny white dots and rounded
end caps; drag the window to pan, drag the end caps to zoom. **Two-way sync with the
timeline.** Left of the track: the + and − white CircleButtons. Density respects the active
filter. Height ~44 px.

## Performance

Render only marks in the viewport plus one screen on each side; cluster before render; keep
the DOM under ~400 timeline nodes; 60 fps pan on the performance-test patient (5,000+
events); a latency budget for the timeline query defined in the plan and verified on the
large patient.

## Build steps (gated; owner approval after each; maps to slices S4–S6)

| Step | Builds | Gate reference |
| --- | --- | --- |
| **T1** | Axis, month hairlines and labels, milestones, dots, from data, default view, L2 only. No zoom yet. | ref-2 |
| **T2** | L2 children: icon nodes, count badges, rounded-elbow connectors, imaging thumbnail, end "+" node. | ref-2 |
| **T3** | Pan, zoom, level switching, zoom buttons, double-click zoom. | ref-2 |
| **T4** | Scrubber with two-way sync. | ref-2 |
| **T5** | L3 lens: MedicationChips, MetricCards with average and delta, SymptomsCard, WaveformCard, lab card, interval labels, lane pager. | ref-1 |
| **T6** | Filters, detail overlays, keyboard, add/edit from the timeline, performance patient. | both |

After each step: Playwright screenshots (1470×1024 and 390×844, LTR and RTL) beside the
reference crop, with a deviation list; **stop for approval**.

## Timeline acceptance

- On the seeded hero patient the default view shows at least 20 events across at least 4
  month columns; at L3 at least two milestones expand with chips and metric cards.
- Everything comes from the database: adding a vital reading or medication from the UI
  changes the timeline immediately; deleting it (soft delete with undo) removes it.
- The "+" end node never overlaps a node; connectors never cross modules; no module is wider
  than its token; no dead area below the region.
- All 8 tabs and the filter row are in the places shown in `pages.md` §6.4.
- Deltas always carry the metric's unit.
- A keyboard-only user can reach and open any event.
