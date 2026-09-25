import { runPresentationScenarios } from './presentation';
import { runTutorialScenarios } from './tutorial';
import { Game } from '../src/game/engine';
import {
  ATOMIC_MASS, BATTERY_PAYOUT, BATTERY_TURNS, ELEMENTS, ELEMENT_ORDER, ENEMIES, EXOTHERMIC_RAM_DAMAGE,
  HUT_DISCOUNT, LIGANDS, LIGAND_ORDER, PASSIVATION_SHIELD, PHOTON_CAP, RAM_DAMAGE, healthForMass,
} from '../src/game/constants';
import { gridSizeFor } from '../src/game/grid';
import type { Direction, ElementKey, Enemy, EnemyType, HutItem, LigandId, Pos } from '../src/game/types';

const DIRS: Array<[number, number, Direction]> = [[0, -1, 'up'], [0, 1, 'down'], [-1, 0, 'left'], [1, 0, 'right']];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const same = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y;
const adjacent = (a: Pos, b: Pos) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

// =====================================================================
// Invariants
// =====================================================================

function assertInvariants(g: Game) {
  if (g.elementHealth > g.maxHealth) throw new Error('health overflow');
  if (g.photons < 0 || g.photons > 5) throw new Error('photon bounds ' + g.photons);
  if (g.dopantTraps.length > 2) throw new Error('trap cap');
  if (g.encasedCount > 2) throw new Error('encase cap');
  if (g.enemies.length > 6) throw new Error('enemy cap ' + g.enemies.length);
  if (!g.isPassable(g.playerPos.x, g.playerPos.y)) throw new Error('player on impassable tile ' + JSON.stringify(g.playerPos));
  if (g.enemyAt(g.playerPos.x, g.playerPos.y)) throw new Error('enemy sharing the player tile');
  if (g.heldSpear !== null && g.heldSpear <= 0) throw new Error('held spear with no durability');
  if (g.batteryTurnsLeft < 0 || g.batteryTurnsLeft > BATTERY_TURNS) throw new Error('battery out of range ' + g.batteryTurnsLeft);
  // Passivation's trigger is the one that can run away: a threshold test rather than an
  // edge test re-arms itself every time the shield lets health settle back on the threshold.
  if (g.passivationFiresThisGrid > 1) throw new Error('passivation fired ' + g.passivationFiresThisGrid + ' times on one grid');
  if (g.supercooledFires > 1) throw new Error('supercooled fired ' + g.supercooledFires + ' times in a run');
  if (g.passivationFiresThisGrid > 0 && g.ligand !== 'passivation') throw new Error('passivation fired without the ligand');
  if (g.supercooledFires > 0 && g.ligand !== 'supercooled') throw new Error('supercooled fired without the ligand');
  if (g.ramDamage !== RAM_DAMAGE && g.ramDamage !== EXOTHERMIC_RAM_DAMAGE) throw new Error('ram damage ' + g.ramDamage);
  if (g.ramDamage === EXOTHERMIC_RAM_DAMAGE && g.ligand !== 'exothermic') throw new Error('boosted ram without the ligand');
  for (const item of ['evolve', 'heal', 'healthCatalyst', 'damageCatalyst'] as HutItem[]) {
    const price = g.hutPrice(item);
    if (price !== null && price < 0) throw new Error('negative hut price for ' + item);
  }
  if (g.polarity.active && !g.polarity.direction) throw new Error('polarity active without a direction');
  if (g.polarity.active && (g.polarity.countdown < 1 || g.polarity.countdown > 4)) throw new Error('polarity countdown out of range ' + g.polarity.countdown);
  if (g.groundedSpear && g.groundedSpear.health <= 0) throw new Error('grounded spear with no durability');
  for (const e of g.enemies) {
    for (const t of g.enemyTiles(e)) if (!g.isPassable(t.x, t.y)) throw new Error('enemy on impassable ' + e.type + JSON.stringify(t));
    if (e.health <= 0) throw new Error('dead enemy alive');
    if (e.bonded && (e.x2 === null || e.y2 === null)) throw new Error('bonded without second tile');
    if (e.bonded && Math.abs(e.x - e.x2!) + Math.abs(e.y - e.y2!) !== 1) throw new Error('molecule not adjacent');
    if (e.tetherTurnsLeft > 0 && !g.enemyTiles(e).some(t => adjacent(t, g.playerPos))) throw new Error('tethered enemy not adjacent to player');
    if (e.tetherTurnsLeft > 0 && (e.telegraph || (e.armed && e.type !== 'fluorine'))) throw new Error('tethered enemy has an active special');
  }
  const occ = new Set<string>();
  for (const e of g.enemies) for (const t of g.enemyTiles(e)) { const k = `${t.x},${t.y}`; if (occ.has(k)) throw new Error('enemy overlap at ' + k); occ.add(k); }
}

// =====================================================================
// Deterministic scenarios: the spec's worked examples
// =====================================================================

function mkEnemy(g: Game, type: EnemyType, x: number, y: number): Enemy {
  const e: Enemy = {
    id: g.nextEnemyId++, type, x, y, x2: null, y2: null, bonded: false, bondHalves: null, bondingWith: null,
    health: ENEMIES[type].health, maxHealth: ENEMIES[type].health, frozenTurnsLeft: 0, paralyzed: false, encasedTurnsLeft: 0,
    telegraph: false, telegraphTiles: [], poisonCooldown: 1, poisonShape: 0, armed: false, explodeTiles: [], fleeTurnsLeft: 0,
    invisibleTurnsLeft: 0, vaporCooldown: 2, lastKnown: null, plannedDx: 0, plannedDy: 0, tetherTurnsLeft: 0, suppressedTurns: 0,
  };
  g.enemies.push(e);
  return e;
}
/** A fresh 5x5 plain grid with nothing on it; player at the left edge of the middle row. */
function blank(element: ElementKey, ligand: LigandId | null = null, mode: 'run' | 'tutorial' = 'run'): Game {
  const g = new Game(element, ligand, mode);
  g.enemies = []; g.photonTiles = []; g.dopantTraps = []; g.scorchedTiles = [];
  g.layout.hut = { x: 4, y: 4 }; g.layout.hatch = { x: 4, y: 0 };
  g.playerPos = { x: 0, y: 2 };
  return g;
}
function expect(cond: boolean, msg: string) { if (!cond) throw new Error('scenario failed: ' + msg); }

