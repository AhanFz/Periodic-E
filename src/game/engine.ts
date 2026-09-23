import { freshHistory, type Milestone } from './history';
import {
  ENEMY_PRESSURE, BATTERY_PAYOUT, BATTERY_TURNS, CATALYST_PRICE, DASH_DAMAGE, DOPANT_TRAP_DAMAGE, ELEMENTS, ENCASE_TURNS, ENEMIES,
  EVOLUTION_CHAIN, EVOLVE_BASE_PRICE, EVOLVE_MIN_PRICE, EXOTHERMIC_HEALTH_DIVISOR, EXOTHERMIC_RAM_DAMAGE,
  HUT_DISCOUNT, ION_BEAM_DAMAGE,
  LIGANDS, PASSIVATION_SHIELD, PASSIVATION_THRESHOLD, SUPERCOOLED_FREEZE_TURNS,
  FLEE_ROUNDS, HEAL_AMOUNT, HEAL_PRICE, INITIAL_ENEMIES, MAX_DOPANT_TRAPS, MAX_ENCASED, MAX_ENEMIES,
  OZONE_FAR_DAMAGE, OZONE_NEAR_DAMAGE, PHOTON_CAP, POLARITY_CYCLE, RAM_COST, RAM_DAMAGE, SHEET_TURNS,
  SPEAR_DAMAGE, SPEAR_HEALTH, SPEAR_HIT_COST, SPEAR_RANGE, START_PHOTONS, TETHER_TURNS,
} from './constants';
import { floodFill, generateGrid } from './grid';
import type {
  AimTag, DamageSource, Direction, DopantTrap, ElementKey, Enemy, EnemyType, Fx, FxType, GridLayout, GroundedSpear,
  HapticCue, HutItem, LigandId, MessageType, MoveResult, Orientation, PendingWave, PoisonZone, Polarity, Pos, Scorched, Sheet, Trail,
} from './types';

const CARDINAL: Array<[number, number]> = [[0, -1], [0, 1], [-1, 0], [1, 0]];
const DIAG: Array<[number, number]> = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const ALL_EIGHT: Array<[number, number]> = [...CARDINAL, ...DIAG];
const STAR_TWO: Array<[number, number]> = [[0, -2], [0, 2], [-2, 0], [2, 0], [-2, -2], [2, -2], [-2, 2], [2, 2]];

const DIR_DELTA: Record<Direction, Pos> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };

const same = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y;
const clone = (p: Pos): Pos => ({ x: p.x, y: p.y });
const adjacent = (a: Pos, b: Pos) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
const randomDirection = (): Direction => (['up', 'down', 'left', 'right'] as Direction[])[Math.floor(Math.random() * 4)];

export class Game {
  history = freshHistory();
  private remember(kind: Milestone['kind'], text: string) {
    if (this.projecting) return;
    this.history.milestones.push({ turn: this.turn, grid: this.depth, kind, text });
    if (this.history.milestones.length > 200) { this.history.milestones.shift(); this.history.omittedMilestones++; }
  }
  private recordLigand(id: LigandId, text: string) {
    if (this.projecting) return;
    this.history.ligandCounts[id]++;
    this.remember('ligand', text);
  }

  /** Optional presentation observer. Never participates in rules or persistence. */
  onFrame?: (label: string) => void;
  projecting = false;
  projectedDamage: Array<{ id: number; amount: number }> = [];
  projectedTurnEnd = false;
  projectedExit = false;
  fork(): Game {
    const copy = Object.assign(Object.create(Game.prototype), JSON.parse(JSON.stringify(this, (key, value) =>
      key === 'onFrame' ? undefined : value instanceof Set ? [...value] : value)));
    copy.region = new Set(this.region);
    copy.onFrame = undefined;
    return copy;
  }

  // ---- run-scoped ----
  currentElement: ElementKey;
  depth = 1;
  totalKills = 0;
  gridsCleared = 0;
  elementsVisited: ElementKey[] = [];
  maxHealthBonus = 0;
  damageBonus = 0;
  heldSpear: number | null = null;
  photons = START_PHOTONS;
  elementHealth: number;
  gameOver = false;
  won = false;
  /** Chosen in the menu before the run and fixed for its whole duration. */
  readonly ligand: LigandId | null;
  /** Supercooled Core is once per run, so this is never reset by `enterGrid`. */
  supercooledUsedThisRun = false;
  /** Counts saves for the simulator's invariant check; it must never exceed 1. */
  supercooledFires = 0;

  // ---- grid-scoped ----
  layout!: GridLayout;
  region: Set<string> = new Set();
  gridSize = 5;
  playerPos!: Pos;
  turn = 0;
  turnsOnGrid = 0;
  stageKills = 0;
  enemies: Enemy[] = [];
  nextEnemyId = 1;
  shieldPoints = 0;
  poisonImmune = false;
  abilityLockedTurns = 0;
  playerPoisonTurns = 0;
  /** Lithium's Battery: turns of charge left. It shorts out the moment you lose health. */
  batteryTurnsLeft = 0;
  /** Passivation Layer is once per grid. */
  passivationUsedThisGrid = false;
  /** Counts triggers within the current grid; the simulator fails the run if this exceeds 1. */
  passivationFiresThisGrid = 0;
  /** Counted on arrival at the hut tile, not per purchase. Only the first visit is discounted. */
  hutVisitsThisGrid = 0;
  telegraphTiles: Pos[] = [];
  poisonZones: PoisonZone[] = [];
  scorchedTiles: Scorched[] = [];
  dopantTraps: DopantTrap[] = [];
  sheets: Sheet[] = [];
  trails: Trail[] = [];
  groundedSpear: GroundedSpear | null = null;
  photonTiles: Pos[] = [];
  pendingWave: PendingWave | null = null;
  polarity: Polarity = { active: false, direction: null, countdown: POLARITY_CYCLE };

  // ---- turn-scoped: one move and one ability per turn, either order ----
  movedThisTurn = false;
  usedAbilityThisTurn = false;
  private enemyPhase = false;

  // ---- ui-facing ----
  message = 'Reach the hut to evolve. Reach the hatch to move on.';
  messageType: MessageType = 'info';
  pendingEffects: Fx[] = [];
  /**
   * Physical feedback for what just happened, drained by the UI after every action.
   * Capped because a headless caller (the simulator) never drains it.
   */
  hapticCues: HapticCue[] = [];
  aiming = false;
  aimingFor: AimTag | null = null;
  aimDirection: Direction | null = null;
  aimLine: Pos[] = [];
  /** Set when the player lands on the hut; UI shows the shop until cleared. */
  atHut = false;
  /**
   * A moment too important to lose in the message line. The UI shows it as a card and clears it.
   * Only Supercooled Core raises one, once per run.
   */
  ligandFlash: { title: string; body: string } | null = null;
  /**
   * True only while the player is on the first turn of a grid, including a grid just entered
   * through the hatch. The board rings the tile they arrived on, then stops.
   */
  showStartMarker = true;

  constructor(element: ElementKey = 'hydrogen', ligand: LigandId | null = null, readonly mode: 'run' | 'tutorial' = 'run') {
    this.currentElement = element;
    this.ligand = ligand;
    this.elementsVisited.push(element);
    this.elementHealth = this.maxHealth;
    this.enterGrid();
  }

  private hasLigand(id: LigandId) { return this.ligand === id; }

  get elementData() { return ELEMENTS[this.currentElement]; }
  get maxHealth() { return ELEMENTS[this.currentElement].health + this.maxHealthBonus; }
  get isNoble() { return ELEMENTS[this.currentElement].noble; }
  get turnLimit() { return this.mode === 'run' && this.isNoble ? this.gridSize + 3 : null; }
  get turnsLeft() { return this.turnLimit === null ? null : this.turnLimit - this.turnsOnGrid; }
  get destabilised() { return this.turnLimit !== null && this.turnsOnGrid > this.turnLimit; }
  get evolvePrice() {
    if (!EVOLUTION_CHAIN[this.currentElement]) return null;
    if (this.isNoble) return EVOLVE_BASE_PRICE[this.currentElement];
    return Math.max(EVOLVE_MIN_PRICE, EVOLVE_BASE_PRICE[this.currentElement] - this.stageKills);
  }
  get encasedCount() { return this.enemies.filter(e => e.encasedTurnsLeft > 0).length; }

  /** The health at or below which Exothermic Edge hardens your rams. Moves with max health. */
  get exothermicThreshold() { return Math.ceil(this.maxHealth / EXOTHERMIC_HEALTH_DIVISOR); }
  /** Exothermic Edge: live only while badly hurt, so catalysts move the threshold with you. */
  get exothermicActive() {
    return this.hasLigand('exothermic') && this.elementHealth <= this.exothermicThreshold;
  }
  /** Base ram damage before the damage catalyst. */
  get ramDamage() { return this.exothermicActive ? EXOTHERMIC_RAM_DAMAGE : RAM_DAMAGE; }
  /** Fractional Distillation: 1 off everything, but only across a grid's first hut visit. */
  get hutDiscount() { return this.hasLigand('fractional') && this.hutVisitsThisGrid <= 1 ? HUT_DISCOUNT : 0; }
  /** Supercooled Core: still holding its one save. */
  get supercooledReady() { return this.hasLigand('supercooled') && !this.supercooledUsedThisRun; }
  /** Passivation Layer: still holding this grid's trigger. */
  get passivationReady() { return this.hasLigand('passivation') && !this.passivationUsedThisGrid; }

  /** Photon price of a tier for the current element. Both tiers are per-element data. */
  abilityCost(tier: 1 | 3) { return tier === 1 ? this.elementData.ability1Cost : this.elementData.ability2Cost; }
  private spendPhotons(tier: 1 | 3) { this.photons -= this.abilityCost(tier); }
  private cue(c: HapticCue) { if (this.hapticCues.length < 16) this.hapticCues.push(c); }

  // =====================================================================
  // Grid lifecycle
  // =====================================================================

