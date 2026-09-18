export type ElementKey =
  | 'hydrogen' | 'helium' | 'lithium' | 'beryllium' | 'boron'
  | 'carbon' | 'nitrogen' | 'oxygen' | 'neon';

export type EnemyType = 'fluorine' | 'chlorine' | 'bromine' | 'iodine';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type Orientation = 'left' | 'right';
export type GridShape = 'plain' | 'void' | 'split' | 'eroded';

export type AimTag =
  | 'h_bond' | 'h_dash'
  | 'li_paralyze' | 'li_burst3'
  | 'b_encase'
  | 'c_sheet' | 'c_throw'
  | 'n_blast2';

export type FxType =
  | 'explosion' | 'shatter' | 'shock' | 'frost' | 'gust' | 'evolve'
  | 'shield' | 'corrode' | 'encase' | 'collapse' | 'ozone' | 'heal'
  | 'flash' | 'vapor' | 'smoke' | 'spear' | 'bond' | 'crush' | 'photon' | 'tether';

export type MessageType = 'info' | 'success' | 'warning' | 'danger';
export type HutItem = 'evolve' | 'heal' | 'healthCatalyst' | 'damageCatalyst';

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
export interface Fx { type: FxType; x: number; y: number; }

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
}

export interface EnemyDef { symbol: string; health: number; desc: string; }

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