function runScenarios() {
  // Spear vs one Iodine (4 HP): 3 damage, survives at 1; spear flies on with 2 durability and lands at range 4.
  {
    const g = blank('carbon');
    const io = mkEnemy(g, 'iodine', 2, 2);
    g.heldSpear = 4;
    g.beginThrow(); g.previewAim('right'); g.confirmAim();
    expect(io.health === 1, 'iodine left at 1, got ' + io.health);
    expect(!!g.groundedSpear && g.groundedSpear.health === 2 && g.groundedSpear.x === 4, 'spear landed at x=4 with 2 durability: ' + JSON.stringify(g.groundedSpear));
    expect(g.usedAbilityThisTurn && !g.movedThisTurn, 'throw spent only the ability slot');
  }
  // Spear vs two Bromines (3 HP each): both die, 2 + 2 durability spent, spear destroyed.
  {
    const g = blank('carbon');
    mkEnemy(g, 'bromine', 1, 2); mkEnemy(g, 'bromine', 2, 2);
    g.heldSpear = 4;
    g.beginThrow(); g.previewAim('right'); g.confirmAim();
    expect(g.enemies.length === 0, 'both bromines dead');
    expect(g.groundedSpear === null && g.heldSpear === null, 'spear destroyed');
    expect(g.stageKills === 2, 'two kills credited');
  }
  // Ram: 2 out, 1 in, the player stays put, and an armed Fluorine is defused rather than detonating.
  {
    const g = blank('hydrogen');
    const f = mkEnemy(g, 'fluorine', 1, 2); f.armed = true; f.explodeTiles = [{ x: 0, y: 2 }, { x: 1, y: 2 }];
    const hp = g.elementHealth;
    g.movePlayer(1, 0);
    expect(g.playerPos.x === 0 && g.playerPos.y === 2, 'player stayed put');
    expect(g.enemies.length === 0, 'fluorine died to one ram');
    expect(g.elementHealth === hp - 1, 'player took exactly 1');
    expect(g.movedThisTurn && !g.usedAbilityThisTurn, 'ram spent only the move slot');
    expect(g.photons === 3, 'kill paid a photon');
  }
  // Ramming Bromine still locks abilities; two rams kill it.
  {
    const g = blank('lithium');
    const br = mkEnemy(g, 'bromine', 1, 2);
    g.movePlayer(1, 0);
    expect(br.health === 1, 'bromine at 1 after one ram');
    expect(g.abilityLockedTurns > 0, 'bromine ram locked abilities');
    g.passTurn();
    expect(g.abilityLockedTurns > 0, 'lock persists through the next turn');
    expect(!g.movedThisTurn && !g.usedAbilityThisTurn, 'flags reset at turn start');
  }
  // Beryllium with any shield rams for free and the shield is not spent.
  {
    const g = blank('beryllium');
    mkEnemy(g, 'chlorine', 1, 2);
    g.activateAbility(1);
    expect(g.shieldPoints === 2, 'shield up');
    const hp = g.elementHealth;
    g.movePlayer(1, 0);
    expect(g.elementHealth === hp && g.shieldPoints === 2, 'free ram, shield intact');
  }
  // Frozen enemies shatter on ram for no damage.
  {
    const g = blank('helium');
    const io = mkEnemy(g, 'iodine', 1, 2); io.frozenTurnsLeft = 2;
    const hp = g.elementHealth;
    g.movePlayer(1, 0);
    expect(g.enemies.length === 0 && g.elementHealth === hp, 'frozen iodine shattered for free');
  }
  // Double Dash: 3 damage on both tiles, no self damage, stop short when the far tile is still occupied.
  {
    const g = blank('hydrogen'); g.photons = 3;
    const a = mkEnemy(g, 'chlorine', 1, 2);
    const b = mkEnemy(g, 'iodine', 2, 2); b.frozenTurnsLeft = 3;
    const hp = g.elementHealth;
    g.activateAbility(3); g.previewAim('right'); g.confirmAim();
    expect(!g.enemies.includes(a), 'chlorine died to the dash');
    expect(b.health === 1, 'iodine survived at 1, got ' + b.health);
    expect(g.playerPos.x === 1 && g.playerPos.y === 2, 'stopped in the intermediate tile, at ' + JSON.stringify(g.playerPos));
    expect(g.elementHealth === hp, 'hydrogen took no damage');
    expect(g.turn === 1, 'dash spent both slots and ended the turn');
  }
  // Double Dash lands on the far tile when both targets die.
  {
    const g = blank('hydrogen'); g.photons = 3;
    mkEnemy(g, 'chlorine', 1, 2); mkEnemy(g, 'bromine', 2, 2);
    g.activateAbility(3); g.previewAim('right'); g.confirmAim();
    expect(g.playerPos.x === 2, 'landed two tiles out');
    expect(g.stageKills === 2, 'two dash kills');
  }
  // Hydrogen Bond: the tethered enemy trails into the vacated tile and cannot act.
  {
    const g = blank('hydrogen');
    const c = mkEnemy(g, 'chlorine', 1, 2);
    g.activateAbility(1); g.previewAim('right'); g.confirmAim();
    expect(c.tetherTurnsLeft === 3, 'tethered for 3');
    expect(g.photons === 1, 'tether cost 1');
    g.movePlayer(0, -1);
    expect(c.x === 0 && c.y === 2, 'dragged into the vacated tile, at ' + JSON.stringify({ x: c.x, y: c.y }));
    expect(g.playerPos.x === 0 && g.playerPos.y === 1, 'player moved');
    expect(g.turn === 1 && g.elementHealth === g.maxHealth, 'turn ended and the tethered enemy did not attack');
    expect(c.tetherTurnsLeft === 2, 'tether ticked');
  }
  // Tethering a molecule with no room fails and costs nothing.
  {
    const g = blank('hydrogen');
    const m = mkEnemy(g, 'bromine', 1, 2); m.bonded = true; m.x2 = 1; m.y2 = 1; m.health = 6; m.maxHealth = 6;
    mkEnemy(g, 'iodine', 0, 1);
    g.activateAbility(1); g.previewAim('right'); g.confirmAim();
    expect(m.tetherTurnsLeft === 0 && g.photons === 2 && !g.usedAbilityThisTurn, 'blocked molecule tether refunded');
  }
  // One move and one ability per turn, either order; aiming then cancelling keeps the slot.
  {
    const g = blank('nitrogen'); g.photons = 2;
    g.activateAbility(1); g.previewAim('right'); g.cancelAim();
    expect(!g.usedAbilityThisTurn, 'cancelled aim did not spend the slot');
    g.activateAbility(1); g.previewAim('right'); g.confirmAim();
    expect(g.usedAbilityThisTurn && g.turn === 0, 'ability spent, turn not over');
    g.activateAbility(1);
    expect(g.photons === 1, 'second ability in a turn refused');
    g.movePlayer(0, -1);
    expect(g.turn === 1 && !g.movedThisTurn && !g.usedAbilityThisTurn, 'move after ability ended the turn and reset flags');
  }
  // A trap pauses an armed Fluorine for its paralyzed turn; it detonates after recovery.
  {
    const g = blank('boron', null, 'tutorial'); // Isolate status timing from reinforcement attacks.
    g.playerPos = { x: 1, y: 2 };
    g.dopantTraps.push({ x: 2, y: 2, turnsLeft: 3 });
    const f = mkEnemy(g, 'fluorine', 3, 2); f.plannedDx = -1;
    g.passTurn();
    expect(f.x === 2 && f.paralyzed && f.armed && f.explodeTiles.length > 0, 'trapped fluorine keeps a paused fuse: ' + JSON.stringify({ x: f.x, paralyzed: f.paralyzed, armed: f.armed }));
    expect(f.health === 1, 'the trap burned it for 1, got ' + f.health);
    const hp = g.elementHealth;
    g.passTurn();
    expect(g.enemies.includes(f) && g.elementHealth === hp, 'paused fluorine did not detonate');
    g.passTurn();
    expect(!g.enemies.includes(f) && g.elementHealth === hp-2, 'recovered fuse detonated');
  }
  // A Bromine that takes a trap has its contact lock suppressed for a turn.
  {
    const g = blank('boron', null, 'tutorial'); // Isolate status timing from reinforcement attacks.
    g.playerPos = { x: 1, y: 2 };
    g.dopantTraps.push({ x: 2, y: 2, turnsLeft: 3 });
    const br = mkEnemy(g, 'bromine', 3, 2); br.plannedDx = -1;
    g.passTurn();
    expect(br.x === 2 && br.health === 2 && !br.paralyzed && br.suppressedTurns === 1, 'bromine took the trap: ' + JSON.stringify({ x: br.x, hp: br.health, s: br.suppressedTurns }));
    g.movePlayer(1, 0);
    expect(g.abilityLockedTurns === 0, 'ramming a suppressed bromine does not lock abilities');
  }
  // Carbon takes no damage from its own collapsing sheet.
  {
    const g = blank('carbon');
    g.playerPos = { x: 0, y: 2 };
    g.sheets.push({ tiles: [{ x: -1, y: 2 }], turnsLeft: 1 });
    g.playerPos = { x: -1, y: 2 };
    const hp = g.elementHealth;
    g.passTurn();
    expect(g.sheets.length === 0, 'sheet collapsed');
    expect(g.elementHealth === hp, 'carbon unhurt by its own sheet');
    expect(g.isPassable(g.playerPos.x, g.playerPos.y) && g.playerPos.x >= 0, 'carbon pushed back onto the grid');
  }
  // Lithium's Battery: three clean turn-ends pay it out, the turn it was started in included.
  {
    const g = blank('lithium');
    g.photons = 2;
    g.activateAbility(1);
    expect(g.photons === 1 && g.batteryTurnsLeft === 3, 'charged for one photon, got ' + g.batteryTurnsLeft);
    expect(g.usedAbilityThisTurn && !g.movedThisTurn, 'charging spent only the ability slot');
    g.enemies = [];
    for (const left of [2, 1]) {
      g.passTurn(); g.enemies = [];
      expect(g.batteryTurnsLeft === left && g.photons === 1, `still charging, expected ${left}, got ${g.batteryTurnsLeft}`);
    }
    g.passTurn(); g.enemies = [];
    expect(g.batteryTurnsLeft === 0 && g.photons === Math.min(PHOTON_CAP, 1 + BATTERY_PAYOUT), 'paid out on the third turn-end, got ' + g.photons);
  }
  // Charging on a turn you have already moved ends that turn, and it still gets the full window.
  {
    const g = blank('lithium');
    g.photons = 2;
    g.enemies = [];
    g.movePlayer(0, -1);
    g.activateAbility(1);
    expect(g.turn === 1, 'move then charge ended the turn');
    expect(g.batteryTurnsLeft === 2, 'that turn-end counted once, got ' + g.batteryTurnsLeft);
    g.enemies = [];
    g.passTurn(); g.enemies = [];
    g.passTurn(); g.enemies = [];
    expect(g.photons === Math.min(PHOTON_CAP, 1 + BATTERY_PAYOUT), 'paid out two turn-ends later, got ' + g.photons);
  }
  // Any health lost shorts the charge, with no refund.
  {
    const g = blank('lithium');
    g.photons = 2;
    g.activateAbility(1);
    mkEnemy(g, 'iodine', 1, 2);
    g.movePlayer(1, 0);
    expect(g.batteryTurnsLeft === 0, 'the ram shorted the charge');
    g.enemies = [];
    for (let i = 0; i < 3; i++) { g.passTurn(); g.enemies = []; }
    expect(g.photons === 1, 'a shorted cell pays nothing and refunds nothing, got ' + g.photons);
  }
  // Ion Beam runs straight across a void and paralyzes what it does not kill.
  {
    const g = blank('lithium');
    g.photons = 3;
    g.layout.passable[2][2] = false;
    const far = mkEnemy(g, 'chlorine', 3, 2);
    g.activateAbility(3); g.previewAim('right');
    expect(g.aimLine.length === 4, 'the beam reaches the far edge, got ' + g.aimLine.length);
    g.confirmAim();
    expect(far.health === 1, 'took 2 through the void, got ' + far.health);
    expect(far.paralyzed, 'and was paralyzed');
    expect(g.photons === 0, 'beam cost 3');
  }
  // The start ring lasts exactly one turn, and a grid entered through the hatch rings its own.
  {
    const g = blank('carbon');
    expect(g.showStartMarker, 'the arrival tile is ringed');
    g.enemies = [];
    g.passTurn(); g.enemies = [];
    expect(!g.showStartMarker, 'the ring is gone once the first turn ends');
    const depth = g.depth;
    g.playerPos = { x: 3, y: 0 };
    g.movePlayer(1, 0);
    expect(g.depth === depth + 1, 'took the hatch, got depth ' + g.depth);
    expect(g.showStartMarker, 'the new grid rings its own start tile');
    expect(!g.movedThisTurn, 'a new grid starts with a fresh turn');
  }
  // A turn can be passed with nothing spent at all.
  {
    const g = blank('boron');
    g.enemies = [];
    g.passTurn();
    expect(g.turn === 1, 'skipped a turn with no move and no ability');
    expect(!g.movedThisTurn && !g.usedAbilityThisTurn, 'flags reset');
  }
  // Passivation Layer fires on entering the low-health state, once per grid, and never loops.
  {
    const g = blank('carbon', 'passivation');
    g.enemies = [];
    g.elementHealth = 4;
    mkEnemy(g, 'iodine', 1, 2);
    g.movePlayer(1, 0);
    expect(g.elementHealth === 3, 'ram cost 1, got ' + g.elementHealth);
    expect(g.shieldPoints === 0, 'still above the threshold, no skin yet');
    g.movedThisTurn = false;
    g.movePlayer(1, 0);
    expect(g.elementHealth === 2, 'crossed into the low state, got ' + g.elementHealth);
    expect(g.shieldPoints === PASSIVATION_SHIELD, 'skin formed, got ' + g.shieldPoints);
    expect(g.passivationFiresThisGrid === 1, 'fired once');

    // The edge test, not the once-per-grid flag, is what stops the loop: clear the flag and it
    // still refuses to re-arm while health is already sitting at or below the threshold.
    for (let i = 0; i < 6; i++) {
      g.shieldPoints = 0;
      g.elementHealth = 2;
      g.passivationUsedThisGrid = false;
      g.enemies = [];
      mkEnemy(g, 'chlorine', g.playerPos.x + 1, g.playerPos.y);
      g.movedThisTurn = false;
      g.movePlayer(1, 0);
      expect(g.elementHealth === 1, 'the ram landed, got ' + g.elementHealth);
      expect(g.shieldPoints === 0, 'no skin while already at or below the threshold');
    }
    expect(g.passivationFiresThisGrid === 1, 'still exactly one fire, got ' + g.passivationFiresThisGrid);
  }
  // It re-arms on the next grid.
  {
    const g = blank('carbon', 'passivation');
    g.passivationUsedThisGrid = true;
    g.passivationFiresThisGrid = 1;
    g.enemies = [];
    g.playerPos = { x: 3, y: 0 };
    g.movePlayer(1, 0);
    expect(g.depth === 2, 'took the hatch');
    expect(!g.passivationUsedThisGrid && g.passivationFiresThisGrid === 0, 'the new grid re-arms it');
  }
  // A killing blow does not hand out shield.
  {
    const g = blank('hydrogen', 'passivation');
    g.enemies = [];
    g.elementHealth = 1;
    mkEnemy(g, 'iodine', 1, 2);
    g.movePlayer(1, 0);
    expect(g.gameOver && !g.won, 'the ram was lethal');
    expect(g.shieldPoints === 0, 'no skin on death, got ' + g.shieldPoints);
  }
  // Supercooled Core holds a lethal blow at 1 and freezes the neighbours, once per run.
  {
    const g = blank('carbon', 'supercooled');
    g.enemies = [];
    g.elementHealth = 1;
    const near = mkEnemy(g, 'iodine', 1, 2);
    g.movePlayer(1, 0);
    expect(!g.gameOver, 'the save kept the run alive');
    expect(g.elementHealth === 1, 'held at 1, got ' + g.elementHealth);
    expect(near.frozenTurnsLeft === 2, 'the neighbour froze, got ' + near.frozenTurnsLeft);
    expect(g.ligandFlash !== null, 'the save raised a flash card');
    expect(g.supercooledFires === 1, 'fired once');
    g.elementHealth = 1;
    g.movedThisTurn = false;
    g.enemies = [];
    mkEnemy(g, 'chlorine', g.playerPos.x + 1, g.playerPos.y);
    g.movePlayer(1, 0);
    expect(g.gameOver, 'the second lethal blow lands: one save per run');
  }
  // It deliberately cannot absorb the noble-gas timer.
  {
    const g = blank('helium', 'supercooled');
    g.enemies = [];
    g.elementHealth = 1;
    g.turnsOnGrid = g.turnLimit! + 1;
    g.passTurn();
    expect(g.gameOver, 'destabilisation still kills');
    expect(g.message.startsWith('Destabilised'), 'and for the right reason: ' + g.message);
    expect(g.supercooledFires === 0, 'the save was never spent');
  }
  // Fractional Distillation discounts a grid's first hut visit only, and never below zero.
  {
    const g = blank('lithium', 'fractional');
    g.enemies = [];
    g.photons = 5;
    expect(g.hutVisitsThisGrid === 0, 'no visit yet');
    g.playerPos = { x: g.layout.hut.x - 1, y: g.layout.hut.y };
    g.movePlayer(1, 0);
    expect(g.atHut && g.hutVisitsThisGrid === 1, 'arrived at the hut');
    expect(g.hutDiscount === HUT_DISCOUNT, 'first visit is discounted');
    expect(g.hutPrice('heal') === g.basePrice('heal')! - HUT_DISCOUNT, 'heal is cheaper');
    expect(g.hutPrice('evolve') === g.basePrice('evolve')! - HUT_DISCOUNT, 'evolution is cheaper too');
    g.leaveHut();
    g.movedThisTurn = false;
    g.movePlayer(-1, 0);
    g.movedThisTurn = false;
    g.movePlayer(1, 0);
    expect(g.hutVisitsThisGrid === 2, 'second visit counted, got ' + g.hutVisitsThisGrid);
    expect(g.hutDiscount === 0, 'and is full price');
    expect(g.hutPrice('heal') === g.basePrice('heal'), 'heal back to list price');
  }
  // Exothermic Edge only while at half health or below, and it never costs more to ram.
  {
    const g = blank('carbon', 'exothermic');
    g.enemies = [];
    expect(g.maxHealth === 8 && !g.exothermicActive, 'healthy carbon rams for 2');
    expect(g.ramDamage === RAM_DAMAGE, 'base ram damage');
    expect(g.exothermicThreshold === 3, 'an 8-health carbon hardens at 3, got ' + g.exothermicThreshold);
    g.elementHealth = 4;
    expect(!g.exothermicActive, 'one above the threshold is still a soft ram');
    g.elementHealth = 3;
    expect(g.exothermicActive && g.ramDamage === EXOTHERMIC_RAM_DAMAGE, 'at the threshold, rams harden');
    const cl = mkEnemy(g, 'chlorine', 1, 2);
    const before = g.elementHealth;
    g.movePlayer(1, 0);
    expect(!g.enemies.includes(cl), 'a 3-health chlorine dies to one ram');
    expect(g.elementHealth === before - 1, 'self damage is still 1, got ' + (before - g.elementHealth));
  }
  // Health is derived from atomic weight and never drops as you evolve.
  {
    const expected: Record<string, number> = {
      hydrogen: 4, helium: 5, lithium: 6, beryllium: 7, boron: 7, carbon: 8, nitrogen: 8, oxygen: 9, neon: 10,
    };
    let last = 0;
    for (const el of ELEMENT_ORDER) {
      const h = ELEMENTS[el].health;
      expect(h === expected[el], `${el} health ${h}, expected ${expected[el]}`);
      expect(h === healthForMass(parseFloat(ATOMIC_MASS[el])), `${el} health does not follow its mass`);
      expect(h >= last, `health fell at ${el}: ${last} -> ${h}`);
      last = h;
    }
    const g = new Game('neon');
    expect(g.maxHealth === 10 && g.elementHealth === 10, 'neon starts at 10');
  }
  // Evolving raises max health and refills it.
  {
    const g = blank('lithium');
    g.photons = 5; g.playerPos = { ...g.layout.hut }; g.elementHealth = 2;
    g.atHut = true;
    const before = g.maxHealth;
    g.buy('evolve');
    expect(g.currentElement === 'beryllium', 'evolved to beryllium');
    expect(g.maxHealth === before + 1, `max health rose ${before} -> ${g.maxHealth}`);
    expect(g.elementHealth === g.maxHealth, 'refilled on evolve');
  }
  console.log('scenarios: all passed');
}

