# HostelHub Monorepo — Task List

## Root Scaffold

- [ ] pnpm-workspace.yaml
- [ ] package.json (root)
- [ ] tsconfig.base.json
- [ ] eslint.config.mjs
- [ ] .prettierrc
- [ ] .editorconfig
- [ ] .gitignore
- [ ] .env.example
- [ ] commitlint.config.cjs
- [ ] .lintstagedrc.json
- [ ] .husky/commit-msg + pre-commit

## packages/domain

- [ ] package.json
- [ ] tsconfig.json
- [ ] src/index.ts
- [ ] src/**tests**/index.test.ts
- [ ] vitest.config.ts

## packages/db

- [ ] package.json
- [ ] tsconfig.json
- [ ] src/index.ts
- [ ] src/**tests**/index.test.ts
- [ ] vitest.config.ts

## packages/shared

- [ ] package.json
- [ ] tsconfig.json
- [ ] src/index.ts
- [ ] src/**tests**/index.test.ts
- [ ] vitest.config.ts

## apps/worker

- [ ] package.json
- [ ] tsconfig.json
- [ ] src/index.ts
- [ ] src/**tests**/index.test.ts
- [ ] vitest.config.ts

## apps/web

- [ ] package.json
- [ ] tsconfig.json
- [ ] next.config.ts
- [ ] tailwind.config.ts
- [ ] postcss.config.mjs
- [ ] src/app/layout.tsx
- [ ] src/app/page.tsx
- [ ] src/app/globals.css
- [ ] vitest.config.ts
- [ ] src/**tests**/page.test.tsx
- [ ] playwright.config.ts
- [ ] e2e/smoke.spec.ts

## Documentation

- [ ] README.md
- [ ] PROGRESS.md
- [ ] docs/adr/0001-stack-choice.md

## Verification

- [ ] pnpm install
- [ ] pnpm typecheck
- [ ] pnpm lint
- [ ] pnpm test
- [ ] pnpm dev (spot-check port 3000)
