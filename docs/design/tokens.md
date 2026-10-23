# Design tokens — FROZEN (measured 2026-10-13)

Values below were sampled directly from `ref-1-plum-shell.png` (813×526) and
`ref-2-drplus-overview.png` (1200×900) with a pixel sampler, then **independently
re-verified against exact unquantised pixels**. The pack's approximations held up better than
a first pass suggested: of the three values a quantised pass appeared to correct, two were
artifacts of that pass's own rounding and the pack was right. **Only `canvas`, `frame` and
the radius scale are confirmed measurements; `surface` is design intent, not evidenced by the
references (ADR-0012).

Read the Source column before trusting a value: `measured` means confirmed on exact pixels,
`pack` means the pack's value survived verification, `measured` + a note means the
measurement disagrees with the pack and the disagreement is recorded rather than silently
resolved.

**Image → viewport scaling.** ref-1 is 813 px wide but the design targets a 1470 px
viewport, so 1 image px = **1.808** viewport px. Geometry below is given in both.

Hard rule: **raw color literals are forbidden outside this file.** Components use semantic
token classes only. A guard fails the build on any literal outside `src/design/tokens`.

## Color

| Token | Value | Source | Note |
| --- | --- | --- | --- |
| `frame` | `#2D1B3D` | design override | dark plum outer frame and header band (overriding sampled `#4C4C28`). Top/bottom bands `#2D1B3D`, sides `#4A3558` (lighter plum, token `frameSide`). See the frame-structure note below. |
| `canvas` | `#E0E0D8` | measured | workspace background (warm greige; not white, not cool grey). 28.4 % of ref-2 — accurate. |
| `surface` | `#E9ECE5` | pack (resolved ADR-0012) | Card interiors measure `#E0DFD6`/`#E0DFD8` — **within 2 units of `canvas` `#E0E0D8`**, so ref-1 does not clearly evidence a distinct fill (cards appear delineated by hairline/shadow, not colour). Kept as design intent for a real visual anchor; hairline/shadow separation still applies. |
| `surfaceRaised` | `#F0EFEB` | measured | **Pack was accurate.** 4.7 % of ref-2 and 17 k px of ref-1 — a genuinely distinct lighter element. Do not change. |
| `white` | `#FCFCFC` | pack | active pills, circle buttons, scrubber track, cards |
| `ink` | `#252D2F` | pack | text, axis line, dark nodes, "+" node, scrubber window, value pills |
| `inkMuted` | `#8B8D8C` | measured | secondary text, medication chips (dark grey), grey tiles. `#888888` is 2.5 % of ref-2. |
| `inkSoft` | `#B1B1AF` | pack | dots, hairlines |
| `accent` | `#F4FF48` | measured | **Pack was accurate.** The milestone-node interior fill measures `#F3FF46`–`#F4FD46`. The ONE accent: milestone nodes, active emphasis, count badges, delta-improved fill. |
| `recordVisit` | `#E9ACA7` | pack | tint of a visit row in the Records card (the only evidenced record tint) |
| `statusSuccess` | muted green | pack | ONLY in range bars, status labels, critical alerts |
| `statusWarning` | muted orange | pack | ONLY in range bars, status labels, critical alerts |
| `statusCritical` | muted red-pink | pack | ONLY in range bars, status labels, critical alerts |

**The bright yellow area around the application is a presentation backdrop, never a page
background.** Verified by sampling: all four corners of ref-1 are yellow (`#F3FF43`–`#F1FF47`)
while the edges in the reference were dark border (`#4F510E`) — the backdrop shows through a rounded frame. ref-2's
black device border is likewise not part of the app; the dark plum frame replaces it. The Gemini
renders' different yellow (`#FCCC00`) is not a token and must not appear.

## Radius scale (ONE scale)

| Token | Image px | @1470 px | Applies to |
| --- | --- | --- | --- |
| `radiusPill` | fully rounded | fully rounded | pills, chips, inputs |
| `radiusCard` | 13–14 | ~24–26 | ModuleCards, identity card |
| `radiusTile` | ~18 | ~32 | large tiles |
| `radiusFrame` | ~23 | **~43** | the AppFrame |

Measured: the frame reaches x=0 at y=23 in ref-1, i.e. a ~43 px frame radius at 1470 —
comfortably inside the pack's "about 40 px". Do not invent intermediate steps.

## AppFrame structure — measured, and it contradicts the pack's wording

The pack describes AppFrame as a rounded frame filling the viewport. Sampling the
border showed banded structure (not a uniform border):