// =====================================================================
// Random play
// =====================================================================

const stats = { runs: 0, wins: 0, deaths: 0, unfinished: 0, evolutions: 0, gridsCleared: 0, bonds: 0, maxDepth: 0, hutBuys: 0, spearThrows: 0, sheets: 0, shatters: 0, rams: 0, tethers: 0, dashes: 0 };
const deathsBy: Record<string, number> = {};
const abilityUse: Record<string, number> = {};
const killsBy: Record<string, number> = {};
const ramKillsBy: Record<string, number> = {};
const turnsAs: Record<string, number> = {};
const playedAs: Record<string, number> = {};
const scoredAs: Record<string, number> = {};
const evolvedFrom: Record<string, number> = {};
const bump = (r: Record<string, number>, k: string, n = 1) => { r[k] = (r[k] ?? 0) + n; };
let lastActionWasRam = false;
let aimTier: 1 | 3 | null = null;

/** Counts an ability only when it actually resolved (photons were spent), including after aiming. */
function trackedAbility(g: Game, tier: 1 | 3) {
  const before = g.photons;
  g.activateAbility(tier);
  if (g.aiming) aimTier = tier;
  else if (g.photons !== before) bump(abilityUse, `${g.currentElement}:${tier}`);
}
function trackedConfirm(g: Game, orientation: 'left' | 'right' = 'left') {
  const before = g.photons, el = g.currentElement, tag = g.aimingFor;
  g.confirmAim(orientation);
  if (g.photons !== before && aimTier) bump(abilityUse, `${el}:${aimTier}`);
  if (g.photons !== before && el === 'carbon' && tag === 'c_sheet') stats.sheets++;
  if (g.photons !== before && el === 'hydrogen') { if (tag === 'h_bond') stats.tethers++; else if (tag === 'h_dash') stats.dashes++; }
  if (tag === 'c_throw' && !g.aiming) stats.spearThrows++;
  aimTier = null;
}

