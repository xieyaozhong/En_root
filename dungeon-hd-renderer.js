/* Word Relic — high-definition 2.5D visual-only renderer.
 * All positions are readonly world coordinates. No save or combat mutation. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DungeonHighDefinition=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const PI=Math.PI,TAU=PI*2;
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const num=(v,fallback=0)=>Number.isFinite(+v)?+v:fallback;
  const COLORS={
    thorn:['#9ddeaa','#3a714a'],spore:['#dce3a9','#577d65'],
    witch:['#d8b8ff','#564477'],prism:['#b5f0ff','#4388a7'],
    king:['#f1ce9c','#78536a'],hollow:['#ddd5ee','#65617e'],
    astral:['#cfddff','#7084b0'],cometqueen:['#ffe0c6','#c27f9a'],
    constellation:['#f9cee9','#87668f'],merchant:['#f6dd9d','#967143'],
    healer:['#b8eacb','#669d88'],smith:['#ffd3a2','#ad6d59'],
    cartographer:['#dfcaff','#8475a2'],ferryman:['#bee8eb','#4d8494'],
    lantern:['#caf2c9','#649d8b'],echo:['#e4d0ff','#80679a'],
    sentinel:['#f6e7ac','#97875f'],lumina:['#ffe0ec','#ad84ba']
  };
  const ELEMENT={
    thorn:'wood',spore:'fungus',witch:'arcane',prism:'glass',king:'steel',
    hollow:'bell',astral:'astral',cometqueen:'astral',constellation:'astral',
    merchant:'metal',healer:'botanical',smith:'metal',cartographer:'rune',
    ferryman:'water',lantern:'lantern',echo:'rune',sentinel:'paper',lumina:'flower'
  };
  function path(c,points){c.beginPath();points.forEach((point,i)=>i?c.lineTo(point[0],point[1]):c.moveTo(point[0],point[1]));c.closePath();}
  function line(c,x,y,x2,y2,color,w=1){c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();}
  function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
  function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,Math.max(0.5,rx),Math.max(0.5,ry),0,0,TAU);c.fill();}
  function diamond(c,x,y,r,color){path(c,[[x,y-r],[x+r*.68,y],[x,y+r],[x-r*.68,y]]);c.fillStyle=color;c.fill();}
  function gradient(c,x,y,r,color,alpha=0.18){
    if(!c.createRadialGradient)return;
    c.save();c.globalAlpha*=alpha;
    const g=c.createRadialGradient(x,y,1,x,y,r);
    g.addColorStop(0,color);g.addColorStop(.24,color);
    g.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r);c.restore();
  }
  function identity(run){return run&&run.enemy&&(run.enemy.npcId||run.enemy.id)||'';}
  function material(run){const id=identity(run);return{color:COLORS[id]?.[0]||'#b8dbdf',shade:COLORS[id]?.[1]||'#557c87',kind:ELEMENT[id]||'stone',id};}
  function stage(c,run,area,t,still){
    if(!c||!area)return;
    const boss=!!area.room?.bossId,info=material(run),a=area,phase=num(run?.enemy?.phase,1);
    c.save();
    // Raised inset border — a shallow perspective extrusion, not a fake
    // collision wall. Works with existing 960×540 collision coordinates.
    c.globalAlpha=.72;
    line(c,30,60,30,500,'#090d18',8);
    line(c,930,60,930,500,'#0b101c',8);
    line(c,31,503,929,503,'#0c1721',8);
    line(c,37,68,37,493,info.shade,2);
    line(c,923,68,923,493,info.shade,2);
    c.globalAlpha=.28;line(c,40,493,918,493,info.color,2);
    if(boss){
      // Fixed rays read as high-volume ambient light but never as hitboxes.
      c.globalAlpha=.10;
      for(let i=0;i<3;i++){
        const x=175+i*305;
        path(c,[[x-65,61],[x+30,61],[x+175,493],[x+95,493]]);
        c.fillStyle=info.color;c.fill();
      }
      const depth=c.createRadialGradient?.(480,275,45,480,278,485);
      if(depth){
        depth.addColorStop(0,'rgba(6,12,25,0)');
        depth.addColorStop(.6,'rgba(5,10,20,0.05)');
        depth.addColorStop(1,'rgba(2,5,13,0.6)');
        c.fillStyle=depth;c.globalAlpha=.5;c.fillRect(30,61,900,442);
      }
      // Engraved, light-catching center dais. Avoid painting warning red.
      c.globalAlpha=.19;c.lineWidth=2;c.strokeStyle=info.color;
      c.beginPath();c.ellipse(480,288,234,133,0,0,TAU);c.stroke();
      c.globalAlpha=.12;c.beginPath();c.ellipse(480,288,218,118,0,0,TAU);c.stroke();
      for(let i=0;i<14;i++){
        const angle=i*TAU/14,rx=480+Math.cos(angle)*230,ry=288+Math.sin(angle)*130;
        diamond(c,rx,ry,i%2?3:5,info.color);
      }
      // Specular light focuses on the room's architectural centerpiece,
      // not on the character and never masks orange attack warning shapes.
      gradient(c,480,84,150,info.color,.10+(phase>1?.035:0));
    }
    c.restore();
  }
  function domain(c,area,t,still){
    const s=area?.bossIdentity;
    if(!c||!s)return;
    const id=s.id,color=COLORS[id]?.[0]||'#b5e5dd',time=still?0:num(t);
    c.save();
    if(id==='thorn'){
      for(const vine of s.vines||[]){
        const x=num(vine.x),y=num(vine.y),r=num(vine.r,31),grow=clamp(1-num(vine.grow)/1.5,0,1);
        c.globalAlpha=.48+.32*grow;
        for(let k=0;k<3;k++){
          const angle=k*TAU/3+time*.045;
          const px=x+Math.cos(angle)*r*.66,py=y+Math.sin(angle)*r*.66;
          line(c,x-4,y+3,px+6,py-9,k%2?'#badf92':'#345b43',k===0?5:3);
          line(c,x-2,y+1,px+4,py-10,'#b9e6a2',1);
          ellipse(c,px,py-9,5,9,k%2?'#6baf78':'#a2c77b');
        }
      }
    }else if(id==='prism'){
      for(const mirror of s.mirrors||[]){
        const x=num(mirror.x),y=num(mirror.y),isExit=!!s.warp&&Math.abs(s.warp.target.x-x)<2&&Math.abs(s.warp.target.y-y)<2;
        gradient(c,x,y-15,86,isExit?'#fff6b8':'#b5ecff',isExit?.27:.12);
        const panel=c.createLinearGradient?.(x-30,y-43,x+28,y+34);
        if(panel){panel.addColorStop(0,'#1c3152');panel.addColorStop(.45,'#a6e5ff');panel.addColorStop(.65,'#314f74');panel.addColorStop(1,'#d2ebfa');}
        c.globalAlpha=.86;
        path(c,[[x,y-45],[x+29,y-30],[x+29,y+25],[x,y+41],[x-29,y+25],[x-29,y-30]]);
        c.fillStyle='#344b66';c.fill();c.strokeStyle='#d5e9ff';c.lineWidth=2;c.stroke();
        c.save();c.clip();
        c.fillStyle=panel||'#86bfd6';c.fillRect(x-35,y-45,70,90);
        c.globalAlpha=.45;
        for(let j=0;j<4;j++){
          const shift=still?0:Math.sin(time*1.5+j)*7;
          line(c,x-32+j*18+shift,y-48,x-2+j*18+shift,y+45,'#f5ffff',3);
        }
        c.restore();
        c.globalAlpha=.65;
        line(c,x-25,y+30,x-17,y+34,'#f6f9e4',2);
        line(c,x+17,y-28,x+24,y-24,'#f6f9e4',2);
        diamond(c,x,y-43,5,'#ffffff');
      }
    }else if(id==='hollow'){
      const elapsed=still?0:time*2.2;
      c.globalAlpha=.16;
      for(let i=0;i<3;i++){
        c.strokeStyle=color;c.lineWidth=2;
        c.beginPath();c.ellipse(480,280,105+((elapsed+i*.33)%1)*205,58+((elapsed+i*.33)%1)*115,0,0,TAU);c.stroke();
      }
    }else if(id==='smith'){
      for(let i=0;i<8;i++){
        const x=100+(i%4)*246,y=65+Math.floor(i/4)*417;
        gradient(c,x,y,34,'#ffb46f',.10);
        diamond(c,x,y+2,3,'#ffd4a3');
      }
    }else if(id==='cometqueen'||id==='astral'||id==='constellation'){
      c.globalAlpha=.28;
      for(let i=0;i<18;i++){
        const x=92+(i*97)%771,y=96+(i*61)%347;
        diamond(c,x,y,(i%3)+1,color);
        if(i%4===0)line(c,x-7,y,x+7,y,'#d2e5fc',.6);
      }
    }else if(id==='healer'||id==='lumina'||id==='lantern'){
      for(const flower of s.flowers||[]){
        if(flower.used)continue;
        gradient(c,num(flower.x),num(flower.y),65,color,.17);
        c.globalAlpha=.76;
        for(let k=0;k<8;k++){
          const a=k*TAU/8;
          ellipse(c,flower.x+Math.cos(a)*18,flower.y+Math.sin(a)*12,6,9,color);
        }
        circle(c,flower.x,flower.y,7,'#fff5d3');
      }
    }
    c.restore();
  }
  function underActor(c,actor,kind='enemy',phase=1){
    if(!c||!actor)return;
    const x=num(actor.x),y=num(actor.y),boss=kind==='boss';
    const size=boss?Math.max(31,num(actor.r,26)*1.4):kind==='player'?20:15;
    c.save();
    // Cast shadow is directional and grounded in the actual physics feet.
    c.globalAlpha=.37;ellipse(c,x+6,y+6,size,Math.max(5,size*.24),'#030912');
    c.globalAlpha=.24;ellipse(c,x+11,y+10,size*1.16,Math.max(3,size*.17),'#132234');
    c.globalAlpha=.18;ellipse(c,x-3,y+1,size*.75,Math.max(2,size*.10),'#dcefff');
    c.restore();
  }
  function actorRim(c,actor,kind='enemy',t=0,still=false){
    if(!c||!actor)return;
    const x=num(actor.x),y=num(actor.y),boss=kind==='boss';
    if(!boss&&kind!=='player')return;
    const profile=COLORS[actor.npcId||actor.id]||['#b4e8dd','#6aabb1'];
    const light=kind==='player'?'#bce9e8':profile[0];
    const height=boss?115:82,w=boss?36:22;
    c.save();c.globalAlpha=boss?.65:.4;
    // A controlled set of reflective glints, outside silhouettes. These
    // are design accents, not collision or targeting markers.
    const q=still?0:Math.sin(t*1.7+(boss?1:0))*2;
    line(c,x-w,y-height*.64,x-w*.79,y-height*.86+q,light,boss?2:1);
    line(c,x+w*.9,y-height*.67,x+w*.65,y-height*.81-q,light,1);
    diamond(c,x-w*.86,y-height*.89+q,boss?3:2,light);
    if(boss){
      const phase=num(actor.phase,1);
      c.globalAlpha=.18;
      gradient(c,x,y-height*.64,45,light,phase>1?.34:.21);
    }
    c.restore();
  }
  function highlight(c,run,area,t,still){
    if(!c||!run?.arena)return;
    const s=area?.bossIdentity,info=material(run);
    if(!s)return;
    const time=still?0:num(t);
    c.save();
    if(s.warp&&s.id==='prism'){
      const exit=s.warp.target,x=num(exit.x),y=num(exit.y);
      c.globalAlpha=.7+.14*Math.sin(time*11);
      c.strokeStyle='#f9f2b8';c.lineWidth=3;
      c.beginPath();c.arc(x,y,49,0,TAU);c.stroke();
      for(let i=0;i<5;i++){const angle=i*TAU/5+time*.8;diamond(c,x+Math.cos(angle)*52,y+Math.sin(angle)*52,5,'#fff4d3');}
    }
    if(s.id==='thorn'||s.id==='spore'){
      const count=Math.min(10,(s.vines||[]).length);
      c.globalAlpha=.18;
      for(let i=0;i<count;i++){const v=s.vines[i];gradient(c,num(v.x),num(v.y),62,info.color,.18);}
    }
    c.restore();
  }
  return Object.freeze({COLORS,ELEMENT,stage,domain,underActor,actorRim,highlight});
});
