# Domain Model

## Entities and Relationships

```
WorldState
  ├── Locations[]  (1:M)
  └── Citizens[]   (1:M)
       └── ScheduleEvents[] (1:M)
            └── references Location.name (FK by name)
```

Citizens reference Locations by name (not by ID). Home is a location name. Each ScheduleEvent.location is a location name.

## Entity Definitions

### Location
- id: string (client-generated, not stored in JSON)
- icon: string (emoji)
- name: string (unique)
- coord.x: number (0-10000 meters)
- coord.y: number (0-10000 meters)

JSON serialization: `{ Icon, Name, Coord: { X, Y } }`

### Citizen
- id: string (client-generated, not stored in JSON)
- icon: string (emoji)
- firstname: string
- lastname: string
- home: string (location name reference)
- schedule: ScheduleEvent[]

JSON serialization: `{ Icon, Firstname, Lastname, Home, Schedule }`

### ScheduleEvent
- time: string "HH:MM" (stored as "HH:MM:SS" in JSON)
- location: string (location name reference)
- activity: string (free-text)
- travelMinutes?: number (calculated)
- spendMinutes?: number (calculated)
- totalMinutes?: number (calculated)
- isInvalid?: boolean (calculated: spendMinutes < 0)

JSON serialization: `{ Time: "HH:MM:SS", Location, Activity }`

### CitizenSimState (runtime only, not persisted)
- citizenId: string
- position: { x: number, y: number } (current map position in meters)
- status: string (e.g. "Working at Office 1" or "Traveling to Home 1")

## Simulation Rules

### Schedule Time Calculation (per event i, sorted by time)
- prevLoc: home location (i=0) or events[i-1].location
- destLoc: events[i].location
- travelMinutes = euclidean_distance(prevLoc.coord, destLoc.coord) / 83.333
- timeToNext = events[i+1].time - events[i].time
  - Last event: timeToNext = 1440 - events[i].time + events[0].time
- spendMinutes = timeToNext - travelMinutes
- isInvalid = spendMinutes < 0

### Citizen Position at Sim Time T
1. activeIndex = last event where event.time <= (T mod 1440)
2. If none found: activeIndex = last event (day wrap)
3. elapsed = (T mod 1440) - events[activeIndex].time (with wrap correction)
4. If elapsed <= travelMinutes: interpolate between prevLoc and destLoc
5. Else: position = destLoc.coord, status = activity string

## SQLite Schema

```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Seed rows:
- ('app_name', 'Population Simulation Prototype')
- ('version', '1.0.0')
- ('schema_version', '1')

## Feature to Component Mapping

| Feature | Component | File |
|---------|-----------|------|
| App shell + state management | App | src/App.tsx |
| Map canvas rendering | MapCanvas | src/App.tsx |
| Schedule row editing | ScheduleRow | src/App.tsx |
| Simulation math | engine functions | src/simulation/engine.ts |
| Type definitions | interfaces | src/types/index.ts |
| SQLite + IPC queries | database.cjs | electron/database.cjs |
| File dialog IPC handlers | main.cjs | electron/main.cjs |
| IPC bridge exposure | preload.cjs | electron/preload.cjs |