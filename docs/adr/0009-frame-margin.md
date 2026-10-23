# ADR-0009: Frame margin — the frame fills the viewport

**Status:** Accepted (D5, confirmed 2026-10-13) · **Date:** 2026-10-13

## Context

The bright yellow area around the application in ref-1 and ref-2 is a presentation
backdrop, not part of the app. An earlier build used it as the page background.

## Decision (confirmed by the owner 2026-10-13)

The dark plum **AppFrame fills the viewport** — no margin, no letterboxing. The canvas sits
inside the frame. Any margin introduced later uses the `frame` or `canvas` token, **never
the accent yellow**. ref-2's black device border is also not part of the app; the dark plum
frame replaces it.

## Consequences

- One fewer decision at every breakpoint; no dead space around the app.
- S0 must propose this with a screenshot so the owner can ask for a margin before S1.
