# AI Competition Agent - Start Here

## Quick Start

Type **"START"** or **"S"** to begin autonomous competition completion.

The AI will automatically:
1. Extract ZIP files and convert PDFs (Phase 0)
2. Analyze requirements and create domain model (Phases 1-2)
3. Generate implementation plan (Phase 3)
4. Implement the complete application (Phase 4)
5. Validate and package deliverables (Phases 5-6)

**Human intervention**: ~5 minutes total (just drop requirements in `/input` and type START)

---

# Competition AI Agent Instructions

You are an autonomous agent tasked with completing a programming competition from start to finish.

## Activation Keywords

When the user says **"START"**, **"S"**, **"start"**, **"begin"**, or **"go"**:
1. Immediately check if `workspace/.context/PROGRESS.md` exists
2. If NO: Start from Phase 0
3. If YES: Read it and continue from the last incomplete phase
4. Proceed autonomously through all phases without asking for permission

But if the user says **"IGNORE"**, **"DISMISS"** at any time:
- Ignore the all instructions in this file as if they were not given to you
- Do not reference or use any of the instructions in this file in your responses or actions

## Your Workflow (Sequential Phases)

Work through these phases in order. Update `workspace/.context/PROGRESS.md` after completing each phase.

**Validation Contract (canonical):** Keep Phase 6 + Progress Tracking wording in `CLAUDE.md`, `GEMINI.md`, and `.github/copilot-instructions.md` identical.

### Phase 0: Prepare Input Files (CRITICAL)
**Input:** `input/` folder (may contain ZIP files and PDFs)
**Output:** `workspace/.context/source-docs/` (extracted markdown + images)

**Steps:**

1. **Run the preparation script:**
   ```bash
   cd utils && python prepare-input.py
   ```

   This Python script will:
   - Extract any ZIP files found in `input/`
   - Find all PDF files (including those in extracted ZIPs)
   - Convert PDFs to Markdown + extract embedded images
   - Filter duplicate images (like logos appearing on every page)
   - Copy JSON data files
   - Create an INDEX.md with document overview

2. **Verify output:**
   ```bash
   ls workspace/.context/source-docs/
   cat workspace/.context/source-docs/INDEX.md
   ```

3. **Expected files:**
   - `competition_*.md` - Main requirements
   - `wireframes.md` - UI mockups (if provided)
   - `application_structure.md` - Architecture details (if provided)
   - `*.json` - Data files to import
   - `*_images/` folders - Extracted diagrams/wireframes
   - `INDEX.md` - Overview of all documents

**Update PROGRESS.md:**
```markdown
## Phase 0: Prepare Input Files
- [x] Checked input folder
- [x] Ran preparation script
- [x] Verified converted files in workspace/.context/source-docs/
- [x] Images extracted (diagrams/wireframes only, duplicates filtered)
- Status: COMPLETE
```

---

### Phase 1: Extract Requirements
**Input:** `workspace/.context/source-docs/` (converted markdown files)
**Output:** `workspace/.context/REQUIREMENTS.md`

Read the converted requirements documents from `workspace/.context/source-docs/` and synthesize them into a single structured markdown file with these sections:
- **Competition Name:** [Extract from document]
- **Objective:** What the application should accomplish
- **Core Features:** List all required functionality (with sub-features)
- **Database Requirements:** Tables needed (with all columns and relationships)
- **UI Requirements:** Pages/screens to build (reference wireframe images)
- **Technical Constraints:** Tech stack, time limits
- **Deliverables:** What to submit (source, exe, database, docs)

