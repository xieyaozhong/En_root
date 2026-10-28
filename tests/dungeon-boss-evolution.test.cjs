'use strict';
const assert=require('node:assert/strict');
const Engine=require('../dungeon-engine.js');
const Arena=require('../dungeon-arena.js');
const Explore=require('../dungeon-explore.js');
const Evolve=require('../dungeon-boss-evolution.js');

function boss(id='witch',seed=28){
  const run=Engine.createRun({word:'magic',zh:'魔法'},true,seed);
  run.region=1;run.encounter=11;
  run.routes=[{id:'boss',type:'boss',name:'測試封印首領'}];
  assert.equal(Engine.chooseRoute(run,'boss').ok,true);
  run.enemy.id=id;run.enemy.npcId=null;run.enemy.name=id;run.enemy.kind='boss';
  run.arena=null;Arena.ensure(run);
  run.arena.introRemaining=0;
  run.arena.previousPhase=run.enemy.phase;
  run.enemy.intent.remaining=1000;
  run.arena.bossStageClock=1000;
  run.player.hp=run.player.maxHp;
  return run;
}
const duel=boss('king',99),king=duel.arena.enemies[0];
const originalX=king.x;king.x=500;king.y=280;duel.arena.player.x=180;duel.arena.player.y=280;
Arena.update(duel,.05,{});
assert.ok(king.x<500 && 500-king.x>=14,'melee pursuer closes in at high speed');
assert.ok(Evolve.isMelee(duel),'king uses melee archetype');

for(const id of ['witch','spore','hollow','astral','cometqueen','constellation','echo','merchant','healer']){
  assert.ok(Evolve.STYLES[id],id+' has own spell incantation');
}
const mage=boss('witch',18),area=mage.arena,caster=area.enemies[0];
mage.enemy.intent.remaining=0;
Arena.update(mage,.05,{});
assert.ok(area.bossChant && area.bossChant.word==='mirror','boss word bar has a real incantation');
assert.ok(area.hazards.some(h=>h.source==='boss' && (h.w>=285||h.r>=200||h.width>=62)),
  'caster has clearly warned wide area damage spells');
assert.ok(area.bossChant.duration>=1.4,'spell has meaningful windup');

const solo=boss('spore',40),space=solo.arena,spore=space.enemies[0];
const hpBefore=solo.enemy.hp;
const summoned=Evolve.summon(solo,space,spore,{place:()=>{},effect:()=>{}});
assert.equal(summoned,2);
const adds=space.enemies.filter(e=>e.summoned);
assert.equal(adds.length,2);
assert.ok(adds.every(e=>e.alive && e.hp>0));
assert.equal(space.enemies.reduce((sum,e)=>sum+e.hp,0),solo.enemy.hp,
  'summon HP is included in combat aggregate to avoid invisible shared life');
assert.ok(solo.enemy.hp>hpBefore);
for(let i=0;i<10;i++)Evolve.summon(solo,space,spore,{place:()=>{},effect:()=>{}});
assert.ok(space.enemies.filter(e=>e.summoned && e.alive).length<=3,'no unlimited live summon stacking');

const same=boss('witch',14),a=same.arena,c=a.enemies[0];
c.x=300;c.y=280;a.player.x=220;a.player.y=280;
c.action={kind:'spell',stage:'windup',duration:2,elapsed:0};
Evolve.start(same,a,c);
same.spell={word:'ward',name:'符文守護',zh:'防護',type:'shield',power:10,elapsed:0};
const result=Arena.cast(same,'ward');
assert.equal(result.ok,true);assert.equal(result.clash,true,'matching spell type triggers spell duel');
assert.ok(a.spellClash);const required=a.spellClash.needed;
for(let i=0;i<required;i++)assert.equal(Arena.mashClash(same).ok,true);
Arena.update(same,.05,{});
assert.equal(a.lastClash.won,true);
assert.equal(a.spellClash,null);
assert.ok(c.counterWindow>0,'winner exposes boss to counters');

const mismatch=boss('witch',15),m=mismatch.arena,b=m.enemies[0];
b.action={kind:'spell',stage:'windup',duration:2};
Evolve.start(mismatch,m,b);
assert.equal(Evolve.beginClash(mismatch,m,b,'attack',()=>{}),null,'different spell schools do not clash');

const needle=boss('witch',88),n=needle.arena,enemy=n.enemies[0];
needle.inventory.push({...Engine.ITEMS.spellbreaker,count:1});
assert.equal(Arena.useItem(needle,'spellbreaker').ok,false,'cannot waste item outside boss casting');
assert.equal(needle.inventory.at(-1).count,1);
enemy.action={kind:'spell',stage:'windup',duration:2};
n.hazards.push({id:'boss-hazard',source:'boss',ownerId:enemy.id,life:3,delay:1.1});
assert.equal(Arena.useItem(needle,'spellbreaker').ok,true);
assert.equal(needle.inventory.at(-1).count,0);
assert.equal(enemy.action,null);
assert.ok(enemy.counterWindow>=3);
assert.equal(n.hazards.some(h=>h.id==='boss-hazard'),false);

let lucky;
for(let seed=0;seed<70;seed++){
  const run=Engine.createRun(null,true,seed);
  run.status='event';run.eventRoom={id:'letter',encounter:run.encounter};
  if(Engine.getEncounterEvent(run).choices.some(x=>x.id==='spellbreaker')){lucky=run;break;}
}
assert.ok(lucky,'exploration eventually reveals the spellbreaker');
assert.equal(Engine.chooseEvent(lucky,'spellbreaker').ok,true);
assert.ok(lucky.inventory.some(x=>x.id==='spellbreaker'&&x.count===1));

const visitorIds=['merchant','healer','smith','cartographer','ferryman','lantern','echo','sentinel','lumina'];
const positions=[];
for(const id of visitorIds){
  const run=Engine.createRun(null,true,30);run.status=id==='merchant'?'shop':'npc';
  run.npc={id,encounter:0,helped:false,defeated:false};
  const room=Explore.ensure(run),p=room.objects.find(x=>x.npcId===id);
  if(!p)continue;
  const before=[p.x,p.y];
  for(let i=0;i<25;i++)Explore.update(run,.08,{});
  const after=Explore.ensure(run).objects.find(x=>x.npcId===id);
  assert.ok(after && Number.isFinite(after.x) && Number.isFinite(after.y));
  positions.push({id,before,after:[after.x,after.y]});
}
assert.ok(positions.length>=8,'every overworld NPC has live behavior');
assert.ok(new Set(positions.map(x=>x.after.join(','))).size>=5,'NPC patrol trajectories differ');
console.log('PASS boss evolution: ultra-fast melee, large magic, summon cap, spell clashes, break-needle exploration, visitor AI');
