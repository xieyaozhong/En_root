/* Original, dependency-free pixel art for the Wordbound dungeon. */
(() => {
  'use strict';

  const W = 768, H = 384;
  const PALETTES = [
    { void:'#0b0e20', wall:'#171c35', stone:'#242a46', edge:'#303855', floor:'#222841', line:'#151a2d', light:'#9d93ff', glow:'#8762ec', trim:'#505272', accent:'#d1b884', name:'library' },
    { void:'#08191c', wall:'#102e30', stone:'#214244', edge:'#305658', floor:'#193e3e', line:'#0e2b2e', light:'#b5e8cb', glow:'#54d3b1', trim:'#396360', accent:'#bcae77', name:'forest' },
    { void:'#160c22', wall:'#281732', stone:'#392242', edge:'#53304f', floor:'#302138', line:'#1d1226', light:'#ffb6b0', glow:'#f17c91', trim:'#724059', accent:'#d4a074', name:'obsidian' },
    { void:'#111a2e', wall:'#26384a', stone:'#3b5060', edge:'#6f8691', floor:'#243b4c', line:'#1a2d42', light:'#f8e4da', glow:'#b9dfe7', trim:'#adaca6', accent:'#ecd6ae', name:'astral' }
  ];
  function seed(n) { let x = n | 0; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; }
  function rect(c,x,y,w,h,color) { c.fillStyle=color; c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }
  function line(c,x,y,x2,y2,color,width=2) { c.strokeStyle=color; c.lineWidth=width; c.beginPath();c.moveTo(Math.round(x),Math.round(y));c.lineTo(Math.round(x2),Math.round(y2));c.stroke(); }
  function disk(c,x,y,r,color) { c.fillStyle=color; for(let dy=-r;dy<r;dy+=2){const dx=Math.floor(Math.sqrt(Math.max(0,r*r-dy*dy))/2)*2;c.fillRect(x-dx,y+dy,dx*2,2);} }
  function glow(c,x,y,r,color,alpha=.13) { c.save();const opacity=c.globalAlpha;for(let i=3;i>0;i--){c.globalAlpha=opacity*alpha/i;disk(c,x,y,r*i/2,color);}c.restore(); }
  function diamond(c,x,y,s,color){c.fillStyle=color;c.beginPath();c.moveTo(x,y-s);c.lineTo(x+s*.6,y);c.lineTo(x,y+s);c.lineTo(x-s*.6,y);c.closePath();c.fill();}
  function facet(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();}

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
      }else if(region===2){
        [49,229,525,698].forEach((x,i)=>this.crystal(c,x,199+i%2*79,18+i%3*5,p,true));
        const paths=[[11,316,139,273],[654,324,751,347],[288,372,340,343]];
        paths.forEach(([x,y,xx,yy])=>{line(c,x,y,xx,yy,'#682e51',5);line(c,x,y,xx,yy,'#c06377',2);});
        [141,604].forEach(x=>{rect(c,x,89,21,103,'#241527');rect(c,x-4,85,29,10,'#59304c');diamond(c,x+10,63,23,'#754556');diamond(c,x+7,57,16,'#b47886');});
      }else{
        [142,626].forEach(x=>{
          rect(c,x-24,169,48,21,'#607584');rect(c,x-28,165,56,7,'#b7b9af');
          for(const [dx,dy] of [[-14,0],[2,-17],[17,3]]){
            line(c,x+dx,165,x+dx,137+dy,'#8cae98',3);facet(c,[[x+dx,153+dy],[x+dx-12,144+dy],[x+dx-8,157+dy]],'#99b39a');
            disk(c,x+dx,134+dy,10,'#b785a2');disk(c,x+dx-3,131+dy,6,'#edbaca');rect(c,x+dx-4,128+dy,3,3,'#ffe4d4');
          }
        });
        [303,466].forEach(x=>{line(c,x,26,x,145,'#acb6b8',3);diamond(c,x,153,12,'#ddbad3');diamond(c,x-1,150,6,'#f5dfdb');});
        c.save();c.globalAlpha=.22;for(let i=0;i<9;i++)diamond(c,119+i*64,248+(i%3)*32,3,p.light);c.restore();
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
      const sky=region===1?'#254858':region===2?'#352445':region===3?'#3b6681':'#292d56';rect(c,x-w/2+7,y+23,w-14,h-27,sky);
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
      const c=this.ctx,region=Math.max(0,Math.min(3,Number(scene.region)||0)),p=PALETTES[region];
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
    hero(c,x,y,t,player,still,pose={}){
      // The feet stay anchored. Broad lit facets survive the arena's mobile scale,
      // while the asymmetric scarf, grimoire and crystal staff identify the mage.
      const cast=!!pose.casting,hand=cast?-8:0,sway=still?0:Math.round(Math.sin(t*2.5)*2);
      c.save();c.translate(x+34,y+98);
      rect(c,-17,-8,12,9,'#171e2c');rect(c,7,-8,12,9,'#171e2c');rect(c,-17,-7,12,3,'#a28a76');rect(c,7,-7,12,3,'#a28a76');
      facet(c,[[-14,-50],[-26,-37],[-31+sway,-7],[-9,-12],[1,-6],[26,-9],[20,-46]],'#181e31');
      facet(c,[[-13,-48],[-22,-35],[-26+sway,-11],[-8,-16],[-4,-9],[19,-12],[16,-44]],'#62518d');
      facet(c,[[-13,-47],[-20,-31],[-23+sway,-13],[-10,-17],[-5,-44]],'#8e78b4');
      facet(c,[[6,-45],[16,-41],[20,-12],[8,-15]],'#413b67');
      rect(c,-3,-46,6,34,'#c4a777');rect(c,-1,-43,2,28,'#f2d49c');
      facet(c,[[-18,-15],[-6,-18],[-3,-11],[17,-14],[19,-10],[-3,-7],[-8,-13],[-22,-10]],'#bd9f79');
      rect(c,-18,-29,35,5,'#383447');rect(c,-3,-30,8,7,'#e5c588');rect(c,-1,-28,4,3,'#74637f');
      // Three stitched celestial marks give the travelling coat a readable
      // material identity; all details follow the existing anchored silhouette.
      diamond(c,-13,-24,3,'#c8becf');rect(c,10,-24,2,6,'#9c91b5');rect(c,8,-22,6,2,'#9c91b5');
      line(c,-19,-34,-16,-40,'#d5bd9a',2);rect(c,15,-15,3,3,'#c3ae8d');
      // Shoulder cape and pale turquoise scarf share the game's icon colours.
      facet(c,[[-15,-54],[-25,-42],[-15,-35],[0,-41],[17,-35],[24,-43],[13,-54]],'#ac9bc9');
      facet(c,[[-15,-51],[-21,-43],[-13,-39],[0,-44],[14,-39],[19,-44],[11,-51]],'#77689d');
      rect(c,-10,-52,22,6,'#c7e1c3');facet(c,[[-6,-48],[-7,-33],[-15,-29],[-12,-48]],'#82bda9');
      diamond(c,3,-47,5,'#f5d89b');rect(c,2,-49,2,3,'#fff0bf');
      // Face reads from the illuminated cheek and one strong eye under the brim.
      rect(c,-13,-72,29,23,'#24243a');rect(c,-11,-70,26,18,'#c78e73');rect(c,-9,-69,22,13,'#efc5a1');
      rect(c,-10,-68,5,13,'#d8ad91');rect(c,-2,-64,4,4,'#2e2d47');rect(c,9,-64,4,4,'#2e2d47');rect(c,6,-56,6,2,'#ab786b');
      rect(c,-15,-68,5,14,'#493d56');rect(c,-15,-59,8,6,'#493d56');
      // Crooked pointed hat uses three large planes, not a flat triangle.
      facet(c,[[-24,-72],[-17,-88],[-5,-105],[9,-98],[9,-88],[23,-72]],'#242438');
      facet(c,[[-20,-74],[-14,-87],[-4,-101],[5,-96],[5,-86],[18,-73]],'#8f7cb7');
      facet(c,[[-4,-101],[5,-96],[5,-86],[18,-73],[5,-76],[-4,-86]],'#5e5187');
      facet(c,[[-13,-87],[-5,-97],[-5,-87],[-14,-77],[-18,-76]],'#b9a5d5');
      rect(c,-24,-77,45,7,'#d7b980');rect(c,-23,-76,43,2,'#ffe2a4');diamond(c,7,-74,5,'#a0ddc5');
      rect(c,-33,-72,68,6,'#222339');rect(c,-30,-72,63,3,'#c4b0db');rect(c,-23,-66,47,3,'#625381');
      // Hanging spellbook has a bright spine, clasp and visible paper block.
      rect(c,-27,-32,16,23,'#29263d');rect(c,-25,-31,12,20,'#8b6b80');rect(c,-24,-29,3,16,'#d8b88a');rect(c,-20,-28,6,14,'#daceb5');rect(c,-21,-23,8,4,'#a28078');
      // Casting raises the hand and staff; the silhouette remains inside its old footprint.
      rect(c,34,-66+hand,5,65,'#24283a');rect(c,35,-63+hand,3,59,'#9f8268');rect(c,35,-49+hand,3,21,'#d6bd8d');
      rect(c,28,-69+hand,18,4,'#d9b77c');rect(c,28,-79+hand,4,12,'#a88b68');rect(c,42,-79+hand,4,12,'#d8bd8c');
      glow(c,37,-78+hand,cast?13:8,'#a9f0d2',cast?.2:.1);diamond(c,37,-79+hand,11,'#3c897f');diamond(c,36,-81+hand,8,'#93dfc4');diamond(c,35,-84+hand,4,'#e4ffe1');
      rect(c,20,-39+hand,16,9,'#695887');rect(c,26,-38+hand,7,3,'#b4a1ce');rect(c,32,-38+hand,7,7,'#efc5a1');rect(c,33,-32+hand,6,2,'#bd896e');
      if(cast){diamond(c,19,-52,4,'#e0f4c4');rect(c,13,-55,3,3,'#b2e7c9');}
      c.restore();
    }
    enemy(c,x,y,e,t,p,still,region){
      const tag=String(e.id||e.kind||e.name||'').toLowerCase();t=still?0:t;const bob=still?0:Math.round(Math.sin(t*2.3)*3);
      if(e.boss||e.kind==='boss'){
        if(tag==='spore')this.sporeBoss(c,x,y,t,p,bob,e.phase);
        else if(tag==='prism')this.prismBoss(c,x,y,t,p,bob,e.phase);
        else if(tag==='hollow')this.hollowBoss(c,x,y,t,p,bob,e.phase);
        else if(tag==='cometqueen')this.cometQueenBoss(c,x,y,t,p,bob,e.phase);
        else if(/constellation|失約/.test(tag))this.constellationBoss(c,x,y,t,p,bob);
        else if(/astral|星龍/.test(tag))this.astralBoss(c,x,y,t,p,bob,e.phase);
        else if(/thorn|root|tree|forest|wood|樹|森/.test(tag))this.treeBoss(c,x,y,t,p,bob);
        else if(/witch|lich|巫/.test(tag))this.lichBoss(c,x,y,t,p,bob);
        else if(/king|dragon|void|abyss|龍|虛空/.test(tag))this.dragonBoss(c,x,y,t,p,bob);
        else if(region===1)this.treeBoss(c,x,y,t,p,bob);
        else if(region===2)this.dragonBoss(c,x,y,t,p,bob);
        else this.lichBoss(c,x,y,t,p,bob);
        return;
      }
      if(/stardust|starling|astrolabe/.test(tag))this.astralEnemy(c,x,y+bob,t,p,tag);
      else if(/eye|眼/.test(tag))this.eye(c,x,y-15+bob,t,p);
      else if(/mushroom|菇/.test(tag))this.mushroomEnemy(c,x,y+bob,p);
      else if(/bat|moth|raven|蝠|蛾|鴉/.test(tag))this.winged(c,x,y-14+bob,t,p,/raven|鴉/.test(tag));
      else if(/wisp|ghost|shade|幽|魂/.test(tag))this.ghost(c,x,y-14+bob,t,p,tag);
      else if(/knight|guard|golem|armor|騎|守|像/.test(tag))this.knight(c,x,y+bob,p);
      else if(/spider|蛛/.test(tag))this.spider(c,x,y+bob,p,t);
      else if(/skull|skeleton|bone|骷|骨/.test(tag))this.skeleton(c,x,y+bob,p);
      else this.slime(c,x,y+bob,p,t,region);
    }
    sporeBoss(c,x,y,t,p,bob,phase){
      // The cap floats above a rooted stalk. Tendril tips keep a clear floor anchor.
      const awake=phase>1,b=bob*.5,spread=awake?8:0;
      c.save();c.translate(x,y);
      for(const s of [-1,1]){
        for(let i=0;i<3;i++){
          const reach=22+i*16,flex=Math.round(Math.sin(t*1.4+i)*3);
          facet(c,[[s*(9+i*3),-50+b],[s*(21+i*7),-32+b],[s*(reach+flex),-12],[s*(reach+12),-3],[s*(reach+1),0],[s*(reach-7),-8],[s*(15+i*6),-26]],'#253b32');
          line(c,s*(14+i*3),-43+b,s*(reach+flex),-10,'#799764',4);
          rect(c,s*(reach+7)-4,-4,8,4,'#bddb83');
        }
        facet(c,[[s*16,-86+b],[s*35,-73+b],[s*(44+spread),-47+b],[s*32,-53+b],[s*22,-68+b]],'#425f48');
        diamond(c,s*(42+spread),-50+b,awake?10:7,'#d7ce83');
      }
      facet(c,[[-24,-88+b],[22,-88+b],[30,-57+b],[19,-19],[-19,-19],[-29,-53+b]],'#313e31');
      facet(c,[[-18,-84+b],[15,-84+b],[22,-59+b],[12,-27],[-13,-25],[-22,-55+b]],'#b3b891');
      facet(c,[[1,-82+b],[15,-84+b],[22,-59+b],[12,-27],[3,-25],[8,-51+b]],'#788565');
      line(c,-13,-56+b,-9,-29,'#dfe0b0',3);line(c,15,-58+b,10,-35,'#4e6550',3);
      facet(c,[[-67,-98+b],[-48,-78+b],[-20,-68+b],[20,-68+b],[48,-78+b],[67,-98+b]],'#332e36');
      facet(c,[[-61,-98+b],[-44,-81+b],[-18,-73+b],[18,-73+b],[44,-81+b],[61,-98+b]],'#ca9d83');
      for(let i=-4;i<=4;i++)line(c,i*14,-95+b,i*4,-75+b,i%2?'#906b68':'#e5bd93',3);
      // A broad asymmetric mushroom dome, scalloped rim, and raised spore crown.
      facet(c,[[-79,-99+b],[-63,-120+b],[-36,-137+b],[-4,-143+b],[33,-135+b],[61,-119+b],[79,-98+b],[62,-89+b],[34,-93+b],[9,-87+b],[-19,-93+b],[-47,-88+b]],'#24382f');
      facet(c,[[-71,-101+b],[-57,-119+b],[-32,-132+b],[-3,-137+b],[30,-130+b],[55,-116+b],[70,-100+b],[49,-97+b],[24,-101+b],[-1,-95+b],[-26,-100+b],[-49,-95+b]],awake?'#aa5869':'#876b71');
      facet(c,[[-56,-116+b],[-31,-129+b],[-4,-134+b],[14,-130+b],[-7,-124+b],[-31,-117+b],[-50,-106+b]],'#d29b8d');
      facet(c,[[19,-127+b],[49,-113+b],[63,-102+b],[42,-101+b],[23,-106+b]],'#6c4c62');
      for(const [px,py,size] of [[-46,-108,8],[-20,-123,9],[14,-115,11],[44,-109,6],[-9,-103,5]]){
        disk(c,px,py+b,size,'#e1d3a0');disk(c,px-2,py-2+b,Math.max(2,size-4),'#f7e9bf');
      }
      for(let i=0;i<5;i++){
        const px=(i-2)*15,py=-140-Math.abs(i-2)*-3+b-(awake?5:0);
        line(c,px,-128+b,px,py,'#758f59',4);
        facet(c,[[px-6,py],[px-7,py-7],[px,py-13],[px+7,py-7],[px+6,py]],'#394c35');
        diamond(c,px,py-5,awake?9:6,awake?'#dcf0a6':'#a9c779');
        if(awake){line(c,px-5,py-4,px-10,py-9,'#e6df9a',2);line(c,px+5,py-4,px+10,py-9,'#e6df9a',2);}
      }
      rect(c,-14,-66+b,8,5,'#293a35');rect(c,7,-66+b,8,5,'#293a35');
      rect(c,-12,-66+b,4,3,'#e8f6b4');rect(c,9,-66+b,4,3,'#e8f6b4');
      facet(c,[[-8,-55+b],[0,-51+b],[9,-55+b],[5,-45+b],[-5,-45+b]],'#546148');
      if(awake){glow(c,0,-55+b,20,'#d0e896',.09);diamond(c,0,-53+b,6,'#e8f3b0');}
      c.restore();
    }
    prismBoss(c,x,y,t,p,bob,phase){
      // A low four-legged beast carries a rigid fan of individual mirror blades.
      const awake=phase>1,flare=awake?8:0,sway=Math.round(Math.sin(t*1.1)*2);
      c.save();c.translate(x,y);
      for(const s of [-1,1]){
        for(let i=0;i<4;i++){
          const tipX=s*(40+i*18+flare),tipY=-148+i*23+sway;
          const baseX=s*(12+i*4),baseY=-56+i*4;
          facet(c,[[baseX-7,-42],[tipX-s*14,tipY+12],[tipX,tipY],[tipX+s*7,tipY+20],[baseX+9,baseY]],'#202c48');
          facet(c,[[baseX,-47],[tipX-s*10,tipY+14],[tipX,tipY+5],[tipX+s*2,tipY+21]],i%2?'#7fafd0':'#b8cddd');
          facet(c,[[baseX+3,baseY],[tipX,tipY+5],[tipX+s*2,tipY+21],[baseX+7,baseY+3]],i%2?'#5d628e':'#7892b5');
          line(c,baseX,-48,tipX-s*2,tipY+10,'#e9f5ee',2);
          diamond(c,tipX-s*3,tipY+18,4,awake?'#f4bbdb':'#d0f6e5');
        }
        facet(c,[[s*19,-44],[s*43,-39],[s*47,-11],[s*63,-6],[s*60,0],[s*34,0],[s*28,-23]],'#26354c');
        facet(c,[[s*22,-40],[s*36,-35],[s*39,-13],[s*51,-8],[s*36,-6],[s*29,-24]],'#8daac4');
        facet(c,[[s*14,-34],[s*25,-29],[s*24,-7],[s*35,-3],[s*33,1],[s*9,1],[s*11,-17]],'#4d6282');
        line(c,s*18,-26,s*16,-6,'#c2e6e7',3);
        for(let i=0;i<3;i++)rect(c,s*(38+i*8)-2,-3,4,4,'#def1e8');
      }
      facet(c,[[-43,-58],[-27,-86],[5,-94],[34,-80],[45,-51],[25,-26],[-21,-25]],'#24354d');
      facet(c,[[-36,-57],[-24,-78],[3,-86],[29,-73],[36,-52],[20,-32],[-17,-31]],'#81a6c2');
      facet(c,[[-24,-78],[3,-86],[1,-55],[-17,-31],[-36,-57]],'#c0d9df');
      facet(c,[[3,-86],[29,-73],[36,-52],[1,-55]],'#656c9d');
      facet(c,[[1,-55],[36,-52],[20,-32],[-17,-31]],'#496383');
      diamond(c,0,-55,awake?23:17,'#233c54');diamond(c,-1,-57,awake?17:11,awake?'#e59bc9':'#9ee2dc');
      diamond(c,-3,-61,6,'#f1f9e5');
      // A forward-facing faceted muzzle gives the fan a visible living owner.
      facet(c,[[-26,-88],[-23,-112],[-11,-103],[11,-103],[25,-116],[27,-87],[18,-66],[0,-57],[-19,-68]],'#243049');
      facet(c,[[-20,-87],[-18,-102],[-9,-97],[9,-97],[20,-105],[21,-85],[13,-72],[0,-65],[-14,-74]],'#b8d4df');
      facet(c,[[0,-97],[9,-97],[20,-105],[21,-85],[13,-72],[0,-65],[5,-82]],'#7a94ba');
      line(c,-19,-88,-7,-84,'#364568',4);line(c,7,-84,19,-88,'#364568',4);
      rect(c,-14,-87,5,3,'#f4c9e2');rect(c,10,-87,5,3,'#f4c9e2');
      facet(c,[[-11,-76],[0,-80],[12,-76],[0,-68]],'#354b6b');diamond(c,0,-100,6,'#f5e1b7');
      if(awake){line(c,-28,-64,-10,-56,'#f7d5e3',3);line(c,12,-52,28,-40,'#f7d5e3',3);diamond(c,-26,-65,5,'#fff4e3');diamond(c,29,-39,5,'#fff4e3');}
      c.restore();
    }
    hollowBoss(c,x,y,t,p,bob,phase){
      const awake=phase>1,b=bob*.6,swing=Math.round(Math.sin(t*1.6)*(awake?7:4));
      c.save();c.translate(x,y);
      // Chains and wide sleeves frame a bronze bell; the clapper marks its center.
      for(const s of [-1,1]){
        facet(c,[[s*17,-104+b],[s*38,-91+b],[s*59,-55+b],[s*48,-44+b],[s*28,-64+b],[s*16,-76+b]],'#24283a');
        facet(c,[[s*23,-93+b],[s*34,-85+b],[s*50,-57+b],[s*45,-53+b],[s*29,-74+b]],'#655b69');
        line(c,s*28,-93+b,s*48,-56+b,'#ae926b',3);
        rect(c,s*49-4,-49+b,9,7,'#ceb68a');
        for(let i=0;i<5;i++){
          const xx=s*(53+i*.8),yy=-39+b+i*7;
          rect(c,xx-3,yy,6,6,'#a28a65');rect(c,xx-1,yy+1,2,4,'#29313e');
        }
        diamond(c,s*57,-2+b,8,awake?'#b7ddd2':'#8eafad');
      }
      facet(c,[[-20,-99+b],[20,-99+b],[25,-73+b],[35,-48+b],[45,-30+b],[43,-19+b],[-43,-19+b],[-45,-30+b],[-35,-48+b],[-25,-73+b]],'#272b32');
      facet(c,[[-15,-94+b],[15,-94+b],[19,-70+b],[30,-45+b],[38,-31+b],[-38,-31+b],[-30,-45+b],[-19,-70+b]],'#967747');
      facet(c,[[-13,-91+b],[-4,-91+b],[-8,-66+b],[-19,-40+b],[-31,-34+b],[-26,-46+b],[-16,-70+b]],'#d2b37b');
      facet(c,[[8,-92+b],[15,-94+b],[19,-70+b],[30,-45+b],[38,-31+b],[22,-33+b],[13,-60+b]],'#66513c');
      rect(c,-21,-76+b,42,5,'#b89a64');rect(c,-29,-46+b,58,4,'#ba9e67');
      facet(c,[[-43,-31+b],[43,-31+b],[45,-22+b],[32,-16+b],[-32,-16+b],[-45,-22+b]],'#b2925d');
      facet(c,[[-34,-24+b],[34,-24+b],[26,-19+b],[-26,-19+b]],'#232a32');
      line(c,0,-37+b,swing,-13+b,'#b5a17a',5);disk(c,swing,-9+b,8,'#4a514e');disk(c,swing-2,-11+b,5,'#d1c69d');
      // A long hood conceals an empty face, with no shared dragon or mage silhouette.
      facet(c,[[-27,-99+b],[-24,-125+b],[-9,-145+b],[9,-145+b],[24,-125+b],[27,-99+b],[12,-87+b],[-12,-87+b]],'#252936');
      facet(c,[[-20,-104+b],[-17,-123+b],[-6,-138+b],[5,-138+b],[16,-122+b],[20,-105+b],[10,-95+b],[-11,-95+b]],'#6b6369');
      facet(c,[[-12,-113+b],[0,-129+b],[12,-113+b],[10,-100+b],[-10,-100+b]],'#162831');
      line(c,-16,-122+b,-22,-103+b,'#c1a67c',3);line(c,16,-122+b,22,-103+b,'#c1a67c',3);
      rect(c,-8,-111+b,5,3,'#c9e2cc');rect(c,4,-111+b,5,3,'#c9e2cc');
      diamond(c,0,-143+b,7,'#c4aa74');line(c,0,-153+b,0,-137+b,'#e4c78a',3);
      const crack=awake?'#d8f2ce':'#394b45';
      line(c,5,-87+b,-4,-68+b,crack,awake?4:2);line(c,-4,-68+b,8,-56+b,crack,awake?4:2);line(c,8,-56+b,-1,-33+b,crack,awake?4:2);
      if(awake){
        line(c,-4,-68+b,-17,-64+b,'#d8f2ce',3);line(c,8,-56+b,23,-50+b,'#d8f2ce',3);
        for(const s of [-1,1]){facet(c,[[s*35,-64+b],[s*44,-69+b],[s*47,-57+b],[s*39,-51+b]],'#b89d6c');diamond(c,s*37,-76+b,4,'#e2e9bd');}
        glow(c,0,-60+b,19,'#d8e9ba',.08);
      }
      c.restore();
    }
    cometQueenBoss(c,x,y,t,p,bob,phase){
      const awake=phase>1,b=bob*.4,trail=Math.round(Math.sin(t*1.3)*3),extent=awake?8:0;
      c.save();c.translate(x,y);
      // Layered comet ribbons form a sweeping royal mantle, never bat wings.
      for(const s of [-1,1]){
        facet(c,[[s*14,-90+b],[s*40,-118+b],[s*(93+extent),-130+trail],[s*74,-104+b],[s*(99+extent),-80+trail],[s*63,-84+b],[s*82,-49+trail],[s*48,-66+b],[s*35,-33+b],[s*24,-65+b]],'#25324c');
        facet(c,[[s*21,-87+b],[s*44,-110+b],[s*(84+extent),-121+trail],[s*62,-99+b],[s*85,-85+trail],[s*53,-88+b],[s*66,-61+trail],[s*41,-78+b],[s*31,-50+b]],'#8a8cb4');
        facet(c,[[s*28,-91+b],[s*47,-107+b],[s*(75+extent),-116+trail],[s*52,-95+b],[s*71,-87+trail],[s*43,-91+b],[s*54,-72+trail]],'#e5becf');
        line(c,s*28,-85+b,s*72,-112+trail,'#f1dec4',3);
        diamond(c,s*74,-113+trail,5,'#e2f0d7');diamond(c,s*68,-83+trail,4,'#b5ece0');
        if(awake){facet(c,[[s*33,-71+b],[s*58,-57],[s*86,-25+trail],[s*58,-40],[s*46,-32]],'#6a789f');line(c,s*46,-61,s*76,-33+trail,'#d4c8df',3);}
      }
      // A fitted bodice, long split gown and visible feet establish an adult figure.
      rect(c,-12,-8,9,9,'#d9bd99');rect(c,5,-8,9,9,'#d9bd99');
      facet(c,[[-17,-79+b],[17,-79+b],[13,-56+b],[22,-32],[34,-5],[17,0],[2,-10],[-15,0],[-34,-5],[-22,-32],[-13,-56+b]],'#25354f');
      facet(c,[[-10,-75+b],[10,-75+b],[8,-55+b],[16,-31],[23,-7],[9,-11],[0,-21],[-9,-10],[-23,-7],[-15,-30],[-8,-55+b]],'#d9d6d0');
      facet(c,[[3,-73+b],[10,-75+b],[8,-55+b],[16,-31],[23,-7],[9,-11],[0,-21]],'#a7adc5');
      line(c,-15,-50+b,-26,-8,'#d3b781',3);line(c,15,-50+b,26,-8,'#d3b781',3);
      rect(c,-13,-59+b,26,5,'#b39768');diamond(c,0,-58+b,7,'#94d6cc');diamond(c,0,-59+b,3,'#ecf5d5');
      for(const s of [-1,1]){
        facet(c,[[s*14,-79+b],[s*24,-75+b],[s*36,-54+b],[s*29,-48+b],[s*17,-64+b]],'#4f6185');
        line(c,s*22,-71+b,s*30,-56+b,'#b3bfd2',4);rect(c,s*31-4,-55+b,8,8,'#e9c5b0');
        diamond(c,s*38,-53+b,6,'#e4d1ac');
      }
      facet(c,[[-20,-99+b],[-15,-119+b],[0,-125+b],[17,-118+b],[22,-96+b],[17,-76+b],[10,-88+b],[-10,-88+b],[-19,-77+b]],'#dfd6df');
      facet(c,[[8,-119+b],[17,-118+b],[22,-96+b],[17,-76+b],[10,-88+b],[13,-104+b]],'#9e9fb9');
      rect(c,-10,-105+b,21,21,'#ecc9b4');facet(c,[[-10,-87+b],[11,-87+b],[5,-80+b],[-4,-80+b]],'#c59a95');
      facet(c,[[-16,-106+b],[-8,-118+b],[7,-119+b],[17,-107+b],[4,-112+b],[-5,-102+b]],'#f0e3df');
      rect(c,-8,-99+b,5,3,'#47577d');rect(c,4,-99+b,5,3,'#47577d');rect(c,-3,-90+b,6,2,'#ae787e');
      // The orbit is a compact crown above the head, not a floor attack warning.
      c.save();c.strokeStyle='#c8b08b';c.lineWidth=3;c.beginPath();c.ellipse(0,-132+b,awake?33:27,9,-.12,0,Math.PI*2);c.stroke();c.restore();
      for(let i=0;i<5;i++){
        const angle=t*.3+i*Math.PI*2/5,xx=Math.cos(angle)*(awake?33:27),yy=-132+b+Math.sin(angle)*9;
        diamond(c,xx,yy,5,i%2?'#c7ebdf':'#e8c3dd');
      }
      facet(c,[[-13,-118+b],[-18,-131+b],[-5,-126+b],[0,-143+b],[7,-126+b],[18,-132+b],[13,-117+b]],'#b99c6c');
      diamond(c,0,-132+b,8,'#d9ebe0');diamond(c,0,-134+b,4,'#fff0cf');
      if(awake){diamond(c,0,-151+b,5,'#f1d0df');glow(c,0,-130+b,21,'#f4c5dc',.07);}
      c.restore();
    }
    astralEnemy(c,x,y,t,p,tag){
      if(tag==='astrolabe'){
        // A running orrery: segmented brass hoop, inset glass and four feet.
        for(const s of [-1,1]){line(c,x+s*15,y-16,x+s*28,y-3,'#827492',5);rect(c,x+s*24-4,y-3,12,4,'#d0b799');}
        c.save();c.strokeStyle='#2b2e49';c.lineWidth=10;c.beginPath();c.ellipse(x,y-32,25,29,0,0,Math.PI*2);c.stroke();
        c.strokeStyle='#d7b99a';c.lineWidth=5;c.beginPath();c.ellipse(x,y-32,25,29,0,0,Math.PI*2);c.stroke();
        c.strokeStyle='#857895';c.lineWidth=3;c.beginPath();c.ellipse(x,y-32,29,11,-.55,0,Math.PI*2);c.stroke();c.restore();
        diamond(c,x,y-32,20,'#586b91');diamond(c,x-3,y-36,12,'#a8d4dc');diamond(c,x-3,y-38,5,'#ecf4e4');
        for(let i=0;i<4;i++){const a=i*Math.PI/2+t*.45;diamond(c,x+Math.cos(a)*25,y-32+Math.sin(a)*29,5,'#eed4b1');}
        rect(c,x-7,y-32,4,4,'#35506c');rect(c,x+5,y-32,4,4,'#35506c');
      }else if(tag==='starling'){
        // Split comet wings read as a ranged enemy rather than another bat.
        for(const s of [-1,1]){
          facet(c,[[x+s*8,y-35],[x+s*32,y-61],[x+s*48,y-47],[x+s*29,y-32],[x+s*43,y-18],[x+s*18,y-22]],'#4e547e');
          facet(c,[[x+s*12,y-34],[x+s*31,y-54],[x+s*38,y-47],[x+s*26,y-33],[x+s*31,y-24]],'#a5afcc');
          line(c,x+s*19,y-35,x+s*31,y-48,'#ebcadd',2);
        }
        facet(c,[[x,y-59],[x+15,y-39],[x+11,y-17],[x,y-2],[x-13,y-22],[x-14,y-39]],'#747ca3');
        facet(c,[[x,y-55],[x+8,y-38],[x+6,y-22],[x,y-12],[x-6,y-27],[x-7,y-39]],'#d2dce2');
        diamond(c,x,y-42,7,'#f2bfd7');rect(c,x-9,y-34,5,4,'#28344f');rect(c,x+4,y-34,5,4,'#28344f');
      }else{
        // A tiny glass fox made of stardust, with tall ears and a faceted tail.
        facet(c,[[x+12,y-16],[x+34,y-28],[x+40,y-49],[x+28,y-41],[x+22,y-31]],'#738db2');
        facet(c,[[x+24,y-30],[x+38,y-46],[x+30,y-28],[x+16,y-19]],'#d8bdcf');
        facet(c,[[x-21,y-39],[x-22,y-59],[x-8,y-47],[x+8,y-48],[x+22,y-59],[x+20,y-34],[x+17,y-12],[x-17,y-12]],'#494c75');
        facet(c,[[x-17,y-36],[x-14,y-47],[x-5,y-42],[x+9,y-43],[x+17,y-34],[x+14,y-14],[x-13,y-14]],'#9baed1');
        facet(c,[[x-15,y-49],[x-17,y-54],[x-8,y-46]],'#e9c2d1');facet(c,[[x+12,y-47],[x+18,y-54],[x+17,y-44]],'#e9c2d1');
        rect(c,x-18,y-9,12,7,'#8999b7');rect(c,x+7,y-9,12,7,'#8999b7');
        rect(c,x-10,y-33,4,5,'#293b59');rect(c,x+6,y-33,4,5,'#293b59');diamond(c,x,y-24,3,'#516282');diamond(c,x,y-43,5,'#f4e1bf');
        facet(c,[[x-9,y-23],[x,y-20],[x+10,y-23],[x+5,y-14],[x-5,y-14]],'#e4d4d9');
      }
    }
    astralBoss(c,x,y,t,p,bob,phase){
      y+=bob*.5;const wing=Math.round(Math.sin(t*1.3)*4),pink=phase>1?'#f1b5d4':'#c3b7d9';
      // Long crescent wings and antler-like celestial horns distinguish this
      // dragon from the heavy obsidian dragon, without changing its hitbox.
      for(const s of [-1,1]){
        facet(c,[[x+s*19,y-60],[x+s*51,y-109],[x+s*92,y-135+wing],[x+s*79,y-91],[x+s*58,y-53],[x+s*39,y-31]],'#23314e');
        facet(c,[[x+s*29,y-67],[x+s*56,y-106],[x+s*84,y-125+wing],[x+s*68,y-88],[x+s*50,y-49]],'#607997');
        facet(c,[[x+s*41,y-78],[x+s*60,y-105],[x+s*77,y-116+wing],[x+s*62,y-83]],pink);
        line(c,x+s*27,y-60,x+s*79,y-120+wing,'#e2d6dd',3);
        for(let i=0;i<3;i++){const xx=x+s*(48+i*12),yy=y-79-i*15;diamond(c,xx,yy,4,'#e8dfc3');}
      }
      facet(c,[[x-26,y-64],[x-22,y-88],[x,y-101],[x+24,y-86],[x+31,y-40],[x+20,y-9],[x-20,y-9],[x-31,y-36]],'#344563');
      facet(c,[[x-21,y-65],[x-16,y-85],[x,y-92],[x+14,y-77],[x+20,y-29],[x+11,y-12],[x-14,y-13]],'#8ba7ba');
      facet(c,[[x-8,y-72],[x+8,y-70],[x+12,y-17],[x-8,y-14],[x-17,y-31]],'#e0d6cd');
      for(let i=0;i<5;i++)line(c,x-9,y-66+i*10,x+10,y-64+i*10,'#a399b4',2);
      // Long-necked face with an ivory brow, teal eyes and pink cheek scales.
      facet(c,[[x-18,y-89],[x-23,y-116],[x-11,y-133],[x+13,y-134],[x+25,y-119],[x+20,y-93],[x+3,y-79]],'#34445d');
      facet(c,[[x-17,y-111],[x-10,y-127],[x+10,y-129],[x+19,y-117],[x+14,y-98],[x+2,y-87],[x-14,y-94]],'#c7d4d7');
      facet(c,[[x+10,y-127],[x+19,y-116],[x+13,y-97],[x+4,y-91],[x+7,y-113]],'#8196b1');
      facet(c,[[x-22,y-110],[x-6,y-106],[x+7,y-100],[x+5,y-89],[x-14,y-91],[x-25,y-99]],'#c9b6cd');
      rect(c,x-15,y-110,8,4,'#34576a');rect(c,x+7,y-118,8,4,'#34576a');rect(c,x-13,y-110,3,2,'#d5ffe8');rect(c,x+9,y-118,3,2,'#d5ffe8');
      diamond(c,x,y-127,7,'#f6d5b4');diamond(c,x,y-128,3,'#fef0cf');
      for(const s of [-1,1]){
        line(c,x+s*12,y-128,x+s*23,y-152,'#d8c6b1',5);line(c,x+s*23,y-152,x+s*38,y-160,'#eaddc1',3);line(c,x+s*21,y-147,x+s*15,y-158,'#eaddc1',3);
        facet(c,[[x+s*18,y-25],[x+s*34,y-22],[x+s*38,y-5],[x+s*20,y-3]],'#778ba5');
        for(let i=0;i<3;i++)rect(c,x+s*24+i*5-4,y-4,4,5,'#e5d5c9');
      }
      line(c,x+24,y-19,x+50,y-10,'#8fa5ba',10);line(c,x+50,y-10,x+64,y-27,'#c1b5cd',7);diamond(c,x+65,y-36,13,'#eac0d7');diamond(c,x+63,y-39,6,'#e4f5e9');
      diamond(c,x+1,y-48,10,'#5c7898');diamond(c,x,y-51,6,'#b9ecdf');
    }
    constellationBoss(c,x,y,t,p,bob){
      y+=bob;glow(c,x,y-76,49,'#c898df',.07);
      // An empty star-crowned cloak; the hollow, broken silhouette is separate
      // from both living dragons and Lumina's optional sparring form.
      const points=[[-44,-102],[-20,-121],[2,-108],[31,-123],[50,-95],[29,-71],[38,-37],[56,-4],[18,-18],[3,4],[-13,-18],[-46,-3],[-32,-45],[-37,-72]];
      facet(c,points.map(([xx,yy])=>[x+xx,y+yy]),'#30233e');
      facet(c,[[-35,-95],[-18,-108],[0,-97],[27,-110],[39,-95],[20,-73],[29,-42],[35,-15],[14,-27],[2,-8],[-11,-29],[-31,-15],[-22,-48],[-29,-73]].map(([xx,yy])=>[x+xx,y+yy]),'#69567e');
      facet(c,[[x-6,y-91],[x+13,y-91],[x+18,y-45],[x+6,y-25],[x-13,y-45]],'#171e35');
      for(const s of [-1,1])line(c,x+s*24,y-72,x+s*30,y-23,'#b88cac',3);
      facet(c,[[x-21,y-111],[x-11,y-138],[x+12,y-138],[x+23,y-110],[x+12,y-91],[x-13,y-91]],'#181e34');
      diamond(c,x-9,y-113,5,'#e9b8d7');diamond(c,x+10,y-113,5,'#e9b8d7');
      for(let i=0;i<5;i++){const xx=x+(i-2)*13,yy=y-144+(i%2)*6;diamond(c,xx,yy,7,i===2?'#fff0cd':'#e4b6d5');if(i)line(c,xx-13,yy+(i%2?-6:6),xx,yy,'#a586b7',2);}
      const stars=[[-59,-85],[61,-73],[-53,-37],[52,-23]];
      stars.forEach(([xx,yy],i)=>{const drift=Math.sin(t*.7+i)*3;diamond(c,x+xx,y+yy+drift,8,'#c2aedb');line(c,x+xx-5,y+yy+drift,x+xx+5,y+yy+drift,'#ffdeca',2);});
      diamond(c,x+3,y-63,12,'#b18cad');diamond(c,x+1,y-65,7,'#f3c7dd');
    }
    slime(c,x,y,p,t,region){
      const body=region===1?'#4c9f80':region===2?'#a35c87':'#7771a9',lite=region===1?'#88d3ac':region===2?'#e491ad':'#b1a2dc';
      rect(c,x-27,y-29,54,27,'#19192e');rect(c,x-23,y-42,45,39,'#19192e');rect(c,x-14,y-48,27,11,'#19192e');
      rect(c,x-25,y-25,50,20,body);rect(c,x-21,y-38,41,30,body);rect(c,x-12,y-44,25,10,body);
      rect(c,x-17,y-36,8,7,lite);rect(c,x-11,y-41,14,5,lite);rect(c,x-18,y-14,37,6,'#57516f');
      rect(c,x-12,y-25,6,9,'#19192e');rect(c,x+10,y-25,6,9,'#19192e');rect(c,x-11,y-24,2,3,'#f8ebd7');rect(c,x+11,y-24,2,3,'#f8ebd7');rect(c,x-1,y-13,7,3,'#332941');
      rect(c,x-31,y-4,20,4,body);rect(c,x+15,y-5,18,5,body);
      rect(c,x-22,y-20,4,8,lite);rect(c,x+17,y-22,5,13,'#45445d');rect(c,x-2,y-37,7,3,lite);rect(c,x-9,y-36,4,4,'#e1ecd7');
      diamond(c,x+4,y-28,6,'#a5d0c0');rect(c,x+3,y-31,2,4,'#f4f2ce');
      if(region===1){rect(c,x-1,y-54,3,10,'#6db788');rect(c,x-7,y-56,8,4,'#a1c77e');}
    }
    winged(c,x,y,t,p,raven){
      const flap=Math.round(Math.sin(t*5)*5),dark=raven?'#20263c':'#30263f',mid=raven?'#4b5876':'#77608c',light=raven?'#8a9cba':'#b28eb9';
      // Raven feather fans and a bat's scalloped membrane are different silhouettes.
      for(const s of [-1,1]){
        facet(c,[[x+s*8,y-40],[x+s*28,y-57+flap],[x+s*54,y-64+flap],[x+s*49,y-36+flap],[x+s*31,y-24],[x+s*12,y-27]],dark);
        if(raven){
          for(let i=0;i<3;i++)facet(c,[[x+s*14,y-38],[x+s*(51-i*8),y-58+flap+i*5],[x+s*(42-i*6),y-39+flap+i*6],[x+s*16,y-28]],i===0?light:mid);
          facet(c,[[x-8,y-17],[x+9,y-17],[x+16,y+2],[x+3,y-3],[x-4,y+3],[x-14,y]],mid);
        }else{
          facet(c,[[x+s*12,y-37],[x+s*31,y-52+flap],[x+s*48,y-57+flap],[x+s*39,y-35],[x+s*30,y-38],[x+s*24,y-24]],mid);
          line(c,x+s*14,y-36,x+s*47,y-56+flap,light,2);line(c,x+s*30,y-48+flap,x+s*30,y-38,dark,2);
        }
      }
      rect(c,x-13,y-47,26,29,dark);rect(c,x-9,y-48,18,25,mid);rect(c,x-10,y-31,20,15,dark);rect(c,x-6,y-29,11,11,mid);
      if(raven){facet(c,[[x-12,y-42],[x-29,y-35],[x-12,y-33]],'#d8b886');rect(c,x-7,y-43,5,4,'#f1d8b0');rect(c,x-2,y-51,11,4,light);}
      else{facet(c,[[x-12,y-43],[x-15,y-63],[x-2,y-48]],mid);facet(c,[[x+4,y-47],[x+15,y-63],[x+13,y-42]],mid);rect(c,x-8,y-42,5,4,'#f0c6ae');rect(c,x+4,y-42,5,4,'#f0c6ae');rect(c,x-3,y-31,3,5,'#eee0c3');rect(c,x+2,y-31,3,5,'#eee0c3');}
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
      rect(c,x-23,y-48,6,4,'#78ae90');rect(c,x+22,y-46,5,9,'#244b47');rect(c,x+6,y-32,6,7,'#9b947e');
      for(let i=0;i<5;i++)line(c,x-21+i*10,y-34,x-15+i*7,y-29,'#4e7567',2);
    }
    knight(c,x,y,p){
      rect(c,x-20,y-80,39,29,'#171929');rect(c,x-16,y-77,31,29,'#7b8199');rect(c,x-10,y-82,20,4,'#adb0bd');rect(c,x-16,y-63,31,7,'#303047');rect(c,x-12,y-61,8,3,p.light);rect(c,x+4,y-61,8,3,p.light);
      rect(c,x-23,y-48,47,39,'#25263c');rect(c,x-18,y-48,38,31,'#69718b');rect(c,x-13,y-44,25,4,'#a3a7b8');rect(c,x-4,y-48,7,36,'#9297ad');
      rect(c,x-31,y-49,16,21,'#6e7189');rect(c,x+19,y-49,15,17,'#8c8ca0');rect(c,x-18,y-11,12,13,'#46475e');rect(c,x+8,y-11,12,13,'#46475e');
      rect(c,x-39,y-43,17,34,'#343752');rect(c,x-37,y-41,13,28,'#9992a6');rect(c,x-33,y-38,4,19,p.accent);
      rect(c,x+31,y-65,5,58,'#c4b6b9');rect(c,x+24,y-20,19,4,'#ab8b75');rect(c,x+32,y-16,4,13,'#63516a');
      facet(c,[[x-18,y-45],[x-6,y-39],[x-6,y-21],[x-17,y-26]],'#8692aa');facet(c,[[x+6,y-40],[x+17,y-45],[x+17,y-26],[x+6,y-21]],'#4d5874');
      diamond(c,x,y-34,8,'#c7aa79');diamond(c,x,y-34,4,p.light);rect(c,x-14,y-75,4,10,'#c1c6cf');rect(c,x+10,y-73,5,9,'#505b78');rect(c,x-32,y-38,3,18,'#e5d0a1');
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
      // Ivory collar, gold-edged mantle and broken page wings frame the skull.
      facet(c,[[x-27,y-87],[x-44,y-80],[x-28,y-69],[x-15,y-72]],'#c5b6c5');facet(c,[[x+27,y-87],[x+44,y-80],[x+28,y-69],[x+15,y-72]],'#8b789f');
      line(c,x-41,y-59,x-48,y-17,'#be9b83',3);line(c,x+38,y-57,x+45,y-13,'#9a7d91',3);
      for(const side of [-1,1])for(let i=0;i<3;i++){const xx=x+side*(35+i*9),yy=y-88+i*16;facet(c,[[xx,yy],[xx+side*15,yy-7],[xx+side*20,yy+9],[xx+side*5,yy+15]],i%2?'#74618a':'#a392b2');line(c,xx+side*5,yy+2,xx+side*13,yy-1,'#d2bfce',2);}
      rect(c,x-9,y-113,6,4,'#f2e4cf');rect(c,x+12,y-110,3,16,'#a498b1');rect(c,x-15,y-126,30,3,'#f0d4ad');diamond(c,x,y-124,6,'#c9b4ff');
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
      // Split bark planes, a glowing heartwood seal and asymmetrical moss canopy.
      line(c,x-21,y-89,x-23,y-50,'#b39467',3);line(c,x-23,y-50,x-16,y-31,'#b39467',3);line(c,x+13,y-88,x+9,y-63,'#473e38',4);line(c,x+9,y-63,x+18,y-47,'#473e38',4);
      facet(c,[[x-8,y-35],[x,y-41],[x+9,y-34],[x+5,y-22],[x-5,y-22]],'#263f36');diamond(c,x,y-31,9,'#89c7a0');diamond(c,x-1,y-33,4,'#dcf4b9');
      for(const [xx,yy] of [[-44,-137],[24,-147],[39,-132],[-3,-117]]){rect(c,x+xx,y+yy,11,4,'#85a776');rect(c,x+xx+3,y+yy+4,5,5,'#47785f');}
      line(c,x-47,y-91,x-38,y-85,'#b09463',3);line(c,x+47,y-93,x+59,y-86,'#a9895c',3);
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
      // Obsidian armour facets and ember seams give the dragon mass at small scale.
      facet(c,[[x-24,y-66],[x-13,y-59],[x-14,y-34],[x-25,y-25]],'#90617f');facet(c,[[x+14,y-66],[x+26,y-61],[x+25,y-29],[x+15,y-36]],'#49364f');
      for(const s of [-1,1]){line(c,x+s*37,y-80,x+s*58,y-97,'#c58d9c',2);line(c,x+s*37,y-80,x+s*51,y-64,'#c58d9c',2);facet(c,[[x+s*20,y-48],[x+s*35,y-44],[x+s*30,y-32],[x+s*17,y-37]],'#bc8395');}
      rect(c,x-10,y-110,6,5,'#bf89a2');rect(c,x+15,y-108,4,13,'#593c60');diamond(c,x+1,y-52,8,'#e5a383');diamond(c,x,y-54,4,'#ffe1aa');
    }
    chest(c,x,y,t,p){
      this.shadow(c,x,y+16,34,p);rect(c,x-29,y-17,58,33,'#201b2e');rect(c,x-24,y-25,48,11,'#201b2e');
      rect(c,x-25,y-13,50,25,'#71505b');rect(c,x-23,y-21,46,14,'#866470');rect(c,x-21,y-20,42,3,'#b78882');
      rect(c,x-26,y-7,52,5,'#bba181');rect(c,x-20,y-21,5,34,'#c3a982');rect(c,x+15,y-21,5,34,'#c3a982');rect(c,x-5,y-10,11,13,'#dec295');rect(c,x-1,y-6,3,6,'#493b49');rect(c,x-24,y+11,49,3,'#452d3d');
      glow(c,x,y-5,25,p.light,.04+.02*Math.sin(t));
    }
    rune(c,x,y,s,color,t){
      c.save();c.globalAlpha*=.65;c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.moveTo(x,y-s);c.lineTo(x+s*.65,y);c.lineTo(x,y+s);c.lineTo(x-s*.65,y);c.closePath();c.stroke();rect(c,x-1,y-3,2,6,color);c.restore();
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
