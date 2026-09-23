import { hash, hashRange } from './seed';

/**
 * Pure geometry for the drawn tile effects. No React and no react-native imports, so the shapes
 * can be rendered headlessly into a preview image and looked at, rather than being tuned blind
 * inside a component. `tools/preview.ts` uses exactly these functions.
 */

/** Every effect is authored in a 100x100 box and scaled to the tile. */
export const VB = 100;

// ---------------------------------------------------------------- scorched

/**
 * Cooled rock is drawn as slabs laid *over* a lava bed, so the glow is what shows through the
 * gaps between them. Drawing the cracks as bright strokes instead makes orange lightning on
 * black, which is what the first attempt looked like.
 */
export function rockPlates(x: number, y: number, rows = 3): string[] {
  // Seeded Voronoi fractures: irregular basalt islands, without rectangular brick courses.
  const seeds: Array<[number, number]> = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < 3; c++) {
    seeds.push([(c + 0.5) * VB / 3 + hashRange(x, y, r * 12 + c, -12, 12),
      (r + 0.5) * VB / rows + hashRange(x, y, r * 12 + c + 100, -12, 12)]);
  }
  return seeds.map(([sx, sy], index) => {
    let polygon: Array<[number, number]> = [[0, 0], [VB, 0], [VB, VB], [0, VB]];
    for (let j = 0; j < seeds.length; j++) {
      if (index === j) continue;
      const [tx, ty] = seeds[j];
      const nx = tx - sx, ny = ty - sy, limit = (tx * tx + ty * ty - sx * sx - sy * sy) / 2;
      const clipped: Array<[number, number]> = [];
      for (let k = 0; k < polygon.length; k++) {
        const start = polygon[k], end = polygon[(k + 1) % polygon.length];
        const ds = start[0] * nx + start[1] * ny - limit, de = end[0] * nx + end[1] * ny - limit;
        if (ds <= 0) clipped.push(start);
        if ((ds <= 0) !== (de <= 0)) {
          const ratio = ds / (ds - de);
          clipped.push([start[0] + ratio * (end[0] - start[0]), start[1] + ratio * (end[1] - start[1])]);
        }
      }
      polygon = clipped;
    }
    return polygon.map(([px, py]) => `${(sx + (px - sx) * 0.945).toFixed(1)},${(sy + (py - sy) * 0.945).toFixed(1)}`).join(' ');
  });
}

// --------------------------------------------------------------------- ice

export interface Shard {
  /** Silhouette, and the two faces that give it a lit side and a shaded side. */
  outline: string;
  lit: string;
  shade: string;
  /** A short bright streak just below the tip. */
  spark: string;
  tipX: number;
  tipY: number;
}

/**
 * Three chunky crystals rather than a row of thin spikes: one dominant peak with a shorter one
 * either side. Each is split down the middle into a lit face and a shaded face, which is what
 * reads as a crystal instead of a triangle.
 */
export function iceShards(x: number, y: number): Shard[] {
  const layout: Array<[number, number, number]> = [
    [12, 12, 0.67],
    [49, 14, 0.3],
    [88, 12, 0.74],
  ];
  return layout.map(([bx, bw, scale], i) => {
    const base = bx + hashRange(x, y, i, -6, 6);
    const halfW = bw * hashRange(x, y, i + 10, 0.85, 1.15);
    const height = VB * scale * hashRange(x, y, i + 20, 0.55, 0.78);
    const tipX = base + hashRange(x, y, i + 30, -7, 7);
    const tipY = VB - height;
    const left = base - halfW;
    const right = base + halfW;
    // The shoulder partway up is what stops it being a plain isoceles triangle.
    const shX = base + halfW * 0.45;
    const shY = VB - height * 0.42;
    const sparkTop = tipY + height * 0.1;
    const sparkLow = tipY + height * 0.44;
    return {
      outline: `${left},${VB} ${tipX},${tipY} ${shX.toFixed(1)},${shY.toFixed(1)} ${right},${VB}`,
      shade: `${left},${VB} ${tipX},${tipY} ${base},${VB}`,
      lit: `${base},${VB} ${tipX},${tipY} ${shX.toFixed(1)},${shY.toFixed(1)} ${right},${VB}`,
      spark: `${tipX},${sparkTop.toFixed(1)} ${(tipX + halfW * 0.3).toFixed(1)},${sparkLow.toFixed(1)} ${(tipX + halfW * 0.06).toFixed(1)},${sparkLow.toFixed(1)}`,
      tipX,
      tipY,
    };
  });
}

// ------------------------------------------------------------------- bolt

const STEPS = 5;

/** The spine of a discharge, pinned to both tile edges so a beam never stops short. */
function boltPoints(x: number, y: number, spread: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [[VB / 2, 0]];
  for (let i = 1; i < STEPS; i++) {
    pts.push([VB / 2 + (hash(x, y, 13 + i) - 0.5) * spread, (i / STEPS) * VB]);
  }
  pts.push([VB / 2, VB]);
  return pts;
}

const toPath = (pts: Array<[number, number]>) =>
  pts.map(([px, py], i) => `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');

/**
 * A spine and two forks. The forks start from an actual vertex of the spine, so they read as
 * branches of the same discharge rather than as debris floating beside it.
 */
export function boltPaths(x: number, y: number): string[] {
  const spine = boltPoints(x, y, 40);
  const out = [toPath(spine)];
  for (let f = 0; f < 2; f++) {
    const at = 1 + Math.floor(hash(x, y, 200 + f) * (STEPS - 1));
    const [ax, ay] = spine[at];
    const dir = hash(x, y, 210 + f) < 0.5 ? -1 : 1;
    const len = hashRange(x, y, 220 + f, 17, 28);
    out.push(toPath([
      [ax, ay],
      [ax + dir * len * 0.55, ay + len * 0.42],
      [ax + dir * len, ay + len * 0.1],
    ]));
  }
  return out;
}

// ----------------------------------------------------------------- poison

export interface PuffSpec { d: number; left: number; top: number; dark: boolean; period: number; }

export function puffs(size: number, x: number, y: number, count: number): PuffSpec[] {
  const out: PuffSpec[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      d: size * hashRange(x, y, i, 0.52, 0.86),
      left: size * hashRange(x, y, i + 10, -0.16, 0.5),
      top: size * hashRange(x, y, i + 20, -0.16, 0.5),
      dark: hash(x, y, i + 30) < 0.45,
      period: 1700 + Math.floor(hash(x, y, i + 60) * 1700),
    });
  }
  return out;
}
