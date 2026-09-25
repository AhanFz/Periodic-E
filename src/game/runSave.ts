import { Game } from './engine';
import { ELEMENT_ORDER, LIGAND_ORDER } from './constants';
import { floodFill } from './grid';

export interface RunSave { version: 2; state: Record<string, unknown>; }
type Check = (value: unknown) => boolean;
const number: Check = v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1000000;
const count: Check = v => number(v) && Number.isInteger(v) && (v as number) >= 0;
const coordinate: Check = v => number(v) && Number.isInteger(v) && Math.abs(v as number) <= 50;
const bool: Check = v => typeof v === 'boolean';
const text: Check = v => typeof v === 'string' && v.length <= 4000;
const one = (values: readonly unknown[]): Check => v => values.includes(v);
const nullable = (check: Check): Check => v => v === null || check(v);
const list = (check: Check, max = 1000): Check => v => Array.isArray(v) && v.length <= max && v.every(check);
const object = (shape: Record<string, Check>): Check => v => !!v && typeof v === 'object' && !Array.isArray(v)
  && Object.entries(shape).every(([key, check]) => Object.hasOwn(v, key) && check((v as Record<string, unknown>)[key]));
const pos = object({ x: coordinate, y: coordinate });
const timed = object({ x: coordinate, y: coordinate, turnsLeft: count });
const direction = one(['left', 'right', 'up', 'down']);
const enemy = object({
  id: count, type: one(['fluorine', 'chlorine', 'bromine', 'iodine']), x: coordinate, y: coordinate,
  x2: nullable(coordinate), y2: nullable(coordinate), bonded: bool, bondHalves: nullable(v => Array.isArray(v) && v.length === 2 && v.every(number)),
  bondingWith: nullable(count), health: count, maxHealth: count, frozenTurnsLeft: count, paralyzed: bool,
  encasedTurnsLeft: count, telegraph: bool, telegraphTiles: list(pos), poisonCooldown: count, poisonShape: count,
  armed: bool, explodeTiles: list(pos), fleeTurnsLeft: count, invisibleTurnsLeft: count, vaporCooldown: count,
  lastKnown: nullable(pos), plannedDx: one([-1, 0, 1]), plannedDy: one([-1, 0, 1]), tetherTurnsLeft: count, suppressedTurns: count,
});
const fields: Record<string, Check> = {
  currentElement: one(ELEMENT_ORDER), depth: count, totalKills: count, gridsCleared: count,
  elementsVisited: list(one(ELEMENT_ORDER), 20), maxHealthBonus: count, damageBonus: count,
  heldSpear: nullable(count), photons: v => count(v) && (v as number) <= 5, elementHealth: number,
  gameOver: one([false]), won: one([false]), mode: one(['run']), ligand: nullable(one(LIGAND_ORDER)),
  supercooledUsedThisRun: bool, supercooledFires: count, gridSize: one([5, 6, 7]), playerPos: pos,
  turn: count, turnsOnGrid: count, stageKills: count, nextEnemyId: count, shieldPoints: count,
  poisonImmune: bool, abilityLockedTurns: count, playerPoisonTurns: count, batteryTurnsLeft: count,
  fractionalUsedThisGrid: bool,
  passivationUsedThisGrid: bool, passivationFiresThisGrid: count, hutVisitsThisGrid: count,
  movedThisTurn: bool, usedAbilityThisTurn: bool, enemyPhase: one([false]),
  layout: object({ size: one([5, 6, 7]), shape: one(['plain', 'void', 'split', 'eroded']), passable: list(list(bool, 7), 7), start: pos, hut: pos, hatch: pos, polarity: bool }),
  enemies: list(enemy, 20), telegraphTiles: list(pos), poisonZones: list(object({ x: coordinate, y: coordinate, sourceId: count })),
  scorchedTiles: list(timed), dopantTraps: list(timed), sheets: list(object({ tiles: list(pos), turnsLeft: count })),
  trails: list(timed), groundedSpear: nullable(object({ x: coordinate, y: coordinate, health: count })), photonTiles: list(pos),
  pendingWave: nullable(object({ x: coordinate, y: coordinate, roundsLeft: count })),
  polarity: object({ active: bool, direction: nullable(direction), countdown: count }),
  ligandNotes: list(text), message: text, messageType: one(['info', 'success', 'warning', 'danger']), aiming: bool,
  aimingFor: nullable(one(['h_bond', 'h_dash', 'li_beam', 'b_encase', 'c_sheet', 'c_throw', 'n_blast2'])),
  aimDirection: nullable(direction), aimLine: list(pos), atHut: bool, showStartMarker: bool,
  ligandFlash: nullable(object({ title: text, body: text })),
  history: object({
    damage: list(object({ turn: count, grid: count, source: one(['contact', 'explosion', 'poison', 'trail', 'polarity', 'collapse', 'ram', 'destabilise']), amount: count, healthBefore: number, healthAfter: number, absorbed: count, saved: bool }), 12),
    milestones: list(object({ turn: count, grid: count, kind: one(['evolution', 'purchase', 'ligand']), text }), 200),
    ligandCounts: object({ passivation: count, supercooled: count, fractional: count, exothermic: count }), omittedMilestones: count,
  }),
};
/** No storage, constructor, grid generation or RNG. Transient animations are deliberately excluded. */
export function saveRun(g: Game): RunSave {
  const all = JSON.parse(JSON.stringify(g)) as Record<string, unknown>;
  return { version: 2, state: Object.fromEntries(Object.keys(fields).map(key => [key, all[key]])) };
}
/** Version changes must migrate explicitly. Invalid snapshots are ignored, never partially applied. */
export function restoreRun(raw: unknown): Game | null {
  try {
    if (!raw || typeof raw !== 'object') return null;
    const input = raw as { version: number; state: Record<string, unknown> };
    // Legacy saves had unlimited first-visit discounts. Conservatively mark any
    // already-visited hut as spent; never grant a fresh discount on reloading.
    const envelope = input.version === 1 && input.state && typeof input.state === 'object'
      ? { version: 2, state: { ...input.state, fractionalUsedThisGrid: typeof input.state.hutVisitsThisGrid === 'number' && input.state.hutVisitsThisGrid > 0 } }
      : input;
    if (envelope.version !== 2 || !object(fields)(envelope.state)) return null;
    const state = JSON.parse(JSON.stringify(envelope.state)) as Record<string, unknown>;
    const g = Object.assign(Object.create(Game.prototype), Object.fromEntries(Object.keys(fields).map(key => [key, state[key]]))) as Game;
    g.pendingEffects = []; g.hapticCues = []; g.projecting = false; g.projectedDamage = [];
    g.projectedTurnEnd = false; g.projectedExit = false; g.onFrame = undefined;
    if (g.depth < 1 || g.elementHealth <= 0 || g.elementHealth > g.maxHealth || g.layout.size !== g.gridSize
      || g.layout.passable.length !== g.gridSize || g.layout.passable.some(row => row.length !== g.gridSize)) return null;
    g.region = floodFill(g.layout.passable, g.layout.start);
    if (!g.isPassable(g.playerPos.x, g.playerPos.y) || g.enemies.some(e => e.health <= 0 || e.health > e.maxHealth
      || (e.bonded && (e.x2 === null || e.y2 === null)) || g.enemyTiles(e).some(p => !g.isPassable(p.x, p.y)))) return null;
    if (g.enemyAt(g.playerPos.x, g.playerPos.y) || new Set(g.enemies.map(e => e.id)).size !== g.enemies.length) return null;
    if (g.aiming && !g.aimingFor) return null;
    return g;
  } catch { return null; }
}
