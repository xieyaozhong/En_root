/* Original, dependency-free pixel art for the Wordbound dungeon. */
(() => {
  'use strict';

  const W = 768, H = 384;
  const PALETTES = [
    { void:'#0b0e20', wall:'#171c35', stone:'#242a46', edge:'#303855', floor:'#222841', line:'#151a2d', light:'#9d93ff', glow:'#8762ec', trim:'#505272', accent:'#d1b884', name:'library' },
    { void:'#08191c', wall:'#102e30', stone:'#214244', edge:'#305658', floor:'#193e3e', line:'#0e2b2e', light:'#b5e8cb', glow:'#54d3b1', trim:'#396360', accent:'#bcae77', name:'forest' },
    { void:'#160c22', wall:'#281732', stone:'#392242', edge:'#53304f', floor:'#302138', line:'#1d1226', light:'#ffb6b0', glow:'#f17c91', trim:'#724059', accent:'#d4a074', name:'obsidian' }
  ];
  const HERO = [
    '...............a............',
    '..............aaa...........',
    '.............abbba..........',
    '............abbbba..........',
    '...........abcccbba.........',
    '..........abcccccbba........',
    '.........abcccccccbba.......',
    '........abccddccccbba.......',
    '.......abccccccccccbba......',
    '......abccccccccccccbba.....',
    '.....aaaaaaaaaaaaaaaaaaa....',
    '....affffffffffffffffffa....',
    '.....aaaaaeeeeeeaaaaaaa.....',
    '........ageggega............',
    '........aggghgga............',
    '.........agggga.............',
    '.........aeeea..............',
    '.......aaiijjiaa............',
    '......aiiijjiiia............',
    '.....aiiiiijiiiia...........',
    '....aiiiiiijiiiiia..........',
    '...aiikiiiijiiikiiag........',
    '...aiikkkiijikkkiia.........',
    '....aillliijilllia..........',
    '....aillllijllllia..........',
    '.....ailllijlllia...........',
    '.....ailllljlllia...........',
    '....ailllllillllia..........',
    '...aillllllilllllia.........',
    '..aaaaaaaaaaaaaaaaaa........',
    '......ammm...mmma...........',
    '.....ammmm...mmmma..........'
  ];
  const HERO_COLORS = {a:'#161627',b:'#55416d',c:'#8e79b5',d:'#b1a1da',e:'#242038',f:'#bca1e3',g:'#e8b889',h:'#ba815f',i:'#5e5396',j:'#d3b07a',k:'#ad96cc',l:'#403c6b',m:'#242035'};

  function seed(n) { let x = n | 0; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; }
  function rect(c,x,y,w,h,color) { c.fillStyle=color; c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }
  function line(c,x,y,x2,y2,color,width=2) { c.strokeStyle=color; c.lineWidth=width; c.beginPath();c.moveTo(Math.round(x),Math.round(y));c.lineTo(Math.round(x2),Math.round(y2));c.stroke(); }
  function sprite(c, rows, colors, x, y, scale=3) { rows.forEach((row,j)=>{for(let i=0;i<row.length;i++){if(colors[row[i]]) rect(c,x+i*scale,y+j*scale,scale,scale,colors[row[i]]);}}); }
  function disk(c,x,y,r,color) { c.fillStyle=color; for(let dy=-r;dy<r;dy+=2){const dx=Math.floor(Math.sqrt(Math.max(0,r*r-dy*dy))/2)*2;c.fillRect(x-dx,y+dy,dx*2,2);} }
  function glow(c,x,y,r,color,alpha=.13) { for(let i=3;i>0;i--){c.globalAlpha=alpha/i;disk(c,x,y,r*i/2,color);}c.globalAlpha=1; }
  function diamond(c,x,y,s,color){c.fillStyle=color;c.beginPath();c.moveTo(x,y-s);c.lineTo(x+s*.6,y);c.lineTo(x,y+s);c.lineTo(x-s*.6,y);c.closePath();c.fill();}

  class DungeonRenderer {
    constructor(canvas) {
      if (!canvas || !canvas.getContext) throw new Error('DungeonRenderer requires a canvas');
      this.canvas=canvas; this.ctx=canvas.getContext('2d',{alpha:false});
      this.canvas.width=W;this.canvas.height=H;this.ctx.imageSmoothingEnabled=false;
      this.canvas.style.imageRendering='pixelated';
      this.backgrounds=PALETTES.map((p,i)=>this.buildBackground(p,i));
      this.particles=[];this.lastTime=0;this.now=0;this.flash=0;this.burstKind='';
      this.random=seed(27183);this.lastScene={};
    }
    resize(){this.ctx.imageSmoothingEnabled=false;}
    buildBackground(p, region) {
      const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
      const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;const rnd=seed(27384+region*781);
      rect(c,0,0,W,H,p.void);
      // The room is made from individually weathered masonry blocks.
      for(let row=0;row<8;row++)for(let col=-1;col<15;col++){
        const x=col*58+(row%2)*29,y=row*27;
        rect(c,x+1,y+1,56,25,p.wall);rect(c,x+2,y+1,53,2,p.stone);
        if(rnd()>.58)rect(c,x+8+rnd()*29,y+8,8+rnd()*14,2,p.stone);
        if(rnd()>.79){rect(c,x+43,y+3,2,11,p.void);rect(c,x+40,y+12,4,2,p.void);}
      }
      // Recessed moonlit windows and stone pillars.
      [86,384,682].forEach((x,i)=>this.window(c,x,40,i===1?70:48,i===1?114:94,p,region));
      [20,254,504,736].forEach(x=>{
        rect(c,x,15,17,182,p.void);rect(c,x+2,21,13,165,p.stone);rect(c,x+5,21,3,165,p.edge);
        rect(c,x-4,15,25,9,p.trim);rect(c,x-2,26,21,6,p.stone);
        rect(c,x-4,182,25,10,p.edge);rect(c,x-8,192,33,10,p.stone);
        for(let y=43;y<180;y+=28)rect(c,x+1,y,16,2,p.void);
      });
      rect(c,0,192,W,12,p.stone);rect(c,0,194,W,2,p.edge);rect(c,0,203,W,5,p.void);
      // A large perspective floor with deliberately sparse wear.
      rect(c,0,208,W,176,p.floor);
      const rows=[208,225,246,273,308,351,395];
      rows.forEach((y,i)=>{
        rect(c,0,y,W,2,p.line);
        const size=64+i*13,offset=i%2?size*.5:0;
        for(let x=-size;x<W+size;x+=size){
          const sx=x+offset;
          line(c,sx,y,sx+(sx-W/2)*.045,rows[i+1]||H,p.line,2);
          if(rnd()>.32)rect(c,sx+8,y+4,20+rnd()*20,2,p.stone);
          if(rnd()>.86){rect(c,sx+18,y+9,2,7,p.line);rect(c,sx+20,y+15,8,2,p.line);}
        }
      });
      // Faded spell-circle fragments inlaid in the stones.
      c.globalAlpha=.3;c.strokeStyle=p.trim;c.lineWidth=2;
      c.beginPath();c.ellipse(387,280,208,54,0,0,Math.PI*2);c.stroke();
      c.beginPath();c.ellipse(387,280,199,49,0,0,Math.PI*2);c.stroke();
      for(let i=0;i<16;i++){const a=i/16*Math.PI*2;rect(c,387+Math.cos(a)*205,280+Math.sin(a)*52,4,3,p.accent);}
      c.globalAlpha=1;
      if(region===0){
        this.shelf(c,120,67,82,121,p,rnd);this.shelf(c,564,67,81,121,p,rnd);
        this.bookPile(c,59,251,p);this.bookPile(c,685,284,p);
        rect(c,291,26,20,77,'#3a2b4e');rect(c,294,28,14,71,'#584064');diamond(c,301,52,9,p.accent);
        rect(c,460,26,20,77,'#3a2b4e');rect(c,463,28,14,71,'#584064');diamond(c,470,52,9,p.accent);
      }else if(region===1){
        [5,241,510,740].forEach((x,i)=>this.vine(c,x,20+i*7,185,p,rnd));
        for(let i=0;i<32;i++){const x=rnd()*W,y=218+rnd()*160;rect(c,x,y,5,2,'#35684e');rect(c,x+2,y-4,2,5,'#3d7156');}
        this.mushrooms(c,56,273,1);this.mushrooms(c,683,250,1);this.mushrooms(c,308,347,.75);
        rect(c,123,169,81,24,'#142d2b');rect(c,126,173,74,13,'#2a4b3c');
        this.vine(c,136,68,113,p,rnd);this.vine(c,620,49,145,p,rnd);
      }else{
        [49,229,525,698].forEach((x,i)=>this.crystal(c,x,199+i%2*79,18+i%3*5,p,true));
        const paths=[[11,316,139,273],[654,324,751,347],[288,372,340,343]];
        paths.forEach(([x,y,xx,yy])=>{line(c,x,y,xx,yy,'#682e51',5);line(c,x,y,xx,yy,'#c06377',2);});
        [141,604].forEach(x=>{rect(c,x,89,21,103,'#241527');rect(c,x-4,85,29,10,'#59304c');diamond(c,x+10,63,23,'#754556');diamond(c,x+7,57,16,'#b47886');});
      }
      this.crystal(c,34,315,17,p);this.crystal(c,725,326,22,p);
      // Foreground framing creates depth without covering the action.
      rect(c,0,362,W,22,p.void);rect(c,0,362,W,3,p.stone);
      for(let x=0;x<W;x+=42){rect(c,x+1,366,40,18,p.wall);rect(c,x+3,366,34,2,p.stone);}
      rect(c,0,0,W,11,'#090c17');rect(c,0,11,W,2,p.trim);
      rect(c,0,0,9,H,'#090c17');rect(c,W-9,0,9,H,'#090c17');
      return canvas;
    }
    window(c,x,y,w,h,p,region){
      rect(c,x-w/2-6,y+16,w+12,h-10,p.void);rect(c,x-w/2,y+7,w,h,p.stone);
      rect(c,x-w/2+5,y,w-10,h,p.stone);rect(c,x-w/2+9,y+5,w-18,h-9,p.void);
      rect(c,x-w/2+5,y+20,w-10,h-20,p.void);
      const sky=region===1?'#254858':region===2?'#352445':'#292d56';rect(c,x-w/2+7,y+23,w-14,h-27,sky);
      rect(c,x-w/2+11,y+10,w-22,h-15,sky);
      disk(c,x+6,y+33,region===2?11:15,p.light);disk(c,x+11,y+28,region===2?9:13,sky);
      rect(c,x-15,y+24,2,2,p.light);rect(c,x+14,y+56,2,2,p.light);rect(c,x-6,y+66,2,2,p.light);
      rect(c,x-2,y+9,4,h-13,p.wall);rect(c,x-w/2+6,y+60,w-12,4,p.wall);
      rect(c,x-w/2-7,y+h,w+14,7,p.edge);rect(c,x-w/2-3,y+h+7,w+6,3,p.stone);
      c.globalAlpha=.07;c.fillStyle=p.light;c.beginPath();c.moveTo(x-w/2,y+h+10);c.lineTo(x+w/2,y+h+10);c.lineTo(x+w+38,292);c.lineTo(x-9,292);c.closePath();c.fill();c.globalAlpha=1;
    }
    shelf(c,x,y,w,h,p,rnd){
      rect(c,x-4,y-3,w+8,h+6,'#101322');rect(c,x,y,w,h,'#352936');
      rect(c,x+5,y+5,w-10,h-9,'#1b1b2d');
      for(let sy=y+9;sy<y+h-10;sy+=33){
        let bx=x+8;while(bx<x+w-8){const bw=4+Math.floor(rnd()*5),bh=15+Math.floor(rnd()*9);const colors=['#666386','#7f5364','#938069','#4b6c70','#807393'];rect(c,bx,sy+24-bh,bw,bh,colors[Math.floor(rnd()*colors.length)]);rect(c,bx+1,sy+24-bh+3,bw-2,2,'#bca485');bx+=bw+2;}
        rect(c,x+3,sy+25,w-6,5,'#66505a');rect(c,x+3,sy+25,w-6,1,'#94737b');
      }
      rect(c,x,y,4,h,'#72525d');rect(c,x+w-4,y,4,h,'#72525d');rect(c,x-5,y-5,w+10,7,'#72525d');
    }
    bookPile(c,x,y){rect(c,x,y,30,7,'#796078');rect(c,x+3,y-5,29,5,'#b3a089');rect(c,x+1,y-8,32,3,'#6c587d');rect(c,x+8,y-14,23,6,'#716b82');rect(c,x+9,y-13,18,3,'#c0ad91');}
    vine(c,x,y,h,p,rnd){
      let px=x;for(let yy=y;yy<y+h;yy+=9){const nx=px+Math.round((rnd()-.5)*13);line(c,px,yy,nx,yy+9,'#364d38',3);if(rnd()>.25){rect(c,nx-5,yy+3,8,4,'#386347');rect(c,nx+3,yy+7,6,3,'#507950');}px=nx;}
    }
    mushrooms(c,x,y,s){[[0,0,9],[16,-6,12],[-13,4,6]].forEach(([dx,dy,r])=>{rect(c,x+dx*s-2,y+dy*s,4*s,12*s,'#c1b892');disk(c,x+dx*s,y+dy*s,r*s,'#5e9488');rect(c,x+(dx-3)*s,y+(dy-4)*s,3*s,3*s,'#c0dbb1');});}
    crystal(c,x,y,size,p,dark){
      rect(c,x-size,y+3,size*2,5,p.void);
      [[0,0,1],[-10,4,.55],[11,5,.7]].forEach(([dx,dy,s])=>{diamond(c,x+dx,y-size*s+dy,size*s,dark?'#844662':p.glow);c.globalAlpha=.55;diamond(c,x+dx-2,y-size*s+dy-2,size*s*.55,p.light);c.globalAlpha=1;});
    }
    burst(kind='cast', x, y){
      this.burstKind=kind;this.flash=1;
      const hurt=/hurt|damage|hit-player/.test(kind),heal=/heal|potion/.test(kind),gold=/loot|gold|reward|victory/.test(kind),shield=/shield|guard|barrier/.test(kind);
      const cx=x==null?(hurt||heal||shield?195:570):x,cy=y==null?228:y;
      const color=heal?'#91eac0':gold?'#f7d88a':hurt?'#fc989f':shield?'#9cdbff':'#c6b0ff';
      for(let i=0;i<(gold?46:32);i++){const a=this.random()*Math.PI*2,s=20+this.random()*85;this.particles.push({x:cx,y:cy,vx:Math.cos(a)*s,vy:Math.sin(a)*s-25,life:.6+this.random()*.5,max:1.1,size:this.random()>.7?4:2,color});}
      if(this.particles.length>180)this.particles=this.particles.slice(-180);
    }
    draw(scene={}, time=0){
      if(!Number.isFinite(time))time=0;
      const c=this.ctx,region=Math.max(0,Math.min(2,Number(scene.region)||0)),p=PALETTES[region];
      const still=!!scene.reducedMotion||!!scene.paused;
      const dt=this.lastTime?Math.min(.05,Math.max(0,(time-this.lastTime)/1000)):0;this.lastTime=time;this.lastScene=scene;
      if(!still)this.now+=dt;const t=this.now;
      c.globalAlpha=1;c.clearRect(0,0,W,H);c.drawImage(this.backgrounds[region],0,0);
      this.portal(c,385,171,p,t,scene.mode==='lobby');
      this.torch(c,222,105,t,p,still);this.torch(c,539,105,t+.9,p,still);
      // Tiny motes are intentionally sparse so the spell interface stays legible.
      for(let i=0;i<18;i++){const x=(i*113.7+Math.sin(t*.15+i)*17)%W,y=34+(i*53.7-t*(3+i%3))%244;c.globalAlpha=.2+.28*Math.sin(t+i)**2;rect(c,x,y,2,2,i%3===0?'#dec98c':p.light);}c.globalAlpha=1;
      const heroY=scene.mode==='lobby'?259:266;
      this.shadow(c,187,heroY+11,48,p);
      this.hero(c,147,heroY-96,t,scene.player,still);
      if(scene.enemy&&scene.mode!=='lobby'){
        const enemy=scene.enemy, boss=!!enemy.boss||enemy.kind==='boss';
        this.shadow(c,572,280,boss?76:43,p);
        this.enemy(c,572,274,enemy,t,p,still,region);
      }else{
        this.chest(c,575,259,t,p);
        this.rune(c,579,203,18,p.light,t);
      }
      // A familiar accompanies the mage through every biome.
      const fy=211+(still?0:Math.sin(t*2.1)*5);glow(c,114,fy,10,p.light,.1);disk(c,114,fy,5,'#e5dfff');rect(c,109,fy+4,3,4,p.light);rect(c,117,fy+4,3,4,p.light);rect(c,111,fy-1,2,2,p.void);rect(c,116,fy-1,2,2,p.void);
      if(this.flash>0){
        if(/cast|fire|ice|lightning|spell|hit|attack|signature|ultimate/.test(this.burstKind))this.spell(c,p,this.flash,t);
        if(/shield|guard|barrier/.test(this.burstKind)){
          c.globalAlpha=this.flash*.65;c.strokeStyle='#a8dcff';c.lineWidth=3;c.beginPath();c.ellipse(188,224,46,60,0,0,Math.PI*2);c.stroke();c.globalAlpha=1;glow(c,188,224,38,'#84bdff',this.flash*.07);
        }
        if(!scene.paused)this.flash=Math.max(0,this.flash-dt*2.8);
      }
      for(let i=this.particles.length-1;i>=0;i--){const a=this.particles[i];if(!still){a.x+=a.vx*dt;a.y+=a.vy*dt;a.vy+=54*dt;}if(!scene.paused)a.life-=dt;if(a.life<=0){this.particles.splice(i,1);continue;}c.globalAlpha=Math.min(1,a.life*2);rect(c,a.x,a.y,a.size,a.size,a.color);}c.globalAlpha=1;
      // Pixel vignette / foreground silhouette.
      c.globalAlpha=.2;rect(c,9,13,10,349,'#080a15');rect(c,749,13,10,349,'#080a15');rect(c,9,352,750,10,'#080a15');c.globalAlpha=1;
    }
    shadow(c,x,y,w,p){c.fillStyle='#0a1020';c.globalAlpha=.5;c.beginPath();c.ellipse(x,y,w,9,0,0,Math.PI*2);c.fill();c.globalAlpha=1;}
    portal(c,x,y,p,t,lobby){
      glow(c,x,y-17,46,p.glow,.09);
      // Stepped stone arch, behind the combat plane.
      const yy=y-77;
      rect(c,x-46,yy+29,12,82,'#101424');rect(c,x+34,yy+29,12,82,'#101424');
      rect(c,x-39,yy+14,14,23,p.stone);rect(c,x+25,yy+14,14,23,p.stone);
      rect(c,x-28,yy+3,56,14,p.stone);rect(c,x-16,yy-3,32,8,p.edge);
      rect(c,x-42,yy+29,7,77,p.trim);rect(c,x+35,yy+29,7,77,p.trim);
      rect(c,x-32,yy+18,64,90,'#151526');rect(c,x-24,yy+10,48,100,'#151526');
      c.globalAlpha=lobby?.4:.22;
      for(let i=0;i<6;i++){const inset=i*5;rect(c,x-30+inset,yy+22+inset,60-inset*2,80-inset*2,i%2?p.light:p.glow);}c.globalAlpha=1;
      for(let i=0;i<8;i++){const a=i*.79+t*.3,rx=x+Math.cos(a)*25,ry=yy+62+Math.sin(a)*35;c.globalAlpha=.3+.35*Math.sin(t+i)**2;rect(c,rx,ry,3,3,p.light);}c.globalAlpha=1;
      rect(c,x-50,y+32,100,6,p.edge);rect(c,x-56,y+38,112,6,p.stone);
      this.rune(c,x,yy-20,8,p.accent,t*.6);
    }
    torch(c,x,y,t,p,still){
      glow(c,x,y-9,26,'#ffba70',.07);rect(c,x-2,y,5,23,'#35273b');rect(c,x-7,y+15,16,4,p.trim);rect(c,x-5,y-1,12,5,'#8c6251');
      const f=still?0:Math.floor(t*9)%3;rect(c,x-4,y-13,9,13,'#d17c62');rect(c,x-2,y-19-f*2,6,18,'#edb377');rect(c,x,y-15+f,3,12,'#ffe3a0');rect(c,x-4,y-9,3,7,'#f7cb88');
      for(let i=0;i<3;i++){const phase=(t*14+i*13)%31;c.globalAlpha=1-phase/35;rect(c,x-5+Math.sin(t+i*4)*8,y-20-phase,2,2,'#ffd5a0');}c.globalAlpha=1;
    }
    hero(c,x,y,t,player,still){
      const bob=still?0:Math.round(Math.sin(t*2)*1.5),dy=y+bob;
      // Staff has its own silhouette rather than merging into the robe.
      rect(c,x+72,dy+37,4,64,'#302432');rect(c,x+73,dy+39,2,60,'#b38966');
      rect(c,x+68,dy+34,12,4,'#b39a74');rect(c,x+67,dy+21,4,15,'#b39a74');rect(c,x+78,dy+21,4,15,'#b39a74');
      glow(c,x+74,dy+23,10,'#b5a3ff',.17);diamond(c,x+74,dy+22,9,'#8470cc');diamond(c,x+73,dy+19,5,'#ddd5ff');
      sprite(c,HERO,HERO_COLORS,x-9,dy,3);
      rect(c,x+69,dy+65,6,5,'#e8b889');
      if(player&&Number(player.hp)<=Number(player.maxHp)*.3){c.globalAlpha=.18+.1*Math.sin(t*4);disk(c,x+38,dy+58,22,'#f86d87');c.globalAlpha=1;}
    }
    enemy(c,x,y,e,t,p,still,region){
      const tag=String(e.id||e.kind||e.name||'').toLowerCase();const bob=still?0:Math.round(Math.sin(t*2.3)*3);
      if(e.boss||e.kind==='boss'){
        if(/thorn|root|tree|forest|wood|樹|森/.test(tag))this.treeBoss(c,x,y,t,p,bob);
        else if(/witch|lich|巫/.test(tag))this.lichBoss(c,x,y,t,p,bob);
        else if(/king|dragon|void|abyss|龍|虛空/.test(tag))this.dragonBoss(c,x,y,t,p,bob);
        else if(region===1)this.treeBoss(c,x,y,t,p,bob);
        else if(region===2)this.dragonBoss(c,x,y,t,p,bob);
        else this.lichBoss(c,x,y,t,p,bob);
        return;
      }
      if(/eye|眼/.test(tag))this.eye(c,x,y-15+bob,t,p);
      else if(/mushroom|菇/.test(tag))this.mushroomEnemy(c,x,y+bob,p);
      else if(/bat|moth|raven|wisp|ghost|shade|蝠|蛾|鴉|幽|魂/.test(tag))this.ghost(c,x,y-14+bob,t,p,tag);
      else if(/knight|guard|golem|armor|騎|守|像/.test(tag))this.knight(c,x,y+bob,p);
      else if(/spider|蛛/.test(tag))this.spider(c,x,y+bob,p,t);
      else if(/skull|skeleton|bone|骷|骨/.test(tag))this.skeleton(c,x,y+bob,p);
      else this.slime(c,x,y+bob,p,t,region);
    }
    slime(c,x,y,p,t,region){
      const body=region===1?'#4c9f80':region===2?'#a35c87':'#7771a9',lite=region===1?'#88d3ac':region===2?'#e491ad':'#b1a2dc';
      rect(c,x-27,y-29,54,27,'#19192e');rect(c,x-23,y-42,45,39,'#19192e');rect(c,x-14,y-48,27,11,'#19192e');
      rect(c,x-25,y-25,50,20,body);rect(c,x-21,y-38,41,30,body);rect(c,x-12,y-44,25,10,body);
      rect(c,x-17,y-36,8,7,lite);rect(c,x-11,y-41,14,5,lite);rect(c,x-18,y-14,37,6,'#57516f');
      rect(c,x-12,y-25,6,9,'#19192e');rect(c,x+10,y-25,6,9,'#19192e');rect(c,x-11,y-24,2,3,'#f8ebd7');rect(c,x+11,y-24,2,3,'#f8ebd7');rect(c,x-1,y-13,7,3,'#332941');
      rect(c,x-31,y-4,20,4,body);rect(c,x+15,y-5,18,5,body);
      if(region===1){rect(c,x-1,y-54,3,10,'#6db788');rect(c,x-7,y-56,8,4,'#a1c77e');}
    }
    ghost(c,x,y,t,p,tag){
      const bat=/bat|moth|raven|蝠|蛾|鴉/.test(tag),raven=/raven|鴉/.test(tag);const flap=Math.round(Math.sin(t*6)*6);
      if(bat){[1,-1].forEach(s=>{rect(c,x+s*18-(s<0?31:0),y-46+flap,35,12,'#504568');rect(c,x+s*25-(s<0?25:0),y-38+flap,27,13,'#77618d');rect(c,x+s*30-(s<0?15:0),y-29+flap,16,8,'#504568');});}
      glow(c,x,y-35,22,p.glow,.12);disk(c,x,y-37,23,'#40395d');disk(c,x,y-37,18,raven?'#69647e':'#a69bcf');rect(c,x-19,y-29,38,18,raven?'#49435d':'#8276ae');
      for(let i=0;i<5;i++)rect(c,x-18+i*8,y-13,6,5+(i%2)*5,raven?'#49435d':'#8276ae');
      rect(c,x-11,y-40,7,8,'#27203d');rect(c,x+5,y-40,7,8,'#27203d');rect(c,x-9,y-39,3,3,'#e3c8e4');rect(c,x+7,y-39,3,3,'#e3c8e4');rect(c,x-3,y-25,6,5,'#4e3d62');
      if(raven){rect(c,x-28,y-34,15,6,'#cab391');rect(c,x-33,y-31,11,3,'#cab391');rect(c,x-11,y-59,6,8,'#69647e');}
    }
    eye(c,x,y,t,p){
      glow(c,x,y-36,24,p.glow,.11);disk(c,x,y-37,27,'#463b5d');disk(c,x,y-37,22,'#bda8c5');disk(c,x-2,y-37,16,'#e9ccd0');disk(c,x-7,y-37,11,'#9971ad');disk(c,x-10,y-37,6,'#30233f');rect(c,x-13,y-43,4,4,'#fff1e5');
      for(let i=0;i<4;i++){const tx=x-18+i*12,dy=Math.sin(t*3+i)*4;line(c,tx,y-15,tx+dy,y-1,'#84648e',3);line(c,tx+dy,y-1,tx-5+dy,y+4,'#b891b3',2);}
    }
    mushroomEnemy(c,x,y,p){
      rect(c,x-15,y-36,31,32,'#6c6970');rect(c,x-12,y-34,25,26,'#bcb399');rect(c,x-9,y-32,18,21,'#ded0aa');rect(c,x-17,y-5,14,5,'#a49b85');rect(c,x+5,y-5,14,5,'#a49b85');
      rect(c,x-32,y-43,65,13,'#2a393b');rect(c,x-26,y-54,53,15,'#355d56');rect(c,x-17,y-62,34,19,'#56897a');rect(c,x-6,y-66,13,5,'#56897a');rect(c,x-29,y-42,59,8,'#8fc1a5');
      rect(c,x-19,y-53,9,6,'#d4d9b1');rect(c,x+8,y-55,10,6,'#d4d9b1');rect(c,x-4,y-62,6,5,'#d4d9b1');rect(c,x-8,y-22,4,5,'#33423c');rect(c,x+6,y-22,4,5,'#33423c');rect(c,x-1,y-13,4,2,'#756851');
    }
    knight(c,x,y,p){
      rect(c,x-20,y-80,39,29,'#171929');rect(c,x-16,y-77,31,29,'#7b8199');rect(c,x-10,y-82,20,4,'#adb0bd');rect(c,x-16,y-63,31,7,'#303047');rect(c,x-12,y-61,8,3,p.light);rect(c,x+4,y-61,8,3,p.light);
      rect(c,x-23,y-48,47,39,'#25263c');rect(c,x-18,y-48,38,31,'#69718b');rect(c,x-13,y-44,25,4,'#a3a7b8');rect(c,x-4,y-48,7,36,'#9297ad');
      rect(c,x-31,y-49,16,21,'#6e7189');rect(c,x+19,y-49,15,17,'#8c8ca0');rect(c,x-18,y-11,12,13,'#46475e');rect(c,x+8,y-11,12,13,'#46475e');
      rect(c,x-39,y-43,17,34,'#343752');rect(c,x-37,y-41,13,28,'#9992a6');rect(c,x-33,y-38,4,19,p.accent);
      rect(c,x+31,y-65,5,58,'#c4b6b9');rect(c,x+24,y-20,19,4,'#ab8b75');rect(c,x+32,y-16,4,13,'#63516a');
    }
    skeleton(c,x,y,p){
      rect(c,x-16,y-67,32,29,'#222235');rect(c,x-13,y-66,27,23,'#c1b8b0');rect(c,x-9,y-68,19,5,'#e3d5bd');rect(c,x-10,y-59,8,8,'#363049');rect(c,x+4,y-59,8,8,'#363049');rect(c,x-4,y-49,7,4,'#65536b');rect(c,x-9,y-42,21,5,'#a99794');
      rect(c,x-3,y-36,6,27,'#c4b5a6');for(let i=0;i<3;i++){rect(c,x-15,y-34+i*8,30,4,'#a79996');rect(c,x-17,y-32+i*8,4,5,'#c4b5a6');rect(c,x+13,y-32+i*8,4,5,'#c4b5a6');}
      line(c,x-14,y-35,x-23,y-16,'#c4b5a6',5);line(c,x+15,y-35,x+28,y-22,'#c4b5a6',5);line(c,x-5,y-9,x-12,y+3,'#c4b5a6',5);line(c,x+5,y-9,x+16,y+3,'#c4b5a6',5);
      rect(c,x+27,y-53,4,43,'#a49db7');rect(c,x+20,y-18,17,4,p.accent);
    }
    spider(c,x,y,p,t){
      for(let i=0;i<4;i++)for(const s of[-1,1]){const dy=Math.round(Math.sin(t*5+i)*2);line(c,x+s*10,y-13,x+s*(27+i*4),y-27+i*10+dy,'#625574',4);line(c,x+s*(27+i*4),y-27+i*10+dy,x+s*(40+i*3),y+2,'#897498',3);}
      disk(c,x,y-21,23,'#504259');disk(c,x,y-9,15,'#7f6684');rect(c,x-8,y-12,4,4,'#f0b2b3');rect(c,x+4,y-12,4,4,'#f0b2b3');rect(c,x-3,y-19,3,3,p.light);rect(c,x+3,y-19,3,3,p.light);
    }
    lichBoss(c,x,y,t,p,bob){
      y+=bob;
      glow(c,x,y-84,49,'#ac8dee',.09);
      // Broad torn mantle and spectral crown.
      c.fillStyle='#1a1830';c.beginPath();c.moveTo(x-26,y-93);c.lineTo(x-52,y-70);c.lineTo(x-67,y+2);c.lineTo(x-39,y-8);c.lineTo(x-19,y+9);c.lineTo(x,y-1);c.lineTo(x+24,y+7);c.lineTo(x+39,y-9);c.lineTo(x+64,y);c.lineTo(x+48,y-72);c.lineTo(x+27,y-94);c.fill();
      c.fillStyle='#54446f';c.beginPath();c.moveTo(x-26,y-84);c.lineTo(x-43,y-62);c.lineTo(x-48,y-9);c.lineTo(x-21,y-21);c.lineTo(x-16,y+1);c.lineTo(x+6,y-7);c.lineTo(x+31,y-8);c.lineTo(x+45,y-4);c.lineTo(x+39,y-60);c.lineTo(x+22,y-86);c.fill();
      rect(c,x-10,y-85,20,82,'#363151');rect(c,x-27,y-81,9,54,'#85709e');rect(c,x+20,y-81,9,54,'#85709e');rect(c,x-28,y-73,57,5,'#b69a83');diamond(c,x,y-60,11,'#b694dc');diamond(c,x,y-62,6,'#e0c9f9');
      rect(c,x-20,y-115,39,33,'#24213a');rect(c,x-15,y-114,31,29,'#d0c6ca');rect(c,x-9,y-117,19,5,'#eee0ca');rect(c,x-13,y-105,10,9,'#49405e');rect(c,x+4,y-105,10,9,'#49405e');rect(c,x-10,y-103,6,3,'#c5a4ff');rect(c,x+5,y-103,6,3,'#c5a4ff');rect(c,x-2,y-94,5,4,'#6a5b75');rect(c,x-9,y-87,19,5,'#a08f9f');
      rect(c,x-24,y-127,48,8,'#b19891');rect(c,x-26,y-140,7,21,'#ccb2a2');rect(c,x-10,y-136,6,17,'#ccb2a2');rect(c,x+4,y-136,6,17,'#ccb2a2');rect(c,x+19,y-140,7,21,'#ccb2a2');diamond(c,x,y-123,5,'#a697d5');
      rect(c,x-71,y-108,5,112,'#9a827a');rect(c,x-77,y-100,18,4,'#baa197');diamond(c,x-69,y-119,18,'#5d497f');diamond(c,x-70,y-122,10,'#cdb8f3');glow(c,x-69,y-119,18,p.light,.13);
      rect(c,x-59,y-59,18,8,'#beadaf');rect(c,x+39,y-61,14,9,'#beadaf');
      for(let i=0;i<3;i++){const a=t*.8+i*2.1,rx=x+Math.cos(a)*76,ry=y-78+Math.sin(a)*25;this.rune(c,rx,ry,6,p.light,-a);}
    }
    treeBoss(c,x,y,t,p,bob){
      y+=bob*.5;
      [1,-1].forEach(s=>{line(c,x+s*20,y-68,x+s*50,y-93,'#443b3c',13);line(c,x+s*50,y-93,x+s*68,y-81,'#69554d',9);line(c,x+s*61,y-82,x+s*70,y-61,'#69554d',7);line(c,x+s*51,y-90,x+s*65,y-113,'#69554d',7);});
      rect(c,x-33,y-87,67,77,'#3b3036');rect(c,x-28,y-96,57,89,'#665248');rect(c,x-18,y-103,38,97,'#806449');rect(c,x-9,y-91,10,73,'#a28256');rect(c,x+19,y-86,8,60,'#4b4139');
      line(c,x-16,y-98,x-31,y-128,'#705b4b',10);line(c,x-31,y-128,x-50,y-139,'#705b4b',7);line(c,x-31,y-123,x-20,y-146,'#705b4b',6);line(c,x+14,y-101,x+31,y-136,'#705b4b',10);line(c,x+30,y-130,x+53,y-143,'#705b4b',6);line(c,x+31,y-127,x+31,y-153,'#705b4b',6);
      [[-38,-132,19],[37,-140,20],[-8,-110,18],[25,-97,15]].forEach(([xx,yy,s])=>{disk(c,x+xx,y+yy,s,'#31584a');disk(c,x+xx-4,y+yy-5,s*.7,'#528268');});
      rect(c,x-22,y-73,16,9,'#283a34');rect(c,x+7,y-73,16,9,'#283a34');rect(c,x-19,y-71,11,4,'#c1f1b4');rect(c,x+9,y-71,11,4,'#c1f1b4');rect(c,x-12,y-46,25,9,'#312c32');rect(c,x-7,y-44,4,4,'#afac79');rect(c,x+6,y-44,4,4,'#afac79');
      [-1,1].forEach(s=>{line(c,x+s*16,y-9,x+s*42,y+5,'#705b47',12);line(c,x+s*23,y-11,x+s*19,y+12,'#705b47',10);});
      this.mushrooms(c,x-25,y-8,.7);glow(c,x,y-61,26,'#b7ecaf',.07);
    }
    dragonBoss(c,x,y,t,p,bob){
      y+=bob;
      [-1,1].forEach(s=>{
        c.fillStyle='#281c38';c.beginPath();c.moveTo(x+s*24,y-72);c.lineTo(x+s*81,y-134);c.lineTo(x+s*78,y-58);c.lineTo(x+s*59,y-73);c.lineTo(x+s*49,y-38);c.closePath();c.fill();
        c.fillStyle='#724566';c.beginPath();c.moveTo(x+s*31,y-73);c.lineTo(x+s*73,y-119);c.lineTo(x+s*69,y-73);c.lineTo(x+s*55,y-82);c.lineTo(x+s*48,y-53);c.closePath();c.fill();line(c,x+s*29,y-74,x+s*77,y-128,'#b07b95',3);
      });
      rect(c,x-31,y-70,63,52,'#3e2c50');rect(c,x-25,y-77,52,64,'#6b496d');rect(c,x-10,y-68,24,53,'#b78195');
      for(let i=0;i<5;i++)rect(c,x-9,y-64+i*10,23,3,'#7a526f');
      rect(c,x-18,y-112,41,40,'#392642');rect(c,x-14,y-113,34,35,'#895b80');rect(c,x-24,y-94,39,20,'#895b80');rect(c,x-27,y-91,10,13,'#b78195');rect(c,x-14,y-89,9,6,'#211b2c');rect(c,x+8,y-102,9,6,'#211b2c');rect(c,x+8,y-101,8,3,'#ffdcaa');rect(c,x-14,y-88,7,3,'#ffdcaa');
      rect(c,x-12,y-118,7,12,'#d3b3a0');rect(c,x-17,y-128,6,14,'#d3b3a0');rect(c,x+14,y-119,7,12,'#d3b3a0');rect(c,x+20,y-129,6,14,'#d3b3a0');
      rect(c,x-21,y-78,26,4,'#352639');rect(c,x-19,y-78,4,6,'#e4c3b2');rect(c,x-5,y-78,4,5,'#e4c3b2');
      rect(c,x-38,y-23,23,22,'#52374f');rect(c,x+18,y-23,23,22,'#52374f');for(let i=0;i<3;i++){rect(c,x-40+i*9,y-2,5,5,'#d4adac');rect(c,x+19+i*9,y-2,5,5,'#d4adac');}
      line(c,x+28,y-24,x+61,y-11,'#674761',10);line(c,x+61,y-11,x+74,y-34,'#674761',8);diamond(c,x+73,y-40,11,'#af7895');
      glow(c,x-38,y-77,17,'#ee8ea8',.12);diamond(c,x-37,y-76,9,'#ec99a4');diamond(c,x-38,y-77,4,'#ffdbb1');
    }
    chest(c,x,y,t,p){
      this.shadow(c,x,y+16,34,p);rect(c,x-29,y-17,58,33,'#201b2e');rect(c,x-24,y-25,48,11,'#201b2e');
      rect(c,x-25,y-13,50,25,'#71505b');rect(c,x-23,y-21,46,14,'#866470');rect(c,x-21,y-20,42,3,'#b78882');
      rect(c,x-26,y-7,52,5,'#bba181');rect(c,x-20,y-21,5,34,'#c3a982');rect(c,x+15,y-21,5,34,'#c3a982');rect(c,x-5,y-10,11,13,'#dec295');rect(c,x-1,y-6,3,6,'#493b49');rect(c,x-24,y+11,49,3,'#452d3d');
      glow(c,x,y-5,25,p.light,.04+.02*Math.sin(t));
    }
    rune(c,x,y,s,color,t){
      c.globalAlpha=.65;c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.moveTo(x,y-s);c.lineTo(x+s*.65,y);c.lineTo(x,y+s);c.lineTo(x-s*.65,y);c.closePath();c.stroke();rect(c,x-1,y-3,2,6,color);c.globalAlpha=1;
    }
    spell(c,p,strength,t){
      const startX=224,endX=559,y=220;
      c.globalAlpha=strength*.7;
      for(let i=0;i<22;i++){const x=startX+(endX-startX)*i/22,yy=y+Math.sin(i*.8+t*20)*7;rect(c,x,yy,10,2,i%2?p.glow:p.light);}
      glow(c,endX,y,35,p.light,strength*.13);c.globalAlpha=1;
    }
  }
  window.DungeonRenderer=DungeonRenderer;
})();
