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
console.log('Renderer checks passed: visible healing radius, 12 sprites across 3 regions, 5 hazard geometries, 6 effect types, dash/projectiles, reduced motion, and balanced canvas state.');
