'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Engine = require('../dungeon-engine.js');
const Arena = require('../dungeon-arena.js');

// Validate drawing contracts and state balance with a recording Canvas context.
// Pixel appearance, clipping and text layout still require real browser visual QA.
class Context {
  constructor() { this.depth = 0; this.calls = []; }
  save() { this.depth++; }
  restore() { assert.ok(this.depth > 0, 'restore always has a matching save'); this.depth--; }
  record(name, args) {
    for (const arg of args) if(typeof arg === 'number') assert.ok(Number.isFinite(arg), name + ' receives finite coordinates');
    this.calls.push({name,args});
  }
}
for (const name of ['fillRect','clearRect','beginPath','closePath','moveTo','lineTo','fill','stroke','ellipse','arc','rect',
  'setTransform','translate','scale','rotate','drawImage','setLineDash','quadraticCurveTo','bezierCurveTo','fillText']) {
  Context.prototype[name] = function(...args) { this.record(name,args); };
}
function canvas() { const context = new Context(); return {width:0,height:0,style:{},getContext:() => context}; }
const window = {}, document = {createElement: name => {assert.equal(name,'canvas'); return canvas();}};
const sandbox = {window,document};
for(const file of ['dungeon-renderer.js','dungeon-arena-renderer.js']) vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),sandbox);
const surface = canvas(), renderer = new window.DungeonArenaRenderer(surface), ctx = surface.getContext();
assert.equal(surface.width,960); assert.equal(surface.height,540);
renderer.draw({run:null},0); assert.equal(ctx.depth,0);
const sample = seed => {
  const run = Engine.createRun({word:'robot',rarity:'N'},true,seed);
  Engine.chooseRoute(run,'battle'); Arena.ensure(run); return run;
};
let spring;
for(let seed=0;seed<100;seed++) { const run=sample(seed); if(run.arena.room.spring) {spring=run; break;} }
assert.ok(spring,'fixture contains a real healing room');
ctx.calls=[]; renderer.draw({run:spring},1000);
assert.ok(ctx.calls.some(call => call.name==='arc' && call.args[0]===480 && call.args[1]===280 && call.args[2]===48),
  'healing pool boundary uses the exact gameplay center and radius');
assert.ok(ctx.calls.some(call => call.name==='fillText' && call.args[0]==='回復靈泉'),'healing pool is labelled');
assert.equal(ctx.depth,0);

const spriteIds=['slime','eye','mushroom','bat','raven','ghost','knight','spider','skeleton','thorn','witch','king'];
let frames=0;
for(let region=0;region<3;region++) {
  for(const sprite of spriteIds) {
    const run=sample(31); run.region=region;
    const boss=['thorn','witch','king'].includes(sprite);
    run.arena.enemies[0].sprite=sprite;run.arena.enemies[0].kind=boss?'boss':'chaser';run.arena.enemies[0].phase=2;
    run.arena.player.dashTime=.1;run.arena.player.invulnerable=.2;
    run.arena.hazards=[
      {kind:'circle',x:480,y:280,r:48,delay:.5,maxDelay:1,life:.3},
      {kind:'ring',x:550,y:200,r:65,innerR:40,delay:0,life:.3},
      {kind:'line',x:200,y:100,x2:700,y2:400,width:12,delay:.5,life:.3},
      {kind:'rect',x:200,y:300,w:300,h:40,delay:0,life:.3},
      {kind:'cone',x:700,y:320,r:75,angle:0,spread:1,delay:.5,life:.3}
    ];
    run.arena.effects=['cast','chain','dash','spawn','death','heal'].map((kind,i)=>({id:i,kind,x:300,y:280,x2:500,y2:200,r:30,life:.3,maxLife:.5}));
    run.arena.projectiles=[{x:400,y:180,r:6,vx:100,vy:10,source:'enemy'}];
    renderer.draw({run,paused:false,reducedMotion:frames%2===0},1000+frames++*16);
    renderer.burst('damage'); assert.equal(ctx.depth,0,'complete frame balances canvas state');
  }
}
renderer.draw({run:spring,paused:true,reducedMotion:true},2000); assert.equal(ctx.depth,0);

