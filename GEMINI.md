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

## Tool Rules

- **Prevent Stale Reads:** Before using file writing or string replacement tools, you MUST immediately perform a fresh file read of the target file. This aligns your tool cache and prevents "File has been modified since read..." or "File has not been read yet" errors.

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

2. **Verify output + summary evidence:**
   ```bash
   ls workspace/.context/source-docs/
   cat workspace/.context/source-docs/INDEX.md
  cat workspace/.context/INPUT_PREP_SUMMARY.json
   ```

3. **Expected files:**
   - `competition_*.md` - Main requirements
   - `wireframes.md` - UI mockups (if provided)
   - `application_structure.md` - Architecture details (if provided)
   - `*.json` - Data files to import
   - `*_images/` folders - Extracted diagrams/wireframes
   - `INDEX.md` - Overview of all documents
  - `INPUT_PREP_SUMMARY.json` - Machine-readable preparation status

**Update PROGRESS.md:**
```markdown
## Phase 0: Prepare Input Files
- [x] Checked input folder
- [x] Ran preparation script
- [x] Verified converted files in workspace/.context/source-docs/
- [x] Verified INPUT_PREP_SUMMARY.json status and zero PDF conversion failures
- Status: COMPLETE
```

---

### Phase 1: Extract Requirements
**Input:** `workspace/.context/source-docs/` (converted markdown files)
**Output:** `workspace/.context/REQUIREMENTS.md` AND `workspace/.context/DESIGN_CONTEXT.md`

Read the converted requirements documents from `workspace/.context/source-docs/` and synthesize them into a single structured markdown file (`workspace/.context/REQUIREMENTS.md`) with these sections:
- **Competition Name:** [Extract from document]
- **Objective:** What the application should accomplish
- **Core Features:** List all required functionality (with sub-features)
- **Database Requirements:** Tables needed. **CRITICAL:** Ensure the application can be comprehensively tested by automatically generating and inserting supplementary mock data for ALL domain entities. Maintain any competition-provided JSON seed data exactly, but augment it with realistic, longitudinal seed data. Specifically, mandate at least 5-10 records with varied historical timestamps per entity when generating seeding logic for applications that feature charts or historical tracking.
- **UI Requirements:** Pages/screens to build (reference wireframe images)
- **Technical Constraints:** Tech stack, time limits
- **Deliverables:** What to submit (source, exe, database, docs)

Also, dynamically generate `workspace/.context/DESIGN_CONTEXT.md` based on requirements, including:
- **Brand Personality:** Tone, mood, and target audience
- **Aesthetic Constraints:** Theme (e.g. minimalist, brutalist, modern)
- **Contrast Guardrails:** Implement a strict rule requiring high-contrast color pairings for floating elements, modals, and popups (e.g. text-white on dark backgrounds, text-gray-900 on light backgrounds) and verify contrast ratios.
- DO NOT PROMPT THE USER OR PAUSE FOR UI FEEDBACK. Decide this autonomously.


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
  - This now includes `pnpm run verify:evidence:scaffold:win` before packaging.
2. Packaged executable launches without startup error
3. Functional acceptance gate passes for critical workflows defined by the current competition requirements
  - Include the generation of a `MANUAL_TESTING_PLAN.md` file formatted strictly as a checklist (no conversational text) covering all competition requirements.
    - Run an automated local UI screenshot script using **Playwright's native Electron support** (`@playwright/test` using `_electron.launch`) to capture core screens and save to `workspace/.context/screenshots/`.
    - **Vision Check (CRITICAL):** You MUST explicitly pass these captured `.png` screenshots to your vision capabilities. Describe the visual layout, spacing, and styling. Compare it to the `DESIGN_CONTEXT.md` and the frontend-design skills. If the application resembles the default boilerplate theme (generic buttons, unstyled layouts), you MUST apply CSS/Tailwind fixes, rebuild, and re-capture the screenshots before continuing. Describe this review in `SCREENSHOT_REVIEW.json`.
4. Database file exists after launch
5. Deliverable naming uses the real competition app name (no `boilerplate`, `template`, or placeholder app names)
6. Acceptance artifacts are not placeholders/synthetic-only and contain no skipped required scenarios

Run these checks in order:

1. **Install dependencies (if needed)**
  ```bash
  cd workspace && pnpm install
  ```

2. **Automated verification (required)**
  ```bash
  cd workspace && pnpm run verify:win
  ```
  - This command must validate Windows preflight readiness, data hygiene (`db:clean` + `db:reset` + row-level seed verification), input preparation evidence, evidence scaffold initialization, build/package, executable smoke-test, functional acceptance artifact gate, criterion-type contract gate, UX baseline gate, reliability/handoff gate, and completion contract gate.
  - Keep the scaffold artifacts in `workspace/.context/` updated incrementally instead of creating them only at the end: `REQUIREMENTS.md`, `DOMAIN_MODEL.md`, `IMPLEMENTATION_PLAN.md`, `FUNCTIONAL_ACCEPTANCE.json`, `CRITERION_TYPE_CONTRACT.json`, `UX_BASELINE.json`, and `SCREENSHOT_REVIEW.json`.
  - If this script does not exist, create it in Phase 4 before continuing.

