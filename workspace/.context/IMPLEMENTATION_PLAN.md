# Implementation Plan

## Phase 1: Database Schema
**File:** `electron/database.cjs`

Tasks:
1. Replace `items` table with `app_settings` table
2. Update `setupSqliteSchema()` to create app_settings
3. Update `setupMysqlSchema()` for app_settings
4. Update `seedDatabase()` to seed: app_name, version, schema_version
5. Remove old seed items logic

**SQL Schema:**
```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

## Phase 2: IPC Handlers
**File:** `electron/main.cjs`

Tasks:
1. Add `const fs = require('fs')` import
2. Add `open-file-dialog` IPC handler (showOpenDialog + readFileSync)
3. Add `save-file-dialog` IPC handler (showSaveDialog + writeFileSync)
4. Update BrowserWindow: width=1400, height=900, minWidth=1000, minHeight=700
5. Remove `show: false` (show window immediately)

## Phase 3: Preload Bridge
**File:** `electron/preload.cjs`

Tasks:
1. Add `openFileDialog` to contextBridge.exposeInMainWorld
2. Add `saveFileDialog` to contextBridge.exposeInMainWorld

## Phase 4: TypeScript Types
**File:** `src/types/index.ts` (create new)

Types:
- Coord, Location, ScheduleEvent, Citizen, WorldState
- CitizenSimState, ElectronAPI
- Window interface declaration

## Phase 5: Simulation Engine
**File:** `src/simulation/engine.ts` (create new)

Functions:
- parseTimeToMinutes(time: string): number
- formatMinutesToHHMM(totalMinutes: number): string
- euclideanDistance(a: Coord, b: Coord): number
- interpolatePosition(dep, des, distanceTraveled): Coord
- getLocationByName(locations, name): Location | undefined
- calculateScheduleTimes(schedule, locations, homeLocation): ScheduleEvent[]
- getCitizenSimState(citizen, locations, simTotalMinutes): CitizenSimState

## Phase 6: Main App Component
**File:** `src/App.tsx` (complete rewrite)

Components:
- MapCanvas: HTML canvas with ResizeObserver, draws grid/locations/citizens
- ScheduleRow: inline-editable table row for schedule events
- App: main component with all state management

State:
- locations, citizens (world state)
- selectedCitizenId, selectedLocationId
- simDate (Date object), isPlaying
- simStates (CitizenSimState[])
- editingCitizen, editingLocation
- editingScheduleIndex, showIconPicker
- locationNameError, unsavedChanges

Features:
- handleOpen: file dialog, parse JSON, reset sim to today 00:00
- handleSave: serialize world state, save dialog
- handleSelectCitizen/Location: set editor state
- handleSaveCitizen: validate schedule, update citizens
- handleSaveLocation: validate name uniqueness + coords, update + rename references
- handleCancelEdit: discard changes
- handleAddScheduleEvent: add new event row
- handleUpdateScheduleEvent: update field + re-sort
- handleDeleteScheduleEvent: remove event
- stepSim: +1 minute, recompute sim states
- Animation loop: requestAnimationFrame at 60fps when isPlaying

## Phase 7: Package.json Updates
Tasks:
1. Change name to `population-simulation-prototype`
2. Add productName: "Population Simulation Prototype" in build
3. Add win.executableName: "PopulationSimulation" in build.win

## Phase 8: Context/Evidence Files
Files to create/update:
- `.context/REQUIREMENTS.md`
- `.context/DOMAIN_MODEL.md`
- `.context/SEED_CONTRACT.json`
- `.context/CRITICAL_SCENARIOS.json`
- `.context/COMMAND_SAFETY.json`
- `.context/FUNCTIONAL_ACCEPTANCE.json`
- `.context/CRITERION_TYPE_CONTRACT.json`
- `.context/UX_BASELINE.json`
- `.context/SCREENSHOT_REVIEW.json`
- `.context/RELIABILITY_STATUS.md`
- `.context/PROGRESS.md`