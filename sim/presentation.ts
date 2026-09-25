import { Game } from '../src/game/engine';
import { actionPreview, applyAction, type Action } from '../src/game/actions';
import { ELEMENT_ORDER, LIGAND_ORDER, ENEMY_PRESSURE } from '../src/game/constants';
import { tutorialGame, lessons } from '../src/game/tutorial';
function check(ok: unknown, message: string) { if (!ok) throw new Error(message); }
export function runPresentationScenarios() {
  let count = 0;
  const actions: Action[] = [
    { kind: 'move', dx: 1, dy: 0 }, { kind: 'move', dx: -1, dy: 0 },
    { kind: 'ability', tier: 1 }, { kind: 'ability', tier: 3 }, { kind: 'pass' }, { kind: 'shatter' },
  ];
  for (const element of ELEMENT_ORDER) for (const ligand of [null, ...LIGAND_ORDER]) for (const lesson of lessons(ligand)) {
    const g = tutorialGame({ element, ligand, lesson, complete: false });
    for (const action of actions) {
      const before = JSON.stringify(g);
      const random = Math.random;
      Math.random = () => { throw new Error('Preview consumed random state'); };
      try {
        const preview = actionPreview(g, action);
        if (preview.next.aiming) {
          preview.next.previewAim('right');
          actionPreview(preview.next, { kind: 'aim', orientation: 'left' });
          actionPreview(preview.next, { kind: 'aim', orientation: 'right' });
        }
      } finally { Math.random = random; }
      check(before === JSON.stringify(g), 'Preview mutated the live game'); count++;
    }
  }
  const ram = tutorialGame({ element: 'hydrogen', ligand: 'exothermic', lesson: 'ligand', complete: false });
  ram.elementHealth = ram.exothermicThreshold + 1;
  const boosted = actionPreview(ram, { kind: 'move', dx: 1, dy: 0 });
  check(boosted.lines.some(line => line.includes('3 damage')), 'Ram must apply self damage before Exothermic threshold');
  ram.enemies[0].invisibleTurnsLeft = 2;
  const hidden = actionPreview(ram, { kind: 'move', dx: 1, dy: 0 });
  check(!hidden.lines.join(' ').includes('(3,3)'), 'Hidden enemy position leaked');
  for (const tier of [1, 3] as const) for (const type of ['fluorine', 'chlorine'] as const) {
    const g = tutorialGame({ element: 'helium', ligand: null, lesson: 'first', complete: false });
    const enemy = g.enemies[0]; enemy.type = type; enemy.armed = type === 'fluorine';
    enemy.explodeTiles = [{ ...g.playerPos }]; enemy.telegraph = type === 'chlorine';
    enemy.telegraphTiles = [{ ...g.playerPos }]; g.telegraphTiles = [...enemy.telegraphTiles];
    g.activateAbility(tier);
    check(!enemy.armed && !enemy.telegraph && !enemy.explodeTiles.length && !enemy.telegraphTiles.length, 'Freeze must cancel loaded attack');
    const hp = g.elementHealth;
    g.passTurn(); check(g.elementHealth === hp && g.enemies.includes(enemy), 'Frozen enemy attacked or exploded');
  }
  for (const element of ELEMENT_ORDER) {
    const g = new Game(element);
    check(g.enemies.length === ENEMY_PRESSURE[element].initial, 'Initial enemy count');
    g.depth = 20; g.elementHealth = 10000;
    for (let i = 0; i < 50 && !g.gameOver; i++) {
      g.passTurn();
      check(g.enemies.reduce((n, e) => n + (e.bonded ? 2 : 1), 0) <= ENEMY_PRESSURE[element].cap, 'Element population cap');
    }
  }
  const g = tutorialGame({ element: 'hydrogen', ligand: null, lesson: 'ram', complete: false });
  const copy = g.fork(); const labels: string[] = [];
  g.onFrame = (label, motion) => { labels.push(label); if (motion) check(motion.actor === 'player' && motion.dx === 1 && motion.dy === 0, 'Ram motion direction'); };
  applyAction(g, { kind: 'move', dx: 1, dy: 0 });
  applyAction(copy, { kind: 'move', dx: 1, dy: 0 });
  g.onFrame = undefined;
  check(JSON.stringify(g) === JSON.stringify(copy), 'Presentation changed rules');
  check(labels[0] === 'Ram · lunge and rebound' && labels[1] === 'Ram impact' && labels[2].startsWith('Damage') && labels.some(label => label.includes('destroyed')), 'Ram order');
  const contact = tutorialGame({ element: 'hydrogen', ligand: null, lesson: 'ram', complete: false });
  const enemy = contact.enemies[0];
  enemy.type = 'bromine'; enemy.plannedDx = -1; enemy.plannedDy = 0;
  const beats: string[] = [];
  contact.onFrame = (label, motion) => { if (motion) { check(motion.actor === `enemy-${enemy.id}` && motion.target === 'player' && motion.dx === -1, 'Enemy contact direction'); beats.push('lunge'); } else if (label.startsWith('Damage')) beats.push('damage'); };
  contact.passTurn();
  check(beats[0] === 'lunge' && beats[1] === 'damage', 'Contact precedes damage');
  console.log(`presentation: ${count} non-mutating previews, freeze interruption, Exothermic ordering, population caps and frame parity passed`);
}
