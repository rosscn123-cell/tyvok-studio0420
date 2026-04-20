import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

const api = {
  saveProject: (suggestedName: string, content: string) => ipcRenderer.invoke('project:save', { suggestedName, content }),
  openProject: () => ipcRenderer.invoke('project:open'),
  importSvg: () => ipcRenderer.invoke('asset:import-svg'),
  exportGcode: (suggestedName: string, content: string) => ipcRenderer.invoke('gcode:export', { suggestedName, content }),
  listPorts: () => ipcRenderer.invoke('device:listPorts'),
  connectDevice: (path: string, baudRate: number) => ipcRenderer.invoke('device:connect', { path, baudRate }),
  disconnectDevice: () => ipcRenderer.invoke('device:disconnect'),
  startJob: (gcode: string) => ipcRenderer.invoke('device:startJob', { gcode }),
  frameJob: (bounds: { minX: number; minY: number; maxX: number; maxY: number }, feed: number) => ipcRenderer.invoke('device:frameJob', { bounds, feed }),
  pauseJob: () => ipcRenderer.invoke('device:pauseJob'),
  resumeJob: () => ipcRenderer.invoke('device:resumeJob'),
  stopJob: () => ipcRenderer.invoke('device:stopJob'),
  onDeviceStatus: (handler: (payload: unknown) => void) => {
    const listener = (_event: IpcRendererEvent, payload: unknown) => handler(payload);
    ipcRenderer.on('device:status', listener);
    return () => ipcRenderer.removeListener('device:status', listener);
  },
  onDeviceLog: (handler: (payload: unknown) => void) => {
    const listener = (_event: IpcRendererEvent, payload: unknown) => handler(payload);
    ipcRenderer.on('device:log', listener);
    return () => ipcRenderer.removeListener('device:log', listener);
  }
};

contextBridge.exposeInMainWorld('tyvok', api);
