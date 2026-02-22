---
name: functional-acceptance-evidence
description: Produces and validates functional acceptance evidence for critical requirement scenarios without placeholders.
---

Use this skill when creating final acceptance evidence.

Required output:
- `workspace/.context/FUNCTIONAL_ACCEPTANCE.md`

Rules:
1. Derive required scenarios from `workspace/.context/REQUIREMENTS.md`.
2. Add one line per required scenario: `scenario: <scenario-id>`.
3. Mark each scenario with concrete pass/fail evidence.
4. Never use placeholder/synthetic-only text.
5. Never mark required scenarios as skipped.

Validation expectation:
- `pnpm run functional:acceptance:win` must pass.
