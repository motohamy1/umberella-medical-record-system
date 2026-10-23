# ADR-0007: Folder colors — neutral bodies, one accent

**Status:** Accepted (D4, confirmed 2026-10-13) · **Date:** 2026-10-13

## Context

The Gemini renders show pastel multicolor folders. §4.1 gives exactly one accent
(`#F4FF48`); a rainbow of folder bodies would break hard rule 3.

## Decision (confirmed by the owner 2026-10-13)

Folder bodies are neutral. Status is the only color carrier, expressed as four label
styles rather than four body colors: **Stable** and **New** neutral `surface` label ·
**Follow-up** accent fill · **Needs review** outlined · **Critical** `ink` fill with white
text. No other colors.

Status colors (`statusSuccess/Warning/Critical`) stay restricted to range bars, status
labels and critical alerts.

## Alternative (if the owner says so)

A restrained status-colored mode in muted tones — bodies tinted by status at low
saturation, still only ever one hue per folder. **Never a rainbow.**

## Consequences

- The folder grid reads as one family; status is legible at a glance.
- Reversal cost is low (one label-style map), so the alternative stays open cheaply.
