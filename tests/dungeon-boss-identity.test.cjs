'use strict';
const assert=require('node:assert/strict');
const Engine=require('../dungeon-engine.js');
const Arena=require('../dungeon-arena.js');
const Domain=require('../dungeon-boss-identity.js');
const all=Object.keys(Domain.PROFILES);
const expected=['thorn','spore','witch','prism','king','hollow','astral','cometqueen','constellation',
  'merchant','healer','smith','cartographer','ferryman','lantern','echo','sentinel','lumina'];
assert.deepEqual(all,expected,'all nine storyline bosses and nine NPC challengers have individual design');

function boss(id='witch',seed=28) {
  const run=Engine.createRun({word:'magic',zh:'魔法'},true,seed);
  run.region=1;run.encounter=11;
  run.routes=[{id:'boss',type:'boss',name:'封印首領'}];
  assert.equal(Engine.chooseRoute(run,'boss').ok,true);
  run.enemy.id=id;run.enemy.npcId=Engine.NPCS[id]?id:null;
  run.enemy.isNpcBoss=!!Engine.NPCS[id];run.enemy.name=Domain.PROFILES[id].name;run.enemy.kind='boss';
  run.arena=null;Arena.ensure(run);run.arena.introRemaining=0;run.arena.previousPhase=run.enemy.phase;
  run.player.hp=run.player.maxHp=250;run.enemy.intent.remaining=1000;
  return run;
}
function pulse(run) {
  const a=run.arena,b=a.enemies.find(e=>e.kind==='boss');
  a.bossStageClock=.01;Arena.update(run,.075,{});
  assert.equal(a.bossIdentity.pulse,1,'pulse should dispatch when boss is ready');
  assert.ok(a.hazards.some(h=>h.ownerId===b.id),'all domains must create an actual hazard');
  assert.ok(a.hazards.every(h=>h.delay>=0),'every attack has a positive warning or already active');
}
const actors=[];
for(const id of all){
  const run=boss(id,32),state=run.arena.bossIdentity;
  assert.equal(state.id,id,'arena must load correct identity');
  assert.ok(run.arena.room.identityTitle,'boss intro includes a distinct realm title');
  assert.ok(Domain.PROFILES[id].special && Domain.PROFILES[id].counter && Domain.PROFILES[id].phase2,
    'every boss has mechanics, a countermeasure and phase-two notes');
  pulse(run);
  actors.push({id,checks:run.arena.hazards.length,scenery:state.vines.length+state.decoys.length+
    state.flowers.length+state.coins.length});
}
assert.ok(new Set(actors.map(o=>o.id)).size===18);

const thorn=boss('thorn'),a=thorn.arena;
pulse(thorn);
const vine=a.bossIdentity.vines[0];
assert.equal(a.bossIdentity.vines.length,3);
assert.ok(a.hazards.some(h=>h.id===vine.hazardId && h.hexEffect==='snare' && h.terrain==='vine'));
a.player.x=vine.x;a.player.y=vine.y;
const cut=Domain.afterCast(thorn,a,{effect:()=>{}});
assert.ok(cut>=1,'successful cast dissolves nearby vines');
assert.ok(!a.hazards.some(h=>h.id===vine.hazardId),'cleared growth must not leave invisible damage');
const beforeVines=a.bossIdentity.vines.length;
const saved=JSON.parse(JSON.stringify(thorn));
assert.equal(saved.arena.bossIdentity.vines.length,beforeVines,'vine placements are save-safe');

const prism=boss('prism'),m=prism.arena,mob=m.enemies[0],initial={x:mob.x,y:mob.y};
assert.equal(m.bossIdentity.mirrors.length,4,'four real mirror positions');
m.bossIdentity.mirrorClock=0;
Domain.tick(prism,m,.1,{hazard:(area,h)=>Object.assign({id:'mirror-shot'},h),effect:()=>{}});
assert.ok(m.bossIdentity.warp && m.bossIdentity.warp.remaining>.6,'exit is visibly marked before relocation');
const exit=Object.assign({},m.bossIdentity.warp.target);
assert.ok(exit.x!==initial.x||exit.y!==initial.y);
Domain.tick(prism,m,.9,{hazard:(area,h)=>{area.hazards.push(h);return h;},effect:()=>{}});
assert.equal(m.bossIdentity.warp,null);
assert.ok(Math.hypot(mob.x-exit.x,mob.y-exit.y)<1,'boss actually exits the marked mirror');
assert.ok(mob.counterWindow>=.7,'the exit offers a learnable punish window');

const floral=boss('lumina'),f=floral.arena;
pulse(floral);const flower=f.bossIdentity.flowers.find(o=>!o.used);
assert.ok(flower);
floral.player.hp=floral.player.maxHp-30;
f.player.x=flower.x;f.player.y=flower.y;flower.ready=0;
Domain.tick(floral,f,.1,{heal:Engine.healPlayer,effect:()=>{}});
assert.equal(floral.player.hp,floral.player.maxHp-23,'standing in the bright moonflower heals seven');
assert.equal(flower.used,true,'flower can only be used once');

const shop=boss('merchant'),s=shop.arena;
pulse(shop);const coin=s.bossIdentity.coins.find(o=>!o.used);assert.ok(coin);
s.player.x=coin.x;s.player.y=coin.y;coin.ready=0;
Domain.tick(shop,s,.1,{effect:()=>{}});
assert.ok(shop.player.shield>=7,'merchant contract token can be collected');
assert.equal(coin.used,true);

const shadow=boss('echo'),ech=shadow.arena;
Domain.tick(shadow,ech,.5,{});
ech.player.x=300;ech.player.y=360;
Domain.tick(shadow,ech,.5,{});
pulse(shadow);
assert.ok(ech.bossIdentity.decoys.length>=1,'echo boss replays earlier positions');

const map=boss('cartographer'),area=map.arena;
pulse(map);
const protectedLane=area.bossIdentity.safeLane;
assert.ok(protectedLane>=0&&protectedLane<4);
assert.equal(area.hazards.filter(h=>h.source==='boss'&&h.kind==='rect'&&h.w===816).length,3,
  'the cartographer protects a single readable corridor');

console.log('PASS all 18 boss profiles, terrain attacks, vine clearing, save state, warning-then-mirror teleport, healing flowers, contract coins, echoes and map lane');
