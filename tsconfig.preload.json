import type { GraphicObject } from '../types';
import { parseSimplePath } from './svg';

const HEADER = ['; Tyvok Studio G-code', 'G21', 'G90'];

function mapPower(power: number) {
  return Math.max(0, Math.min(1000, Math.round((power / 100) * 1000)));
}

function fmt(n: number) {
  return Number(n.toFixed(3));
}

function lineTo(start: [number, number], points: [number, number][], power: number, speed: number) {
  const s = mapPower(power);
  const lines = [`G0 X${fmt(start[0])} Y${fmt(start[1])}`, `M3 S${s}`];
  for (const [x, y] of points) lines.push(`G1 X${fmt(x)} Y${fmt(y)} F${Math.round(speed)}`);
  lines.push('M5');
  return lines;
}

function rectToolpath(obj: GraphicObject) {
  const x = obj.x;
  const y = obj.y;
  const w = obj.width;
  const h = obj.height;
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]] as [number, number][];
}

function ellipseToolpath(obj: GraphicObject, segments = 48) {
  const cx = obj.x + obj.width / 2;
  const cy = obj.y + obj.height / 2;
  const rx = obj.width / 2;
  const ry = obj.height / 2;
  const pts: [number, number][] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = (Math.PI * 2 * i) / segments;
    pts.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
  }
  return pts;
}

function fillRect(obj: GraphicObject) {
  const interval = Math.max(0.08, obj.process.interval ?? 0.12);
  const lines: string[] = [];
  const s = mapPower(obj.process.power);
  for (let y = obj.y; y <= obj.y + obj.height; y += interval * 10) {
    const reverse = Math.round((y - obj.y) / (interval * 10)) % 2 === 1;
    const x1 = reverse ? obj.x + obj.width : obj.x;
    const x2 = reverse ? obj.x : obj.x + obj.width;
    lines.push(`G0 X${fmt(x1)} Y${fmt(y)}`);
    lines.push(`M3 S${s}`);
    lines.push(`G1 X${fmt(x2)} Y${fmt(y)} F${Math.round(obj.process.speed)}`);
    lines.push('M5');
  }
  return lines;
}

function pathToolpath(obj: GraphicObject) {
  return parseSimplePath(obj.pathData ?? '').map(([x, y]) => [x + obj.x, y + obj.y] as [number, number]);
}

export function generateGcode(objects: GraphicObject[]): string {
  const output = [...HEADER];

  for (const obj of objects) {
    output.push(`; Object: ${obj.name}`);
    for (let pass = 1; pass <= obj.process.passes; pass += 1) {
      output.push(`; Pass ${pass}/${obj.process.passes}`);

      if (obj.process.mode === 'fill' && obj.kind === 'rect') {
        output.push(...fillRect(obj));
        continue;
      }

      let path: [number, number][] = [];
      if (obj.kind === 'rect') path = rectToolpath(obj);
      if (obj.kind === 'ellipse') path = ellipseToolpath(obj);
      if (obj.kind === 'path') path = pathToolpath(obj);

      if (path.length >= 2) output.push(...lineTo(path[0], path.slice(1), obj.process.power, obj.process.speed));
    }
  }

  output.push('G0 X0 Y0');
  output.push('; End of file');
  return output.join('\n');
}
