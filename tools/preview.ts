import { VB, boltPaths, iceShards, puffs, rockPlates } from '../src/ui/shapes';

/**
 * Renders the drawn tile effects to a standalone SVG so they can be looked at, instead of being
 * tuned blind inside components that only exist on a phone. It imports the same geometry the
 * components do, so what this shows is what the game draws.
 *
 *   npm run preview > .preview/effects.svg
 */

const lava = { rock: '#2a2a2e', rockLight: '#3a3a40', crack: '#ff6b35', core: '#ffd166', glow: '#ff8c1a' };
const ice = { deep: '#00a0a0', medium: '#40e0e0', light: '#a0ffff' };
const bolt = { white: '#ffffff', yellow: '#ffff00', cyan: '#00ffff' };
const toxin = { deep: '#6a0d91', medium: '#9370db', light: '#e6e6fa' };
const tile = { light: '#fdfcf7', dark: '#f3efe4' };

const TILE = 56;
const GAP = 10;

function scorched(x: number, y: number): string {
  const plates = rockPlates(x, y);
  return `
    <rect width="${VB}" height="${VB}" fill="url(#magma)"/>
    <rect width="${VB}" height="${VB}" fill="url(#heat)" opacity="0.9"/>
    ${plates.map(pts => `<polygon points="${pts}" fill="url(#slab)" stroke="${lava.rockLight}" stroke-width="0.6" stroke-opacity="0.8"/>`).join('')}`;
}

function frozen(x: number, y: number): string {
  const shards = iceShards(x, y);
  return `
    <rect width="${VB}" height="${VB}" fill="#dff1f7"/>
    <rect width="${VB}" height="${VB}" fill="url(#rime)"/>
    ${shards.map(sh => `
      <polygon points="${sh.shade}" fill="url(#shardShade)" opacity="0.88"/>
      <polygon points="${sh.lit}" fill="url(#shardLit)" opacity="0.88"/>
      <polygon points="${sh.spark}" fill="#ffffff" opacity="0.6"/>
      <polygon points="${sh.outline}" fill="none" stroke="${ice.light}" stroke-width="1.2" stroke-opacity="0.9" stroke-linejoin="round"/>
    `).join('')}
    <rect width="${VB}" height="${VB}" fill="${ice.light}" opacity="0.1"/>`;
}

function discharge(x: number, y: number, angle: number): string {
  const paths = boltPaths(x, y);
  const rot = `transform="rotate(${angle} ${VB / 2} ${VB / 2})"`;
  return `
    <rect width="${VB}" height="${VB}" fill="${tile.light}"/>
    <g ${rot} stroke-linecap="round" stroke-linejoin="miter" stroke-miterlimit="6" fill="none">
      ${paths.map((d, i) => `<path d="${d}" stroke="${bolt.cyan}" stroke-width="${i === 0 ? 11 : 6}" stroke-opacity="0.32"/>`).join('')}
      ${paths.map((d, i) => `<path d="${d}" stroke="${bolt.yellow}" stroke-width="${i === 0 ? 4.4 : 2.4}" stroke-opacity="0.95"/>`).join('')}
      ${paths.map((d, i) => `<path d="${d}" stroke="${bolt.white}" stroke-width="${i === 0 ? 1.9 : 1}"/>`).join('')}
    </g>`;
}

function poison(x: number, y: number, count: number, dim: number): string {
  const specs = puffs(VB, x, y, count);
  return `
    <rect width="${VB}" height="${VB}" fill="#e4d4ef"/>
    ${specs.map(s => {
      const r = s.d / 2;
      return `<circle cx="${(s.left + r).toFixed(1)}" cy="${(s.top + r).toFixed(1)}" r="${r.toFixed(1)}" fill="url(#puff${s.dark ? 'D' : 'M'})" opacity="${(0.7 * dim).toFixed(2)}"/>`;
    }).join('')}`;
}

