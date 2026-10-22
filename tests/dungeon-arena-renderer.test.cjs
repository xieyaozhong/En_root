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
  constructor() { this.depth = 0; this.calls = []; this.globalAlpha=1; this.states=[]; }
  save() { this.depth++; this.states.push({globalAlpha:this.globalAlpha,fillStyle:this.fillStyle,strokeStyle:this.strokeStyle}); }
  restore() { assert.ok(this.depth > 0, 'restore always has a matching save'); this.depth--; Object.assign(this,this.states.pop()); }
  record(name, args) {
    for (const arg of args) if(typeof arg === 'number') assert.ok(Number.isFinite(arg), name + ' receives finite coordinates');
    assert.ok(Number.isFinite(this.globalAlpha)&&this.globalAlpha>=0&&this.globalAlpha<=1,'draw opacity is finite and valid');
    this.calls.push({name,args,alpha:this.globalAlpha,color:this.fillStyle});
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

const npcIds=['merchant','healer','smith','cartographer','ferryman','lantern','echo','sentinel'],npcCalls=[],npcDraw=renderer.npc;
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
assert.equal(signatures.size,8,'eight NPCs have distinct pixel silhouettes');
// Every reward prop, training option and a dashing exploration player is drawable.
explorationRun.status='reward';explorationRun.exploration.key='loot';explorationRun.exploration.player.dashTime=.12;
explorationRun.exploration.objects=['item','supply','upgrade'].map((rewardKind,i)=>({id:rewardKind,kind:'reward',rewardKind,name:rewardKind,x:220+i*260,y:240,interactionRadius:85}));
explorationRun.exploration.objects.push({id:'camp-train',kind:'camp',name:'訓練',x:480,y:380,interactionRadius:85});
renderer.draw({run:explorationRun},3000);renderer.draw({run:explorationRun},3016);assert.equal(ctx.depth,0);

const companionRun=sample(36);
const companions=['lantern','echo','sentinel'].map((npcId,i)=>({id:'companion-'+npcId,npcId,x:180+i*42,y:340,r:11,name:'同行者・'+npcId,color:'#b1e6e7'}));
companionRun.arena.companions=companions;
companionRun.arena.effects=[{id:'echo-cast',kind:'companion-cast',fromX:221,fromY:341,targetX:651,targetY:281,spellWord:'frost',spellType:'attack',life:.6,maxLife:.6}];
ctx.calls=[];renderer.draw({run:companionRun,reducedMotion:true},3100);
assert.equal(ctx.depth,0);
for(const ally of companions)assert.ok(ctx.calls.some(call=>call.name==='fillText'&&call.args[0]==='◆ '+ally.npcId),'each follower carries a friendly nameplate');
assert.ok(ctx.calls.some(call=>call.name==='moveTo'&&call.args[0]===221&&call.args[1]===321),'echo starts at the companion, not player or origin');
assert.ok(ctx.calls.some(call=>call.name==='lineTo'&&call.args[0]===651&&call.args[1]===261),'echo reaches its actual spell target');
assert.ok(ctx.calls.some(call=>call.name==='fillText'&&call.args[0]==='回聲'),'a copied spell is identified');
companionRun.status='route';companionRun.exploration={key:'allies',player:{x:480,y:400,r:12},objects:[],obstacles:[],companions};
ctx.calls=[];renderer.draw({run:companionRun,reducedMotion:true},3116);
for(const ally of companions)assert.ok(ctx.calls.some(call=>call.name==='fillText'&&call.args[0]==='◆ '+ally.npcId),'companions remain visible during exploration');

// New environmental dressing is distinctive, but never changes or substitutes for damage geometry.
const roomRun=sample(44),roomSignatures=new Set();roomRun.arena.effects=[];
const hazard={kind:'line',x:111,y:145,x2:822,y2:377,width:32,delay:.8,life:.3};roomRun.arena.hazards=[hazard];
const untouchedHazard=JSON.stringify(hazard);
for(const id of ['tempest','meteor','mirrors','eclipse']){
  roomRun.arena.room={id};ctx.calls=[];renderer.draw({run:roomRun,reducedMotion:true},3200);
  roomSignatures.add(JSON.stringify(ctx.calls));assert.equal(JSON.stringify(hazard),untouchedHazard,'art does not mutate trap geometry');assert.equal(ctx.depth,0);
}
assert.equal(roomSignatures.size,4,'four new room themes have different visible decoration');
const palette={light:'#d7f4e5',glow:'#8ecabb',void:'#101929',hot:'#f7b6a3'};
const spellSignatures=new Set(),spellGeometry=new Map();
const skillFixtures=[['attack','fire'],['attack','frost'],['attack','storm'],['attack','wind'],['attack','rune'],['signature','robot'],['heal','bloom'],['shield','ward']];
const geometry=calls=>JSON.stringify(calls.map(({name,args})=>({name,args})));
// Ownership markers are compact symbols below the feet, never a false hitbox or
// an attack-radius ring. Only the live player receives the facing marker.
const markerActor={x:320,y:280,r:12,facingX:1,facingY:0},markerBefore=JSON.stringify(markerActor);
const facingMarks=new Set();
for(const [facingX,facingY] of [[1,0],[-1,0],[0,1],[0,-1],[1,1]]){
  ctx.calls=[];renderer.actorMarker(ctx,{...markerActor,facingX,facingY});facingMarks.add(geometry(ctx.calls));
  assert.ok(ctx.calls.length<35,'one ownership marker needs only a few bounded Canvas commands');
  assert.ok(!ctx.calls.some(call=>['ellipse','arc'].includes(call.name)),'ownership marks never imply a circular gameplay boundary');
  for(const call of ctx.calls.filter(call=>['moveTo','lineTo'].includes(call.name))){
    assert.ok(Math.abs(call.args[0]-320)<=19&&call.args[1]>=280&&call.args[1]<=298,'facing marker stays in a compact footprint below the player');
  }
  assert.equal(ctx.depth,0);
}
assert.equal(facingMarks.size,5,'a small arrow distinguishes cardinal and diagonal facing directions');
assert.equal(JSON.stringify(markerActor),markerBefore,'markers never change player position, facing or radius');
ctx.calls=[];renderer.actorMarker(ctx,markerActor,'ally');const allyMark=geometry(ctx.calls);
assert.ok(!facingMarks.has(allyMark),'followers use a diamond distinct from the player compass');
ctx.globalAlpha=.23;ctx.calls=[];renderer.actorMarker(ctx,markerActor);
assert.ok(ctx.calls.every(call=>call.alpha<=.23),'player marker respects inherited transparency');assert.equal(ctx.globalAlpha,.23);
ctx.calls=[];renderer.companion(ctx,{...markerActor,npcId:'lantern'},palette,0,true);
assert.ok(ctx.calls.every(call=>call.alpha<=.23),'ally shadow, marker, model, glow and label respect inherited transparency');assert.equal(ctx.globalAlpha,.23);
ctx.globalAlpha=1;
const markerMethod=renderer.actorMarker,markerCalls=[];
renderer.actorMarker=function(...args){markerCalls.push({kind:args[2]||'player',x:args[1].x,y:args[1].y});return markerMethod.apply(this,args);};
const markerRun=sample(71);markerRun.arena.player.dashTime=.12;markerRun.arena.companions=[{...markerActor,npcId:'echo'}];
renderer.draw({run:markerRun},3260);markerCalls.length=0;renderer.draw({run:markerRun},3276);
assert.equal(markerCalls.filter(call=>call.kind==='player').length,1,'dash afterimages cannot duplicate the live player marker');
assert.equal(markerCalls.filter(call=>call.kind==='ally').length,1,'one companion has one ally marker');
markerCalls.length=0;renderer.foe(ctx,{id:'slime',x:400,y:300,hp:10},palette,0,true,0);
assert.equal(markerCalls.length,0,'enemies never inherit friendly ownership marks');
renderer.actorMarker=markerMethod;
// Character poses are read-only visual state. Focusing raises the staff without
// moving the player, changing the collision radius or animating reduced motion.
const poseRun=sample(72),poseActor=poseRun.arena.player;
ctx.calls=[];renderer.mage(ctx,poseActor,palette,0,true,poseRun);const idleMage=geometry(ctx.calls);
poseRun.arena.focusActive=true;const focusedState=JSON.stringify(poseRun);
ctx.calls=[];renderer.mage(ctx,poseActor,palette,0,true,poseRun);const castingMage=geometry(ctx.calls);
assert.notEqual(castingMage,idleMage,'chanting has a distinct raised-staff pose');
assert.equal(JSON.stringify(poseRun),focusedState,'drawing a casting pose never changes the player or run');
ctx.calls=[];renderer.mage(ctx,poseActor,palette,99,true,poseRun);
assert.equal(geometry(ctx.calls),castingMage,'reduced motion keeps the mage pose still');
assert.ok(ctx.calls.length<500,'layered mage stays within a bounded mobile rendering budget');
const beastGeometry=new Set();
for(const id of ['bat','raven','ghost']){
  ctx.calls=[];renderer.legacy.enemy.call(renderer.legacy,ctx,0,0,{id},0,palette,true,0);const first=geometry(ctx.calls);
  beastGeometry.add(first);ctx.calls=[];renderer.legacy.enemy.call(renderer.legacy,ctx,0,0,{id},99,palette,true,0);
  assert.equal(geometry(ctx.calls),first,'reduced motion freezes '+id+' wings and body geometry');
}
assert.equal(beastGeometry.size,3,'bat membranes, raven feathers and ghost shroud have distinct silhouettes');
for(const id of ['slime','eye','bat','raven','ghost','knight','thorn','witch','king']){
  const boss=['thorn','witch','king'].includes(id);ctx.globalAlpha=.24;ctx.calls=[];
  renderer.legacy.enemy.call(renderer.legacy,ctx,0,0,{id,boss},0,palette,true,0);
  assert.ok(ctx.calls.every(call=>call.alpha<=.24),'spawn/death opacity survives all '+id+' material and glow details');
  assert.equal(ctx.globalAlpha,.24,'sprite restores its caller opacity');assert.equal(ctx.depth,0);
}
ctx.globalAlpha=1;
for(const [spellType,spellWord] of skillFixtures){
  ctx.calls=[];renderer.effect(ctx,{kind:'cast',x:210,y:275,x2:630,y2:310,spellType,spellWord,life:.4,maxLife:.6},palette,0,true);
  spellSignatures.add(JSON.stringify(ctx.calls));spellGeometry.set(spellWord,geometry(ctx.calls));assert.equal(ctx.depth,0);
  assert.ok(ctx.calls.length<400,'one skill uses a bounded number of primitive drawing commands');
  assert.ok(!ctx.calls.some(call=>call.name==='fillRect'&&call.args[2]>80&&call.args[3]>80),'skills never use a screen-covering flash or filled panel');
  let filledPath=[];
  for(const call of ctx.calls){
    if(call.name==='beginPath')filledPath=[];
    if(call.name==='moveTo'||call.name==='lineTo')filledPath.push(call.args);
    if(call.name==='fill'&&filledPath.length){
      const xs=filledPath.map(point=>point[0]),ys=filledPath.map(point=>point[1]);
      assert.ok(Math.max(...xs)-Math.min(...xs)<=100&&Math.max(...ys)-Math.min(...ys)<=100,'filled silhouettes are local, so long spell trails cannot cover a hazard zone');
    }
    if(call.name==='ellipse'||call.name==='arc')assert.ok(call.args[2]<=50,'skill rings stay local to their caster/target');
    if(call.name==='fillRect')assert.ok(call.args[2]<=20&&call.args[3]<=20,'pixel accents remain small enough to preserve warning geometry');
  }
}
assert.equal(spellSignatures.size,8,'fire, frost, thunder, wind, rune, signature, heal and shield have distinct spell effects');
assert.equal(new Set(spellGeometry.values()).size,8,'skill silhouettes differ even when all colour and opacity information is removed');
assert.ok(JSON.parse(spellGeometry.get('wind')).some(call=>call.name==='quadraticCurveTo'),'wind has flowing curved ribbons rather than a renamed lightning beam');
assert.ok(!JSON.parse(spellGeometry.get('storm')).some(call=>call.name==='quadraticCurveTo'),'lightning keeps its angular bolt silhouette');
for(const [spellType,spellWord] of skillFixtures){
  const base={kind:'cast',x:210,y:275,x2:630,y2:310,spellType,spellWord,maxLife:.6};
  ctx.calls=[];renderer.effect(ctx,{...base,life:.5},palette,0,true);const first=geometry(ctx.calls);
  ctx.calls=[];renderer.effect(ctx,{...base,life:.15},palette,4,true);
  assert.equal(geometry(ctx.calls),first,'reduced motion freezes '+spellWord+' geometry while allowing opacity to fade');
  ctx.calls=[];renderer.effect(ctx,{...base,life:.5},palette,0,false);const moving=geometry(ctx.calls);
  ctx.calls=[];renderer.effect(ctx,{...base,life:.15},palette,4,false);
  assert.notEqual(geometry(ctx.calls),moving,'normal '+spellWord+' effect visibly develops during its lifetime');
}
for(const word of ['wind','gust','gale','air']){
  ctx.calls=[];renderer.effect(ctx,{kind:'cast',x:210,y:275,x2:630,y2:310,spellType:'attack',spellWord:word,life:.4,maxLife:.6},palette,0,true);
  assert.equal(geometry(ctx.calls),spellGeometry.get('wind'),'wind vocabulary uses the same distinctive air effect');
}
ctx.calls=[];renderer.effect(ctx,{kind:'cast',x:210,y:275,x2:630,y2:310,spellType:'signature',spellWord:'wind',life:.4,maxLife:.6},palette,0,true);
assert.equal(geometry(ctx.calls),spellGeometry.get('robot'),'signature priority survives elemental card words');
ctx.calls=[];renderer.effect(ctx,{kind:'cast',x:210,y:275,x2:630,y2:310,spellType:'attack',spellWord:'justice',life:.4,maxLife:.6},palette,0,true);
assert.equal(geometry(ctx.calls),spellGeometry.get('rune'),'generic card words containing ice are not accidentally converted to frost');
const particleCount=renderer.particles.length,trailCount=renderer.trail.length,deathCount=renderer.deathScenes.length;
for(let i=0;i<120;i++){
  const [spellType,spellWord]=skillFixtures[i%skillFixtures.length];ctx.calls=[];
  renderer.effect(ctx,{kind:'cast',x:210,y:275,x2:630,y2:310,spellType,spellWord,life:.4,maxLife:.6},palette,i/60,false);
}
assert.equal(renderer.particles.length,particleCount,'repeated skill draws allocate no persistent particle emitters');
assert.equal(renderer.trail.length,trailCount);assert.equal(renderer.deathScenes.length,deathCount);
ctx.calls=[];renderer.effect(ctx,{kind:'cast',x:210,y:275,x2:630,y2:310,spellType:'attack',spellWord:'fire',life:0,maxLife:.6},palette,0,false);
assert.equal(ctx.calls.length,0,'expired skill effects draw nothing');
for(const spellType of ['heal','shield']){
  ctx.calls=[];renderer.effect(ctx,{kind:'companion-cast',npcId:'echo',fromX:200,fromY:350,targetX:480,targetY:300,spellType,life:.5,maxLife:.6},palette,0,true);
  assert.ok(ctx.calls.some(call=>call.name==='ellipse'&&call.args[0]===480&&call.args[1]===280),'copied support spell surrounds its player target');
  assert.ok(!ctx.calls.some(call=>call.name==='ellipse'&&call.args[0]===200&&call.args[1]===330),'support ring is not mistakenly centered on its companion caster');
}
for(const [npcId,label] of [['lantern','護持'],['sentinel','援擊']]){
  ctx.calls=[];renderer.effect(ctx,{kind:'companion-cast',npcId,fromX:200,fromY:350,targetX:480,targetY:300,spellType:npcId==='lantern'?'shield':'strike',life:.5,maxLife:.6},palette,0,true);
  assert.ok(ctx.calls.some(call=>call.name==='fillText'&&call.args[0]===label),'non-mimic companion effect uses its actual support role');
}

// Final-hit effects arrive on the same frame as reward state. Render once, then
// expire independently of frozen engine effects without delaying loot or saves.
const deathRun=sample(55),dead={id:'npc-echo',npcId:'echo',sprite:'echo',kind:'boss',name:'伊可',x:640,y:280,r:30,phase:2};
deathRun.arena.effects=[{id:'final-death',kind:'death',x:640,y:280,r:60,actor:dead,boss:true,color:'#c9baff',life:1.2,maxLife:1.2}];
deathRun.arena.enemies=[];deathRun.status='reward';deathRun.exploration={key:'victory-loot',player:{x:480,y:430,r:12},objects:[],obstacles:[]};
const before=JSON.stringify(deathRun);ctx.calls=[];renderer.draw({run:deathRun,reducedMotion:true},3300);
assert.equal(renderer.deathScenes.length,1,'final boss death captured despite immediate reward transition');
assert.ok(ctx.calls.some(call=>call.name==='fillText'&&call.args[0]==='封印破碎'),'boss death has a visible finishing cue');
assert.equal(JSON.stringify(deathRun),before,'visual death completion never modifies gameplay or rewards');
assert.notEqual(renderer.deathScenes[0].actor,dead,'dead actor is a snapshot rather than live gameplay state');
const lifetime=renderer.deathScenes[0].life;
renderer.draw({run:deathRun,paused:true,reducedMotion:true},3350);assert.equal(renderer.deathScenes[0].life,lifetime,'pause freezes death progression');
ctx.calls=[];renderer.drawDeaths(ctx,palette,0,deathRun,.02,false,true);
assert.ok(!ctx.calls.some(call=>call.name==='rotate'),'reduced motion avoids death tumbling');
for(let i=0;i<32;i++)renderer.draw({run:deathRun,reducedMotion:true},3400+i*50);
assert.equal(renderer.deathScenes.length,0,'local death finishes while retained engine effect stays present');
renderer.draw({run:deathRun,reducedMotion:true},5050);assert.equal(renderer.deathScenes.length,0,'old death effect cannot replay every reward frame');

const lostRun=sample(57);lostRun.status='lost';lostRun.player.hp=0;lostRun.arena.effects=[];
const mageDraw=renderer.mage,magePositions=[];
const deathMarkerFlags=[];
renderer.mage=function(...args){magePositions.push([args[1].x,args[1].y]);deathMarkerFlags.push(args[6]);return mageDraw.apply(this,args);};
renderer.draw({run:lostRun,reducedMotion:true},5100);
assert.equal(renderer.deathScenes.length,1,'loss creates player death even without a gameplay effect');
assert.equal(renderer.deathScenes[0].actor.kind,'player');
assert.ok(!magePositions.some(([x,y])=>x===lostRun.arena.player.x&&y===lostRun.arena.player.y),'dead player is not still drawn as a living mage');
assert.ok(magePositions.some(([x,y])=>x===0&&y===0),'player death draws the departing sprite snapshot');
assert.ok(deathMarkerFlags.every(flag=>flag===false),'departing player snapshots omit the live ownership marker');
renderer.draw({run:null},5150);assert.equal(renderer.deathScenes.length,0,'returning to lobby clears lingering death effects');

const introRun=sample(61);introRun.arena.enemies=[{...dead,hp:100,maxHp:100,alive:true,active:true}];
introRun.arena.effects=[{id:'intro',kind:'boss-intro',name:'回聲學徒・伊可',x:640,y:280,life:1.7,maxLife:1.8}];
ctx.calls=[];renderer.draw({run:introRun,reducedMotion:true},5200);
assert.ok(ctx.calls.some(call=>call.name==='fillText'&&call.args[0]==='回聲學徒・伊可'),'boss entrance announces its identity');
assert.ok(ctx.calls.some(call=>call.name==='fillRect'&&call.args[0]===24&&call.args[1]===52),'boss pressure frame remains outside collision bounds');
for(const shape of ['coin','paper','lantern','crystal'])renderer.projectile(ctx,{shape,x:400,y:200,r:6,vx:1,vy:1},palette,0,true);
assert.equal(ctx.depth,0);
console.log('Renderer checks passed: eight NPC silhouettes/Boss forms, followers, echo origins, eight distinct skill silhouettes and animation, bounded effects, four room themes, boss entrances, death persistence/expiration, player death, reduced motion, exact hazard geometry, balanced Canvas state.');
