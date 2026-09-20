# PROGRESS

Tracks milestones for the HostelHub project.

---

## Milestone 0 — Monorepo scaffold ✅

**Date:** 2026-09-20  
**Status:** Complete

### What was done

- [x] Initialised pnpm workspace with `apps/web`, `apps/worker`, `packages/domain`, `packages/db`, `packages/shared`
- [x] `tsconfig.base.json` — TypeScript strict mode + path aliases `@hostelhub/*`
- [x] ESLint flat config (`eslint.config.mjs`) + Prettier (`.prettierrc`)
- [x] Vitest configured in every package with at least one passing unit test
- [x] Playwright config + one smoke test in `apps/web/e2e/`
- [x] husky + lint-staged (pre-commit: lint + format staged files)
- [x] commitlint (conventional commits enforced on commit-msg)
- [x] `.editorconfig`, `.gitignore`, `.env.example`
- [x] Root scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `format`
- [x] `pnpm dev` starts `apps/web` on port 3000
- [x] `README.md` — one-command setup + architecture note
- [x] `docs/adr/0001-stack-choice.md` — stack ADR

### Packages created

| Package             | Description                             |
| ------------------- | --------------------------------------- |
| `@hostelhub/domain` | Branded domain types (Hostel, HostelId) |
| `@hostelhub/db`     | DB layer placeholder                    |
| `@hostelhub/shared` | nowIso, assertDefined utilities         |
| `@hostelhub/web`    | Next.js 15 App Router front-end         |
| `@hostelhub/worker` | Node 20 background worker               |

---

## Milestone 1 — Domain modelling 🔜

- [ ] Define core aggregates: Hostel, Room, Booking, Guest
- [ ] Add Zod schemas to `packages/domain`
- [ ] Wire up Prisma in `packages/db`
