import { EventEmitter } from 'events';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  vendorId?: string;
  productId?: string;
  friendlyName: string;
}

export interface DeviceStatusEvent {
  connected: boolean;
  portPath: string | null;
  message: string;
  state: 'idle' | 'connecting' | 'connected' | 'running' | 'paused' | 'stopped' | 'error';
}

export interface DeviceLogEvent {
  level: 'info' | 'warn' | 'error' | 'rx' | 'tx';
  message: string;
}

export class SerialLaserService extends EventEmitter {
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private connectedPath: string | null = null;
  private running = false;

  async listPorts(): Promise<SerialPortInfo[]> {
    const ports = await SerialPort.list();
    return ports.map((p) => ({
      path: p.path,
      manufacturer: p.manufacturer,
      serialNumber: p.serialNumber,
      vendorId: p.vendorId,
      productId: p.productId,
      friendlyName: [p.path, p.manufacturer, p.vendorId && p.productId ? `(${p.vendorId}:${p.productId})` : '']
        .filter(Boolean)
        .join(' ')
    }));
  }

  async connect(path: string, baudRate = 115200): Promise<DeviceStatusEvent> {
    if (this.port?.isOpen && this.connectedPath === path) {
      return this.status('Already connected', 'connected');
    }

    await this.disconnect(false);
    this.emit('status', this.status(`Connecting to ${path}...`, 'connecting', path));

    this.port = new SerialPort({ path, baudRate, autoOpen: false });

    await new Promise<void>((resolve, reject) => {
      this.port?.open((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    this.connectedPath = path;
    this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));
    this.parser.on('data', (line: string) => {
      const clean = line.replace(/[\r\n]+/g, '').trim();
      if (!clean) return;
      this.emit('log', { level: 'rx', message: clean } satisfies DeviceLogEvent);
    });

    this.port.on('error', (error) => {
      this.emit('log', { level: 'error', message: `Serial error: ${error.message}` } satisfies DeviceLogEvent);
      this.emit('status', this.status(`Serial error: ${error.message}`, 'error', this.connectedPath));
    });

    this.port.on('close', () => {
      this.connectedPath = null;
      this.running = false;
      this.emit('status', this.status('Device disconnected', 'stopped', null));
    });

    try {
      await this.writeRaw('\r\n');
      await this.writeRaw('M5\n');
      await this.writeRaw('$X\n').catch(() => undefined);
    } catch {
      // Ignore startup command failures; some boards do not support these commands.
    }

    const status = this.status(`Connected to ${path}`, 'connected', path);
    this.emit('status', status);
    this.emit('log', { level: 'info', message: status.message } satisfies DeviceLogEvent);
    return status;
  }

  async disconnect(emit = true): Promise<DeviceStatusEvent> {
    if (!this.port) return this.status('Device not connected', 'idle', null);

    const current = this.port;
    this.port = null;
    this.parser?.removeAllListeners();
    this.parser = null;
    const path = this.connectedPath;
    this.connectedPath = null;
    this.running = false;

    if (current.isOpen) {
      await new Promise<void>((resolve) => current.close(() => resolve()));
    }

    const status = this.status(path ? `Disconnected from ${path}` : 'Device disconnected', 'idle', null);
    if (emit) {
      this.emit('status', status);
      this.emit('log', { level: 'warn', message: status.message } satisfies DeviceLogEvent);
    }
    return status;
  }

  async startJob(gcode: string): Promise<DeviceStatusEvent> {
    this.ensureConnected();
    const lines = this.normalizeGcode(gcode);
    if (lines.length === 0) throw new Error('No G-code to send');

    this.running = true;
    this.emit('status', this.status(`Sending ${lines.length} G-code lines`, 'running', this.connectedPath));
    for (const line of lines) {
      if (!this.running) break;
      await this.writeRaw(`${line}\n`);
      this.emit('log', { level: 'tx', message: line } satisfies DeviceLogEvent);
      await this.delay(8);
    }

    if (this.running) {
      this.running = false;
      const status = this.status('G-code transmission complete', 'connected', this.connectedPath);
      this.emit('status', status);
      return status;
    }

    const status = this.status('Job interrupted', 'stopped', this.connectedPath);
    this.emit('status', status);
    return status;
  }

  async frame(bounds: { minX: number; minY: number; maxX: number; maxY: number }, feed = 3000): Promise<DeviceStatusEvent> {
    this.ensureConnected();
    const { minX, minY, maxX, maxY } = bounds;
    const lines = [
      'G21',
      'G90',
      'M5',
      `G0 X${minX.toFixed(3)} Y${minY.toFixed(3)}`,
      `G1 X${maxX.toFixed(3)} Y${minY.toFixed(3)} F${feed}`,
      `G1 X${maxX.toFixed(3)} Y${maxY.toFixed(3)} F${feed}`,
      `G1 X${minX.toFixed(3)} Y${maxY.toFixed(3)} F${feed}`,
      `G1 X${minX.toFixed(3)} Y${minY.toFixed(3)} F${feed}`,
      'M5'
    ];
    for (const line of lines) {
      await this.writeRaw(`${line}\n`);
      this.emit('log', { level: 'tx', message: line } satisfies DeviceLogEvent);
      await this.delay(12);
    }
    const status = this.status('Frame preview sent', 'connected', this.connectedPath);
    this.emit('status', status);
    return status;
  }

  async pause(): Promise<DeviceStatusEvent> {
    this.ensureConnected();
    await this.writeRaw('!');
    this.running = false;
    const status = this.status('Pause command sent', 'paused', this.connectedPath);
    this.emit('status', status);
    this.emit('log', { level: 'warn', message: status.message } satisfies DeviceLogEvent);
    return status;
  }

  async resume(): Promise<DeviceStatusEvent> {
    this.ensureConnected();
    await this.writeRaw('~');
    const status = this.status('Resume command sent', 'running', this.connectedPath);
    this.emit('status', status);
    this.emit('log', { level: 'info', message: status.message } satisfies DeviceLogEvent);
    return status;
  }

  async stop(): Promise<DeviceStatusEvent> {
    this.ensureConnected();
    this.running = false;
    await this.writeRaw('\x18');
    await this.writeRaw('M5\n').catch(() => undefined);
    const status = this.status('Emergency stop sent', 'stopped', this.connectedPath);
    this.emit('status', status);
    this.emit('log', { level: 'warn', message: status.message } satisfies DeviceLogEvent);
    return status;
  }

  private async writeRaw(data: string): Promise<void> {
    this.ensureConnected();
    await new Promise<void>((resolve, reject) => {
      this.port?.write(data, (error) => {
        if (error) reject(error);
        else this.port?.drain((drainError) => (drainError ? reject(drainError) : resolve()));
      });
    });
  }

  private normalizeGcode(gcode: string): string[] {
    return gcode
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith(';'));
  }

  private ensureConnected() {
    if (!this.port?.isOpen || !this.connectedPath) throw new Error('No serial device connected');
  }

  private status(message: string, state: DeviceStatusEvent['state'], portPath = this.connectedPath): DeviceStatusEvent {
    return { connected: Boolean(portPath), portPath, message, state };
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