const defs = `
<defs>
  <radialGradient id="heat" cx="50%" cy="50%" r="62%">
    <stop offset="0" stop-color="#fff3c4" stop-opacity="0.9"/>
    <stop offset="0.5" stop-color="${lava.core}" stop-opacity="0.45"/>
    <stop offset="1" stop-color="${lava.glow}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="magma" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${lava.core}"/>
    <stop offset="0.5" stop-color="${lava.crack}"/>
    <stop offset="1" stop-color="#d4460d"/>
  </linearGradient>
  <linearGradient id="slab" x1="0" y1="0" x2="0.3" y2="1">
    <stop offset="0" stop-color="${lava.rockLight}"/>
    <stop offset="1" stop-color="${lava.rock}"/>
  </linearGradient>
  <linearGradient id="shardLit" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="${ice.medium}"/>
    <stop offset="1" stop-color="${ice.light}"/>
  </linearGradient>
  <linearGradient id="shardShade" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="#007f7f"/>
    <stop offset="1" stop-color="${ice.deep}"/>
  </linearGradient>
  <linearGradient id="rime" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="${ice.medium}" stop-opacity="0.4"/>
    <stop offset="1" stop-color="${ice.light}" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="puffD" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="${toxin.deep}" stop-opacity="0.85"/>
    <stop offset="0.5" stop-color="${toxin.medium}" stop-opacity="0.45"/>
    <stop offset="1" stop-color="${toxin.light}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="puffM" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="${toxin.medium}" stop-opacity="0.85"/>
    <stop offset="0.5" stop-color="${toxin.medium}" stop-opacity="0.45"/>
    <stop offset="1" stop-color="${toxin.light}" stop-opacity="0"/>
  </radialGradient>
</defs>`;

interface Row { label: string; cells: string[]; }

const rows: Row[] = [
  { label: 'Scorched ground', cells: [0, 1, 2, 3, 4, 5].map(i => scorched(i, 3)) },
  { label: 'Frozen', cells: [0, 1, 2, 3, 4, 5].map(i => frozen(i, 2)) },
  { label: 'Ion beam (horizontal)', cells: [0, 1, 2, 3].map(i => discharge(i, 4, 90)).concat([0, 1].map(i => discharge(i, 5, 0))) },
  { label: 'Poison cloud', cells: [0, 1, 2, 3].map(i => poison(i, 6, 5, 1)).concat([0, 1].map(i => poison(i, 7, 3, 0.4))) },
];

const LABEL_W = 150;
const SCALES = [1, 3];
let body = '';
let cursorY = 24;

for (const scale of SCALES) {
  const t = TILE * scale;
  body += `<text x="12" y="${cursorY - 6}" font-family="monospace" font-size="13" fill="#1e2430">rendered at ${t}px</text>`;
  cursorY += 6;
  for (const row of rows) {
    body += `<text x="12" y="${cursorY + t / 2}" font-family="monospace" font-size="12" fill="#1e2430">${row.label}</text>`;
    row.cells.forEach((cell, i) => {
      const x = LABEL_W + i * (t + GAP);
      const clip = `clip${scale}${row.label.replace(/[^a-z]/gi, '')}${i}`;
      body += `<clipPath id="${clip}"><rect x="0" y="0" width="${VB}" height="${VB}"/></clipPath>`;
      body += `<g transform="translate(${x} ${cursorY}) scale(${t / VB})"><g clip-path="url(#${clip})">${cell}</g></g>`;
      body += `<rect x="${x}" y="${cursorY}" width="${t}" height="${t}" fill="none" stroke="#8b95a7" stroke-width="1"/>`;
    });
    cursorY += t + GAP;
  }
  cursorY += 26;
}

const W = LABEL_W + 6 * (TILE * 3 + GAP) + 20;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${cursorY}" viewBox="0 0 ${W} ${cursorY}">
<rect width="${W}" height="${cursorY}" fill="#f6f1e4"/>
${defs}
${body}
</svg>`;

console.log(svg);
