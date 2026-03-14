# verify:ux:baseline:win evidence
- command: pnpm run verify:ux:baseline:win
- result: PASS
- baseline_artifact: C:\Users\xursc\projects\competition-2026\competition-regio\workspace\.context\UX_BASELINE.json
- baseline_report_artifact: C:\Users\xursc\projects\competition-2026\competition-regio\workspace\.context\UX_BASELINE.md
- config_artifact: C:\Users\xursc\projects\competition-2026\competition-regio\workspace\.context\CRITICAL_SCENARIOS.json
- required_checks:
  - keyboard-enter-confirm
  - keyboard-esc-cancel
  - validation-copy-visible
  - focus-stability
  - note-edit-ergonomics
  - criterion-add-button-placement
  - analysis-header-layout-stability
  - note-hover-edit-visibility
  - criterion-enter-save-parity
  - variant-ordering-behavior
  - focus-stability-after-input

