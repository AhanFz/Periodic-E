// Usage after npm run sim: node tools/compare-balance.cjs <pre-change compiled tree>
// Keep the baseline tree from compiling the unmodified engine before applying a balance patch.
const fs=require('node:fs'),path=require('node:path');
const baseline=process.argv[2];if(!baseline)throw Error('Provide the pre-change compiled tree');
const engine=require('../.sim-out/src/game/engine.js');const NewGame=engine.Game;
const OldGame=require(path.resolve(baseline,'src/game/engine.js')).Game;
const {runConfig}=require('../.sim-out/sim/sim.js');
const bfs=OldGame.prototype.decideMoveDelta;
// Isolate the economy changes from shield/fuse fixes using the captured engine.
class EconomyGame extends OldGame {
 constructor(...args){super(...args);this.fractionalUsedThisGrid=false;}
 enterGrid(...args){super.enterGrid(...args);this.fractionalUsedThisGrid=false;}
}
for(const name of ['hutPrice','canBuy','buy','hutDiscount'])Object.defineProperty(EconomyGame.prototype,name,Object.getOwnPropertyDescriptor(NewGame.prototype,name));
function greedy(e){
 let dx=Math.sign(this.playerPos.x-e.x),dy=Math.sign(this.playerPos.y-e.y);
 if(e.fleeTurnsLeft>0){dx=-dx;dy=-dy;}
 if(e.type==='chlorine'&&!e.telegraph&&e.poisonCooldown<=0)return [0,0];
 if(dx===0&&dy===0)return [0,0];
 const preferX=dx!==0&&(dy===0||Math.random()>.3),first=preferX?[dx,0]:[0,dy],second=preferX?[0,dy]:[dx,0];
 if(this.canStep(e,first))return first;
 if((second[0]||second[1])&&this.canStep(e,second))return second;return [0,0];
}
function seeded(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
const results=[];const original=Math.random;
try{
 for(const variant of ['old-path-old-balance','new-path-old-balance','new-path-economy-only','new-path-new-balance']){
  OldGame.prototype.decideMoveDelta=variant.startsWith('old-path')?greedy:bfs;
  engine.Game=variant==='new-path-new-balance'?NewGame:variant==='new-path-economy-only'?EconomyGame:OldGame;
  for(const hydrogen of [false,true])for(const ligand of [null,'passivation','supercooled','fractional','exothermic']){
   const r=runConfig(ligand,600,600,hydrogen,run=>{Math.random=seeded(9252026+run);},hydrogen);
   const row={variant,policy:hydrogen?'Hydrogen / catalyst-aware':'mixed starts / evolution-first',ligand:ligand??'none',...r};results.push(row);
   console.log(JSON.stringify(row));
  }
 }
}finally{Math.random=original;engine.Game=NewGame;OldGame.prototype.decideMoveDelta=bfs;}
fs.writeFileSync('/tmp/element-balance-comparison.json',JSON.stringify(results,null,2));
