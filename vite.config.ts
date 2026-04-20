import { create } from 'zustand';
import type { DeviceState, DeviceStatus, GraphicObject, LayerProcess, MaterialPreset, ProjectFile, SerialPortInfo, StudioLogEntry } from '../types';
import { MATERIAL_PRESETS } from './materials';
import { generateGcode } from './gcode';
import { importSvgToObjects } from './svg';
import {
  connectSerialDevice,
  disconnectSerialDevice,
  frameDeviceJob,
  listSerialPorts,
  pauseDeviceJob,
  resumeDeviceJob,
  startDeviceJob,
  stopDeviceJob,
  subscribeDeviceLog,
  subscribeDeviceStatus
} from './deviceService';

const baseProcess: LayerProcess = {
  mode: 'line',
  power: 80,
  speed: 1200,
  passes: 1,
  interval: 0.12
};

const seedObjects: GraphicObject[] = [
  { id: 'obj-1', name: 'Wood Tag', kind: 'rect', x: 40, y: 40, width: 220, height: 120, rotation: 0, process: { ...baseProcess } },
  { id: 'obj-2', name: 'Round Badge', kind: 'ellipse', x: 320, y: 70, width: 120, height: 120, rotation: 0, process: { mode: 'fill', power: 35, speed: 2200, passes: 1, interval: 0.12 } }
];

interface StudioState {
  projectName: string;
  objects: GraphicObject[];
  selectedId: string | null;
  presets: MaterialPreset[];
  gcode: string;
  device: DeviceState;
  logs: StudioLogEntry[];
  serialPorts: SerialPortInfo[];
  selectedPortPath: string;
  baudRate: number;
  subscriptionsReady: boolean;
  selectObject: (id: string | null) => void;
  updateObject: (id: string, patch: Partial<GraphicObject>) => void;
  updateProcess: (id: string, patch: Partial<LayerProcess>) => void;
  addObject: (kind: 'rect' | 'ellipse') => void;
  removeObject: (id: string) => void;
  applyPreset: (id: string, presetId: string) => void;
  regenerateGcode: () => void;
  refreshSerialPorts: () => Promise<void>;
  setSelectedPortPath: (path: string) => void;
  setBaudRate: (value: number) => void;
  connectDevice: () => Promise<void>;
  disconnectDevice: () => Promise<void>;
  frameJob: () => Promise<void>;
  startJob: () => Promise<void>;
  pauseJob: () => Promise<void>;
  resumeJob: () => Promise<void>;
  stopJob: () => Promise<void>;
  addLog: (level: StudioLogEntry['level'], message: string) => void;
  handleDeviceStatus: (payload: DeviceStatus) => void;
  initDeviceSubscriptions: () => void;
  resetProject: () => void;
  saveProject: () => Promise<void>;
  openProject: () => Promise<void>;
  exportGcode: () => Promise<void>;
  importSvg: () => Promise<void>;
}

const initialGcode = generateGcode(seedObjects);
const now = () => new Date().toLocaleTimeString();