**Format Example:**
```markdown
# Competition Requirements

## Competition Name
AthliTrack - Gym Tracker Application

## Objective
Build a desktop application to track gym workouts, exercises, and progress over time.

## Core Features
1. Exercise Management
   - Add/edit/delete exercises (name, description, type)
   - Types: barbell, dumbbell, cable, machine
   - Import from exercises.json

2. Template Management
   - Create workout templates with exercises
   - Specify sets and reps per exercise
   - Reuse templates for quick workout creation

3. Workout Tracking
   - Create workouts from templates or from scratch
   - Track: exercise, sets, reps, weight (kg)
   - Record start/end datetime
   - Calculate workout statistics (volume, total sets/reps)

4. Progress Tracking
   - View exercise history over time
   - Calculate total volume per exercise execution
   - Predict next expected volume (based on average increase)
   - Display progress chart (last 3 months)

## Database Requirements
- **Exercises:** id, name, description, type
- **Templates:** id, name
- **TemplateExercises:** id, template_id (FK), exercise_id (FK), sets, reps_per_set, order_index
- **Workouts:** id, name, start_datetime, end_datetime
- **WorkoutExercises:** id, workout_id (FK), exercise_id (FK), set_number, reps, weight_kg, order_index

## UI Requirements (see wireframes_images/)
- Main Window: List all workouts (name, dates, duration), View/Edit/Delete buttons
- Exercises Window: List exercises, My Progress button per exercise
- Templates Window: List templates, Add/Edit/Delete buttons
- Add/Edit Template: Name field, exercise selector, sets/reps inputs
- Add/Edit Workout: Name, start/end datetime, exercise table (sets x reps x weight)
- View Workout: Display exercises with stats, My Progress button
- Progress Window: Exercise history table, line chart, next expected value

## Technical Constraints
- Platform: Electron + React + TypeScript
- Database: SQLite (via electron/database.js)
- UI: Tailwind CSS (existing components: Button, Modal)
- Charts: Need chart library for Progress Window
- Time: 3 hours

## Deliverables
- Source code (no node_modules)
- Executable (.exe or app bundle)
- Database schema (schema.sql)
- README.md with installation instructions
```

**Update PROGRESS.md after completion.**

---

### Phase 2: Analyze Domain
**Input:** `workspace/.context/REQUIREMENTS.md`
**Output:** `workspace/.context/DOMAIN_MODEL.md`

Perform domain modeling based on the requirements.

**Format Example:**
```markdown
# Domain Model

## Entities & Relationships

```
Exercises (M) ----< TemplateExercises >---- (1) Templates
Exercises (M) ----< WorkoutExercises >---- (1) Workouts
```

- A Template contains multiple TemplateExercises (with sets/reps config)
- A Workout contains multiple WorkoutExercises (with actual weight/reps logged)
- Exercises are reused across templates and workouts

## Entity Definitions

### Exercises
- id: INTEGER PRIMARY KEY AUTOINCREMENT
- name: TEXT NOT NULL UNIQUE
- description: TEXT
- type: TEXT (barbell, dumbbell, cable, machine)

### Templates
- id: INTEGER PRIMARY KEY AUTOINCREMENT
- name: TEXT NOT NULL UNIQUE

### TemplateExercises
- id: INTEGER PRIMARY KEY AUTOINCREMENT
- template_id: INTEGER FOREIGN KEY → Templates.id ON DELETE CASCADE
- exercise_id: INTEGER FOREIGN KEY → Exercises.id
- sets: INTEGER NOT NULL
- reps_per_set: INTEGER NOT NULL
- order_index: INTEGER (for preserving exercise order)

### Workouts
- id: INTEGER PRIMARY KEY AUTOINCREMENT
- name: TEXT NOT NULL UNIQUE
- start_datetime: TEXT NOT NULL (ISO8601)
- end_datetime: TEXT NOT NULL (ISO8601)

### WorkoutExercises
- id: INTEGER PRIMARY KEY AUTOINCREMENT
- workout_id: INTEGER FOREIGN KEY → Workouts.id ON DELETE CASCADE
- exercise_id: INTEGER FOREIGN KEY → Exercises.id
- set_number: INTEGER NOT NULL (1, 2, 3, ...)
- reps: INTEGER NOT NULL
- weight_kg: REAL NOT NULL
- order_index: INTEGER

## Feature → Page Mapping

| Feature | Route | Page File | Main Components |
|---------|-------|-----------|-----------------|
| Workout List | `/` | HomePage.tsx | WorkoutList, ViewButton |
| Exercise Management | `/exercises` | ExercisesPage.tsx | ExerciseList, ExerciseForm, ProgressButton |
| Template Management | `/templates` | TemplatesPage.tsx | TemplateList, TemplateForm |
| Add/Edit Template | modal | TemplateFormModal | ExerciseSelector, SetsRepsInputs |
| Add/Edit Workout | modal | WorkoutFormModal | TemplatePicker, ExerciseTable |
| View Workout | modal | ViewWorkoutModal | ExerciseStats, ProgressButton |
| Progress Tracking | modal | ProgressModal | HistoryTable, LineChart |

## Component Architecture

**Pages:**
- HomePage.tsx - Main workout list (replace existing items example)
- ExercisesPage.tsx - Exercise CRUD
- TemplatesPage.tsx - Template CRUD

**Modals:**
- TemplateFormModal - Add/edit templates with exercise selection
- WorkoutFormModal - Add/edit workouts with sets/reps/weight tracking
- ViewWorkoutModal - Display workout details and stats
- ProgressModal - Show exercise progress over time with chart

**Reusable Components (already exist):**
- Button (primary, secondary, danger variants)
- Modal (header, body, footer slots)

**New Components Needed:**
- LineChart component (for progress visualization)
- ExerciseSelector (dropdown or list to pick exercises)
- SetsRepsTable (editable table for workout data entry)
```