function randomStep(g: Game) {
  lastActionWasRam = false;
  if (g.atHut) {
    const items: HutItem[] = ['evolve', 'heal', 'healthCatalyst', 'damageCatalyst'];
    const affordable = items.filter(i => g.canBuy(i));
    if (affordable.length && Math.random() < 0.8) { g.buy(pick(affordable)); stats.hutBuys++; }
    else g.leaveHut();
    return;
  }
  if (g.aiming) {
    const d = pick(DIRS);
    g.previewAim(d[2]);
    if (Math.random() < 0.85) trackedConfirm(g, Math.random() < 0.5 ? 'left' : 'right'); else { g.cancelAim(); aimTier = null; }
    return;
  }
  const options: Array<() => void> = [];
  if (!g.movedThisTurn) {
    const adj = DIRS.filter(([dx, dy]) => g.enemyAt(g.playerPos.x + dx, g.playerPos.y + dy));
    const moveOpt = () => {
      const d = adj.length && Math.random() < 0.6 ? pick(adj) : pick(DIRS);
      const target = g.enemyAt(g.playerPos.x + d[0], g.playerPos.y + d[1]);
      const before = { ...g.playerPos }, turnBefore = g.turn;
      const res = g.movePlayer(d[0], d[1]);
      if (res.needsConfirm) g.movePlayer(d[0], d[1], true);
      if (target) {
        stats.rams++;
        lastActionWasRam = true;
        // A ram never moves the player; only a turn ending afterwards (polarity, collapse) can.
        if (g.turn === turnBefore && !same(before, g.playerPos)) throw new Error('ram moved the player onto the enemy tile');
      }
    };
    options.push(moveOpt, moveOpt);
  }
  if (!g.usedAbilityThisTurn) {
    if (g.encasedCount > 0) options.push(() => { g.shatter(); stats.shatters++; });
    if (g.heldSpear !== null) options.push(() => g.beginThrow());
    const abilityOpt = () => trackedAbility(g, Math.random() < 0.6 ? 1 : 3);
    options.push(abilityOpt, abilityOpt);
  }
  if (options.length === 0 || Math.random() < 0.08) g.passTurn();
  else pick(options)();
}

