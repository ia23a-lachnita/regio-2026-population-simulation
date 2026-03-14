# Competition Requirements

## Competition Name
Population Simulation Prototype

## Objective
Build a desktop application that visualizes and simulates a population of citizens moving between locations on a 10km x 10km map according to daily schedules. The app allows loading/saving world state as JSON, editing citizens and locations, and running a time-stepped simulation.

## Core Features

1. **World State Management**
   - Load world state from a JSON file (Open dialog)
   - Save world state to a JSON file (Save dialog)
   - World state contains Locations and Citizens arrays
   - JSON format matches competition specification (PascalCase keys)

2. **Map Visualization**
   - 10km x 10km square map (coordinates 0-10000 meters)
   - Canvas-based rendering with grid overlay
   - Location icons displayed at their coordinates
   - Citizen icons displayed at their current simulated positions
   - Selected citizen/location highlighted with colored halo

3. **Simulation Engine**
   - Time step: exactly 1 minute
   - Travel speed: exactly 5 km/h = 83.333 m/min
   - Distance: Euclidean sqrt((dx)^2 + (dy)^2)
   - Travel time = distance / 83.333 minutes
   - Citizens start at home location when world is loaded
   - Loading resets simulation date to today at 00:00
   - Schedule repeats daily (24-hour wrap)
   - Schedule events sorted chronologically
   - Spend time = (next_event_start - this_event_start) - travel_time
   - For last event: next event is first event of next day
   - Invalid event: spend_time < 0 (unreachable)

4. **Simulation Controls**
   - Step button: advance simulation by exactly 1 minute
   - Play button: run simulation at approx 60 steps/sec
   - Pause button: stop simulation
   - Date/time display: shows current simulation date and time

5. **Citizen Editor**
   - Click citizen in list to open editor (disabled during play)
   - Edit: icon (from picker), first name, last name, home location (dropdown)
   - Status label showing current activity or travel state
   - Save / Cancel buttons
   - Schedule editor table (see below)

6. **Schedule Editor**
   - Table columns: Time, Location, Activity, Travel, Spend, Total
   - Click row to enter inline edit mode
   - Edit: time (time input), location (dropdown), activity (text with autocomplete)
   - Auto-calculated: travel time, spend time, total time
   - Invalid rows highlighted red
   - Add Event / Delete Event buttons
   - Events auto-sorted chronologically on edit
   - Save blocked if any event is invalid

7. **Location Editor**
   - Click location in list to open editor (disabled during play)
   - Edit: icon (from picker), name (unique), X coordinate (0-10000), Y coordinate (0-10000)
   - Validation: unique name, coordinate range
   - Save / Cancel buttons
   - Rename propagates to citizen home and schedule references

8. **Icon Picker**
   - Citizen icons: 6 options
   - Location icons: 15 options
   - Dismissable by clicking outside or Cancel button

## Database Requirements
- Minimal SQLite database for app settings only (world state is in-memory from JSON)
- **app_settings** table: key TEXT PRIMARY KEY, value TEXT NOT NULL
- Seed data:
  - app_name = 'Population Simulation Prototype'
  - version = '1.0.0'
  - schema_version = '1'

## UI Requirements
- Single window layout, minimum 1000x700px, default 1400x900px
- **Top bar:** App title, simulation date/time (monospace), Step button, Play/Pause button
- **Left panel (208px):** File section (Open/Save/Exit), People section (scrollable list), Locations section (scrollable list)
- **Center:** Map canvas (square, fills remaining space)
- **Right panel (320px):** Citizen editor or Location editor or empty hint

## Technical Constraints
- Platform: Electron + React + TypeScript
- Database: SQLite (better-sqlite3) via electron/database.cjs
- UI: Tailwind CSS (dark gray theme)
- Map rendering: HTML Canvas 2D
- IPC: contextBridge with openFileDialog, saveFileDialog, dbQuery

## Deliverables
- Source code (no node_modules)
- Executable (.exe via electron-builder)
- Database schema (schema.sql)
- README.md with installation instructions