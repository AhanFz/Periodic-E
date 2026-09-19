import { ENEMIES, ENEMY_COLORS, ELEMENT_COLORS, HALOGEN_VALENCE, VALENCE } from './constants';
import type { Game } from './engine';
import type { Fx, InspectTarget } from './types';

export type TileTint =
  | 'hazard' | 'warning' | 'danger' | 'frozen' | 'paralyzed' | 'encased' | 'bonding' | 'tethered'
  | 'scorched' | 'trail' | 'trap' | 'ghost' | 'sheet' | 'hut' | 'hatch' | 'aim';

export interface AtomView {
  symbol: string;
  color: string;
  electrons: number;
  isHalogen: boolean;
  healthPct: number;
  frozen?: boolean;
  encased?: boolean;
  shielded?: boolean;
  bonded?: boolean;
  tethered?: boolean;
  statusIcon?: string;
}

export interface TileView {
  key: string;
  x: number;
  y: number;
  /** false for margin tiles with no sheet, and for void tiles: rendered as a gap. */
  exists: boolean;
  isVoid: boolean;
  isMargin: boolean;
  checker: 'light' | 'dark';
  tints: TileTint[];
  pulse: boolean;
  atom: AtomView | null;
  centerIcon: string | null;
  centerLabel: string | null;
  centerDim: boolean;
  threatIcon: string | null;
  moveArrow: string | null;
  /** On a tethered enemy's tile: the link pointing at the player. */
  tetherArrow: string | null;
  /** What a long press here opens, if anything. Hidden Iodine is not inspectable. */
  inspect: InspectTarget | null;
  /** Ring the tile the player arrived on. True only on a grid's first turn. */
  startGlow: boolean;
  isGhost: boolean;
  sheetTimer: number | null;
  fx: Fx[];
}

export interface BoardView {
  /** Logical size of the grid. */
  size: number;
  /** Rendered columns; exceeds `size` only when an off-grid sheet extends past an edge. */
  cols: number;
  rows: TileView[][];
  polarityArrow: string | null;
  polarityCountdown: number | null;
}

const MOVE_ARROWS: Record<string, string> = { '0,-1': '↑', '0,1': '↓', '-1,0': '←', '1,0': '→' };
const POLARITY_ARROWS: Record<string, string> = { up: '↑', down: '↓', left: '←', right: '→' };

