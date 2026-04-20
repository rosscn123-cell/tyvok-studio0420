import { useEffect, useMemo } from 'react';
import { useStudioStore } from '../lib/store';

export function RightPanel() {
  const selectedId = useStudioStore((s) => s.selectedId);
  const objects = useStudioStore((s) => s.objects);
  const presets = useStudioStore((s) => s.presets);
  const updateObject = useStudioStore((s) => s.updateObject);
  const updateProcess = useStudioStore((s) => s.updateProcess);
  const applyPreset = useStudioStore((s) => s.applyPreset);
  const device = useStudioStore((s) => s.device);
  const logs = useStudioStore((s) => s.logs);
  const initDeviceSubscriptions = useStudioStore((s) => s.initDeviceSubscriptions);
  const refreshSerialPorts = useStudioStore((s) => s.refreshSerialPorts);

  useEffect(() => {
    initDeviceSubscriptions();
    void refreshSerialPorts();
  }, [initDeviceSubscriptions, refreshSerialPorts]);

  const selected = useMemo(() => objects.find((item) => item.id === selectedId) ?? null, [objects, selectedId]);

  return (
    <aside className="panel right-panel">
      <div className="panel-header">
        <h3>Inspector</h3>
        <p>Layer, process, and device status</p>
      </div>

      {selected ? (
        <div className="form-grid">
          <label>
            Name
            <input value={selected.name} onChange={(e) => updateObject(selected.id, { name: e.target.value })} />
          </label>
          <label>
            Preset
            <select defaultValue="" onChange={(e) => applyPreset(selected.id, e.target.value)}>
              <option value="" disabled>Select preset</option>
              {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
            </select>
          </label>
          <label>
            Mode
            <select value={selected.process.mode} onChange={(e) => updateProcess(selected.id, { mode: e.target.value as 'line' | 'fill' | 'image' })}>
              <option value="line">Line</option>
              <option value="fill">Fill</option>
              <option value="image">Image</option>
            </select>
          </label>
          <label>
            Power (%)
            <input type="number" min={0} max={100} value={selected.process.power} onChange={(e) => updateProcess(selected.id, { power: Number(e.target.value) })} />
          </label>
          <label>
            Speed (mm/min)
            <input type="number" min={1} value={selected.process.speed} onChange={(e) => updateProcess(selected.id, { speed: Number(e.target.value) })} />
          </label>
          <label>
            Passes
            <input type="number" min={1} max={20} value={selected.process.passes} onChange={(e) => updateProcess(selected.id, { passes: Number(e.target.value) })} />
          </label>
          <label>
            Fill Interval
            <input type="number" step="0.01" min={0.05} value={selected.process.interval ?? 0.12} onChange={(e) => updateProcess(selected.id, { interval: Number(e.target.value) })} />
          </label>
        </div>
      ) : <div className="empty-state">Select an object to edit parameters.</div>}

      <section className="device-card">
        <h4>Device</h4>
        <p>Status: <strong>{device.status}</strong></p>
        <p>Connected: <strong>{device.connected ? 'Yes' : 'No'}</strong></p>
        <p>Port: <strong>{device.portPath ?? 'N/A'}</strong></p>
        <p>Progress: <strong>{device.progress}%</strong></p>
        <p className="muted">{device.lastMessage}</p>
      </section>

      <section className="log-panel">
        <h4>Activity</h4>
        <div className="log-list">
          {logs.map((entry) => (
            <div key={entry.id} className={`log-item ${entry.level}`}>
              <span>{entry.time}</span>
              <strong>{entry.message}</strong>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