**Update PROGRESS.md after completion.**

---

### Phase 3: Generate Implementation Plan
**Input:** REQUIREMENTS.md + DOMAIN_MODEL.md
**Output:** `workspace/.context/IMPLEMENTATION_PLAN.md` + `TECHNICAL_CONTEXT.md`

Create detailed implementation plans.

**IMPLEMENTATION_PLAN.md Format:**
```markdown
# Implementation Plan

## Phase 1: Database Schema (15 min)
**File:** `workspace/electron/database.js`

Tasks:
1. Remove example "items" table from setupSqliteSchema()
2. Create Exercises table
3. Create Templates table
4. Create TemplateExercises table (with FKs)
5. Create Workouts table
6. Create WorkoutExercises table (with FKs)
7. Import data from exercises.json

**SQL Schema:**
```sql
CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS template_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  sets INTEGER NOT NULL,
  reps_per_set INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  start_datetime TEXT NOT NULL,
  end_datetime TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight_kg REAL NOT NULL,
  order_index INTEGER NOT NULL,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);
```

**Import exercises.json:**
```javascript
// In setupDatabase() function, after schema creation:
const exercisesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../workspace/.context/source-docs/exercises.json'), 'utf8')
);

for (const ex of exercisesData) {
  await dbRun(
    'INSERT OR IGNORE INTO exercises (name, description, type) VALUES (?, ?, ?)',
    [ex.name, ex.description, ex.type]
  );
}
```

## Phase 2: TypeScript Interfaces (10 min)
**File:** `workspace/src/types/index.ts`

```typescript
export interface Exercise {
  id?: number;
  name: string;
  description?: string;
  type: 'barbell' | 'dumbbell' | 'cable' | 'machine';
}

export interface Template {
  id?: number;
  name: string;
}

export interface TemplateExercise {
  id?: number;
  template_id: number;
  exercise_id: number;
  sets: number;
  reps_per_set: number;
  order_index: number;
  // Joined data:
  exercise_name?: string;
}

export interface Workout {
  id?: number;
  name: string;
  start_datetime: string;  // ISO8601
  end_datetime: string;    // ISO8601
  duration?: number;        // calculated in minutes
}

export interface WorkoutExercise {
  id?: number;
  workout_id: number;
  exercise_id: number;
  set_number: number;
  reps: number;
  weight_kg: number;
  order_index: number;
  // Joined data:
  exercise_name?: string;
}
```

## Phase 3: Core Pages (90 min)

### 3.1 Update HomePage.tsx (20 min)
**File:** `workspace/src/pages/HomePage.tsx`

Tasks:
1. Replace "items" CRUD with workouts
2. Display: name, start_datetime, end_datetime, duration (calculated)
3. Add View Workout button (opens modal)
4. Add Edit/Delete buttons
5. Calculate duration: `(new Date(end) - new Date(start)) / 60000` minutes

### 3.2 Create ExercisesPage.tsx (20 min)
**File:** `workspace/src/pages/ExercisesPage.tsx`

Tasks:
1. Copy structure from HomePage.tsx
2. Fields: name, description, type (dropdown)
3. Display in table format
4. Add "My Progress" button → opens ProgressModal

### 3.3 Create TemplatesPage.tsx (25 min)
**File:** `workspace/src/pages/TemplatesPage.tsx`

Tasks:
1. List templates with name
2. Edit button → opens TemplateFormModal
3. Delete with confirmation

### 3.4 Create TemplateFormModal (25 min)
**File:** `workspace/src/components/TemplateFormModal.tsx`

Tasks:
1. Template name input
2. Exercise selector (dropdown of all exercises)
3. Sets and reps inputs
4. Add Exercise button
5. Display added exercises in list (with remove button)
6. Save template + template_exercises records

## Phase 4: Advanced Modals (60 min)

### 4.1 WorkoutFormModal (30 min)
**File:** `workspace/src/components/WorkoutFormModal.tsx`

Tasks:
1. Name input
2. Start/End datetime pickers
3. Template selector (optional, for pre-filling)
4. Exercise table: Exercise | Set | Reps | Weight
5. Add row functionality
6. Inline editing
7. Save workout + workout_exercises

### 4.2 ViewWorkoutModal (15 min)
**File:** `workspace/src/components/ViewWorkoutModal.tsx`

Tasks:
1. Display workout name, dates, duration
2. Show exercises in table
3. Calculate and display:
   - Total volume: SUM(weight * reps)
   - Total sets: COUNT(distinct set_number per exercise)
   - Total reps: SUM(reps)
4. "My Progress" button per exercise

### 4.3 ProgressModal (15 min)
**File:** `workspace/src/components/ProgressModal.tsx`

Tasks:
1. Query: All workout_exercises for selected exercise, grouped by workout date
2. Calculate volume per session: SUM(weight * reps) per workout
3. Display history table
4. Calculate next expected volume:
   - Get volume increases between consecutive workouts
   - Average the increases
   - Add to most recent volume
5. Install recharts: `pnpm add recharts`
6. Create line chart showing last 3 months

## Phase 5: Routing & Navigation (10 min)
**File:** `workspace/src/App.tsx`

Tasks:
1. Change app title from "Competition App" to "AthliTrack"
2. Add routes: /, /exercises, /templates
3. Update navigation menu
4. Import new pages

```typescript
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/exercises" element={<ExercisesPage />} />
  <Route path="/templates" element={<TemplatesPage />} />
