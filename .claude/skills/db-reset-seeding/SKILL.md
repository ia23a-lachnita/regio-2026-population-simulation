---
name: db-reset-seeding
description: Applies deterministic database cleanup/reset and seed discipline for competition workflows. Use before verify and packaging.
---

Use this skill when preparing a trustworthy validation run.

Checklist:
1. Run `pnpm run db:clean` and confirm `workspace/.context/DB_CLEAN.md` exists.
2. Run `pnpm run db:reset` and confirm both `workspace/.context/DB_RESET.json` and `workspace/.context/DB_RESET.md` exist.
3. Confirm row-level seed proof passes for the configured tables in `workspace/.context/SEED_CONTRACT.json`.
4. Ensure reset is deterministic (same baseline behavior on consecutive runs).
5. If DB artifacts remain from prior runs, treat as failure and fix before proceeding.

Guardrails:
- Only delete DB artifacts under workspace context and app user-data roots.
- Do not claim completion if reset/seed evidence is missing or if seeded row counts are below contract.
