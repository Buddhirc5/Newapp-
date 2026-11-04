// Generates a seamless, tileable topographic contour pattern (src/assets/topo.svg).
// The height field is a sum of sine waves with integer frequencies, so it repeats
// exactly every TILE px in both directions and tiles without visible seams.
import { contours } from "d3-contour";
import { writeFileSync } from "node:fs";

const TILE = 640;
const CELLS = 128; // grid cells across one tile
const PAD = 0.15; // extend the grid past the tile so ring closures fall outside the viewBox
const LEVELS = 15;

// Deterministic PRNG so the pattern is stable between runs.
let seed = 20261104;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

const waves = [];
for (let m = -3; m <= 3; m++) {
  for (let n = 0; n <= 3; n++) {
    if (n === 0 && m <= 0) continue;
    const k = Math.hypot(m, n);
    waves.push({ m, n, a: (0.6 + rand() * 0.8) / Math.pow(k, 1.6), p: rand() * Math.PI * 2 });
  }
}
const field = (x, y) =>
  waves.reduce((v, w) => v + w.a * Math.sin((2 * Math.PI * (w.m * x + w.n * y)) / TILE + w.p), 0);

const step = TILE / CELLS;
const start = -TILE * PAD;
const count = Math.ceil((TILE * (1 + 2 * PAD)) / step) + 1;
const values = new Float64Array(count * count);
let min = Infinity;
let max = -Infinity;
for (let j = 0; j < count; j++) {
  for (let i = 0; i < count; i++) {
    const v = field(start + i * step, start + j * step);
    values[j * count + i] = v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
}
const thresholds = Array.from({ length: LEVELS }, (_, i) => min + ((i + 0.5) * (max - min)) / LEVELS);
const polys = contours().size([count, count]).thresholds(thresholds)(Array.from(values));

// Ramer–Douglas–Peucker simplification keeps the file small.
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const sq = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = dx * dx + dy * dy || 1;
    let worst = -1;
    let index = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
      const ex = ax + t * dx - px;
      const ey = ay + t * dy - py;
      const d = ex * ex + ey * ey;
      if (d > worst) {
        worst = d;
        index = i;
      }
    }
    if (worst > sq) {
      keep[index] = 1;
      stack.push([a, index], [index, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const toPx = ([gx, gy]) => [start + gx * step, start + gy * step];
const fmt = (n) => Math.round(n * 10) / 10;
let d = "";
for (const poly of polys) {
  for (const polygon of poly.coordinates) {
    for (const ring of polygon) {
      const pts = simplify(ring.map(toPx), 0.6);
      if (pts.length < 3) continue;
      // Skip rings that sit entirely outside the visible tile.
      if (pts.every(([x, y]) => x < -4 || y < -4 || x > TILE + 4 || y > TILE + 4)) continue;
      d += "M" + pts.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join("L") + "Z";
    }
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}"><path d="${d}" fill="none" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>\n`;
writeFileSync(new URL("../src/assets/topo.svg", import.meta.url), svg);
console.log(`topo.svg written: ${(svg.length / 1024).toFixed(1)} KB, ${polys.length} levels`);
