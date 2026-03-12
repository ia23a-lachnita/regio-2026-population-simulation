# Electron React Competition Boilerplate

A minimal Electron + React + TypeScript boilerplate for rapid development in time-limited competitions (hackathons, skills competitions, etc.).

## Features

- **Electron** desktop app framework
- **React 18** with TypeScript
- **Tailwind CSS** for styling (dark theme with slate colors)
- **MySQL → SQLite fallback** for database flexibility
- **IPC bridge** for secure frontend-backend communication
- Pre-built **Button** and **Modal** components
- Example CRUD pattern in HomePage

## Quick Start

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm run electron:dev

# Build for production
pnpm run electron:build

# Reset database state (clean + deterministic init/seed)
pnpm run db:clean
pnpm run db:reset
pnpm run verify:seed:reset:win

# Full Windows verification (build + package + smoke launch)
pnpm run verify:win
```

## Project Structure

```
boilerplate/
├── electron/
│   ├── main.js          # Electron main process
│   ├── preload.js       # IPC bridge (contextBridge)
│   └── database.js      # MySQL/SQLite connection & queries
├── src/
│   ├── components/      # Reusable UI components (Button, Modal)
│   ├── pages/           # Page components (HomePage)
│   ├── lib/             # Database API wrapper (db.ts)
│   └── App.tsx          # Main app with routing & navigation
├── GEMINI.md            # Coding rules & patterns
├── package.json
└── README.md            # This file
```

## Database Setup

### Option 1: MySQL (Recommended for competitions)
1. Install MySQL/MariaDB
2. Create database: `CREATE DATABASE competition_db;`
3. App will auto-connect on startup

### Option 2: SQLite (Automatic fallback)
- No setup needed
- Database file created at: `userData/app.db`
- On Windows: `C:\Users\<user>\AppData\Roaming\electron-react-boilerplate\app.db`

## Validation Gate

- Use `pnpm run verify:win` before claiming completion.
- This command runs:
  - deterministic data hygiene (`db:clean`, `db:reset`),
  - row-level seed verification against `workspace/.context/SEED_CONTRACT.json`,
  - input-preparation gate,
  - build/package,
  - executable smoke launch,
  - functional acceptance artifact gate,
  - criterion-type contract gate,
  - UX baseline gate,
  - completion-contract quality checks.
- Packaged output location: `release/win-unpacked/`.

### Functional Acceptance Artifact Contract

- Create `workspace/.context/FUNCTIONAL_ACCEPTANCE.json` before final completion. This is the gate source of truth.
- Optional readable report: `workspace/.context/FUNCTIONAL_ACCEPTANCE.md`.
- Create `workspace/.context/SCREENSHOT_REVIEW.json` for critical UI scenarios and store referenced image files under `workspace/.context/screenshots/`.
- The JSON must include a `scenarios` array with required scenario ids and pass/fail results.
- `SCREENSHOT_REVIEW.json` must include `reviews` entries with `scenario_id`, `screenshot_path`, `expected_ui_claims`, `self_review_result`, `open_ui_concerns`, and `needs_human_review`.
- If a readable report is emitted, include required scenario ids as lines in this format:
  - `scenario: <scenario-id>`
- Derive scenarios from current requirements and keep `workspace/.context/CRITICAL_SCENARIOS.json` aligned when you customize the required catalog.
- Do not include placeholder/synthetic-only markers and do not skip required scenarios in either JSON or report form.
- Required screenshot-reviewed scenarios now include at least `keyboard-esc-cancel`, `criterion-add-button-placement`, `analysis-header-layout-stability`, `note-hover-edit-visibility`, `criterion-enter-save-parity`, and `variant-ordering-behavior`.
- Required UX checks now include `criterion-add-button-placement`, `analysis-header-layout-stability`, `note-hover-edit-visibility`, `criterion-enter-save-parity`, `variant-ordering-behavior`, and `focus-stability-after-input` in addition to the earlier keyboard and validation checks.
- If `workspace/.context/FINAL_SUMMARY.md` is present, include a `Known Limitations` section.

### Seed Reset Contract

- `workspace/.context/SEED_CONTRACT.json` defines which seeded tables must exist after reset.
- `pnpm run db:reset` must emit both `workspace/.context/DB_RESET.json` and `workspace/.context/DB_RESET.md`.
- Reset is not successful unless the configured tables meet their minimum row counts.

## Customization

### 1. Replace Example Schema

Edit `electron/database.js` → `setupSqliteSchema()` (lines 32-42):

```javascript
// Delete this example table, add your tables
db.exec(`
  CREATE TABLE IF NOT EXISTS your_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    your_field TEXT NOT NULL
  );
`);
```

### 2. Add New Pages

1. Create component in `src/pages/YourPage.tsx`
2. Add route in `src/App.tsx`:
   ```typescript
   <Route path="/your-page" element={<YourPage />} />
   ```
3. Add navigation item in sidebar:
   ```typescript
   <NavItem to="/your-page" icon={YourIcon}>Your Page</NavItem>
   ```

### 3. Update Branding

- App title: `src/App.tsx` (line 32) → Change "Competition App"
- Browser title: `index.html` (line 7)
- Package name: `package.json` (line 2)
- Database name: `electron/database.js` (line 13) → Change "competition_db"

### 4. Database Queries

Use the `dbQuery()` helper from `src/lib/db.ts`:

```typescript
import { dbQuery } from '../lib/db';

// SELECT
const results = await dbQuery('SELECT * FROM table WHERE id = ?', [id]);

// INSERT
await dbQuery('INSERT INTO table (name) VALUES (?)', [name]);

// UPDATE
await dbQuery('UPDATE table SET name = ? WHERE id = ?', [name, id]);

// DELETE
await dbQuery('DELETE FROM table WHERE id = ?', [id]);
```

## Built With

- React 18.3 + TypeScript 5.2
- Electron 29
- Vite 5 (build tool)
- Tailwind CSS 3.4
- better-sqlite3 + mysql2
- lucide-react (icons)

## License

MIT - Free for competition use
