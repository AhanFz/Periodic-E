import { ELEMENT_ORDER, LIGAND_ORDER } from '../src/game/constants';
import { lessons, lessonComplete, tutorialGame, type TutorialSession } from '../src/game/tutorial';

function check(value: boolean, message: string) { if (!value) throw new Error(message); }

/** Follow the actual instructions for every selectable equipment combination. */
export function runTutorialScenarios() {
  let count = 0;
  for (const element of ELEMENT_ORDER) for (const ligand of [null, ...LIGAND_ORDER]) {
    for (const lesson of lessons(ligand)) {
      const t: TutorialSession = { element, ligand, lesson, complete: false };
      const g = tutorialGame(t);
      const context = `${element}/${ligand}/${lesson}`;
      check(!lessonComplete(t, g), `already complete: ${context}`);
      check(g.mode === 'tutorial' && g.turnLimit === null, `practice rules: ${context}`);
      const cast = (tier: 1 | 3) => {
        g.activateAbility(tier);
        if (g.aiming) {
          g.previewAim(element === 'carbon' && tier === 1 ? 'left' : 'right');
          check(!lessonComplete(t, g), `aim preview completed lesson: ${context}`);
          g.confirmAim('left');
        }
      };
      switch (lesson) {
        case 'move': g.movePlayer(1, 0); break;
        case 'wait': g.passTurn(); break;
        case 'ram': g.movePlayer(1, 0); break;
        case 'first':
          cast(1);
          if (element === 'boron') g.movePlayer(-1, 0);
          if (element === 'lithium') {
            for (let i = 0; i < 3; i++) {
              check(!lessonComplete(t, g), 'battery paid early');
              g.passTurn();
            }
          }
          break;
        case 'second':
          cast(3);
          if (element === 'boron') { g.passTurn(); g.shatter(); }
          if (element === 'carbon') { g.beginThrow(); g.previewAim('right'); g.confirmAim(); }
          break;
        case 'ligand':
          g.movePlayer(1, 0);
          if (ligand === 'fractional') { g.buy('heal'); g.leaveHut(); }
          break;
        case 'hatch': g.movePlayer(1, 0); check(!g.won, 'tutorial hatch counted as a win'); break;
      }
      check(lessonComplete(t, g), `instructions did not finish: ${context}`);
      const reset = tutorialGame(t);
      check(!lessonComplete(t, reset) && reset.turn === 0, `reset failed: ${context}`);
      count++;
    }
  }
  const empty = tutorialGame({ element: 'helium', ligand: null, lesson: 'wait', complete: false });
  for (let i = 0; i < 30; i++) empty.passTurn();
  check(empty.enemies.length === 0 && empty.elementHealth === empty.maxHealth, 'practice spawned enemies or destabilised');
  console.log(`tutorial: ${count} lesson/equipment scenarios passed; all 45 selections are finishable`);
}
