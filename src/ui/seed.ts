/**
 * A stable pseudo-random value for a tile, so decorations that are generated rather than drawn
 * keep the same shape for as long as that tile exists instead of reshuffling on every render.
 * Same coordinates and index in, same number out.
 */
export function hash(x: number, y: number, i: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + i * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

/** `hash`, mapped onto a range. */
export function hashRange(x: number, y: number, i: number, min: number, max: number): number {
  return min + hash(x, y, i) * (max - min);
}
