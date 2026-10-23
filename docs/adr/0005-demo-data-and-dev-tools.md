# ADR-0005: Demo data and dev tools — no slice is empty

**Status:** Accepted · **Date:** 2026-10-13 · **Decides:** §8, pack finding #2

## Context

`seed.sql` created 7 auth accounts and 6 demographics-only patients — no visits,
medications, vitals, labs, imaging or events. Every tab and the timeline had nothing to
show. It also hand-inserted into the auth schema, which is brittle.

## Decision

`npm run seed:demo` is idempotent and deterministic (seeded PRNG, fixed timestamps relative
to a fixed anchor date; no `now()` inside the generator). It runs only when `NODE_ENV` is
not production. Accounts are created through the **Neon Auth admin API**, never by
inserting into the auth schema. The service-role key is read only by this script and never
reaches the app.

`/dev/data` (development only, 404 in production, owner account required) shows row counts
per table and per patient, a "Reseed demo data" button, "Add 30 days of vitals", "Add a
random visit", and links to each patient's workspace — using the same server actions as the
product. Dev sign-in buttons perform a REAL sign-in per seeded account and never switch the
current session's role.

## Consequences

- Acceptance is not "the build passes" but "the screens render seeded data and the owner
  can add data through the real UI and watch it appear".
- Deterministic anchors make Playwright screenshots comparable between runs.
