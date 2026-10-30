/* Regression for actual upstream Agent Sprite Forge 0.4 playback helpers
 * and the code-art prototype. Run: node --test tests/dungeon-forge-sprites.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {normalizeAnimation,frameAt,fallbackCell,anchoredRect,gaitFrame}
  from '../vendor/agent-sprite-forge/forge-runtime.mjs';
import {makeManifest,samplePose,frameFor,selectPose,draw,toggle}
  from '../dungeon-forge-sprites.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

test('generated frames really use the upstream ASF v3 atlas contract',()=>{
  for(const name of ['idle','walk','run','cast','chant','dash','hurt','fallen']){
    const m=makeManifest(name,name==='idle'?6:8);
    const c=normalizeAnimation(m);
    assert.equal(c.kind,'animation-3.0');
    assert.deepEqual(m.sourceAnchor,[64,114]);
    assert.equal(c.frameCount,m.frameCount);
    assert.equal(c.totalMs,m.durationsMs.reduce((a,b)=>a+b,0));
    assert.deepEqual(fallbackCell(m,0),{page:0,file:name+'-atlas-00.png',x:0,y:0,width:128,height:128});
    assert.deepEqual(anchoredRect(c,0,0,1),{x:-64,y:-114,width:128,height:128});
  }
});
test('distance-locked walk, timed idle and gameplay-locked casting',()=>{
  const walking={clip:normalizeAnimation(makeManifest('walk',8))};
  assert.equal(frameFor('walk',{phase:Math.PI,moving:1,speed:140},walking),4);
  assert.equal(frameFor('walk',{phase:Math.PI*1.5,moving:1,speed:140},walking),6);
  const casting={clip:normalizeAnimation(makeManifest('cast',8))};
  assert.equal(frameFor('cast',{castProgress:0},casting),0);
  assert.equal(frameFor('cast',{castProgress:1},casting),7);
  assert.equal(frameFor('cast',{castProgress:.52},casting),3);
  const idle={clip:normalizeAnimation(makeManifest('idle',6))};
  assert.equal(frameFor('idle',{time:0},idle),0);
  assert.equal(frameFor('idle',{time:.38},idle),2);
  assert.equal(selectPose({mode:'walk',speed:280}),'run');
  assert.equal(selectPose({mode:'chant'}),'chant');
  assert.equal(selectPose({mode:'hurt'}),'hurt');
  assert.equal(selectPose({mode:'fallen'}),'fallen');
  assert.equal(samplePose('dash',2,6).mode,'dash');
  assert.equal(gaitFrame(27,54,8).frame,4);
});
test('live codeart atlas draws actual cells, toggles and leaves game data intact',()=>{
  let drawCalls=0,generatedFrames=0,ctxDepth=0;
  const makeCtx=()=>({
    save(){ctxDepth++;},restore(){ctxDepth--;},translate(){},scale(){},
    imageSmoothingEnabled:true,
    drawImage(){drawCalls++;}
  });
  globalThis.document={
    createElement(){return{width:0,height:0,getContext:makeCtx};},
    getElementById(){return null;}
  };
  globalThis.window={
    DungeonCharacter:{draw(c,pose){generatedFrames++;c.save();c.restore();}}
  };
  const player={x:304,y:242,r:12,hp:50},before=JSON.stringify(player);
  assert.equal(draw(makeCtx(),{mode:'walk',time:.1,phase:1,moving:1,speed:160,facingX:1},'player'),true);
  assert.ok(generatedFrames>=50,'multiple real atlas cells are prerendered');
  assert.equal(drawCalls,1,'first call blits an actual atlas frame');
  assert.equal(draw(makeCtx(),{mode:'walk',time:.2,phase:2,moving:1,speed:160,facingX:-1},'player'),true);
  assert.equal(drawCalls,2,'second frame can render mirrored');
  assert.equal(ctxDepth,0,'save / restore context balances');
  assert.equal(JSON.stringify(player),before,'rendering must not mutate actor/save state');
  assert.equal(toggle(),false);
  assert.equal(draw(makeCtx(),{mode:'idle'},'player'),false,'toggle restores original articulated model');
  assert.equal(toggle(),true);
  assert.equal(draw(makeCtx(),{mode:'idle'},'lumina'),false,'companion retains its original art rig');
});
test('HTML loads ASF module and preserves controls, mobile touch zoom fix and original fallback',()=>{
  const html=fs.readFileSync(resolve(root,'dungeon.html'),'utf8');
  const source=fs.readFileSync(resolve(root,'dungeon-arena-renderer.js'),'utf8');
  assert.match(html,/id="spriteForgeToggle"/);
  assert.match(html,/type="module" src="dungeon-forge-sprites\.mjs/);
  assert.match(html,/dungeon-touch-zoom\.css/);
  assert.match(source,/window\.DungeonForgeSprites\?\.draw\(c,pose,'player'\)/);
  assert.match(source,/window\.DungeonCharacter\.draw\(c,pose,'player'\)/);
});
