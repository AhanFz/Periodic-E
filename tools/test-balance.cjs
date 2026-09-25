const assert=require('node:assert/strict');
const {tutorialGame}=require('../.sim-out/src/game/tutorial.js');
const {saveRun,restoreRun}=require('../.sim-out/src/game/runSave.js');
const room=(element='hydrogen',ligand=null)=>tutorialGame({element,ligand,lesson:'ram',complete:false});
let g=room('hydrogen','fractional');g.atHut=true;g.hutVisitsThisGrid=1;g.photons=5;g.stageKills=99;
assert.equal(g.hutPrice('evolve'),1);g.buy('evolve');assert.equal(g.photons,4);
assert.equal(g.hutPrice('evolve'),1);g.buy('evolve');assert.equal(g.photons,3);assert(g.fractionalUsedThisGrid);
assert.equal(g.hutPrice('damageCatalyst'),3);g.buy('damageCatalyst');assert.equal(g.photons,0);assert.equal(g.history.ligandCounts.fractional,1);
g.leaveHut();g.playerPos={...g.layout.hut};g.openHut();assert.equal(g.hutDiscount,0);
g.mode='run';let restored=restoreRun(saveRun(g));assert(restored&&restored.fractionalUsedThisGrid&&restored.hutDiscount===0);
const old=saveRun(g);old.version=1;delete old.state.fractionalUsedThisGrid;assert(restoreRun(old).fractionalUsedThisGrid);
old.state.hutVisitsThisGrid=0;assert.equal(restoreRun(old).fractionalUsedThisGrid,false);
g.enterGrid();assert(!g.fractionalUsedThisGrid);assert.equal(g.hutDiscount,1);
// Refill currency externally to stress purchase limits, not to claim the bot found a farming strategy.
for(const item of ['healthCatalyst','damageCatalyst']){
 g=room();g.atHut=true;
 for(let i=0;i<20;i++){g.photons=5;g.buy(item);}
 assert.equal(item==='healthCatalyst'?g.maxHealthBonus:g.damageBonus,item==='healthCatalyst'?6:3);assert(!g.canBuy(item));
 g.enterGrid();g.atHut=true;g.photons=5;assert(!g.canBuy(item),'cap is per run, not per grid');
}
g=room('beryllium','passivation');g.shieldPoints=5;g.poisonImmune=true;g.photons=5;g.activateAbility(1);assert.equal(g.shieldPoints,5);assert(g.poisonImmune);
g.usedAbilityThisTurn=false;g.activateAbility(3);assert.equal(g.shieldPoints,5);
g.usedAbilityThisTurn=false;g.shieldPoints=1;g.photons=5;g.activateAbility(3);assert.equal(g.shieldPoints,3);
function armed(){const g=room();const e=g.enemies[0];e.armed=true;e.explodeTiles=[{...g.playerPos}];return {g,e};}
for(const status of ['paralyzed','tetherTurnsLeft']){
 const {g,e}=armed();e[status]=status==='paralyzed'?true:1;const hp=g.elementHealth;
 g.passTurn();assert(g.enemies.includes(e)&&e.armed);assert.equal(g.elementHealth,hp);
 g.passTurn();assert(!g.enemies.includes(e));assert.equal(g.elementHealth,hp-2);
}
{const {g,e}=armed();g.freezeEnemy(e,2);assert(!e.armed);assert.equal(e.explodeTiles.length,0);const hp=g.elementHealth;g.passTurn();assert.equal(g.elementHealth,hp);}
{const {g,e}=armed();e.tetherTurnsLeft=3;const old={...g.playerPos};g.playerPos={x:old.x-1,y:old.y};g.dragTethered(old);assert(e.armed);assert.deepEqual(e.explodeTiles,g.fluorineBlastTiles(e));assert(e.explodeTiles.some(p=>p.x===g.playerPos.x&&p.y===g.playerPos.y));}
console.log('balance: discount ceiling/floor/reset, paid evolution carryover, capped farming, shield preservation, fuse pause/resume/cancel/drag, and v1-save migration passed');

{const {g,e}=armed();g.photons=5;g.activateAbility(1);g.previewAim('right');g.confirmAim();assert.equal(e.tetherTurnsLeft,3);assert(e.armed,'the actual Bond ability must preserve the fuse');const hp=g.elementHealth;for(let i=0;i<3;i++){g.passTurn();assert(g.enemies.includes(e));assert.equal(g.elementHealth,hp);}g.passTurn();assert(!g.enemies.includes(e));assert.equal(g.elementHealth,hp-2);}
