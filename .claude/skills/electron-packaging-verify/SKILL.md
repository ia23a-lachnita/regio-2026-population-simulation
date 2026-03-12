---
name: electron-packaging-verify
description: Enforces robust Windows packaging verification with smoke and evidence checks before completion claims.
---

Apply this skill for final validation and packaging.

Checklist:
1. Run `pnpm run verify:win` and require exit code 0.
2. Confirm verify artifacts exist and are current:
   - `workspace/.context/VERIFY_WIN.md`
   - `workspace/.context/FUNCTIONAL_ACCEPTANCE.json`
   - `workspace/.context/FUNCTIONAL_ACCEPTANCE_GATE.md`
   - `workspace/.context/CRITERION_TYPE_CONTRACT.json`
   - `workspace/.context/UX_BASELINE.json`
   - `workspace/.context/COMPLETION_STATUS.json`
3. Confirm executable and installer names use the real app name (no boilerplate/template names).
4. If verify fails, continue fixing; do not mark Phase 6 complete.

Guardrails:
- Build success alone is insufficient.
- Evidence quality must match completion claims.