// =====================================================================
// Goal-seeking play: rams when healthy, shops when evolve is affordable
// =====================================================================

/** First step of a shortest path to a goal tile. With `avoidEnemies`, enemy tiles are walls unless they are the goal. */
function bfsToward(g: Game, isGoal: (p: Pos) => boolean, avoidEnemies = false): [number, number] | null {
  const key = (p: Pos) => `${p.x},${p.y}`;
  const prev = new Map<string, string | null>();
  const queue: Pos[] = [g.playerPos];
  prev.set(key(g.playerPos), null);
  let found: Pos | null = null;
  while (queue.length && !found) {
    const p = queue.shift()!;
    for (const [dx, dy] of DIRS) {
      const n = { x: p.x + dx, y: p.y + dy };
      if (!g.isPassable(n.x, n.y) || g.isScorched(n.x, n.y) || prev.has(key(n))) continue;
      const goal = isGoal(n);
      if (!goal && avoidEnemies && g.enemyAt(n.x, n.y)) continue;
      prev.set(key(n), key(p));
      if (goal) { found = n; break; }
      queue.push(n);
    }
  }
  if (!found) return null;
  let cur = key(found), back = prev.get(cur)!;
  while (back !== null && back !== key(g.playerPos)) { cur = back; back = prev.get(cur)!; }
  const [x, y] = cur.split(',').map(Number);
  return [x - g.playerPos.x, y - g.playerPos.y];
}

