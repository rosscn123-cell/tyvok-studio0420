import { Stage, Layer, Rect, Ellipse, Path, Transformer, Text } from 'react-konva';
import { useRef, useEffect } from 'react';
import type Konva from 'konva';
import { useStudioStore } from '../lib/store';

export function CanvasView() {
  const objects = useStudioStore((s) => s.objects);
  const selectedId = useStudioStore((s) => s.selectedId);
  const selectObject = useStudioStore((s) => s.selectObject);
  const updateObject = useStudioStore((s) => s.updateObject);
  const shapeRefs = useRef<Record<string, Konva.Shape | null>>({});
  const trRef = useRef<Konva.Transformer | null>(null);

  useEffect(() => {
    const tr = trRef.current;
    const node = selectedId ? shapeRefs.current[selectedId] : null;
    if (tr && node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    } else if (tr) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedId, objects]);

  return (
    <section className="canvas-shell panel">
      <div className="panel-header canvas-header">
        <h3>Canvas</h3>
        <p>Drag, resize, and assign process settings</p>
      </div>
      <div className="canvas-wrap">
        <Stage width={780} height={560} className="stage" onMouseDown={(e) => {
          if (e.target === e.target.getStage()) selectObject(null);
        }}>
          <Layer>
            <Rect x={0} y={0} width={780} height={560} fill="#fbfcff" />
            {objects.map((obj) => {
              const common = {
                key: obj.id,
                x: obj.x,
                y: obj.y,
                rotation: obj.rotation,
                draggable: true,
                stroke: selectedId === obj.id ? '#1d4ed8' : '#6b7280',
                strokeWidth: selectedId === obj.id ? 2.5 : 1.2,
                fill: obj.process.mode === 'fill' ? 'rgba(59,130,246,0.12)' : 'rgba(15,23,42,0.05)',
                onClick: () => selectObject(obj.id),
                onTap: () => selectObject(obj.id),
                onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => updateObject(obj.id, { x: e.target.x(), y: e.target.y() }),
                onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
                  const node = e.target;
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();
                  node.scaleX(1);
                  node.scaleY(1);
                  updateObject(obj.id, {
                    x: node.x(),
                    y: node.y(),
                    width: Math.max(20, obj.width * scaleX),
                    height: Math.max(20, obj.height * scaleY),
                    rotation: node.rotation()
                  });
                }
              };

              if (obj.kind === 'rect') {
                return <Rect ref={(n) => { shapeRefs.current[obj.id] = n; }} {...common} width={obj.width} height={obj.height} cornerRadius={8} />;
              }

              if (obj.kind === 'ellipse') {
                return <Ellipse ref={(n) => { shapeRefs.current[obj.id] = n; }} {...common} radiusX={obj.width / 2} radiusY={obj.height / 2} offsetX={-obj.width / 2} offsetY={-obj.height / 2} />;
              }

              return <Path ref={(n) => { shapeRefs.current[obj.id] = n; }} {...common} data={obj.pathData ?? ''} />;
            })}
            <Transformer ref={trRef} rotateEnabled enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']} />
            <Text x={18} y={18} text="Work area 780 × 560 mm" fontSize={14} fill="#64748b" />
          </Layer>
        </Stage>
      </div>
    </section>
  );
}
