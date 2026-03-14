# verify:win evidence
- command: pnpm run verify:win
- result: PASS
- timestamp: 2026-03-14T10:13:46
- executable: C:\Users\xursc\projects\competition-2026\competition-regio\workspace\release\win-unpacked\PopulationSimulation.exe
- db_path: C:\Users\xursc\projects\competition-2026\competition-regio\workspace\.context\.smoke-profile\population-simulation-prototype\app.db
- db_exists: True
- note: This smoke test verifies launch + process health + database creation only.