  private enterGrid() {
    this.layout = generateGrid(this.depth, this.layout?.polarity ?? false);
    this.gridSize = this.layout.size;
    this.region = floodFill(this.layout.passable, this.layout.start);
    this.playerPos = clone(this.layout.start);
    this.turnsOnGrid = 0;
    this.stageKills = 0;
    this.enemies = [];
    this.shieldPoints = 0;
    this.poisonImmune = false;
    this.abilityLockedTurns = 0;
    this.playerPoisonTurns = 0;
    this.batteryTurnsLeft = 0;
    this.passivationUsedThisGrid = false;
    this.passivationFiresThisGrid = 0;
    this.hutVisitsThisGrid = 0;
    this.telegraphTiles = [];
    this.poisonZones = [];
    this.scorchedTiles = [];
    this.dopantTraps = [];
    this.sheets = [];
    this.trails = [];
    this.groundedSpear = null;
    this.photonTiles = [];
    this.pendingWave = null;
    this.polarity = { active: this.layout.polarity, direction: this.layout.polarity ? randomDirection() : null, countdown: POLARITY_CYCLE };
    this.movedThisTurn = false;
    this.usedAbilityThisTurn = false;
    this.clearAim();
    this.atHut = false;
    this.showStartMarker = true;

    for (let i = 0; i < ENEMY_PRESSURE[this.currentElement].initial; i++) this.spawnEnemy();
    const p = this.randomFreeTile(2);
    if (p) this.photonTiles.push(p);
  }

  private takeHatch() {
    if (this.projecting) { this.projectedExit = true; return; }
    if (this.mode === 'tutorial') {
      this.gameOver = true;
      this.won = false;
      this.setMessage('Practice hatch reached. Tutorial complete!', 'success');
      return;
    }
    this.gridsCleared++;
    if (this.currentElement === 'neon') {
      this.gameOver = true;
      this.won = true;
      this.cue('win');
      this.setMessage(`Full clear! Escaped as Neon after ${this.gridsCleared} grids and ${this.totalKills} kills.`, 'success');
      return;
    }
    this.depth++;
    this.enterGrid();
    this.setMessage(`Grid ${this.depth}: ${this.layout.shape}${this.polarity.active ? ', polarity active' : ''}. You are on the ringed tile; the hut and hatch are somewhere on the board.`, 'info');
  }

  // =====================================================================
  // Spatial helpers
  // =====================================================================

  inBounds(x: number, y: number) { return x >= 0 && y >= 0 && x < this.gridSize && y < this.gridSize; }
  hasSheet(x: number, y: number) { return this.sheets.some(s => s.tiles.some(t => t.x === x && t.y === y)); }
  isVoid(x: number, y: number) { return this.inBounds(x, y) && !this.layout.passable[y][x]; }
  /** A tile the game considers real ground: on-grid non-void, or covered by a sheet. */
  isPassable(x: number, y: number) { return this.hasSheet(x, y) || (this.inBounds(x, y) && this.layout.passable[y][x]); }
  isScorched(x: number, y: number) { return this.scorchedTiles.some(s => s.x === x && s.y === y); }
  enemyAt(x: number, y: number) { return this.enemies.find(e => (e.x === x && e.y === y) || (e.bonded && e.x2 === x && e.y2 === y)); }
  enemyTiles(e: Enemy): Pos[] { return e.bonded && e.x2 !== null && e.y2 !== null ? [{ x: e.x, y: e.y }, { x: e.x2, y: e.y2 }] : [{ x: e.x, y: e.y }]; }

  /** Can the player step here? */
  private playerCanEnter(x: number, y: number) {
    if (!this.isPassable(x, y)) return false;
    if (this.isScorched(x, y) && this.currentElement !== 'nitrogen') return false;
    return true;
  }
  /** Can an enemy step here (ignoring the player, who is a valid attack target)? */
  private enemyCanEnter(x: number, y: number, self: Enemy) {
    if (!this.isPassable(x, y) || this.isScorched(x, y)) return false;
    const other = this.enemyAt(x, y);
    if (other && other !== self) return false;
    return true;
  }

  private randomFreeTile(minDistFromPlayer = 0): Pos | null {
    const cands: Pos[] = [];
    for (let y = 0; y < this.gridSize; y++) for (let x = 0; x < this.gridSize; x++) {
      if (!this.layout.passable[y][x] || !this.region.has(`${x},${y}`)) continue;
      const p = { x, y };
      if (same(p, this.playerPos) || same(p, this.layout.hut) || same(p, this.layout.hatch)) continue;
      if (this.enemyAt(x, y) || this.isScorched(x, y)) continue;
      if (this.photonTiles.some(t => same(t, p)) || this.dopantTraps.some(t => same(t, p))) continue;
      if (this.groundedSpear && same(this.groundedSpear, p)) continue;
      if (Math.abs(x - this.playerPos.x) + Math.abs(y - this.playerPos.y) < minDistFromPlayer) continue;
      cands.push(p);
    }
    return cands.length ? cands[Math.floor(Math.random() * cands.length)] : null;
  }

