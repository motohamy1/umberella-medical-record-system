# ADR-0004: Timeline engine — D3 math, React render, two lenses

**Status:** Accepted · **Date:** 2026-10-13 · **Decides:** §2.1, §7

## Context

The first build's timeline was written against an empty dataset with a static dev-gallery
preview, so layout, lanes, branches and semantic zoom were never exercised.

## Decision

The timeline is a **projection** over a unified `care_events` index. Database tables are
the source of truth. D3 owns only time math (`d3-scale`, `d3-zoom`, `d3-selection`,
`d3-time`, `d3-quadtree`) and never mutates React-owned DOM. React renders SVG/DOM from
pure layout functions. Per-frame motion during a gesture is imperative `transform` writes
on existing marks (translate only, never scale, so circles stay circular and text never
stretches); structure is recomputed when a gesture ends or the level changes.

ONE component renders two lenses of the same data, chosen by zoom level: zoomed-out (L2,
from ref-2, icon nodes) and zoomed-in (L3, from ref-1, medication chips and metric cards).

## Consequences

- Add, edit and delete an event and the timeline updates without a reload.
- The timeline is built in gated steps (T1–T6) against the seeded hero patient, never
  against an empty set.
- Performance budget: <400 timeline DOM nodes, viewport + one screen each side, 60 fps on
  the 5,000-event performance patient.
