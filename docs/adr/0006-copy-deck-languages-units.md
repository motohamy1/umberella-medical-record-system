# ADR-0006: Copy deck, languages and units

**Status:** Accepted · **Date:** 2026-10-13 · **Decides:** §2.1, D1

## Context

Specification vocabulary leaked into the UI in the first build ("Next Action' Hero Card",
"Cardiology" in a title tab). The product needs Arabic and English from the first
component.

## Decision

All UI text comes from a per-language copy deck (`en` + `ar`). Components contain no
user-facing string literals; a guard fails on literals outside the copy deck. RTL is
supported from the first component using logical CSS properties (`margin-inline-start`,
`inset-inline-end`, `text-align: start`) — never `left`/`right` in authored styles.

Units: kg, °C, mmHg, mg/dL, western digits for clinical values. Every value shows its unit;
deltas carry the metric's unit; a degree sign appears only for temperature.

Typography: one neutral grotesk plus an Arabic companion, recorded here when S0 measures
it. Typography choice is deferred to S0 with the token sample.

## Consequences

- Arabic is not a later retrofit; RTL regressions are caught from the first slice.
- Adding a language is adding a copy-deck file, not touching components.
- Deferred: number/locale formatting rules for Arabic-Indic digits (currently western
  digits per §2.1).