</Routes>
```

## Phase 6: Testing & Polish (30 min)

Tasks:
1. Test exercises import on first run
2. Test template creation with multiple exercises
3. Test workout creation from template
4. Test manual workout creation
5. Test progress chart rendering
6. Check all foreign key constraints
7. Verify datetime validation (end > start)
8. Test delete cascades
9. Polish UI spacing/alignment
```

**TECHNICAL_CONTEXT.md** - Copy from GEMINI.md patterns (see below)

**Update PROGRESS.md after completion.**

---

### Phase 4: Initialize Workspace (if not already done)
**Input:** `boilerplate/` folder
**Output:** Copy to `workspace/` (if workspace is empty)

This is usually done by reset-workspace script, but verify:

```bash
# Check if workspace has boilerplate files
ls workspace/src workspace/electron

# If missing, copy from boilerplate
if [ ! -d "workspace/src" ]; then
  cp -r boilerplate/* workspace/
  rm -rf workspace/node_modules workspace/dist
fi
```

---

### Phase 5: Implement
**Input:** IMPLEMENTATION_PLAN.md + TECHNICAL_CONTEXT.md
**Output:** Fully functional application

Follow the implementation plan step-by-step. Use patterns from TECHNICAL_CONTEXT.md.

**CRITICAL:** Update `workspace/.context/PROGRESS.md` after completing each major task!

---

### Phase 6: Validate & Package (HARD GATE)
**Input:** Implemented workspace
**Output:** Validation evidence in PROGRESS.md + `delivery/` folder

CRITICAL: **Build success does NOT mean completion.**

YOU ARE NOT DONE UNTIL ALL are true:
1. `pnpm run verify:win` succeeds (exit code 0)
2. Packaged executable launches without startup error
3. Automated UI acceptance tests pass for critical workflows (analysis + criterion lifecycle)
4. Database file exists after launch
5. Deliverable naming uses the real competition app name (no `boilerplate`, `template`, or placeholder app names)

Run these checks in order:

1. **Install dependencies (if needed)**
  ```bash
  cd workspace && pnpm install
  ```

2. **Automated verification (required)**
  ```bash
  cd workspace && pnpm run verify:win
  ```
  - This command must build, run automated UI acceptance checks, package, and smoke-test the executable.
  - If this script does not exist, create it in Phase 4 before continuing.

