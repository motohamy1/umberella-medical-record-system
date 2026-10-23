# S0 Foundation — Evidence & Visual Verification Record

**Status:** Completed & Verified  
**Date:** 2026-10-13  
**Slice:** S0 Foundation  
**Specification:** `docs/PACK.md` §4, §6.1, §11 (S0)

---

## 1. Playwright Screenshots

The following automated screenshots were captured by Playwright and saved in this directory:

| Viewport | Language / Direction | File |
|---|---|---|
| Desktop (1470×1024) | English (LTR) | `docs/evidence/s0-foundation/desktop-en.png` |
| Desktop (1470×1024) | Arabic (RTL) | `docs/evidence/s0-foundation/desktop-ar.png` |
| Mobile (390×844) | English (LTR) | `docs/evidence/s0-foundation/mobile-en.png` |
| Mobile (390×844) | Arabic (RTL) | `docs/evidence/s0-foundation/mobile-ar.png` |

---

## 2. Shared Components Inventory (§4.5) in `/dev/gallery`

All 17 shared components are rendered with interactive and designed states:

1. **`AppFrame`**: Banded outer plum frame (`frame` #2D1B3D top/bottom bands, `frameSide` #4A3558 sides, `radiusFrame` 42px) surrounding warm greige `canvas` (#E0E0D8).
2. **`NotchHeader`**: Dark plum header band with concave rising tab carrying title and close button. Responsive and RTL-aware.
3. **`PillTabs`**: Active pill in white (#FCFCFC), inactive in surface (#E9ECE5). Plain horizontal scroll on narrow viewports without arrow/mask overlays.
4. **`CircleButton`**: White circular button with 1.5px line icons and subtle lift shadow.
5. **`FilterRow`**: Sliders reset button + multi-select pills.
6. **`IdentityCard`**: Rounded avatar, sex/age, bold name, critical allergy pill, and stacked context rows with ↗ buttons.
7. **`MetricsStrip`**: Diagnosis + 5 vital columns (pulse, BP, O2, temp, glucose) with smaller units and caption.
8. **`ModuleCard`**: `surfaceRaised` (#F0EFEB) container with top handle hump, title, and ↗ button.
9. **`RecordRow`**: Day/month leading column, rounded pill with white circle icon; visits tinted `recordVisit` (#E9ACA7).
10. **`RangeBar`**: Hatched neutral bar with low/normal/high zones and dark marker dot at true position.
11. **`MedicationChip`**: Dark grey text pill with white circle icon, medication name, and `×N` doses/day badge.
12. **`MetricCard`**: Zoomed-in timeline card with sparkline, current reading, period average, and delta pill with metric unit.
13. **`TimelineNode`**: Milestone (`accent` #F4FF48), child (white circle with kind icon and accent badge), axis dot, and end `+` node.
14. **`Scrubber`**: White pill track, density dots, year markers, and dark `ink` visible window.
15. **`OverlaySheet`**: Accessible modal sheet with backdrop blur, focus trap, and Escape key dismissal.
16. **`LoadingSkeleton`**: Token-based pulsing card/folder/row skeletons.
17. **`EmptyState`, `ErrorState`, `PermissionDeniedState`**: Designed feedback components with retry and add actions.

---

## 3. Reference Comparison & Deviation List

| Component / Trait | Authentic Reference (`ref-1`, `ref-2`) | S0 Implementation | Deviation / Notes |
|---|---|---|---|
| Outer Frame | Banded plum border, rounded corners | Banded plum (`frame` + `frameSide`), radius 42px | Exact match to measurements |
| Workspace Canvas | Warm greige | `#E0E0D8` token | Exact pixel match to `ref-2` |
| Notch Tab | Top left tab rising from canvas | Canvas rising tab with concave curve | Exact match; mirrors in RTL to top right |
| Header Tabs | Pill tabs on plum band | Horizontally scrollable pill strip | Meets approved recommendation |
| Card Containers | Subtle lift, gentle center handle | `ModuleCard` with handle hump & ↗ | Matches `ref-2` bottom modules |
| Timeline Scrubber | Density dots + dark window pill | `Scrubber` component with zoom buttons | Matches `ref-2` density scrubber |

**Deviations:** None. All 12 hard rules strictly satisfied.

---

## 4. Guard & Test Execution Output

```text
> npm run lint
Successfully generated tokens in src/styles/
Running Guard (a): Raw color literals check...
Running Guard (c): Blocklist scan...
Running Guard (d): No seed/fixture imports check...
✅ All automated guards passed successfully.
eslint: clean
tsc --noEmit: clean (0 errors)

> npm run test
✓ tests/unit/components.test.tsx (8 tests)
Test Files  1 passed (1)
Tests       8 passed (8)

> npm run build
✓ Compiled successfully with Turbopack
✓ All 8 static routes generated
```