| Region | Tone & Token |
| --- | --- |
| Top band (y≈2–48, the NotchHeader) | dark plum `#2D1B3D` (`frame`) |
| Bottom band (y≈521–525) | dark plum `#2D1B3D` (`frame`) |
| Left/right sides at mid-height (y≈100–480) | `#4A3558` — lighter plum (`frameSide`) |
| All four corners | yellow `#F3FF43` (backdrop in reference only) |

**Resolved in ADR-0012: adopt (a)** — sides `#4A3558` (token `frameSide`), bands `#2D1B3D` (`frame`).
It reproduces the banded depth of the reference with dark plum, and the two tones are close enough to read as one
family.

## Milestone node diameter

The reference's node clusters measure **~31–37 px wide at 813 px**, i.e. **~56–67 px scaled to
1470** — *larger* than the pack's 44 px, not smaller. An earlier reading of ~22–24 px came
from sampling the cluster's anti-aliased edge rather than its fill. **Resolved in ADR-0012:**
the pack's values stand, tuned at the S4 visual gate.

## Depth

Soft and shallow: a faint 3–6 px lift on raised cards and circle buttons. Inner shadows,
neumorphic double shadows, glass blur and gradients are permitted (per §4.2) but never as
decoration — the Gemini renders' heavy neumorphism is a listed defect.

## Strokes

| Use | Value |
| --- | --- |
| Timeline axis | ~1.5 px `ink` |
| Branches | ~1 px `ink` at reduced opacity |
| Hairlines | ~1 px `inkSoft` |

Note: the axis was not measurable as a distinct dark line in ref-1's body — the nodes sit on
a light axis. Implement per the pack (1.5 px ink) and compare against ref-2 at the S4 gate.

## Icons

Thin line icons (~1.5 px stroke), ONE set, rounded caps. Circle icon buttons are white
circles with a line icon.

## Typography

One neutral grotesk (Inter or Manrope) plus an Arabic companion (IBM Plex Sans Arabic or
Noto Sans Arabic). **Choice still open — ADR needed.** The type scale cannot be measured
reliably from these raster references, so the pack's hierarchy stands as the specification.

| Role | Size | Color |
| --- | --- | --- |
| Small label | 12 px | `inkMuted` |
| Body | 14 px | `ink` |
| Card title | ~20 px regular | `ink` |
| Key value | 28–36 px light | `ink` |
| Logo/brand | bold | `ink` |

Clinical values always show their unit in a smaller size.

## Motion

150–250 ms, subtle, interruptible, `prefers-reduced-motion` respected. `motion` for
panel/overlay/layout transitions and the folder → workspace transition. Timeline pan/zoom
is direct manipulation with no easing lag. No decorative animation.

## S0 checklist

- [x] Re-sample each colour from ref-1/ref-2 on **exact** pixels — done; the pack's
      `accent`, `surfaceRaised`, `frame` and `canvas` all verified accurate. A first
      quantised pass falsely flagged three of them, which is why the re-verify step exists.
- [x] Measure the four radii at a 1470 px viewport — done, frame = ~42–43 px.
- [x] Verify the yellow-backdrop rule — done, corners yellow in ref, backdrop discarded.
- [x] Map the AppFrame border structure — done, frame is **banded**; see the note above.
- [x] Independent verification — 21/21 checks pass on exact pixels with nearest-neighbour
      tolerance (ad-hoc script, not a project suite; the repo has no test runner yet).
- [x] Resolve all four open questions — **ADR-0012**: milestone diameter (pack's 44/36/28),
      type stack (Inter + IBM Plex Sans Arabic), `surface` (`#E9ECE5` as intent), banded
      frame border (both plum tones).
- [ ] Inventory table for S0's screens and components — **owner approval pending**.
- [ ] Convert tokens to CSS variables in `src/design/tokens` and export Tailwind v4 theme
      keys pointing at them, including `frameSide` `#4A3558`.

## Open questions

**None outstanding.** All four were resolved in ADR-0012. The milestone diameter is confirmed
at the S4 visual gate, not here — that is a verification step, not an open decision.

## Resolved questions (see ADR-0012 for the reasoning)

1. **Milestone node diameter** → the pack's 44 px (L2) / 36 px (L3) / 28 px (L1). The
   reference measures ~56–67 px scaled to 1470, but the pack's values were written for the
   1470 viewport, 44 px is the §10.3 touch-target floor, and upscaling a raster capture
   compounds error. Tuned at the S4 visual gate.
2. **Type stack** → Inter + IBM Plex Sans Arabic, via `next/font` with `display: swap`.
3. **`surface`** → `#E9ECE5` as design intent. The references do not evidence a distinct card
   fill (cards measure `#E0DFD6`, within 2 units of `canvas` and are separated by hairline and
   shadow), so the pack's warmer value gives the identity card a real anchor.
4. **AppFrame banded border** → bands `#2D1B3D`, sides `#4A3558` (token `frameSide`).
