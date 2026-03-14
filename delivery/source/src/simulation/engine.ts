import type { Location, Citizen, ScheduleEvent, CitizenSimState, Coord } from '../types';

const TRAVEL_SPEED_M_PER_MIN = 5000 / 60; // 5 km/h in m/min = 83.333...

export function parseTimeToMinutes(time: string): number {
  // Handles "HH:MM:SS" or "HH:MM"
  const parts = time.split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

export function formatMinutesToHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export function euclideanDistance(a: Coord, b: Coord): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

export function interpolatePosition(dep: Coord, des: Coord, distanceTraveled: number): Coord {
  const totalDist = euclideanDistance(dep, des);
  if (totalDist === 0) return { ...dep };
  const ratio = Math.min(distanceTraveled / totalDist, 1);
  return {
    x: dep.x + (des.x - dep.x) * ratio,
    y: dep.y + (des.y - dep.y) * ratio,
  };
}

export function getLocationByName(locations: Location[], name: string): Location | undefined {
  return locations.find(l => l.name === name);
}

/**
 * Calculate schedule event travel/spend/total times given sorted events and locations.
 * Returns the events with travelMinutes, spendMinutes, totalMinutes, isInvalid set.
 */
export function calculateScheduleTimes(
  schedule: ScheduleEvent[],
  locations: Location[],
  homeLocation: Location | undefined
): ScheduleEvent[] {
  if (schedule.length === 0) return [];

  // Sort by time
  const sorted = [...schedule].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  const TOTAL_MINUTES_IN_DAY = 24 * 60;

  return sorted.map((event, i) => {
    // Previous location: home if first event, otherwise previous event's target
    const prevLoc = i === 0 ? homeLocation : getLocationByName(locations, sorted[i - 1].location);
    const destLoc = getLocationByName(locations, event.location);

    let travelMinutes = 0;
    if (prevLoc && destLoc) {
      const dist = euclideanDistance(prevLoc.coord, destLoc.coord);
      travelMinutes = dist / TRAVEL_SPEED_M_PER_MIN;
    }

    // Time until next event
    const thisTimeMin = parseTimeToMinutes(event.time);
    const nextTimeMin = i < sorted.length - 1
      ? parseTimeToMinutes(sorted[i + 1].time)
      : parseTimeToMinutes(sorted[0].time) + TOTAL_MINUTES_IN_DAY;

    const timeToNext = nextTimeMin - thisTimeMin;
    const spendMinutes = timeToNext - travelMinutes;
    const totalMinutes = timeToNext;
    const isInvalid = spendMinutes < 0;

    return {
      ...event,
      travelMinutes,
      spendMinutes: Math.max(0, spendMinutes),
      totalMinutes,
      isInvalid,
    };
  });
}

/**
 * Get citizen's current position and status given simulation time (in total minutes since midnight).
 */
export function getCitizenSimState(
  citizen: Citizen,
  locations: Location[],
  simTotalMinutes: number // minutes since start of day (0-1440)
): CitizenSimState {
  const homeLoc = getLocationByName(locations, citizen.home);
  const homePos = homeLoc?.coord ?? { x: 0, y: 0 };

  if (citizen.schedule.length === 0) {
    return {
      citizenId: citizen.id,
      position: homePos,
      status: `Resting at home`,
    };
  }

  const sorted = [...citizen.schedule].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  const events = calculateScheduleTimes(sorted, locations, homeLoc);

  const TOTAL_DAY = 24 * 60;
  const simMod = ((simTotalMinutes % TOTAL_DAY) + TOTAL_DAY) % TOTAL_DAY;

  // Find which schedule period we're in
  let activeIndex = -1;

  for (let i = events.length - 1; i >= 0; i--) {
    if (simMod >= parseTimeToMinutes(events[i].time)) {
      activeIndex = i;
      break;
    }
  }

  // If no event found, citizen is in the last event period (before first event of today)
  if (activeIndex === -1) {
    activeIndex = events.length - 1; // wrapping around from previous day
  }

  const activeEvent = events[activeIndex];
  const destLoc = getLocationByName(locations, activeEvent.location);
  const destPos = destLoc?.coord ?? homePos;

  // Previous location
  const prevLoc = activeIndex === 0 ? homeLoc : getLocationByName(locations, events[activeIndex - 1].location);
  const prevPos = prevLoc?.coord ?? homePos;

  const eventStartMin = parseTimeToMinutes(activeEvent.time);
  let elapsed: number;

  if (activeIndex === events.length - 1 && simMod < parseTimeToMinutes(events[0].time)) {
    // We're in the last event period, wrapping around: elapsed = simMod + (TOTAL_DAY - eventStartMin)
    elapsed = simMod + TOTAL_DAY - eventStartMin;
  } else {
    elapsed = simMod - eventStartMin;
  }

  const travelMin = activeEvent.travelMinutes ?? 0;

  if (elapsed <= travelMin) {
    // Still traveling (or just arrived this step)
    const distanceTraveled = elapsed * TRAVEL_SPEED_M_PER_MIN;
    const position = interpolatePosition(prevPos, destPos, distanceTraveled);
    const destIcon = destLoc?.icon ?? '';
    return {
      citizenId: citizen.id,
      position,
      status: `Traveling to ${destIcon} ${activeEvent.location}`,
    };
  } else {
    // At destination doing activity
    return {
      citizenId: citizen.id,
      position: destPos,
      status: `${activeEvent.activity} at ${destLoc?.icon ?? ''} ${activeEvent.location}`,
    };
  }
}
