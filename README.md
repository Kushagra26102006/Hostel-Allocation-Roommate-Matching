# HostelHub

> Modern hostel management platform — monorepo scaffold.

## One-command local setup

```bash
# Prerequisites: Node 20+, pnpm 9+
pnpm install        # install all workspace deps
pnpm dev            # start the web app at http://localhost:3000
```

## All root scripts

| Script           | What it does                                       |
| ---------------- | -------------------------------------------------- |
| `pnpm dev`       | Start `apps/web` on port 3000 (Next.js dev server) |
| `pnpm build`     | Build every workspace package                      |
| `pnpm lint`      | ESLint (flat config) across the whole repo         |
| `pnpm typecheck` | `tsc --noEmit` in every workspace package          |
| `pnpm test`      | Vitest run in every workspace package              |
| `pnpm format`    | Prettier write across the whole repo               |

## Monorepo layout

```
hostelhub/
├── apps/
│   ├── web/          # Next.js 15 App Router (TypeScript + Tailwind)
│   └── worker/       # Node 20 background worker (TypeScript + tsx)
├── packages/
│   ├── domain/       # Pure TypeScript domain types & branded IDs
│   ├── db/           # Database access layer (placeholder)
│   └── shared/       # Cross-cutting utilities (nowIso, assertDefined)
├── docs/
│   └── adr/          # Architecture Decision Records
├── tsconfig.base.json
├── eslint.config.mjs
├── .prettierrc
└── pnpm-workspace.yaml
```

## Architecture overview

```
apps/web  ──depends──►  packages/domain
apps/web  ──depends──►  packages/shared
apps/worker ─depends──► packages/domain
apps/worker ─depends──► packages/shared
packages/db ─depends──► packages/domain
```

- **`packages/domain`** is the dependency root — no internal deps, no runtime deps.
- **`packages/shared`** holds cross-cutting utilities, also with no internal deps.
- **`packages/db`** will hold ORM/query logic (see ADR 0001 for database decision).
- **`apps/web`** and **`apps/worker`** depend on domain + shared but never on each other.

## Tooling

| Tool                | Purpose                                 |
| ------------------- | --------------------------------------- |
| pnpm workspaces     | Monorepo package management             |
| TypeScript (strict) | Type safety across all packages         |
| ESLint flat config  | Linting (TS-aware, Prettier-integrated) |
| Prettier            | Opinionated formatting                  |
| Vitest              | Unit tests in every package             |
| Playwright          | E2E smoke tests for `apps/web`          |
| husky + lint-staged | Pre-commit hooks                        |
| commitlint          | Conventional commit messages            |

## Commit convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

```
feat: add hostel listing page
fix: correct bed-count calculation
chore: bump dependencies
```
