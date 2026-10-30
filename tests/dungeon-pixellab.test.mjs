'use strict';
/* Run: node --test tests/dungeon-pixellab.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validate,keyForPose,directionFor,frameFor,render,loadFiles,toggle,status}
  from '../dungeon-pixellab.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pack={
  schema:'word-relic.pixellab.v1',source:'unit-test',
  characters:{player:{
    cell:[64,96],anchor:[32,90],scale:1,
    actions:{
      idle:{sheet:'player/idle.png',frames:4,columns:4,fps:8,directions:['east','north']},
      walk:{sheet:'player/walk.png',frames:4,columns:4,fps:8,directions:['south']},
    }
  }}
};
test('validate 8-way PixelLab export adapter contract',()=>{
  const result=validate(pack);
  const clips=result.get('player');
  const idle=clips.get('idle');
  assert.equal(result.size,1);assert.equal(idle.minWidth,256);assert.equal(idle.minHeight,192);
  assert.equal(keyForPose({mode:'idle'},clips),'idle');
  assert.equal(keyForPose({mode:'walk'},clips),'walk');
  assert.equal(directionFor({facingX:1,facingY:0},idle),0);
  assert.equal(directionFor({facingX:0,facingY:-1},idle),1);
  assert.equal(frameFor({time:.27},idle),2);
  assert.equal(frameFor({still:true,time:42},idle),0);
});
test('malformed metadata is rejected before changing visible assets',()=>{
  assert.throws(()=>validate({...pack,schema:'unknown'}),/schema/);
  assert.throws(()=>validate({...pack,characters:{'../other':pack.characters.player}}),/Invalid character/);
  assert.throws(()=>validate({...pack,characters:{player:{...pack.characters.player,actions:{idle:{...pack.characters.player.actions.idle,sheet:'../evil.png'}}}}}),/Invalid animation/);
  assert.throws(()=>validate({...pack,characters:{player:{...pack.characters.player,actions:{idle:{...pack.characters.player.actions.idle,frames:0}}}}}),/Invalid grid/);
});
test('local PixelLab PNG sheets draw actual atlas cells and can be toggled',async()=>{
  let disposed=0;const initialImage=globalThis.Image, originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL;
  globalThis.Image=class {
    width=256;height=192;
    set src(value){queueMicrotask(()=>this.onload?.());}
  };
  URL.createObjectURL=()=> 'blob:unit-pixel';
  URL.revokeObjectURL=()=>{disposed++;};
  const json={name:'pack.json',size:100,async text(){return JSON.stringify(pack)}};
  const png=(name)=>({name,size:1024});
  try{
    const result=await loadFiles([json,png('idle.png'),png('walk.png')]);
    assert.equal(result.loaded,true);assert.equal(result.characters.includes('player'),true);
    assert.equal(disposed,2);
    const blits=[];let stack=0;
    const c={imageSmoothingEnabled:true,save(){stack++;},restore(){stack--;},
      drawImage(...args){blits.push(args)}};
    assert.equal(render(c,{mode:'idle',time:.27,facingX:0,facingY:-1},'player'),true);
    assert.equal(blits.length,1);
    assert.deepEqual(blits[0].slice(1,5),[128,96,64,96],'north-facing third frame sampled from second row');
    assert.equal(stack,0);
    assert.equal(toggle(),false);
    assert.equal(render(c,{mode:'idle',time:0},'player'),false,'toggle leaves original HD model available');
    assert.equal(toggle(),true);
    assert.throws(()=>validate({schema:'wrong'}),/schema/);
    assert.equal(status().loaded,true,'bad metadata never destroys active sprites');
  }finally{
    globalThis.Image=initialImage;
    URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;
  }
});
test('HTML enables browser import and original Forge fallback',()=>{
  const html=fs.readFileSync(path.join(root,'dungeon.html'),'utf8');
  const forge=fs.readFileSync(path.join(root,'dungeon-forge-sprites.mjs'),'utf8');
  const arena=fs.readFileSync(path.join(root,'dungeon-arena-renderer.js'),'utf8');
  assert.match(html,/id="pixelLabButton"/);
  assert.match(html,/id="pixellabFiles"/);
  assert.match(html,/dungeon-pixellab\.css/);
  assert.match(forge,/import \{render as drawPixelLab\} from '\.\/dungeon-pixellab\.mjs'/);
  assert.match(arena,/DungeonPixelLab\?\.render\(c,pose,npcId\)/);
  assert.match(arena,/else if\(articulated\)window\.DungeonEnemyCharacter\.draw/);
});
