export interface Coord {
  x: number;
  y: number;
}

export interface Location {
  id: string; // generated uuid or name-based
  icon: string;
  name: string;
  coord: Coord;
}

export interface ScheduleEvent {
  time: string; // "HH:MM" format
  location: string; // location name
  activity: string;
  // Calculated fields (not stored in JSON)
  travelMinutes?: number;
  spendMinutes?: number;
  totalMinutes?: number;
  isInvalid?: boolean;
}

export interface Citizen {
  id: string;
  icon: string;
  firstname: string;
  lastname: string;
  home: string; // location name
  schedule: ScheduleEvent[];
}

export interface WorldState {
  locations: Location[];
  citizens: Citizen[];
}

export interface CitizenSimState {
  citizenId: string;
  position: Coord;
  status: string; // e.g. "Working at 🏭 Coal Mine" or "Traveling to 🏠 Home"
}

export interface ElectronAPI {
  dbQuery: (sql: string, params?: any[]) => Promise<any>;
  openFileDialog: () => Promise<{ path: string; content: string } | null>;
  saveFileDialog: (content: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
