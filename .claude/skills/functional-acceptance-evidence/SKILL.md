---
name: functional-acceptance-evidence
description: Produces and validates functional acceptance evidence for critical requirement scenarios without placeholders.
---

Use this skill when creating final acceptance evidence.

Required output:
- `workspace/.context/FUNCTIONAL_ACCEPTANCE.json`
- `workspace/.context/FUNCTIONAL_ACCEPTANCE.md` (optional readable report)
- `workspace/.context/SCREENSHOT_REVIEW.json`
- referenced screenshot files under `workspace/.context/screenshots/`

Rules:
1. Derive required scenarios from `workspace/.context/REQUIREMENTS.md`.
2. Write a `scenarios` array with one entry per required scenario including scenario id and concrete pass/fail result.
3. Keep `workspace/.context/CRITICAL_SCENARIOS.json` aligned if you customize the required scenario/check catalog.
4. Populate `SCREENSHOT_REVIEW.json.reviews` for the critical UI scenarios with `scenario_id`, `screenshot_path`, `expected_ui_claims`, `self_review_result`, `open_ui_concerns`, and `needs_human_review`.
5. Ensure each referenced screenshot file actually exists.
6. If a readable report is emitted, add one line per required scenario: `scenario: <scenario-id>`.
7. Never use placeholder/synthetic-only text.
8. Never mark required scenarios as skipped.

Validation expectation:
- `pnpm run functional:acceptance:win` must pass.