3. **Functional acceptance artifact gate (required)**
  - Produce `workspace/.context/FUNCTIONAL_ACCEPTANCE.json` before declaring completion. This is the gate source of truth.
  - Optional readable report: `workspace/.context/FUNCTIONAL_ACCEPTANCE.md`.
  - Produce `workspace/.context/SCREENSHOT_REVIEW.json` for the critical UI scenarios and store the referenced files under `workspace/.context/screenshots/`.
  - JSON must include a `scenarios` array with entries containing scenario id (`id` or `scenario_id`) plus pass/fail result (`result` or `status`).
  - `SCREENSHOT_REVIEW.json` must include `reviews` entries with `scenario_id`, `screenshot_path`, `expected_ui_claims`, `self_review_result`, `open_ui_concerns`, and `needs_human_review`.
  - Scenarios must be derived from `workspace/.context/REQUIREMENTS.md` and must remain app-agnostic in contract shape.
  - If a readable report is emitted, include an explicit line per required scenario: `scenario: <scenario-id>`.
  - Do not mark required scenarios as skipped. NEVER use the exact literal string "skipped" anywhere in the report or JSON, as it will trigger a hard gate failure. Ensure full coverage instead.
  - Do not use placeholder/synthetic-only acceptance output in either JSON or report form.
  - If scenario ids are customized, store them in `workspace/.context/CRITICAL_SCENARIOS.json` (`required_scenarios`, `required_ux_checks`, `required_screenshot_reviews`) or in `FUNCTIONAL_ACCEPTANCE.json.required_scenarios`.
  - The default required screenshot-reviewed scenarios are `keyboard-esc-cancel`, `criterion-add-button-placement`, `analysis-header-layout-stability`, `note-hover-edit-visibility`, `criterion-enter-save-parity`, and `variant-ordering-behavior`.

3b. **Criterion type contract artifact (required)**
  - Produce `workspace/.context/CRITERION_TYPE_CONTRACT.json` as the gate source of truth.
  - Optional readable report: `workspace/.context/CRITERION_TYPE_CONTRACT.md`.
  - JSON must declare a criterion-type contract identifier and include:
    - covered types for `note`, `ordinal`, and `numerical`
    - `rules` entries for `note-non-scoring`, `ordinal-explicit-options`, and `numerical-no-overlap`
  - For each required rule, include a passing `result`/`status` marker in JSON.

3c. **UX baseline + reliability artifacts (required)**
  - Produce `workspace/.context/UX_BASELINE.json` as the gate source of truth.
  - Optional readable report: `workspace/.context/UX_BASELINE.md`.
  - JSON must include passing `checks` entries for:
    - `keyboard-enter-confirm`
    - `keyboard-esc-cancel`
    - `validation-copy-visible`
    - `focus-stability`
    - `note-edit-ergonomics`
    - `criterion-add-button-placement`
    - `analysis-header-layout-stability`
    - `note-hover-edit-visibility`
    - `criterion-enter-save-parity`
    - `variant-ordering-behavior`
    - `focus-stability-after-input`
  - Produce `workspace/.context/RELIABILITY_STATUS.md` with:
    - `inactivity_threshold_minutes: <number>`
    - `timeout_threshold_minutes: <number>`
    - `status: NO_HANDOFF_REQUIRED` or `status: HANDOFF_COMPLETED`
  - If handoff occurred, also produce `workspace/.context/HANDOFF_MANIFEST.md` with `handoff_reason`, `from_agent`, `to_agent`, and `checkpoint_artifacts` entries.

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

**Strict Error Handling & Packaging Rules (Electron):**
- **No Empty Catch Blocks:** Never use empty `try {} catch(e) {}` blocks. All caught errors during initialization MUST log to a file or standard output, and the application must render a fallback error screen rather than a frozen UI.
- **Production Asset Paths:** Electron-builder bundles the app into an `.asar` archive. Do not hardcode paths to local workspace folders like `.context` within the runtime execution scope of `/src` or `/electron` for production. 
- **Database & User Data:** Mandate the use of `app.getPath('userData')` for all runtime database creation and modification.
- **Static Assets:** If seed data or static assets from outside the `src` folder are required at runtime, configure `extraResources` in `package.json` and construct paths using `process.resourcesPath`, never `__dirname` relative to `.context`.

**Error-burst policy (required):**
- If 3 consecutive tool/script failures occur in the same phase, stop repeating the same approach.
- Switch strategy (different tool/command/path), log the change in PROGRESS.md, and retry.
- If failures continue after 2 strategy switches, mark the phase as BLOCKED with explicit root cause and stop claiming completion.

