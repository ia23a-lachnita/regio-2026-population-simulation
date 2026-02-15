# Competition Boilerplate - Coding Rules

## Architecture
- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Electron (Main process handles database)
- **Communication:** IPC via `contextBridge` in `preload.js`
- **Database Strategy:**
  - Primary: MySQL (localhost:3306)
  - Fallback: SQLite (local file `app.db`)
  - Auto-detection: Tries MySQL first, falls back to SQLite on connection failure

## Database Configuration
- **MySQL:** Edit `electron/database.js` → `DB_CONFIG` object (lines 9-14)
- **Schema:** Replace the example `items` table in `setupSqliteSchema()` with your tables
- **Note:** SQLite uses `INTEGER PRIMARY KEY AUTOINCREMENT`, MySQL uses `INT AUTO_INCREMENT`

## UI Patterns
- **Styling:** Tailwind CSS (dark theme with slate colors)
- **Components:**
  - `Button.tsx`: 4 variants (primary, secondary, danger, ghost) + 3 sizes
  - `Modal.tsx`: Reusable dialog with header/body/footer slots
- **Navigation:** React Router with sidebar NavItem component
- **Forms:** Standard inputs with slate-800 backgrounds and blue focus rings
- **Confirmations:** Use browser `confirm()` for destructive actions

## Code Style
- **Naming:** camelCase for variables/functions, PascalCase for Components
- **TypeScript:** Use interfaces for data models
- **Error Handling:** Wrap all IPC calls in try/catch blocks
- **Icons:** lucide-react library
- **Utilities:** `cn()` helper for conditional Tailwind classes (clsx + tailwind-merge)

## Development Workflow
1. **Define schema:** Edit `setupSqliteSchema()` in `electron/database.js`
2. **Create models:** Add TypeScript interfaces in your page components
3. **Build pages:** Create in `src/pages/`, add routes in `App.tsx`
4. **Database queries:** Use `dbQuery(sql, params)` from `src/lib/db.ts`

## Example CRUD Pattern
See `src/pages/HomePage.tsx` for a complete working example of:
- Loading data on component mount
- Creating records via modal form
- Deleting with confirmation dialog
- Error handling with try/catch
- Button and Modal component integration
