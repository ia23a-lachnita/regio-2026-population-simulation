import { useState, useEffect, useRef, useCallback } from 'react';
import type { WorldState, Location, Citizen, ScheduleEvent, CitizenSimState } from './types';
import { getCitizenSimState, calculateScheduleTimes, parseTimeToMinutes, formatMinutesToHHMM } from './simulation/engine';
import defaultWorldRaw from './data/world.small.json';

const CITIZEN_ICONS = ['👦', '👧', '👨', '👩', '👴', '👵'];
const LOCATION_ICONS = ['🏥', '🏫', '🏋️', '🎬', '🛒', '☕', '📚', '🚓', '🚒', '⛪', '🏨', '🏠', '🏢', '🏭', '🛎️'];
const MAP_SIZE = 10000; // 10km in meters

function generateId(): string {
  return Math.random().toString(36).slice(2);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Parse JSON world state from the competition format
function parseWorldState(json: string): WorldState {
  const data = JSON.parse(json);
  const locations: Location[] = (data.Locations || []).map((l: any) => ({
    id: generateId(),
    icon: l.Icon || '📍',
    name: l.Name,
    coord: { x: Number(l.Coord?.X ?? 0), y: Number(l.Coord?.Y ?? 0) },
  }));

  const citizens: Citizen[] = (data.Citizens || []).map((c: any) => ({
    id: generateId(),
    icon: c.Icon || '👤',
    firstname: c.Firstname,
    lastname: c.Lastname,
    home: c.Home,
    schedule: (c.Schedule || []).map((s: any) => ({
      time: s.Time?.substring(0, 5) ?? '00:00',
      location: s.Location,
      activity: s.Activity,
    })),
  }));

  return { locations, citizens };
}

// Serialize world state to competition JSON format
function serializeWorldState(state: WorldState): string {
  return JSON.stringify({
    Locations: state.locations.map(l => ({
      Icon: l.icon,
      Name: l.name,
      Coord: { X: l.coord.x, Y: l.coord.y },
    })),
    Citizens: state.citizens.map(c => ({
      Icon: c.icon,
      Firstname: c.firstname,
      Lastname: c.lastname,
      Home: c.home,
      Schedule: c.schedule.map(s => ({
        Time: s.time + ':00',
        Location: s.location,
        Activity: s.activity,
      })),
    })),
  }, null, 2);
}

// Draw an arrowhead at point (x2,y2) pointing from (x1,y1)
function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, headLen: number) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

type PathDisplay = 'none' | 'selected' | 'all';

function clampViewCenter(cx: number, cy: number, zoom: number): { x: number; y: number } {
  const half = MAP_SIZE / (2 * zoom);
  return {
    x: Math.max(half, Math.min(MAP_SIZE - half, cx)),
    y: Math.max(half, Math.min(MAP_SIZE - half, cy)),
  };
}

function buildPathWaypoints(
  citizen: Citizen,
  locMap: Map<string, Location>,
  toSX: (wx: number) => number,
  toSY: (wy: number) => number,
): { x: number; y: number }[] {
  const home = locMap.get(citizen.home);
  const pts: { x: number; y: number }[] = [];
  if (home) pts.push({ x: toSX(home.coord.x), y: toSY(home.coord.y) });
  for (const ev of citizen.schedule) {
    const loc = locMap.get(ev.location);
    if (loc) pts.push({ x: toSX(loc.coord.x), y: toSY(loc.coord.y) });
  }
  if (home && pts.length > 1) pts.push({ x: toSX(home.coord.x), y: toSY(home.coord.y) });
  return pts;
}