/** Once an ability fails to resolve in a turn (cancelled aim, no valid target), stop retrying it that turn. */
let abilityGivenUpAt = -1;

function sensibleStep(g: Game, shopAware = false) {
  lastActionWasRam = false;
  if (g.atHut) {
    if (shopAware && g.damageBonus < 2 && g.canBuy('damageCatalyst')) { g.buy('damageCatalyst'); stats.hutBuys++; return; }
    if (shopAware && g.maxHealthBonus < 4 && g.canBuy('healthCatalyst')) { g.buy('healthCatalyst'); stats.hutBuys++; return; }
    if (g.canBuy('evolve')) { g.buy('evolve'); stats.hutBuys++; return; }
    if (g.canBuy('heal') && g.elementHealth * 2 <= g.maxHealth) { g.buy('heal'); stats.hutBuys++; return; }
    g.leaveHut(); return;
  }
  if (g.aiming) {
    let aimed = false;
    for (const d of DIRS) { g.previewAim(d[2]); if (g.aimLine.some(t => g.enemyAt(t.x, t.y))) { aimed = true; break; } }
    if (!aimed) {
      if (g.aimingFor === 'c_sheet' || g.aimingFor === 'h_bond' || g.aimingFor === 'b_encase') { g.cancelAim(); aimTier = null; abilityGivenUpAt = g.turn; return; }
      g.previewAim(pick(DIRS)[2]);
    }
    const before = g.photons, spear = g.aimingFor === 'c_throw';
    trackedConfirm(g);
    if (g.photons === before && !spear && !g.usedAbilityThisTurn) abilityGivenUpAt = g.turn;
    return;
  }
  const turnBefore = g.turn, depthBefore = g.depth;
  const acted = () => g.turn !== turnBefore || g.depth !== depthBefore;
  const healthy = g.elementHealth >= 3 || g.shieldPoints > 0;
  const adj = DIRS.filter(([dx, dy]) => g.enemyAt(g.playerPos.x + dx, g.playerPos.y + dy));
  if (!g.usedAbilityThisTurn && g.abilityLockedTurns === 0 && abilityGivenUpAt !== g.turn) {
    if (g.encasedCount > 0) { g.shatter(); stats.shatters++; return; }
    if (g.heldSpear !== null && g.enemies.length) { g.beginThrow(); return; }
    let tier: 1 | 3 | null = adj.length && g.photons >= g.abilityCost(3) ? 3 : adj.length && g.photons >= g.abilityCost(1) ? 1 : null;
    if (g.currentElement === 'carbon') tier = g.photons >= g.abilityCost(3) && g.heldSpear === null ? 3 : null;
    // Lithium's Battery wants the opposite of a brawl: charge it only with nothing adjacent.
    if (g.currentElement === 'lithium') {
      tier = adj.length && g.photons >= g.abilityCost(3) ? 3
        : !adj.length && g.batteryTurnsLeft === 0 && g.photons >= g.abilityCost(1) && g.photons < 5 ? 1
        : null;
    }
    if (tier) {
      trackedAbility(g, tier);
      if (g.usedAbilityThisTurn || g.aiming || acted()) return;
      abilityGivenUpAt = g.turn;
    }
  }
  if (!g.movedThisTurn) {
    let d: [number, number] | null = null;
    if (adj.length && healthy) d = [adj[0][0], adj[0][1]];
    else if (g.hutPrice('evolve') !== null && g.photons >= g.hutPrice('evolve')!) d = bfsToward(g, p => same(p, g.layout.hut), !healthy) ?? (healthy ? null : bfsToward(g, p => same(p, g.layout.hatch), true));
    else if (healthy && g.enemies.length) d = bfsToward(g, p => !!g.enemyAt(p.x, p.y));
    else d = bfsToward(g, p => same(p, g.layout.hatch), !healthy);
    if (d) {
      const target = g.enemyAt(g.playerPos.x + d[0], g.playerPos.y + d[1]);
      const before = { ...g.playerPos }, moveTurn = g.turn;
      const r = g.movePlayer(d[0], d[1]);
      if (r.needsConfirm) g.movePlayer(d[0], d[1], true);
      if (target) { stats.rams++; lastActionWasRam = true; if (g.turn === moveTurn && !same(before, g.playerPos)) throw new Error('ram moved the player'); }
      if (g.movedThisTurn || acted()) return;
    }
  }
  g.passTurn();
}