3. **Automated UI acceptance gate (required)**
  - Add and run UI tests that validate all critical workflows:
    - create analysis
    - open analysis
    - edit analysis
    - delete analysis
    - create criterion
    - edit criterion
    - delete criterion
    - create/save numerical criterion value
    - verify numerical criterion value persists after reload
  - Persist test evidence to `workspace/.context/UI_ACCEPTANCE.md`
  - Do not substitute this gate with manual checks unless automation is technically impossible.
  - **Implementation location (instruction-first):**
    - Treat this instruction file as the source of truth for acceptance automation behavior.
    - Do not rely on `README.md` as the only place for acceptance/test-contract requirements.
  - **Template-safe acceptance pattern (generic):**
    - Use a reusable script (for example `scripts/ui-acceptance.mjs`) that is domain-agnostic.
    - Parameterize domain specifics via config/artifact inputs (selectors, entity names, required workflows), not hard-coded app names.
    - Enforce reliability defaults: isolated user data dir, explicit dev server URL/port, deterministic evidence output.
    - Write acceptance evidence to `workspace/.context/UI_ACCEPTANCE.md` and fail the gate if any required scenario fails.

4. **Naming validation (required)**
  - Set production app name before final packaging (for example in `package.json` `name`, `productName`, and `build.win.executableName` where applicable)
  - Verify final executable and installer names use the real app name
  - Do not ship artifacts containing placeholder names like `boilerplate` or `competition-app`

5. **Delivery packaging**
  ```bash
  mkdir -p delivery/source
  cp -r workspace/* delivery/source/
  rm -rf delivery/source/node_modules delivery/source/dist delivery/source/release

  mkdir -p delivery/executable
  cp -r workspace/release/* delivery/executable/
  ```

6. **Database Schema + README**
  - Extract CREATE TABLE statements from `electron/database.js`
  - Save as `delivery/schema.sql`
  - Create `delivery/README.md` with install/run instructions

**If ANY check fails:** debug and fix; do not mark Phase 6 complete.

**Error-burst policy (required):**
- If 3 consecutive tool/script failures occur in the same phase, stop repeating the same approach.
- Switch strategy (different tool/command/path), log the change in PROGRESS.md, and retry.
- If failures continue after 2 strategy switches, mark the phase as BLOCKED with explicit root cause and stop claiming completion.

**Update PROGRESS.md with evidence, then mark all phases complete.**

---

## Technical Context (Boilerplate Patterns)

### Architecture
- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Electron (Main process handles database)
- **Communication:** IPC via `contextBridge` in `preload.js`
- **Database:** SQLite (local file `app.db` in user data directory)

### Database Configuration
- **Schema Definition:** `electron/database.js` → `setupSqliteSchema()` function
- **Query Helper:** Use `dbQuery(sql, params)` from `src/lib/db.ts`
- **Auto Increment:** SQLite uses `INTEGER PRIMARY KEY AUTOINCREMENT`

### UI Patterns
- **Styling:** Tailwind CSS (dark theme with slate colors)
- **Components:**
  - `Button.tsx`: 4 variants (primary, secondary, danger, ghost) + 3 sizes
  - `Modal.tsx`: Reusable dialog with header/body/footer slots
- **Navigation:** React Router with NavItem component
- **Forms:** Standard inputs with slate-800 backgrounds and blue focus rings
- **Confirmations:** Use browser `confirm()` for destructive actions

### Code Style
- **Naming:** camelCase for variables/functions, PascalCase for Components
- **TypeScript:** Use interfaces for data models (define in `src/types/index.ts`)
- **Error Handling:** Wrap all IPC calls in try/catch blocks
- **Icons:** lucide-react library
- **Utilities:** `cn()` helper for conditional Tailwind classes (clsx + tailwind-merge)

### Database Query Pattern

**File:** Any component
**Import:** `import { dbQuery } from '../lib/db';`

**Usage:**
```typescript
// SELECT
const exercises = await dbQuery('SELECT * FROM exercises ORDER BY name', []);

// INSERT
await dbQuery(
  'INSERT INTO exercises (name, description, type) VALUES (?, ?, ?)',
  [name, description, type]
);

// UPDATE
await dbQuery(
  'UPDATE exercises SET name = ?, type = ? WHERE id = ?',
  [newName, newType, id]
);

// DELETE
await dbQuery('DELETE FROM exercises WHERE id = ?', [id]);

// JOIN
const templateExercises = await dbQuery(`
  SELECT te.*, e.name as exercise_name
  FROM template_exercises te
  JOIN exercises e ON te.exercise_id = e.id
  WHERE te.template_id = ?
  ORDER BY te.order_index
`, [templateId]);
```

### CRUD Page Pattern

**Reference:** `boilerplate/src/pages/HomePage.tsx`

