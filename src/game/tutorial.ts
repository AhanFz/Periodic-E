import { Game } from './engine';
import { ELEMENTS, ENEMIES, LIGANDS, PHOTON_CAP } from './constants';
import { floodFill } from './grid';
import type { ElementKey, EnemyType, LigandId } from './types';

export type Lesson = 'move' | 'wait' | 'ram' | 'first' | 'second' | 'ligand' | 'hatch';
export interface TutorialSession {
  element: ElementKey;
  ligand: LigandId | null;
  lesson: Lesson;
  complete: boolean;
}
export function lessons(ligand: LigandId | null): Lesson[] {
  return ['move', 'wait', 'ram', 'first', 'second', ...(ligand ? ['ligand' as const] : []), 'hatch'];
}

function target(g: Game, type: EnemyType = 'chlorine', x = 2, y = 2) {
  g.enemies.push({
    id: g.nextEnemyId++, type, x, y, x2: null, y2: null, bonded: false,
    bondHalves: null, bondingWith: null, health: ENEMIES[type].health, maxHealth: ENEMIES[type].health,
    frozenTurnsLeft: 0, paralyzed: false, encasedTurnsLeft: 0, telegraph: false,
    telegraphTiles: [], poisonCooldown: 1, poisonShape: 0, armed: false, explodeTiles: [],
    fleeTurnsLeft: 0, invisibleTurnsLeft: 0, vaporCooldown: 2, lastKnown: null,
    plannedDx: -1, plannedDy: 0, tetherTurnsLeft: 0, suppressedTurns: 0,
  });
}

/** Fresh, reproducible rooms use the real engine; resetting a lesson never touches a profile. */
export function tutorialGame(t: TutorialSession): Game {
  const g = new Game(t.element, t.ligand, 'tutorial');
  g.layout = {
    size: 5, shape: 'plain', passable: Array.from({ length: 5 }, () => Array(5).fill(true)),
    start: { x: 1, y: 2 }, hut: { x: 4, y: 4 }, hatch: { x: 4, y: 0 }, polarity: false,
  };
  g.playerPos = { ...g.layout.start };
  g.enemies = []; g.photonTiles = []; g.photons = PHOTON_CAP;
  if (t.lesson === 'move') g.photonTiles = [{ x: 2, y: 2 }];
  if (t.lesson === 'move') g.photons = 2;
  if (t.lesson === 'ram') target(g, 'fluorine');
  if (t.lesson === 'first') {
    if (['hydrogen', 'helium', 'nitrogen', 'neon'].includes(t.element)) target(g);
    if (t.element === 'boron') target(g, 'fluorine');
    if (t.element === 'lithium') g.photons = 3;
    if (t.element === 'oxygen') g.elementHealth -= 2;
    if (t.element === 'carbon') {
      g.playerPos = { x: 0, y: 2 }; g.layout.start = { ...g.playerPos };
    }
  }
  if (t.lesson === 'second') {
    if (t.element !== 'beryllium') target(g);
    if (t.element === 'lithium') {
      g.enemies[0].x = 3; g.layout.passable[2][2] = false; g.layout.shape = 'void';
    }
  }
  if (t.lesson === 'ligand') {
    if (t.ligand === 'fractional') {
      g.layout.hut = { x: 2, y: 2 }; g.elementHealth -= 2;
    } else {
      target(g);
      g.elementHealth = t.ligand === 'passivation' ? 3 : t.ligand === 'supercooled' ? 1 : g.exothermicThreshold;
    }
  }
  if (t.lesson === 'hatch') g.layout.hatch = { x: 2, y: 2 };
  g.region = floodFill(g.layout.passable, g.layout.start);
  g.message = 'Practice room ready. Follow the lesson below; reset whenever you like.';
  return g;
}

