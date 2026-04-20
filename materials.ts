import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import { promises as fs } from 'fs';
import { SerialLaserService } from './serialService';

let mainWindow: BrowserWindow | null = null;
const laserService = new SerialLaserService();

function sendToRenderer(channel: string, payload: unknown) {
  mainWindow?.webContents.send(channel, payload);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 1280,
    minHeight: 760,
    title: 'Tyvok Studio',
    webPreferences: {
      preload: path.join(app.getAppPath(), 'dist/preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist/renderer/index.html'));
  }
}

async function saveTextFile(defaultName: string, content: string, filters: Electron.FileFilter[]) {
  if (!mainWindow) throw new Error('Window unavailable');

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters
  });

  if (canceled || !filePath) return null;
  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
}

async function openTextFile(filters: Electron.FileFilter[]) {
  if (!mainWindow) throw new Error('Window unavailable');

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters
  });

  if (canceled || filePaths.length === 0) return null;
  const filePath = filePaths[0];
  const content = await fs.readFile(filePath, 'utf8');
  return { filePath, content };
}

app.whenReady().then(() => {
  laserService.on('status', (payload) => sendToRenderer('device:status', payload));
  laserService.on('log', (payload) => sendToRenderer('device:log', payload));

  ipcMain.handle('project:save', async (_, payload: { suggestedName: string; content: string }) => {
    return saveTextFile(payload.suggestedName, payload.content, [{ name: 'Tyvok Project', extensions: ['tyvok.json'] }]);
  });

  ipcMain.handle('project:open', async () => {
    return openTextFile([{ name: 'Tyvok Project', extensions: ['json'] }]);
  });

  ipcMain.handle('asset:import-svg', async () => {
    return openTextFile([{ name: 'SVG', extensions: ['svg'] }]);
  });

  ipcMain.handle('gcode:export', async (_, payload: { suggestedName: string; content: string }) => {
    return saveTextFile(payload.suggestedName, payload.content, [{ name: 'G-code', extensions: ['gcode', 'nc', 'txt'] }]);
  });

  ipcMain.handle('device:listPorts', async () => laserService.listPorts());
  ipcMain.handle('device:connect', async (_, payload: { path: string; baudRate: number }) => laserService.connect(payload.path, payload.baudRate));
  ipcMain.handle('device:disconnect', async () => laserService.disconnect());
  ipcMain.handle('device:startJob', async (_, payload: { gcode: string }) => laserService.startJob(payload.gcode));
  ipcMain.handle('device:frameJob', async (_, payload: { bounds: { minX: number; minY: number; maxX: number; maxY: number }; feed: number }) => laserService.frame(payload.bounds, payload.feed));
  ipcMain.handle('device:pauseJob', async () => laserService.pause());
  ipcMain.handle('device:resumeJob', async () => laserService.resume());
  ipcMain.handle('device:stopJob', async () => laserService.stop());

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', async () => {
  await laserService.disconnect(false).catch(() => undefined);
  if (process.platform !== 'darwin') app.quit();
});
