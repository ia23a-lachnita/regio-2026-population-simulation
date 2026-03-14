# Population Simulation Prototype

## Running
- Launch: executable/win-unpacked/PopulationSimulation.exe
- Or install: executable/Population Simulation Prototype Setup 0.0.0.exe

## Usage
1. Click Open to load world.small.json or world.big.json
2. Citizens and locations appear on the map
3. Use + Step or Play/Pause to run the simulation
4. Click people/locations in the side lists to edit them
5. Click Save to export the world state

## Stack
Electron 29 + React 18 + TypeScript + Tailwind CSS + SQLite (app_settings only; world state is in-memory)

## Notes
- Citizens start at home on world load
- Schedule travel validated at 5 km/h; impossible events shown in red
- Location names are unique IDs
