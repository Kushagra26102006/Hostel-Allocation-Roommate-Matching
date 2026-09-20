# ADR 0001 — Technology Stack Choice

**Date:** 2026-09-20  
**Status:** Accepted  
**Deciders:** Initial project team

---

## Context

HostelHub needs a technology stack for a web-based hostel management platform. The primary
concerns are developer experience, type safety, long-term maintainability, and the ability to
scale a small team without introducing unnecessary complexity in the early stages.

---

## Decision

We adopt the following stack for the HostelHub monorepo:

| Layer                 | Technology              | Rationale                                                                                      |
| --------------------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| **Monorepo tooling**  | pnpm workspaces         | Fast installs, native workspace protocol, no extra config layer                                |
| **Language**          | TypeScript (strict)     | Catches errors at compile time; `strict: true` + `exactOptionalPropertyTypes` maximises safety |
| **Web framework**     | Next.js 15 (App Router) | RSC-first, built-in routing, Vercel deployment path; large ecosystem                           |
| **Styling**           | Tailwind CSS            | Utility-first; co-locates styles with markup; zero dead CSS in production                      |
| **Database & ORM**    | MongoDB + Mongoose      | Document database with rich schema validation, tenancy support & transactions                  |
| **Background worker** | Node 20 + BullMQ        | Redis-backed queue worker for window schedules, cycle transitions & reminders                  |
| **Unit testing**      | Vitest                  | First-class TypeScript support; jest-compatible API; fast due to esbuild transform             |
| **E2E testing**       | Playwright              | Cross-browser, reliable, first-class TS API; superior to Cypress for CI stability              |
| **Linting**           | ESLint flat config      | Future-proof config format; integrates cleanly with `@typescript-eslint` v8                    |
| **Formatting**        | Prettier                | Opinionated, removes bike-shedding; pairs perfectly with eslint-config-prettier                |
| **Commit hygiene**    | husky + commitlint      | Enforces conventional commits; enables automated changelogs later                              |

---

## Consequences

### Positive

- **Strong type safety** across the entire codebase from day one (TypeScript strict mode).
- **Shared packages** (`domain`, `db`, `shared`) prevent duplicate code and enforce a clean
  dependency graph.
- **Mongoose ORM** with repository layer and tenant plugins enforces tenant isolation (`institution_id`) across all data access.
- **Conventional commits** give a free audit trail and make `semantic-release` trivial to add later.
- **Vitest** is significantly faster than Jest for a TypeScript monorepo.
- **Playwright** is CI-stable and supports all major browsers.

### Negative / Trade-offs

- **pnpm** requires developers to have pnpm 9+ installed (not npm/yarn). Mitigated by
  documenting this in the README and `.npmrc`-enforcing the package manager.
- **Next.js App Router** is still relatively new; some third-party libraries don't support
  React Server Components yet. Mitigated by keeping all external library surface area in
  Client Components for now.

---

## Alternatives Considered

| Alternative              | Reason rejected                                                                |
| ------------------------ | ------------------------------------------------------------------------------ |
| npm/yarn workspaces      | Slower installs; pnpm's symlink strategy is more correct for monorepos         |
| Turborepo on top of pnpm | Adds complexity not needed at this scale; can be added later                   |
| Vite + React SPA         | Loses RSC, SSR, and file-based routing — not worth it for a multi-page product |
| Jest                     | Slower than Vitest; requires more config for ESM/TypeScript                    |
| Cypress                  | Heavier; slower in CI; Playwright has surpassed it in DX                       |

---

## References

- [pnpm workspaces](https://pnpm.io/workspaces)
- [Next.js App Router docs](https://nextjs.org/docs/app)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/)
