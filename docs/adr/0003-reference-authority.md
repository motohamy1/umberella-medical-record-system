# ADR-0003: Reference authority — authentic images govern

**Status:** Accepted · **Date:** 2026-10-13 · **Decides:** §3, pack finding #1

## Context

The first build treated three Gemini-generated renders as binding. Every later gate
checked against the wrong image, so the app drifted from the real design.

## Decision

Authentic images govern: `ref-1-plum-shell.png` (theme, workspace shell, zoomed-in
timeline lens) and `ref-2-drplus-overview.png` (Overview layout, zoomed-out lens,
scrubber, bottom cards). Gemini renders are layout-only: `ref-3` (Provider Home),
`ref-4` (Patient Home), always restyled with the authentic theme. `ref-X-gemini-overview.jpg`
is **retired** — an AI redraw with invented elements; kept for the record only.

Where ref-1 and ref-2 disagree, `docs/design/pages.md` §Overview says which wins. Where no
authentic image exists (Provider Home, Patient Home, secondary tabs) the page spec governs
and no new visual language is invented.

Image content — names, clinical values, "Cardiology", IDs — is illustrative and never
product content. Typos in the images ("Diagnosys", "Imagings", "2 Mao", "Mays") are never
copied. A CI source scan fails on a blocklist of reference sample content.

## Consequences

- Visual gates need a model that can actually see images, or the owner does the 10-point
  check in `docs/design/pages.md`.
- No reference exists for later screens; each needs an owner-approved inventory first.