export function lessonComplete(t: TutorialSession, g: Game): boolean {
  if (t.lesson === 'hatch') return g.gameOver && g.elementHealth > 0;
  if (g.gameOver) return false;
  switch (t.lesson) {
    case 'move': return g.photons === 3 && g.playerPos.x === 2 && g.playerPos.y === 2;
    case 'wait': return g.turn > 0;
    case 'ram': return g.totalKills > 0;
    case 'first':
      switch (t.element) {
        case 'hydrogen': return g.enemies.some(e => e.tetherTurnsLeft > 0);
        case 'helium': return g.enemies.some(e => e.frozenTurnsLeft > 0);
        case 'lithium': return g.turn >= 3 && g.batteryTurnsLeft === 0 && g.photons === PHOTON_CAP;
        case 'beryllium': return g.shieldPoints > 0;
        case 'boron': return g.enemies.some(e => e.paralyzed && e.health < e.maxHealth);
        case 'carbon': return g.sheets.length > 0;
        case 'nitrogen': return g.scorchedTiles.length > 0;
        case 'oxygen': return g.elementHealth > g.maxHealth - 2;
        case 'neon': return g.enemies.some(e => e.fleeTurnsLeft > 0);
      }
    case 'second':
      switch (t.element) {
        case 'helium': return g.enemies.some(e => e.frozenTurnsLeft >= 3);
        case 'lithium': return g.enemies.some(e => e.health < e.maxHealth && e.paralyzed);
        case 'beryllium': return g.poisonImmune && g.shieldPoints > 0;
        case 'boron': return g.totalKills > 0;
        case 'carbon': return g.totalKills > 0;
        case 'neon': return g.enemies.some(e => e.frozenTurnsLeft > 0 && e.health < e.maxHealth);
        default: return g.totalKills > 0;
      }
    case 'ligand':
      switch (t.ligand) {
        case 'passivation': return g.passivationFiresThisGrid === 1;
        case 'supercooled': return g.supercooledFires === 1;
        case 'exothermic': return g.totalKills > 0;
        case 'fractional': return g.hutVisitsThisGrid === 1 && g.elementHealth === g.maxHealth && g.photons === 4;
        default: return false;
      }
  }
}

export function lessonCopy(t: TutorialSession): { title: string; instruction: string; takeaway: string } {
  const d = ELEMENTS[t.element];
  if (t.lesson === 'move') return {
    title: 'Move and collect', instruction: 'Press → to move onto the photon. Hold your atom or a halogen to inspect its card.',
    takeaway: 'Moving spends your move slot, not your ability slot. You collected one photon; you can hold at most five.',
  };
  if (t.lesson === 'wait') return {
    title: 'You can wait', instruction: 'Press Skip turn without moving or using an ability.',
    takeaway: 'You may use one move and one ability in either order. Using both ends the turn automatically. End turn gives up unused actions; Skip turn gives up both.',
  };
  if (t.lesson === 'ram') return {
    title: 'Ram a halogen', instruction: 'Press → into Fluorine to attack it. You stay on your tile.',
    takeaway: 'A normal ram deals 2 damage and costs 1 health. Paralyzed enemies cost no self-damage but take normal ram damage. Frozen enemies shatter for free. Defeating a halogen earns photons.',
  };
  if (t.lesson === 'first' || t.lesson === 'second') {
    const first = t.lesson === 'first';
    let action = `Use ${first ? d.ability1Short : d.ability2Short}.`;
    if (first && t.element === 'hydrogen') action += ' Aim →, then press Tether.';
    if (first && t.element === 'nitrogen') action += ' Aim →, then press Blast.';
    if (first && t.element === 'boron') action += ' Then move ← off the trap. Fluorine will follow onto it and take damage plus paralysis.';
    if (first && t.element === 'carbon') action += ' Aim ← off the edge, then choose either Curve button.';
    if (first && t.element === 'lithium') action += ' Then press End turn / Skip turn three times. Each full turn-end counts once; avoid damage.';
    if (!first && ['hydrogen', 'lithium', 'boron'].includes(t.element)) action += ' Aim → and confirm the shot or dash.';
    if (!first && t.element === 'boron') action += ' End turn, then press Shatter to break the glass.';
    if (!first && t.element === 'carbon') action += ' Choose Throw now, aim → and confirm. Throwing spends your ability slot but no photons.';
    if (!first && t.element === 'lithium') action += ' The target is beyond the void: the beam crosses it.';
    return {
      title: `${first ? 'First' : 'Second'} ability: ${first ? d.ability1Name : d.ability2Name}`,
      instruction: action,
      takeaway: (first ? d.ability1Desc : d.ability2Desc) + ' Each lesson resets the board and supplies practice photons.',
    };
  }
  if (t.lesson === 'ligand' && t.ligand) return {
    title: `Try ${LIGANDS[t.ligand].name}`,
    instruction: t.ligand === 'fractional'
      ? 'Press → to enter the hut. Buy Heal for 1 photon instead of 2, then leave the hut.'
      : 'This room starts you at the health needed to demonstrate your ligand. Press → to ram Chlorine.',
    takeaway: LIGANDS[t.ligand].description + ' Tutorial equipment is borrowed; it does not change your owned or equipped ligands.',
  };
  return {
    title: 'Reach the hatch', instruction: 'Press → onto the hatch to finish the tutorial.',
    takeaway: 'In a normal run, start as Hydrogen, evolve at huts and escape as Neon. Noble gases have a turn limit there. Practice has no timer, new enemy spawns, quanta or recorded run stats.',
  };
}
