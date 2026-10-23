# ADR-0002: Roles and routing — server-enforced, no switcher

**Status:** Accepted · **Date:** 2026-10-13 · **Decides:** §2.1, §9.3, pack finding #8

## Context

An earlier build exposed a Doctor / Provider / Patient switcher in the UI. That is a
privilege-escalation surface and a patient-safety hazard.

## Decision

Two route groups with server guards: `/clinic/*` (staff only) and `/patient/*` (patients
only). Identity → membership → role is resolved on the server for every request; a staff
session can never render `/patient/*` and a patient session can never render `/clinic/*`.
A guard test fails the build if any file under `src/app` renders a control that changes
the session's role.

Write policy is per-role and split by path, not by form: staff entry writes
`source = staff | doctor`; patient entry is a separate limited path writing
`source = patient`, never verified, unable to set provider-only fields. Database policies
reject a patient session writing a non-patient source or any verification field even when
the API is called directly.

## Consequences

- The UI only hides what the server already forbids; hiding is never the control.
- One person who is both staff and a patient gets two accounts (D12).
- Adds a permission matrix (`docs/design/permissions.md`, S1) and a negative-authz suite.
