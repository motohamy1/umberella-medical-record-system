# S0 code style — derived, not invented

The user asked to "match the style of project". `umbrella-system` is greenfield, so style
is derived from the closest existing repo: **`patient-tracker-system`**, which solves the
same problem family (clinical workspace, cream/plum frame, provider + patient route
groups) and carries the most recent toolchain.

Adopting its **architecture and conventions**, not its palette (its tokens are cool grey;
ours are the warm greige + dark plum measured in `tokens.md`).

## Adopted from patient-tracker-system

| Convention | Value |
| --- | --- |
| Next.js / React / TS | Next 16 · React 19 · TS strict, `moduleResolution: bundler` |
| Path alias | `@/*` → `./src/*` in both tsconfig and Vitest |
| Tailwind | v4 via `@tailwindcss/postcss`, no `tailwind.config.*` |
| Token source of truth | one committed JSON (`docs/design/tokens.json`) — the only place a value lives |
| Token codegen | zero-dependency Node scripts, no third-party code in the gate |
| Generated artifacts | `src/styles/tokens.generated.css` + `.ts`, gitignored |
| `npm run lint` | **is** the token guard, so the guard runs on every build |
| Vitest | `projects: [node, jsdom]` — two runners, never merged |
| Playwright | owns `tests/visual/**` with its own config |
| File header style | `'use client';` then a long comment block explaining *why*, before imports |
| Import order | react → next → third-party → `@/…` local |
| Shared UI | `src/components/primitives/`, `overlays/`, `state/` |
| Test location | `tests/unit/**` (Vitest), `tests/visual/**` (Playwright) |
| Dev-only routes | gated by an env flag set in exactly two files, 404 in production |

## Reconciled with the pack

Where the pack names something specific, the pack wins:

| Pack (AGENTS.md) | Implementation |
| --- | --- |
| `npm run dev` / `test` / `seed:demo` / `db:reset` / `lint` / `e2e` | these six script names |
| `src/design/tokens` | generated artifacts live in `src/styles/`, source JSON in `docs/design/` |
| `npm run lint` = "lint + typecheck" | the token guard **plus** `tsc --noEmit` |
| Viewports 1470×1024 / 390×844 | Playwright projects (the reference repo used different ones) |

## Deliberately not copied

- Its `seed.sql` and hand-inserted auth rows — the pack forbids writing to the auth schema.
- Its `provenance` block size (1,900 lines) — useful, but we keep ours proportionate and
  put the reasoning in `tokens.md` instead.
