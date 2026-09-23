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
  const t = { element: 'helium', ligand: null, lesson: 'ram', complete: false };
  store.setState({ tutorial: t, game: tutorialGame(t), screen: 'game' });
  const before = JSON.stringify(store.getState().game);
  store.getState().prepareAction({ kind: 'move', dx: 1, dy: 0 });
  assert.equal(JSON.stringify(store.getState().game), before);
  store.getState().cancelAction();
  store.getState().move(1, 0);
  assert.ok(store.getState().frame, 'combat must have playback');
  const resolved = JSON.stringify(store.getState().game);
  store.getState().passTurn(); store.getState().ability(1); store.getState().move(-1, 0);
  assert.equal(JSON.stringify(store.getState().game), resolved, 'rapid input during playback must be blocked');
  store.getState().finishPlayback();
  assert.equal(store.getState().frame, null);
  assert.equal(store.getState().tutorial.complete, true);
  store.getState().resetLesson();
  store.getState().move(1, 0); store.getState().pause();
  assert.equal(store.getState().frame, null); assert.equal(store.getState().paused, true);
  store.getState().resume(); store.getState().resetLesson();
  store.getState().move(1, 0); store.getState().toMenu();
  await new Promise(resolve => setTimeout(resolve, 800));
  assert.equal(store.getState().screen, 'menu'); assert.equal(store.getState().game, null);
  assert.equal(store.getState().frame, null);
  store.getState().startTutorial('helium', null); store.getState().move(1, 0);
  store.getState().setReducedMotion(true);
  assert.equal(store.getState().frame, null); assert.equal(store.getState().tutorial.complete, true);
  await flushProfile(); assert.equal(writes, 0);
  console.log('playback store: optional previews, rapid input, skip, pause, menu cancellation and reduced motion passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
