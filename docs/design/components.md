# Shared components

Build once in S0. Every component shows **every state** in `/dev/gallery` using mock props
— the gallery is the reference the owner compares against `ref-1`/`ref-2`. Mock props live
only in the gallery; components never import seed or fixture files (hard rule 1).

## 1. AppFrame

Dark plum rounded frame filling the viewport (ADR-0009); the canvas sits inside it.

**The frame is banded, not a uniform border** (ADR-0012): the top band (NotchHeader) and
bottom band use `frame` `#2D1B3D`, while the left/right sides use `frameSide` `#4A3558`.
The two plum tones read as one family. Frame radius ~42–43 px
at 1470. The yellow at the corners is the presentation backdrop and is never rendered.

- States: default; with content taller than the viewport (scrolls inside the frame).

## 2. NotchHeader

Dark plum band across the top. At the left the canvas rises into a tab that carries
(optionally) a white circular close button and the screen title; the tab joins the canvas
through a concave curve. Right of the tab the plum band carries pills or controls. Title
text comes from the copy deck. The close button returns to the previous screen.

- States: with close button (workspace); without (Provider Home, Patient Home, auth);
  tabs fitting; tabs overflowing into a "More" pill; the workspace's horizontally
  scrollable 8-tab row with a muted/faded tail — no arrow buttons.

## 3. PillTabs

White active pill (with its icon); inactive pills in `surface` with icon + label; fully
rounded; compact height.

- States: one active; none active (filter rows only); all inactive; collapsed to "More".

## 4. CircleButton

White circle, line icon. Variants: search, filter-sliders, up-right arrow, plus, minus,
close, chevrons.

- States: default; hover; focus-visible (visible focus ring); disabled; with count dot
  (bell, unread only).

## 5. FilterRow

A round filter-sliders button followed by pills. Selected pills white, unselected
`surface`. The sliders button resets the filter.

- States: nothing selected (= all kinds, there is no "All" pill); one selected; several
  selected; reset applied.

## 6. IdentityCard

Rounded `surface` card. Photo (rounded; neutral avatar placeholder when none), small
"Sex, Age" label, bold name, then stacked rows each with a label, a value and an up-right
arrow. A critical-allergy chip appears under the name when one exists.

- States: with photo; initials fallback; no social history / no care plan (row hidden);
  critical allergy chip present; overlay open with the full text.

## 7. MetricsStrip

Columns of small label over large value with unit. Five columns: Diagnosis, Pulse,
Pressure, Oxygen, Temperature. ADR-0008 governs the tiles alternative.

- States: all fresh; stale value showing its date in `inkMuted`; a missing metric column;
  RTL (columns order correctly).

## 8. ModuleCard

`surfaceRaised` card with title (left), optional circular up-right arrow button (right),
content, and (bottom cards only) a short handle line with a gentle raised hump at top
center.

- States: with arrow; without; empty content region (renders the caller's empty state);
  loading skeleton.

## 9. RecordRow

Left date (day number + month), then a rounded pill with a white circle icon and the
record title. Visit rows use `recordVisit` tint.

- States: visit tinted; other kind neutral; long title truncated; click target ≥44 px.

## 10. RangeBar

Hatched neutral bar with thin colored segments (low / borderline / normal / borderline /
high) and a dark marker dot at the true value position. Label above: test name, value +
unit.

- States: value in each zone; missing reference range (no segments, marker only); RTL.

## 11. MedicationChip

Dark-grey pill with a white circle icon at the left, name, and a `×N` multiplier meaning
doses per day.

- States: ×1 (multiplier hidden per design decision — confirm in grill); ×2+; paused and
  stopped treatments.

## 12. MetricCard (timeline, L3)

Title, circular up-right button, small day label, hatched sparkline with accent fill, a
dark value pill at the selected reading, "Average …" bottom-left, delta pill bottom-right.

- States: improving (accent-filled delta pill); worsening (small red dot); neutral;
  single reading (no sparkline); reduced motion.

## 13. ChipSet (symptoms) · WaveformCard (ECG) · ImagingThumbCard

- **ChipSet:** symptom chips, empty set shows the empty state.
- **WaveformCard:** ECG with softly highlighted regions; only rendered when waveform data
  exists — never a placeholder trace.
- **ImagingThumbCard:** rounded image, dark modality label chip at top-left, dark round
  arrow button at bottom-right. No media → the card is not rendered.

## 14. TimelineNode variants

| Variant | Appearance |
| --- | --- |
| Milestone | accent circle with a document icon, on the axis |
| Child | white circle with a kind icon, optional accent count badge |
| Dot | small grey circle, 5–11 px by bucket count |
| End node | dark circle with "+" (opens the Add sheet) |
| Cluster | merged milestones with a count badge; zoom splits it |

- States: focusable with visible focus; selected; count badge >9; cluster at each lens.

## 15. Scrubber

See `timeline.md` §Scrubber.

## 16. Overlay / Sheet

Details and forms. Focus trap, scroll lock, Escape closes, click outside closes.

- States: open; nested (do not double trap); scrollable content; form with validation
  errors; saving indicator; reduced motion.

## 17. State components (every region, every page)

| State | Design |
| --- | --- |
| Loading | token-based skeleton — never the text "Loading…" |
| Empty | designed empty state with the relevant "add" action |
| Error | message + retry |
| Permission denied | designed, explains nothing about the data |
| Saving / pending | indicator on the control that triggered the write |

Never a blank panel. Unbuilt tabs render a designed "Not available yet" state.

## Gallery requirement

`/dev/gallery` renders each component with mock props at all listed states, in English/LTR
and Arabic/RTL. The owner compares it against the reference crops before S0 is approved.
