'use strict';
const assert=require('node:assert/strict');
const E=require('../dungeon-engine.js');
const A=require('../dungeon-arena.js');
const D=require('../dungeon-boss-disruption.js');
function run(seed=19){
  const s=E.createRun({word:'magic',zh:'魔法'},true,seed);
  s.encounter=5;s.region=0;s.routes=[{id:'boss',type:'boss',name:'測試首領'}];
  assert.equal(E.chooseRoute(s,'boss').ok,true);
  A.ensure(s);s.arena.introRemaining=0;
  s.player.hp=s.player.maxHp=2000;
  return s;
}
for(const id of ['thorn','spore','witch','prism','king','hollow','astral','cometqueen','constellation']){
  assert.ok(D.BOSS_STYLES[id],id+' has a distinct spell disruption style');
}
const r=run(15),a=r.arena,boss=a.enemies[0];
const type=D.forBoss(r);
a.bossStageClock=0;a.roomPulse=0;boss.action=null;boss.counterWindow=0;r.enemy.intent.remaining=1000;
A.update(r,.05,{});
const mark=a.hazards.find(h=>h.disruption);
assert.ok(mark&&mark.disruption===type,'stage creates a telegraphed interference hitbox');
assert.ok(mark.delay>=1.5 && mark.damage===0,'interference has reaction time and no hidden HP damage');
for(let i=0;i<38;i++) A.update(r,.05,{});
assert.ok(a.disruptionSerial>=1,'standing in warning causes interference');
assert.equal(D.active(r).kind,type,'status belongs to current boss');
const saved=JSON.parse(JSON.stringify(r));
assert.equal(D.active(saved).kind,type,'remaining effect survives serialization');
for(let i=0;i<120;i++) if(r.status==='combat')A.update(r,.05,{});
assert.equal(D.active(r),null,'status expires without consuming the underlying spell');

const thief=run(18),t=thief.arena;
// Keep the original arena key stable while exercising the theft status directly.
const originalWord=thief.spell.word;
assert.equal(D.apply(thief,t,'steal',()=>{},()=>{}),true);
assert.equal(D.blocksCast(thief),true);
assert.equal(A.cast(thief,originalWord).reason,'stolen','stolen spell cannot be cast');
D.tick(thief,t,6);
assert.equal(D.blocksCast(thief),false);
assert.equal(thief.spell.word,originalWord,'boss never deletes permanent spell data');
assert.ok(['magic','rune','spark',originalWord].includes(thief.spell.word)||thief.spell.word.length>0);
const ritual=run(60),ra=ritual.arena;
ra.ritual={status:'charging',remaining:5};
assert.equal(D.apply(ritual,ra,'sever',()=>{},()=>{}),false,'ritual is not corrupted by ordinary disruption');
ra.ritual=null;
assert.equal(D.apply(ritual,ra,'sever',()=>{},()=>{}),true);
assert.equal(ra.lastDisruption.kind,'sever');
assert.ok(ra.disruptionSerial>=1);
D.tick(ritual,ra,3);
assert.equal(D.active(ritual),null);
const dodgeRun=run(87),da=dodgeRun.arena;
da.hazards.push({id:'evade-test',source:'boss',kind:'circle',disruption:'sever',
  x:da.player.x,y:da.player.y,r:150,delay:0,life:.4,hit:false,damage:0});
da.player.dashTime=.2;da.player.dashX=1;da.player.dashY=0;da.player.invulnerable=.24;
A.update(dodgeRun,.05,{});
assert.equal(D.active(dodgeRun),null,'active dash evades a spell disruption');
assert.ok(da.hazards.some(h=>h.id==='evade-test'&&h.hit),'dodge resolves the hitbox only once');
console.log('PASS boss disruption: warning, hit, dash counterplay, serialization, expiry, ritual priority, temporary theft');