function computeBounds(objects: GraphicObject[]) {
  if (objects.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return {
    minX: Math.min(...objects.map((obj) => obj.x)),
    minY: Math.min(...objects.map((obj) => obj.y)),
    maxX: Math.max(...objects.map((obj) => obj.x + obj.width)),
    maxY: Math.max(...objects.map((obj) => obj.y + obj.height))
  };
}

export const useStudioStore = create<StudioState>((set, get) => ({
  projectName: 'Untitled Project',
  objects: seedObjects,
  selectedId: seedObjects[0].id,
  presets: MATERIAL_PRESETS,
  gcode: initialGcode,
  device: { connected: false, status: 'idle', progress: 0, lastMessage: 'Ready', portPath: null },
  logs: [{ id: 'log-1', time: now(), level: 'info', message: 'Project initialized' }],
  serialPorts: [],
  selectedPortPath: '',
  baudRate: 115200,
  subscriptionsReady: false,
  selectObject: (id) => set({ selectedId: id }),
  addLog: (level, message) => set((state) => ({
    logs: [{ id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, time: now(), level, message }, ...state.logs].slice(0, 200)
  })),
  handleDeviceStatus: (payload) => {
    set((state) => ({
      device: {
        ...state.device,
        connected: payload.connected,
        status: payload.state,
        lastMessage: payload.message,
        portPath: payload.portPath,
        progress: payload.state === 'running' ? Math.min(95, state.device.progress + 5) : payload.state === 'connected' ? 0 : state.device.progress
      }
    }));
    get().addLog(payload.state === 'error' ? 'error' : payload.state === 'paused' || payload.state === 'stopped' ? 'warn' : 'info', payload.message);
  },
  initDeviceSubscriptions: () => {
    if (get().subscriptionsReady) return;
    subscribeDeviceStatus((payload) => get().handleDeviceStatus(payload));
    subscribeDeviceLog((payload) => get().addLog(payload.level === 'rx' || payload.level === 'tx' ? 'info' : payload.level, `${payload.level.toUpperCase()}: ${payload.message}`));
    set({ subscriptionsReady: true });
  },
  updateObject: (id, patch) => {
    set((state) => ({ objects: state.objects.map((obj) => (obj.id === id ? { ...obj, ...patch } : obj)) }));
    get().regenerateGcode();
  },
  updateProcess: (id, patch) => {
    set((state) => ({
      objects: state.objects.map((obj) => (obj.id === id ? { ...obj, process: { ...obj.process, ...patch } } : obj))
    }));
    get().regenerateGcode();
  },
  addObject: (kind) => {
    const count = get().objects.length + 1;
    const id = `obj-${Date.now()}`;
    const obj: GraphicObject = {
      id,
      name: kind === 'rect' ? `Rectangle ${count}` : `Ellipse ${count}`,
      kind,
      x: 60 + count * 18,
      y: 60 + count * 18,
      width: kind === 'rect' ? 180 : 120,
      height: kind === 'rect' ? 100 : 120,
      rotation: 0,
      process: { ...baseProcess }
    };
    set((state) => ({ objects: [...state.objects, obj], selectedId: id }));
    get().regenerateGcode();
    get().addLog('info', `${obj.name} created`);
  },
  removeObject: (id) => {
    const removed = get().objects.find((obj) => obj.id === id);
    set((state) => ({ objects: state.objects.filter((obj) => obj.id !== id), selectedId: state.selectedId === id ? null : state.selectedId }));
    get().regenerateGcode();
    if (removed) get().addLog('warn', `${removed.name} removed`);
  },
  applyPreset: (id, presetId) => {
    const preset = get().presets.find((p) => p.id === presetId);
    if (!preset) return;
    get().updateProcess(id, {
      mode: preset.mode,
      power: preset.power,
      speed: preset.speed,
      passes: preset.passes,
      interval: preset.interval
    });
    get().addLog('info', `Preset applied: ${preset.name}`);
  },
  regenerateGcode: () => set((state) => ({ gcode: generateGcode(state.objects) })),
  refreshSerialPorts: async () => {
    try {
      const ports = await listSerialPorts();
      set((state) => ({ serialPorts: ports, selectedPortPath: state.selectedPortPath || ports[0]?.path || '' }));
      get().addLog('info', `Ports refreshed: ${ports.length} found`);
    } catch (error) {
      get().addLog('error', `Port scan failed: ${(error as Error).message}`);
    }
  },
  setSelectedPortPath: (path) => set({ selectedPortPath: path }),
  setBaudRate: (value) => set({ baudRate: value }),
  connectDevice: async () => {
    get().initDeviceSubscriptions();
    if (!get().selectedPortPath) await get().refreshSerialPorts();
    const portPath = get().selectedPortPath;
    if (!portPath) {
      get().addLog('error', 'No serial port selected');
      return;
    }
    try {
      const result = await connectSerialDevice(portPath, get().baudRate);
      set((state) => ({ device: { ...state.device, connected: result.connected, status: result.state, lastMessage: result.message, portPath: result.portPath } }));
    } catch (error) {
      get().addLog('error', `Connect failed: ${(error as Error).message}`);
    }
  },
  disconnectDevice: async () => {
    try {
      const result = await disconnectSerialDevice();
      set((state) => ({ device: { ...state.device, connected: result.connected, status: result.state, lastMessage: result.message, portPath: result.portPath, progress: 0 } }));
    } catch (error) {
      get().addLog('error', `Disconnect failed: ${(error as Error).message}`);
    }
  },
  frameJob: async () => {
    try {
      const bounds = computeBounds(get().objects);
      const result = await frameDeviceJob(bounds, 3000);
      set((state) => ({ device: { ...state.device, status: result.state, lastMessage: result.message, portPath: result.portPath } }));
    } catch (error) {
      get().addLog('error', `Frame failed: ${(error as Error).message}`);
    }
  },
  startJob: async () => {
    try {
      set((state) => ({ device: { ...state.device, status: 'running', progress: 3, lastMessage: 'Sending G-code...' } }));
      const result = await startDeviceJob(get().gcode);
      set((state) => ({ device: { ...state.device, status: result.state, progress: 100, lastMessage: result.message, portPath: result.portPath } }));
    } catch (error) {
      get().addLog('error', `Start failed: ${(error as Error).message}`);
    }
  },
  pauseJob: async () => {
    try {
      const result = await pauseDeviceJob();
      set((state) => ({ device: { ...state.device, status: result.state, lastMessage: result.message, portPath: result.portPath } }));
    } catch (error) {
      get().addLog('error', `Pause failed: ${(error as Error).message}`);
    }
  },
  resumeJob: async () => {
    try {
      const result = await resumeDeviceJob();
      set((state) => ({ device: { ...state.device, status: result.state, lastMessage: result.message, portPath: result.portPath } }));
    } catch (error) {
      get().addLog('error', `Resume failed: ${(error as Error).message}`);
    }
  },
  stopJob: async () => {
    try {
      const result = await stopDeviceJob();
      set((state) => ({ device: { ...state.device, status: result.state, progress: 0, lastMessage: result.message, portPath: result.portPath } }));
    } catch (error) {
      get().addLog('error', `Stop failed: ${(error as Error).message}`);
    }
  },
  resetProject: () => {
    set({ projectName: 'Untitled Project', objects: seedObjects, selectedId: seedObjects[0].id, gcode: generateGcode(seedObjects) });
    get().addLog('info', 'Project reset');
  },
  saveProject: async () => {
    const project: ProjectFile = {
      version: 1,
      name: get().projectName,
      canvas: { width: 780, height: 560 },
      objects: get().objects
    };
    const path = await window.tyvok?.saveProject(`${project.name || 'project'}.tyvok.json`, JSON.stringify(project, null, 2));
    if (path) get().addLog('info', `Project saved: ${path}`);
  },
  openProject: async () => {
    const file = await window.tyvok?.openProject();
    if (!file) return;
    try {
      const parsed = JSON.parse(file.content) as ProjectFile;
      set({ projectName: parsed.name, objects: parsed.objects, selectedId: parsed.objects[0]?.id ?? null, gcode: generateGcode(parsed.objects) });
      get().addLog('info', `Project opened: ${file.filePath}`);
    } catch (error) {
      get().addLog('error', `Open failed: ${(error as Error).message}`);
    }
  },
  exportGcode: async () => {
    const path = await window.tyvok?.exportGcode(`${get().projectName || 'job'}.gcode`, get().gcode);
    if (path) get().addLog('info', `G-code exported: ${path}`);
  },
  importSvg: async () => {
    const file = await window.tyvok?.importSvg();
    if (!file) return;
    const imported = importSvgToObjects(file.content, baseProcess);
    if (imported.length === 0) {
      get().addLog('warn', 'No supported SVG elements found');
      return;
    }
    set((state) => ({ objects: [...state.objects, ...imported], selectedId: imported[0].id }));
    get().regenerateGcode();
    get().addLog('info', `SVG imported: ${imported.length} objects`);
  }
}));