// Map canvas component
function MapCanvas({
  locations,
  citizens,
  simStates,
  selectedCitizenId,
  selectedLocationId,
  pathDisplay,
}: {
  locations: Location[];
  citizens: Citizen[];
  simStates: CitizenSimState[];
  selectedCitizenId: string | null;
  selectedLocationId: string | null;
  pathDisplay: PathDisplay;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(400);
  const [zoom, setZoom] = useState(1.0);
  const [viewCenter, setViewCenter] = useState({ x: MAP_SIZE / 2, y: MAP_SIZE / 2 });

  // Refs for wheel handler (avoids stale closure)
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const viewCenterRef = useRef(viewCenter);
  viewCenterRef.current = viewCenter;
  const canvasSizeRef = useRef(canvasSize);
  canvasSizeRef.current = canvasSize;

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setCanvasSize(Math.min(width, height));
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Ctrl+wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const sz = canvasSizeRef.current;
      const sc = sz / MAP_SIZE;
      const cz = zoomRef.current;
      const cc = viewCenterRef.current;
      // World coordinate under mouse
      const worldX = (mouseX - sz / 2) / (sc * cz) + cc.x;
      const worldY = (mouseY - sz / 2) / (sc * cz) + cc.y;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.max(1, Math.min(10, cz * factor));
      const rawCx = worldX - (mouseX - sz / 2) / (sc * newZoom);
      const rawCy = worldY - (mouseY - sz / 2) / (sc * newZoom);
      const clamped = clampViewCenter(rawCx, rawCy, newZoom);
      setZoom(newZoom);
      setViewCenter(clamped);
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => {
      const nz = Math.min(10, prev * 1.25);
      setViewCenter(vc => clampViewCenter(vc.x, vc.y, nz));
      return nz;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => {
      const nz = Math.max(1, prev / 1.25);
      if (nz <= 1.001) {
        setViewCenter({ x: MAP_SIZE / 2, y: MAP_SIZE / 2 });
        return 1;
      }
      setViewCenter(vc => clampViewCenter(vc.x, vc.y, nz));
      return nz;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = canvasSize / MAP_SIZE;
    const toSX = (wx: number) => (wx - viewCenter.x) * scale * zoom + canvasSize / 2;
    const toSY = (wy: number) => (wy - viewCenter.y) * scale * zoom + canvasSize / 2;

    // Canvas background (outside map area)
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Map area bounds in screen space
    const mapLeft = toSX(0);
    const mapTop = toSY(0);
    const mapW = toSX(MAP_SIZE) - mapLeft;
    const mapH = toSY(MAP_SIZE) - mapTop;

    // Map background
    ctx.fillStyle = '#1a2e1a';
    ctx.fillRect(mapLeft, mapTop, mapW, mapH);

    // Clip to map area so nothing renders outside
    ctx.save();
    ctx.beginPath();
    ctx.rect(mapLeft, mapTop, mapW, mapH);
    ctx.clip();

    // Grid
    ctx.strokeStyle = '#2d4a2d';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const gx = toSX(i * MAP_SIZE / 10);
      const gy = toSY(i * MAP_SIZE / 10);
      ctx.beginPath(); ctx.moveTo(gx, mapTop); ctx.lineTo(gx, mapTop + mapH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mapLeft, gy); ctx.lineTo(mapLeft + mapW, gy); ctx.stroke();
    }

    const fontSize = Math.max(12, Math.min(20, canvasSize / 30));
    ctx.font = `${fontSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Path arrows
    if (pathDisplay !== 'none') {
      const locMap = new Map(locations.map(l => [l.name, l]));
      const headLen = Math.max(8, fontSize * 0.7);
      const citizensToShow = pathDisplay === 'all'
        ? citizens
        : citizens.filter(c => c.id === selectedCitizenId);

      for (const citizen of citizensToShow) {
        if (citizen.schedule.length === 0) continue;
        const isSelected = citizen.id === selectedCitizenId;
        ctx.strokeStyle = isSelected
          ? 'rgba(251, 191, 36, 0.9)'   // amber for selected
          : 'rgba(148, 163, 184, 0.5)'; // muted slate for others
        ctx.lineWidth = isSelected ? 2 : 1.5;
        const waypoints = buildPathWaypoints(citizen, locMap, toSX, toSY);
        for (let i = 0; i < waypoints.length - 1; i++) {
          const from = waypoints[i];
          const to = waypoints[i + 1];
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) continue;
          const offset = fontSize * 0.8;
          const ux = dx / dist;
          const uy = dy / dist;
          const sx = from.x + ux * offset;
          const sy = from.y + uy * offset;
          const ex = to.x - ux * offset;
          const ey = to.y - uy * offset;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          drawArrow(ctx, sx, sy, ex, ey, headLen);
        }
      }
    }

    // Locations
    for (const loc of locations) {
      const x = toSX(loc.coord.x);
      const y = toSY(loc.coord.y);
      const isSelected = loc.id === selectedLocationId;
      if (isSelected) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.beginPath();
        ctx.arc(x, y, fontSize * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillText(loc.icon, x, y);
    }

    // Citizens
    const stateMap = new Map(simStates.map(s => [s.citizenId, s]));
    for (const citizen of citizens) {
      const simState = stateMap.get(citizen.id);
      if (!simState) continue;
      const x = toSX(simState.position.x);
      const y = toSY(simState.position.y);
      const isSelected = citizen.id === selectedCitizenId;
      if (isSelected) {
        ctx.fillStyle = 'rgba(234, 179, 8, 0.4)';
        ctx.beginPath();
        ctx.arc(x, y, fontSize * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillText(citizen.icon, x, y);
    }

    ctx.restore();

    // Map border
    ctx.strokeStyle = '#4a7c4a';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapLeft, mapTop, mapW, mapH);
  }, [locations, citizens, simStates, selectedCitizenId, selectedLocationId, canvasSize, pathDisplay, zoom, viewCenter]);

  return (
    <div ref={containerRef} className="flex-1 relative flex items-center justify-center bg-gray-950 p-2">
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        style={{ width: canvasSize, height: canvasSize }}
        className="cursor-crosshair"
      />
      {/* Zoom controls — top-left corner of map area */}
      <div className="absolute top-4 left-4 flex flex-col gap-1 select-none">
        <button
          onClick={handleZoomIn}
          title="Zoom in (Ctrl+Scroll)"
          className="w-8 h-8 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-sm flex items-center justify-center text-white font-bold"
        >🔍+</button>
        <button
          onClick={handleZoomOut}
          title="Zoom out (Ctrl+Scroll)"
          className="w-8 h-8 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-sm flex items-center justify-center text-white font-bold"
        >🔍−</button>
        {zoom > 1.05 && (
          <div className="text-center text-xs text-gray-400 font-mono">{Math.round(zoom * 100)}%</div>
        )}
      </div>
    </div>
  );
}

// Schedule row component
function ScheduleRow({
  event,
  index,
  locations,
  allActivities,
  onUpdate,
  onDelete,
  isEditing,
  onStartEdit,
  onEndEdit,
}: {
  event: ScheduleEvent;
  index: number;
  locations: Location[];
  allActivities: string[];
  onUpdate: (index: number, field: keyof ScheduleEvent, value: string) => void;
  onDelete: (index: number) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
}) {
  const travelStr = event.travelMinutes !== undefined ? formatMinutesToHHMM(event.travelMinutes) : '-';
  const spendStr = event.spendMinutes !== undefined ? formatMinutesToHHMM(event.spendMinutes) : '-';
  const totalStr = event.totalMinutes !== undefined ? formatMinutesToHHMM(event.totalMinutes) : '-';

  if (!isEditing) {
    return (
      <tr
        className={`border-b border-gray-700 cursor-pointer hover:bg-gray-700 ${event.isInvalid ? 'bg-red-950' : ''}`}
        onClick={onStartEdit}
      >
        <td className="px-2 py-1 text-gray-200">{event.time}</td>
        <td className="px-2 py-1 text-gray-200">{locations.find(l => l.name === event.location)?.icon ?? ''} {event.location}</td>
        <td className="px-2 py-1 text-gray-200">{event.activity}</td>
        <td className="px-2 py-1 text-gray-400 text-right">{travelStr}</td>
        <td className="px-2 py-1 text-gray-400 text-right">{spendStr}</td>
        <td className="px-2 py-1 text-gray-400 text-right">{totalStr}</td>
        <td className="px-2 py-1">
          <button
            className="text-red-400 hover:text-red-200 text-xs px-1"
            onClick={(e) => { e.stopPropagation(); onDelete(index); }}
          >✕</button>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-b border-blue-700 bg-gray-700 ${event.isInvalid ? 'bg-red-900' : ''}`}>
      <td className="px-1 py-1">
        <input
          type="time"
          value={event.time}
          onChange={e => onUpdate(index, 'time', e.target.value)}
          onBlur={onEndEdit}
          className="w-20 bg-gray-600 text-white px-1 py-0.5 rounded text-sm"
          autoFocus
        />
      </td>
      <td className="px-1 py-1">
        <select
          value={event.location}
          onChange={e => onUpdate(index, 'location', e.target.value)}
          className="bg-gray-600 text-white px-1 py-0.5 rounded text-sm w-full"
        >
          {locations.map(l => (
            <option key={l.id} value={l.name}>{l.icon} {l.name}</option>
          ))}
        </select>
      </td>
      <td className="px-1 py-1">
        <input
          list="activities-list"
          value={event.activity}
          onChange={e => onUpdate(index, 'activity', e.target.value)}
          className="bg-gray-600 text-white px-1 py-0.5 rounded text-sm w-full"
          placeholder="Activity..."
        />
        <datalist id="activities-list">
          {allActivities.map(a => <option key={a} value={a} />)}
        </datalist>
      </td>
      <td className="px-2 py-1 text-gray-400 text-right text-sm">{travelStr}</td>
      <td className="px-2 py-1 text-gray-400 text-right text-sm">{spendStr}</td>
      <td className="px-2 py-1 text-gray-400 text-right text-sm">{totalStr}</td>
      <td className="px-1 py-1">
        <button
          className="text-red-400 hover:text-red-200 text-xs px-1"
          onClick={() => onDelete(index)}
        >✕</button>
      </td>
    </tr>
  );
}