const explorationObjects=[
  {id:'route-battle',kind:'door',routeType:'battle',name:'交錯古道',icon:'⚔',x:210,y:210,r:30,interactionRadius:85,color:'#a2dab1'},
  {id:'reward-relic',kind:'reward',rewardKind:'relic',name:'旅人的遺物',x:480,y:210,r:24,interactionRadius:85},
  {id:'camp-rest',kind:'camp',name:'星燈休息',x:750,y:210,r:24,interactionRadius:85},
  {id:'merchant',kind:'merchant',npcId:'merchant',name:'契約商人',x:210,y:370,r:24,interactionRadius:85},
  {id:'healer',kind:'npc',npcId:'healer',name:'荊棘藥師',x:480,y:370,r:24,interactionRadius:85},
  {id:'exit',kind:'exit',name:'繼續旅途',x:750,y:370,r:30,interactionRadius:85}
];
const explorationRun=sample(11);
explorationRun.exploration={key:'test-crossroads',width:960,height:540,player:{x:212,y:276,r:12,facingX:1,dashTime:0,dashCooldown:0},objects:explorationObjects,obstacles:[],nearbyId:'route-battle',dialogId:null};
for(const status of ['route','shop','npc','camp','reward']){
  explorationRun.status=status;ctx.calls=[];renderer.draw({run:explorationRun},2100+frames++*16);
  assert.equal(ctx.depth,0,'exploration frame balances canvas state');
  assert.ok(ctx.calls.some(call=>call.name==='translate'&&call.args[0]===212&&call.args[1]===276),'exploration uses the actual movable player position');
  assert.ok(ctx.calls.some(call=>call.name==='arc'&&call.args[0]===210&&call.args[1]===210&&call.args[2]===85),'interaction circle uses the gameplay radius');
  assert.equal(ctx.calls.filter(call=>call.name==='fillText'&&call.args[0]==='E 互動').length,1,'only the nearby object receives a key prompt');
  for(const object of explorationObjects) assert.ok(ctx.calls.some(call=>call.name==='fillText'&&call.args[0]===object.name),'interactable labels are drawn');
  assert.ok(!ctx.calls.some(call=>call.name==='translate'&&call.args[0]===Math.round(explorationRun.arena.player.x)&&call.args[1]===Math.round(explorationRun.arena.player.y)),
    'stale combat arena is not drawn over the exploration scene');
}
explorationRun.exploration.nearbyId=null;ctx.calls=[];renderer.draw({run:explorationRun},2300);
assert.equal(ctx.calls.filter(call=>call.name==='fillText'&&call.args[0]==='E 互動').length,0,'distant objects do not advertise an unavailable interaction');
explorationRun.exploration.dialogId='merchant';ctx.calls=[];renderer.draw({run:explorationRun,paused:true,reducedMotion:true},2400);
assert.equal(ctx.calls.filter(call=>call.name==='fillText'&&call.args[0]==='交談中').length,1,'open conversation is visibly identified');
assert.equal(ctx.depth,0);

const npcIds=['merchant','healer','smith','cartographer','ferryman'],npcCalls=[],npcDraw=renderer.npc;
renderer.npc=function(...args){npcCalls.push({id:args[1],boss:args[5],phase:args[6]});return npcDraw.apply(this,args);};
const signatures=new Set();
for(const npcId of npcIds){
  explorationRun.status='npc';explorationRun.exploration.key='npc-'+npcId;
  explorationRun.exploration.objects=[{id:npcId,kind:'npc',npcId,name:npcId,x:480,y:250,r:24,interactionRadius:85}];
  explorationRun.exploration.nearbyId=npcId;explorationRun.exploration.dialogId=null;
  ctx.calls=[];renderer.draw({run:explorationRun,reducedMotion:true},2500+frames++*16);assert.equal(ctx.depth,0);
  assert.ok(npcCalls.some(call=>call.id===npcId&&!call.boss),'friendly NPC uses its own sprite');
  signatures.add(JSON.stringify(ctx.calls.filter(call=>['fillRect','moveTo','lineTo'].includes(call.name))));
  const bossRun=sample(13);bossRun.arena.enemies=[{id:'npc-'+npcId,npcId,sprite:npcId,kind:'boss',x:650,y:250,r:34,hp:100,maxHp:100,phase:2,active:true}];
  bossRun.arena.targetId='npc-'+npcId;
  renderer.draw({run:bossRun,reducedMotion:frames%2===0},2600+frames++*16);assert.equal(ctx.depth,0);
  assert.ok(npcCalls.some(call=>call.id===npcId&&call.boss&&call.phase===2),'NPC battle renders the matching enlarged angry silhouette');
}
assert.equal(signatures.size,5,'five NPCs have distinct pixel silhouettes');
// Every reward prop, training option and a dashing exploration player is drawable.
explorationRun.status='reward';explorationRun.exploration.key='loot';explorationRun.exploration.player.dashTime=.12;
explorationRun.exploration.objects=['item','supply','upgrade'].map((rewardKind,i)=>({id:rewardKind,kind:'reward',rewardKind,name:rewardKind,x:220+i*260,y:240,interactionRadius:85}));
explorationRun.exploration.objects.push({id:'camp-train',kind:'camp',name:'訓練',x:480,y:380,interactionRadius:85});
renderer.draw({run:explorationRun},3000);renderer.draw({run:explorationRun},3016);assert.equal(ctx.depth,0);
console.log('Renderer checks passed: healing radius, 12 enemy sprites across 3 regions, 5 hazards, 6 effects, exploration player and proximity prompts, five distinct NPCs and matching Boss forms, loot/camp props, reduced motion, balanced Canvas state.');