**Structure:**
```typescript
import { useState, useEffect } from 'react';
import { dbQuery } from '../lib/db';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

interface MyItem {
  id?: number;
  name: string;
  // ... other fields
}

export default function MyPage() {
  const [items, setItems] = useState<MyItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<MyItem>({ name: '' });
  const [editingId, setEditingId] = useState<number | null>(null);

  // Load data on mount
  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      const results = await dbQuery('SELECT * FROM my_table', []);
      setItems(results);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  }

  async function handleSubmit() {
    try {
      if (editingId) {
        await dbQuery('UPDATE my_table SET name = ? WHERE id = ?', [formData.name, editingId]);
      } else {
        await dbQuery('INSERT INTO my_table (name) VALUES (?)', [formData.name]);
      }
      setIsModalOpen(false);
      setFormData({ name: '' });
      setEditingId(null);
      loadItems(); // Refresh list
    } catch (error) {
      console.error('Failed to save:', error);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure?')) return;

    try {
      await dbQuery('DELETE FROM my_table WHERE id = ?', [id]);
      loadItems();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  }

  function handleEdit(item: MyItem) {
    setFormData(item);
    setEditingId(item.id!);
    setIsModalOpen(true);
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Items</h1>
        <Button onClick={() => {
          setFormData({ name: '' });
          setEditingId(null);
          setIsModalOpen(true);
        }}>
          Add Item
        </Button>
      </div>

      <div className="grid gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-slate-800 p-4 rounded flex justify-between items-center">
            <span>{item.name}</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleEdit(item)}>Edit</Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(item.id!)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Item' : 'Add Item'}
        footer={
          <>
            <Button onClick={handleSubmit}>Save</Button>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          </>
        }
      >
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded"
          placeholder="Name"
        />
      </Modal>
    </div>
  );
}
```

### Component Usage

**Button:**
```typescript
import { Button } from '../components/ui/Button';

<Button onClick={handleClick}>Click Me</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="danger">Delete</Button>
<Button size="sm">Small</Button>
```

**Modal:**
```typescript
import { Modal } from '../components/ui/Modal';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  footer={
    <>
      <Button onClick={handleSave}>Save</Button>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
    </>
  }
>
  {/* Modal content */}
</Modal>
```

### File Locations

- **Database:** `workspace/electron/database.js`
- **Types:** `workspace/src/types/index.ts`
- **Pages:** `workspace/src/pages/*.tsx`
- **Components:** `workspace/src/components/**/*.tsx`
- **DB Helper:** `workspace/src/lib/db.ts`
- **Routing:** `workspace/src/App.tsx`

---

## Progress Tracking (CRITICAL)

**Always update** `workspace/.context/PROGRESS.md` after completing each phase!

**Phase 6 is BLOCKING:** Do not write `Status: COMPLETE` unless all required evidence is present.

Required Phase 6 evidence:
- Verification command and exit code (`pnpm run verify:win`)
- Executable path tested (`workspace/release/win-unpacked/*.exe`)
- Executable and installer names verified (real app name)
- Launch timestamp
- Database file path and existence check
- Automated UI acceptance command + exit code
- Automated UI acceptance report path (`workspace/.context/UI_ACCEPTANCE.md`)
- Automated UI acceptance scenarios passed (analysis/criterion lifecycle, including numerical persistence)
- Error summary (`NONE` if no errors)

Example:
```markdown
## Phase 0: Prepare Input Files
- [x] Ran utils/prepare-input.js
- [x] Verified source-docs/ folder
- [x] 21 images extracted (duplicates filtered)
- Status: COMPLETE
- Timestamp: 2026-02-15 20:30

## Phase 1: Extract Requirements
- [x] Read all converted markdown files
- [x] Viewed wireframe images
- [x] Created REQUIREMENTS.md
- Status: COMPLETE

... (continue for all phases)
```

---

## Resume Capability

If interrupted:
1. Read `workspace/.context/PROGRESS.md`
2. Check last completed phase
3. If Phase 6 is marked complete but evidence is missing, treat Phase 6 as incomplete
4. Continue from next incomplete phase
5. Do NOT restart from Phase 0 unless explicitly told

---

## Getting Started

When user types **"START"** or **"S"**:
1. Check if PROGRESS.md exists
   - If NO: Begin Phase 0
   - If YES: Read and continue from last phase
2. Proceed autonomously through all phases
3. Update PROGRESS.md after each phase
4. When complete, notify user that `/delivery` folder is ready for submission

**Total time:** 60-120 minutes (AI autonomous)
**Human time:** ~5 minutes (drop ZIP, type START, submit)