export default function App() {
  // World state
  const [locations, setLocations] = useState<Location[]>([]);
  const [citizens, setCitizens] = useState<Citizen[]>([]);

  // Selection state
  const [selectedCitizenId, setSelectedCitizenId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Simulation state
  const [simDate, setSimDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const simDateRef = useRef(simDate);
  simDateRef.current = simDate;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Citizen sim states
  const [simStates, setSimStates] = useState<CitizenSimState[]>([]);

  // Map display options
  const [pathDisplay, setPathDisplay] = useState<PathDisplay>('selected');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Editor state
  const [editingCitizen, setEditingCitizen] = useState<Citizen | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editingScheduleIndex, setEditingScheduleIndex] = useState<number | null>(null);
  const [showIconPicker, setShowIconPicker] = useState<'citizen' | 'location' | null>(null);
  const [locationNameError, setLocationNameError] = useState<string>('');
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Animation frame ref
  const rafRef = useRef<number | null>(null);
  const lastStepRef = useRef<number>(0);

  const locationsRef = useRef(locations);
  locationsRef.current = locations;
  const citizensRef = useRef(citizens);
  citizensRef.current = citizens;

  // Compute sim states
  const computeSimStates = useCallback((locs: Location[], cits: Citizen[], date: Date) => {
    const totalMinutes = date.getHours() * 60 + date.getMinutes();
    return cits.map(c => getCitizenSimState(c, locs, totalMinutes));
  }, []);

  // Step simulation
  const stepSim = useCallback(() => {
    setSimDate(prev => {
      const next = new Date(prev.getTime() + 60000); // +1 minute
      const states = computeSimStates(locationsRef.current, citizensRef.current, next);
      setSimStates(states);
      return next;
    });
  }, [computeSimStates]);

  // Auto-load default world state on first mount
  useEffect(() => {
    try {
      const ws = parseWorldState(JSON.stringify(defaultWorldRaw));
      setLocations(ws.locations);
      setCitizens(ws.citizens);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setSimDate(today);
      const states = computeSimStates(ws.locations, ws.citizens, today);
      setSimStates(states);
    } catch (e) {
      console.error('Failed to load default world:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animation loop
  useEffect(() => {
    const loop = (timestamp: number) => {
      if (isPlayingRef.current) {
        if (timestamp - lastStepRef.current >= 16.7) { // ~60 steps/sec
          lastStepRef.current = timestamp;
          setSimDate(prev => {
            const next = new Date(prev.getTime() + 60000);
            const states = computeSimStates(locationsRef.current, citizensRef.current, next);
            setSimStates(states);
            return next;
          });
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [computeSimStates]);

  // Load world state
  const handleOpen = async () => {
    if (!window.electron?.openFileDialog) return;
    const result = await window.electron.openFileDialog();
    if (!result) return;

    try {
      const ws = parseWorldState(result.content);
      setLocations(ws.locations);
      setCitizens(ws.citizens);
      setSelectedCitizenId(null);
      setSelectedLocationId(null);
      setEditingCitizen(null);
      setEditingLocation(null);
      setIsPlaying(false);

      // Set date to today at 00:00
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setSimDate(today);

      const states = computeSimStates(ws.locations, ws.citizens, today);
      setSimStates(states);
    } catch (e) {
      console.error('Failed to parse world state:', e);
      alert('Failed to load world state. Invalid JSON format.');
    }
  };

  // Save world state
  const handleSave = async () => {
    if (!window.electron?.saveFileDialog) return;
    const json = serializeWorldState({ locations, citizens });
    await window.electron.saveFileDialog(json);
  };

  // Exit
  const handleExit = () => {
    window.close();
  };

  // Select citizen
  const handleSelectCitizen = (id: string) => {
    if (isPlaying) return; // disable editing while playing
    if (unsavedChanges && editingCitizen) {
      if (!confirm('You have unsaved changes. Discard them?')) return;
    }
    setSelectedCitizenId(id);
    setSelectedLocationId(null);
    const citizen = citizens.find(c => c.id === id);
    if (citizen) setEditingCitizen({ ...citizen, schedule: citizen.schedule.map(s => ({ ...s })) });
    setUnsavedChanges(false);
    setEditingScheduleIndex(null);
  };

  // Select location
  const handleSelectLocation = (id: string) => {
    if (isPlaying) return;
    if (unsavedChanges && editingLocation) {
      if (!confirm('You have unsaved changes. Discard them?')) return;
    }
    setSelectedLocationId(id);
    setSelectedCitizenId(null);
    setEditingCitizen(null);
    const location = locations.find(l => l.id === id);
    if (location) setEditingLocation({ ...location });
    setUnsavedChanges(false);
    setLocationNameError('');
  };

  // Save citizen edits
  const handleSaveCitizen = () => {
    if (!editingCitizen) return;

    // Validate schedule
    const homeLoc = locations.find(l => l.name === editingCitizen.home);
    const withTimes = calculateScheduleTimes(editingCitizen.schedule, locations, homeLoc);
    const hasInvalid = withTimes.some(e => e.isInvalid);
    if (hasInvalid) {
      alert('Cannot save: some schedule events cannot be reached. Please fix highlighted events.');
      return;
    }

    setCitizens(prev => prev.map(c => c.id === editingCitizen.id ? editingCitizen : c));
    setUnsavedChanges(false);

    // Update sim state
    const states = computeSimStates(
      locationsRef.current,
      citizensRef.current.map(c => c.id === editingCitizen.id ? editingCitizen : c),
      simDateRef.current
    );
    setSimStates(states);
  };

  // Save location edits
  const handleSaveLocation = () => {
    if (!editingLocation) return;

    // Validate name uniqueness
    const nameConflict = locations.find(l => l.name === editingLocation.name && l.id !== editingLocation.id);
    if (nameConflict) {
      setLocationNameError('Location name must be unique.');
      return;
    }

    // Validate coordinates
    if (editingLocation.coord.x < 0 || editingLocation.coord.x > 10000 ||
        editingLocation.coord.y < 0 || editingLocation.coord.y > 10000) {
      setLocationNameError('Coordinates must be between 0 and 10000.');
      return;
    }

    const oldName = locations.find(l => l.id === editingLocation.id)?.name;
    setLocations(prev => prev.map(l => l.id === editingLocation.id ? editingLocation : l));
    setLocationNameError('');
    setUnsavedChanges(false);

    // Update any citizens whose home or schedule references the old name
    if (oldName && oldName !== editingLocation.name) {
      setCitizens(prev => prev.map(c => ({
        ...c,
        home: c.home === oldName ? editingLocation.name : c.home,
        schedule: c.schedule.map(s => ({
          ...s,
          location: s.location === oldName ? editingLocation.name : s.location,
        })),
      })));
    }
  };

  // Cancel edits
  const handleCancelEdit = () => {
    if (unsavedChanges) {
      if (!confirm('Discard unsaved changes?')) return;
    }
    setEditingCitizen(null);
    setEditingLocation(null);
    setSelectedCitizenId(null);
    setSelectedLocationId(null);
    setUnsavedChanges(false);
    setLocationNameError('');
  };

  // Schedule event operations
  const handleAddScheduleEvent = () => {
    if (!editingCitizen) return;
    const firstLocName = locations[0]?.name ?? '';
    const newEvent: ScheduleEvent = { time: '08:00', location: firstLocName, activity: 'Working' };
    setEditingCitizen(prev => prev ? {
      ...prev,
      schedule: [...prev.schedule, newEvent],
    } : null);
    setUnsavedChanges(true);
  };

  const handleUpdateScheduleEvent = (index: number, field: keyof ScheduleEvent, value: string) => {
    if (!editingCitizen) return;
    const schedule = editingCitizen.schedule.map((e, i) => i === index ? { ...e, [field]: value } : e);
    // Re-sort by time
    const sorted = [...schedule].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
    setEditingCitizen(prev => prev ? { ...prev, schedule: sorted } : null);
    setUnsavedChanges(true);
  };

  const handleDeleteScheduleEvent = (index: number) => {
    if (!editingCitizen) return;
    setEditingCitizen(prev => prev ? {
      ...prev,
      schedule: prev.schedule.filter((_, i) => i !== index),
    } : null);
    setUnsavedChanges(true);
    setEditingScheduleIndex(null);
  };

  // Get all activities for autocomplete
  const allActivities = Array.from(new Set(
    citizens.flatMap(c => c.schedule.map(s => s.activity))
  )).filter(Boolean);

  // Get schedule with calculated times
  const scheduleWithTimes = editingCitizen
    ? calculateScheduleTimes(
        editingCitizen.schedule,
        locations,
        locations.find(l => l.name === editingCitizen.home)
      )
    : [];

  // Get current status of selected citizen
  const selectedCitizenStatus = selectedCitizenId
    ? simStates.find(s => s.citizenId === selectedCitizenId)?.status ?? ''
    : '';

  // Update editing citizen's fields
  const updateEditingCitizenField = (field: keyof Citizen, value: string) => {
    setEditingCitizen(prev => prev ? { ...prev, [field]: value } : null);
    setUnsavedChanges(true);
  };

  // Update editing location fields
  const updateEditingLocationField = (field: keyof Location | 'x' | 'y', value: string | number) => {
    setEditingLocation(prev => {
      if (!prev) return null;
      if (field === 'x') return { ...prev, coord: { ...prev.coord, x: Number(value) } };
      if (field === 'y') return { ...prev, coord: { ...prev.coord, y: Number(value) } };
      return { ...prev, [field]: value };
    });
    setUnsavedChanges(true);
    if (field === 'name') setLocationNameError('');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 overflow-hidden" style={{ minWidth: 1000, minHeight: 700 }}>
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <h1 className="text-lg font-bold text-green-400 whitespace-nowrap">Population Simulation Prototype</h1>
        <div className="flex-1" />
        <div className="text-gray-300 font-mono text-sm">
          {formatDate(simDate)} {formatTime(simDate)}
        </div>
        <select
          value={pathDisplay}
          onChange={e => setPathDisplay(e.target.value as PathDisplay)}
          title="Path display mode"
          className="px-2 py-1 bg-gray-700 border border-gray-600 text-gray-200 rounded text-sm cursor-pointer"
        >
          <option value="none">→ Paths: Off</option>
          <option value="selected">→ Paths: Selected</option>
          <option value="all">→ Paths: All</option>
        </select>
        <button
          onClick={stepSim}
          disabled={isPlaying}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm font-medium"
        >
          + Step
        </button>
        <button
          onClick={() => setIsPlaying(p => !p)}
          className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white rounded text-sm font-medium"
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className={`${leftCollapsed ? 'w-8' : 'w-52'} flex flex-col border-r border-gray-700 bg-gray-800 flex-shrink-0 overflow-hidden transition-all duration-150`}>
          {leftCollapsed ? (
            /* Collapsed: single toggle strip */
            <button
              onClick={() => setLeftCollapsed(false)}
              className="flex-1 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700"
              title="Expand panel"
            >
              <span className="text-lg">›</span>
            </button>
          ) : (
            <>
              {/* Collapse button + File menu */}
              <div className="p-2 border-b border-gray-700">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-semibold text-gray-400 uppercase">File</div>
                  <button onClick={() => setLeftCollapsed(true)} className="text-gray-500 hover:text-white text-xs px-1" title="Collapse panel">‹</button>
                </div>
                <button onClick={handleOpen} className="w-full text-left px-2 py-1 text-sm text-gray-200 hover:bg-gray-700 rounded">📂 Open</button>
                <button onClick={handleSave} className="w-full text-left px-2 py-1 text-sm text-gray-200 hover:bg-gray-700 rounded">💾 Save</button>
                <button onClick={handleExit} className="w-full text-left px-2 py-1 text-sm text-gray-200 hover:bg-gray-700 rounded">🚪 Exit</button>
              </div>

              {/* People list */}
              <div className="flex flex-col flex-1 min-h-0 border-b border-gray-700">
                <div className="text-xs font-semibold text-gray-400 uppercase px-2 py-1">People ({citizens.length})</div>
                <div className="overflow-y-auto flex-1">
                  {citizens.map(c => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCitizen(c.id)}
                      className={`px-2 py-1 text-sm cursor-pointer truncate ${
                        selectedCitizenId === c.id ? 'bg-yellow-700 text-white' : 'hover:bg-gray-700 text-gray-200'
                      } ${isPlaying ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      {c.icon} {c.firstname} {c.lastname}
                    </div>
                  ))}
                </div>
              </div>

              {/* Locations list */}
              <div className="flex flex-col flex-1 min-h-0">
                <div className="text-xs font-semibold text-gray-400 uppercase px-2 py-1">Locations ({locations.length})</div>
                <div className="overflow-y-auto flex-1">
                  {locations.map(l => (
                    <div
                      key={l.id}
                      onClick={() => handleSelectLocation(l.id)}
                      className={`px-2 py-1 text-sm cursor-pointer truncate ${
                        selectedLocationId === l.id ? 'bg-blue-700 text-white' : 'hover:bg-gray-700 text-gray-200'
                      } ${isPlaying ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      {l.icon} {l.name}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Map center */}
        <MapCanvas
          locations={locations}
          citizens={citizens}
          simStates={simStates}
          selectedCitizenId={selectedCitizenId}
          selectedLocationId={selectedLocationId}
          pathDisplay={pathDisplay}
        />

        {/* Right panel - Citizen or Location editor */}
        <div className={`${rightCollapsed ? 'w-8' : 'w-80'} flex flex-col border-l border-gray-700 bg-gray-800 flex-shrink-0 overflow-hidden transition-all duration-150`}>
          {rightCollapsed ? (
            <button
              onClick={() => setRightCollapsed(false)}
              className="flex-1 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700"
              title="Expand panel"
            >
              <span className="text-lg">‹</span>
            </button>
          ) : editingCitizen ? (
            <>
              <div className="p-3 border-b border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-gray-400 uppercase">Selected Person</div>
                  <button onClick={() => setRightCollapsed(true)} className="text-gray-500 hover:text-white text-xs px-1" title="Collapse panel">›</button>
                </div>

                {/* Icon */}
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => setShowIconPicker('citizen')}
                    className="text-3xl w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-600"
                    title="Click to change icon"
                  >
                    {editingCitizen.icon}
                  </button>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-0.5">First Name</label>
                    <input
                      type="text"
                      value={editingCitizen.firstname}
                      onChange={e => updateEditingCitizenField('firstname', e.target.value)}
                      className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
                    />
                  </div>
                </div>

                <div className="mb-2">
                  <label className="block text-xs text-gray-400 mb-0.5">Last Name</label>
                  <input
                    type="text"
                    value={editingCitizen.lastname}
                    onChange={e => updateEditingCitizenField('lastname', e.target.value)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
                  />
                </div>

                <div className="mb-2">
                  <label className="block text-xs text-gray-400 mb-0.5">Home Address</label>
                  <select
                    value={editingCitizen.home}
                    onChange={e => updateEditingCitizenField('home', e.target.value)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
                  >
                    {locations.map(l => (
                      <option key={l.id} value={l.name}>{l.icon} {l.name}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3 p-2 bg-gray-900 rounded text-xs text-green-300">
                  Status: {selectedCitizenStatus || 'Unknown'}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveCitizen}
                    className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
                  >Save</button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                  >Cancel</button>
                </div>
              </div>

              {/* Schedule editor */}
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1 border-b border-gray-700">
                  <div className="text-xs font-semibold text-gray-400 uppercase">Schedule</div>
                  <button
                    onClick={handleAddScheduleEvent}
                    className="text-xs px-2 py-0.5 bg-green-700 hover:bg-green-600 text-white rounded"
                  >+ Add Event</button>
                </div>
                <div className="overflow-auto flex-1">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-gray-700 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left text-gray-300">Time</th>
                        <th className="px-2 py-1 text-left text-gray-300">Location</th>
                        <th className="px-2 py-1 text-left text-gray-300">Activity</th>
                        <th className="px-2 py-1 text-right text-gray-300">Travel</th>
                        <th className="px-2 py-1 text-right text-gray-300">Spend</th>
                        <th className="px-2 py-1 text-right text-gray-300">Total</th>
                        <th className="px-1 py-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleWithTimes.map((event, i) => (
                        <ScheduleRow
                          key={i}
                          event={event}
                          index={i}
                          locations={locations}
                          allActivities={allActivities}
                          onUpdate={handleUpdateScheduleEvent}
                          onDelete={handleDeleteScheduleEvent}
                          isEditing={editingScheduleIndex === i}
                          onStartEdit={() => setEditingScheduleIndex(i)}
                          onEndEdit={() => setEditingScheduleIndex(null)}
                        />
                      ))}
                    </tbody>
                  </table>
                  {scheduleWithTimes.length === 0 && (
                    <div className="text-gray-500 text-xs text-center py-4">No schedule events</div>
                  )}
                </div>
              </div>
            </>
          ) : editingLocation ? (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-400 uppercase">Location Editor</div>
                <button onClick={() => setRightCollapsed(true)} className="text-gray-500 hover:text-white text-xs px-1" title="Collapse panel">›</button>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => setShowIconPicker('location')}
                  className="text-3xl w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-600"
                  title="Click to change icon"
                >
                  {editingLocation.icon}
                </button>
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-0.5">Name</label>
                  <input
                    type="text"
                    value={editingLocation.name}
                    onChange={e => updateEditingLocationField('name', e.target.value)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
                  />
                  {locationNameError && <div className="text-red-400 text-xs mt-0.5">{locationNameError}</div>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-0.5">X (0-10000)</label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={editingLocation.coord.x}
                    onChange={e => updateEditingLocationField('x', e.target.value)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-0.5">Y (0-10000)</label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={editingLocation.coord.y}
                    onChange={e => updateEditingLocationField('y', e.target.value)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
                  />
                </div>
              </div>

              {locationNameError && (
                <div className="mb-2 p-2 bg-red-900 border border-red-600 rounded text-red-200 text-xs">
                  {locationNameError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSaveLocation}
                  className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
                >Save</button>
                <button
                  onClick={handleCancelEdit}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                >Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Select a person or location to edit
            </div>
          )}
        </div>
      </div>

      {/* Icon picker modal */}
      {showIconPicker && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          onClick={() => setShowIconPicker(null)}
        >
          <div
            className="bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-gray-300 mb-3">Select Icon</div>
            <div className="flex flex-wrap gap-2 max-w-xs">
              {(showIconPicker === 'citizen' ? CITIZEN_ICONS : LOCATION_ICONS).map(icon => (
                <button
                  key={icon}
                  className="text-2xl w-10 h-10 hover:bg-gray-700 rounded-lg flex items-center justify-center"
                  onClick={() => {
                    if (showIconPicker === 'citizen' && editingCitizen) {
                      setEditingCitizen(prev => prev ? { ...prev, icon } : null);
                      setUnsavedChanges(true);
                    } else if (showIconPicker === 'location' && editingLocation) {
                      setEditingLocation(prev => prev ? { ...prev, icon } : null);
                      setUnsavedChanges(true);
                    }
                    setShowIconPicker(null);
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
            <button
              className="mt-3 w-full text-sm text-gray-400 hover:text-gray-200"
              onClick={() => setShowIconPicker(null)}
            >Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