**No-placeholder policy (required):**
- Never ship machine-readable evidence or readable reports containing `TODO`, `placeholder`, `synthetic-only`, or `hardcoded pass` markers.
- If evidence is incomplete, report BLOCKED instead of claiming completion.
- If `workspace/.context/FINAL_SUMMARY.md` is produced, include a `Known Limitations` section.

**Update PROGRESS.md with evidence, then mark all phases complete.**

---

## Technical Context (Boilerplate Patterns)

**"Anti-Anchoring" Directive for UI:**
  - The existing boilerplate UI is merely functional "developer art", mostly a placeholder skeleton.
  - You are strictly commanded to **aggressively overwrite, delete, and replace** the boilerplate's base CSS/Tailwind classes rather than safely blending into them. 
  - You MUST READ AND STRICTLY APPLY the design guidelines located at `workspace/.claude/skills/frontend-design/SKILL.md` (and its reference documents) and `workspace/.claude/skills/polish/SKILL.md` to ensure non-generic, high-quality, distinctive design driven by `DESIGN_CONTEXT.md`.

- Use PowerShell-safe commands and quoting on Windows (for example `Set-Location`, `Join-Path`, quoted absolute paths).
- Do not treat command flags (for example `robocopy /NFL`) as filesystem paths.
- Prefer explicit PowerShell command forms over shell-ambiguous snippets.
- For complex copy/sync/search operations, prefer workflow wrappers over raw slash-heavy one-liners:
  - `pnpm run safe:copy:tree -- -Source <src> -Destination <dst>`
  - `pnpm run safe:search -- -Path <path> -Pattern <pattern> -Recurse`
  - `pnpm run safe:robocopy -- -Source <src> -Destination <dst> -Mirror`
- Keep Copilot CLI version on a current build (minimum baseline: `0.0.332` or newer) and record the version in run evidence.
- Emergency override (`--allow-all-paths`) is allowed only for unattended recovery, must be explicitly logged in `PROGRESS.md`, and must not be the default mode.
- When a command fails due to shell mismatch, switch to a PowerShell-native equivalent and log the strategy change in `PROGRESS.md`.

## Agent Skills Discovery (required)

- Store reusable skills in agent-native project locations so tools auto-discover them:
  - Claude: `.claude/skills/<skill-name>/SKILL.md`
  - Gemini: `.gemini/skills/<skill-name>/SKILL.md` (or `.agents/skills/<skill-name>/SKILL.md`)
  - Copilot: `.github/skills/<skill-name>/SKILL.md`
- Keep skills app-agnostic and competition-general (no Prioritize-only behavior).
- Recommended shared skill topics:
  - SQLite migration + deterministic seed/reset workflow
  - Electron packaging + verify gate pitfalls
  - Functional acceptance evidence authoring checklist

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
- Input preparation summary path (`workspace/.context/INPUT_PREP_SUMMARY.json`)
- Input preparation status (`PASS` or `WARN`) and `pdf_converted_failed = 0`
- Verification command and exit code (`pnpm run verify:win`)
- Windows preflight evidence (`workspace/.context/PREFLIGHT_WIN.md`)
- Data hygiene evidence (`workspace/.context/DB_CLEAN.md`, `workspace/.context/DB_RESET.json`, and `workspace/.context/DB_RESET.md`)
- Executable path tested (`workspace/release/win-unpacked/*.exe`)
- Executable and installer names verified (real app name)
- Launch timestamp
- Database file path and existence check
- Functional acceptance command + exit code (`pnpm run functional:acceptance:win`)
- Functional acceptance JSON path (`workspace/.context/FUNCTIONAL_ACCEPTANCE.json`)
- Functional acceptance report path (`workspace/.context/FUNCTIONAL_ACCEPTANCE.md`, if emitted)
- Screenshot review artifact (`workspace/.context/SCREENSHOT_REVIEW.json`)
- Screenshot directory (`workspace/.context/screenshots/`)
- Functional acceptance scenarios passed (domain-critical lifecycle flows)
- Functional acceptance gate evidence (`workspace/.context/FUNCTIONAL_ACCEPTANCE_GATE.md`)
- Criterion type contract JSON path (`workspace/.context/CRITERION_TYPE_CONTRACT.json`)
- Criterion type contract report (`workspace/.context/CRITERION_TYPE_CONTRACT.md`, if emitted)
- Criterion type contract gate evidence (`workspace/.context/CRITERION_TYPE_CONTRACT_GATE.md`)
- UX baseline JSON path (`workspace/.context/UX_BASELINE.json`)
- UX baseline report (`workspace/.context/UX_BASELINE.md`, if emitted)
- UX baseline gate evidence (`workspace/.context/UX_BASELINE_GATE.md`)
- Reliability status report (`workspace/.context/RELIABILITY_STATUS.md`)
- Reliability gate evidence (`workspace/.context/RELIABILITY_GATE.md`)
- Completion status artifact (`workspace/.context/COMPLETION_STATUS.json`)
- Completion contract evidence (`workspace/.context/COMPLETION_CONTRACT.md`)
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
