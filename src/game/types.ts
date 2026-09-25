export type ElementKey =
  | 'hydrogen' | 'helium' | 'lithium' | 'beryllium' | 'boron'
  | 'carbon' | 'nitrogen' | 'oxygen' | 'neon';

export type EnemyType = 'fluorine' | 'chlorine' | 'bromine' | 'iodine';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type Orientation = 'left' | 'right';
export type GridShape = 'plain' | 'void' | 'split' | 'eroded';

export type AimTag =
  | 'h_bond' | 'h_dash'
  | 'li_beam'
  | 'b_encase'
  | 'c_sheet' | 'c_throw'
  | 'n_blast2';

export type FxType =
  | 'explosion' | 'shatter' | 'shock' | 'frost' | 'gust' | 'evolve'
  | 'shield' | 'corrode' | 'encase' | 'collapse' | 'ozone' | 'heal'
  | 'flash' | 'vapor' | 'smoke' | 'spear' | 'bond' | 'crush' | 'photon' | 'tether';

/**
 * A passive item equipped before a run, from the main menu, bought with quanta. Distinct from
 * catalysts, which are bought mid-run with photons and apply a flat permanent bonus: a ligand is
 * conditional, fires on a situation, and is fixed for the whole run.
 */
export type LigandId = 'passivation' | 'supercooled' | 'fractional' | 'exothermic';

/**
 * Where a point of player damage came from. Ligands that intercept damage need to tell these
 * apart: Supercooled Core deliberately does not save against `destabilise`, or the noble-gas
 * turn limit would stop being a threat.
 */
export type DamageSource =
  | 'contact' | 'explosion' | 'poison' | 'trail' | 'polarity' | 'collapse' | 'ram' | 'destabilise';

export type MessageType = 'info' | 'success' | 'warning' | 'danger';
export type HutItem = 'evolve' | 'heal' | 'healthCatalyst' | 'damageCatalyst';

/**
 * Physical feedback the engine asks for. The engine only names what happened; the UI decides
 * which buzz that is, and plays at most the most significant cue of an action.
 */
export type HapticCue =
  | 'death' | 'win' | 'evolve' | 'damage' | 'shielded' | 'kill' | 'ram' | 'hit'
  | 'blocked' | 'photon' | 'buy';

/** What a long press on the board opened: your own atom, or one halogen by id. */
export type InspectTarget = { kind: 'player' } | { kind: 'enemy'; id: number };

export interface Pos { x: number; y: number; }

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  /** Second tile when bonded into a diatomic molecule. */
  x2: number | null;
  y2: number | null;
  bonded: boolean;
  bondHalves: [number, number] | null;
  bondingWith: number | null;
  health: number;
  maxHealth: number;
  frozenTurnsLeft: number;
  paralyzed: boolean;
  encasedTurnsLeft: number;
  telegraph: boolean;
  telegraphTiles: Pos[];
  poisonCooldown: number;
  poisonShape: number;
  armed: boolean;
  explodeTiles: Pos[];
  fleeTurnsLeft: number;
  invisibleTurnsLeft: number;
  vaporCooldown: number;
  lastKnown: Pos | null;
  plannedDx: number;
  plannedDy: number;
  /** Turns left on Hydrogen's tether: the enemy trails the player and cannot act. */
  tetherTurnsLeft: number;
  /** Turns during which a dopant trap suppresses the enemy's special (Bromine's ability lock). */
  suppressedTurns: number;
}

export interface Sheet { tiles: Pos[]; turnsLeft: number; }
export interface Scorched { x: number; y: number; turnsLeft: number; }
export interface PoisonZone { x: number; y: number; sourceId: number; }
export interface DopantTrap { x: number; y: number; turnsLeft: number; }
export interface Trail { x: number; y: number; turnsLeft: number; }
export interface GroundedSpear { x: number; y: number; health: number; }
export interface PendingWave { x: number; y: number; roundsLeft: number; }
export interface Fx {
  feedback?: 'damage';
  amount?: number;
  shield?: number;
  type: FxType;
  x: number;
  y: number;
  /** Degrees to turn the effect, so a discharge runs along the beam that made it. */
  angle?: number;
}

export interface Polarity {
  active: boolean;
  direction: Direction | null;
  countdown: number;
}

export interface ElementDef {
  symbol: string;
  health: number;
  noble: boolean;
  ability1Short: string;
  ability1Name: string;
  ability1Desc: string;
  ability1Cost: number;
  ability2Short: string;
  ability2Name: string;
  ability2Desc: string;
  ability2Cost: number;
}

export interface LigandDef {
  name: string;
  /** The chemistry the name comes from. */
  flavour: string;
  /** What it does, in game terms. */
  description: string;
  price: number;
}

export interface EnemyDef {
  symbol: string;
  health: number;
  desc: string;
  /** What the board shows you before it acts. */
  tell: string;
  /** How to beat it. */
  counter: string;
}

export interface MoveResult { needsConfirm: boolean; }

export interface GridLayout {
  size: number;
  shape: GridShape;
  passable: boolean[][];
  start: Pos;
  hut: Pos;
  hatch: Pos;
  polarity: boolean;
}

/** Transient presentation cue, emitted before contact damage; never stored in a save. */
export interface CombatMotion {
  kind?: 'windup';
  actor: string;
  target: string;
  dx: number;
  dy: number;
}