export function buildBoardView(game: Game): BoardView {
  const n = game.gridSize;
  let minX = 0, minY = 0, maxX = n - 1, maxY = n - 1;
  for (const s of game.sheets) for (const t of s.tiles) {
    minX = Math.min(minX, t.x); minY = Math.min(minY, t.y);
    maxX = Math.max(maxX, t.x); maxY = Math.max(maxY, t.y);
  }

  const rows: TileView[][] = [];
  const danger = game.enemies.filter(e => e.type === 'fluorine' && e.armed).flatMap(e => e.explodeTiles);

  for (let y = minY; y <= maxY; y++) {
    const row: TileView[] = [];
    for (let x = minX; x <= maxX; x++) {
      const isMargin = !game.inBounds(x, y);
      const sheet = game.sheets.find(s => s.tiles.some(t => t.x === x && t.y === y));
      const isVoid = game.isVoid(x, y);
      const exists = !!sheet || (!isMargin && !isVoid);

      const isPlayer = x === game.playerPos.x && y === game.playerPos.y;
      const enemyRaw = game.enemyAt(x, y);
      const enemy = enemyRaw && enemyRaw.type === 'iodine' && enemyRaw.invisibleTurnsLeft > 0 ? undefined : enemyRaw;
      const isGhost = game.enemies.some(e => e.type === 'iodine' && e.invisibleTurnsLeft > 0 && e.lastKnown && e.lastKnown.x === x && e.lastKnown.y === y);
      const isHut = x === game.layout.hut.x && y === game.layout.hut.y;
      const isHatch = x === game.layout.hatch.x && y === game.layout.hatch.y;
      const isStart = x === game.layout.start.x && y === game.layout.start.y;
      const isPhoton = game.photonTiles.some(t => t.x === x && t.y === y);
      const isSpear = !!game.groundedSpear && game.groundedSpear.x === x && game.groundedSpear.y === y;
      const trap = game.dopantTraps.find(t => t.x === x && t.y === y);
      const trail = game.trails.find(t => t.x === x && t.y === y);
      const isScorched = game.isScorched(x, y);
      const isHazard = game.poisonZones.some(p => p.x === x && p.y === y);
      const isWarning = !isHazard && game.telegraphTiles.some(p => p.x === x && p.y === y);
      const isDanger = !isHazard && !isWarning && danger.some(t => t.x === x && t.y === y);
      const isAim = game.aiming && game.aimLine.some(t => t.x === x && t.y === y);
      const tethered = !!enemy && enemy.tetherTurnsLeft > 0;

      const tints: TileTint[] = [];
      if (sheet) tints.push('sheet');
      if (isHut) tints.push('hut');
      if (isHatch) tints.push('hatch');
      if (isScorched) tints.push('scorched');
      if (trail) tints.push('trail');
      if (trap) tints.push('trap');
      if (isHazard) tints.push('hazard'); else if (isWarning) tints.push('warning'); else if (isDanger) tints.push('danger');
      if (enemy?.encasedTurnsLeft) tints.push('encased');
      else if (enemy && enemy.frozenTurnsLeft > 0) tints.push('frozen');
      else if (tethered) tints.push('tethered');
      else if (enemy?.paralyzed) tints.push('paralyzed');
      else if (enemy && enemy.bondingWith !== null) tints.push('bonding');
      if (isGhost) tints.push('ghost');
      if (isAim) tints.push('aim');

      let atom: AtomView | null = null;
      let centerIcon: string | null = null, centerLabel: string | null = null, centerDim = false;

      if (isPlayer) {
        atom = {
          symbol: game.elementData.symbol,
          color: ELEMENT_COLORS[game.currentElement],
          electrons: VALENCE[game.currentElement],
          isHalogen: false,
          healthPct: game.elementHealth / game.maxHealth,
          shielded: game.shieldPoints > 0,
          statusIcon: game.heldSpear !== null ? '💠' : game.batteryTurnsLeft > 0 ? '🔋' : undefined,
        };
      } else if (enemy) {
        let statusIcon: string | undefined;
        if (enemy.encasedTurnsLeft > 0) statusIcon = '🔒';
        else if (enemy.frozenTurnsLeft > 0) statusIcon = '❄️';
        else if (tethered) statusIcon = '🪢';
        else if (enemy.paralyzed) statusIcon = '⚡';
        else if (enemy.armed) statusIcon = '💣';
        else if (enemy.bondingWith !== null) statusIcon = '🔗';
        else if (enemy.fleeTurnsLeft > 0) statusIcon = '😵';
        atom = {
          symbol: ENEMIES[enemy.type].symbol + (enemy.bonded ? '₂' : ''),
          color: ENEMY_COLORS[enemy.type],
          electrons: HALOGEN_VALENCE,
          isHalogen: true,
          healthPct: enemy.health / enemy.maxHealth,
          frozen: enemy.frozenTurnsLeft > 0,
          encased: enemy.encasedTurnsLeft > 0,
          bonded: enemy.bonded,
          tethered,
          statusIcon,
        };
      } else if (isHut) { centerIcon = '⚗️'; centerLabel = 'HUT'; }
      else if (isHatch) { centerIcon = '🚪'; centerLabel = 'HATCH'; }
      else if (isSpear) { centerIcon = '💠'; centerLabel = `${game.groundedSpear!.health}`; }
      else if (isPhoton) { centerIcon = '🔆'; centerLabel = '+1'; }
      else if (trap) { centerIcon = '⚡'; centerLabel = 'TRAP'; centerDim = true; }

      let threatIcon: string | null = null;
      if (isAim) threatIcon = '🎯';
      else if (isHazard) threatIcon = '☠️';
      else if (isDanger) threatIcon = '💣';
      else if (isWarning) threatIcon = '⚠️';
      else if (trail) threatIcon = '🧪';
      else if (isScorched) threatIcon = '🔥';

      let moveArrow: string | null = null;
      const immobile = !enemy || enemy.frozenTurnsLeft > 0 || enemy.paralyzed || enemy.encasedTurnsLeft > 0 || enemy.armed || tethered;
      if (enemy && !immobile && (enemy.plannedDx !== 0 || enemy.plannedDy !== 0) && enemy.x === x && enemy.y === y) {
        moveArrow = MOVE_ARROWS[`${enemy.plannedDx},${enemy.plannedDy}`] ?? null;
      }
      let tetherArrow: string | null = null;
      if (tethered) {
        const dx = game.playerPos.x - x, dy = game.playerPos.y - y;
        if (Math.abs(dx) + Math.abs(dy) === 1) tetherArrow = MOVE_ARROWS[`${dx},${dy}`] ?? null;
      }

      row.push({
        key: `${x},${y}`, x, y, exists, isVoid, isMargin,
        checker: ((x + y) % 2 + 2) % 2 === 0 ? 'light' : 'dark',
        tints,
        pulse: isWarning || isAim || isDanger || !!enemy?.paralyzed || (!!enemy && enemy.bondingWith !== null),
        atom, centerIcon, centerLabel, centerDim, threatIcon, moveArrow, tetherArrow,
        inspect: isPlayer ? { kind: 'player' } : enemy ? { kind: 'enemy', id: enemy.id } : null,
        startGlow: isStart && game.showStartMarker, isGhost,
        sheetTimer: sheet ? sheet.turnsLeft : null,
        fx: game.pendingEffects.filter(f => f.x === x && f.y === y),
      });
    }
    rows.push(row);
  }

  return {
    size: n,
    cols: maxX - minX + 1,
    rows,
    polarityArrow: game.polarity.active && game.polarity.direction ? POLARITY_ARROWS[game.polarity.direction] : null,
    polarityCountdown: game.polarity.active ? game.polarity.countdown : null,
  };
}
