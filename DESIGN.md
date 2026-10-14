---
name: umbrella-system
description: Tactile paper-metaphor clinical medical record workspace
colors:
  frame: "#E0E0D8"
  canvas: "#E0E0D8"
  surface: "#E9ECE5"
  surfaceRaised: "#F0EFEB"
  white: "#FCFCFC"
  textPrimary: "#252D2F"
  inkMuted: "#8B8D8C"
  inkSoft: "#B1B1AF"
  accent: "#E2DFCE"
  accentNeon: "#EEFF28"
  recordVisit: "#E9ACA7"
  statusSuccess: "#8FBF9F"
  statusWarning: "#D9A45B"
  statusCritical: "#D98C8C"
  tabSlate1: "#929693"
  tabSlate2: "#8D918E"
  tabSlate3: "#AFB2AD"
  tabSlate4: "#B8BBB5"
  surfaceSubtle: "#F0F1EB"
  surfaceMuted: "#F7F8F2"
  borderHairline: "#D1D3CB"
  borderGrid: "#EAECE4"
  axisLine: "#7F847D"
typography:
  display:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.02em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  card: "24px"
  tile: "32px"
  frame: "42px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "48px"
---

## Overview

The Umbrella System visual design embodies an authentic, physical clinical folder metaphor. Designed for clinicians navigating high-density patient data under cognitive pressure, the system emphasizes spatial tactility, descending stepladder organization, and clear division of clinical signals. Notched card corners, hairlines, and muted stone/slate surfaces replace generic digital card tropes, ensuring that high-priority clinical warnings and vital signs stand out with authoritative precision.

## Colors

The palette is derived from clinical materials: archival folder paper, slate card dividers, and high-visibility status indicators.
- **Surface & Canvas**: `canvas` (`#E0E0D8`), `surface` (`#E9ECE5`), `surfaceRaised` (`#F0EFEB`), and `white` (`#FCFCFC`) provide tactile layering without blinding starkness.
- **Ink & Contrast**: `textPrimary` (`#252D2F`) maintains strict ≥7:1 contrast for clinical legibility, backed by `inkMuted` (`#8B8D8C`) and `inkSoft` (`#B1B1AF`) for secondary metadata and timestamps.
- **Accents & Stepladder Slate**: `accent` (`#E2DFCE`), `accentNeon` (`#EEFF28`), and stepladder dividers `tabSlate1` (`#929693`) through `tabSlate4` (`#B8BBB5`) structure physical depth.
- **Clinical Status**: Semantic indicators `statusSuccess` (`#8FBF9F`), `statusWarning` (`#D9A45B`), and `statusCritical` (`#D98C8C`) denote triage stability and acute findings.

## Typography

The type system prioritizes immediate scannability across clinical encounters:
- **Font Families**: Inter for Latin characters; IBM Plex Sans Arabic for Arabic RTL scripts.
- **Scale**: Display (28px bold, -0.02em tracking) for primary patient workspace identifiers; Headline (20px semi-bold) for card titles; Body (14px regular) for clinical notes and diagnoses; Label (12px bold) for telemetry units, badges, and timestamps.
- **Numerics**: Tabular figures used for vital sign metrics and timeline dates to prevent optical jitter.

## Elevation

Rather than soft drop shadows and floating cards, the elevation system is grounded in physical paper layering:
- **Hairlines**: 1px borders (`borderHairline: #D1D3CB`, `borderGrid: #EAECE4`) define cards and dividers.
- **Subtle Contact Inset**: 1px crisp borders establish layering without diffuse blur.
- **Notched Cutouts**: Angled corners (e.g. 10px cutouts) mimic physical folder tabs and clinical index cards.

## Components

- **Stepladder Tabs**: Descending diagonal tabs providing rapid visual and spatial affordances across clinical domains (`Overview` through `Genetics`).
- **Clinical Diagnosis Card**: Prominently displays primary diagnosis, ICD-10 code, clinical notes, and active care pathway with clear attending clinician attribution.
- **Vital Signs Panel**: High-visibility metric cards (heart rate, blood pressure, oxygen saturation, glucose) with unit labels and measurement timestamps.
- **Continuous Care Timeline**: Horizontal time axis projecting clinical milestones, medication events, and lab findings chronologically with zoom level support.
- **Filter Toolbar**: Quick toggles directly above the timeline for granular filtering across visit types and clinical modalities.

## Do's and Don'ts

### Do's
- **Do** always use semantic tokens (`var(--color-...)`, `var(--radius-...)`) generated from `docs/design/tokens.json`.
- **Do** ensure critical allergy and safety chips are prominently positioned with high contrast.
- **Do** maintain bilingual alignment and proper directional layout for both LTR and RTL.
- **Do** anchor metrics with explicit time and attribution ("recorded by / when").

### Don'ts
- **Don't** use raw hex literals (`#hex`) anywhere in application code outside the generated token files.
- **Don't** add diffuse SaaS drop shadows or arbitrary gradient borders.
- **Don't** hide critical patient identity or vital signs behind multi-level navigation.
- **Don't** introduce blocklisted legacy terms or synthetic non-token styles.
