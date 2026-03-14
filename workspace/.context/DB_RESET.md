# db:reset evidence
- command: pnpm run db:reset
- result: PASS
- contract: C:\Users\xursc\projects\competition-2026\competition-regio\workspace\.context\SEED_CONTRACT.json
- database: C:\Users\xursc\projects\competition-2026\competition-regio\workspace\.context\.db-reset-profile\Population Simulation Prototype\app.db

## Required tables
- table: app_settings | min_rows: 3 | actual_rows: 3 | passed: True | sample_values: app_name, schema_version, version
