import { POLARITY_CHANCE, POLARITY_FROM_DEPTH } from './constants';
import type { GridLayout, GridShape, Pos } from './types';

const CARDINAL: Array<[number, number]> = [[0, -1], [0, 1], [-1, 0], [1, 0]];

function rand(n: number) { return Math.floor(Math.random() * n); }
function pick<T>(arr: T[]): T { return arr[rand(arr.length)]; }

export function gridSizeFor(depth: number): number {
  return Math.min(7, 5 + Math.min(2, Math.floor((depth - 1) / 3)));
}

function shapeFor(depth: number): GridShape {
  if (depth === 1) return 'plain';
  if (depth === 2) return 'eroded';
  return pick<GridShape>(['plain', 'void', 'split', 'eroded', 'void', 'split']);
}

function makeMask(size: number, shape: GridShape): boolean[][] {
  const m: boolean[][] = Array.from({ length: size }, () => Array(size).fill(true));

  if (shape === 'void') {
    const count = Math.max(1, Math.round(size * size * (0.1 + Math.random() * 0.08)));
    for (let i = 0; i < count; i++) {
      const x = 1 + rand(size - 2), y = 1 + rand(size - 2);
      m[y][x] = false;
    }
  } else if (shape === 'split') {
    const vertical = Math.random() < 0.5;
    const line = Math.floor(size / 2);
    const gap = rand(size);
    for (let i = 0; i < size; i++) {
      if (i === gap) continue;
      if (vertical) m[i][line] = false; else m[line][i] = false;
    }
  } else if (shape === 'eroded') {
    const corners: Pos[] = [{ x: 0, y: 0 }, { x: size - 1, y: 0 }, { x: 0, y: size - 1 }, { x: size - 1, y: size - 1 }];
    for (const c of corners) if (Math.random() < 0.6) m[c.y][c.x] = false;
    const extra = rand(size);
    for (let i = 0; i < extra; i++) {
      const side = rand(4);
      const t = rand(size);
      const p = side === 0 ? { x: t, y: 0 } : side === 1 ? { x: t, y: size - 1 } : side === 2 ? { x: 0, y: t } : { x: size - 1, y: t };
      m[p.y][p.x] = false;
    }
  }
  return m;
}

export function floodFill(mask: boolean[][], from: Pos): Set<string> {
  const size = mask.length;
  const seen = new Set<string>();
  const key = (p: Pos) => `${p.x},${p.y}`;
  if (!mask[from.y]?.[from.x]) return seen;
  const stack: Pos[] = [from];
  seen.add(key(from));
  while (stack.length) {
    const p = stack.pop()!;
    for (const [dx, dy] of CARDINAL) {
      const n = { x: p.x + dx, y: p.y + dy };
      if (n.x < 0 || n.y < 0 || n.x >= size || n.y >= size) continue;
      if (!mask[n.y][n.x] || seen.has(key(n))) continue;
      seen.add(key(n));
      stack.push(n);
    }
  }
  return seen;
}

function manhattan(a: Pos, b: Pos) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }

/**
 * Generates a validated layout: start, hut and hatch all mutually reachable,
 * region large enough to manoeuvre in, structures kept apart. Falls back to a
 * plain grid if a shape refuses to produce a valid board.
 */
export function generateGrid(depth: number, previousHadPolarity = false): GridLayout {
  const size = gridSizeFor(depth);
  const wantShape = shapeFor(depth);
  const polarity = depth >= POLARITY_FROM_DEPTH && !previousHadPolarity && (depth === POLARITY_FROM_DEPTH || Math.random() < POLARITY_CHANCE);

  for (let attempt = 0; attempt < 60; attempt++) {
    const shape: GridShape = attempt < 40 ? wantShape : 'plain';
    const mask = makeMask(size, shape);
    const passable: Pos[] = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (mask[y][x]) passable.push({ x, y });
    if (passable.length < size * size * 0.6) continue;

    const center = { x: Math.floor(size / 2), y: Math.floor(size / 2) };
    const start = passable.slice().sort((a, b) => manhattan(a, center) - manhattan(b, center))[0];
    const region = floodFill(mask, start);
    if (region.size < size * size * 0.6) continue;

    const inRegion = passable.filter(p => region.has(`${p.x},${p.y}`) && !(p.x === start.x && p.y === start.y));
    if (inRegion.length < 6) continue;

    const byDist = inRegion.slice().sort((a, b) => manhattan(b, start) - manhattan(a, start));
    const hatch = byDist[0];
    const hutCandidates = inRegion.filter(p => manhattan(p, hatch) >= 2 && manhattan(p, start) >= 2);
    if (hutCandidates.length === 0) continue;
    const hut = pick(hutCandidates);

    return { size, shape, passable: mask, start, hut, hatch, polarity };
  }

  // Unreachable in practice, but never hand the player an invalid board.
  const mask = makeMask(size, 'plain');
  return {
    size, shape: 'plain', passable: mask,
    start: { x: 1, y: 1 }, hut: { x: size - 2, y: 1 }, hatch: { x: size - 1, y: size - 1 }, polarity,
  };
}
