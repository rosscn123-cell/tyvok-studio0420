import { useStudioStore } from '../lib/store';

export function GcodePanel() {
  const gcode = useStudioStore((s) => s.gcode);

  return (
    <section className="panel gcode-panel">
      <div className="panel-header">
        <h3>G-code Preview</h3>
        <p>Generated from current objects and process settings</p>
      </div>
      <pre>{gcode}</pre>
    </section>
  );
}
