'use strict';
/* Pure-art smoke coverage: no browser or GPU required. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const HD=require('../dungeon-hd-renderer.js');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const ids=['thorn','spore','witch','prism','king','hollow','astral','cometqueen','constellation',
  'merchant','healer','smith','cartographer','ferryman','lantern','echo','sentinel','lumina'];
assert.deepEqual(Object.keys(HD.COLORS),ids);
const win={};
vm.runInNewContext(read('dungeon-character.js'),{window:win,console,Math});
vm.runInNewContext(read('dungeon-enemy-character.js'),{window:win,console,Math});
assert.equal(typeof win.DungeonCharacter.draw,'function');
assert.equal(typeof win.DungeonEnemyCharacter.draw,'function');

function context(){
  let calls=0,stack=0;
  const gradients=()=>({addColorStop(){}});
  const data={globalAlpha:1,createRadialGradient:gradients,createLinearGradient:gradients};
  const fake=new Proxy(data,{
    get(obj,key){
      if(key==='drawCalls')return calls;
      if(key==='stackDepth')return stack;
      if(key in obj)return obj[key];
      return (...args)=>{calls++;if(key==='save')stack++;if(key==='restore')stack--;};
    },
    set(obj,key,value){obj[key]=value;return true;}
  });
  return fake;
}
const c=context();
for(const id of ids){
  const actor={x:410,y:310,id,npcId:id,r:39,phase:2};
  HD.stage(c,{enemy:{id,phase:2}},{room:{bossId:id},player:{x:410,y:310}},2,false);
  HD.domain(c,{bossIdentity:{id,
    mirrors:[{x:340,y:155},{x:620,y:385}],
    warp:{target:{x:340,y:155},from:{x:500,y:250}},
    vines:[{x:400,y:280,r:36,life:10,grow:.2}],
    flowers:[{x:340,y:240,used:false}],
    coins:[{x:510,y:290,used:false}]
  }},2,false);
  HD.underActor(c,actor,'boss',2);
  HD.actorRim(c,actor,'boss',2,false);
  win.DungeonEnemyCharacter.draw(c,{
    time:2,phase:1.2,moving:1,facingX:1,facingY:0,
    mode:'cast',action:{kind:'spell',stage:'windup',progress:.52},still:false
  },{...actor,boss:true,kind:'boss'});
}
for(const appearance of ['player','lumina']){
  win.DungeonCharacter.draw(c,{
    time:1.9,phase:1.4,moving:.5,mode:'cast',castProgress:.58,still:false,speed:125,
    facingX:1,facingY:0
  },appearance);
}
HD.highlight(c,{arena:{},enemy:{id:'prism'}},{bossIdentity:{id:'prism',warp:{target:{x:340,y:150}}}},2,false);
assert.equal(c.stackDepth,0,'all drawing layers must restore context transforms');
assert.ok(c.drawCalls>5000,'character material and battlefield geometry must actually draw');
for(const section of ['stage','domain','underActor','actorRim','highlight'])
  assert.equal(typeof HD[section],'function');
const html=read('dungeon.html');
assert.ok(html.includes('dungeon-hd-renderer.js?v=20261029-hd6'));
assert.ok(html.includes('dungeon-hd.css?v=20261029-hd6'));
assert.ok(html.indexOf('dungeon-hd-renderer.js')<html.indexOf('dungeon-arena-renderer.js'));
assert.ok(read('dungeon-arena-renderer.js').includes('window.DungeonHighDefinition.stage('));
assert.ok(read('dungeon-arena-renderer.js').includes('window.DungeonHighDefinition.actorRim('));
assert.ok(read('dungeon-arena-renderer.js').includes('window.DungeonHighDefinition.domain('));
console.log('PASS HD remaster: 18 boss models, both player appearances, drawing-state balance, stage/material light layers and Pages asset order');
