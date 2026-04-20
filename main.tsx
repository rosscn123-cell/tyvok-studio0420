import { useStudioStore } from '../lib/store';

export function Sidebar() {
  const objects = useStudioStore((s) => s.objects);
  const selectedId = useStudioStore((s) => s.selectedId);
  const selectObject = useStudioStore((s) => s.selectObject);
  const addObject = useStudioStore((s) => s.addObject);
  const removeObject = useStudioStore((s) => s.removeObject);

  return (
    <aside className="panel sidebar">
      <div className="panel-header">
        <h3>Objects</h3>
        <p>Assets and layers</p>
      </div>

      <div className="sidebar-actions">
        <button onClick={() => addObject('rect')}>+ Rectangle</button>
        <button onClick={() => addObject('ellipse')}>+ Ellipse</button>
      </div>

      <div className="layer-list">
        {objects.map((obj) => (
          <button
            key={obj.id}
            className={`layer-item ${selectedId === obj.id ? 'active' : ''}`}
            onClick={() => selectObject(obj.id)}
          >
            <span>
              <strong>{obj.name}</strong>
              <small>{obj.kind} · {obj.process.mode}</small>
            </span>
            <span className="layer-actions">
              <code>{obj.process.power}%</code>
              <button
                className="icon-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  removeObject(obj.id);
                }}
                title="Remove"
              >
                ×
              </button>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
