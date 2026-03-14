# verify:criterion:contract:win evidence
- command: pnpm run verify:criterion:contract:win
- result: PASS
- acceptance_artifact: C:\Users\xursc\projects\competition-2026\competition-regio\workspace\.context\FUNCTIONAL_ACCEPTANCE.json
- contract_artifact: C:\Users\xursc\projects\competition-2026\competition-regio\workspace\.context\CRITERION_TYPE_CONTRACT.json
- acceptance_report_artifact: C:\Users\xursc\projects\competition-2026\competition-regio\workspace\.context\FUNCTIONAL_ACCEPTANCE.md
- contract_report_artifact: C:\Users\xursc\projects\competition-2026\competition-regio\workspace\.context\CRITERION_TYPE_CONTRACT.md
- required_functional_scenarios:
  - criterion-note-fields
  - criterion-ordinal-fields
  - criterion-numerical-fields
  - numerical-range-validation

- required_contract_rules:
  - note-non-scoring
  - ordinal-explicit-options
  - numerical-no-overlap