function runGames(policy: (g: Game) => void, runs: number, maxSteps: number) {
  for (let run = 0; run < runs; run++) {
    const start = ELEMENT_ORDER[run % ELEMENT_ORDER.length];
    const g = new Game(start);
    let lastEl = g.currentElement, lastGrids = 0;
    const seenBonds = new Set<number>();
    const killsThisGame: Record<string, number> = {};
    bump(playedAs, start);
    for (let step = 0; step < maxSteps && !g.gameOver; step++) {
      const el = g.currentElement, killsBefore = g.totalKills, turnBefore = g.turn, depthBefore = g.depth;
      const polarityBefore = g.layout.polarity;
      try {
        policy(g);
        assertInvariants(g);
        if (g.turn !== turnBefore && !g.gameOver && (g.movedThisTurn || g.usedAbilityThisTurn)) throw new Error('action flags not reset after the turn ended');
        if (g.depth !== depthBefore && (g.movedThisTurn || g.usedAbilityThisTurn)) throw new Error('action flags not reset on a new grid');
        if (g.depth !== depthBefore && polarityBefore && g.layout.polarity) throw new Error('polarity on two grids in a row');
        if (g.depth === 3 && depthBefore === 2 && !g.layout.polarity) throw new Error('first polarity grid missing');
      } catch (err) {
        console.error('FAILED run', run, 'step', step, 'element', g.currentElement, 'depth', g.depth, (err as Error).message);
        throw err;
      }
      const gained = g.totalKills - killsBefore;
      if (gained > 0) {
        bump(killsBy, el, gained);
        bump(killsThisGame, el, gained);
        if (lastActionWasRam) bump(ramKillsBy, el, gained);
      }
      if (g.turn !== turnBefore) bump(turnsAs, el);
      if (g.currentElement !== lastEl) { stats.evolutions++; bump(evolvedFrom, lastEl); bump(playedAs, g.currentElement); lastEl = g.currentElement; }
      if (g.gridsCleared !== lastGrids) { stats.gridsCleared++; lastGrids = g.gridsCleared; }
      for (const e of g.enemies) if (e.bonded && !seenBonds.has(e.id)) { seenBonds.add(e.id); stats.bonds++; }
      stats.maxDepth = Math.max(stats.maxDepth, g.depth);
    }
    for (const el of Object.keys(killsThisGame)) bump(scoredAs, el);
    stats.runs++;
    if (g.gameOver) {
      if (g.won) stats.wins++; else { stats.deaths++; bump(deathsBy, g.message); }
    } else stats.unfinished++;
  }
}

// =====================================================================
// Noble-gas probe: a hatch-seeking policy, to check the turn limit is fair
// =====================================================================

/** Hatch-seeking play through several grids of growing size, to check the turn limit is fair but not slack. */
function runNobleProbe(element: ElementKey, runs: number, grids: number) {
  const clearedAtLeast = Array(grids + 1).fill(0) as number[];
  let destabilised = 0, otherDeaths = 0;
  const turnsPerGrid: number[][] = Array.from({ length: grids }, () => []);
  for (let run = 0; run < runs; run++) {
    const g = new Game(element);
    let gridTurnStart = 0;
    for (let step = 0; step < 600 && !g.gameOver && g.gridsCleared < grids; step++) {
      const before = g.gridsCleared;
      if (g.atHut) { g.leaveHut(); continue; }
      if (g.aiming) { g.previewAim(pick(DIRS)[2]); g.confirmAim(); continue; }
      if (!g.movedThisTurn) {
        const d = bfsToward(g, p => same(p, g.layout.hatch));
        if (d) { const r = g.movePlayer(d[0], d[1]); if (r.needsConfirm) g.movePlayer(d[0], d[1], true); }
        if (g.gridsCleared > before) {
          turnsPerGrid[before].push(g.turn - gridTurnStart);
          gridTurnStart = g.turn;
          continue;
        }
      }
      if (g.movedThisTurn && !g.usedAbilityThisTurn && g.photons >= Math.min(g.abilityCost(1), g.abilityCost(3))) {
        const tier: 1 | 3 = g.photons >= g.abilityCost(3) && Math.random() < 0.3 ? 3 : 1;
        g.activateAbility(tier);
        if (g.usedAbilityThisTurn) continue;
      }
      g.passTurn();
      assertInvariants(g);
    }
    for (let k = 1; k <= grids; k++) if (g.gridsCleared >= k) clearedAtLeast[k]++;
    if (g.gameOver && g.message.startsWith('Destabilised')) destabilised++;
    else if (g.gameOver && !g.won) otherDeaths++;
  }
  const perGrid = turnsPerGrid.map((t, i) => t.length
    ? `grid ${i + 1}: ${(t.reduce((a, b) => a + b, 0) / t.length).toFixed(1)} of ${gridSizeFor(i + 1) + 3}`
    : `grid ${i + 1}: -`).join(', ');
  const reach = Array.from({ length: grids }, (_, i) => `≥${i + 1}: ${clearedAtLeast[i + 1]}`).join(', ');
  console.log(`  ${element.padEnd(7)} cleared ${reach} of ${runs}; destabilised ${destabilised}, other deaths ${otherDeaths}; avg turns used ${perGrid}`);
}

// =====================================================================
// Ligand comparison: the same goal-seeking policy, once per configuration
// =====================================================================

