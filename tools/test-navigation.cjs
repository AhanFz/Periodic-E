const assert=require('node:assert/strict');
const {Game}=require('../.sim-out/src/game/engine.js');
function chamber(bonded=false){
 const g=new Game('nitrogen');const e={...g.enemies[0],type:'bromine',x:3,y:4,bonded,x2:bonded?3:null,y2:bonded?5:null,health:bonded?6:3,maxHealth:bonded?6:3,frozenTurnsLeft:0,paralyzed:false,encasedTurnsLeft:0,tetherTurnsLeft:0,fleeTurnsLeft:0,armed:false,telegraph:false,bondingWith:null};
 g.gridSize=6;g.layout={...g.layout,size:6,passable:Array.from({length:6},(_,y)=>Array.from({length:6},(_,x)=>y!==3||x===0)),start:{x:3,y:1},hut:{x:4,y:1},hatch:{x:0,y:5}};
 g.playerPos={x:3,y:1};g.enemies=[e];g.sheets=[];g.scorchedTiles=[];g.trails=[];g.polarity.active=false;return {g,e};
}
for(const bonded of [false,true]){
 const {g,e}=chamber(bonded);g.planMove(e);assert.equal(e.plannedDx,-1,'take the detour toward the left edge');
 const hp=g.elementHealth;let steps=0;
 while(g.elementHealth===hp&&steps++<18){g.resolveMove(e);for(const t of g.enemyTiles(e))assert(g.isPassable(t.x,t.y),'never cross a void');}
 assert(g.elementHealth<hp,`the ${bonded?'bonded':'single'} halogen reaches the player`);
}
// Frozen bodies close a corridor; thaw/removal opens a route. Planning does not move actors.
{
 const {g,e}=chamber();g.enemies.push({...e,id:999,x:0,y:3,frozenTurnsLeft:2});const before=JSON.stringify(e);assert.deepEqual(g.decideMoveDelta(e),[0,0]);assert.equal(JSON.stringify(e),before);
 g.enemies.pop();assert.deepEqual(g.decideMoveDelta(e),[-1,0]);
}
// An actually disconnected board fails gracefully, without hopping or searching forever.
{
 const {g,e}=chamber();g.layout.passable[3][0]=false;assert.deepEqual(g.decideMoveDelta(e),[0,0]);
}
// Horizontal molecules cannot fit a single-cell vertical corridor without rotating.
{
 const {g,e}=chamber(true);e.x2=4;e.y2=4;assert.deepEqual(g.decideMoveDelta(e),[0,0]);
}
// Nitrogen standing on scorched ground must still be attackable under the existing contact rule.
{
 const {g,e}=chamber();g.scorchedTiles=[{...g.playerPos,turnsLeft:2}];assert.notDeepEqual(g.decideMoveDelta(e),[0,0]);
}
console.log('navigation: screenshot detour, bonded footprints, blockers, disconnected routes and scorched-player contact passed');

// Visible feedback reports actual HP/shield losses and respects the photon cap.
{
 const {g}=chamber();g.shieldPoints=2;const hp=g.elementHealth;g.damagePlayer(3,'contact');
 const fx=g.pendingEffects.find(f=>f.feedback==='damage');assert.equal(fx.amount,1);assert.equal(fx.shield,2);assert.equal(g.elementHealth,hp-1);
 g.pendingEffects=[];g.photons=5;g.batteryTurnsLeft=1;g.tickBattery();assert(!g.pendingEffects.some(f=>f.type==='photon'));assert(g.message.includes('+0 photons'));
}
// Both armed attacks give a wind-up before their effect; freeze cancels the prepared attack.
{
 const {g,e}=chamber();e.type='chlorine';e.telegraph=true;e.telegraphTiles=[{...g.playerPos}];let windup=false;
 g.onFrame=(label,motion)=>{if(motion?.kind==='windup'){windup=true;assert.equal(g.poisonZones.length,0);}};g.actChlorine(e);assert(windup);
 g.freezeEnemy(e,2);assert(!e.telegraph&&!e.armed);
}
console.log('feedback: actual shield/HP losses, capped photon feedback and attack wind-up passed');
