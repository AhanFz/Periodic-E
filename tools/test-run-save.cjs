const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const assert = require('node:assert/strict'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
const disk = new Map(); let fail = false;
require.extensions['.ts'] = (m, file) => m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
const original = Module._load;
Module._load = function(id, parent, main) {
  if (id === '@/ui/haptics') return { playCues() {}, setHapticsEnabled() {} };
  if (id === '@react-native-async-storage/async-storage') return {
    getItem: async key => disk.get(key) ?? null,
    setItem: async (key, value) => { if (fail) throw Error('disk unavailable'); disk.set(key, value); },
  };
  if (id.startsWith('@/')) id = path.join(root, 'src', id.slice(2));
  return original.call(this, id, parent, main);
};
const { Game } = require('../src/game/engine.ts');
const { tutorialGame } = require('../src/game/tutorial.ts');
const { saveRun, restoreRun } = require('../src/game/runSave.ts');
const { ELEMENT_ORDER, LIGAND_ORDER } = require('../src/game/constants.ts');
const boot = async () => {
  for (const f of ['../src/store/gameStore.ts', '../src/persistence/profile.ts']) delete require.cache[require.resolve(f)];
  const store = require('../src/store/gameStore.ts').useGameStore;
  await store.getState().hydrate(); store.getState().setReducedMotion(true);
  return store;
};
const room = (element='hydrogen', ligand=null, lesson='first') => {
  const g = tutorialGame({element,ligand,lesson,complete:false}); g.mode='run'; return g;
};
(async () => {
  for (const el of ELEMENT_ORDER) for (const ligand of [null,...LIGAND_ORDER]) {
    const g = new Game(el,ligand); const saved=saveRun(g);
    const random = Math.random; Math.random = () => { throw Error('Restoration consumed RNG'); };
    let restored; try { restored=restoreRun(saved); } finally { Math.random=random; }
    assert(restored, `${el}/${ligand} restores`); assert.deepEqual(Object.keys(restored).sort(),Object.keys(g).sort(), "All engine fields restored"); assert.deepEqual(saveRun(restored), saved);
  }
  // Reopen a stationary hut without spending an action or renewing the first visit.
  for (const visits of [1, 2]) {
    const h=room('helium','fractional');h.playerPos={...h.layout.hut};h.hutVisitsThisGrid=visits;
    const turn=h.turn, discount=h.hutDiscount;
    h.openHut();assert(h.atHut);h.leaveHut();h.openHut();
    assert.equal(h.hutVisitsThisGrid,visits);assert.equal(h.hutDiscount,discount);assert.equal(h.turn,turn);
    assert(!h.usedAbilityThisTurn && !h.movedThisTurn);
    h.leaveHut();h.playerPos={x:-1,y:-1};h.openHut();assert(!h.atHut);
  }
  // Every affordable evolution preserves the paid remainder, with a two-photon floor.
  for (const ligand of [null,'fractional']) for (const kills of [0,1,2,3,8]) for (const photons of [0,1,2,3,4,5]) {
    const h=room('hydrogen',ligand);h.atHut=true;h.hutVisitsThisGrid=1;h.stageKills=kills;h.photons=photons;
    const price=h.hutPrice('evolve');if(photons<price) continue;
    h.buy('evolve');assert.equal(h.currentElement,'helium');assert.equal(h.photons,Math.max(2,photons-price));
  }
  // Forge + throw works before or after moving, including across a reload.
  for (const moved of [false,true]) {
    let c=room('carbon');c.photons=5;c.movedThisTurn=moved;
    const turn=c.turn;c.activateAbility(3);
    assert.equal(c.turn,turn);assert.equal(c.photons,2);assert(!c.usedAbilityThisTurn);assert(c.heldSpear);
    c=restoreRun(saveRun(c));assert(c);c.beginThrow();assert(c.aiming);
    c.previewAim('right');c.confirmAim();assert.equal(c.photons,2);assert.equal(c.heldSpear,null);
    assert.equal(c.turn,turn+(moved?1:0));if(!moved) assert(c.usedAbilityThisTurn);
  }
  let g=room('hydrogen'); g.activateAbility(1); g.previewAim('right');
  let restored=restoreRun(saveRun(g)); assert(restored.aiming); assert.equal(restored.aimDirection,'right');
  restored.confirmAim(); assert.equal(restored.enemies[0].tetherTurnsLeft,3);
  const target=restored.enemies[0]; restored.passTurn(); assert.equal(target.tetherTurnsLeft,2);
  restored.passTurn(); assert.equal(target.tetherTurnsLeft,1);
  restored.passTurn(); assert.equal(target.tetherTurnsLeft,0);
  g=room('hydrogen',null,'ram'); const e=g.enemies[0]; e.type='iodine';e.health=e.maxHealth=4;e.paralyzed=true;
  g.shieldPoints=2; const hp=g.elementHealth;
  g.movePlayer(1,0); assert.equal(g.elementHealth,hp);assert.equal(g.shieldPoints,2);assert.equal(e.health,2);assert(g.enemies.includes(e));
  g=room('hydrogen','exothermic','ram');g.elementHealth=g.exothermicThreshold;g.enemies[0].health=4;g.enemies[0].maxHealth=4;g.enemies[0].paralyzed=true;
  g.movePlayer(1,0);assert.equal(g.enemies[0].health,1);assert.equal(g.history.ligandCounts.exothermic,1);
  g=room('hydrogen','exothermic','ram');g.elementHealth=g.exothermicThreshold+1;g.enemies[0].health=g.enemies[0].maxHealth=4;g.enemies[0].paralyzed=true;
  g.movePlayer(1,0);assert.equal(g.enemies[0].health,2);assert.equal(g.history.ligandCounts.exothermic,0);
  // Existing freezes still shatter high-health enemies, unlike paralysis.
  g=room('hydrogen',null,'ram');g.enemies[0].health=9;g.enemies[0].maxHealth=9;g.enemies[0].frozenTurnsLeft=2;
  g.movePlayer(1,0);assert.equal(g.enemies.length,0);
  g=room('lithium');g.activateAbility(1); g.trails=[{x:3,y:3,turnsLeft:2}];g.atHut=true;
  restored=restoreRun(saveRun(g));assert.equal(restored.batteryTurnsLeft,3);assert(restored.usedAbilityThisTurn);assert(restored.atHut);assert.equal(restored.trails[0].turnsLeft,2);
  const valid=saveRun(g);
  for(const bad of [null, {}, {...valid,version:99}, {...valid,state:{...valid.state,enemies:[{}]}}, {...valid,state:{...valid.state,history:null}}, {...valid,state:{...valid.state,photons:50}}, {...valid,state:{...valid.state,layout:null}}]) assert.equal(restoreRun(bad),null);
  g=room('hydrogen','passivation','ligand');g.movePlayer(1,0);assert.equal(g.history.ligandCounts.passivation,1);assert.equal(g.history.damage[0].source,'ram');
  g=room('hydrogen','supercooled','ligand');g.movePlayer(1,0);assert.equal(g.history.damage[0].saved,true);
  g=room('hydrogen','fractional','ligand');g.movePlayer(1,0);g.buy('heal');assert.equal(g.history.ligandCounts.fractional,1);assert(g.history.milestones.some(e=>e.kind==='purchase'));
  g.photons=5;g.buy('evolve');assert(g.history.milestones.some(e=>e.kind==='evolution'));
  // Legacy profile migration and a complete app restart with a half-spent turn.
  disk.set('element-evolution/profile/v1',JSON.stringify({schemaVersion:1,quanta:37,ownedLigands:['supercooled'],equippedLigand:'supercooled',runsWon:0,runsPlayed:0,bestTotalKills:0,deepestGrid:0}));
  let store=await boot();assert.equal(store.getState().profile.quanta,37);
  store.getState().startGame(); g=store.getState().game;g.enemies=[];g.photons=4;
  store.getState().ability(1); // Aiming is preserved independently of the profile.
  await store.getState().flushSave();const saved=saveRun(store.getState().game);
  store=await boot();assert(store.getState().savedRun);store.getState().continueRun();
  assert.deepEqual(saveRun(store.getState().game),saved);assert.equal(store.getState().game.ligand,'supercooled');
  store.getState().saveAndExit();store.getState().startTutorial('carbon',null);store.getState().toMenu();await store.getState().flushSave();
  store=await boot();assert.deepEqual(saveRun(store.getState().savedRun),saved,'tutorial did not overwrite run');
  // Terminal state and reward are saved atomically even before animation finishes.
  g=room('neon',null,'hatch');g.enemies=[];store.setState({game:g,screen:'game',tutorial:null});store.getState().setReducedMotion(false);
  const balance=store.getState().profile.quanta;
  store.getState().move(1,0);assert.equal(store.getState().profile.quanta,balance+50);
  await store.getState().flushSave();assert.equal(store.getState().profile.runsWon,1);
  store=await boot();assert.equal(store.getState().savedRun,null);assert.equal(store.getState().profile.quanta,balance+50);assert.equal(store.getState().profile.runsWon,1);
  g=room('hydrogen',null,'ram');g.elementHealth=1;store.setState({game:g,screen:'game',tutorial:null});
  store.getState().move(1,0);await store.getState().flushSave();store=await boot();assert.equal(store.getState().savedRun,null);assert.equal(store.getState().profile.quanta,balance+50);assert.equal(store.getState().profile.runsPlayed,2);
  store.getState().startGame();fail=true;store.getState().passTurn();await store.getState().flushSave();assert(store.getState().saveWarning);
  fail=false;await store.getState().flushSave();store.getState().finishPlayback();
  // Corrupt active state preserves a valid profile; corrupt JSON never crashes hydration.
  const session=JSON.parse(disk.get('element-evolution/session/v1'));session.active={version:1,state:{}};disk.set('element-evolution/session/v1',JSON.stringify(session));
  store=await boot();assert.equal(store.getState().savedRun,null);assert.equal(store.getState().profile.quanta,balance+50);
  disk.set('element-evolution/session/v1','{');store=await boot();assert.equal(store.getState().savedRun,null);
  console.log('run save: 45 round trips, RNG isolation, statuses, 3-turn tether, safe paralysis rams, recap, restart, tutorial isolation, atomic 50-quanta reward and corruption recovery passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