  getRingTiles(cx: number, cy: number, dist: number): Pos[] {
    const out: Pos[] = [];
    for (let dx = -dist; dx <= dist; dx++) for (let dy = -dist; dy <= dist; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== dist) continue;
      if (this.isPassable(cx + dx, cy + dy)) out.push({ x: cx + dx, y: cy + dy });
    }
    return out;
  }

  addFx(type: FxType, x: number, y: number, angle?: number) { this.pendingEffects.push({ type, x, y, angle }); }
  /**
   * A ligand fires inside `damagePlayer`, which callers follow with their own `setMessage`.
   * Queueing the line and appending it on the next message write is what stops the caller from
   * silently overwriting the explanation for something the player just watched happen.
   */
  private ligandNotes: string[] = [];
  private raiseLigandNote(text: string) { this.ligandNotes.push(text); }
  private flushLigandNotes() {
    if (!this.ligandNotes.length) return;
    for (const n of this.ligandNotes) this.message += ` | ${n}`;
    this.ligandNotes = [];
  }
  private setMessage(text: string, type: MessageType) { this.message = text; this.messageType = type; this.flushLigandNotes(); }
  private note(text: string) { this.message += ` | ${text}`; this.flushLigandNotes(); }

  // =====================================================================
  // Damage & death
  // =====================================================================

  /**
   * The single choke point for every point of damage the player takes. Ligands that react to being
   * hurt are handled here and nowhere else, so there is one place where the ordering is decided:
   * shields absorb, then health falls, then a save can intervene, then Passivation reads the
   * transition. Passivation is applied after the blow lands, so it can never stop the blow itself.
   */
  private damagePlayer(amount: number, source: DamageSource) {
    const healthBefore = this.elementHealth;
    const shieldBefore = this.shieldPoints, savesBefore = this.supercooledFires;
    let remaining = amount;
    if (this.shieldPoints > 0) {
      const absorbed = Math.min(this.shieldPoints, remaining);
      this.shieldPoints -= absorbed;
      remaining -= absorbed;
      if (this.shieldPoints === 0) this.poisonImmune = false;
    }
    if (remaining > 0) {
      this.elementHealth -= remaining;
      this.cue('damage');
      if (this.batteryTurnsLeft > 0) { this.batteryTurnsLeft = 0; this.note('🔋 The charge shorted out'); }
    } else if (amount > 0) this.cue('shielded');

    if (this.elementHealth <= 0) this.trySupercooledSave(source);
    this.tryPassivation(healthBefore);
    if (!this.projecting) {
      this.history.damage.push({ turn: this.turn, grid: this.depth, source, amount, healthBefore,
        healthAfter: this.elementHealth, absorbed: Math.min(shieldBefore, amount), saved: this.supercooledFires > savesBefore });
      if (this.history.damage.length > 12) this.history.damage.shift();
    }
    this.onFrame?.(`Damage · ${source}${this.elementHealth < healthBefore ? ` −${healthBefore - this.elementHealth} HP` : " · absorbed"}`);
  }

  /**
   * Supercooled Core. Deliberately blind to `destabilise`: letting it absorb the noble-gas timer
   * would turn a hard deadline into a speed bump you can simply walk through.
   */
  private trySupercooledSave(source: DamageSource) {
    if (!this.supercooledReady || source === 'destabilise') return;
    this.supercooledUsedThisRun = true;
    this.supercooledFires++;
    this.recordLigand('supercooled', 'Supercooled Core prevented a killing blow and froze adjacent enemies.');
    this.elementHealth = 1;
    let frozen = 0;
    for (const e of this.enemies) {
      if (e.encasedTurnsLeft > 0) continue;
      const near = ALL_EIGHT.some(([dx, dy]) => this.enemyTiles(e).some(t => t.x === this.playerPos.x + dx && t.y === this.playerPos.y + dy));
      if (!near) continue;
      this.freezeEnemy(e, SUPERCOOLED_FREEZE_TURNS);
      for (const t of this.enemyTiles(e)) this.addFx('frost', t.x, t.y);
      frozen++;
    }
    this.addFx('shatter', this.playerPos.x, this.playerPos.y);
    this.cue('evolve');
    this.raiseLigandNote(`❄️ ${LIGANDS.supercooled.name} held you at 1 health`);
    this.ligandFlash = {
      title: '❄️ Supercooled Core',
      body: frozen > 0
        ? `That blow should have finished you. The core flash-froze instead: you hold at 1 health and ${frozen} neighbour${frozen === 1 ? '' : 's'} ${frozen === 1 ? 'is' : 'are'} frozen solid for ${SUPERCOOLED_FREEZE_TURNS} turns. Walk into a frozen body to shatter it for free. This was your one save of the run.`
        : `That blow should have finished you. The core flash-froze instead and you hold at 1 health. This was your one save of the run.`,
    };
  }

  /**
   * Passivation Layer. It fires on *entering* the low-health state, never while already sitting in
   * it: a threshold test alone would re-arm every time the shield absorbed a hit and let health
   * settle back at 2, which is an unkillable loop rather than a ligand.
   */
  private tryPassivation(healthBefore: number) {
    if (!this.passivationReady) return;
    if (this.elementHealth <= 0) return;
    if (healthBefore <= PASSIVATION_THRESHOLD || this.elementHealth > PASSIVATION_THRESHOLD) return;
    this.passivationUsedThisGrid = true;
    this.passivationFiresThisGrid++;
    this.recordLigand('passivation', 'Passivation Layer granted 2 shield after entering low health.');
    this.shieldPoints += PASSIVATION_SHIELD;
    this.addFx('shield', this.playerPos.x, this.playerPos.y);
    this.cue('shielded');
    this.raiseLigandNote(`🛡️ ${LIGANDS.passivation.name} formed: +${PASSIVATION_SHIELD} shield (${this.shieldPoints})`);
  }
  private die(reason: string) {
    if (this.elementHealth > 0) return;
    this.gameOver = true;
    this.won = false;
    this.cue('death');
    this.setMessage(reason, 'danger');
  }
  private shieldSuffix() { return this.shieldPoints > 0 ? ` 🛡️${this.shieldPoints}` : ''; }

  /** Bromine's lock lasts through the end of the next player turn, whichever phase applied it. */
  private lockAbilities() {
    this.abilityLockedTurns = Math.max(this.abilityLockedTurns, this.enemyPhase ? 1 : 2);
  }

  private gainPhotons(n: number) { this.photons = Math.min(PHOTON_CAP, this.photons + n); }

  /** Remove an enemy and pay out. Molecules pay double. */
  private killEnemy(e: Enemy, credited = true) {
    this.enemies = this.enemies.filter(x => x !== e);
    this.cue('kill');
    if (!credited) return;
    const mult = e.bonded ? 2 : 1;
    this.stageKills += mult;
    this.totalKills += mult;
    this.gainPhotons(mult);
  }
  private damageEnemy(e: Enemy, amount: number): boolean {
    if (this.projecting) this.projectedDamage.push({ id: e.id, amount });
    e.health -= amount;
    if (e.health <= 0) { this.killEnemy(e); this.onFrame?.(e.invisibleTurnsLeft > 0 ? "Impact" : `${ENEMIES[e.type].symbol} destroyed`); return true; }
    this.cue('hit');
    this.onFrame?.(e.invisibleTurnsLeft > 0 ? "Impact" : `${ENEMIES[e.type].symbol} −${amount} HP`);
    return false;
  }
  private dmg(base: number) { return base + this.damageBonus; }

  // =====================================================================
  // Turn plumbing
  // =====================================================================

  /** The turn ends on its own once both the move and the ability slot are spent. */
  private finishPlayerAction() {
    if (this.gameOver) return;
    if (this.movedThisTurn && this.usedAbilityThisTurn) this.endTurn();
  }
  private spendAbilitySlot() {
    this.usedAbilityThisTurn = true;
    this.finishPlayerAction();
  }

  /** Returns true if the player left the grid via the hatch. */
  private checkStructures(): boolean {
    if (same(this.playerPos, this.layout.hatch)) { this.takeHatch(); return true; }
    this.atHut = same(this.playerPos, this.layout.hut);
    if (this.atHut) {
      this.hutVisitsThisGrid++;
      const price = this.hutPrice('evolve');
      this.setMessage(
        `⚗️ Isotope hut. Evolve costs ${price ?? '—'} photons.${this.hutDiscount > 0 ? ` ${LIGANDS.fractional.name} takes ${this.hutDiscount} off everything this visit.` : ''}`,
        'info',
      );
    }
    return false;
  }

  passTurn() {
    if (this.gameOver || this.aiming) return;
    this.pendingEffects = [];
    this.endTurn();
  }

  private endTurn() {
    if (this.projecting) { this.projectedTurnEnd = true; return; }
    this.onFrame?.("Player action resolved");
    if (this.abilityLockedTurns > 0) this.abilityLockedTurns--;
    this.turn++;
    this.turnsOnGrid++;
    this.showStartMarker = false;
    this.enemyPhase = true;
    this.onFrame?.("Enemy response");
    this.tickPolarity();
    if (!this.gameOver) this.moveEnemies();
    this.onFrame?.("Status effects");
    if (!this.gameOver) this.tickPlayerStatus();
    if (!this.gameOver && this.mode === 'run') this.spawnPressure();
    if (!this.gameOver) this.tickBattery();
    this.enemyPhase = false;
    this.movedThisTurn = false;
    this.usedAbilityThisTurn = false;
  }

  private tickPlayerStatus() {
    if (this.destabilised) {
      this.damagePlayer(1, 'destabilise');
      this.note(`⚠️ Unstable! Turn limit exceeded (-1). Health ${this.elementHealth}`);
      this.die('Destabilised — the noble gas ran out of time.');
    }
  }

  /** Runs last in the turn: by now anything that could have shorted the charge has resolved. */
  private tickBattery() {
    if (this.batteryTurnsLeft <= 0) return;
    this.batteryTurnsLeft--;
    if (this.batteryTurnsLeft > 0) return;
    this.gainPhotons(BATTERY_PAYOUT);
    this.addFx('photon', this.playerPos.x, this.playerPos.y);
    this.cue('photon');
    this.note(`🔋 Battery discharged: +${BATTERY_PAYOUT} photons (${this.photons}/${PHOTON_CAP})`);
  }

  private spawnPressure() {
    const { floor, interval } = ENEMY_PRESSURE[this.currentElement];
    if (this.enemies.length < floor || this.turn % interval === 0) {
      if (this.spawnEnemy()) this.note('🆕 A halogen arrived');
    }
    if (this.turn % 4 === 0 && this.photonTiles.length < 2) {
      const p = this.randomFreeTile(1);
      if (p) { this.photonTiles.push(p); this.note('🔆 A photon appeared'); }
    }
  }

  // =====================================================================
  // Player: movement & ramming
  // =====================================================================

  movePlayer(dx: number, dy: number, force = false): MoveResult {
    if (this.gameOver || this.aiming) return { needsConfirm: false };
    if (this.movedThisTurn) { this.cue('blocked'); this.setMessage('👣 Already moved this turn. Use an ability or end the turn.', 'warning'); return { needsConfirm: false }; }
    const nx = this.playerPos.x + dx, ny = this.playerPos.y + dy;
    if (!this.isPassable(nx, ny)) return { needsConfirm: false };
    const target = this.enemyAt(nx, ny);
    if (!target && !this.playerCanEnter(nx, ny)) {
      this.cue('blocked');
      this.setMessage('🔥 Scorched ground blocks your path.', 'warning');
      return { needsConfirm: false };
    }
    if (target && target.type === 'iodine' && target.invisibleTurnsLeft > 0 && !force) return { needsConfirm: true };

    this.pendingEffects = [];
    this.atHut = false;
    this.movedThisTurn = true;
    if (target) {
      this.ram(target, { x: nx, y: ny });
      this.finishPlayerAction();
      return { needsConfirm: false };
    }
    const from = clone(this.playerPos);
    this.playerPos = { x: nx, y: ny };
    this.dragTethered(from);
    this.onPlayerArrive();
    if (this.gameOver || this.checkStructures()) return { needsConfirm: false };
    this.finishPlayerAction();
    return { needsConfirm: false };
  }

  /** Walking into an enemy: fixed damage both ways, and the player stays where they were. */
  private ram(e: Enemy, at: Pos) {
    const sym = ENEMIES[e.type].symbol + (e.bonded ? '₂' : '');
    if (e.frozenTurnsLeft > 0) {
      for (const t of this.enemyTiles(e)) this.addFx('shatter', t.x, t.y);
      this.killEnemy(e);
      this.setMessage(`💥 Shattered frozen ${sym}!`, 'success');
      return;
    }
    const paralyzed = e.paralyzed;
    const free = paralyzed || (this.currentElement === 'beryllium' && this.shieldPoints > 0);
    this.cue('ram');
    this.addFx('crush', at.x, at.y);
    this.onFrame?.('Ram impact');
    if (!free) this.damagePlayer(RAM_COST, 'ram');
    if (e.type === 'fluorine') { e.armed = false; e.explodeTiles = []; }
    const locks = e.type === 'bromine' && e.suppressedTurns <= 0;
    if (locks) this.lockAbilities();
    if (this.exothermicActive) this.recordLigand('exothermic', 'Exothermic Edge added 1 ram damage.');
    const died = this.damageEnemy(e, this.dmg(this.ramDamage));

    let msg = paralyzed ? `💢 Rammed paralyzed ${sym} — no self-damage.` : free ? `🛡️ Rammed ${sym} — the shield took it.` : `💢 Rammed ${sym} (-${RAM_COST}).`;
    if (died) msg += ` ${sym} destroyed!`;
    else msg += ` It has ${e.health} left.`;
    if (locks) msg += ' Its corrosion locks your abilities next turn.';
    msg += ` Health ${this.elementHealth}${this.shieldSuffix()}`;
    this.setMessage(msg, died ? 'success' : 'warning');
    this.die(`Rammed ${sym} and lost.`);
  }

  /** Everything that happens on landing on a tile, by any means. */
  private onPlayerArrive() {
    const p = this.playerPos;
    const pi = this.photonTiles.findIndex(t => same(t, p));
    if (pi !== -1) { this.photonTiles.splice(pi, 1); this.gainPhotons(1); this.addFx('photon', p.x, p.y); this.cue('photon'); this.setMessage(`🔆 Photon absorbed (${this.photons}/${PHOTON_CAP})`, 'success'); }
    if (this.groundedSpear && same(this.groundedSpear, p)) {
      this.heldSpear = this.groundedSpear.health;
      this.groundedSpear = null;
      this.setMessage(`💠 Picked up the spear (${this.heldSpear} durability).`, 'success');
    }
    const trail = this.trails.find(t => same(t, p));
    if (trail) {
      this.damagePlayer(1, 'trail');
      this.lockAbilities();
      this.setMessage(`🧪 Corrosive trail! -1, abilities locked. Health ${this.elementHealth}`, 'danger');
      this.die('Dissolved by bromine residue.');
      if (this.gameOver) return;
    }
    this.checkTethers();
  }

  // ---- tethers ----

  /** Where a tethered enemy lands when the player leaves `from`; null if it cannot follow as a unit. */
  private tetherDestinations(e: Enemy, from: Pos, playerNow: Pos | null): Pos[] | null {
    const tiles = this.enemyTiles(e);
    const lead = tiles.find(t => adjacent(t, from));
    if (!lead) return null;
    const shift = { x: from.x - lead.x, y: from.y - lead.y };
    const dests = tiles.map(t => ({ x: t.x + shift.x, y: t.y + shift.y }));
    for (const d of dests) {
      if (!this.enemyCanEnter(d.x, d.y, e)) return null;
      if (playerNow && same(d, playerNow)) return null;
    }
    return dests;
  }

  private dragTethered(from: Pos) {
    for (const e of this.enemies) {
      if (e.tetherTurnsLeft <= 0) continue;
      const dests = this.tetherDestinations(e, from, this.playerPos);
      if (!dests) { e.tetherTurnsLeft = 0; this.note(`🪢 The bond to ${ENEMIES[e.type].symbol} snapped`); continue; }
      e.x = dests[0].x; e.y = dests[0].y;
      if (e.bonded) { e.x2 = dests[1].x; e.y2 = dests[1].y; }
      for (const t of dests) this.addFx('tether', t.x, t.y);
    }
  }

  /** A tether only holds while the enemy is cardinally adjacent; anything that separates them breaks it. */
  private checkTethers() {
    for (const e of this.enemies) {
      if (e.tetherTurnsLeft <= 0) continue;
      if (!this.enemyTiles(e).some(t => adjacent(t, this.playerPos))) { e.tetherTurnsLeft = 0; this.note(`🪢 The bond to ${ENEMIES[e.type].symbol} snapped`); }
    }
  }

  // =====================================================================
  // Player: abilities
  // =====================================================================

  activateAbility(tier: 1 | 3) {
    if (this.gameOver || this.aiming) return;
    if (this.usedAbilityThisTurn) { this.cue('blocked'); this.setMessage('🔆 Ability already used this turn. Move or end the turn.', 'warning'); return; }
    if (this.photons < this.abilityCost(tier)) { this.cue('blocked'); return; }
    if (this.abilityLockedTurns > 0) { this.cue('blocked'); this.setMessage('🔒 Abilities locked this turn.', 'warning'); return; }
    this.pendingEffects = [];
    this.atHut = false;

    switch (this.currentElement) {
      case 'hydrogen': if (tier === 1) this.beginAim('h_bond', 'Choose an adjacent enemy to tether.'); else this.beginAim('h_dash', 'Choose a direction to dash.'); break;
      case 'helium': this.heliumFreeze(tier); break;
      case 'lithium': if (tier === 1) this.lithiumBattery(); else this.beginAim('li_beam', 'Choose a direction to fire. The beam crosses voids.'); break;
      case 'beryllium': this.berylliumShield(tier); break;
      case 'boron': if (tier === 1) this.boronTrap(); else this.beginAim('b_encase', 'Choose an adjacent enemy to encase.'); break;
      case 'carbon': if (tier === 1) this.beginAim('c_sheet', 'Choose an edge or void to bridge.'); else this.carbonForgeSpear(); break;
      case 'nitrogen': if (tier === 1) this.beginAim('n_blast2', 'Choose a direction to blast.'); else this.nitrogenBlast4(); break;
      case 'oxygen': if (tier === 1) this.oxygenHeal(); else this.ozoneLayer(); break;
      case 'neon': if (tier === 1) this.blindingFlash(); else this.allOutFlash(); break;
    }
  }

  /** Contextual free actions: no photons, but they use the ability slot. */
  shatter() {
    if (this.gameOver || this.aiming || this.encasedCount === 0) return;
    if (this.usedAbilityThisTurn) { this.setMessage('🔆 Ability already used this turn.', 'warning'); return; }
    this.pendingEffects = [];
    let kills = 0;
    for (const e of [...this.enemies]) {
      if (e.encasedTurnsLeft <= 0) continue;
      const tiles = this.enemyTiles(e);
      for (const t of tiles) this.addFx('shatter', t.x, t.y);
      this.killEnemy(e);
      kills++;
      for (const t of tiles) for (const [dx, dy] of CARDINAL) {
        const o = this.enemyAt(t.x + dx, t.y + dy);
        if (o && o.encasedTurnsLeft <= 0) { this.addFx('shatter', t.x + dx, t.y + dy); this.damageEnemy(o, this.dmg(1)); }
      }
    }
    this.setMessage(`🪟 Shattered ${kills} encasement${kills === 1 ? '' : 's'}! Glass shards cut nearby halogens.`, 'success');
    this.spendAbilitySlot();
  }

  beginThrow() {
    if (this.gameOver || this.aiming || this.heldSpear === null) return;
    if (this.usedAbilityThisTurn) { this.setMessage('🔆 Ability already used this turn.', 'warning'); return; }
    this.beginAim('c_throw', 'Choose a direction to throw the spear.');
  }

  private beginAim(tag: AimTag, msg: string) {
    this.aiming = true; this.aimingFor = tag; this.aimDirection = null; this.aimLine = [];
    this.setMessage(msg, 'info');
  }
  private clearAim() { this.aiming = false; this.aimingFor = null; this.aimDirection = null; this.aimLine = []; }
  cancelAim() { this.clearAim(); this.setMessage('Cancelled.', 'info'); }

  previewAim(direction: Direction) {
    if (!this.aiming || !this.aimingFor) return;
    this.aimDirection = direction;
    const d = DIR_DELTA[direction];
    const p = this.playerPos;
    switch (this.aimingFor) {
      case 'li_beam':
        this.aimLine = this.lineAcross(p, d); break;
      case 'c_throw':
        this.aimLine = this.lineFrom(p, d).slice(0, SPEAR_RANGE); break;
      case 'h_dash': case 'n_blast2':
        this.aimLine = this.lineFrom(p, d).slice(0, 2); break;
      case 'b_encase': case 'h_bond':
        this.aimLine = this.isPassable(p.x + d.x, p.y + d.y) ? [{ x: p.x + d.x, y: p.y + d.y }] : []; break;
      case 'c_sheet': {
        const out = { x: p.x + d.x, y: p.y + d.y };
        this.aimLine = this.isPassable(out.x, out.y) || this.sheetTooFar(out) ? [] : [out];
        break;
      }
    }
  }
  private sheetTooFar(p: Pos) { return p.x < -1 || p.y < -1 || p.x > this.gridSize || p.y > this.gridSize; }
  private lineFrom(from: Pos, d: Pos): Pos[] {
    const out: Pos[] = [];
    let x = from.x + d.x, y = from.y + d.y;
    while (this.isPassable(x, y)) { out.push({ x, y }); x += d.x; y += d.y; }
    return out;
  }
  /** Like `lineFrom`, but a void never stops it: it runs to the far edge of the grid. */
  private lineAcross(from: Pos, d: Pos): Pos[] {
    const out: Pos[] = [];
    let x = from.x + d.x, y = from.y + d.y;
    while (this.inBounds(x, y) || this.hasSheet(x, y)) { out.push({ x, y }); x += d.x; y += d.y; }
    return out;
  }

  /** Aiming spends the ability slot only here, on a successful resolution — cancelling costs nothing. */
  confirmAim(orientation: Orientation = 'left') {
    if (!this.aiming || !this.aimDirection || this.aimLine.length === 0) return;
    switch (this.aimingFor) {
      case 'h_bond': this.doTether(); break;
      case 'h_dash': this.doDash(); break;
      case 'li_beam': this.doBeam(); break;
      case 'b_encase': this.doEncase(); break;
      case 'c_sheet': this.doSheet(orientation); break;
      case 'c_throw': this.doThrow(); break;
      case 'n_blast2': this.doBlast2(); break;
    }
  }

  // ---- Hydrogen ----
  private doTether() {
    const t = this.aimLine[0];
    this.clearAim();
    const e = this.enemyAt(t.x, t.y);
    if (!e) { this.setMessage('🪢 No enemy there.', 'warning'); return; }
    if (e.encasedTurnsLeft > 0) { this.setMessage('🪢 It is sealed in glass — nothing to bond to.', 'warning'); return; }
    if (e.tetherTurnsLeft > 0) { this.setMessage('🪢 Already tethered.', 'warning'); return; }
    if (e.bonded && !this.tetherDestinations(e, this.playerPos, null)) {
      this.setMessage('🪢 The molecule has no room to be dragged. Photon refunded.', 'warning');
      return;
    }
    this.pendingEffects = [];
    this.spendPhotons(1);
    e.tetherTurnsLeft = TETHER_TURNS;
    e.armed = false; e.explodeTiles = [];
    e.telegraph = false; e.telegraphTiles = [];
    e.bondingWith = null;
    e.plannedDx = 0; e.plannedDy = 0;
    this.refreshTelegraphs();
    for (const p of this.enemyTiles(e)) this.addFx('tether', p.x, p.y);
    this.setMessage(`🪢 ${ENEMIES[e.type].symbol}${e.bonded ? '₂' : ''} tethered for ${TETHER_TURNS} turns. It follows you and cannot act.`, 'success');
    this.spendAbilitySlot();
  }

  private doDash() {
    const line = this.aimLine;
    this.clearAim();
    this.pendingEffects = [];
    this.spendPhotons(3);
    let hits = 0, kills = 0;
    const seen = new Set<number>();
    for (const t of line) {
      this.addFx('gust', t.x, t.y);
      const e = this.enemyAt(t.x, t.y);
      if (!e || seen.has(e.id)) continue;
      seen.add(e.id);
      hits++;
      this.addFx('explosion', t.x, t.y);
      if (this.damageEnemy(e, this.dmg(DASH_DAMAGE))) kills++;
    }
    // Land on the furthest tile that is clear once the damage has resolved.
    let landing: Pos | null = null;
    for (let i = line.length - 1; i >= 0; i--) {
      const t = line[i];
      if (this.playerCanEnter(t.x, t.y) && !this.enemyAt(t.x, t.y)) { landing = t; break; }
    }
    this.movedThisTurn = true;
    this.usedAbilityThisTurn = true;
    if (landing) {
      this.playerPos = clone(landing);
      this.onPlayerArrive();
      if (this.gameOver) return;
    } else this.checkTethers();
    let msg = `💨 Double dash! ${hits} hit, ${kills} destroyed.`;
    if (!landing) msg += ' Nothing gave way — you spring back to where you started.';
    else if (line.length === 2 && same(landing, line[0])) msg += ' A survivor blocks the far tile; you stop short.';
    this.setMessage(msg, kills ? 'success' : 'info');
    if (landing && this.checkStructures()) return;
    this.finishPlayerAction();
  }

  // ---- Helium ----
  private freezeEnemy(e: Enemy, turns: number) {
    e.frozenTurnsLeft = Math.max(e.frozenTurnsLeft, turns);
    // Freeze cancels a prepared attack; thawed enemies must telegraph again.
    e.armed = false; e.explodeTiles = [];
    e.telegraph = false; e.telegraphTiles = [];
    if (e.type === 'chlorine') e.poisonCooldown = Math.max(1, e.poisonCooldown);
    this.refreshTelegraphs();
  }
  private heliumFreeze(tier: 1 | 3) {
    const deltas = tier === 1 ? CARDINAL : ALL_EIGHT;
    const targets = this.enemies.filter(e => deltas.some(([dx, dy]) => this.enemyTiles(e).some(t => t.x === this.playerPos.x + dx && t.y === this.playerPos.y + dy)));
    if (!targets.length) { this.setMessage(`❄️ Nothing in the ${tier === 1 ? 4 : 8} tiles around you.`, 'warning'); return; }
    this.spendPhotons(tier);
    for (const e of targets) { this.freezeEnemy(e, tier === 1 ? 2 : 3); for (const t of this.enemyTiles(e)) this.addFx('frost', t.x, t.y); }
    this.setMessage(`❄️ Froze ${targets.length} target${targets.length === 1 ? '' : 's'}. Walk into a frozen body to shatter it.`, 'success');
    this.spendAbilitySlot();
  }

  // ---- Beryllium ----
  private berylliumShield(tier: 1 | 3) {
    this.spendPhotons(tier);
    this.shieldPoints = tier === 1 ? 2 : 3;
    this.poisonImmune = tier === 3;
    this.addFx('shield', this.playerPos.x, this.playerPos.y);
    this.setMessage(tier === 1 ? '🛡️ Shield +2. Ramming is free while it holds.' : '🛡️ Inert shield +3. Free ramming, and poison cannot touch you.', 'success');
    this.spendAbilitySlot();
  }

  // ---- Lithium ----
  /** A cell that pays out only if you keep clear of damage while it charges. */
  private lithiumBattery() {
    if (this.batteryTurnsLeft > 0) { this.cue('blocked'); this.setMessage('🔋 A cell is already charging.', 'warning'); return; }
    if (this.photons >= PHOTON_CAP) { this.cue('blocked'); this.setMessage('🔋 Photon store is full — nowhere to put the charge.', 'warning'); return; }
    this.spendPhotons(1);
    this.batteryTurnsLeft = BATTERY_TURNS;
    this.addFx('shock', this.playerPos.x, this.playerPos.y);
    this.setMessage(`🔋 Charging for ${BATTERY_TURNS} turns. Take no damage and it pays ${BATTERY_PAYOUT} photons. Any hit shorts it.`, 'success');
    this.spendAbilitySlot();
  }

  /** Crosses voids and off-grid gaps: everything in the direction takes damage and loses its turn. */
  private doBeam() {
    const line = this.aimLine;
    // Captured before the aim is cleared: the discharge is drawn along the line it travelled.
    const along = this.aimDirection === 'left' || this.aimDirection === 'right' ? 90 : 0;
    this.clearAim();
    this.pendingEffects = [];
    this.spendPhotons(3);
    let killed = 0, paralyzed = 0, resisted = 0;
    const seen = new Set<number>();
    for (const t of line) this.addFx('shock', t.x, t.y, along);
    this.onFrame?.('Ion beam');
    for (const t of line) {
      const e = this.enemyAt(t.x, t.y);
      if (!e || seen.has(e.id)) continue;
      seen.add(e.id);
      // Bromine conducts poorly: it takes a single point and keeps its turn.
      if (e.type === 'bromine') { resisted++; if (this.damageEnemy(e, 1)) killed++; continue; }
      if (this.damageEnemy(e, this.dmg(ION_BEAM_DAMAGE))) { this.addFx('explosion', t.x, t.y); killed++; }
      else { e.paralyzed = true; paralyzed++; }
    }
    let msg = '⚡ Ion beam.';
    if (killed) msg += ` ${killed} destroyed.`;
    if (paralyzed) msg += ` ${paralyzed} paralyzed.`;
    if (resisted) msg += ' Bromine resisted (1 dmg).';
    if (!killed && !paralyzed && !resisted) msg += ' It lit up the whole line and hit nothing.';
    this.setMessage(msg, killed || paralyzed ? 'success' : 'info');
    this.spendAbilitySlot();
  }

  // ---- Boron ----
  private boronTrap() {
    if (this.dopantTraps.length >= MAX_DOPANT_TRAPS) { this.setMessage(`⚡ Max ${MAX_DOPANT_TRAPS} traps already placed.`, 'warning'); return; }
    if (this.dopantTraps.some(t => same(t, this.playerPos))) { this.setMessage('⚡ A trap is already here.', 'warning'); return; }
    this.spendPhotons(1);
    this.dopantTraps.push({ x: this.playerPos.x, y: this.playerPos.y, turnsLeft: 3 });
    this.addFx('shock', this.playerPos.x, this.playerPos.y);
    this.setMessage('⚡ Dopant trap set under your feet. Step off and let them chase.', 'success');
    this.spendAbilitySlot();
  }
  private doEncase() {
    const t = this.aimLine[0];
    this.clearAim();
    const e = this.enemyAt(t.x, t.y);
    if (!e) { this.setMessage('🪟 No enemy there.', 'warning'); return; }
    if (e.bonded) { this.setMessage('🪟 A molecule is too large to encase.', 'warning'); return; }
    if (e.encasedTurnsLeft > 0) { this.setMessage('🪟 Already encased.', 'warning'); return; }
    if (this.encasedCount >= MAX_ENCASED) { this.setMessage(`🪟 Only ${MAX_ENCASED} can be encased at once.`, 'warning'); return; }
    this.pendingEffects = [];
    this.spendPhotons(3);
    e.encasedTurnsLeft = ENCASE_TURNS;
    e.armed = false; e.telegraph = false; e.bondingWith = null; e.tetherTurnsLeft = 0;
    this.addFx('encase', t.x, t.y);
    this.setMessage(`🪟 ${ENEMIES[e.type].symbol} encased. Shatter when ready — it bursts on its own in ${ENCASE_TURNS} turns.`, 'success');
    this.spendAbilitySlot();
  }

  // ---- Carbon ----
  private doSheet(orientation: Orientation) {
    const out = this.aimLine[0], dir = this.aimDirection!;
    this.clearAim();
    const d = DIR_DELTA[dir];
    const s = orientation === 'left' ? { x: d.y, y: -d.x } : { x: -d.y, y: d.x };
    const tiles: Pos[] = [out, { x: out.x + s.x, y: out.y + s.y }, { x: out.x + s.x - d.x, y: out.y + s.y - d.y }];
    const valid = tiles.filter(t => !this.isPassable(t.x, t.y) && !this.sheetTooFar(t));
    if (valid.length === 0) { this.setMessage('🕸️ Nowhere to build there.', 'warning'); return; }
    this.pendingEffects = [];
    this.spendPhotons(1);
    this.sheets.push({ tiles: valid, turnsLeft: SHEET_TURNS });
    for (const t of valid) this.addFx('bond', t.x, t.y);
    this.setMessage(`🕸️ Graphene sheet laid (${valid.length} tiles). Collapses in ${SHEET_TURNS} turns.`, 'success');
    this.spendAbilitySlot();
  }
  private carbonForgeSpear() {
    if (this.heldSpear !== null) { this.setMessage('💠 You already hold a spear. Throw it first.', 'warning'); return; }
    this.spendPhotons(3);
    this.heldSpear = SPEAR_HEALTH;
    this.addFx('spear', this.playerPos.x, this.playerPos.y);
    this.setMessage('💠 Diamond spear forged. Throwing is free.', 'success');
    this.spendAbilitySlot();
  }
  /**
   * Physical piercing: 3 damage per enemy, 2 durability per hit regardless of the enemy's health,
   * range 4. Bromine's resistance does not apply. One Iodine (4 HP) is left at 1 and the spear
   * flies on with 2 durability; two Bromines (3 HP each) both die and the spear is spent.
   */
  private doThrow() {
    const line = this.aimLine;
    this.clearAim();
    if (this.heldSpear === null) return;
    this.pendingEffects = [];
    let hp = this.heldSpear;
    this.heldSpear = null;
    let last: Pos | null = null, hits = 0, kills = 0;
    const seen = new Set<number>();
    for (const t of line) {
      last = t;
      this.addFx('spear', t.x, t.y);
      const e = this.enemyAt(t.x, t.y);
      if (!e || seen.has(e.id)) continue;
      seen.add(e.id);
      hits++;
      if (this.damageEnemy(e, this.dmg(SPEAR_DAMAGE))) kills++;
      hp -= SPEAR_HIT_COST;
      if (hp <= 0) { last = null; break; }
    }
    if (last) this.groundedSpear = { x: last.x, y: last.y, health: hp };
    const where = last ? ` It landed with ${hp} durability — go pick it up.` : ' It shattered.';
    this.setMessage(`💠 Spear thrown. ${hits} hit, ${kills} killed.${where}`, hits ? 'success' : 'info');
    this.spendAbilitySlot();
  }

  // ---- Nitrogen ----
  private blastTile(x: number, y: number) {
    this.addFx('explosion', x, y);
    if (!this.isScorched(x, y)) this.scorchedTiles.push({ x, y, turnsLeft: 2 });
    const e = this.enemyAt(x, y);
    return e ? this.damageEnemy(e, this.dmg(3)) : false;
  }
  private doBlast2() {
    const line = this.aimLine;
    this.clearAim();
    this.pendingEffects = [];
    this.spendPhotons(1);
    let kills = 0;
    const seen = new Set<number>();
    for (const t of line) { const e = this.enemyAt(t.x, t.y); if (e && seen.has(e.id)) { this.addFx('explosion', t.x, t.y); continue; } if (e) seen.add(e.id); if (this.blastTile(t.x, t.y)) kills++; }
    this.setMessage(`💥 Blast. ${kills ? kills + ' destroyed.' : 'Tiles scorched.'}`, kills ? 'success' : 'info');
    this.spendAbilitySlot();
  }
  private nitrogenBlast4() {
    this.pendingEffects = [];
    this.spendPhotons(3);
    let kills = 0;
    const seen = new Set<number>();
    for (const [dx, dy] of CARDINAL) {
      const x = this.playerPos.x + dx, y = this.playerPos.y + dy;
      if (!this.isPassable(x, y)) continue;
      const e = this.enemyAt(x, y);
      if (e && seen.has(e.id)) { this.addFx('explosion', x, y); continue; }
      if (e) seen.add(e.id);
      if (this.blastTile(x, y)) kills++;
    }
    this.setMessage(`💥 Blast 4. ${kills ? kills + ' destroyed.' : 'Ground scorched around you.'}`, kills ? 'success' : 'info');
    this.spendAbilitySlot();
  }

  // ---- Oxygen ----
  private oxygenHeal() {
    if (this.elementHealth >= this.maxHealth) { this.setMessage('💧 Already at full health.', 'info'); return; }
    this.spendPhotons(1);
    this.elementHealth = Math.min(this.maxHealth, this.elementHealth + 1);
    this.addFx('heal', this.playerPos.x, this.playerPos.y);
    this.setMessage(`💚 Healed. Health ${this.elementHealth}/${this.maxHealth}`, 'success');
    this.spendAbilitySlot();
  }
  private ozoneLayer() {
    this.pendingEffects = [];
    this.spendPhotons(3);
    const { x: cx, y: cy } = this.playerPos;
    let kills = 0;
    const seen = new Set<number>();
    for (const t of this.getRingTiles(cx, cy, 1)) {
      this.addFx('ozone', t.x, t.y);
      const e = this.enemyAt(t.x, t.y);
      if (e && !seen.has(e.id)) { seen.add(e.id); if (this.damageEnemy(e, this.dmg(OZONE_NEAR_DAMAGE))) kills++; }
    }
    this.pendingWave = { x: cx, y: cy, roundsLeft: 1 };
    this.setMessage(`🌊 Ozone wave. ${kills ? kills + ' destroyed.' : ''} A second wave hits two tiles out next round.`, kills ? 'success' : 'info');
    this.spendAbilitySlot();
  }

  // ---- Neon ----
  private blindingFlash() {
    const around = () => this.enemies.filter(e => ALL_EIGHT.some(([dx, dy]) => this.enemyTiles(e).some(t => t.x === this.playerPos.x + dx && t.y === this.playerPos.y + dy)));
    const targets = around();
    if (!targets.length) { this.setMessage('✨ No enemy adjacent to blind.', 'warning'); return; }
    this.spendPhotons(1);
    for (const e of targets) if (e.bonded) this.breakBond(e);
    const again = around();
    for (const e of again) { e.fleeTurnsLeft = FLEE_ROUNDS; this.planMove(e); for (const t of this.enemyTiles(e)) this.addFx('flash', t.x, t.y); }
    this.setMessage(`✨ Flash! ${again.length} flee for ${FLEE_ROUNDS} rounds.`, 'success');
    this.spendAbilitySlot();
  }
  private allOutFlash() {
    if (!this.enemies.length) { this.setMessage('✨ Nothing on the grid to freeze.', 'info'); return; }
    this.pendingEffects = [];
    this.spendPhotons(3);
    let kills = 0;
    for (const e of [...this.enemies]) {
      for (const t of this.enemyTiles(e)) this.addFx('frost', t.x, t.y);
      if (this.damageEnemy(e, this.dmg(1))) { kills++; continue; }
      this.freezeEnemy(e, 1);
    }
    this.setMessage(`✨ All-out flash! Every halogen took 1 and is frozen for a round.${kills ? ` ${kills} destroyed.` : ''}`, 'success');
    this.spendAbilitySlot();
  }

  // =====================================================================
  // Hut
  // =====================================================================

  /** The price the player actually pays, discount included. Never negative. */
  hutPrice(item: HutItem): number | null {
    const base = this.basePrice(item);
    if (base === null) return null;
    return Math.max(0, base - this.hutDiscount);
  }
  /** The list price, before any ligand. The UI strikes this through when it differs. */
  basePrice(item: HutItem): number | null {
    if (item === 'evolve') return this.evolvePrice;
    if (item === 'heal') return HEAL_PRICE;
    return CATALYST_PRICE;
  }
  canBuy(item: HutItem) {
    const price = this.hutPrice(item);
    if (price === null || this.photons < price) return false;
    if (item === 'heal' && this.elementHealth >= this.maxHealth) return false;
    return true;
  }
  buy(item: HutItem) {
    if (!this.atHut || !this.canBuy(item)) return;
    const price = this.hutPrice(item)!;
    const names: Record<HutItem, string> = { evolve: 'Evolution', heal: 'Healing', healthCatalyst: 'Health catalyst', damageCatalyst: 'Damage catalyst' };
    this.remember('purchase', `${names[item]}: ${price} photon${price === 1 ? '' : 's'}.`);
    if (this.hutDiscount > 0) this.recordLigand('fractional', `Fractional Distillation saved 1 photon on ${names[item].toLowerCase()}.`);
    this.photons -= price;
    this.pendingEffects = [];
    if (item !== 'evolve') this.cue('buy');
    switch (item) {
      case 'evolve': this.evolve(); break;
      case 'heal':
        this.elementHealth = Math.min(this.maxHealth, this.elementHealth + HEAL_AMOUNT);
        this.addFx('heal', this.playerPos.x, this.playerPos.y);
        this.setMessage(`💚 Healed. Health ${this.elementHealth}/${this.maxHealth}`, 'success');
        break;
      case 'healthCatalyst':
        this.maxHealthBonus += 2;
        this.elementHealth = Math.min(this.maxHealth, this.elementHealth + 2);
        this.addFx('heal', this.playerPos.x, this.playerPos.y);
        this.setMessage(`🧬 Health catalyst: max health is now ${this.maxHealth}.`, 'success');
        break;
      case 'damageCatalyst':
        this.damageBonus += 1;
        this.addFx('shock', this.playerPos.x, this.playerPos.y);
        this.setMessage(`🧬 Damage catalyst: abilities and rams deal +${this.damageBonus}.`, 'success');
        break;
    }
  }
  leaveHut() { this.atHut = false; }

  private evolve() {
    const next = EVOLUTION_CHAIN[this.currentElement];
    if (!next) return;
    const gained = ELEMENTS[next].health - ELEMENTS[this.currentElement].health;
    this.remember('evolution', `${ELEMENTS[this.currentElement].symbol} → ${ELEMENTS[next].symbol}; health restored to ${ELEMENTS[next].health + this.maxHealthBonus}.`);
    this.currentElement = next;
    this.elementsVisited.push(next);
    this.cue('evolve');
    this.elementHealth = this.maxHealth;
    this.photons = Math.max(this.photons, START_PHOTONS);
    this.stageKills = 0;
    this.turnsOnGrid = 0;
    this.shieldPoints = 0;
    this.poisonImmune = false;
    this.abilityLockedTurns = 0;
    this.batteryTurnsLeft = 0;
    this.pendingWave = null;
    this.addFx('evolve', this.playerPos.x, this.playerPos.y);
    this.setMessage(
      `🌟 Evolved into ${ELEMENTS[next].symbol}! Full health${gained > 0 ? `, +${gained} max from the heavier nucleus` : ''} (${this.maxHealth}).`
      + `${this.isNoble ? ` Turn limit: ${this.turnLimit}.` : ''}`,
      'success',
    );
  }

  // =====================================================================
  // Polarity
  // =====================================================================

  /** The direction is known for the whole countdown; the shift lands when it reaches 0. */
  private tickPolarity() {
    if (!this.polarity.active || !this.polarity.direction) return;
    this.polarity.countdown--;
    if (this.polarity.countdown === 1) {
      this.note(`🧲 Polarity shifts ${this.polarity.direction} at the end of next turn`);
      return;
    }
    if (this.polarity.countdown <= 0) {
      const dir = this.polarity.direction;
      this.polarity.direction = randomDirection();
      this.polarity.countdown = POLARITY_CYCLE;
      const d = DIR_DELTA[dir];
      const nx = this.playerPos.x + d.x, ny = this.playerPos.y + d.y;
      if (this.playerCanEnter(nx, ny) && !this.enemyAt(nx, ny)) {
        this.playerPos = { x: nx, y: ny };
        this.addFx('gust', nx, ny);
        this.onPlayerArrive();
      } else {
        this.damagePlayer(1, 'polarity');
        this.addFx('crush', this.playerPos.x, this.playerPos.y);
        this.note(`💢 Crushed against the edge (-1). Health ${this.elementHealth}`);
        this.die('Crushed by the polarity shift.');
      }
      if (this.gameOver) return;
      const od = DIR_DELTA[OPPOSITE[dir]];
      for (const e of [...this.enemies]) {
        if (e.encasedTurnsLeft > 0) continue;
        const dest = this.enemyTiles(e).map(t => ({ x: t.x + od.x, y: t.y + od.y }));
        const ok = dest.every(t => this.enemyCanEnter(t.x, t.y, e) && !same(t, this.playerPos));
        if (ok) {
          e.x = dest[0].x; e.y = dest[0].y;
          if (e.bonded) { e.x2 = dest[1].x; e.y2 = dest[1].y; }
          for (const t of dest) this.addFx('gust', t.x, t.y);
        } else {
          for (const t of this.enemyTiles(e)) this.addFx('crush', t.x, t.y);
          this.damageEnemy(e, 1);
        }
      }
      this.note('🧲 Polarity shifted!');
      this.checkTethers();
      this.resolveTrapsAndSheets();
    }
  }

  // =====================================================================
  // Enemies
  // =====================================================================

  private spawnEnemy(): boolean {
    const population = this.enemies.reduce((sum, e) => sum + (e.bonded ? 2 : 1), 0);
    if (population >= ENEMY_PRESSURE[this.currentElement].cap) return false;
    const p = this.randomFreeTile(2);
    if (!p) return false;
    const types: EnemyType[] = ['fluorine', 'chlorine', 'bromine', 'iodine'];
    const type = types[Math.floor(Math.random() * types.length)];
    const e: Enemy = {
      id: this.nextEnemyId++, type, x: p.x, y: p.y, x2: null, y2: null,
      bonded: false, bondHalves: null, bondingWith: null,
      health: ENEMIES[type].health, maxHealth: ENEMIES[type].health,
      frozenTurnsLeft: 0, paralyzed: false, encasedTurnsLeft: 0,
      telegraph: false, telegraphTiles: [], poisonCooldown: 1, poisonShape: 0,
      armed: false, explodeTiles: [], fleeTurnsLeft: 0,
      invisibleTurnsLeft: 0, vaporCooldown: 2, lastKnown: null,
      plannedDx: 0, plannedDy: 0, tetherTurnsLeft: 0, suppressedTurns: 0,
    };
    this.planMove(e);
    this.enemies.push(e);
    return true;
  }

  private planMove(e: Enemy) {
    if (this.projecting) return; // Future direction is deliberately not predicted.
    const [dx, dy] = e.tetherTurnsLeft > 0 ? [0, 0] : this.decideMoveDelta(e);
    e.plannedDx = dx; e.plannedDy = dy;
  }

  private decideMoveDelta(e: Enemy): [number, number] {
    let dx = Math.sign(this.playerPos.x - e.x), dy = Math.sign(this.playerPos.y - e.y);
    if (e.fleeTurnsLeft > 0) { dx = -dx; dy = -dy; }
    if (e.type === 'chlorine' && !e.telegraph && e.poisonCooldown <= 0) return [0, 0];
    if (dx === 0 && dy === 0) return [0, 0];
    const preferX = dx !== 0 && (dy === 0 || Math.random() > 0.3);
    const first: [number, number] = preferX ? [dx, 0] : [0, dy];
    const second: [number, number] = preferX ? [0, dy] : [dx, 0];
    if (this.canStep(e, first)) return first;
    if (second[0] !== 0 || second[1] !== 0) if (this.canStep(e, second)) return second;
    return [0, 0];
  }
  private canStep(e: Enemy, [dx, dy]: [number, number]) {
    return this.enemyTiles(e).every(t => {
      const nx = t.x + dx, ny = t.y + dy;
      if (same({ x: nx, y: ny }, this.playerPos)) {
        // attacking the player is allowed, but never by stacking on another enemy already there
        const other = this.enemyAt(nx, ny);
        return !other || other === e;
      }
      return this.enemyCanEnter(nx, ny, e);
    });
  }

  /** A step that would land on the player is an attack from where the enemy stands; it never enters the tile. */
  private resolveMove(e: Enemy) {
    const dx = e.plannedDx, dy = e.plannedDy;
    if (dx === 0 && dy === 0) { this.planMove(e); return; }
    if (!this.canStep(e, [dx, dy])) { this.planMove(e); return; }
    if (this.enemyTiles(e).some(t => same({ x: t.x + dx, y: t.y + dy }, this.playerPos))) {
      this.contactAttack(e);
      this.planMove(e);
      return;
    }
    const before = this.enemyTiles(e);
    e.x += dx; e.y += dy;
    if (e.bonded && e.x2 !== null && e.y2 !== null) { e.x2 += dx; e.y2 += dy; }
    if (e.type === 'bromine' && e.bonded) for (const t of before) if (!this.trails.some(tr => same(tr, t))) this.trails.push({ x: t.x, y: t.y, turnsLeft: 2 });
    if (e.fleeTurnsLeft > 0) e.fleeTurnsLeft--;
    this.planMove(e);
  }

  /** Enemy-initiated contact: normal contact damage, and the enemy takes no ram damage. */
  private contactAttack(e: Enemy) {
    const sym = ENEMIES[e.type].symbol + (e.bonded ? '₂' : '');
    const p = this.playerPos;
    if (e.type === 'bromine') {
      this.addFx('corrode', p.x, p.y);
      this.damagePlayer(1, 'contact');
      const locks = e.suppressedTurns <= 0;
      if (locks) this.lockAbilities();
      this.setMessage(`🧪 ${sym} corroded you (-1).${locks ? ' Abilities locked next turn.' : ' Its corrosion is dulled.'} Health ${this.elementHealth}${this.shieldSuffix()}`, 'danger');
      this.die('Dissolved by Bromine.');
      return;
    }
    if (e.type === 'iodine') {
      this.addFx('vapor', p.x, p.y);
      this.damagePlayer(1, 'contact');
      const died = this.damageEnemy(e, 1);
      this.setMessage(`💜 ${sym} contact: -1 each.${died ? ' It dissipated.' : ''} Health ${this.elementHealth}${this.shieldSuffix()}`, 'danger');
      this.die('Iodine got you.');
      return;
    }
    this.addFx('crush', p.x, p.y);
    this.damagePlayer(1, 'contact');
    this.setMessage(`💥 Hit by ${sym} (-1). Health ${this.elementHealth}${this.shieldSuffix()}`, 'danger');
    this.die('You were defeated.');
  }

  private moveEnemies() {
    // delayed effects
    if (this.pendingWave) {
      if (this.pendingWave.roundsLeft > 0) this.pendingWave.roundsLeft--;
      else {
        const seen = new Set<number>();
        for (const [dx, dy] of STAR_TWO) {
          const x = this.pendingWave.x + dx, y = this.pendingWave.y + dy;
          if (!this.isPassable(x, y)) continue;
          this.addFx('ozone', x, y);
          const e = this.enemyAt(x, y);
          if (e && !seen.has(e.id)) { seen.add(e.id); this.damageEnemy(e, this.dmg(OZONE_FAR_DAMAGE)); }
        }
        this.note('🌊 The ozone star rippled outward');
        this.pendingWave = null;
      }
    }

    // detonations
    for (const e of this.enemies.filter(x => x.type === 'fluorine' && x.armed && x.frozenTurnsLeft <= 0)) {
      if (!e.armed || e.frozenTurnsLeft > 0) continue; // An earlier blast may have triggered Supercooled Core.
      for (const t of e.explodeTiles) this.addFx('explosion', t.x, t.y);
      if (e.explodeTiles.some(t => same(t, this.playerPos))) {
        this.damagePlayer(2, 'explosion');
        this.setMessage(`💥 Fluorine detonated (-2). Health ${this.elementHealth}${this.shieldSuffix()}`, 'danger');
        this.die('Caught in the blast.');
      }
      this.killEnemy(e, false);
    }
    if (this.gameOver) return;

    // fuse bonds that were telegraphed last turn
    this.fuseBonds();

    // age tile states
    this.poisonZones = [];
    this.telegraphTiles = [];
    this.scorchedTiles.forEach(s => s.turnsLeft--); this.scorchedTiles = this.scorchedTiles.filter(s => s.turnsLeft > 0);
    this.trails.forEach(t => t.turnsLeft--); this.trails = this.trails.filter(t => t.turnsLeft > 0);
    this.dopantTraps.forEach(t => t.turnsLeft--); this.dopantTraps = this.dopantTraps.filter(t => t.turnsLeft > 0);

    // act
    for (const e of [...this.enemies]) {
      if (!this.enemies.includes(e)) continue;
      if (e.encasedTurnsLeft > 0) {
        e.encasedTurnsLeft--;
        if (e.encasedTurnsLeft <= 0) { this.addFx('shatter', e.x, e.y); this.killEnemy(e); this.note(`🪟 An encasement burst on its own — ${ENEMIES[e.type].symbol} destroyed`); }
        continue;
      }
      if (e.tetherTurnsLeft > 0) {
        e.tetherTurnsLeft--;
        if (e.frozenTurnsLeft > 0) e.frozenTurnsLeft--;
        if (e.tetherTurnsLeft <= 0) this.note(`🪢 The bond to ${ENEMIES[e.type].symbol} released`);
        continue;
      }
      if (e.frozenTurnsLeft > 0) { e.frozenTurnsLeft--; continue; }
      if (e.paralyzed) { e.paralyzed = false; continue; }
      if (this.gameOver) return;

      if (e.type === 'chlorine') this.actChlorine(e);
      else if (e.type === 'fluorine') this.actFluorine(e);
      else if (e.type === 'iodine') this.actIodine(e);
      else this.resolveMove(e);
      if (e.invisibleTurnsLeft <= 0) this.onFrame?.(`${ENEMIES[e.type].symbol} response`);
      if (this.gameOver) return;
    }
    for (const e of this.enemies) if (e.suppressedTurns > 0) e.suppressedTurns--;

    this.sheets.forEach(s => s.turnsLeft--);
    this.resolveTrapsAndSheets();
    if (this.gameOver) return;
    this.applyPoison();
    if (this.gameOver) return;
    this.telegraphBonds();
    this.checkTethers();
  }

  private actChlorine(e: Enemy) {
    if (e.telegraph) {
      for (const t of e.telegraphTiles) { this.poisonZones.push({ x: t.x, y: t.y, sourceId: e.id }); this.addFx('smoke', t.x, t.y); }
      e.telegraph = false; e.telegraphTiles = [];
      e.poisonCooldown = 3;
      e.poisonShape = (e.poisonShape + 1) % 3;
      this.resolveMove(e);
    } else if (e.poisonCooldown > 0) {
      e.poisonCooldown--;
      this.resolveMove(e);
    } else {
      e.telegraph = true;
      e.telegraphTiles = this.chlorineShape(e);
      this.telegraphTiles.push(...e.telegraphTiles);
      e.plannedDx = 0; e.plannedDy = 0;
    }
  }
  private chlorineShape(e: Enemy): Pos[] {
    let deltas: Array<[number, number]>;
    if (e.bonded) deltas = ALL_EIGHT;
    else if (e.poisonShape === 0) deltas = DIAG;
    else if (e.poisonShape === 1) deltas = CARDINAL;
    else {
      const ddx = this.playerPos.x - e.x, ddy = this.playerPos.y - e.y;
      const d = Math.abs(ddx) >= Math.abs(ddy) ? { x: Math.sign(ddx) || 1, y: 0 } : { x: 0, y: Math.sign(ddy) || 1 };
      deltas = [1, 2, 3, 4].map(k => [d.x * k, d.y * k] as [number, number]);
    }
    return deltas.map(([dx, dy]) => ({ x: e.x + dx, y: e.y + dy })).filter(t => this.isPassable(t.x, t.y));
  }
  private refreshTelegraphs() {
    this.telegraphTiles = this.enemies.filter(e => e.telegraph).flatMap(e => e.telegraphTiles);
  }

  private actFluorine(e: Enemy) {
    const near = () => this.enemyTiles(e).some(t => e.bonded
      ? Math.max(Math.abs(t.x - this.playerPos.x), Math.abs(t.y - this.playerPos.y)) <= 2
      : Math.abs(t.x - this.playerPos.x) + Math.abs(t.y - this.playerPos.y) <= 1);
    if (!near()) this.resolveMove(e);
    if (near()) {
      e.armed = true;
      const tiles: Pos[] = [];
      for (const t of this.enemyTiles(e)) {
        const deltas: Array<[number, number]> = e.bonded ? [[0, 0], ...ALL_EIGHT] : [[0, 0], ...CARDINAL];
        for (const [dx, dy] of deltas) if (this.isPassable(t.x + dx, t.y + dy) && !tiles.some(p => p.x === t.x + dx && p.y === t.y + dy)) tiles.push({ x: t.x + dx, y: t.y + dy });
      }
      e.explodeTiles = tiles;
      e.plannedDx = 0; e.plannedDy = 0;
    }
  }

  private actIodine(e: Enemy) {
    if (e.invisibleTurnsLeft > 0) {
      e.invisibleTurnsLeft--;
      this.resolveMove(e);
      if (e.invisibleTurnsLeft <= 0) e.vaporCooldown = 3;
    } else if (e.vaporCooldown > 0) {
      e.vaporCooldown--;
      this.resolveMove(e);
    } else if (e.bonded || e.health > 1) {
      e.lastKnown = e.bonded ? null : { x: e.x, y: e.y };
      e.invisibleTurnsLeft = 1;
      if (!e.bonded) e.health -= 1;
      for (const t of this.enemyTiles(e)) this.addFx('vapor', t.x, t.y);
      this.resolveMove(e);
    } else {
      this.resolveMove(e);
    }
  }

  /** Traps, collapsing sheets, spear pickup by enemies — anything positional after movement. */
  private resolveTrapsAndSheets() {
    for (const e of [...this.enemies]) {
      const trap = this.dopantTraps.find(t => this.enemyTiles(e).some(p => same(p, t)));
      if (!trap) continue;
      this.dopantTraps = this.dopantTraps.filter(t => t !== trap);
      this.addFx('shock', trap.x, trap.y);
      if (e.type === 'bromine') {
        e.suppressedTurns = 1;
        const burnt = this.damageEnemy(e, this.dmg(DOPANT_TRAP_DAMAGE));
        this.note(burnt
          ? '⚡ Bromine burned out on a dopant trap'
          : `⚡ Bromine took the trap (-${this.dmg(DOPANT_TRAP_DAMAGE)}, not paralyzed, corrosion dulled for a turn)`);
        continue;
      }
      if (this.damageEnemy(e, this.dmg(DOPANT_TRAP_DAMAGE))) {
        this.note(`⚡ ${ENEMIES[e.type].symbol} burned out on a dopant trap`);
        continue;
      }
      // Paralyzed and stripped of its special for the turn: no arming, channelling or vanishing.
      e.paralyzed = true;
      e.armed = false; e.explodeTiles = [];
      e.telegraph = false; e.telegraphTiles = [];
      if (e.invisibleTurnsLeft > 0) { e.invisibleTurnsLeft = 0; e.lastKnown = null; e.vaporCooldown = 3; }
      e.plannedDx = 0; e.plannedDy = 0;
      this.note(`⚡ ${ENEMIES[e.type].symbol} stepped on a dopant trap — paralyzed and suppressed`);
    }
    this.refreshTelegraphs();

    const collapsing = this.sheets.filter(s => s.turnsLeft <= 0);
    this.sheets = this.sheets.filter(s => s.turnsLeft > 0);
    for (const s of collapsing) {
      for (const t of s.tiles) this.addFx('collapse', t.x, t.y);
      for (const e of [...this.enemies]) {
        const on = this.enemyTiles(e).some(p => s.tiles.some(t => same(t, p)));
        if (on) { this.killEnemy(e); this.note(`🕳️ ${ENEMIES[e.type].symbol} fell as the sheet collapsed`); }
      }
      if (s.tiles.some(t => same(t, this.playerPos))) {
        const carbon = this.currentElement === 'carbon';
        if (!carbon) this.damagePlayer(1, 'collapse');
        let back: Pos | null = null;
        for (const [dx, dy] of CARDINAL) { const p = { x: this.playerPos.x + dx, y: this.playerPos.y + dy }; if (this.playerCanEnter(p.x, p.y) && !this.enemyAt(p.x, p.y)) { back = p; break; } }
        if (!back) {
          let best: Pos | null = null, bd = 99;
          for (let y = 0; y < this.gridSize; y++) for (let x = 0; x < this.gridSize; x++) {
            if (!this.playerCanEnter(x, y) || this.enemyAt(x, y)) continue;
            const d = Math.abs(x - this.playerPos.x) + Math.abs(y - this.playerPos.y);
            if (d < bd) { bd = d; best = { x, y }; }
          }
          back = best;
        }
        if (back) this.playerPos = back;
        this.note(carbon ? '🕳️ Your sheet gave way — you scrambled onto solid ground unharmed' : `🕳️ The sheet gave way under you (-1). Health ${this.elementHealth}`);
        this.checkTethers();
        this.die('Fell with the graphene.');
      }
      if (this.groundedSpear && s.tiles.some(t => same(t, this.groundedSpear!))) { this.groundedSpear = null; this.note('💠 The spear fell with the sheet'); }
    }
  }

  private applyPoison() {
    const inCloud = this.poisonZones.some(p => same(p, this.playerPos));
    if (inCloud && !this.poisonImmune && this.playerPoisonTurns <= 0) this.playerPoisonTurns = 2;
    if (inCloud && this.poisonImmune) this.note('🛡️ Inert shield shrugged off the poison');
    if (this.playerPoisonTurns > 0) {
      this.damagePlayer(1, 'poison');
      this.playerPoisonTurns--;
      this.note(`☠️ Poison (-1)${this.playerPoisonTurns > 0 ? ', lingering' : ''}. Health ${this.elementHealth}`);
      this.die('Poisoned to death.');
    }
  }

  // ---- diatomic bonding ----
  private telegraphBonds() {
    for (const a of this.enemies) {
      if (a.bonded || a.bondingWith !== null || a.encasedTurnsLeft > 0 || a.frozenTurnsLeft > 0 || a.tetherTurnsLeft > 0) continue;
      for (const b of this.enemies) {
        if (b === a || b.type !== a.type || b.bonded || b.bondingWith !== null || b.encasedTurnsLeft > 0 || b.frozenTurnsLeft > 0 || b.tetherTurnsLeft > 0) continue;
        if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) continue;
        a.bondingWith = b.id; b.bondingWith = a.id;
        this.addFx('bond', a.x, a.y); this.addFx('bond', b.x, b.y);
        this.note(`🔗 Two ${ENEMIES[a.type].symbol} are bonding — separate them or brace`);
        break;
      }
    }
  }
  private fuseBonds() {
    for (const a of [...this.enemies]) {
      if (a.bondingWith === null || a.bonded) continue;
      const b = this.enemies.find(x => x.id === a.bondingWith);
      if (!b || b.bonded || b.bondingWith !== a.id) { a.bondingWith = null; continue; }
      if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) { a.bondingWith = null; b.bondingWith = null; continue; }
      a.bonded = true; a.x2 = b.x; a.y2 = b.y;
      a.bondHalves = [a.health, b.health];
      a.health += b.health; a.maxHealth += b.maxHealth;
      a.bondingWith = null;
      a.armed = false; a.telegraph = false; a.telegraphTiles = [];
      this.enemies = this.enemies.filter(x => x !== b);
      this.addFx('bond', a.x, a.y); this.addFx('bond', a.x2, a.y2);
      this.note(`🔗 ${ENEMIES[a.type].symbol}₂ formed (${a.health} health)`);
      this.planMove(a);
    }
  }
  private breakBond(m: Enemy) {
    if (!m.bonded || m.x2 === null || m.y2 === null) return;
    const [h1] = m.bondHalves ?? [Math.ceil(m.health / 2), 0];
    const first = Math.min(m.health, h1);
    const second = m.health - first;
    const bx = m.x2, by = m.y2;
    m.bonded = false; m.x2 = null; m.y2 = null; m.bondHalves = null;
    m.health = Math.max(1, first); m.maxHealth = ENEMIES[m.type].health;
    this.addFx('shatter', m.x, m.y);
    if (second > 0) {
      const b: Enemy = { ...m, id: this.nextEnemyId++, x: bx, y: by, health: second, maxHealth: ENEMIES[m.type].health, bondingWith: null, tetherTurnsLeft: 0 };
      this.enemies.push(b);
      this.addFx('shatter', bx, by);
    }
    this.note(`🔗 Bond broken`);
  }
}
