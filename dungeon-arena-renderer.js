/* Wordbound: original pixel arena art. World coordinates are 960 x 540.
 * Public API: new DungeonArenaRenderer(canvas), draw({run,paused,reducedMotion,aim}, ms), burst(kind).
 * DungeonRenderer, if present, supplies the original character sprite artwork. */
(() => {
  'use strict';
  const W=960,H=540,TAU=Math.PI*2;
  const PAL=[
    {void:'#0b171c',wall:'#152d31',stone:'#254447',edge:'#375c59',floor:'#1c3638',line:'#12282e',light:'#b6efbd',glow:'#6ccbad',trim:'#618676',accent:'#dbc798',leaf:'#527c62',hot:'#ffa692'},
    {void:'#101426',wall:'#1c223c',stone:'#2c3452',edge:'#424b69',floor:'#252d48',line:'#192138',light:'#d6c6ff',glow:'#a28bed',trim:'#74759b',accent:'#dfc397',leaf:'#646582',hot:'#ffa6ae'},
    {void:'#1c111e',wall:'#321e30',stone:'#472c3c',edge:'#684351',floor:'#372a36',line:'#281d2c',light:'#ffd1b4',glow:'#f394a0',trim:'#956575',accent:'#ebba84',leaf:'#785469',hot:'#ffc09c'}
  ];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const val=(n,d=0)=>Number.isFinite(Number(n))?Number(n):d;
  function random(seed){let n=seed|0;return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296;};}
  function box(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function stroke(c,x,y,xx,yy,color,w=2){c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();}
  function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,Math.max(1,rx),Math.max(1,ry),0,0,TAU);c.fill();}
  function pixelDisk(c,x,y,r,color){c.fillStyle=color;for(let dy=-r;dy<r;dy+=3){const dx=Math.floor(Math.sqrt(Math.max(0,r*r-dy*dy))/3)*3;c.fillRect(Math.round(x-dx),Math.round(y+dy),dx*2,3);}}
  function aura(c,x,y,r,color,alpha=.1){c.save();for(let i=3;i>0;i--){c.globalAlpha=alpha/i;oval(c,x,y,r*i*.6,r*i*.45,color);}c.restore();}
  function gem(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r*.65,y);c.lineTo(x,y+r);c.lineTo(x-r*.65,y);c.closePath();c.fill();}
  function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fill();}
  const regionOf=(run)=>typeof run?.region==='string'?({forest:0,mirror:1,library:1,void:2,obsidian:2}[run.region]??0):clamp(val(run?.region),0,2);
  const NPC_IDS=new Set(['merchant','healer','smith','cartographer','ferryman']);
  const EXPLORATION_STATES=new Set(['route','shop','npc','camp','reward']);

  class DungeonArenaRenderer {
    constructor(canvas){
      if(!canvas?.getContext)throw new Error('DungeonArenaRenderer requires a canvas');
      this.canvas=canvas;canvas.width=W;canvas.height=H;canvas.style.imageRendering='pixelated';
      this.ctx=canvas.getContext('2d',{alpha:false});this.ctx.imageSmoothingEnabled=false;
      this.backdrops=PAL.map((p,i)=>this.background(p,i));
      this.legacy=window.DungeonRenderer?.prototype||null;
      this.random=random(77483);this.clock=0;this.lastTime=null;this.particles=[];this.trail=[];this.shake=0;this.flash=0;this.flashKind='';this.lastScene=null;this.lastPlayer=null;this.lastRoom=null;
    }
    resize(){this.ctx.imageSmoothingEnabled=false;}
    background(p,region){
      const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
      const c=canvas.getContext('2d'),rnd=random(92813+region*1009);c.imageSmoothingEnabled=false;
      box(c,0,0,W,H,p.void);box(c,22,39,W-44,H-63,p.floor);
      // Weathered paving, with quiet central values for readable projectiles.
      for(let row=0;row<11;row++)for(let col=-1;col<17;col++){
        const x=col*64+(row%2)*32,y=40+row*46;
        box(c,x+1,y+1,62,44,p.floor);box(c,x+1,y+1,62,2,p.stone);box(c,x+1,y+43,62,2,p.line);box(c,x+1,y+1,2,44,p.line);
        if(rnd()>.3)box(c,x+8+rnd()*12,y+7,12+rnd()*19,2,p.stone);
        if(rnd()>.82){box(c,x+30,y+16,2,8,p.line);box(c,x+32,y+22,11,2,p.line);box(c,x+41,y+24,2,6,p.line);}
      }
      // Inlaid octagon and twelve compass runes form a broad combat stage.
      c.save();c.globalAlpha=.35;c.strokeStyle=p.trim;c.lineWidth=2;
      [156,166].forEach(r=>{c.beginPath();for(let i=0;i<8;i++){const a=Math.PI/8+i*TAU/8,x=480+Math.cos(a)*r*1.35,y=289+Math.sin(a)*r*.9;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.stroke();});
      c.globalAlpha=.22;c.beginPath();c.ellipse(480,289,111,78,0,0,TAU);c.stroke();
      for(let i=0;i<12;i++){const a=i*TAU/12;gem(c,480+Math.cos(a)*187,289+Math.sin(a)*124,5,p.accent);}
      box(c,476,282,8,14,p.trim);box(c,470,287,20,4,p.trim);c.restore();
      // Narrow dark perimeter walls have elevation, never conceal the playfield.
      box(c,8,0,944,45,p.wall);for(let x=0;x<W;x+=48){box(c,x+1,7,46,28,p.stone);box(c,x+3,8,41,3,p.edge);box(c,x+2,34,44,6,p.void);}
      box(c,8,40,944,6,p.edge);box(c,8,46,944,6,p.void);
      box(c,8,41,17,466,p.wall);box(c,13,44,5,461,p.edge);box(c,936,41,17,466,p.wall);box(c,937,43,4,461,p.edge);
      box(c,8,513,944,27,p.void);box(c,8,511,944,4,p.edge);for(let x=8;x<952;x+=48){box(c,x+1,518,46,22,p.wall);box(c,x+3,519,40,3,p.stone);}
      [48,912].forEach(x=>{this.staticPillar(c,x,66,p,28);this.staticPillar(c,x,493,p,22);});
      this.gate(c,480,38,p,region);
      // Each biome has a distinct silhouette and material language.
      if(region===0){
        [80,191,746,875].forEach((x,i)=>this.canopy(c,x,40+i%2*8,40+i%3*8,p,rnd));
        for(let i=0;i<65;i++){const x=30+rnd()*900,y=66+rnd()*432;if(x>175&&x<786&&y>124&&y<452)continue;box(c,x,y,5,2,'#46765b');box(c,x+3,y-5,2,6,'#588268');}
        [90,872].forEach(x=>{this.root(c,x,90,x<300?1:-1,p);this.mushrooms(c,x,459,p);});
        this.mushrooms(c,126,103,p);this.mushrooms(c,850,143,p);
      }else if(region===1){
        [106,194,680,768].forEach(x=>this.shelf(c,x,17,76,48,p,rnd));
        this.bookPile(c,85,134,p);this.bookPile(c,881,391,p);this.bookPile(c,97,476,p);
        [324,613].forEach(x=>{box(c,x,6,23,56,'#514067');box(c,x+3,7,17,48,'#79618c');gem(c,x+11,28,10,p.accent);});
      }else{
        [[68,111],[882,100],[83,466],[880,469]].forEach(([x,y],i)=>this.crystal(c,x,y,20+i%2*8,p));
        for(let i=0;i<8;i++){const x=i%2?895:56,y=140+i*43;stroke(c,x,y,x+(i%2?-1:1)*25,y+21,'#643a48',4);stroke(c,x,y,x+(i%2?-1:1)*25,y+21,'#aa615f',1);}
        [175,765].forEach(x=>{box(c,x-10,14,20,51,'#432435');gem(c,x,26,24,'#8d506b');gem(c,x-2,22,15,'#bd7c89');});
      }
      // Lamps and grounded scattered props add scale.
      [282,679].forEach(x=>{box(c,x-5,47,10,14,p.trim);box(c,x-8,44,16,5,p.accent);});
      this.crystal(c,39,301,12,p);this.crystal(c,923,274,14,p);
      return canvas;
    }
    staticPillar(c,x,y,p,w=28){
      oval(c,x+7,y+5,w*.7,9,'#111d28');box(c,x-w*.65,y-6,w*1.3,11,p.void);box(c,x-w*.55,y-10,w*1.1,10,p.trim);
      box(c,x-w*.42,y-59,w*.84,51,p.stone);box(c,x-w*.3,y-57,w*.19,44,p.edge);box(c,x+w*.16,y-57,w*.2,47,p.wall);
      box(c,x-w*.6,y-65,w*1.2,10,p.trim);box(c,x-w*.6+2,y-65,w*1.2-4,3,p.accent);box(c,x-w*.43,y-37,w*.85,2,p.wall);
    }
    gate(c,x,y,p,region){
      box(c,x-48,y-39,96,44,p.void);box(c,x-41,y-34,82,39,p.wall);box(c,x-31,y-29,62,34,'#111729');
      box(c,x-27,y-25,54,30,region===0?'#244f4b':region===1?'#343563':'#643b54');box(c,x-20,y-21,40,26,p.glow);
      box(c,x-11,y-17,22,22,p.light);box(c,x-49,y-37,8,43,p.trim);box(c,x+41,y-37,8,43,p.trim);box(c,x-50,y-39,100,6,p.accent);
      box(c,x-56,y+5,112,5,p.edge);box(c,x-63,y+10,126,5,p.stone);box(c,x-69,y+15,138,5,p.wall);
    }
    canopy(c,x,y,r,p,rnd){
      stroke(c,x,y,x+8,y+43,'#344737',9);stroke(c,x+5,y+22,x+29,y+40,'#344737',6);
      for(let i=0;i<7;i++){const a=i*TAU/7;pixelDisk(c,x+Math.cos(a)*r*.6,y+Math.sin(a)*r*.4,r*.55,'#193c35');pixelDisk(c,x+Math.cos(a)*r*.6-4,y+Math.sin(a)*r*.4-5,r*.35,'#2d5745');}
      for(let i=0;i<12;i++)box(c,x-r+rnd()*r*2,y-r*.5+rnd()*r,4,3,'#527956');
    }
    root(c,x,y,dir,p){for(let i=0;i<3;i++){stroke(c,x,y+i*29,x+dir*(20+i*8),y+36+i*32,'#405343',6-i);stroke(c,x+dir*(20+i*8),y+36+i*32,x+dir*(9+i*4),y+68+i*32,'#405343',4-i);}}
    mushrooms(c,x,y,p){[[0,0,9],[14,-5,7],[-12,4,5]].forEach(([dx,dy,r])=>{box(c,x+dx-2,y+dy,4,9,'#c2b798');pixelDisk(c,x+dx,y+dy,r,'#6b9c85');box(c,x+dx-2,y+dy-3,3,3,'#d2dfb7');});}
    shelf(c,x,y,w,h,p,rnd){box(c,x,y,w,h,'#342737');box(c,x+4,y+4,w-8,h-8,'#15182d');const colors=['#7d6d9b','#a57f81','#647f86','#afa182'];for(let row=0;row<2;row++){let xx=x+7;while(xx<x+w-8){const ww=4+Math.floor(rnd()*4),hh=9+Math.floor(rnd()*7);box(c,xx,y+19+row*22-hh,ww,hh,colors[Math.floor(rnd()*4)]);box(c,xx+1,y+21+row*22-hh,ww-2,2,'#c2af93');xx+=ww+2;}box(c,x+2,y+20+row*22,w-4,4,'#846376');}}
    bookPile(c,x,y,p){box(c,x-12,y,26,5,'#756080');box(c,x-8,y-5,24,5,'#c1ad92');box(c,x-9,y-7,26,3,'#8d6e80');box(c,x-5,y-13,20,6,'#6b728b');box(c,x-3,y-12,16,3,'#d4c0a1');}
    crystal(c,x,y,r,p){oval(c,x,y+r*.6,r,4,p.void);[[0,0,1],[-r*.65,5,.55],[r*.65,5,.6]].forEach(([dx,dy,s])=>{gem(c,x+dx,y-r*s*.5+dy,r*s,p.glow);gem(c,x+dx-2,y-r*s*.55+dy-3,r*s*.55,p.light);});}

    burst(kind='cast'){
      this.flashKind=String(kind);this.flash=1;
      const scene=this.lastScene,run=scene?.run,arena=EXPLORATION_STATES.has(run?.status)?run?.exploration:run?.arena,player=arena?.player;
      const target=arena?.enemies?.find(e=>String(e.id)===String(arena?.targetId)&&e.alive!==false&&e.hp>0);
      const friendly=/hurt|damage|heal|potion|shield|barrier|dash/.test(kind);
      const x=friendly?val(player?.x,260):val(target?.x,660),y=friendly?val(player?.y,320)-20:val(target?.y,285)-18;
      const color=/heal|potion/.test(kind)?'#b7ecc1':/hurt|damage/.test(kind)?'#ffa9a4':/shield|barrier/.test(kind)?'#b2dcff':/loot|gold|victory/.test(kind)?'#ffe0a0':'#dfc3ff';
      for(let i=0;i<22;i++){const a=this.random()*TAU,v=25+this.random()*70;this.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-22,life:.35+this.random()*.4,color,size:i%4?2:4});}
      if(/hurt|damage|signature|death|boss|bomb/.test(kind))this.shake=.65;
      if(this.particles.length>140)this.particles=this.particles.slice(-140);
    }
    draw(input=null,time=0){
      const scene=input&&Object.prototype.hasOwnProperty.call(input,'run')?input:{run:input};
      const run=scene.run||null,exploration=EXPLORATION_STATES.has(run?.status)?run?.exploration:null,arena=exploration?null:run?.arena||null,region=regionOf(run),p=PAL[region];
      const paused=!!scene.paused,still=paused||!!scene.reducedMotion;
      const stamp=val(time),dt=this.lastTime===null?0:clamp((stamp-this.lastTime)/1000,0,.05);this.lastTime=stamp;
      if(!paused)this.clock+=dt;const t=still?0:this.clock;
      this.lastScene=scene;
      const roomKey=exploration?.key??arena?.room?.id??null;if(roomKey!==this.lastRoom){this.trail=[];this.particles=[];this.lastPlayer=null;this.lastRoom=roomKey;}
      const c=this.ctx;c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.clearRect(0,0,W,H);box(c,0,0,W,H,p.void);
      if(!still&&this.shake>0)c.translate(Math.round(Math.sin(t*73)*this.shake*3),Math.round(Math.cos(t*91)*this.shake*2));
      c.drawImage(this.backdrops[region],0,0);this.ambience(c,p,region,t,still);
      if(exploration)this.drawExploration(c,exploration,run,scene,p,region,t,dt,still);
      else if(arena)this.drawArena(c,arena,run,scene,p,region,t,dt,still);else this.lobby(c,p,region,t);
      this.localEffects(c,p,dt,paused,still);
      // A small foreground lip encloses the room without obscuring feet.
      c.globalAlpha=.28;box(c,24,502,912,9,p.void);c.globalAlpha=1;
      c.restore();
      if(!paused){this.shake=Math.max(0,this.shake-dt*2);this.flash=Math.max(0,this.flash-dt*2.5);}
    }
    ambience(c,p,region,t,still){
      [282,679].forEach((x,i)=>{
        const yy=41,f=still?0:Math.floor((t+i)*8)%3;aura(c,x,yy,29,region===1?'#b6a0f0':'#ffc697',.06);
        box(c,x-3,yy-12,7,13,'#db9a79');box(c,x-1,yy-17-f,4,15,'#ffd6a0');box(c,x,yy-10,2,8,'#ffedc0');
      });
      aura(c,480,61,51,p.glow,.035);
      for(let i=0;i<16;i++){const x=54+(i*139.83)%850+Math.sin(t*.25+i)*8,y=63+(i*73.17+t*(i%3+1)*2)%423;c.save();c.globalAlpha=.14+Math.sin(t+i)**2*.3;box(c,x,y,2,2,i%4===0?p.accent:p.light);c.restore();}
      if(region===2){for(let i=0;i<4;i++){c.save();c.globalAlpha=.1+.06*Math.sin(t+i);box(c,i%2?918:27,160+i*75,7,46,p.hot);c.restore();}}
    }
    drawArena(c,a,run,scene,p,region,t,dt,still){
      const player=a.player||{x:260,y:320,r:12},enemies=Array.isArray(a.enemies)?a.enemies:[];
      const living=enemies.filter(e=>e.alive!==false&&val(e.hp,1)>0);
      const active=living.filter(e=>e.active!==false);
      const obstacles=Array.isArray(a.obstacles)?a.obstacles:[];
      if(a.room?.spring)this.spring(c,a.room.spring,player,t,still);
      // Hazards live below all actors, with separate warning and active states.
      (a.hazards||[]).forEach(h=>this.hazard(c,h,p,t,still));
      (a.effects||[]).filter(e=>/dash|spawn|death/.test(e.kind)).forEach(e=>this.effect(c,e,p,t,still));
      if(player.dashTime>0&&!still){
        if(!this.lastPlayer||Math.hypot(player.x-this.lastPlayer.x,player.y-this.lastPlayer.y)>3)this.trail.push({x:player.x,y:player.y,life:.22,facingX:player.facingX});
        this.lastPlayer={x:player.x,y:player.y};
      }else this.lastPlayer=null;
      for(let i=this.trail.length-1;i>=0;i--){const trail=this.trail[i];if(!scene.paused)trail.life-=dt;if(trail.life<=0){this.trail.splice(i,1);continue;}if(!still){c.save();c.globalAlpha=trail.life*.8;this.mage(c,trail,p,t,true,run);c.restore();}}
      if(this.trail.length>12)this.trail=this.trail.slice(-12);
      const target=active.find(e=>String(e.id)===String(a.targetId));
      if(target)this.targetRing(c,target,p,t);
      const layers=obstacles.map(o=>({kind:'obstacle',object:o,y:val(o.y)+val(o.h,38)}));
      living.forEach(e=>layers.push({kind:'enemy',object:e,y:val(e.y)}));layers.push({kind:'player',object:player,y:val(player.y)});
      layers.sort((a,b)=>a.y-b.y);
      layers.forEach(layer=>{
        if(layer.kind==='obstacle')this.obstacle(c,layer.object,p,region);
        else if(layer.kind==='player')this.mage(c,layer.object,p,t,still,run);
        else this.foe(c,layer.object,p,t,still,region);
      });
      (a.projectiles||[]).forEach(b=>this.projectile(c,b,p,t,still));
      (a.effects||[]).filter(e=>!/dash|spawn|death/.test(e.kind)).forEach(e=>this.effect(c,e,p,t,still));
      active.forEach(e=>this.healthBar(c,e,p));
      this.playerStatus(c,player,run,p,t,still);
      const aim=scene.aim;
      if(aim&&Number.isFinite(aim.x)&&Number.isFinite(aim.y)&&aim.x>24&&aim.x<936&&aim.y>55&&aim.y<504){
        c.save();c.globalAlpha=.55;const x=aim.x,y=aim.y;stroke(c,x-7,y,x-3,y,p.light,1);stroke(c,x+3,y,x+7,y,p.light,1);stroke(c,x,y-7,x,y-3,p.light,1);stroke(c,x,y+3,x,y+7,p.light,1);c.restore();
      }
    }
    drawExploration(c,a,run,scene,p,region,t,dt,still){
      const player=a.player||{x:480,y:420,r:12},objects=Array.isArray(a.objects)?a.objects:[],obstacles=Array.isArray(a.obstacles)?a.obstacles:[];
      objects.forEach(o=>{
        const x=val(o.x),y=val(o.y),r=Math.max(1,val(o.interactionRadius,85)),near=String(o.id)===String(a.nearbyId)||String(o.id)===String(a.dialogId),color=o.color||p.glow;
        // The circle is the exact interaction radius in world space.
        c.save();c.globalAlpha=near?.09:.025;c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
        c.globalAlpha=near?.48:.12;c.strokeStyle=color;c.lineWidth=near?2:1;c.setLineDash(near?[7,5]:[2,9]);c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();c.setLineDash([]);
        if(near){c.globalAlpha=.65;oval(c,x,y+3,val(o.r,24)+7,9,color);}
        c.restore();
      });
      if(player.dashTime>0&&!still){
        if(!this.lastPlayer||Math.hypot(player.x-this.lastPlayer.x,player.y-this.lastPlayer.y)>3)this.trail.push({x:player.x,y:player.y,life:.22,facingX:player.facingX});
        this.lastPlayer={x:player.x,y:player.y};
      }else this.lastPlayer=null;
      for(let i=this.trail.length-1;i>=0;i--){const trail=this.trail[i];if(!scene.paused)trail.life-=dt;if(trail.life<=0){this.trail.splice(i,1);continue;}if(!still){c.save();c.globalAlpha=trail.life*.8;this.mage(c,trail,p,t,true,run);c.restore();}}
      if(this.trail.length>12)this.trail=this.trail.slice(-12);
      const layers=obstacles.map(o=>({kind:'obstacle',object:o,y:val(o.y)+val(o.h,38)}));
      objects.forEach(o=>layers.push({kind:'interactable',object:o,y:val(o.y)}));layers.push({kind:'player',object:player,y:val(player.y)});
      layers.sort((a,b)=>a.y-b.y).forEach(layer=>{
        if(layer.kind==='obstacle')this.obstacle(c,layer.object,p,region);
        else if(layer.kind==='player')this.mage(c,player,p,t,still,run);
        else this.interactable(c,layer.object,p,t,still,String(layer.object.id)===String(a.nearbyId)||String(layer.object.id)===String(a.dialogId));
      });
      objects.forEach(o=>this.interactionLabel(c,o,p,String(o.id)===String(a.nearbyId)||String(o.id)===String(a.dialogId),String(o.id)===String(a.dialogId)));
      this.playerStatus(c,player,run,p,t,still);
    }
    interactable(c,o,p,t,still,near){
      const x=val(o.x),y=val(o.y),color=o.color||p.glow;
      c.save();c.globalAlpha=.45;oval(c,x,y+3,o.kind==='door'||o.kind==='exit'?44:32,10,p.void);c.restore();
      if(o.kind==='door'||o.kind==='exit'){
        const exit=o.kind==='exit',w=exit?56:68,h=exit?76:92;
        aura(c,x,y-h*.45,45,color,near?.13:.07);
        box(c,x-w/2-8,y-h-4,w+16,h+9,p.void);box(c,x-w/2-4,y-h-7,w+8,h+10,p.trim);
        box(c,x-w/2+3,y-h+2,w-6,h-2,'#101b2b');box(c,x-w/2+8,y-h+6,w-16,h-10,color);
        c.save();c.globalAlpha=.68;box(c,x-w/2+11,y-h+10,w-22,h-17,p.void);c.restore();
        box(c,x-w/2-9,y-h-10,w+18,7,p.accent);box(c,x-w/2-10,y+2,w+20,6,p.stone);box(c,x-w/2-15,y+8,w+30,5,p.wall);
        for(let i=0;i<4;i++){const yy=y-18-i*16;box(c,x-w/2-3,yy,4,5,color);box(c,x+w/2-1,yy,4,5,color);}
        const symbol=exit?'↑':o.icon||'◇';c.save();c.font='bold 24px sans-serif';c.textAlign='center';c.fillStyle=color;c.fillText(symbol,x,y-h*.52+8);c.restore();
        if(!still){for(let i=0;i<5;i++){const yy=y-12-(t*15+i*17)%Math.max(1,h-16);c.save();c.globalAlpha=.6;box(c,x-18+i*9,yy,2,3,color);c.restore();}}
      }else if(o.kind==='merchant'||o.kind==='npc'){
        const npcId=o.npcId||o.sprite||(o.kind==='merchant'?'merchant':'healer');
        c.save();c.translate(x,y);c.scale(.88,.88);this.npc(c,npcId,p,t,still,false,1);c.restore();
      }else if(o.kind==='camp'){
        const training=/train|power|strength|forge/.test(String(o.id)+' '+String(o.action)+' '+String(o.args));
        if(training){
          box(c,x-4,y-55,8,55,'#8d715a');box(c,x-22,y-43,44,7,'#b1936c');box(c,x-10,y-69,20,18,'#b5a186');
          box(c,x-20,y-47,40,31,'#66536a');box(c,x-14,y-44,28,24,'#8c6c87');gem(c,x,y-30,9,color);box(c,x-19,y-6,38,7,p.trim);
        }else{
          for(let i=0;i<6;i++){const angle=i*TAU/6;pixelDisk(c,x+Math.cos(angle)*25,y+Math.sin(angle)*10,7,p.trim);}
          stroke(c,x-17,y+2,x+14,y-7,'#9b795b',7);stroke(c,x-14,y-6,x+17,y+2,'#c39a6d',6);
          const f=still?0:Math.sin(t*9)*4;aura(c,x,y-19,42,'#ffc789',.13);
          poly(c,[[x-15,y-5],[x-8,y-31],[x-1,y-19],[x+4,y-48-f],[x+13,y-23],[x+16,y-5]],'#e98e6a');
          poly(c,[[x-8,y-6],[x-4,y-23],[x+2,y-13],[x+5,y-32-f],[x+9,y-6]],'#ffe0a4');
        }
      }else{
        // Loot rises above a stone plinth; the card symbol identifies its effect.
        box(c,x-28,y-5,56,11,p.wall);box(c,x-23,y-13,46,11,p.stone);box(c,x-25,y-17,50,5,p.trim);box(c,x-20,y-17,40,2,p.accent);
        const bob=still?0:Math.sin(t*2+x)*3;aura(c,x,y-39,27,color,near?.14:.07);
        if(o.rewardKind==='relic'){gem(c,x,y-41+bob,21,color);gem(c,x-3,y-45+bob,12,p.light);}
        else if(o.rewardKind==='item'||o.rewardKind==='supply'){
          box(c,x-13,y-53+bob,26,32,'#192b3a');box(c,x-10,y-45+bob,20,21,color);box(c,x-6,y-61+bob,12,10,p.accent);box(c,x-8,y-56+bob,16,5,p.light);box(c,x-6,y-42+bob,3,13,p.light);
        }else{box(c,x-18,y-59+bob,36,40,'#d6c4a0');box(c,x-14,y-55+bob,28,32,'#625372');gem(c,x,y-40+bob,12,color);box(c,x-10,y-25+bob,20,2,p.accent);}
      }
    }
    interactionLabel(c,o,p,near,open){
      const x=val(o.x),y=val(o.y),name=String(o.name||'互動'),color=o.color||p.light;
      const width=Math.min(198,Math.max(86,name.length*15+22)),left=clamp(x-width/2,28,W-width-28),labelY=clamp(y+24,78,H-46);
      c.save();c.globalAlpha=.89;box(c,left,labelY-13,width,26,near?'#273245':'#152431');c.globalAlpha=1;
      if(near)box(c,left,labelY+11,width,2,color);
      c.font='bold 14px sans-serif';c.textAlign='center';c.fillStyle=near?'#fff1d3':'#d3ded5';c.fillText(name.length>12?name.slice(0,11)+'…':name,left+width/2,labelY+5);
      if(near){const top=clamp(y-(o.kind==='door'?124:o.kind==='exit'?108:98),64,H-78),text=open?'交談中':'E 互動';box(c,x-36,top-16,72,25,'#e6d2a5');box(c,x-34,top-14,68,21,'#29313c');c.fillStyle='#fff0c7';c.font='bold 13px sans-serif';c.fillText(text,x,top+1);}
      c.restore();
    }
    npc(c,id,p,t,still,boss,phase){
      const anger=boss?'#ffab9d':p.light,bob=still||boss?0:Math.sin(t*1.6)*1.5;
      c.save();c.translate(0,bob);
      if(boss){aura(c,0,-35,58,anger,phase>1?.15:.07);for(let i=0;i<5;i++){const a=i*TAU/5+(still?0:t*.5);gem(c,Math.cos(a)*46,-38+Math.sin(a)*31,phase>1?6:4,anger);}}
      if(id==='merchant'){
        // Travelling merchant: pointed hood, asymmetric coin satchel and scales.
        box(c,-17,-14,11,15,'#473c46');box(c,7,-14,11,15,'#473c46');poly(c,[[-26,-9],[-22,-55],[0,-65],[23,-53],[27,-9]],'#8f685b');
        poly(c,[[-19,-52],[-12,-80],[6,-87],[22,-54]],'#d2a271');box(c,-12,-60,29,19,'#4b3d48');box(c,-6,-57,5,4,boss?'#ff8f88':'#f0d293');box(c,7,-57,5,4,boss?'#ff8f88':'#f0d293');
        box(c,-7,-39,14,25,'#bd8a63');box(c,-23,-26,48,6,'#553b4c');box(c,13,-28,20,21,'#d6ad72');box(c,18,-25,8,8,'#f7d591');
        stroke(c,-36,-48,-36,-5,'#c7a277',4);stroke(c,-50,-42,-23,-42,'#dfbc83',3);stroke(c,-49,-42,-49,-29,'#d4b17c',1);stroke(c,-24,-42,-24,-29,'#d4b17c',1);oval(c,-49,-27,8,3,'#d4b17c');oval(c,-24,-27,8,3,'#d4b17c');
      }else if(id==='healer'){
        // A broad mushroom cap and leaf apron distinguish the thorn herbalist.
        box(c,-14,-12,10,13,'#4c5654');box(c,5,-12,10,13,'#4c5654');poly(c,[[-23,-8],[-18,-46],[17,-46],[24,-8]],'#6b9b81');box(c,-11,-53,23,19,'#e4c3a3');
        pixelDisk(c,0,-62,27,'#bc7187');box(c,-29,-63,58,7,'#e5b6a5');box(c,-15,-78,8,5,'#f2cfaa');box(c,5,-73,10,5,'#f2cfaa');box(c,-7,-47,3,4,boss?'#ee6f6d':'#3b474c');box(c,5,-47,3,4,boss?'#ee6f6d':'#3b474c');
        box(c,-10,-31,20,18,'#bed1a6');box(c,-2,-28,4,12,'#5c8d76');box(c,-6,-24,12,4,'#5c8d76');stroke(c,29,-3,25,-55,'#a3a77a',4);gem(c,26,-59,12,'#c4efb5');poly(c,[[26,-37],[39,-44],[37,-32]],'#83b991');
      }else if(id==='smith'){
        // Squared shoulders, leather apron and a massive silver hammer.
        box(c,-18,-14,12,15,'#4a4655');box(c,7,-14,12,15,'#4a4655');box(c,-25,-51,50,39,'#777887');box(c,-15,-50,31,40,'#bf8464');box(c,-24,-58,48,14,'#a2a8b4');
        box(c,-13,-71,26,24,'#d3ad91');box(c,-17,-76,34,12,'#4f5465');box(c,-16,-72,32,3,'#d7bc88');box(c,-10,-59,6,4,boss?'#f88877':'#363844');box(c,4,-59,6,4,boss?'#f88877':'#363844');box(c,-10,-51,20,12,'#655064');
        box(c,-10,-33,20,16,'#5e4d58');box(c,-7,-29,4,6,'#e9b882');stroke(c,32,-6,32,-66,'#a77a5b',6);box(c,20,-77,31,23,'#4d5065');box(c,21,-77,29,6,'#c1bec1');box(c,44,-73,8,15,'#8e90a2');
      }else if(id==='cartographer'){
        // Long indigo cloak, monocle, paper scroll and a floating compass.
        poly(c,[[-25,-4],[-18,-52],[13,-57],[27,-3]],'#73789c');box(c,-11,-63,24,19,'#d6ba9f');box(c,-20,-65,41,7,'#b0aec0');poly(c,[[-15,-65],[-6,-88],[18,-67]],'#8e91b6');
        box(c,-7,-57,4,4,boss?'#ed8c83':'#3b4059');box(c,2,-59,12,9,'#e0c995');box(c,5,-57,6,5,'#8fb8c4');box(c,-24,-34,49,23,'#d9c8a3');box(c,-27,-37,7,29,'#f1ddad');box(c,21,-37,7,29,'#f1ddad');
        stroke(c,-15,-23,-4,-28,'#8a7c7e',2);stroke(c,-4,-28,7,-19,'#8a7c7e',2);stroke(c,7,-19,16,-26,'#8a7c7e',2);gem(c,36,-56+(still?0:Math.sin(t*2)*3),12,'#e6c38c');gem(c,36,-56,6,'#99c6ce');
      }else{
        // Ferryman: tall veiled silhouette, crescent lantern and a long oar.
        poly(c,[[-26,-2],[-18,-67],[0,-87],[17,-69],[25,-2]],'#4b7182');poly(c,[[-12,-63],[0,-78],[12,-62],[9,-39],[-9,-39]],'#172c42');box(c,-7,-60,4,4,boss?'#ff9b91':'#b9e0de');box(c,4,-60,4,4,boss?'#ff9b91':'#b9e0de');
        poly(c,[[-19,-36],[-30,-11],[-5,-17]],'#7ba3a9');poly(c,[[17,-37],[29,-13],[7,-19]],'#709ba6');stroke(c,32,1,32,-90,'#aca17d',4);box(c,27,-88,10,22,'#d8c69a');
        stroke(c,-24,-39,-35,-39,'#d1c59d',2);stroke(c,-35,-39,-35,-25,'#d1c59d',2);aura(c,-35,-17,19,'#a2e3e1',.11);box(c,-42,-27,14,18,'#687e91');box(c,-39,-24,8,12,'#c3f0dd');box(c,-44,-10,18,3,'#b5c3a5');
      }
      if(boss&&phase>1){box(c,-18,-87,36,3,'#f3b09c');gem(c,0,-98,8,'#ffd1b0');}
      c.restore();
    }
    spring(c,s,player,t,still){
      const x=val(s.x),y=val(s.y),r=Math.max(1,val(s.r,48)),inside=Math.hypot(val(player.x)-x,val(player.y)-y)<=r;
      c.save();c.globalAlpha=inside?.24:.15;c.fillStyle='#84eacb';c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
      c.globalAlpha=.8;c.strokeStyle='#9cebd7';c.lineWidth=2;c.setLineDash([7,5]);c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();c.setLineDash([]);
      c.globalAlpha=.35;c.lineWidth=1;c.beginPath();c.arc(x,y,r*.76,0,TAU);c.stroke();
      for(let i=0;i<8;i++){const a=i*TAU/8+(still?0:t*.13);box(c,x+Math.cos(a)*r*.58-1,y+Math.sin(a)*r*.58-1,3,3,'#b9f5dc');}
      c.globalAlpha=inside?1:.75;box(c,x-2,y-8,4,16,'#c8ffe9');box(c,x-8,y-2,16,4,'#c8ffe9');
      c.font='12px sans-serif';c.textAlign='center';c.fillStyle='#c8ffe9';c.fillText('回復靈泉',x,y+r+16);c.restore();
    }
    obstacle(c,o,p,region){
      const x=val(o.x),y=val(o.y),w=val(o.w,40),h=val(o.h,40),cx=x+w/2,base=y+h;
      c.save();c.globalAlpha=.35;oval(c,cx+9,base+2,w*.7,h*.25,p.void);c.restore();
      if(o.type==='wall'){
        box(c,x-3,y-23,w+6,h+26,p.void);box(c,x,y-24,w,h+24,p.wall);box(c,x,y-24,w,h*.55+8,p.stone);box(c,x+2,y-24,w-4,3,p.edge);box(c,x,y+h*.55-17,w,4,p.trim);
        for(let xx=x+24;xx<x+w;xx+=28)box(c,xx,y-21,2,h+18,p.void);
        if(region===0){box(c,x+3,y-26,w-6,4,p.leaf);box(c,x+9,y-22,8,10,p.leaf);}
      }else{
        const shaft=Math.max(28,h*.9),cap=Math.max(30,w+4);
        box(c,x-4,base-8,w+8,12,p.void);box(c,x-1,base-12,w+2,10,p.trim);box(c,x+4,base-shaft-13,w-8,shaft,p.stone);
        box(c,x+7,base-shaft-10,Math.max(4,w*.15),shaft-4,p.edge);box(c,x+w-11,base-shaft-10,5,shaft-4,p.wall);
        box(c,cx-cap/2,base-shaft-18,cap,10,p.trim);box(c,cx-cap/2+2,base-shaft-18,cap-4,3,p.accent);
        box(c,x+4,base-shaft*.55,w-8,2,p.wall);
        if(region===0){box(c,x+1,base-shaft-20,w-2,3,p.leaf);box(c,x+w-11,base-shaft-17,6,13,p.leaf);}
        if(region===2){gem(c,cx,base-shaft-21,8,p.glow);}
      }
    }
    mage(c,a,p,t,still,run){
      const x=val(a.x),y=val(a.y),dash=val(a.dashTime)>0,invuln=val(a.invulnerable)>0;
      const face=val(a.facingX,1)<-.05?-1:1;
      c.save();c.globalAlpha*=.48;oval(c,x,y+2,dash?22:17,6,p.void);c.restore();
      if(dash)aura(c,x,y-11,22,'#bfeaff',.11);
      c.save();if(invuln&&!still)c.globalAlpha*=.62+Math.sin(t*26)**2*.3;
      c.translate(Math.round(x),Math.round(y));c.scale(face*.57,.57);
      if(this.legacy?.hero)this.legacy.hero.call(this.legacy,c,-34,-98,t,run?.player,still||dash);
      else this.fallbackMage(c,p);
      c.restore();
      if(dash){stroke(c,x-face*25,y-17,x-face*43,y-17,'#bad6f9',2);stroke(c,x-face*23,y-9,x-face*34,y-9,'#97b4e5',2);}
    }
    fallbackMage(c,p){
      poly(c,[[-28,-12],[-17,-53],[15,-53],[27,-12]],'#685a91');box(c,-16,-58,30,17,'#ebbf9a');poly(c,[[-37,-58],[-11,-96],[22,-60],[38,-55]],'#a794cb');box(c,-36,-59,74,5,'#d7b9e5');box(c,-8,-51,4,4,'#393047');box(c,30,-64,4,57,'#c3a280');gem(c,32,-72,10,p.light);
    }
    foe(c,e,p,t,still,region){
      const x=val(e.x),y=val(e.y),boss=e.kind==='boss'||e.boss;
      const type=e.npcId||e.sprite||e.enemyId||e.id||'slime',npcId=String(type).replace(/^npc-/,''),isNpc=NPC_IDS.has(npcId);
      const spawning=e.active===false,scale=isNpc?(boss?1.12:.88):(boss?.7:.66);
      c.save();c.globalAlpha*=spawning?.25:.4;oval(c,x,y+2,boss?39:20,boss?10:6,p.void);c.restore();
      if(spawning){c.save();c.globalAlpha=.35;this.targetRing(c,e,p,t);c.restore();}
      c.save();if(spawning)c.globalAlpha*=.45;c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
      if(isNpc)this.npc(c,npcId,p,t,still,boss,val(e.phase,1));
      else if(this.legacy?.enemy)this.legacy.enemy.call(this.legacy,c,0,0,{id:type,kind:boss?'boss':e.kind,boss,phase:e.phase},t,p,still,[1,0,2][region]);
      else this.fallbackFoe(c,e,p,boss);
      c.restore();
      if(val(e.chargeTime)>0){c.save();c.globalAlpha=.7;stroke(c,x-val(e.chargeX)*20,y-val(e.chargeY)*20,x-val(e.chargeX)*37,y-val(e.chargeY)*37,p.hot,3);c.restore();}
      if(e.phase>1&&boss){c.save();c.globalAlpha=.45;gem(c,x,y-(boss?114:54),6,p.hot);c.restore();}
    }
    fallbackFoe(c,e,p,boss){
      const r=boss?42:24;pixelDisk(c,0,-r,r,'#453b58');pixelDisk(c,0,-r-4,r*.8,p.glow);box(c,-r*.45,-r-8,7,7,'#272139');box(c,r*.2,-r-8,7,7,'#272139');if(boss){gem(c,-24,-r*2,13,p.accent);gem(c,24,-r*2,13,p.accent);}
    }
    targetRing(c,e,p,t){
      const x=val(e.x),y=val(e.y),r=val(e.r,15)+8,boss=e.kind==='boss'||e.boss;
      c.save();c.strokeStyle='#f7d59a';c.lineWidth=2;c.globalAlpha=.78;
      for(let i=0;i<4;i++){const a=i*TAU/4+.2;c.beginPath();c.ellipse(x,y+2,r,r*.65,0,a,a+.63);c.stroke();}
      // Small downward chevron marks the currently selected spell target.
      const top=y-(boss?116:61);poly(c,[[x-4,top-4],[x+4,top-4],[x,top]],'#f7d59a');c.restore();
    }
    healthBar(c,e,p){
      if(e.active===false)return;
      const boss=e.kind==='boss'||e.boss,width=boss?67:34,x=val(e.x)-width/2,y=val(e.y)-(boss?108:55),ratio=clamp(val(e.hp)/Math.max(1,val(e.maxHp,1)),0,1);
      box(c,x-2,y-2,width+4,8,'#0f1725');box(c,x,y,width,4,'#493341');box(c,x,y,Math.max(0,width*ratio),4,boss?'#eeaa92':'#b992ad');box(c,x,y,Math.max(0,width*ratio),1,boss?'#ffdebb':'#e4bdd1');
    }
    playerStatus(c,a,run,p,t,still){
      const x=val(a.x),y=val(a.y),shield=val(run?.player?.shield),hp=val(run?.player?.hp,100),max=val(run?.player?.maxHp,100);
      if(shield>0){c.save();c.globalAlpha=.32;c.strokeStyle='#b0d6ff';c.lineWidth=2;c.beginPath();c.ellipse(x,y-22,24,33,0,0,TAU);c.stroke();gem(c,x,y-60,4,'#b0d6ff');c.restore();}
      if(hp/max<.3){c.save();c.globalAlpha=still?.22:.15+Math.sin(t*3)**2*.12;oval(c,x,y+2,22,8,'#ff9a9a');c.restore();}
      // Recharge pips below the character keep the dodge state near the action.
      const cd=Math.max(0,val(a.dashCooldown)),ready=cd<=0;
      for(let i=0;i<3;i++)box(c,x-7+i*5,y+12,3,2,ready?'#b0dbc4':(i<Math.ceil((1-clamp(cd/1.15,0,1))*3)?'#b0dbc4':'#51616d'));
    }
    hazard(c,h,p,t,still){
      if(val(h.life,1)<=0&&val(h.delay)<=0)return;
      const kind=h.kind||'circle',x=val(h.x),y=val(h.y),warning=val(h.delay)>0,color=h.color||'#ffab9c';
      c.save();c.strokeStyle=color;c.fillStyle=color;c.lineWidth=warning?2:3;
      const pulse=still?.17:.12+Math.sin(t*5)**2*.07;c.globalAlpha=warning?pulse:.25;
      const r=Math.max(1,val(h.r,36)),inner=Math.max(0,val(h.innerR));
      const shape=()=>{
        c.beginPath();
        if(kind==='rect')c.rect(x,y,val(h.w,50),val(h.h,50));
        else if(kind==='line'){
          const x2=val(h.x2,x+90),y2=val(h.y2,y),width=val(h.width,18),a=Math.atan2(y2-y,x2-x)+Math.PI/2,ox=Math.cos(a)*width/2,oy=Math.sin(a)*width/2;
          c.moveTo(x+ox,y+oy);c.lineTo(x2+ox,y2+oy);c.lineTo(x2-ox,y2-oy);c.lineTo(x-ox,y-oy);c.closePath();
        }else if(kind==='cone'){
          const a=val(h.angle),spread=val(h.spread,Math.PI/3);c.moveTo(x,y);c.arc(x,y,r,a-spread/2,a+spread/2);c.closePath();
        }else{c.arc(x,y,r,0,TAU);if(kind==='ring'&&inner>0){c.moveTo(x+inner,y);c.arc(x,y,inner,0,TAU,true);}}
      };
      shape();c.fill('evenodd');c.globalAlpha=warning?.72:.92;c.setLineDash(warning?[5,5]:[]);shape();c.stroke();c.setLineDash([]);
      if(warning){
        c.globalAlpha=.85;const cx=kind==='rect'?x+val(h.w,50)/2:kind==='line'?(x+val(h.x2,x))/2:x,cy=kind==='rect'?y+val(h.h,50)/2:kind==='line'?(y+val(h.y2,y))/2:y;
        if(kind!=='ring'){box(c,cx-1,cy-6,2,7,color);box(c,cx-1,cy+4,2,2,color);}
        if((h.maxDelay||h.initialDelay)&&(kind==='circle'||kind==='ring')){c.globalAlpha=.3;const fraction=clamp(1-val(h.delay)/val(h.maxDelay||h.initialDelay,1),0,1);c.beginPath();c.arc(x,y,r,-Math.PI/2,-Math.PI/2+fraction*TAU);c.lineWidth=5;c.stroke();}
      }else{
        c.globalAlpha=.7;if(kind==='circle'){for(let i=0;i<6;i++){const a=i*TAU/6+t;box(c,x+Math.cos(a)*r*.65,y+Math.sin(a)*r*.65,3,3,color);}}
      }
      c.restore();
    }
    projectile(c,b,p,t,still){
      const x=val(b.x),y=val(b.y),r=clamp(val(b.r,5),2,16),color=b.color||(b.source==='enemy'?'#ffad9d':'#dfc5ff'),a=Math.atan2(val(b.vy),val(b.vx));
      c.save();if(!still){c.globalAlpha=.3;stroke(c,x-Math.cos(a)*r*3,y-Math.sin(a)*r*3,x,y,color,r*1.7);c.globalAlpha=1;}
      aura(c,x,y,r*2,color,.11);pixelDisk(c,x,y,r+1,'#291e33');pixelDisk(c,x,y,r,color);box(c,x-1,y-2,3,3,'#fff0da');c.restore();
    }
    effect(c,e,p,t,still){
      const x=val(e.x),y=val(e.y),life=val(e.life,1),max=val(e.maxLife,1),alpha=clamp(life/Math.max(.001,max),0,1),color=e.color||p.light,progress=1-alpha,r=val(e.r,22);
      if(life<=0)return;c.save();
      if(e.kind==='chain'||e.kind==='cast'){
        if(Number.isFinite(e.x2)&&Number.isFinite(e.y2)){
          const dx=e.x2-x,dy=e.y2-y,dist=Math.max(1,Math.hypot(dx,dy));c.globalAlpha=alpha*.8;c.strokeStyle=color;c.lineWidth=e.kind==='chain'?3:2;c.beginPath();c.moveTo(x,y-15);
          for(let i=1;i<9;i++){const f=i/9,jitter=still?0:Math.sin(i*2.4+val(e.id))*7;c.lineTo(x+dx*f-dy/dist*jitter,y-15+dy*f+dx/dist*jitter);}c.lineTo(e.x2,e.y2-15);c.stroke();
          aura(c,e.x2,e.y2-15,18,color,alpha*.12);
        }else{c.globalAlpha=alpha*.7;c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.ellipse(x,y,Math.max(3,r*(.6+progress)),Math.max(3,r*(.6+progress))*.72,0,0,TAU);c.stroke();}
      }else if(e.kind==='dash'){
        c.globalAlpha=alpha*.28;if(Number.isFinite(e.x2)&&Number.isFinite(e.y2))stroke(c,x,y,e.x2,e.y2,color,7);else oval(c,x,y,20,7,color);
      }else if(e.kind==='spawn'){
        c.globalAlpha=alpha*.6;c.strokeStyle=color;c.lineWidth=2;c.setLineDash([4,4]);c.beginPath();c.ellipse(x,y,r*(.7+progress*.3),r*(.7+progress*.3)*.6,0,0,TAU);c.stroke();c.setLineDash([]);gem(c,x,y-12-progress*20,7,color);
      }else{
        c.globalAlpha=alpha;for(let i=0;i<8;i++){const a=i*TAU/8,rr=r*(.25+progress);box(c,x+Math.cos(a)*rr,y-14+Math.sin(a)*rr*.75,alpha>.5?4:2,alpha>.5?4:2,color);}
        if(e.kind==='death'){c.globalAlpha=alpha*.4;gem(c,x,y-20-progress*13,8,color);}
        if(e.text||e.amount){c.globalAlpha=alpha;c.fillStyle=color;c.font='bold 13px monospace';c.textAlign='center';c.fillText(String(e.text||e.amount),x,y-32-progress*20);}
      }
      c.restore();
    }
    localEffects(c,p,dt,paused,still){
      for(let i=this.particles.length-1;i>=0;i--){const a=this.particles[i];if(!paused){a.life-=dt;if(!still){a.x+=a.vx*dt;a.y+=a.vy*dt;a.vy+=38*dt;}}if(a.life<=0){this.particles.splice(i,1);continue;}c.save();c.globalAlpha=Math.min(1,a.life*2);box(c,a.x,a.y,a.size,a.size,a.color);c.restore();}
      const a=this.lastScene?.run?.arena;if(this.flash>0&&/shield|barrier/.test(this.flashKind)&&a?.player){c.save();c.globalAlpha=this.flash*.7;c.strokeStyle='#b9ddff';c.lineWidth=2;c.beginPath();c.ellipse(a.player.x,a.player.y-20,26+12*(1-this.flash),35+12*(1-this.flash),0,0,TAU);c.stroke();c.restore();}
    }
    lobby(c,p,region,t){
      const props=[{x:255,y:177,w:39,h:39,type:'pillar'},{x:673,y:330,w:39,h:39,type:'pillar'}];props.forEach(o=>this.obstacle(c,o,p,region));
      const hero={x:409,y:331,r:12,facingX:1,dashTime:0};this.mage(c,hero,p,t,false,{player:{hp:100,maxHp:100}});
      if(this.legacy?.chest){c.save();c.translate(573,314);c.scale(.88,.88);this.legacy.chest.call(this.legacy,c,0,0,t,p);c.restore();}
      else{box(c,550,291,48,30,'#886875');box(c,550,300,48,4,p.accent);box(c,570,298,8,12,p.accent);}
      // Familiar floats beside the player and guides the eye to the doorway.
      const y=277+Math.sin(t*2)*3;aura(c,363,y,9,p.light,.12);pixelDisk(c,363,y,5,'#e6e4d5');box(c,360,y-1,2,2,p.void);box(c,365,y-1,2,2,p.void);
      c.save();c.globalAlpha=.26;c.strokeStyle=p.light;c.lineWidth=2;c.setLineDash([2,9]);c.beginPath();c.moveTo(458,288);c.quadraticCurveTo(495,228,480,95);c.stroke();c.restore();
    }
  }
  window.DungeonArenaRenderer=DungeonArenaRenderer;
})();
