// Run the real store with only device haptics/storage replaced. No app files are rewritten.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let writes = 0;
require.extensions['.ts'] = (mod, filename) => {
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  mod._compile(js, filename);
};
const originalLoad = Module._load;
Module._load = function (id, parent, isMain) {
  if (id === '@/ui/haptics') return { playCues() {}, setHapticsEnabled() {} };
  if (id === '@react-native-async-storage/async-storage') return { getItem: async () => null, setItem: async () => { writes++; } };
  if (id.startsWith('@/')) id = path.join(root, 'src', id.slice(2));
  return originalLoad.call(this, id, parent, isMain);
};
const { useGameStore: store } = require('../src/store/gameStore.ts');
const { tutorialGame } = require('../src/game/tutorial.ts');
const { flushProfile } = require('../src/persistence/profile.ts');
(async () => {
  await store.getState().hydrate();
  store.getState().setReducedMotion(true);
  store.setState({ profile: { ...store.getState().profile, quanta: 80, ownedLigands: ['passivation'], equippedLigand: 'passivation' } });
  const before = structuredClone(store.getState().profile);
  store.getState().startTutorial('neon', 'supercooled');
  assert.equal(store.getState().game.ligand, 'supercooled');
  store.getState().nextLesson();
  assert.equal(store.getState().tutorial.lesson, 'move');
  store.getState().move(1, 0);
  assert.equal(store.getState().tutorial.complete, true);
  store.getState().nextLesson();
  assert.equal(store.getState().tutorial.lesson, 'wait');
  store.getState().passTurn();
  assert.equal(store.getState().tutorial.complete, true);
  store.getState().retry();
  assert.equal(store.getState().game.currentElement, 'neon');
  assert.equal(store.getState().tutorial.complete, false);
  for (const element of ['hydrogen', 'neon']) {
    const t = { element, ligand: 'supercooled', lesson: 'hatch', complete: false };
    store.setState({ tutorial: t, game: tutorialGame(t) });
    store.getState().move(1, 0);
    assert.equal(store.getState().tutorial.complete, true);
    assert.equal(store.getState().screen, 'game');
    assert.equal(store.getState().lastAward, 0);
  }
  const f = { element: 'oxygen', ligand: 'fractional', lesson: 'ligand', complete: false };
  store.setState({ tutorial: f, game: tutorialGame(f) });
  store.getState().move(1, 0);
  store.getState().buy('heal');
  assert.equal(store.getState().tutorial.complete, true);
  store.getState().leaveHut();
  assert.equal(store.getState().game.atHut, false);
  const failure = { element: 'hydrogen', ligand: null, lesson: 'ram', complete: false };
  const dead = tutorialGame(failure); dead.elementHealth = 1;
  store.setState({ tutorial: failure, game: dead });
  store.getState().move(1, 0);
  assert.equal(store.getState().game.gameOver, true);
  assert.equal(store.getState().screen, 'game');
  store.getState().toMenu();
  assert.deepEqual(store.getState().profile, before);
  await flushProfile();
  assert.equal(writes, 0, 'tutorial must never persist profile changes');
  store.getState().startGame('neon'); // Legacy callers cannot bypass Hydrogen.
  assert.equal(store.getState().game.currentElement, 'hydrogen');
  assert.equal(store.getState().game.ligand, 'passivation');
  assert.equal(store.getState().game.mode, 'run');
  assert.equal(store.getState().tutorial, null);
  console.log('tutorial store: reward isolation, resets, transitions and Hydrogen-only runs passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