interface ConfigResult {
  label: string;
  wins: number;
  runs: number;
  avgKills: number;
  avgDepth: number;
  killsByElement: Record<string, number>;
  ramKills: number;
  totalKills: number;
  passivationFires: number;
  supercooledSaves: number;
  unfinished: number;
  avgEvolutions: number;
  avgCatalysts: number;
}

export function runConfig(ligand: LigandId | null, runs: number, maxSteps: number, hydrogenOnly = false, beforeRun?: (run: number) => void, shopAware = false): ConfigResult {
  let wins = 0, totalKills = 0, totalDepth = 0, passivationFires = 0, supercooledSaves = 0, ramKills = 0;
  let unfinished=0, evolutions=0, catalysts=0;
  const killsByElement: Record<string, number> = {};
  for (let run = 0; run < runs; run++) {
    beforeRun?.(run);
    const start = hydrogenOnly ? 'hydrogen' : ELEMENT_ORDER[run % ELEMENT_ORDER.length];
    const g = new Game(start, ligand);
    let banked = 0;
    aimTier = null;
    abilityGivenUpAt = -1;
    for (let step = 0; step < maxSteps && !g.gameOver; step++) {
      const el = g.currentElement, killsBefore = g.totalKills;
      // Passivation's counter is per grid and resets on arrival, so read it before the step and
      // bank it if this step turned out to be the one that changed grid.
      const firesBefore = g.passivationFiresThisGrid, depthBefore = g.depth;
      try {
        sensibleStep(g,shopAware);
        assertInvariants(g);
      } catch (err) {
        console.error('FAILED', ligand ?? 'none', 'run', run, 'step', step, (err as Error).message);
        throw err;
      }
      if (g.depth !== depthBefore) banked += firesBefore;
      const gained = g.totalKills - killsBefore;
      if (gained > 0) {
        bump(killsByElement, el, gained);
        if (lastActionWasRam) ramKills += gained;
      }
    }
    if (g.won) wins++;
    if (!g.gameOver) unfinished++;
    evolutions+=g.elementsVisited.length-1; catalysts+=g.maxHealthBonus/2+g.damageBonus;
    totalKills += g.totalKills;
    totalDepth += g.depth;
    supercooledSaves += g.supercooledFires;
    passivationFires += banked + g.passivationFiresThisGrid;
  }
  return {
    label: ligand ? LIGANDS[ligand].name : 'no ligand',
    wins, runs,
    avgKills: totalKills / runs,
    avgDepth: totalDepth / runs,
    killsByElement,
    ramKills,
    totalKills,
    passivationFires,
    supercooledSaves, unfinished, avgEvolutions:evolutions/runs, avgCatalysts:catalysts/runs,
  };
}

function reportComparison(results: ConfigResult[]) {
  console.log('\n=== ligand comparison (goal-seeking policy, ' + results[0].runs + ' games each) ===');
  console.log('  ' + 'configuration'.padEnd(24) + 'wins'.padStart(6) + 'win%'.padStart(8) + 'avg kills'.padStart(12) + 'deepest'.padStart(10) + 'ram kills'.padStart(12) + 'by ram'.padStart(9));
  for (const r of results) {
    console.log(
      '  ' + r.label.padEnd(24)
      + String(r.wins).padStart(6)
      + (100 * r.wins / r.runs).toFixed(1).padStart(7) + '%'
      + r.avgKills.toFixed(2).padStart(12)
      + r.avgDepth.toFixed(2).padStart(10)
      + String(r.ramKills).padStart(12)
      + (r.totalKills ? (100 * r.ramKills / r.totalKills).toFixed(0) : '0').padStart(8) + '%',
    );
  }
  console.log('\n  kills by element (the element that scored them):');
  console.log('  ' + 'configuration'.padEnd(24) + ELEMENT_ORDER.map(e => e.slice(0, 4).padStart(7)).join(''));
  for (const r of results) {
    console.log('  ' + r.label.padEnd(24) + ELEMENT_ORDER.map(e => String(r.killsByElement[e] ?? 0).padStart(7)).join(''));
  }
  const supercooled = results.find(r => r.label === LIGANDS.supercooled.name);
  if (supercooled) console.log(`\n  Supercooled Core saved ${supercooled.supercooledSaves} runs of ${supercooled.runs}.`);
}

function report(title: string) {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(stats));
  console.log('deaths by cause:', deathsBy);
  console.log('ability use:', abilityUse);
  console.log('per-element:');
  for (const el of ELEMENT_ORDER) {
    const played = playedAs[el] ?? 0, scored = scoredAs[el] ?? 0, turns = turnsAs[el] ?? 0, kills = killsBy[el] ?? 0;
    console.log(`  ${el.padEnd(10)} games ${String(played).padStart(3)}  with ≥1 kill ${String(scored).padStart(3)} (${played ? Math.round(100 * scored / played) : 0}%)  kills ${String(kills).padStart(4)}  by ram ${String(ramKillsBy[el] ?? 0).padStart(4)}  kills/turn ${turns ? (kills / turns).toFixed(2) : '-'}  evolved ${String(evolvedFrom[el] ?? 0).padStart(3)}`);
  }
}
function resetStats() {
  for (const k of Object.keys(stats) as Array<keyof typeof stats>) stats[k] = 0;
  for (const r of [deathsBy, abilityUse, killsBy, ramKillsBy, turnsAs, playedAs, scoredAs, evolvedFrom]) for (const k of Object.keys(r)) delete r[k];
}

// =====================================================================

declare const require: { main: unknown };
declare const module: unknown;
if (require.main === module) {
runScenarios();
runTutorialScenarios();
runPresentationScenarios();

runGames(randomStep, 600, 400);
report('random play (600 games): invariants hold');

resetStats();
runGames(sensibleStep, 600, 600);
report('goal-seeking play (600 games): kill/evolve reach');

console.log('\n=== noble-gas hatch probe (200 games each, hatch-seeking; Neon wins on its first hatch) ===');
runNobleProbe('helium', 200, 3);
runNobleProbe('neon', 200, 1);

resetStats();
reportComparison([
  runConfig(null, 600, 600),
  ...LIGAND_ORDER.map(id => runConfig(id, 600, 600)),
]);

}
