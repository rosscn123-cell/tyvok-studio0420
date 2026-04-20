import { useStudioStore } from '../lib/store';

export function ControlBar() {
  const serialPorts = useStudioStore((s) => s.serialPorts);
  const selectedPortPath = useStudioStore((s) => s.selectedPortPath);
  const baudRate = useStudioStore((s) => s.baudRate);
  const device = useStudioStore((s) => s.device);
  const refreshSerialPorts = useStudioStore((s) => s.refreshSerialPorts);
  const setSelectedPortPath = useStudioStore((s) => s.setSelectedPortPath);
  const setBaudRate = useStudioStore((s) => s.setBaudRate);
  const connectDevice = useStudioStore((s) => s.connectDevice);
  const disconnectDevice = useStudioStore((s) => s.disconnectDevice);
  const frameJob = useStudioStore((s) => s.frameJob);
  const startJob = useStudioStore((s) => s.startJob);
  const pauseJob = useStudioStore((s) => s.pauseJob);
  const resumeJob = useStudioStore((s) => s.resumeJob);
  const stopJob = useStudioStore((s) => s.stopJob);

  return (
    <footer className="control-bar">
      <div className="control-left">
        <button onClick={() => void refreshSerialPorts()}>Scan Ports</button>
        <select value={selectedPortPath} onChange={(e) => setSelectedPortPath(e.target.value)}>
          <option value="">Select port</option>
          {serialPorts.map((port) => <option key={port.path} value={port.path}>{port.friendlyName}</option>)}
        </select>
        <input className="baud-input" type="number" min={9600} step={100} value={baudRate} onChange={(e) => setBaudRate(Number(e.target.value) || 115200)} />
        {!device.connected ? <button onClick={() => void connectDevice()}>Connect</button> : <button onClick={() => void disconnectDevice()}>Disconnect</button>}
        <button onClick={() => void frameJob()} disabled={!device.connected}>Frame</button>
      </div>
      <div className="control-right">
        <span className="device-pill">{device.connected ? device.portPath || 'Connected' : 'No device'}</span>
        <button className="primary" onClick={() => void startJob()} disabled={!device.connected}>Start</button>
        <button onClick={() => void pauseJob()} disabled={!device.connected}>Pause</button>
        <button onClick={() => void resumeJob()} disabled={!device.connected}>Resume</button>
        <button className="danger" onClick={() => void stopJob()} disabled={!device.connected}>Stop</button>
      </div>
    </footer>
  );
}
