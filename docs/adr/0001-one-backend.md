# ADR-0001: One backend — Next.js App Router + Neon

**Status:** Accepted · **Date:** 2026-10-13 · **Decides:** §2.1, pack finding #5

## Context

The first build mixed two backends: dependencies for Neon + better-auth + S3, but
migrations and RLS written for Neon. Nothing worked end to end.

## Decision

One stack: Next.js (App Router) + TypeScript strict + Tailwind v4 (tokens as CSS
variables) + Neon (Postgres, Auth, Row Level Security, Storage) + Zod for all validation
+ D3 modules for time math + `motion` for UI transitions. GSAP is forbidden unless a
specific SVG choreography is provably impossible with `motion`, and the reason is written
into a new ADR.

Server components and middleware resolve identity → membership → role. Route Handlers and
Server Actions are the only write path. There is no separate API server.

## Consequences

- Auth is Neon Auth; accounts are never hand-inserted into the auth schema — always
  through the admin API.
- RLS is enforced in Postgres, so authorization survives a route-handler bug.
- Reversibility: high before S0 lands, expensive after. Reopen only via a new ADR.
