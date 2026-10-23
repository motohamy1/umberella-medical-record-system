# ADR-0010: Provider Home chrome — icon rail and stats

**Status:** Accepted · **Date:** 2026-10-13 · **Decides:** D6, D7

## Context

Provider Home has no authentic reference — only the Gemini render `ref-3`, which is
layout-only. The pack defaults were to omit its unlabeled left icon rail (D6) and to show
only Total patients and Completed today (D7). The owner overrode both defaults.

## Decision

**Left icon rail (D6 — owner override of the pack default).** A narrow rail of white
CircleButtons with line icons, restyled with the authentic theme (no pastel circles, no
neumorphism). Only two destinations ship, both real routes:

| Icon | Destination |
| --- | --- |
| Patients | `/clinic` (Provider Home itself) |
| Schedule | today's schedule, promoted to its own clinic-level page |

Visits, Medications and Labs are **per-patient tabs inside a workspace**, not clinic-level
pages; Settings does not exist. Four of the render's six icons therefore ship later, each
as its own slice with an owner-approved inventory. The rail is **not** a switcher of any
kind and never changes privileges (hard rule 5).

Every rail icon carries an accessible label (hover/focus tooltip plus screen-reader name)
and a ≥44 px touch target — an unlabeled rail would fail §10.3.

**Stats (D7 — owner override).** The "Today" card shows four tiles: Total patients,
Completed today, **Wait times**, **New admits**. Wait time needs two columns §9.2 does not
define, added in S1's migration:

- `appointments.actual_start`, `appointments.actual_end` (timestamptz, nullable)
- wait time = `actual_start − scheduled_start`, shown as a median for the day
- New admits = patients whose first-ever visit is today, derived from `visits` (no new
  column)

All four tiles use monochrome `ink` sparklines. Never multicolour.

## Consequences

- S1's migration carries two new `appointments` columns; the seed must populate them or
  Wait times renders empty.
- The Schedule page is new surface with no reference — it needs an inventory approved
  before coding.
- Reversal is cheap: the rail is a list of links; dropping a tile is deleting one entry.
