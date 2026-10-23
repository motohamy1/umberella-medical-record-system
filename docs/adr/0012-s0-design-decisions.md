# ADR-0012: S0 design decisions — node diameter, type stack, surface, frame border

**Status:** Accepted · **Date:** 2026-10-13 · **Decides:** the four open questions in
`docs/design/tokens.md`

## Context

S0's token re-sampling produced four questions the pack could not answer from its prose.
The owner delegated the first to engineering judgement and confirmed the other three
recommendations.

## Decisions

**1. Milestone node diameter — 44 px (L2) / 36 px (L3) / 28 px (L1), as the pack specifies.**
The reference's node clusters measure 31–37 px at 813 px, i.e. ~56–67 px scaled to 1470, but
three things favour the pack's explicit values: they were written *for* the 1470 viewport;
44 px is exactly the touch-target floor §10.3 requires; and upscaling a raster capture
compounds error. The measured cluster is also likely merged milestones (§7.3 merges nodes
within 1.2 diameters), so a single node is smaller than the cluster. **The diameter is a CSS
variable, tuned at the S4 visual gate against ref-2** — which is where this is actually
confirmed, not here.

**2. Type stack — Inter + IBM Plex Sans Arabic.** Both on Google Fonts, both with full Arabic
coverage, and Inter pairs cleanly with the Plex superfamily. Loaded via `next/font` with
`display: swap`; Arabic switches on `dir="rtl"`.

**3. `surface` = `#E9ECE5`, as design intent.** The references do not evidence a distinct card
fill — card interiors measure `#E0DFD6`, within 2 units of `canvas`. In ref-1 cards are
separated by hairline and shadow, not colour. Keeping the pack's warmer, lighter value gives
the identity card a real anchor; an identity card nearly the canvas colour is a weaker visual
hierarchy. The hairline/shadow separation still applies on top.

**4. AppFrame border — dark plum banded structure.** Bands `#2D1B3D` (NotchHeader, bottom), sides
`#4A3558`. This reproduces the banded depth structure of the reference; the two plum tones read as one
family rather than as a mismatch.

## Consequences

- `frameSide` becomes a second token alongside `frame`; `components.md` AppFrame needs the
  banded treatment.
- Milestone diameter is tunable without touching layout code, so the S4 gate is cheap.
- No change to the radius scale (frame ~42–43 px at 1470, confirmed).
- Token file's four open questions are closed; the S0 checklist can proceed to CSS variables
  and Tailwind v4 theme keys.
