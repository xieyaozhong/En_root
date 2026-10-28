'use strict';
const assert = require('node:assert/strict');
const E = require('../dungeon-engine.js');
const A = require('../dungeon-arena.js');
const X = require('../dungeon-explore.js');
const AI = require('../dungeon-companion-ai.js');
const Arts = require('../dungeon-combat-arts.js');
function member(id) {
  const npc=E.NPCS[id];
  return {id,npcId:id,name:npc.name,role:npc.companionRole,sprite:npc.sprite,color:npc.color};
}
const copy = x => JSON.parse(JSON.stringify(x));
const make = seed => E.createRun({word:'magic',zh:'魔法'},true,seed);
const r=make(94);r.companions=['lantern','echo','sentinel','lumina'].map(member);
assert.equal(E.normalizeCompanions(r).length,4,'full party can include Lumina');
assert.equal(E.chooseRoute(r,'battle').ok,true);
const arena=A.ensure(r);
assert.equal(arena.companions.length,4,'four battle actors appear');
assert.deepEqual(arena.companions.map(c=>c.npcId),r.companions.map(c=>c.id));
for(let i=0;i<12;i++) A.update(r,.05,{});
assert.ok(arena.companions.every(c=>Number.isFinite(c.x)&&Number.isFinite(c.y)&&c.hp>0),'AI stays numerically valid');
assert.ok(arena.companions.every(c=>typeof c.behavior==='string'&&typeof c.trait==='string'),'every NPC has personality and behavior');
assert.ok(r.companionRng>=0,'AI is seeded independently');
const snapshot=copy(r);const fresh=A.ensure(snapshot);
assert.equal(fresh.companions.length,4);
assert.deepEqual(snapshot.companions.map(c=>[c.hp,c.trait,c.behavior]),r.companions.map(c=>[c.hp,c.trait,c.behavior]),'saved party resumes state');

const killed=arena.companions.find(c=>c.npcId==='sentinel');
assert.equal(AI.hurt(r,arena,killed,999,'測試危機',(a,k,x,y)=>{}),true);
assert.equal(r.companions.length,3,'fallen removed from roster');
assert.equal(r.fallenCompanions.length,1,'fallen death recorded');
assert.equal(E.normalizeCompanions(copy(r)).length,3,'death remains after save roundtrip');
assert.equal(AI.hurt(r,arena,killed,1,'late hit',()=>{}),false,'dead companions cannot be damaged twice');

const travel=make(257);travel.companions=['echo','sentinel'].map(member);
const room=X.ensure(travel);
assert.equal(room.companions.length,2);
for(let i=0;i<90;i++) X.update(travel,.05,{x:.3,y:.1});
assert.ok(room.companions.some(c=>['wander','explore','protect','flank','return','lost','retreat'].includes(c.behavior)));
assert.ok(room.companions.every(c=>c.x>=32&&c.x<=928&&c.y>=60&&c.y<=510),'exploring allies stay in map');
assert.equal(travel.companions.length,2);

const legacy=make(80);legacy.companions=[member('echo')];delete legacy.fallenCompanions;delete legacy.combatSchool;
E.normalizeCompanions(legacy);assert.equal(legacy.fallenCompanions.length,0);
X.ensure(legacy);assert.equal(legacy.companions[0].hp,60);
assert.equal(Arts.get(legacy).id,'ember','old runs default to ember');
for(const style of Arts.STYLES) assert.equal(Arts.select(legacy,style.id),true);
assert.equal(Arts.get(legacy).id,'astral');
const effects=[],schoolRun=make(5);Arts.select(schoolRun,'astral');
const dummy={player:{x:10,y:12,invulnerable:0},enemies:[],castHitSerial:0};
for(let i=0;i<4;i++)Arts.afterCast(schoolRun,dummy,{x:60,y:70,alive:true,kind:'chaser'}, {ok:true,damage:12},
{damage:()=>0,effect:(area,kind,x,y,extra)=>effects.push({kind,...extra}),heal:()=>2});
assert.equal(schoolRun.schoolCharges,4);assert.ok(schoolRun.player.shield>=6);assert.equal(effects.length,4);

const ffRun=make(99),actor={npcId:'sentinel',id:'test',name:'測試衛士',x:100,y:210,r:11,hp:112,maxHp:112,morale:90},victim={x:200,y:210,r:12};
ffRun.player.hp=20;const ffArea={player:victim,companions:[actor],effects:[]};
let hit=false;for(let i=0;i<120;i++)if(AI.friendlyFire(ffRun,ffArea,actor,{x:350,y:210},()=>{})){hit=true;break;}
assert.equal(hit,true,'friendly fire can actually trigger');
assert.ok(ffRun.player.hp<20&&ffRun.player.hp>=1,'friendly fire damages but cannot kill player');
assert.ok(ffRun.log.some(x=>x.includes('誤傷')),'friendly fire is reported');
console.log('PASS nextgen: four independent allies, save/migration, roaming, death, all schools, friendly fire');
