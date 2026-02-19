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
- This command runs packaging plus executable smoke launch checks.
- Packaged output location: `release/win-unpacked/`.

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
