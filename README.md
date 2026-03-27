# BudgetDesk

Privacy-first, open-source flow budgeting monorepo.

## Goals
- Intentional cash-flow workflow (give every dollar a destination)
- API-first architecture for web and mobile clients
- Offline-first transaction capture and sync
- Strong security defaults (integer cents, auth hardening, RLS)
- Production-minded DX (tests, linting, CI)

## Monorepo Layout
- apps/web: React/Next.js client (desktop + PWA)
- apps/mobile: React Native/Expo client
- apps/api: Node.js API (REST-first, GraphQL-ready)
- packages/shared: Shared types, money math, and validation
- packages/ui: Shared UI primitives for web/mobile parity
- db: SQL schema, migrations, RLS policies, seeds
- docs: Architecture and security decisions
- tests: Cross-package integration and e2e harness

## Quick Start (MVP now)
1. Install Node.js 20+
2. Run: `node apps/api/src/index.js`
3. Open landing page: `http://localhost:4000`
4. Open app directly: `http://localhost:4000/app.html`

Data persists locally in `apps/api/data/budget-db.json`.
