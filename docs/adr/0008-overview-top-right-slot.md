# ADR-0008: Overview top-right slot — vital-metrics strip

**Status:** Accepted (D2, confirmed 2026-10-13) · **Date:** 2026-10-13

## Context

ref-1 shows a five-column metrics strip (diagnosis, pulse, pressure, oxygen, temperature).
The retired Gemini redraw and the Dr+ tiles alternative would instead show body-system
tiles.

## Decision (confirmed by the owner 2026-10-13)

Use the **MetricsStrip** from ref-1: five columns of small label over large value with
unit, plus the "Recorded <date> by <name>" caption. Stale values (older than the last
visit) show their date in `inkMuted`.

## Alternative: SystemTiles ("tiles")

One large accent tile (the body system with the highest share, percent, dark round arrow)
followed by four decreasing tiles in `inkMuted`/`inkSoft`. Requires a `body_system` field
on every diagnosis and adds little clinical value now, so it is **hidden when no diagnosis
has a body-system value**. Say "tiles" to switch.

## Consequences

- MetricsStrip needs no new schema field — it renders existing vitals and the primary
  active diagnosis.
- Tiles need a diagnosis migration; deferring them keeps S3 free of schema work.
