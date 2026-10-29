/* Wordbound: original pixel arena art. World coordinates are 960 x 540.
 * Public API: new DungeonArenaRenderer(canvas), draw({run,paused,reducedMotion,aim}, ms), burst(kind).
 * DungeonCharacter and DungeonEnemyCharacter supply articulated actors;
 * DungeonRenderer remains the fallback for unknown appearances. */
(() => {
  'use strict';
  const W=960,H=540,TAU=Math.PI*2;
  const PAL=[
    {void:'#0b171c',wall:'#152d31',stone:'#254447',edge:'#375c59',floor:'#1c3638',line:'#12282e',light:'#b6efbd',glow:'#6ccbad',trim:'#618676',accent:'#dbc798',leaf:'#527c62',hot:'#ffa692'},
    {void:'#101426',wall:'#1c223c',stone:'#2c3452',edge:'#424b69',floor:'#252d48',line:'#192138',light:'#d6c6ff',glow:'#a28bed',trim:'#74759b',accent:'#dfc397',leaf:'#646582',hot:'#ffa6ae'},
    {void:'#1c111e',wall:'#321e30',stone:'#472c3c',edge:'#684351',floor:'#372a36',line:'#281d2c',light:'#ffd1b4',glow:'#f394a0',trim:'#956575',accent:'#ebba84',leaf:'#785469',hot:'#ffc09c'},
    {void:'#111a2e',wall:'#26384a',stone:'#3b5060',edge:'#6f8691',floor:'#243b4c',line:'#1a2d42',light:'#f8e4da',glow:'#b9dfe7',trim:'#adaca6',accent:'#ecd6ae',leaf:'#8ca899',hot:'#ffb4ca'}
  ];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const val=(n,d=0)=>Number.isFinite(Number(n))?Number(n):d;
  function random(seed){let n=seed|0;return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296;};}
  function box(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function stroke(c,x,y,xx,yy,color,w=2){c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();}
  function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,Math.max(1,rx),Math.max(1,ry),0,0,TAU);c.fill();}
  function pixelDisk(c,x,y,r,color){c.fillStyle=color;for(let dy=-r;dy<r;dy+=3){const dx=Math.floor(Math.sqrt(Math.max(0,r*r-dy*dy))/3)*3;c.fillRect(Math.round(x-dx),Math.round(y+dy),dx*2,3);}}
  function aura(c,x,y,r,color,alpha=.1){c.save();const opacity=c.globalAlpha;for(let i=3;i>0;i--){c.globalAlpha=opacity*alpha/i;oval(c,x,y,r*i*.6,r*i*.45,color);}c.restore();}
  function gem(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r*.65,y);c.lineTo(x,y+r);c.lineTo(x-r*.65,y);c.closePath();c.fill();}
  function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fill();}
  const regionOf=(run)=>typeof run?.region==='string'?({forest:0,mirror:1,library:1,void:2,obsidian:2,astral:3}[run.region]??0):clamp(val(run?.region),0,3);
  const NPC_IDS=new Set(['merchant','healer','smith','cartographer','ferryman','lantern','echo','sentinel','lumina']);
  const EXPLORATION_STATES=new Set(['route','shop','npc','camp','reward','event']);
  const BOSS_SCENES={
    thorn:{title:'纏根王庭',color:'#b6dab0',dark:'#263d36',motif:'bramble',defeat:'荊棘王冠枯萎'},
    spore:{title:'千孢聖所',color:'#c7d89d',dark:'#333d36',motif:'mycelium',defeat:'菌巢歸於寂靜'},
    witch:{title:'月鏡禁書閣',color:'#d1bfe9',dark:'#302c46',motif:'moonmirror',defeat:'禁書失去主人'},
    prism:{title:'碎晶迴廊',color:'#a8ddf0',dark:'#26364d',motif:'crystal',defeat:'鏡界分崩離析'},
    king:{title:'無主鐵王座',color:'#e4bd8d',dark:'#3a3037',motif:'throne',defeat:'王冠墜落'},
    hollow:{title:'無聲鐘塔',color:'#c3bfdb',dark:'#2d3041',motif:'belltower',defeat:'最後一聲鐘鳴'},
    astral:{title:'星骸觀測所',color:'#b4d9f2',dark:'#233448',motif:'constellation',defeat:'星龍重歸天際'},
    cometqueen:{title:'彗星冰宮',color:'#c7def5',dark:'#2f3d52',motif:'comet',defeat:'彗冠化為星塵'},
    constellation:{title:'斷誓星台',color:'#e9bedc',dark:'#383044',motif:'vow',defeat:'斷裂的星誓重新相連'},
    merchant:{title:'無底金庫',color:'#efd39d',dark:'#3b3430',motif:'vault',defeat:'契約作廢'},
    healer:{title:'夜露藥庭',color:'#b6e2bd',dark:'#293e37',motif:'conservatory',defeat:'荊藥歸眠'},
    smith:{title:'赤心鍛爐',color:'#efb087',dark:'#3d2c32',motif:'forge',defeat:'熔爐冷卻'},
    cartographer:{title:'無涯星圖室',color:'#ddcf9c',dark:'#353846',motif:'atlas',defeat:'命運地圖改寫'},
    ferryman:{title:'忘川渡口',color:'#a0d7cf',dark:'#213d43',motif:'river',defeat:'渡船停泊'},
    lantern:{title:'長夜燈廊',color:'#a7e5d5',dark:'#263d40',motif:'eclipse',defeat:'長夜留下一盞燈'},
    echo:{title:'回聲劇場',color:'#d0c0ef',dark:'#352d47',motif:'resonance',defeat:'最後的回聲消散'},
    sentinel:{title:'折劍祭壇',color:'#e6d8b2',dark:'#343b42',motif:'origami',defeat:'千刃低頭'},
    lumina:{title:'月花誓約庭',color:'#edc0d7',dark:'#30394b',motif:'moonflower',defeat:'月花為你綻放'}
  };

  class DungeonArenaRenderer {
    constructor(canvas){
      if(!canvas?.getContext)throw new Error('DungeonArenaRenderer requires a canvas');
      this.canvas=canvas;canvas.width=W;canvas.height=H;canvas.style.imageRendering='pixelated';
      this.ctx=canvas.getContext('2d',{alpha:false});this.ctx.imageSmoothingEnabled=false;
      this.backdrops=PAL.map((p,i)=>this.background(p,i));
      this.legacy=window.DungeonRenderer?.prototype||null;
      this.random=random(77483);this.clock=0;this.lastTime=null;this.particles=[];this.trail=[];this.shake=0;this.flash=0;this.flashKind='';this.lastScene=null;this.lastPlayer=null;this.lastRoom=null;
      this.visualRun=null;this.deathArena=null;this.seenDeaths=new Set();this.deathScenes=[];this.lastPhaseKey=null;
      this.actorTracks=new Map();this.actorFrame=0;this.actorRun=null;this.actorSpace=null;this.actorScope='';this.actorContext=null;this.hurtCue=0;
      this.bossBackdrops=new Map();
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
      }else if(region===2){
        [[68,111],[882,100],[83,466],[880,469]].forEach(([x,y],i)=>this.crystal(c,x,y,20+i%2*8,p));
        for(let i=0;i<8;i++){const x=i%2?895:56,y=140+i*43;stroke(c,x,y,x+(i%2?-1:1)*25,y+21,'#643a48',4);stroke(c,x,y,x+(i%2?-1:1)*25,y+21,'#aa615f',1);}
        [175,765].forEach(x=>{box(c,x-10,14,20,51,'#432435');gem(c,x,26,24,'#8d506b');gem(c,x-2,22,15,'#bd7c89');});
      }else{
        // A moonlit glasshouse: ivory ribs and rose beds frame a calm blue stage.
        for(const x of [124,213,747,836]){
          poly(c,[[x-37,45],[x-32,10],[x,0],[x+32,10],[x+37,45]],'#172a43');
          poly(c,[[x-30,40],[x-27,14],[x,4],[x+27,14],[x+30,40]],'#49768a');
          stroke(c,x-26,18,x+23,35,'#90bbc5',2);stroke(c,x,5,x,43,'#d3c8b0',3);
          stroke(c,x-36,44,x-31,11,'#c3c1b1',3);stroke(c,x+36,44,x+31,11,'#c3c1b1',3);
          box(c,x-39,43,78,5,'#dbd0b6');
        }
        for(const x of [73,887])for(const y of [144,388])this.roseBed(c,x,y,p);
        [308,652].forEach(x=>{box(c,x-9,5,18,38,'#e0d2ba');box(c,x-5,8,10,26,'#8d9da6');gem(c,x,22,8,'#f4c2cc');});
        c.save();c.globalAlpha=.2;for(let i=0;i<10;i++){
          const x=150+i*73,y=116+(i%3)*143;gem(c,x,y,4,'#eac2d0');box(c,x-1,y-1,2,2,'#fff1cf');
        }c.restore();
      }
      // Lamps and grounded scattered props add scale.
      [282,679].forEach(x=>{box(c,x-5,47,10,14,p.trim);box(c,x-8,44,16,5,p.accent);});
      this.crystal(c,39,301,12,p);this.crystal(c,923,274,14,p);
      this.architecture(c,p,region,rnd);
      return canvas;
    }
    architecture(c,p,region,rnd){
      // Pre-rendered material, skylight and foreground depth cost one bitmap per
      // frame. The luminous seams never resemble red enemy warning geometry.
      c.save();
      c.globalAlpha=.1;
      for(const x of [115,770])poly(c,[[x,53],[x+38,53],[x+108,489],[x+30,489]],p.light);
      c.globalAlpha=.22;
      for(const x of [30,930]){box(c,x,58,2,437,p.accent);for(let y=84;y<500;y+=28)box(c,x-2,y,6,3,p.trim);}
      // A quiet, worn runner leads through the chamber without changing bounds.
      c.globalAlpha=.1;box(c,428,72,104,405,p.glow);c.globalAlpha=.21;
      stroke(c,428,75,428,475,p.trim,1);stroke(c,532,75,532,475,p.trim,1);
      for(let i=0;i<36;i++){
        const x=110+rnd()*738,y=89+rnd()*382;
        c.globalAlpha=.08;box(c,x,y,11+rnd()*18,1,p.light);box(c,x+2,y+3,5,1,p.light);
      }
      c.globalAlpha=1;
      // Side reliefs and foreground cornices give every room an inhabited scale.
      for(const x of [53,907]){
        box(c,x-15,237,30,9,p.void);box(c,x-12,229,24,9,p.stone);box(c,x-14,227,28,4,p.edge);
        if(region===0){poly(c,[[x-9,226],[x-13,198],[x,187],[x+13,198],[x+9,226]],'#446956');gem(c,x,208,10,'#9ab995');}
        else if(region===1){box(c,x-10,198,20,28,'#726183');box(c,x-8,200,16,23,'#baa5b5');stroke(c,x-5,207,x+5,207,'#685b84',2);stroke(c,x-5,214,x+2,214,'#685b84',2);}
        else if(region===2){gem(c,x,211,22,'#734855');gem(c,x-2,206,14,'#ca8c94');gem(c,x-3,202,5,'#ffcbab');}
        else{stroke(c,x,227,x,197,'#baafa0',3);gem(c,x,196,10,'#f4c1d1');gem(c,x,194,5,'#fce7d9');}
      }
      for(const x of [108,852]){
        box(c,x-58,518,116,10,p.wall);box(c,x-61,515,122,5,p.trim);box(c,x-59,515,118,2,p.accent);
        for(let i=0;i<7;i++){box(c,x-51+i*17,523,9,14,p.stone);box(c,x-50+i*17,523,2,14,p.edge);}
      }
      c.restore();
    }
    roseBed(c,x,y,p){
      oval(c,x+3,y+5,31,7,p.void);box(c,x-24,y-9,48,13,'#657684');box(c,x-28,y-13,56,6,'#b5b4ac');
      for(const [dx,dy] of [[-15,-24],[0,-31],[16,-22],[-4,-16]]){
        stroke(c,x+dx,y-12,x+dx,y+dy,'#72978c',2);
        poly(c,[[x+dx,y+dy+7],[x+dx-11,y+dy+3],[x+dx-5,y+dy+13]],'#8baa98');
        pixelDisk(c,x+dx,y+dy,7,'#c6819e');pixelDisk(c,x+dx-2,y+dy-2,5,'#f0b7c9');box(c,x+dx-2,y+dy-3,3,3,'#ffe5d8');
      }
    }
    staticPillar(c,x,y,p,w=28){
      oval(c,x+7,y+5,w*.7,9,'#111d28');box(c,x-w*.65,y-6,w*1.3,11,p.void);box(c,x-w*.55,y-10,w*1.1,10,p.trim);
      box(c,x-w*.42,y-59,w*.84,51,p.stone);box(c,x-w*.3,y-57,w*.19,44,p.edge);box(c,x+w*.16,y-57,w*.2,47,p.wall);
      box(c,x-w*.6,y-65,w*1.2,10,p.trim);box(c,x-w*.6+2,y-65,w*1.2-4,3,p.accent);box(c,x-w*.43,y-37,w*.85,2,p.wall);
    }
    gate(c,x,y,p,region){
      box(c,x-48,y-39,96,44,p.void);box(c,x-41,y-34,82,39,p.wall);box(c,x-31,y-29,62,34,'#111729');
      box(c,x-27,y-25,54,30,region===0?'#244f4b':region===1?'#343563':region===3?'#456b88':'#643b54');box(c,x-20,y-21,40,26,p.glow);
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
      if(/hurt|damage/.test(kind))this.hurtCue++;
      const scene=this.lastScene,run=scene?.run,arena=EXPLORATION_STATES.has(run?.status)?run?.exploration:run?.arena,player=arena?.player;
      const target=arena?.enemies?.find(e=>String(e.id)===String(arena?.targetId)&&e.alive!==false&&e.hp>0);
      const friendly=/hurt|damage|heal|potion|shield|barrier|dash/.test(kind);
      const x=friendly?val(player?.x,260):val(target?.x,660),y=friendly?val(player?.y,320)-20:val(target?.y,285)-18;
      const color=/heal|potion/.test(kind)?'#b7ecc1':/hurt|damage/.test(kind)?'#ffa9a4':/shield|barrier/.test(kind)?'#b2dcff':/loot|gold|victory/.test(kind)?'#ffe0a0':'#dfc3ff';
      for(let i=0;i<22;i++){const a=this.random()*TAU,v=25+this.random()*70;this.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-22,life:.35+this.random()*.4,color,size:i%4?2:4});}
      if(/impact/.test(kind))this.shake=Math.max(this.shake,.38);
      if(/hurt|damage|signature|death|boss|bomb/.test(kind))this.shake=Math.max(this.shake,.72);
      if(this.particles.length>140)this.particles=this.particles.slice(-140);
    }
    draw(input=null,time=0){
      const scene=input&&Object.prototype.hasOwnProperty.call(input,'run')?input:{run:input};
      const run=scene.run||null,exploration=EXPLORATION_STATES.has(run?.status)?run?.exploration:null,arena=exploration?null:run?.arena||null,region=regionOf(run),p=PAL[region];
      const paused=!!scene.paused,still=paused||!!scene.reducedMotion;
      const stamp=val(time),dt=this.lastTime===null?0:clamp((stamp-this.lastTime)/1000,0,.05);this.lastTime=stamp;
      if(!paused)this.clock+=dt;const t=still?0:this.clock;
      this.captureDeaths(run);
      this.lastScene=scene;
      const roomKey=exploration?.key??arena?.room?.id??null;if(roomKey!==this.lastRoom){this.trail=[];this.particles=[];this.lastPlayer=null;this.lastRoom=roomKey;}
      this.beginActors(run,exploration||arena,scene,dt);
      const c=this.ctx;c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.clearRect(0,0,W,H);box(c,0,0,W,H,p.void);
      if(!still&&this.shake>0)c.translate(Math.round(Math.sin(t*73)*this.shake*3),Math.round(Math.cos(t*91)*this.shake*2));
      c.drawImage(this.backdrops[region],0,0);
      const bossId=arena?this.bossIdentity(arena):null;
      if(bossId)this.bossEnvironment(c,bossId,arena,p,t,still);
      if((arena||exploration)&&window.DungeonHighDefinition?.stage)window.DungeonHighDefinition.stage(c,run,arena||exploration,t,still);
      this.ambience(c,p,region,t,still);
      if(exploration)this.drawExploration(c,exploration,run,scene,p,region,t,dt,still);
      else if(arena)this.drawArena(c,arena,run,scene,p,region,t,dt,still);else this.lobby(c,p,region,t);
      this.drawDeaths(c,p,region,run,dt,paused,still);
      this.localEffects(c,p,dt,paused,still);
      // Cosmetic tracking is confined to actors actually rendered in this map.
      for(const [key,actor] of this.actorTracks)if(actor.frame!==this.actorFrame)this.actorTracks.delete(key);
      // A small foreground lip encloses the room without obscuring feet.
      c.globalAlpha=.28;box(c,24,502,912,9,p.void);c.globalAlpha=1;
      c.restore();
      if(!paused){this.shake=Math.max(0,this.shake-dt*3.6);this.flash=Math.max(0,this.flash-dt*2.5);}
    }
    beginActors(run,space,scene,dt){
      const scope=space?(EXPLORATION_STATES.has(run?.status)?'explore:':'arena:')+String(space.key??space.room?.id??'room'):'lobby';
      if(this.actorRun!==run||this.actorSpace!==space||this.actorScope!==scope){
        this.actorTracks.clear();this.trail=[];this.lastPlayer=null;
        this.actorRun=run;this.actorSpace=space;this.actorScope=scope;
      }
      this.actorFrame++;
      this.actorContext={run,space,paused:!!scene.paused,reducedMotion:!!scene.reducedMotion,dt:scene.paused?0:dt,focus:!!scene.focus};
    }
    actorPose(key,actor,options={}){
      const context=this.actorContext||{dt:0,paused:false,reducedMotion:false},x=val(actor.x),y=val(actor.y);
      let state=this.actorTracks.get(key);
      if(!state){
        // Only renderer-owned values live here; save data and collision actors are never modified.
        if(this.actorTracks.size>=40)this.actorTracks.delete(this.actorTracks.keys().next().value);
        let fx=val(actor.facingX,1),fy=val(actor.facingY),length=Math.hypot(fx,fy);
        if(length<.01){fx=1;fy=0;length=1;}
        state={x,y,hp:val(options.hp,1),phase:0,speed:0,moving:0,facingX:fx/length,facingY:fy/length,
          castAge:1,hurtAge:1,hurtValue:0,hurtCue:this.hurtCue,castIds:new Set(),look:null,pose:null,frame:-1};
        this.actorTracks.set(key,state);
      }
      if(state.frame===this.actorFrame&&state.pose)return state.pose;
      state.frame=this.actorFrame;
      if(context.paused&&state.pose){state.x=x;state.y=y;return state.pose;}
      const dt=context.dt,dx=x-state.x,dy=y-state.y,distance=Math.hypot(dx,dy);
      const travel=dt>0&&distance<90?distance:0,actualSpeed=dt>0?Math.min(700,travel/dt):0;
      state.x=x;state.y=y;
      const ease=1-Math.exp(-dt*14);
      state.speed+=(actualSpeed-state.speed)*ease;
      state.moving+=(clamp(actualSpeed/155,0,1)-state.moving)*ease;
      state.phase=(state.phase+travel/54*TAU)%TAU;
      state.castAge=Math.min(1,state.castAge+dt);state.hurtAge=Math.min(1,state.hurtAge+dt);
      let freshCast=null;
      for(const effect of options.effects||[]){
        if(val(effect.life,1)<=0)continue;
        const id=effect.id??effect;
        if(state.castIds.has(id))continue;
        state.castIds.add(id);freshCast=effect;
        if(state.castIds.size>32)state.castIds.delete(state.castIds.values().next().value);
      }
      if(freshCast){
        state.castAge=0;
        const targetX=Number(freshCast.targetX??freshCast.x2),targetY=Number(freshCast.targetY??freshCast.y2);
        state.look=Number.isFinite(targetX)&&Number.isFinite(targetY)?{x:targetX,y:targetY}:null;
      }
      const hp=val(options.hp,state.hp),hurtValue=Math.max(val(actor.hurt),val(actor.hitFlash),val(actor.staggerTime));
      if(hp<state.hp||hurtValue>state.hurtValue+.01||(key==='player'&&state.hurtCue!==this.hurtCue))state.hurtAge=0;
      state.hp=hp;state.hurtValue=hurtValue;state.hurtCue=this.hurtCue;
      const dash=val(actor.dashTime)>0||val(actor.chargeTime)>0,casting=state.castAge<.52,staggered=val(actor.staggerTime)>0,hurting=staggered||state.hurtAge<.28;
      let fx=state.facingX,fy=state.facingY;
      const look=casting&&state.look?state.look:options.lookAt;
      const action=options.action||actor.action;
      if(action&&Number.isFinite(action.angle)){fx=Math.cos(action.angle);fy=Math.sin(action.angle);}
      else if(look&&(casting||travel<.1||options.chant)){fx=val(look.x)-x;fy=val(look.y)-y;}
      else if(travel>.08){fx=dx;fy=dy;}
      else if(Number.isFinite(actor.facingX)&&Number.isFinite(actor.facingY)){fx=actor.facingX;fy=actor.facingY;}
      if(Math.hypot(fx,fy)>.01){
        const from=Math.atan2(state.facingY,state.facingX),to=Math.atan2(fy,fx);
        const committed=action&&Number.isFinite(action.angle)&&(action.locked||action.stage==='active'||action.stage==='recovery');
        const difference=Math.atan2(Math.sin(to-from),Math.cos(to-from)),angle=committed?to:from+difference*(1-Math.exp(-dt*20));
        state.facingX=Math.cos(angle);state.facingY=Math.sin(angle);
      }
      let mode=options.fallen?'fallen':hurting?'hurt':dash?'dash':casting?'cast':options.chant?'chant':state.moving>.08?'walk':'idle';
      const reduced=context.reducedMotion;
      const authoritative=action&&['windup','active','recovery','stagger'].includes(action.stage)?{
        kind:action.kind,motion:action.motion,stage:action.stage,progress:clamp(val(action.progress,val(action.elapsed)/Math.max(.001,val(action.duration,1))),0,1),
        angle:action.angle,locked:!!action.locked,combo:action.combo,comboTotal:val(action.comboTotal,action.attacks?.length||1),ritual:!!action.ritual,name:action.name}:null;
      if(authoritative&&!options.fallen)mode=authoritative.stage==='stagger'?'hurt':'cast';
      state.pose={time:reduced?0:this.clock,phase:reduced?0:state.phase,moving:reduced?0:state.moving,speed:reduced?0:state.speed,
        facingX:state.facingX,facingY:state.facingY,mode,castProgress:casting?(reduced?.46:clamp(state.castAge/.52,0,1)):0,
        hurtProgress:hurting?(reduced?.4:clamp(state.hurtAge/.28,0,staggered?.85:1)):0,
        hitRecoil:hurting?(reduced?.4:Math.max(staggered?.15:0,1-clamp(state.hurtAge/.28,0,1))):0,still:reduced,action:authoritative};
      if(authoritative){
        // Lumina uses the player's existing rig; its charge/release/recovery
        // progress is driven by the same authoritative stages as every enemy.
        const q=reduced?.5:authoritative.progress;
        const commit=clamp(q/.58,0,1),settle=clamp((q-.14)/.86,0,1);
        const commitEase=commit*commit*(3-2*commit),settleEase=settle*settle*(3-2*settle);
        if(authoritative.stage==='windup')state.pose.castProgress=.2*(1-commitEase);
        else if(authoritative.stage==='active')state.pose.castProgress=.62*commitEase;
        else if(authoritative.stage==='recovery')state.pose.castProgress=.62+settleEase*.38;
        else state.pose.hurtProgress=q;
        if(reduced)state.pose.action={...authoritative,progress:.5};
      }
      return state.pose;
    }
    playerPose(actor,run){
      const space=this.actorContext?.space,combat=run?.status==='combat';
      return this.actorPose('player',actor,{hp:run?.player?.hp,fallen:run?.status==='lost',
        chant:combat&&(this.actorContext?.focus||space?.focusActive),effects:combat?(space?.effects||[]).filter(e=>e.kind==='cast'):[]});
    }
    dashTrail(c,player,run,scene,p,t,dt){
      const reduced=!!scene.reducedMotion,pose=this.playerPose(player,run);
      if(!scene.paused){
        if(player.dashTime>0&&!reduced){
          if(!this.lastPlayer||Math.hypot(player.x-this.lastPlayer.x,player.y-this.lastPlayer.y)>3){
            this.trail.push({x:player.x,y:player.y,life:.22,facingX:pose.facingX,facingY:pose.facingY,pose:{...pose}});
            if(this.trail.length>12)this.trail.shift();
          }
          this.lastPlayer={x:player.x,y:player.y};
        }else this.lastPlayer=null;
      }
      for(let i=this.trail.length-1;i>=0;i--){
        const trail=this.trail[i];if(!scene.paused)trail.life-=dt;
        if(trail.life<=0){this.trail.splice(i,1);continue;}
        if(!reduced){c.save();c.globalAlpha=trail.life*.8;this.mage(c,trail,p,t,true,run,false,trail.pose);c.restore();}
      }
    }
    ambience(c,p,region,t,still){
      [282,679].forEach((x,i)=>{
        const yy=41,f=still?0:Math.floor((t+i)*8)%3;aura(c,x,yy,29,region===1?'#b6a0f0':'#ffc697',.06);
        box(c,x-3,yy-12,7,13,'#db9a79');box(c,x-1,yy-17-f,4,15,'#ffd6a0');box(c,x,yy-10,2,8,'#ffedc0');
      });
      aura(c,480,61,51,p.glow,.035);
      for(let i=0;i<16;i++){const x=54+(i*139.83)%850+Math.sin(t*.25+i)*8,y=63+(i*73.17+t*(i%3+1)*2)%423;c.save();c.globalAlpha=.14+Math.sin(t+i)**2*.3;box(c,x,y,2,2,i%4===0?p.accent:p.light);c.restore();}
      if(region===2){for(let i=0;i<4;i++){c.save();c.globalAlpha=.1+.06*Math.sin(t+i);box(c,i%2?918:27,160+i*75,7,46,p.hot);c.restore();}}
      if(region===3){
        c.save();c.globalAlpha=.4;
        for(let i=0;i<8;i++){
          const x=i%2?882+Math.sin(t*.35+i)*13:64+Math.sin(t*.35+i)*13,y=95+(i*67+(still?0:t*5))%386;
          poly(c,[[x,y-3],[x+5,y],[x+1,y+3],[x-4,y+1]],i%2?'#e6b3c8':'#b4d9df');
        }c.restore();
      }
    }
    bossIdentity(a,boss=null){
      const actor=boss||(a?.enemies||[]).find(e=>e.kind==='boss'||e.boss);
      const id=String(a?.room?.bossId||actor?.npcId||actor?.sprite||actor?.enemyId||'').replace(/^npc-/,'');
      return BOSS_SCENES[id]?id:null;
    }
    bossEnvironment(c,id,a,p,t,still){
      let backdrop=this.bossBackdrops.get(id);
      if(!backdrop){
        backdrop=this.bossArchitecture(id,p);
        // Keep mobile memory bounded when a run visits many distinct challengers.
        if(this.bossBackdrops.size>=4)this.bossBackdrops.delete(this.bossBackdrops.keys().next().value);
        this.bossBackdrops.set(id,backdrop);
      }
      c.drawImage(backdrop,0,0);
      const profile=BOSS_SCENES[id],motif=profile.motif;
      c.save();c.globalAlpha=.26;
      for(let i=0;i<8;i++){
        const x=i%2?910:50,y=95+(i*53+(still?0:t*(motif==='river'?16:5)))%390;
        if(['bramble','mycelium','conservatory','moonflower'].includes(motif)){
          poly(c,[[x,y-3],[x+5,y],[x,y+4],[x-4,y]],profile.color);
        }else if(motif==='forge'){stroke(c,x,y,x+3,y-7,profile.color,2);}
        else if(motif==='river'){stroke(c,x-10,y,x+10,y,profile.color,1);}
        else gem(c,x,y,2+(i%2),profile.color);
      }
      c.restore();
    }
    bossArchitecture(id,p){
      const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
      const c=canvas.getContext('2d'),profile=BOSS_SCENES[id],tone=profile.color,dark=profile.dark,motif=profile.motif;
      c.imageSmoothingEnabled=false;
      c.save();c.globalAlpha=.43;box(c,25,53,910,451,dark);c.restore();
      // Floor engraving never shares the saturated red shapes used by attacks.
      c.save();c.globalAlpha=.14;
      if(['throne','vault','forge','origami'].includes(motif)){
        for(let y=92;y<484;y+=48){stroke(c,108,y,852,y,tone,1);for(let x=108;x<850;x+=96)box(c,x,y,1,47,tone);}
        box(c,444,74,72,415,tone);
      }else if(['crystal','moonmirror','resonance'].includes(motif)){
        for(let i=0;i<8;i++){const angle=i*TAU/8;stroke(c,480,282,480+Math.cos(angle)*310,282+Math.sin(angle)*185,tone,1);}
        c.strokeStyle=tone;c.lineWidth=1;c.beginPath();c.ellipse(480,282,250,151,0,0,TAU);c.stroke();
      }else if(['constellation','comet','vow','atlas','moonflower'].includes(motif)){
        const stars=[[176,205],[289,377],[420,302],[557,165],[689,352],[797,227]];
        stars.forEach(([x,y],i)=>{gem(c,x,y,4,tone);if(i)stroke(c,...stars[i-1],x,y,tone,1);});
        c.strokeStyle=tone;c.beginPath();c.ellipse(480,281,303,178,0,0,TAU);c.stroke();
      }else if(motif==='river'){
        for(let y=112;y<480;y+=55){c.strokeStyle=tone;c.beginPath();c.moveTo(125,y);c.bezierCurveTo(300,y-17,640,y+17,835,y);c.stroke();}
      }else{
        for(let i=0;i<6;i++){const angle=i*TAU/6;c.strokeStyle=tone;c.beginPath();c.ellipse(480+Math.cos(angle)*111,282+Math.sin(angle)*60,76,40,angle,0,TAU);c.stroke();}
      }
      c.restore();
      for(const side of [-1,1]){
        const x=480+side*401;
        for(const y of [151,398]){
          if(motif==='bramble'){
            for(let i=0;i<4;i++){const xx=x+(i-1.5)*10;stroke(c,xx,y+34,xx-side*(14+i*3),y-26-i*9,'#354e3d',9-i);stroke(c,xx-side*(14+i*3),y-26-i*9,xx+side*18,y-65-i*3,'#627c56',3);}
            for(let i=0;i<7;i++){const xx=x-22+(i*19)%49,yy=y-45+(i*13)%63;poly(c,[[xx,yy],[xx+12,yy-7],[xx+6,yy+4]],'#91a973');}
          }else if(motif==='mycelium'){
            box(c,x-7,y-37,14,67,'#8c8e78');box(c,x-3,y-34,4,62,'#cfceb1');
            poly(c,[[x-38,y-31],[x-29,y-51],[x,y-68],[x+30,y-49],[x+39,y-31]],'#758d76');
            oval(c,x,y-31,38,8,'#bbc59d');for(let i=-2;i<=2;i++)stroke(c,x+i*9,y-36,x+i*3,y-22,'#536d64',2);
            this.mushrooms(c,x-15,y+27,{...p,glow:tone});
          }else if(motif==='moonmirror'){
            this.shelf(c,x-27,y-46,54,74,p,random(y+117));
            gem(c,x,y-65,12,'#bba6ce');box(c,x-30,y+28,60,5,'#ac8faa');
          }else if(motif==='crystal'){
            poly(c,[[x-28,y+32],[x-33,y-32],[x,y-75],[x+31,y-30],[x+27,y+32]],'#677c98');
            poly(c,[[x-20,y+24],[x-24,y-29],[x,y-61],[x+22,y-27],[x+19,y+24]],'#33546b');
            poly(c,[[x,y-60],[x+20,y-26],[x-16,y+19],[x-10,y-25]],'#91bbcf');stroke(c,x-18,y-22,x+15,y+18,'#d0e8e9',2);
          }else if(motif==='throne'){
            stroke(c,x,y+31,x,y-70,'#a09486',4);poly(c,[[x-23,y-61],[x+24,y-61],[x+21,y+8],[x,y-4],[x-21,y+8]],'#754954');
            box(c,x-23,y-61,47,5,'#c1a279');gem(c,x,y-31,12,'#d4b58c');stroke(c,x-13,y-12,x+13,y-42,'#d4b58c',3);
            box(c,x-26,y+31,52,7,'#6b6570');
          }else if(motif==='belltower'){
            for(const dx of [-25,25]){box(c,x+dx-4,y-70,8,105,'#5e6372');for(let j=0;j<4;j++)box(c,x+dx-8,y-55+j*22,16,4,'#96949e');}
            box(c,x-34,y-73,68,7,'#9e98a7');stroke(c,x,y-66,x,y-41,'#9998ac',3);
            poly(c,[[x-12,y-41],[x+12,y-41],[x+16,y-7],[x+23,y+1],[x-23,y+1],[x-16,y-7]],'#7f7b92');
            box(c,x-24,y,48,5,'#c2b7cb');gem(c,x,y+9,5,'#d7cbb8');
          }else if(motif==='constellation'){
            const yy=y-15;c.strokeStyle='#899db0';c.lineWidth=3;c.beginPath();c.ellipse(x,yy,32,39,-.4,0,TAU);c.stroke();c.beginPath();c.ellipse(x,yy,38,16,.5,0,TAU);c.stroke();
            gem(c,x,yy,13,tone);stroke(c,x,yy+38,x,y+34,'#adb8bd',6);box(c,x-29,y+34,58,7,'#536d7b');
          }else if(motif==='comet'){
            for(let i=-1;i<=1;i++){const xx=x+i*17;poly(c,[[xx-12,y+30],[xx-10,y-17-i*14],[xx+3,y-67-i*9],[xx+13,y-13],[xx+10,y+30]],i%2?'#7897b7':'#91b1cb');stroke(c,xx+3,y-58-i*9,xx+1,y+21,'#d2e8ed',2);}
          }else if(motif==='vow'||motif==='moonflower'){
            for(const dx of [-26,26]){stroke(c,x+dx,y+31,x+dx,y-49,'#a3a7ac',5);}
            c.strokeStyle='#c9bdb4';c.lineWidth=5;c.beginPath();c.arc(x,y-43,26,Math.PI,TAU);c.stroke();
            this.roseBed(c,x,y+25,p);if(motif==='vow'){stroke(c,x-23,y-31,x-4,y-16,tone,2);stroke(c,x+8,y-11,x+23,y-29,tone,2);gem(c,x,y-61,7,tone);}else{pixelDisk(c,x,y-37,14,tone);pixelDisk(c,x+6,y-42,13,dark);}
          }else if(motif==='vault'){
            box(c,x-32,y-58,64,83,'#81724e');box(c,x-27,y-53,54,73,'#353d40');c.strokeStyle='#c3ae77';c.lineWidth=4;c.beginPath();c.arc(x,y-17,22,0,TAU);c.stroke();
            stroke(c,x-15,y-17,x+15,y-17,'#e1ca90',3);stroke(c,x,y-32,x,y-2,'#e1ca90',3);for(let i=0;i<5;i++)oval(c,x-22+i*11,y+32-(i%2)*6,8,3,'#d7b677');
          }else if(motif==='conservatory'){
            box(c,x-31,y-59,62,89,'#718d7d');box(c,x-26,y-53,52,77,'#264c4b');
            for(const dx of [-14,14]){box(c,x+dx-7,y-23,14,31,'#629994');box(c,x+dx-3,y-34,6,14,'#b2cfae');oval(c,x+dx,y-4,6,10,'#b3d7a7');}
            stroke(c,x-28,y-48,x+24,y+13,'#96bbad',2);this.roseBed(c,x,y+31,{...p,accent:tone});
          }else if(motif==='forge'){
            box(c,x-33,y-62,66,97,'#68505a');box(c,x-23,y-40,46,59,'#261e2c');
            poly(c,[[x-18,y+14],[x-12,y-18],[x-3,y-5],[x+4,y-32],[x+19,y+14]],'#b66b57');poly(c,[[x-9,y+14],[x,y-8],[x+9,y+14]],'#efba80');
            for(let dx=-24;dx<=24;dx+=12)box(c,x+dx-2,y-33,4,57,'#8a7872');box(c,x-36,y+28,72,8,'#99867d');
          }else if(motif==='atlas'){
            box(c,x-31,y-59,62,91,'#806b58');box(c,x-27,y-55,54,82,'#c9b892');
            for(let i=0;i<4;i++){stroke(c,x-23,y-43+i*17,x+23,y-43+i*17,'#988b70',1);stroke(c,x-19+i*12,y-49,x-19+i*12,y+20,'#988b70',1);}
            stroke(c,x-21,y+7,x-3,y-27,'#687c7b',3);stroke(c,x-3,y-27,x+20,y-14,'#687c7b',3);gem(c,x+10,y-10,6,'#8a626d');
          }else if(motif==='river'){
            oval(c,x,y-5,37,60,'#274e58');for(let j=0;j<5;j++)stroke(c,x-26,y-42+j*20,x+26,y-42+j*20,'#688d94',2);
            for(const dx of [-29,29]){box(c,x+dx-4,y-61,8,100,'#766b65');box(c,x+dx-8,y-65,16,7,'#a19a85');}stroke(c,x-29,y-40,x+29,y-40,'#b0b19b',3);
          }else if(motif==='eclipse'){
            stroke(c,x,y+34,x,y-74,'#7d8d8b',5);stroke(c,x-28,y-60,x+28,y-60,'#b7c5a3',4);
            for(const dx of [-22,22]){stroke(c,x+dx,y-58,x+dx,y-42,'#8cafaa',2);box(c,x+dx-9,y-42,18,29,'#8cae9e');box(c,x+dx-5,y-36,10,17,'#b5e6c9');poly(c,[[x+dx-12,y-43],[x+dx,y-51],[x+dx+12,y-43]],'#b9c9ac');}
          }else if(motif==='resonance'){
            poly(c,[[x-34,y-64],[x+34,y-64],[x+28,y+31],[x+11,y+19],[x-12,y+31],[x-29,y+22]],'#6f536f');
            for(let dx=-22;dx<=22;dx+=11)stroke(c,x+dx,y-59,x+dx,y+18,'#93718f',3);
            oval(c,x,y-21,18,23,'#c4b5c3');oval(c,x-7,y-23,4,3,'#4a415e');oval(c,x+7,y-23,4,3,'#4a415e');stroke(c,x-7,y-7,x+7,y-7,'#685873',2);
          }else if(motif==='origami'){
            box(c,x-31,y+24,62,12,'#77808a');box(c,x-26,y+20,52,5,'#c1bca6');
            for(let i=-1;i<=1;i++){const xx=x+i*18;poly(c,[[xx-4,y+21],[xx-7,y-39+i*7],[xx,y-64+i*7],[xx+7,y-39+i*7],[xx+4,y+21]],'#b4b9b9');stroke(c,xx,y-58+i*7,xx,y+12,'#e6dec0',2);box(c,xx-10,y-4,20,4,'#9b9279');}
          }
        }
      }
      // A dedicated lintel replaces the generic biome gate with the room's seal.
      box(c,384,9,192,47,dark);box(c,378,10,204,4,tone);box(c,390,52,180,4,tone);
      if(motif==='belltower'){poly(c,[[464,17],[496,17],[502,44],[458,44]],'#8b839c');box(c,454,43,52,5,tone);}
      else if(motif==='throne'){poly(c,[[453,39],[449,15],[466,26],[480,10],[494,26],[511,15],[507,39]],tone);box(c,452,41,56,5,'#97754f');}
      else if(motif==='vault'){c.strokeStyle=tone;c.lineWidth=2;c.beginPath();c.arc(480,31,17,0,TAU);c.stroke();stroke(c,480,19,480,43,tone,2);stroke(c,469,26,491,36,tone,2);}
      else if(motif==='atlas'){stroke(c,456,31,504,31,tone,1);stroke(c,480,14,480,48,tone,1);gem(c,480,31,15,tone);}
      else if(motif==='river'){poly(c,[[449,28],[511,28],[500,42],[460,42]],tone);stroke(c,480,12,480,28,tone,2);}
      else if(motif==='forge'){poly(c,[[453,22],[510,22],[502,32],[484,32],[487,43],[465,43],[469,32],[458,32]],tone);}
      else if(['vow','moonflower','conservatory'].includes(motif)){for(let i=0;i<5;i++){const angle=i*TAU/5-Math.PI/2;gem(c,480+Math.cos(angle)*10,31+Math.sin(angle)*10,7,tone);}gem(c,480,31,5,'#f5e1b4');}
      else{gem(c,480,31,18,tone);gem(c,480,31,9,dark);for(const dx of [-39,39])gem(c,480+dx,31,5,tone);}
      return canvas;
    }
    bossEntrance(c,boss,a,still,foreground=false){
      const remaining=val(a.introRemaining);if(remaining<=0)return;
      const id=this.bossIdentity(a,boss),profile=BOSS_SCENES[id];if(!profile)return;
      const duration=Math.max(.1,val(a.introDuration,2.2)),progress=clamp(1-remaining/duration,0,1),q=still?.65:progress;
      const x=val(boss.x),y=val(boss.y),color=profile.color,fade=Math.min(1,remaining*3,(duration-remaining+.12)*4);
      c.save();
      if(foreground){
        c.globalAlpha=fade*.94;box(c,276,64,408,55,'#151d2c');box(c,276,64,408,2,color);box(c,316,118,328,1,color);
        c.textAlign='center';c.font='11px sans-serif';c.fillStyle=color;c.fillText((NPC_IDS.has(id)?'禁忌挑戰 · ':'封印領域 · ')+profile.title,480,83);
        c.font='bold 17px sans-serif';c.fillStyle='#f7e7d0';const name=String(boss.name||a.room?.name||'封印之主');c.fillText(name.length>23?name.slice(0,22)+'…':name,480,106);
        c.restore();return;
      }
      c.globalAlpha=fade*.48;
      // The entry seal is decorative and only exists while enemy AI is gated.
      c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.ellipse(x,y+3,28+q*62,12+q*22,0,0,TAU);c.stroke();
      const motif=profile.motif;
      for(let i=0;i<8;i++){
        const angle=i*TAU/8,r=still?59:92-q*40,xx=x+Math.cos(angle)*r,yy=y-40+Math.sin(angle)*r*.65;
        c.globalAlpha=fade*(.35+.35*q);
        if(motif==='bramble'){
          stroke(c,x+Math.cos(angle)*66,y+13,xx,yy,color,3);poly(c,[[xx,yy],[xx+9,yy-16],[xx+3,yy+3]],color);
        }else if(motif==='mycelium'){
          oval(c,xx,yy,7+(i%3)*3,5+(i%2)*3,color);box(c,xx-1,yy,2,8,color);
        }else if(['moonmirror','atlas','origami'].includes(motif)){
          c.save();c.translate(xx,yy);c.rotate(still?0:angle+q*2);poly(c,[[-7,-10],[7,-8],[7,10],[-7,8]],color);stroke(c,-4,-3,4,-3,profile.dark,1);stroke(c,-4,2,2,2,profile.dark,1);c.restore();
        }else if(motif==='crystal'||motif==='comet'){
          gem(c,xx,yy,11+(i%2)*4,color);stroke(c,xx,yy-10,xx,yy+6,'#edf5f2',1);
        }else if(motif==='throne'){
          stroke(c,xx,yy-16,xx,yy+12,color,3);poly(c,[[xx-3,yy-16],[xx+5,yy-16],[xx+13,yy-2],[xx+4,yy+2]],color);
        }else if(motif==='belltower'){
          poly(c,[[xx-4,yy-10],[xx+4,yy-10],[xx+7,yy+3],[xx-7,yy+3]],color);gem(c,xx,yy+7,3,color);
        }else if(motif==='vault'){
          oval(c,xx,yy,7,7,color);stroke(c,xx,yy-4,xx,yy+4,profile.dark,1);
        }else if(motif==='forge'){
          poly(c,[[xx-4,yy+8],[xx-3,yy-4],[xx+1,yy-15],[xx+5,yy+6]],color);
        }else if(motif==='river'||motif==='resonance'){
          c.strokeStyle=color;c.beginPath();c.ellipse(xx,yy,10,4,0,0,TAU);c.stroke();
        }else if(motif==='eclipse'){
          box(c,xx-5,yy-9,10,15,color);stroke(c,xx,yy-15,xx,yy-9,color,1);
        }else if(['conservatory','moonflower','vow'].includes(motif)){
          poly(c,[[xx,yy-9],[xx+6,yy-2],[xx+3,yy+7],[xx-4,yy+3],[xx-7,yy-3]],color);
        }else{gem(c,xx,yy,5,color);stroke(c,xx,yy,x,y-52,color,1);}
      }
      c.restore();
    }
    bossBattlefield(c,a,t,still){
      const state=a.bossIdentity;
      if(!state)return;
      const time=still?0:t/1000;
      c.save();
      // The entire scene is painted in world coordinates, so portals and vines
      // agree exactly with collision positions after saving/reloading.
      for(const vine of state.vines||[]){
        const grow=clamp(1-val(vine.grow,0)/1.5,0,1);
        const radius=val(vine.r,30)*(.23+.77*grow),x=val(vine.x),y=val(vine.y);
        c.globalAlpha=.23+.38*grow;
        aura(c,x,y,radius*1.15,'#5aac75',.28);
        c.strokeStyle='#407d55';c.lineWidth=3;c.beginPath();c.arc(x,y,radius,0,TAU);c.stroke();
        for(let i=0;i<6;i++){
          const angle=i*TAU/6+time*.08,dx=Math.cos(angle),dy=Math.sin(angle);
          stroke(c,x+dx*3,y+dy*3,x+dx*radius,y+dy*radius,'#86d88a',3);
          const xx=x+dx*radius*.65,yy=y+dy*radius*.65;
          poly(c,[[xx,yy],[xx-dy*10+dx*6,yy+dx*10+dy*6],[xx+dy*9+dx*5,yy-dx*9+dy*5]],'#a2e296');
        }
        gem(c,x,y,4,'#d6f9b4');
      }
      if(state.id==='prism'){
        for(let i=0;i<(state.mirrors||[]).length;i++){
          const mirror=state.mirrors[i],x=val(mirror.x),y=val(mirror.y);
          const target=state.warp&&Math.abs(state.warp.target.x-x)<4&&Math.abs(state.warp.target.y-y)<4;
          const glow=target?'#f7f9ca':'#a7def0';
          c.globalAlpha=.82;
          aura(c,x,y,42,glow,target?.24:.13);
          poly(c,[[x,y-39],[x+25,y-26],[x+26,y+24],[x,y+37],[x-26,y+24],[x-25,y-26]],'#627b9e');
          poly(c,[[x,y-32],[x+19,y-20],[x+19,y+20],[x,y+28],[x-19,y+20],[x-19,y-20]],'#1e435c');
          stroke(c,x-14,y-14,x+13,y+15,'#91cbe1',2);
          stroke(c,x+2,y-27,x-16,y+19,'#e7f5fb',2);
          gem(c,x,y,7,glow);
          if(target){
            c.globalAlpha=.65+.27*Math.sin(time*15);
            c.strokeStyle='#fff1ac';c.lineWidth=3;c.beginPath();
            c.arc(x,y,43,0,TAU);c.stroke();
            for(let j=0;j<4;j++){const angle=j*TAU/4;
              gem(c,x+Math.cos(angle)*44,y+Math.sin(angle)*44,7,'#f7e9a4');
            }
          }
        }
        if(state.warp){
          c.globalAlpha=.36;
          stroke(c,state.warp.from.x,state.warp.from.y,state.warp.target.x,state.warp.target.y,'#def3ff',3);
          gem(c,state.warp.from.x,state.warp.from.y,15,'#b9e9ef');
        }
      }
      if(state.id==='constellation'||state.id==='echo'){
        const route=state.trace||[];
        c.globalAlpha=.13;for(let i=1;i<route.length;i++)stroke(c,route[i-1].x,route[i-1].y,route[i].x,route[i].y,
          state.id==='echo'?'#e0b4ff':'#ffbfdb',2);
      }
      for(const shadow of state.decoys||[]){
        const x=val(shadow.x),y=val(shadow.y),fade=clamp(shadow.life/3,0,.65);
        c.globalAlpha=fade;
        aura(c,x,y,26,shadow.kind==='prism'?'#b1efff':'#d4a9f5',.18);
        oval(c,x,y+16,19,7,'#615176');
        poly(c,[[x-21,y+10],[x-14,y-12],[x,y-28],[x+15,y-12],[x+20,y+10]],'#d2afe5');
        oval(c,x,y-21,8,10,'#ebe6ff');
        for(let k=-1;k<=1;k++)gem(c,x+k*13,y+17,5,'#dcb6ee');
      }
      for(const coin of state.coins||[]){
        if(coin.used)continue;
        const x=val(coin.x),y=val(coin.y),pulse=Math.sin(time*5)*3;
        c.globalAlpha=.87;
        aura(c,x,y,31,'#ffe38e',.3);
        oval(c,x,y+5,15+pulse*.3,9+pulse*.2,'#a57b32');
        oval(c,x,y+2,11,7,'#f5d87e');
        gem(c,x,y+2,6,'#fff4c2');
        c.strokeStyle='#fff1b3';c.lineWidth=1;c.beginPath();c.arc(x,y,23,0,TAU);c.stroke();
      }
      for(const flower of state.flowers||[]){
        if(flower.used)continue;
        const x=val(flower.x),y=val(flower.y),kind=String(flower.id);
        const lantern=kind.startsWith('lantern'),tone=lantern?'#b7ffee':'#d4f4c1';
        c.globalAlpha=.72+.18*Math.sin(time*3);
        aura(c,x,y,35,tone,.22);
        for(let k=0;k<6;k++){
          const angle=k*TAU/6+time*.12;
          const px=x+Math.cos(angle)*13,py=y+Math.sin(angle)*10;
          if(lantern)gem(c,px,py,7,tone);else oval(c,px,py,10,7,'#b3dca6');
        }
        oval(c,x,y,9,9,lantern?'#b3e7e7':'#f8d99c');gem(c,x,y,5,'#fffce2');
        c.strokeStyle=tone;c.lineWidth=1;c.beginPath();c.arc(x,y,30,0,TAU);c.stroke();
      }
      c.restore();
    }
    drawArena(c,a,run,scene,p,region,t,dt,still){
      const player=a.player||{x:260,y:320,r:12},enemies=Array.isArray(a.enemies)?a.enemies:[];
      const living=enemies.filter(e=>e.alive!==false&&val(e.hp,1)>0);
      const active=living.filter(e=>e.active!==false);
      const obstacles=Array.isArray(a.obstacles)?a.obstacles:[];
      this.sceneDepth(c,a,p,t,still);
      this.roomAtmosphere(c,a,p,t,still);
      this.bossBattlefield(c,a,t,still);
      if(window.DungeonHighDefinition?.domain)window.DungeonHighDefinition.domain(c,a,t,still);
      const boss=active.find(e=>e.kind==='boss'||e.boss);
      if(boss)this.bossPresence(c,boss,a,p,t,still);
      if(boss)this.bossEntrance(c,boss,a,still);
      if(a.room?.spring)this.spring(c,a.room.spring,player,t,still);
      for(const blossom of a.room?.blossoms||[])this.bloomBlossom(c,blossom,still?0:t);
      // Hazards live below all actors, with separate warning and active states.
      (a.hazards||[]).forEach(h=>this.hazard(c,h,p,t,still));
      (a.effects||[]).filter(e=>/dash|spawn/.test(e.kind)).forEach(e=>this.effect(c,e,p,t,still));
      this.dashTrail(c,player,run,scene,p,t,dt);
      const target=active.find(e=>String(e.id)===String(a.targetId));
      if(target)this.targetRing(c,target,p,t);
      const layers=obstacles.map(o=>({kind:'obstacle',object:o,y:val(o.y)+val(o.h,38)}));
      living.forEach(e=>layers.push({kind:'enemy',object:e,y:val(e.y)}));
      (a.companions||[]).forEach(e=>layers.push({kind:'companion',object:e,y:val(e.y)}));
      if(val(run?.player?.hp,1)>0)layers.push({kind:'player',object:player,y:val(player.y)});
      layers.sort((a,b)=>a.y-b.y);
      layers.forEach(layer=>{
        if(layer.kind!=='obstacle'&&window.DungeonHighDefinition?.underActor)window.DungeonHighDefinition.underActor(c,layer.object,layer.kind==='player'?'player':layer.object.kind==='boss'?'boss':layer.kind==='companion'?'ally':'enemy',layer.object.phase);
        if(layer.kind==='obstacle')this.obstacle(c,layer.object,p,region);
        else if(layer.kind==='player')this.mage(c,layer.object,p,t,still,run);
        else if(layer.kind==='companion')this.companion(c,layer.object,p,t,still);
        else this.foe(c,layer.object,p,t,still,region);
        if(layer.kind!=='obstacle'&&window.DungeonHighDefinition?.actorRim)window.DungeonHighDefinition.actorRim(c,layer.object,layer.kind==='player'?'player':layer.object.kind==='boss'?'boss':'enemy',t,still);
      });
      (a.projectiles||[]).forEach(b=>this.projectile(c,b,p,t,still));
      (a.effects||[]).filter(e=>!/dash|spawn|death/.test(e.kind)&&!(e.kind==='boss-intro'&&Number.isFinite(a.introRemaining))).forEach(e=>this.effect(c,e,p,t,still));
      active.forEach(e=>{this.healthBar(c,e,p);this.combatIntent(c,e,a,p,still);});
      if(val(run?.player?.hp,1)>0)this.playerStatus(c,player,run,p,t,still);
      const aim=scene.aim;
      if(aim&&Number.isFinite(aim.x)&&Number.isFinite(aim.y)&&aim.x>24&&aim.x<936&&aim.y>55&&aim.y<504){
        c.save();c.globalAlpha=.55;const x=aim.x,y=aim.y;stroke(c,x-7,y,x-3,y,p.light,1);stroke(c,x+3,y,x+7,y,p.light,1);stroke(c,x,y-7,x,y-3,p.light,1);stroke(c,x,y+3,x,y+7,p.light,1);c.restore();
      }
      if(window.DungeonHighDefinition?.highlight)window.DungeonHighDefinition.highlight(c,run,a,t,still);
      if(boss)this.bossEntrance(c,boss,a,still,true);
    }
    drawExploration(c,a,run,scene,p,region,t,dt,still){
      this.sceneDepth(c,a,p,t,still);
      const player=a.player||{x:480,y:420,r:12},objects=Array.isArray(a.objects)?a.objects:[],obstacles=Array.isArray(a.obstacles)?a.obstacles:[];
      if(run.status==='event'){
        const color=objects.find(o=>o.kind==='event')?.color || '#c7b9e9';
        c.save();c.globalAlpha=.14;oval(c,480,260,330,118,color);c.globalAlpha=.3;
        for(let i=0;i<18;i++){const a=i*TAU/18,x=480+Math.cos(a)*320,y=264+Math.sin(a)*115;gem(c,x,y,3,color);}
        if(!still)for(let i=0;i<12;i++){const x=94+(i*71)%780,y=110+(i*47+t*9)%325;box(c,x,y,2,2,color);}
        c.restore();
      }
      objects.forEach(o=>{
        const x=val(o.x),y=val(o.y),r=Math.max(1,val(o.interactionRadius,85)),near=String(o.id)===String(a.nearbyId)||String(o.id)===String(a.dialogId),color=o.color||p.glow;
        // The circle is the exact interaction radius in world space.
        c.save();c.globalAlpha=near?.09:.025;c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
        c.globalAlpha=near?.48:.12;c.strokeStyle=color;c.lineWidth=near?2:1;c.setLineDash(near?[7,5]:[2,9]);c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();c.setLineDash([]);
        if(near){c.globalAlpha=.65;oval(c,x,y+3,val(o.r,24)+7,9,color);}
        c.restore();
      });
      this.dashTrail(c,player,run,scene,p,t,dt);
      const layers=obstacles.map(o=>({kind:'obstacle',object:o,y:val(o.y)+val(o.h,38)}));
      (a.companions||[]).forEach(o=>layers.push({kind:'companion',object:o,y:val(o.y)}));
      objects.forEach(o=>layers.push({kind:'interactable',object:o,y:val(o.y)}));layers.push({kind:'player',object:player,y:val(player.y)});
      layers.sort((a,b)=>a.y-b.y).forEach(layer=>{
        if(layer.kind!=='obstacle'&&window.DungeonHighDefinition?.underActor)window.DungeonHighDefinition.underActor(c,layer.object,layer.kind==='player'?'player':layer.kind==='companion'?'ally':'enemy');
        if(layer.kind==='obstacle')this.obstacle(c,layer.object,p,region);
        else if(layer.kind==='player')this.mage(c,player,p,t,still,run);
        else if(layer.kind==='companion')this.companion(c,layer.object,p,t,still);
        else this.interactable(c,layer.object,p,t,still,String(layer.object.id)===String(a.nearbyId)||String(layer.object.id)===String(a.dialogId));
        if(layer.kind==='player'&&window.DungeonHighDefinition?.actorRim)window.DungeonHighDefinition.actorRim(c,player,'player',t,still);
      });
      objects.forEach(o=>this.interactionLabel(c,o,p,String(o.id)===String(a.nearbyId)||String(o.id)===String(a.dialogId),String(o.id)===String(a.dialogId)));
      this.playerStatus(c,player,run,p,t,still);
    }
    sceneDepth(c,a,p,t,still){
      // A shallow 2.5D lighting layer: ground fog, ruined runes and torchlight.
      // All marks are below hazards and keep playable telegraphs unobstructed.
      const seed=String(a.room?.id||a.key||'waypoint').split('').reduce((v,ch)=>((v*31+ch.charCodeAt(0))>>>0),31);
      const tint=a.room?.color||p.glow;
      c.save();
      c.globalAlpha=.045;
      for(let i=0;i<26;i++){
        const xx=77+((seed+i*173)%812),yy=86+((seed*3+i*117)%379);
        box(c,xx-17,yy,34+i%3*10,1,p.light);
        box(c,xx-13,yy+3,18,1,p.accent);
      }
      c.globalAlpha=.07;
      for(let i=0;i<5;i++){
        const yy=132+i*75;
        stroke(c,82,yy,878,yy,p.edge,1);
      }
      // Beams lean slightly across the camera instead of filling combat space.
      c.globalAlpha=.052;
      poly(c,[[74,60],[120,60],[375,495],[285,495]],p.light);
      poly(c,[[852,60],[907,60],[694,495],[604,495]],tint);
      // Light blooms are ambient; they never share the hazard warning red.
      for(const xx of [80,880]){
        const pulse=still?1:.84+.16*Math.sin(t*1.8+xx);
        aura(c,xx,210,70,tint,.09*pulse);
        oval(c,xx,210,16,6,tint);
      }
      c.globalAlpha=.09;
      for(let i=0;i<14;i++){
        const x=89+(seed+i*149)%775, baseY=96+(seed*7+i*73)%350;
        const y=baseY-(still?0:(t*5+i*13)%90);
        box(c,x,y,2,2,i%3?p.light:tint);
      }
      c.restore();
    }
    roomAtmosphere(c,a,p,t,still){
      const id=a.room?.id;
      if(!['tempest','meteor','mirrors','eclipse','starlanes','bloom','comet','constellation'].includes(id))return;
      c.save();
      if(id==='tempest'){
        // Wind wisps stay at the room edges; they are not damage telegraphs.
        c.globalAlpha=.35;
        for(let i=0;i<12;i++){
          const x=58+(i*83+(still?0:t*36))%836,y=i%2?72:485;
          stroke(c,x,y,x+22,y-4,'#a8e7e9',2);stroke(c,x+5,y+5,x+16,y+3,'#77b5cf',1);
        }
        [62,898].forEach(x=>{poly(c,[[x-8,170],[x+8,154],[x+7,199],[x-7,211]],'#416776');gem(c,x,184,9,'#a8e7e9');});
      }else if(id==='meteor'){
        [72,888].forEach(x=>{for(let i=0;i<4;i++){const y=120+i*93;stroke(c,x-9,y-11,x+13,y+13,'#805649',3);box(c,x-2,y-2,5,5,'#e8a575');}});
        c.globalAlpha=still?.45:.3+Math.sin(t*.8)**2*.2;
        for(let i=0;i<7;i++){const x=125+i*117;gem(c,x,64,4,'#ffc595');}
      }else if(id==='mirrors'){
        [72,888].forEach(x=>[150,405].forEach(y=>{
          poly(c,[[x,y-40],[x+19,y-22],[x+15,y+21],[x-15,y+21],[x-19,y-22]],'#807bba');
          poly(c,[[x,y-34],[x+13,y-19],[x+10,y+15],[x-10,y+15],[x-13,y-19]],'#39546e');
          stroke(c,x-6,y+6,x+7,y-22,'#b6ddec',2);box(c,x-21,y+22,42,5,p.trim);
        }));
      }else if(id==='eclipse'){
        c.globalAlpha=.28;c.strokeStyle='#b09cdb';c.lineWidth=2;
        c.beginPath();c.ellipse(480,284,338,198,0,0,TAU);c.stroke();
        for(let i=0;i<12;i++){const angle=i*TAU/12;gem(c,480+Math.cos(angle)*338,284+Math.sin(angle)*198,4,'#ccb8f1');}
        c.globalAlpha=.7;pixelDisk(c,480,67,13,'#c5b4eb');pixelDisk(c,486,62,12,p.void);
      }else if(id==='starlanes'){
        // These stars sit outside the active lanes; hazards are rendered later.
        for(const x of [45,915])for(let i=0;i<5;i++){
          const y=105+i*77;stroke(c,x,y-24,x,y+24,'#738baf',2);gem(c,x,y,7,i%2?'#e2b7cf':'#d0e8ed');
          box(c,x-12,y-1,24,2,'#769ab2');
        }
      }else if(id==='bloom'){
        for(const x of [73,887])for(const y of [161,400])this.roseBed(c,x,y,p);
        for(let i=0;i<5;i++){const x=292+i*94;gem(c,x,68,4,'#f0c3cd');stroke(c,x-31,70,x+31,70,'#768f95',1);}
      }else if(id==='comet'){
        [69,891].forEach((x,i)=>{
          poly(c,[[x-11,118],[x,101],[x+11,118],[x+7,151],[x-7,151]],'#a4bbc5');
          gem(c,x,124,10,'#6e8aab');gem(c,x-2,122,5,'#e2eaf4');
          for(let j=0;j<3;j++)stroke(c,x+(i?-1:1)*j*7,418+j*15,x+(i?-1:1)*(j*7+17),430+j*15,'#c7b5d6',2);
        });
      }else{
        // The broken promise is a constellation in the boundary architecture.
        const stars=[[155,70],[300,65],[480,78],[660,65],[805,70]];
        stars.forEach(([x,y],i)=>{gem(c,x,y,i===2?8:4,'#e2b1d1');if(i)stroke(c,stars[i-1][0],stars[i-1][1],x,y,'#766191',1);});
      }
      c.restore();
    }
    bloomBlossom(c,blossom,t){
      const x=val(blossom.x),y=val(blossom.y),r=Math.max(1,val(blossom.r,28)),ready=blossom.ready===true;
      c.save();c.globalAlpha*=ready?.72:.2;c.strokeStyle=ready?'#b8efd1':'#a6b4bd';c.lineWidth=1;
      c.setLineDash(ready?[]:[2,5]);c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();c.setLineDash([]);
      if(ready){
        for(let i=0;i<5;i++){const angle=-Math.PI/2+i*TAU/5;gem(c,x+Math.cos(angle)*7,y-7+Math.sin(angle)*6,5,'#c2f3d8');}
        box(c,x-2,y-9,4,4,'#fff2bb');stroke(c,x,y-2,x,y+8,'#9ad5b8',2);
        c.font='bold 10px sans-serif';c.textAlign='center';c.fillStyle='#ccecd7';c.fillText('+ 回復',x,y+r+13);
      }else{stroke(c,x-5,y,x+5,y,'#b3bbc6',1);stroke(c,x,y-5,x,y+5,'#b3bbc6',1);}
      c.restore();
    }
    bossPresence(c,boss,a,p,t,still){
      const phase=val(boss.phase,1),color=boss.npcId==='lumina'?'#f4c1d5':boss.npcId==='lantern'?'#90eddf':boss.npcId==='echo'?'#c9b9ff':boss.npcId==='sentinel'?'#ffe2a0':p.hot;
      c.save();
      // All pressure cues stay outside the collision bounds or behind the actor.
      c.globalAlpha=phase>1?.66:.4;box(c,24,52,912,4,color);box(c,24,505,912,4,color);
      box(c,25,56,4,449,color);box(c,931,56,4,449,color);
      c.globalAlpha=.9;for(let i=0;i<8;i++){const x=73+i*116;poly(c,[[x-7,53],[x+7,53],[x,60]],color);}
      aura(c,boss.x,boss.y-30,phase>1?80:63,color,phase>1?.12:.075);
      if(!still){
        c.globalAlpha=.38;for(let i=0;i<6;i++){const angle=i*TAU/6+t*.27;gem(c,boss.x+Math.cos(angle)*51,boss.y-44+Math.sin(angle)*28,3,color);}
      }
      const intro=(a.effects||[]).find(e=>(e.kind==='boss-intro'||e.kind==='phase')&&e.life>0);
      if(intro){
        const phaseKey=String(a.key)+':'+String(intro.id);
        if(this.lastPhaseKey!==phaseKey){this.lastPhaseKey=phaseKey;if(!still)this.shake=.58;}
      }
      c.restore();
    }
    companion(c,actor,p,t,still){
      const x=val(actor.x),y=val(actor.y),color=actor.color||'#a9eadb',id=actor.npcId||actor.sprite||'lantern';
      c.save();c.globalAlpha*=.4;oval(c,x,y+2,17,5,p.void);c.restore();
      this.actorMarker(c,actor,'ally');
      const modern=id==='lumina'?typeof window.DungeonCharacter?.draw==='function':!!window.DungeonEnemyCharacter?.supports(id),space=this.actorContext?.space;
      const pose=modern?this.actorPose('companion:'+String(actor.id||id),actor,{effects:(space?.effects||[]).filter(e=>e.kind==='companion-cast'&&e.npcId===id)}):null;
      c.save();c.translate(Math.round(x),Math.round(y));if(!modern)c.scale(.52,.52);this.npc(c,id,p,t,still,false,1,pose);c.restore();
      const name=String(actor.name||({lantern:'路米',echo:'伊可',sentinel:'折鋒',lumina:'露米娜'}[id]||'同行者')).split('・').pop();
      c.save();c.font='bold 11px sans-serif';c.textAlign='center';c.fillStyle=color;c.fillText('◆ '+name,x,y+24);
      const ratio=clamp(val(actor.hp,val(actor.maxHp,1))/Math.max(1,val(actor.maxHp,1)),0,1);
      box(c,x-24,y+29,48,5,'#131b27');box(c,x-23,y+30,46*ratio,3,ratio<.32?'#ff7d92':ratio<.65?'#ffd18e':'#9ee4ca');
      const state=String(actor.behavior||'protect'),statuses={lost:'走失',explore:'探索',wander:'閒晃',panic:'驚慌',retreat:'撤退',return:'歸隊',flank:'側襲'};
      if(statuses[state]){c.font='bold 9px sans-serif';c.fillStyle=state==='lost'||state==='panic'?'#ffb2a0':'#d9d5ff';c.fillText(statuses[state],x,y+46);}
      if(val(actor.alertFlash)>0){c.globalAlpha=Math.min(.7,val(actor.alertFlash));c.strokeStyle='#ff8b98';c.lineWidth=2;c.beginPath();c.ellipse(x,y-13,23,31,0,0,TAU);c.stroke();}
      c.restore();
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
        const modern=npcId==='lumina'?typeof window.DungeonCharacter?.draw==='function':!!window.DungeonEnemyCharacter?.supports(npcId);
        const pose=modern?this.actorPose('npc:'+String(o.id||npcId),o,{lookAt:near?this.actorContext?.space?.player:null}):null;
        c.save();c.translate(x,y);if(!modern)c.scale(.88,.88);this.npc(c,npcId,p,t,still,false,1,pose);c.restore();
      }else if(o.kind==='event'){
        this.eventShrine(c,o,p,t,still,near);
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
    eventShrine(c,o,p,t,still,near){
      const x=val(o.x),y=val(o.y),color=o.color||p.glow,bob=still?0:Math.sin(t*2.1+x)*2;
      aura(c,x,y-30,38,color,near?.14:.06);
      box(c,x-35,y-4,70,10,p.wall);box(c,x-29,y-11,58,8,p.stone);box(c,x-26,y-14,52,3,p.trim);
      if(o.eventId==='altar'){
        box(c,x-16,y-47,32,34,'#674957');box(c,x-22,y-51,44,7,'#a17b79');box(c,x-10,y-43,4,23,'#d5af91');
        poly(c,[[x-14,y-52],[x-9,y-70],[x-2,y-65],[x+3,y-90-bob],[x+9,y-69],[x+16,y-52]],'#d67d60');
        poly(c,[[x-7,y-53],[x-3,y-68],[x+4,y-77-bob],[x+9,y-53]],'#ffe1a4');
      }else if(o.eventId==='well'){
        box(c,x-29,y-36,58,22,'#466074');box(c,x-32,y-41,64,9,'#9cb4bb');oval(c,x,y-40,25,7,'#203643');
        c.save();c.globalAlpha=.7;oval(c,x,y-40,20,4,color);c.restore();
        for(let i=0;i<4;i++)box(c,x-25+i*15,y-26,11,2,'#718b9a');
        c.save();c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.arc(x,y-72+bob,13,.3,Math.PI*1.6);c.stroke();c.restore();
      }else if(o.eventId==='cache'){
        poly(c,[[x-24,y-17],[x-22,y-51],[x-12,y-62],[x+17,y-59],[x+25,y-42],[x+24,y-17]],'#6d5360');
        box(c,x-21,y-43,43,25,'#ad8262');box(c,x-9,y-59,17,46,'#c6a17b');box(c,x-6,y-42,12,10,'#e6cc91');
        box(c,x-33,y-32,13,19,'#7b9e91');box(c,x-30,y-38,7,7,'#d1bd93');gem(c,x+31,y-25,6,color);
      }else if(o.eventId==='inscription'){
        poly(c,[[x-22,y-15],[x-25,y-79],[x-12,y-91],[x+22,y-84],[x+26,y-15]],'#394b62');
        poly(c,[[x-17,y-17],[x-19,y-75],[x-10,y-84],[x+17,y-78],[x+20,y-17]],'#66778c');
        for(let i=0;i<5;i++){const shift=still?0:Math.round(Math.sin(t+i)*2);box(c,x-11+shift,y-69+i*10,18-i%3*3,2,color);box(c,x+8,y-69+i*10,2,5,color);}
      }else if(o.eventId==='wish'){
        box(c,x-13,y-36,26,22,'#5c697a');box(c,x-24,y-41,48,7,'#a3b1b1');
        poly(c,[[x,y-88+bob],[x+5,y-71+bob],[x+22,y-68+bob],[x+8,y-57+bob],[x+12,y-40+bob],[x,y-49+bob],[x-14,y-40+bob],[x-8,y-57+bob],[x-22,y-68+bob],[x-5,y-71+bob]],color);
        gem(c,x,y-65+bob,8,'#fff0ca');
      }else{
        box(c,x-4,y-54,8,40,'#856d79');poly(c,[[x-27,y-58],[x+21,y-63],[x+28,y-36],[x-23,y-31]],'#cfbca4');
        poly(c,[[x-24,y-56],[x+21,y-61],[x,y-42]],'#f0debc');gem(c,x,y-43,6,'#b981a2');
        stroke(c,x+25,y-15,x+31,y-46,'#91aa94',2);for(let i=0;i<5;i++){const a=i*TAU/5;pixelDisk(c,x+31+Math.cos(a)*7,y-48+Math.sin(a)*7,4,color);}pixelDisk(c,x+31,y-48,3,'#f1dda3');
      }
      if(near){c.save();c.globalAlpha=.8;gem(c,x,y-105+bob,5,color);c.restore();}
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
    npc(c,id,p,t,still,boss,phase,pose=null){
      if(id!=='lumina'&&pose&&window.DungeonEnemyCharacter?.supports(id)){
        window.DungeonEnemyCharacter.draw(c,pose,{npcId:id,kind:boss?'boss':'npc',boss,phase});
        return;
      }
      const modern=id==='lumina'&&pose&&typeof window.DungeonCharacter?.draw==='function';
      const anger=boss?'#ffab9d':p.light,bob=modern||still||boss?0:Math.sin(t*1.6)*1.5;
      c.save();c.translate(0,bob);
      if(boss){const cueTime=modern?pose.time:t,cueStill=modern?pose.still:still;aura(c,0,-35,58,anger,phase>1?.15:.07);for(let i=0;i<5;i++){const a=i*TAU/5+(cueStill?0:cueTime*.5);gem(c,Math.cos(a)*46,-38+Math.sin(a)*31,phase>1?6:4,anger);}}
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
      }else if(id==='lantern'){
        // A moth-like guide carries a bright lantern beneath translucent wings.
        aura(c,0,-38,40,'#90eddf',boss?.12:.08);
        poly(c,[[-9,-41],[-34,-74],[-41,-48],[-23,-23]],'#4f9c9c');poly(c,[[9,-41],[34,-74],[41,-48],[23,-23]],'#67bbb1');
        poly(c,[[-19,-36],[-31,-18],[-9,-8]],'#9ce1c9');poly(c,[[19,-36],[31,-18],[9,-8]],'#9ce1c9');
        box(c,-10,-59,20,29,'#d5e5c6');box(c,-14,-64,28,10,'#42777e');gem(c,0,-71,9,'#c2ffe4');
        box(c,-6,-51,4,5,boss?'#f58c8b':'#244f62');box(c,3,-51,4,5,boss?'#f58c8b':'#244f62');
        stroke(c,-5,-31,-5,-20,'#a9d8c0',2);stroke(c,5,-31,5,-20,'#a9d8c0',2);
        box(c,-11,-22,22,22,'#406973');box(c,-8,-18,16,15,'#9cf1d7');box(c,-3,-16,6,10,'#e7ffcc');box(c,-14,-24,28,4,'#c2d2a0');box(c,-14,0,28,4,'#c2d2a0');
      }else if(id==='echo'){
        // Apprentice hat, floating pages and a hand mirror announce copied spells.
        poly(c,[[-21,-5],[-18,-47],[14,-48],[24,-5]],'#8e80b8');box(c,-11,-59,24,21,'#dcc3b0');
        poly(c,[[-27,-62],[-10,-89],[14,-63],[27,-59]],'#ae9bd9');box(c,-28,-62,56,5,'#e1cef5');
        box(c,-7,-52,4,4,boss?'#ff9caa':'#4f426d');box(c,5,-52,4,4,boss?'#ff9caa':'#4f426d');
        box(c,-6,-34,11,25,'#dbbce7');gem(c,0,-30,6,'#eee3ff');
        stroke(c,29,-7,29,-47,'#af92c7',4);gem(c,29,-58,18,'#d8bded');gem(c,29,-58,12,'#779bc1');stroke(c,24,-52,33,-64,'#e3e7ff',2);
        poly(c,[[-39,-46],[-25,-49],[-22,-28],[-36,-25]],'#d4caee');stroke(c,-35,-39,-28,-40,'#8373ad',2);stroke(c,-34,-33,-27,-34,'#8373ad',2);
      }else if(id==='lumina'){
        if(modern)window.DungeonCharacter.draw(c,pose,'lumina');else this.lumina(c,t,still,boss);
      }else if(id==='sentinel'){
        // Folded paper armour, a square shield and gold seams give a crisp outline.
        poly(c,[[-24,-12],[-19,-48],[0,-57],[20,-47],[25,-12]],'#d5c99b');
        poly(c,[[-19,-48],[0,-36],[0,-8],[-24,-12]],'#b8a576');poly(c,[[0,-36],[20,-47],[25,-12],[0,-8]],'#e9d9a4');
        poly(c,[[-20,-52],[-15,-73],[0,-83],[17,-72],[21,-52]],'#e8dcad');stroke(c,-13,-70,0,-57,'#ab945f',2);stroke(c,0,-57,14,-70,'#ab945f',2);
        box(c,-10,-59,7,4,boss?'#f28a77':'#625947');box(c,4,-59,7,4,boss?'#f28a77':'#625947');
        poly(c,[[-37,-46],[-17,-41],[-19,-12],[-32,-6],[-41,-21]],'#8f875f');poly(c,[[-34,-41],[-22,-38],[-23,-16],[-31,-12],[-37,-22]],'#e8ce84');
        stroke(c,30,-1,30,-70,'#b8a67a',4);poly(c,[[30,-93],[37,-70],[30,-61],[23,-70]],'#fff0bd');
        box(c,-17,-7,12,10,'#96845c');box(c,7,-7,12,10,'#96845c');
      }else{
        // Ferryman: tall veiled silhouette, crescent lantern and a long oar.
        poly(c,[[-26,-2],[-18,-67],[0,-87],[17,-69],[25,-2]],'#4b7182');poly(c,[[-12,-63],[0,-78],[12,-62],[9,-39],[-9,-39]],'#172c42');box(c,-7,-60,4,4,boss?'#ff9b91':'#b9e0de');box(c,4,-60,4,4,boss?'#ff9b91':'#b9e0de');
        poly(c,[[-19,-36],[-30,-11],[-5,-17]],'#7ba3a9');poly(c,[[17,-37],[29,-13],[7,-19]],'#709ba6');stroke(c,32,1,32,-90,'#aca17d',4);box(c,27,-88,10,22,'#d8c69a');
        stroke(c,-24,-39,-35,-39,'#d1c59d',2);stroke(c,-35,-39,-35,-25,'#d1c59d',2);aura(c,-35,-17,19,'#a2e3e1',.11);box(c,-42,-27,14,18,'#687e91');box(c,-39,-24,8,12,'#c3f0dd');box(c,-44,-10,18,3,'#b5c3a5');
      }
      if(!modern)this.npcMaterials(c,id,boss);
      if(boss&&phase>1){box(c,-18,-87,36,3,'#f3b09c');gem(c,0,-98,8,'#ffd1b0');}
      c.restore();
    }
    lumina(c,t,still,boss){
      // Adult star-cartographer, rose-silver bob, tailored navy dress and an
      // ivory shoulder cape. Her silhouette and long staff match her portrait.
      const sway=still?0:Math.round(Math.sin(t*1.8)*2),eye=boss?'#d26594':'#3c536d';
      box(c,-11,-12,8,15,'#25334a');box(c,7,-12,8,15,'#25334a');box(c,-11,-1,10,4,'#b6a5a1');box(c,7,-1,10,4,'#b6a5a1');
      poly(c,[[-14,-49],[-23,-12],[-19,-5],[0,-9],[23,-5],[21,-17],[12,-49]],'#17253d');
      poly(c,[[-11,-46],[-18,-13],[-10,-9],[0,-13],[17,-9],[13,-45]],'#405673');
      poly(c,[[-12,-41],[-16,-15],[-10,-11],[-3,-16],[-5,-42]],'#6d8295');
      poly(c,[[6,-43],[12,-43],[17,-10],[7,-14]],'#2e3b5a');
      stroke(c,-16,-11,0,-15,'#d7bfaa',2);stroke(c,0,-15,17,-10,'#b59c9a',2);
      box(c,-13,-29,26,4,'#d9bd98');gem(c,0,-27,4,'#f2cfdd');
      // Cream cape splits behind the arms; a folded star map hangs at the hip.
      poly(c,[[-12,-57],[-25,-45],[-25+sway,-27],[-15,-32],[-3,-49],[10,-51],[22,-33],[26,-43],[12,-57]],'#d0cfc8');
      poly(c,[[-12,-55],[-21,-45],[-21+sway,-33],[-15,-37],[-4,-51]],'#fff0d9');
      poly(c,[[9,-52],[22,-43],[22,-36],[13,-40]],'#9baeba');
      stroke(c,-23,-43,-21,-30,'#dbb99c',2);stroke(c,21,-44,24,-36,'#dfc2aa',2);
      box(c,-21,-26,12,17,'#bca1ac');box(c,-18,-25,8,14,'#f0ddc4');stroke(c,-16,-21,-12,-17,'#778ea3',1);gem(c,-14,-16,3,'#b17b9c');
      // Neck and face use a smaller head than the apprentice sprites.
      box(c,-5,-62,10,11,'#e3ad9d');box(c,-12,-80,25,25,'#766b89');
      box(c,-10,-78,20,20,'#d8a393');box(c,-9,-77,18,17,'#f1c7b1');box(c,-9,-65,4,6,'#e7b3a2');
      box(c,-6,-69,3,4,eye);box(c,4,-69,3,4,eye);box(c,-6,-69,1,1,'#edf5ed');box(c,4,-69,1,1,'#edf5ed');
      box(c,-8,-64,4,2,'#df9eab');box(c,5,-64,4,2,'#df9eab');box(c,-1,-61,4,1,'#ad7185');
      // Asymmetric silver-rose bob, one swept fringe and a star hairpin.
      poly(c,[[-15,-65],[-15,-79],[-7,-86],[6,-86],[14,-79],[16,-60],[9,-56],[9,-72],[3,-78],[-8,-71],[-9,-56],[-16,-59]],'#ae91aa');
      poly(c,[[-13,-77],[-6,-83],[6,-83],[10,-78],[3,-78],[-8,-71],[-9,-58],[-13,-60]],'#edcad6');
      poly(c,[[6,-82],[12,-77],[14,-62],[10,-59],[9,-74]],'#c9b5cd');
      box(c,-8,-81,10,3,'#f6e3df');stroke(c,-12,-70,-12,-61,'#d8bbce',2);
      gem(c,12,-74,5,'#ffe8b9');box(c,11,-77,2,6,'#fff6d9');
      // A restrained collar pendant and staff distinguish her friendly magic.
      poly(c,[[-7,-57],[0,-49],[8,-57],[5,-47],[-5,-47]],'#f0e6d4');gem(c,0,-49,5,'#b9e4d8');
      stroke(c,31,-1,31,-78,'#d4b69e',4);stroke(c,30,-75,30,-6,'#f0d6ba',1);
      poly(c,[[31,-98],[41,-85],[34,-75],[31,-64],[24,-77],[22,-86]],'#66547c');
      poly(c,[[31,-94],[37,-84],[32,-78],[29,-69],[27,-80],[26,-86]],'#d9bad5');
      gem(c,31,-83,8,boss?'#f2a6c8':'#b5eddc');gem(c,30,-85,4,'#efffe5');
      stroke(c,20,-83,42,-83,'#e8c5a8',2);gem(c,23,-83,3,'#f8daaf');gem(c,40,-83,3,'#f8daaf');
      box(c,18,-39,12,7,'#d4cfc8');box(c,27,-39,6,7,'#efc1ac');
      aura(c,31,-83,12,boss?'#eab1d0':'#b5e9d8',.06);
    }
    npcMaterials(c,id,boss){
      // Broad left-lit / right-shadowed planes add volume. Accessories remain
      // role-specific and are large enough to read on a phone-sized arena.
      const gold=boss?'#efb48c':'#e8ce97';
      if(id==='merchant'){
        poly(c,[[-18,-50],[-14,-33],[-18,-12],[-24,-12],[-21,-47]],'#bb9070');poly(c,[[9,-44],[20,-47],[23,-31],[12,-31]],'#674d50');
        poly(c,[[-12,-76],[4,-83],[-3,-65],[-16,-58]],'#edbf86');box(c,-22,-26,45,2,'#c8a479');box(c,-8,-27,12,9,gold);box(c,-5,-25,6,4,'#74534f');
        stroke(c,14,-49,-13,-29,'#554050',5);stroke(c,14,-49,-13,-29,'#d0a17a',2);box(c,15,-25,17,3,'#f0ce94');box(c,15,-20,3,10,'#a57e59');
        gem(c,22,-16,4,'#f5d697');box(c,-13,-12,10,3,'#d5ac7a');
      }else if(id==='healer'){
        poly(c,[[-18,-40],[-12,-33],[-17,-11],[-22,-10]],'#91bea0');poly(c,[[12,-37],[18,-40],[22,-12],[14,-14]],'#426e64');
        box(c,-24,-65,15,3,'#f0c4ae');box(c,14,-62,12,4,'#955e75');stroke(c,-18,-56,-11,-54,'#a26e7c',2);stroke(c,12,-54,21,-56,'#a26e7c',2);
        box(c,-9,-17,18,3,'#e6dcab');box(c,-18,-36,7,10,'#435e55');box(c,-16,-34,3,6,'#a8e0a6');box(c,13,-33,8,11,'#997579');box(c,15,-32,4,7,'#d9b5ac');
        poly(c,[[23,-45],[15,-51],[18,-39]],'#a0d4a4');gem(c,26,-61,5,'#eeffcc');
      }else if(id==='smith'){
        box(c,-23,-54,13,4,'#d0ccd0');box(c,15,-51,9,17,'#555b70');box(c,-14,-44,5,27,'#dda078');box(c,9,-43,6,28,'#925d54');
        stroke(c,-10,-49,8,-35,'#5e4b56',3);box(c,-10,-33,20,3,'#d7b18a');box(c,-8,-31,3,3,gold);box(c,6,-31,3,3,gold);
        box(c,-12,-73,5,3,'#f2d4a5');box(c,-10,-50,6,9,'#97818b');box(c,-7,-46,4,9,'#baa195');box(c,22,-74,5,15,'#dfd9d0');box(c,29,-69,13,3,'#7c8193');
        gem(c,37,-65,5,'#e2b47f');box(c,30,-31,5,8,'#d5af80');
      }else if(id==='cartographer'){
        poly(c,[[-17,-49],[-10,-43],[-16,-34],[-22,-35]],'#a9a7c4');poly(c,[[13,-49],[19,-43],[23,-33],[13,-35]],'#4b527e');
        poly(c,[[-8,-79],[-6,-85],[9,-69],[1,-69]],'#c9b9d7');box(c,-18,-65,32,2,'#e2cfa9');box(c,-18,-30,3,17,'#b09b7e');box(c,18,-31,3,18,'#b09b7e');
        gem(c,7,-19,4,'#a27379');box(c,-13,-18,8,2,'#a2a081');stroke(c,-12,-25,0,-16,'#aca186',1);box(c,-8,-7,4,3,gold);box(c,7,-7,4,3,gold);
      }else if(id==='lantern'){
        poly(c,[[-31,-67],[-36,-50],[-22,-32],[-24,-48]],'#77c2b6');poly(c,[[31,-67],[36,-50],[22,-32],[24,-48]],'#a4e4c9');
        stroke(c,-31,-60,-22,-41,'#b9f0cc',2);stroke(c,31,-60,22,-41,'#ddf5d5',2);gem(c,-29,-48,4,'#e7efb9');gem(c,29,-48,4,'#e7efb9');
        box(c,-10,-59,4,17,'#eff2cf');box(c,6,-56,4,17,'#a4bcae');box(c,-10,-62,20,2,'#8cc5b6');box(c,-11,-23,22,2,'#e7e2ac');
        box(c,-8,-19,3,16,'#4e8586');box(c,5,-19,3,16,'#4e8586');box(c,-8,-4,16,3,'#618983');stroke(c,-7,-25,-4,-30,gold,2);stroke(c,7,-25,4,-30,gold,2);
      }else if(id==='echo'){
        poly(c,[[-15,-44],[-8,-38],[-12,-10],[-18,-8]],'#b2a0d0');poly(c,[[11,-42],[15,-42],[20,-10],[10,-12]],'#655988');
        poly(c,[[-17,-70],[-10,-84],[-8,-76],[-12,-68]],'#d7bff0');poly(c,[[1,-77],[13,-65],[3,-65]],'#8875b0');box(c,-21,-63,40,2,'#f5dbec');
        box(c,-16,-11,34,3,'#d8bddf');box(c,-5,-34,8,2,'#fff1da');gem(c,0,-29,3,'#fff3cf');box(c,-14,-29,8,12,'#64557c');box(c,-13,-28,3,10,'#e2c6b2');
        gem(c,27,-61,6,'#b5dcdf');box(c,25,-47,9,3,'#edc8dd');stroke(c,-35,-44,-31,-44,'#fff1db',2);
      }else if(id==='lumina'){
        // Small star embroidery stays distinct from the apprentice's mirror.
        gem(c,-7,-19,3,'#cbd9dc');box(c,8,-37,2,7,'#d6c4b4');box(c,5,-35,7,2,'#d6c4b4');
      }else if(id==='sentinel'){
        poly(c,[[-14,-71],[-1,-78],[-1,-60]],'#fff1c3');poly(c,[[2,-78],[15,-70],[4,-60]],'#b5a16d');box(c,-17,-51,34,3,'#a18b5d');
        stroke(c,-15,-43,-3,-35,'#f6e8ba',2);stroke(c,3,-35,16,-43,'#fff0bd',2);gem(c,0,-32,6,'#9f8f65');gem(c,0,-33,3,'#fff2be');
        poly(c,[[-32,-37],[-25,-35],[-26,-20],[-31,-16],[-35,-23]],'#b79857');stroke(c,-33,-37,-28,-35,'#fff1bb',2);box(c,-16,-7,10,3,'#e0c68e');box(c,8,-7,10,3,'#ddc38b');
        stroke(c,30,-84,30,-67,'#b8c2aa',2);box(c,27,-49,6,4,gold);
      }else{
        poly(c,[[-17,-63],[-11,-57],[-17,-12],[-23,-6]],'#6996a2');poly(c,[[12,-57],[17,-63],[22,-9],[13,-15]],'#354f67');
        stroke(c,-11,-67,-3,-78,'#93b5b5',2);stroke(c,-11,-36,-15,-16,'#a4c3bc',2);stroke(c,10,-35,15,-13,'#658d9b',2);
        box(c,-17,-7,13,3,'#8eaaa8');box(c,6,-8,13,3,'#78999e');box(c,28,-85,3,15,'#f0d8a5');box(c,31,-54,3,15,'#dbc494');
        box(c,-41,-27,12,2,'#d4d5ae');box(c,-38,-23,3,9,'#ecffe4');box(c,-36,-35,3,7,gold);
      }
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
        if(region===3){box(c,cx-2,base-shaft-13,4,shaft-2,'#a3b6bc');gem(c,cx,base-shaft-24,9,'#e7b1c9');gem(c,cx-1,base-shaft-26,4,'#ffe4db');}
      }
    }
    actorMarker(c,a,kind='player'){
      // Small open brackets / a diamond identify ownership, not a collision or
      // attack radius. Keep all decoration below the feet and free of pulsing.
      const x=val(a.x),y=val(a.y),mint='#a2e5cf';c.save();
      if(kind==='ally'){
        c.globalAlpha*=.78;gem(c,x,y+11,5,'#122e36');gem(c,x,y+11,3,mint);
        box(c,x-8,y+10,2,2,'#6faaa2');box(c,x+6,y+10,2,2,'#6faaa2');
      }else{
        c.globalAlpha*=.9;
        c.beginPath();c.moveTo(x-17,y+3);c.lineTo(x-17,y+7);c.lineTo(x-11,y+10);
        c.moveTo(x+17,y+3);c.lineTo(x+17,y+7);c.lineTo(x+11,y+10);
        c.strokeStyle='#102a34';c.lineWidth=4;c.stroke();c.strokeStyle=mint;c.lineWidth=2;c.stroke();
        const fx=val(a.facingX,1),fy=val(a.facingY),length=Math.hypot(fx,fy),ux=length>.01?fx/length:1,uy=length>.01?fy/length:0;
        const xx=x+ux*14,yy=y+9+uy*4;
        const arrow=(size,color)=>poly(c,[[xx+ux*size,yy+uy*size],[xx-ux*size*.65-uy*size*.8,yy-uy*size*.65+ux*size*.8],[xx-ux*size*.65+uy*size*.8,yy-uy*size*.65-ux*size*.8]],color);
        arrow(4,'#102a34');arrow(2.7,'#e0ffe3');
      }
      c.restore();
    }
    mage(c,a,p,t,still,run,showMarker=true,poseOverride=null){
      const x=val(a.x),y=val(a.y),dash=val(a.dashTime)>0,invuln=val(a.invulnerable)>0;
      const modern=typeof window.DungeonCharacter?.draw==='function',pose=poseOverride||(showMarker?this.playerPose(a,run):null);
      const face=val(pose?.facingX,val(a.facingX,1))<-.05?-1:1;
      c.save();c.globalAlpha*=.48;oval(c,x,y+2,dash?22:17,6,p.void);c.restore();
      c.save();c.globalAlpha*=.5;oval(c,x,y+1,10,3,'#081521');c.restore();
      if(showMarker)this.actorMarker(c,pose?{...a,facingX:pose.facingX,facingY:pose.facingY}:a);
      if(dash)aura(c,x,y-11,22,'#bfeaff',.11);
      c.save();if(invuln&&!(modern&&pose?pose.still:still))c.globalAlpha*=.62+Math.sin((modern&&pose?pose.time:t)*26)**2*.3;
      c.translate(Math.round(x),Math.round(y));
      if(modern&&pose)window.DungeonCharacter.draw(c,pose,'player');
      else{
        c.scale(face*.57,.57);
        const casting=pose?pose.mode==='chant'||pose.mode==='cast':showMarker&&!dash&&run?.status==='combat'&&(run?.arena?.focusActive||(run?.arena?.effects||[]).some(e=>e.kind==='cast'&&val(e.life)>.12));
        if(this.legacy?.hero)this.legacy.hero.call(this.legacy,c,-34,-98,t,run?.player,still||dash,{casting});
        else this.fallbackMage(c,p);
      }
      c.restore();
      if(dash&&!this.actorContext?.reducedMotion){stroke(c,x-face*25,y-17,x-face*43,y-17,'#bad6f9',2);stroke(c,x-face*23,y-9,x-face*34,y-9,'#97b4e5',2);}
    }
    fallbackMage(c,p){
      poly(c,[[-28,-12],[-17,-53],[15,-53],[27,-12]],'#685a91');box(c,-16,-58,30,17,'#ebbf9a');poly(c,[[-37,-58],[-11,-96],[22,-60],[38,-55]],'#a794cb');box(c,-36,-59,74,5,'#d7b9e5');box(c,-8,-51,4,4,'#393047');box(c,30,-64,4,57,'#c3a280');gem(c,32,-72,10,p.light);
    }
    foe(c,e,p,t,still,region,poseOverride=null){
      const x=val(e.x),y=val(e.y),boss=e.kind==='boss'||e.boss;
      const type=e.npcId||e.sprite||e.enemyId||e.id||'slime',npcId=String(type).replace(/^npc-/,''),isNpc=NPC_IDS.has(npcId);
      const spawning=e.active===false,scale=isNpc?(boss?1.12:.88):(boss?.7:.66);
      const articulated=!!window.DungeonEnemyCharacter?.supports(npcId),modern=articulated||npcId==='lumina'&&typeof window.DungeonCharacter?.draw==='function',space=this.actorContext?.space;
      let pose=modern?(poseOverride||this.actorPose('enemy:'+String(e.id||npcId),e,{hp:e.hp,lookAt:space?.player,action:e.action})):null;
      const entering=boss&&!poseOverride&&val(space?.introRemaining)>0;
      if(entering&&pose){
        const progress=this.actorContext?.reducedMotion?.7:clamp(1-val(space.introRemaining)/Math.max(.1,val(space.introDuration,2.2)),0,1);
        pose={...pose,mode:'intro',introProgress:progress,castProgress:progress,moving:0,speed:0,action:null};
      }
      c.save();c.globalAlpha*=spawning?.25:.4;oval(c,x,y+2,boss?39:20,boss?10:6,p.void);c.restore();
      if(spawning){c.save();c.globalAlpha=.35;this.targetRing(c,e,p,t);c.restore();}
      c.save();if(spawning)c.globalAlpha*=.45;if(entering&&!this.actorContext?.reducedMotion)c.globalAlpha*=.5+Math.min(1,(pose?.introProgress||0)*3)*.5;c.translate(Math.round(x),Math.round(y));if(!modern)c.scale(scale,scale);
      // Lumina keeps her original rig while damage still adds a small recoil
      // over its authoritative cast pose, without changing the player's art.
      if(modern&&!articulated&&pose?.action&&pose.hitRecoil>0)c.translate(-pose.facingX*pose.hitRecoil*2,pose.hitRecoil);
      if(articulated)window.DungeonEnemyCharacter.draw(c,pose,{...e,sprite:npcId,boss});
      else if(isNpc)this.npc(c,npcId,p,t,still,boss,val(e.phase,1),pose);
      else if(this.legacy?.enemy)this.legacy.enemy.call(this.legacy,c,0,0,{id:type,kind:boss?'boss':e.kind,boss,phase:e.phase},t,p,still,[1,0,2,3][region]);
      else this.fallbackFoe(c,e,p,boss);
      c.restore();
      if(val(e.chargeTime)>0){c.save();c.globalAlpha=.7;stroke(c,x-val(e.chargeX)*20,y-val(e.chargeY)*20,x-val(e.chargeX)*37,y-val(e.chargeY)*37,p.hot,3);c.restore();}
      if(e.phase>1&&boss){c.save();c.globalAlpha=.45;gem(c,x,y-133,6,p.hot);c.restore();}
    }
    fallbackFoe(c,e,p,boss){
      const r=boss?42:24;pixelDisk(c,0,-r,r,'#453b58');pixelDisk(c,0,-r-4,r*.8,p.glow);box(c,-r*.45,-r-8,7,7,'#272139');box(c,r*.2,-r-8,7,7,'#272139');if(boss){gem(c,-24,-r*2,13,p.accent);gem(c,24,-r*2,13,p.accent);}
    }
    targetRing(c,e,p,t){
      const x=val(e.x),y=val(e.y),r=val(e.r,15)+8,boss=e.kind==='boss'||e.boss;
      c.save();c.strokeStyle='#f7d59a';c.lineWidth=2;c.globalAlpha=.78;
      for(let i=0;i<4;i++){const a=i*TAU/4+.2;c.beginPath();c.ellipse(x,y+2,r,r*.65,0,a,a+.63);c.stroke();}
      // Small downward chevron marks the currently selected spell target.
      const top=y-(boss?143:78);poly(c,[[x-4,top-4],[x+4,top-4],[x,top]],'#f7d59a');c.restore();
    }
    healthBar(c,e,p){
      if(e.active===false)return;
      const boss=e.kind==='boss'||e.boss,width=boss?67:34,x=val(e.x)-width/2,y=val(e.y)-(boss?135:70),ratio=clamp(val(e.hp)/Math.max(1,val(e.maxHp,1)),0,1);
      box(c,x-2,y-2,width+4,8,'#0f1725');box(c,x,y,width,4,'#493341');box(c,x,y,Math.max(0,width*ratio),4,boss?'#eeaa92':'#b992ad');box(c,x,y,Math.max(0,width*ratio),1,boss?'#ffdebb':'#e4bdd1');
    }
    combatIntent(c,e,a,p,still){
      const action=e.action,boss=e.kind==='boss'||e.boss;
      if(!action&&!val(e.counterWindow)&&!e.counterReady)return;
      const x=val(e.x),y=val(e.y),comboTotal=val(action?.comboTotal,action?.attacks?.length||1);
      const intermediate=action?.stage==='recovery'&&val(action.combo,1)<comboTotal;
      const committed=action?.stage==='windup'||action?.stage==='active';
      const counter=val(e.counterWindow)>0&&!intermediate&&!committed,banked=!!e.counterReady&&!counter;
      const ritual=a.ritual&&a.ritual.status==='charging'&&String(a.ritual.bossId)===String(e.id);
      const color=counter?'#a5f4d3':banked||intermediate?'#ffcf83':ritual?'#f5bdff':action?.stage==='windup'?'#ffce96':action?.stage==='active'?'#ffa79b':'#c8b6dc';
      if(boss){
        const label=counter?'破綻・反擊':banked?'閃避成功・等連段結束':intermediate?'連段未完':ritual?'禁咒詠唱':action?.stage==='windup'?'蓄勢':action?.stage==='active'?'出招':action?.stage==='stagger'?'失衡':'收招';
        const width=Math.max(68,label.length*11+12),labelX=clamp(x,width/2+8,W-width/2-8);
        c.save();c.textAlign='center';c.font='bold 11px sans-serif';c.fillStyle='#152033';c.fillRect(labelX-width/2,y+17,width,17);c.fillStyle=color;c.fillText(label,labelX,y+29);c.restore();
      }
      if(counter){c.save();c.globalAlpha=.85;c.strokeStyle=color;c.lineWidth=2;for(let i=0;i<4;i++){const angle=i*TAU/4+.3;c.beginPath();c.ellipse(x,y+2,val(e.r,24)+11,14,0,angle,angle+.65);c.stroke();}c.restore();}
      if(action?.stage==='windup'){
        const progress=clamp(val(action.progress,val(action.elapsed)/Math.max(.001,val(action.duration,1))),0,1),width=boss?56:26;
        box(c,x-width/2,y+(boss?36:9),width,2,'#32283c');box(c,x-width/2,y+(boss?36:9),Math.max(1,width*progress),2,color);
      }
      if(ritual){
        c.save();c.strokeStyle=color;c.lineWidth=2;c.globalAlpha=.65;
        const phase=still?0:this.clock*.6;
        for(let i=0;i<3;i++){const angle=i*TAU/3+phase,rx=x+Math.cos(angle)*49,ry=y-70+Math.sin(angle)*27;gem(c,rx,ry,7,i<val(a.ritual.index)?'#a5f4d3':color);}
        c.beginPath();c.ellipse(x,y-70,49,27,0,0,TAU);c.stroke();c.restore();
      }
    }
    playerStatus(c,a,run,p,t,still){
      const x=val(a.x),y=val(a.y),shield=val(run?.player?.shield),hp=val(run?.player?.hp,100),max=val(run?.player?.maxHp,100);
      if(shield>0){c.save();c.globalAlpha=.32;c.strokeStyle='#b0d6ff';c.lineWidth=2;c.beginPath();c.ellipse(x,y-22,24,33,0,0,TAU);c.stroke();gem(c,x,y-60,4,'#b0d6ff');c.restore();}
      if(hp/max<.3){c.save();c.globalAlpha=still?.22:.15+Math.sin(t*3)**2*.12;oval(c,x,y+2,22,8,'#ff9a9a');c.restore();}
      // Recharge pips below the character keep the dodge state near the action.
      const cd=Math.max(0,val(a.dashCooldown)),ready=cd<=0;
      for(let i=0;i<3;i++)box(c,x-7+i*5,y+20,3,2,ready?'#b0dbc4':(i<Math.ceil((1-clamp(cd/1.15,0,1))*3)?'#b0dbc4':'#51616d'));
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
        }else if(kind==='arc'){
          const a=val(h.angle),spread=val(h.spread,Math.PI/2),start=a-spread/2,end=a+spread/2;
          c.moveTo(x+Math.cos(start)*inner,y+Math.sin(start)*inner);c.lineTo(x+Math.cos(start)*r,y+Math.sin(start)*r);
          c.arc(x,y,r,start,end);c.lineTo(x+Math.cos(end)*inner,y+Math.sin(end)*inner);
          if(inner>0)c.arc(x,y,inner,end,start,true);else c.lineTo(x,y);c.closePath();
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
      aura(c,x,y,r*2,color,.11);
      if(b.shape==='coin'){pixelDisk(c,x,y,r+2,'#604c39');pixelDisk(c,x,y,r,color);stroke(c,x,y-r*.55,x,y+r*.55,'#fff0bd',2);}
      else if(b.shape==='paper'||b.shape==='page'){c.translate(x,y);c.rotate(still?0:a);box(c,-r,-r*.7,r*2,r*1.4,color);stroke(c,-r*.5,-2,r*.5,-2,'#5c4d78',1);stroke(c,-r*.5,2,r*.2,2,'#5c4d78',1);}
      else if(b.shape==='lantern'||b.shape==='crystal'){gem(c,x,y,r+2,color);gem(c,x,y,r*.5,'#fff4d3');}
      else{pixelDisk(c,x,y,r+1,'#291e33');pixelDisk(c,x,y,r,color);box(c,x-1,y-2,3,3,'#fff0da');}
      c.restore();
    }
    captureDeaths(run){
      // The final hit changes Engine status immediately. Keep visual snapshots locally
      // so reward UI/save progression never waits for the death animation to finish.
      if(this.visualRun!==run){this.visualRun=run;this.deathArena=null;this.seenDeaths.clear();this.deathScenes=[];this.lastPhaseKey=null;}
      const a=run?.arena;if(!a)return;
      if(this.deathArena!==a){this.deathArena=a;this.seenDeaths.clear();this.deathScenes=[];}
      for(const effect of a.effects||[]){
        if(effect.kind!=='death'||val(effect.life,1)<=0)continue;
        const key=String(effect.id??('actor-'+effect.actor?.id+':'+effect.x+':'+effect.y));
        if(this.seenDeaths.has(key))continue;this.seenDeaths.add(key);
        const actor=effect.actor?{...effect.actor}:null,boss=!!effect.boss||actor?.kind==='boss';
        if(actor?.kind==='player')this.seenDeaths.add('player-death');
        const life=clamp(val(effect.maxLife,effect.life||1),boss?2.2:.35,boss?2.8:2.4);
        const pose=this.actorTracks.get(actor?.kind==='player'?'player':'enemy:'+String(actor?.id))?.pose;
        this.deathScenes.push({...effect,actor,boss,bossId:boss?this.bossIdentity(a,actor):null,life,maxLife:life,pose:pose?{...pose}:null});
        if(boss)this.shake=.75;
      }
      if(run.status==='lost'&&val(run.player?.hp,1)<=0&&!this.seenDeaths.has('player-death')){
        this.seenDeaths.add('player-death');const actor={...a.player,kind:'player'};
        const pose=this.actorTracks.get('player')?.pose;
        this.deathScenes.push({actor,x:actor.x,y:actor.y,r:38,color:'#b3c7ff',life:1.65,maxLife:1.65,pose:pose?{...pose}:null});
      }
      if(this.deathScenes.length>20)this.deathScenes=this.deathScenes.slice(-20);
    }
    drawDeaths(c,p,region,run,dt,paused,still){
      for(let i=this.deathScenes.length-1;i>=0;i--){
        const e=this.deathScenes[i],alpha=clamp(e.life/e.maxLife,0,1),progress=1-alpha,x=val(e.x,e.actor?.x),y=val(e.y,e.actor?.y),color=e.color||p.light,boss=e.boss;
        c.save();
        if(e.actor&&alpha>.3){
          c.globalAlpha=alpha*.8;c.translate(x,y);
          const appearance=e.actor.npcId||e.actor.sprite||e.actor.id;
          const modern=!!window.DungeonEnemyCharacter?.supports(appearance)||typeof window.DungeonCharacter?.draw==='function'&&(e.actor.kind==='player'||e.actor.npcId==='lumina'||e.actor.sprite==='lumina');
          if(!still&&!modern){c.scale(1+progress*.15,Math.max(.2,1-progress*.85));c.rotate((e.actor.kind==='player'?-1:1)*progress*.18);}
          const actor={...e.actor,x:0,y:0,alive:true,active:true,hp:1,invulnerable:0,dashTime:0};
          const pose=modern?{time:0,phase:0,facingX:val(e.actor.facingX,1),facingY:val(e.actor.facingY),...e.pose,
            mode:'fallen',moving:0,speed:0,action:null,castProgress:0,hurtProgress:this.actorContext?.reducedMotion?1:progress,still:!!this.actorContext?.reducedMotion}:null;
          if(actor.kind==='player')this.mage(c,actor,p,0,true,run,false,pose);else this.foe(c,actor,p,0,true,region,pose);
        }
        c.restore();c.save();c.globalAlpha=alpha;
        const count=still?8:boss?12:14,r=val(e.r,boss?62:32),spread=still?.55:.28+progress*1.5;
        for(let j=0;j<count;j++){
          const angle=j*TAU/count,rr=r*spread*(.7+(j%3)*.15),lift=still?0:progress*(boss?58:36);
          const xx=x+Math.cos(angle)*rr,yy=y-23+Math.sin(angle)*rr*.6-lift;
          if(j%3===0)gem(c,xx,yy,(boss?6:4)*(.3+alpha*.7),color);else box(c,xx,yy,alpha>.45?4:2,alpha>.45?4:2,color);
        }
        if(boss){
          this.bossDeath(c,e,x,y,progress,alpha,still);
          c.globalAlpha=alpha;c.font='bold 15px sans-serif';c.textAlign='center';c.fillStyle='#ffe6bd';
          c.fillText(BOSS_SCENES[e.bossId]?.defeat||'封印破碎',clamp(x,140,820),Math.max(145,y-126-(still?0:progress*12)));
        }
        if(e.actor?.kind==='player'){c.globalAlpha=alpha;gem(c,x,y-36-(still?0:progress*62),7,'#dce7ff');}
        c.restore();if(!paused)e.life-=dt;if(e.life<=0)this.deathScenes.splice(i,1);
      }
    }
    bossDeath(c,e,x,y,progress,alpha,still){
      const profile=BOSS_SCENES[e.bossId]||BOSS_SCENES.astral,motif=profile.motif,color=profile.color,q=still?.58:progress;
      c.save();c.globalAlpha=alpha*.8;
      const spread=20+q*94,lift=Math.sin(q*Math.PI)*42;
      if(motif==='bramble'){
        for(let i=0;i<7;i++){
          const angle=i*Math.PI/3.5,xx=x+Math.cos(angle)*spread,yy=y+7+Math.sin(angle)*spread*.25;
          stroke(c,x,y-20*(1-q),xx,yy,'#697254',4*(1-q)+1);
          poly(c,[[xx,yy],[xx+10,yy-12*(1-q)],[xx+4,yy+3]],color);
          poly(c,[[xx-7,yy-lift-27],[xx,yy-lift-32],[xx+5,yy-lift-23]],'#b5b28a');
        }
      }else if(motif==='mycelium'){
        for(let i=0;i<10;i++){const angle=i*TAU/10,xx=x+Math.cos(angle)*spread,yy=y-32+Math.sin(angle)*spread*.4-q*37;oval(c,xx,yy,3+(1-q)*10,3+(1-q)*7,color);}
        c.globalAlpha=alpha*.25;oval(c,x,y+3,25+q*68,8+q*20,'#93b58f');
      }else if(motif==='moonmirror'){
        for(let i=0;i<10;i++){
          const angle=i*TAU/10+q*2,xx=x+Math.cos(angle)*spread,yy=y-40+Math.sin(angle)*spread*.5-lift;
          c.save();c.translate(xx,yy);c.rotate(still?0:angle);box(c,-6,-9,12,18,color);stroke(c,-3,-4,3,-4,'#625570',1);stroke(c,-3,2,3,2,'#625570',1);c.restore();
        }
        box(c,x-15,y-8+q*12,30,7,'#90758e');box(c,x-13,y-9+q*12,26,3,'#d8cab5');
      }else if(motif==='crystal'){
        for(let i=0;i<9;i++){
          const angle=i*TAU/9,xx=x+Math.cos(angle)*spread,yy=y-39+Math.sin(angle)*spread*.65+q*q*60;
          c.save();c.translate(xx,yy);c.rotate(angle+q*.8);poly(c,[[-5,-17],[8,-9],[4,13],[-7,7]],i%2?color:'#88a2c4');stroke(c,-2,-11,3,8,'#f0ecf6',1);c.restore();
        }
      }else if(motif==='throne'){
        const fall=clamp(q*1.7,0,1),plateY=y-55+fall*66;
        for(let i=-2;i<=2;i++){const xx=x+i*(10+q*18),yy=plateY-Math.abs(i)*4;poly(c,[[xx-9,yy-10],[xx+10,yy-10],[xx+7,yy+8],[xx-6,yy+11]],i%2?'#a7a5a8':'#797e8d');stroke(c,xx-6,yy-7,xx+6,yy-7,color,2);}
        c.save();c.translate(x+18+q*29,y-78+fall*82);c.rotate(q*.7);poly(c,[[-16,3],[-18,-12],[-7,-4],[0,-17],[7,-4],[18,-12],[16,3]],color);c.restore();
      }else if(motif==='belltower'){
        const bellY=y-56+q*66;c.save();c.translate(x,bellY);c.rotate(still?0:Math.sin(q*5)*.13);poly(c,[[-15,-28],[15,-28],[20,1],[29,9],[-29,9],[-20,1]],'#8b849a');box(c,-30,7,60,5,color);c.restore();
        for(let i=0;i<6;i++){const xx=x+(i%2?1:-1)*(27+q*29),yy=y-96+i*14+q*40;c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.ellipse(xx,yy,4,7,.4,0,TAU);c.stroke();}
        c.globalAlpha=alpha*.3;c.strokeStyle=color;for(let i=0;i<3;i++){c.beginPath();c.ellipse(x,y+6,30+q*78+i*12,8+q*17+i*4,0,0,TAU);c.stroke();}
      }else if(motif==='constellation'){
        const stars=[];for(let i=0;i<11;i++){const xx=x+(i-5)*(6+q*14),yy=y-26-Math.sin(i*.6)*19-q*(30+i*4);stars.push([xx,yy]);gem(c,xx,yy,4+(i%3),color);if(i)stroke(c,...stars[i-1],xx,yy,color,1);}
      }else if(motif==='comet'){
        for(let i=0;i<8;i++){const angle=-Math.PI+(i/7)*Math.PI,xx=x+Math.cos(angle)*spread,yy=y-36+Math.sin(angle)*spread*.6-q*35;gem(c,xx,yy,6+(i%3)*2,color);stroke(c,xx,yy,xx-18*q,yy+31*q,'#9fb8dc',2);}
        gem(c,x,y-73-q*34,10*(1-q)+2,'#f3d9ef');
      }else if(motif==='vow'){
        const vertices=[];for(let i=0;i<7;i++){const angle=i*TAU/7,xx=x+Math.cos(angle)*(74-q*45),yy=y-52+Math.sin(angle)*(35-q*18)-q*29;vertices.push([xx,yy]);gem(c,xx,yy,4,color);if(i&&i!==4)stroke(c,...vertices[i-1],xx,yy,color,1);}
        gem(c,x,y-53-q*25,8,color);
      }else if(motif==='vault'){
        for(let i=0;i<12;i++){const angle=i*TAU/12,xx=x+Math.cos(angle)*spread,yy=y-25+Math.sin(angle)*spread*.3-lift+q*q*31;oval(c,xx,yy,5,still?4:2+Math.abs(Math.cos(q*6+i))*4,color);stroke(c,xx,yy-2,xx,yy+2,'#8f774f',1);}
        box(c,x-18,y+10,36,5,'#806e61');
      }else if(motif==='conservatory'||motif==='moonflower'){
        for(let i=0;i<12;i++){
          const angle=i*TAU/12+q*.8,xx=x+Math.cos(angle)*spread,yy=y-36+Math.sin(angle)*spread*.5-lift;
          c.save();c.translate(xx,yy);c.rotate(angle);poly(c,[[-4,-8],[4,-8],[8,0],[1,8],[-6,3]],i%3?color:'#dfe4ae');c.restore();
        }
        if(motif==='moonflower'){for(let i=0;i<5;i++){const angle=i*TAU/5;gem(c,x+Math.cos(angle)*9,y-48-q*42+Math.sin(angle)*8,7,color);}gem(c,x,y-48-q*42,4,'#f8e3ae');}
        else{box(c,x-5,y+4,10,12,'#99c9ae');box(c,x-3,y,6,6,'#d8dfb8');}
      }else if(motif==='forge'){
        const hammerY=y-46+q*58;c.save();c.translate(x+q*37,hammerY);c.rotate(q*.8);box(c,-3,-4,6,34,'#9c7a68');box(c,-18,-15,36,18,'#a29aa1');box(c,-15,-13,30,3,color);c.restore();
        for(let i=0;i<9;i++){const angle=i*TAU/9,xx=x+Math.cos(angle)*spread,yy=y-7+Math.sin(angle)*spread*.3-lift;stroke(c,xx,yy,xx+3,yy-5,color,2);}
      }else if(motif==='atlas'){
        for(let i=0;i<4;i++){const sign=i%2?1:-1,xx=x+sign*(12+q*55),yy=y-44+(i<2?-1:1)*(14+q*17)+q*22;c.save();c.translate(xx,yy);c.rotate(sign*q*.5);box(c,-12,-15,24,30,'#d5c39e');stroke(c,-8,-7,7,4,'#738886',2);stroke(c,-7,7,7,7,'#9d9277',1);c.restore();}
      }else if(motif==='river'){
        c.globalAlpha=alpha*.7;poly(c,[[x-42,y-3],[x+42,y-3],[x+29,y+13],[x-29,y+13]],'#849b96');stroke(c,x,y-56*(1-q),x,y-4,color,3);
        c.globalAlpha=alpha*.4;c.strokeStyle=color;for(let i=0;i<4;i++){c.beginPath();c.ellipse(x,y+10,31+q*69+i*10,8+q*14+i*3,0,0,TAU);c.stroke();}
      }else if(motif==='eclipse'){
        for(let i=0;i<6;i++){const angle=i*TAU/6,xx=x+Math.cos(angle)*spread,yy=y-37+Math.sin(angle)*spread*.4-q*35;box(c,xx-5,yy-8,10,16,'#7c9c98');box(c,xx-3,yy-5,6,10,color);stroke(c,xx,yy-8,xx,yy-15,color,1);}
        gem(c,x,y-55-q*45,6,'#ecf6cd');
      }else if(motif==='resonance'){
        c.strokeStyle=color;c.lineWidth=2;for(let i=0;i<4;i++){const xx=x+(i-1.5)*q*50;c.globalAlpha=alpha*(.6-i*.09);c.beginPath();c.ellipse(xx,y-47-q*12,18*(1-q*.5),32*(1-q*.5),0,0,TAU);c.stroke();stroke(c,xx-7,y-47-q*12,xx+7,y-47-q*12,color,1);}
      }else if(motif==='origami'){
        for(let i=0;i<10;i++){const angle=i*TAU/10,xx=x+Math.cos(angle)*spread,yy=y-36+Math.sin(angle)*spread*.6+q*24;c.save();c.translate(xx,yy);c.rotate(angle+q);poly(c,[[-9,-4],[0,-13],[11,5],[0,2],[-5,10]],color);stroke(c,0,-10,0,2,'#8a9295',1);c.restore();}
      }
      c.restore();
    }
    spellEffect(c,e,p,still){
      const sourceX=val(e.fromX,e.x),sourceY=val(e.fromY,e.y),xx=val(e.targetX,val(e.x2,sourceX)),yy=val(e.targetY,val(e.y2,sourceY))-20;
      let x=sourceX,y=sourceY-20;
      // Only offensive emitters move to the new staff tip; support centers and hit endpoints stay exact.
      if(typeof window.DungeonCharacter?.draw==='function'&&!['heal','shield'].includes(e.spellType)&&
        (e.kind==='cast'||e.kind==='companion-cast'&&e.npcId==='lumina')){
        const companion=this.actorContext?.space?.companions?.find(actor=>actor.npcId==='lumina');
        const key=e.kind==='cast'?'player':'companion:'+String(companion?.id||'lumina'),pose=this.actorTracks.get(key)?.pose;
        const face=val(pose?.facingX,xx-sourceX)<-.05?-1:1;x+=face*35;y=sourceY-72;
      }
      const alpha=clamp(val(e.life,1)/Math.max(.001,val(e.maxLife,1)),0,1),progress=still?.55:1-alpha,type=e.spellType||'attack',word=String(e.spellWord||'').toLowerCase(),echo=e.kind==='companion-cast';
      if(alpha<=0)return;
      // Shapes, not just colours, distinguish spells on a small mobile canvas.
      // All geometry is deterministic and bounded; casting adds no persistent particles.
      const element=['heal','shield','signature'].includes(type)?type:e.kind==='chain'?'thunder':
        ['fire','ice','thunder','wind'].includes(e.element)?e.element:
        /^(fire|spark|flame|blaze)$/.test(word)?'fire':/^(frost|ice|freeze|snow)$/.test(word)?'ice':
        /^(storm|thunder|lightning|bolt)$/.test(word)?'thunder':/^(wind|gust|gale|air)$/.test(word)?'wind':'rune';
      const color=({fire:'#ffba75',ice:'#a6ecff',thunder:'#ddd3ff',wind:'#b1f0d2',heal:'#99efbc',shield:'#a3d9ff',signature:'#ffdc91'})[element]||e.color||'#c9b1ff';
      const dx=xx-x,dy=yy-y,d=Math.max(1,Math.hypot(dx,dy)),ux=dx/d,uy=dy/d,nx=-uy,ny=ux;
      const point=(f,offset=0)=>[x+dx*f+nx*offset,y+dy*f+ny*offset];
      const directed=(cx,cy,points,fill)=>poly(c,points.map(([forward,side])=>[cx+ux*forward+nx*side,cy+uy*forward+ny*side]),fill);
      c.save();c.globalAlpha=alpha*.86;
      if(element==='heal'||element==='shield'){
        const supportX=echo?xx:x,supportY=echo?yy:y;
        c.globalAlpha=alpha*.3;c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.ellipse(supportX,supportY,26,34,0,0,TAU);c.stroke();c.globalAlpha=alpha*.9;
        if(element==='heal'){
          const flowerY=supportY-24-(still?0:progress*9);
          for(let i=0;i<5;i++){const angle=-Math.PI/2+i*TAU/5,px=supportX+Math.cos(angle)*10,py=flowerY+Math.sin(angle)*8;gem(c,px,py,6,color);}
          box(c,supportX-3,flowerY-3,6,6,'#fff1ac');
          for(let i=0;i<3;i++){
            const px=supportX+(i-1)*22,py=supportY+11-(still?0:progress*21)-(i%2)*9;
            box(c,px-2,py-7,4,14,color);box(c,px-7,py-2,14,4,color);
          }
          poly(c,[[supportX-9,supportY+20],[supportX-24,supportY+6],[supportX-24,supportY+18]],'#69b693');
          poly(c,[[supportX+9,supportY+20],[supportX+24,supportY+6],[supportX+24,supportY+18]],'#a2dfad');
        }else{
          const rx=24+progress*5,ry=31+progress*6,vertices=Array.from({length:6},(_,i)=>{const angle=-Math.PI/2+i*TAU/6;return[supportX+Math.cos(angle)*rx,supportY+Math.sin(angle)*ry];});
          c.globalAlpha=alpha*.07;poly(c,vertices,color);c.globalAlpha=alpha*.9;
          vertices.forEach(([px,py],i)=>{const next=vertices[(i+1)%6];stroke(c,px,py,next[0],next[1],color,3);box(c,px-2,py-2,4,4,'#e4f6ff');});
          c.globalAlpha=alpha*.6;
          poly(c,[[supportX-10,supportY-11],[supportX+10,supportY-11],[supportX+8,supportY+4],[supportX,supportY+12],[supportX-8,supportY+4]],'#6295ca');
          stroke(c,supportX,supportY-7,supportX,supportY+5,'#e1f3ff',2);stroke(c,supportX-5,supportY-2,supportX+5,supportY-2,'#e1f3ff',2);
          c.globalAlpha=alpha*.8;gem(c,supportX,supportY-43,6,color);
        }
      }else if(element==='fire'){
        // A pointed flame head, molten wake and three local flare tongues.
        c.globalAlpha=alpha*.24;stroke(c,x,y,xx,yy,'#b65e59',8);c.globalAlpha=alpha*.8;stroke(c,x,y,xx,yy,'#ffd3a0',2);
        const flight=still?.65:clamp(.18+progress*1.35,0,1),head=point(flight);
        directed(head[0],head[1],[[-18,-3],[-8,-9],[-11,-3],[8,-5],[17,0],[6,7],[-12,10],[-6,3]],color);
        directed(head[0],head[1],[[-8,-2],[8,-2],[13,0],[4,4],[-4,4]],'#fff2b7');
        for(let i=0;i<4;i++){const ember=point(clamp(flight-.09*(i+1),0,1),(i%2?1:-1)*(4+i));box(c,ember[0]-2,ember[1]-2,4,4,i%2?'#e9825f':'#ffda91');}
        c.globalAlpha=alpha*.76;for(let i=-1;i<=1;i++){const px=xx+i*13,base=yy+8-Math.abs(i)*4,height=15+(i===0?10:0)+progress*7;
          poly(c,[[px-6,base],[px-5,base-height*.55],[px,base-height],[px+2,base-height*.44],[px+6,base]],color);box(c,px-2,base-8,4,6,'#fff0bd');}
      }else if(element==='ice'){
        // Long spear crystals leave a thin trail; the impact makes a six-arm frost star.
        c.globalAlpha=alpha*.45;stroke(c,x,y,xx,yy,color,2);c.globalAlpha=alpha*.9;
        for(let i=0;i<3;i++){
          const f=still?(i+1)/4:clamp((i+1)/5+progress*.5,.08,.94),crystal=point(f,(i-1)*4);
          directed(crystal[0],crystal[1],[[-12,0],[-3,-5],[16,0],[-3,5]],color);
          directed(crystal[0],crystal[1],[[-3,0],[16,0],[-3,5]],'#5ca9ce');stroke(c,crystal[0]-ux*8,crystal[1]-uy*8,crystal[0]+ux*10,crystal[1]+uy*10,'#f0fcff',1);
        }
        const radius=24+progress*7;
        for(let i=0;i<6;i++){
          const angle=i*TAU/6,ax=Math.cos(angle),ay=Math.sin(angle);
          stroke(c,xx,yy,xx+ax*radius,yy+ay*radius,color,2);
          for(const side of [-1,1]){const branch=angle+side*Math.PI/3;stroke(c,xx+ax*radius*.6,yy+ay*radius*.6,xx+ax*radius*.6-Math.cos(branch)*8,yy+ay*radius*.6-Math.sin(branch)*8,color,2);}
        }
        gem(c,xx,yy,5,'#f0fcff');
      }else if(element==='thunder'){
        // One stable branched bolt; no repeated flashing or random flicker.
        const bolt=[[x,y]];for(let i=1;i<9;i++)bolt.push(point(i/9,(i%2?1:-1)*(8+progress*5)));bolt.push([xx,yy]);
        for(const [width,tone,opacity] of [[6,'#76639e',.44],[2,'#f3eaff',.95]]){
          c.globalAlpha=alpha*opacity;c.strokeStyle=tone;c.lineWidth=width;c.beginPath();bolt.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.stroke();
        }
        c.globalAlpha=alpha*.8;
        for(const i of [3,6]){const source=bolt[i],side=i%2?1:-1,end=point((i+.65)/9,side*24);stroke(c,source[0],source[1],end[0],end[1],color,2);stroke(c,end[0],end[1],end[0]+ux*12-nx*side*6,end[1]+uy*12-ny*side*6,color,2);}
        poly(c,[[xx-3,yy-23],[xx+6,yy-23],[xx+1,yy-4],[xx+10,yy-4],[xx-5,yy+20],[xx-2,yy+2],[xx-10,yy+2]],color);
        box(c,xx-2,yy-2,4,4,'#fff5e8');
      }else if(element==='wind'){
        // Offset flowing ribbons and open crescent blades distinguish air from lightning.
        c.strokeStyle=color;c.lineWidth=2;
        for(let i=-1;i<=1;i++){
          c.globalAlpha=alpha*(i===0?.7:.38);const offset=i*9;
          c.beginPath();c.moveTo(x+nx*offset,y+ny*offset);c.quadraticCurveTo(x+dx*.5+nx*(offset+18),y+dy*.5+ny*(offset+18),xx+nx*offset,yy+ny*offset);c.stroke();
        }
        c.globalAlpha=alpha*.88;c.lineWidth=3;
        for(let i=0;i<3;i++){const angle=-.7+i*2.05+(still?0:progress*.45),radius=19+i*7;c.beginPath();c.ellipse(xx,yy,radius,radius*.64,0,angle,angle+1.42);c.stroke();
          const tipX=xx+Math.cos(angle+1.42)*radius,tipY=yy+Math.sin(angle+1.42)*radius*.64;gem(c,tipX,tipY,3,'#e3ffde');}
        for(let i=0;i<3;i++){const leaf=point(still?(i+1)/4:(.15+progress*.5+i*.21)%1,(i%2?1:-1)*11);directed(leaf[0],leaf[1],[[-7,0],[0,-3],[7,0],[0,3]],i%2?'#75bcab':'#d1efb5');}
      }else if(element==='signature'){
        // A small eight-point star and orbiting rune seal make the ultimate legible
        // without filling the screen or painting over danger zones.
        c.globalAlpha=alpha*.4;stroke(c,x,y,xx,yy,color,5);c.globalAlpha=alpha*.9;stroke(c,x,y,xx,yy,'#fff0c0',2);
        for(let i=0;i<5;i++){const rune=point(still?(i+1)/6:(progress*.5+(i+1)/6)%1);gem(c,rune[0],rune[1],6,color);box(c,rune[0]-1,rune[1]-1,2,2,'#fff5d9');}
        const radius=31+progress*9,star=[];
        for(let i=0;i<16;i++){const angle=-Math.PI/2+i*TAU/16,r=i%2?9:radius;star.push([xx+Math.cos(angle)*r,yy+Math.sin(angle)*r*.8]);}
        c.globalAlpha=alpha*.24;poly(c,star,color);c.globalAlpha=alpha*.9;
        for(let i=0;i<8;i++){const angle=i*TAU/8,ax=Math.cos(angle),ay=Math.sin(angle);stroke(c,xx+ax*12,yy+ay*10,xx+ax*radius,yy+ay*radius*.8,color,2);}
        c.globalAlpha=alpha*.6;c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.ellipse(xx,yy,radius+5,(radius+5)*.8,0,0,TAU);c.stroke();
        for(let i=0;i<4;i++){const angle=i*TAU/4+Math.PI/4,px=xx+Math.cos(angle)*(radius+4),py=yy+Math.sin(angle)*(radius+4)*.8;gem(c,px,py,5,color);}
        c.globalAlpha=alpha*.95;gem(c,xx,yy,8,'#fff0c0');
      }else{
        c.globalAlpha=alpha*.45;stroke(c,x,y,xx,yy,color,2);c.globalAlpha=alpha*.85;
        for(let i=0;i<4;i++){
          const rune=point(still?(i+1)/5:(.15+progress*.6+i*.2)%1);gem(c,rune[0],rune[1],7,color);box(c,rune[0]-2,rune[1]-2,4,4,'#68567d');
        }
        const r=19+progress*6;c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.moveTo(xx,yy-r);c.lineTo(xx+r,yy);c.lineTo(xx,yy+r);c.lineTo(xx-r,yy);c.closePath();c.stroke();
        gem(c,xx,yy,5,'#e7d5ff');
      }
      if(!['heal','shield'].includes(element)){
        // Small chiselled impact rays reveal the hit's direction, with a fixed
        // footprint in reduced motion and no persistent emitters or full flashes.
        c.globalAlpha=alpha*.55;
        const impact=still?29:22+progress*14;
        for(let i=0;i<4;i++){
          const angle=Math.PI/4+i*TAU/4,ax=Math.cos(angle),ay=Math.sin(angle);
          stroke(c,xx+ax*impact,yy+ay*impact*.65,xx+ax*(impact+5),yy+ay*(impact+5)*.65,color,1);
        }
      }
      if(echo){
        c.globalAlpha=alpha*.65;c.setLineDash([3,5]);stroke(c,x+nx*7,y+ny*7,xx+nx*7,yy+ny*7,'#e9dfff',1);c.setLineDash([]);
        const label=e.npcId==='lumina'?'星誓':e.npcId==='lantern'?'護持':e.npcId==='sentinel'?'援擊':'回聲';
        c.font='bold 12px sans-serif';c.textAlign='center';c.fillStyle=color;c.fillText(label,x,y-35-(still?0:progress*12));
      }
      c.restore();
    }
    effect(c,e,p,t,still){
      const x=val(e.x),y=val(e.y),life=val(e.life,1),max=val(e.maxLife,1),alpha=clamp(life/Math.max(.001,max),0,1),color=e.color||p.light,progress=1-alpha,r=val(e.r,22);
      if(life<=0)return;c.save();
      if(e.kind==='cast'||e.kind==='companion-cast'||e.kind==='chain'){
        this.spellEffect(c,e,p,still);
      }else if(String(e.kind).indexOf('school-')===0){
        // Directional calligraphy and layered impact rings preserve the hazard silhouettes.
        const ring=val(e.r,30),charged=!!e.charged;
        if(Number.isFinite(e.fromX)&&Number.isFinite(e.fromY)){
          c.globalAlpha=alpha*.25;stroke(c,e.fromX,e.fromY,x,y,color,charged?7:3);
          c.globalAlpha=alpha*.8;stroke(c,e.fromX,e.fromY,x,y,'#fff4e2',1.3);
        }
        c.globalAlpha=alpha*.75;c.strokeStyle=color;c.lineWidth=charged?3:2;
        for(let i=0;i<2;i++){const size=ring*(.44+progress*.72)+i*12;c.beginPath();c.ellipse(x,y-9,size,size*.57,0,0,TAU);c.stroke();}
        for(let i=0;i<(charged?12:7);i++){
          const angle=i*TAU/(charged?12:7)+(!still?progress*.5:0),len=ring*(.58+progress*.4),px=x+Math.cos(angle)*len,py=y-9+Math.sin(angle)*len*.58;
          gem(c,px,py,charged?4:2,i%3===0?'#ffeed4':color);
        }
        if(e.text){c.globalAlpha=alpha;c.textAlign='center';c.font='bold 13px sans-serif';c.fillStyle=color;c.fillText(String(e.text),x,y-55-progress*15);}
      }else if(e.kind==='boss-intro'||e.kind==='phase'){
        const intro=e.kind==='boss-intro',label=String(e.name||e.text||(intro?'封印之主降臨':'第二階段 · 解放'));
        c.globalAlpha=Math.min(1,alpha*3);box(c,255,65,450,49,'#171b2b');box(c,255,65,450,2,color);box(c,255,112,450,2,color);
        c.font='bold 19px sans-serif';c.textAlign='center';c.fillStyle=color;c.fillText(label.length>21?label.slice(0,20)+'…':label,480,97);
        c.globalAlpha=alpha*.38;[43,917].forEach(xx=>{for(let i=0;i<6;i++)gem(c,xx,95+i*65,5,color);});
      }else if(e.kind==='companion-shield'||e.kind==='shield'||e.kind==='heal'){
        this.spellEffect(c,{...e,kind:'cast',spellType:e.kind==='heal'?'heal':'shield',x2:x,y2:y},p,still);
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
      if(this.flash>0&&/hurt|damage/.test(this.flashKind)){
        // Keep hit feedback at the frame edge; no full-screen flash obscures attacks.
        c.save();c.globalAlpha=this.flash*(still?.13:.24);c.strokeStyle='#ffa49d';c.lineWidth=4;c.strokeRect(27,56,906,447);c.restore();
      }
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
