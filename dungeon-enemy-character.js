/* Original, articulated pixel combatants. Origin is the actor's feet.
 * draw(ctx, pose, actor): renderer-owned pose + read-only simulation actor.
 * Action stages come from the combat simulation, never from an animation timer.
 * All joints, cloth, wings and weapons are drawn directly; no sprite allocations. */
(() => {
  'use strict';
  const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const n=(v,d=0)=>Number.isFinite(v)?v:d;
  const mix=(a,b,t)=>a+(b-a)*t;
  const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const NPC=new Set(['merchant','healer','smith','cartographer','ferryman','lantern','echo','sentinel']);
  const KNOWN=new Set([...NPC,'thorn','spore','witch','prism','king','hollow','astral','cometqueen','constellation',
    'slime','moth','mushroom','wisp','knight','eye','shade','golem','raven','stardust','starling','astrolabe','spider','skeleton']);
  const PALETTES={
    merchant:['#463541','#8f685b','#c99c72','#f7dc98','#e6c096'],healer:['#283e40','#61947a','#9ac9a2','#ecddab','#e6c4a3'],
    smith:['#282c40','#70778a','#afb9c5','#ffc891','#d2ae98'],cartographer:['#292840','#6c7398','#b1accc','#e9d6a2','#e7c9b4'],
    ferryman:['#172c40','#4d7887','#86afbb','#c8eddf','#a3c8cd'],lantern:['#214652','#5aa899','#a4e1c4','#edffca','#d8e7c8'],
    echo:['#35264f','#8a77b3','#c9b4df','#efe2ff','#efd2b8'],sentinel:['#4e4939','#aaa073','#e2d0a0','#fff0ba','#e9dcad'],
    thorn:['#293b32','#6e5a45','#a18b61','#c4f3ac','#d0d79c'],spore:['#283b34','#5e8061','#acc88a','#f1e9b0','#d9d2a9'],
    witch:['#211e39','#635282','#aa93bd','#dac3ff','#e6d6c7'],prism:['#263248','#658aab','#b4d7e2','#f5ddff','#d8d4f3'],
    king:['#2b2036','#70485f','#b97c91','#ffe1aa','#d7a9ad'],hollow:['#242837','#6a656f','#b59b7c','#f0d5a7','#cabda6'],
    astral:['#293c51','#718da7','#cad8d8','#fff1cc','#d5c7dd'],cometqueen:['#38243e','#9d6689','#e0aac0','#ffe3bc','#f3d3bf'],
    constellation:['#222d4a','#697b9d','#bdcce4','#ffdcf2','#ecdee8'],knight:['#252b40','#778097','#b8c2c9','#f6d9a2','#d7d6ca'],
    golem:['#27243a','#5f596e','#9e849b','#ffb4a9','#c4a29b'],shade:['#211e36','#625978','#a09abd','#cfc9ff','#c4bbd9'],
    default:['#243346','#638395','#b1cbd0','#e6edbf','#d2d6c1']
  };
  function palette(id){const a=PALETTES[id]||PALETTES.default;return {dark:a[0],body:a[1],edge:a[2],glow:a[3],skin:a[4],ink:'#121b2b',gold:'#d0ac72'};}
  function box(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
  function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach((p,i)=>i?c.lineTo(Math.round(p[0]),Math.round(p[1])):c.moveTo(Math.round(p[0]),Math.round(p[1])));c.closePath();c.fill();}
  function seg(c,a,b,width,color){const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,ox=-dy/l*width*.5,oy=dx/l*width*.5;poly(c,[[a[0]+ox,a[1]+oy],[b[0]+ox,b[1]+oy],[b[0]-ox,b[1]-oy],[a[0]-ox,a[1]-oy]],color);}
  function joint(c,a,b,d,width,p,rear=false){seg(c,a,b,width+3,p.ink);seg(c,b,d,width+2,p.ink);seg(c,a,b,width,rear?p.dark:p.body);seg(c,b,d,width-1,rear?p.body:p.edge);box(c,b[0]-2,b[1]-2,4,4,p.edge);}
  function gem(c,x,y,r,color){poly(c,[[x,y-r],[x+r*.65,y],[x,y+r],[x-r*.65,y]],color);}
  function disk(c,x,y,r,color){for(let yy=-r;yy<r;yy+=2){const xx=Math.sqrt(Math.max(0,r*r-yy*yy));box(c,x-xx,y+yy,xx*2,2,color);}}
  function eye(c,x,y,p,angry=true){box(c,x-3,y-2,7,5,p.ink);box(c,x-2,y-1,5,2,angry?p.glow:p.dark);box(c,x+1,y-1,1,2,'#fff4de');}
  function motion(pose){
    const action=pose.action||{},stage=action.stage||'',q=clamp(n(action.progress),0,1),still=!!pose.still;
    const moving=still?0:clamp(n(pose.moving),0,1),phase=still?0:n(pose.phase),time=still?0:n(pose.time);
    let coil=0,release=0,recover=0;
    // Stage endpoints share the same pose: raise, hold, commit, then settle.
    // The long held anticipation makes a delayed swing readable without a
    // second animation clock drifting away from the collision simulation.
    if(stage==='windup'){coil=ease(q/.58);}
    else if(stage==='active'){release=ease(q/.58);coil=1-release;}
    else if(stage==='recovery'){recover=1-ease((q-.14)/.86);release=recover;}
    else if(pose.mode==='chant')coil=.7;
    else if(pose.mode==='cast'){const cp=n(pose.castProgress);coil=1-ease(cp/.28);release=ease((cp-.2)/.16)*(1-ease((cp-.62)/.38));}
    const hit=clamp(n(pose.hitRecoil,pose.mode==='hurt'?1-ease(n(pose.hurtProgress)):0),0,1);
    // A hit adds a small recoil to a committed attack; only an actual stagger
    // changes the action. This keeps damage feedback from faking an interrupt.
    const stagger=Math.max(stage==='stagger'?1-ease(q):0,hit*(stage&&stage!=='stagger'?.38:1));
    const fall=pose.mode==='fallen'?ease(n(pose.hurtProgress)):0;
    return {stage,q,time,phase,moving,coil,release,recover,stagger,fall,still,
      melee:action.kind==='melee'||action.kind==='charge',style:action.motion||(action.kind==='charge'?'charge':'sweep'),step:Math.sin(phase)*moving,
      bob:still?0:Math.sin(time*2)*.6-Math.abs(Math.sin(phase))*moving*1.4,
      flutter:still?0:Math.sin(time*2.8-phase*.3)*1.3+moving*Math.sin(phase-.8)*2,
      lean:.05*moving-.12*coil+.2*release-.15*stagger+.56*fall,
      directionX:Math.abs(clamp(n(pose.facingX,1),-1,1)),directionY:clamp(n(pose.facingY),-1,1),back:n(pose.facingY)<-.45};
  }
  function bodyPoint(m,x,y){return [x-y*m.lean,y*(1-m.fall*.68)+m.bob+m.coil*1.5];}
  function aura(c,x,y,r,power,color){if(power<=0)return;c.save();c.globalAlpha*=.13*power;disk(c,x,y,r,color);c.globalAlpha*=2;gem(c,x,y,r*.7,color);c.restore();}
  function armPose(m,side,wide=15){
    const shoulder=bodyPoint(m,side*wide,-49),rear=side<0;
    const idle=[side*(wide+6)-m.step*4,-29+(rear?m.step*3:-m.step*3)];
    let wind=rear?[-wide-8,-62]:[wide-19,-75];
    let attack=rear?[-wide-7,-42]:[wide+24,-37+m.directionY*12];
    if(m.melee&&!rear){
      const reach=.45+m.directionX*.55;
      if(m.style==='overhead'){wind=[wide-15,-81];attack=[wide+18*reach,-22+m.directionY*15];}
      else if(m.style==='thrust'){wind=[wide-8,-41];attack=[wide+38*reach,-44+m.directionY*22];}
      else if(m.style==='charge'){wind=[wide+2,-43];attack=[wide+23*reach,-35+m.directionY*16];}
      else if(m.style==='claw'){wind=[wide-14,-64];attack=[wide+28*reach,-25+m.directionY*18];}
      else{wind=[-wide-8,-52];attack=[wide+30*reach,-39+m.directionY*18];}
    }
    const wrist=bodyPoint(m,mix(idle[0],wind[0],m.coil)+m.release*(attack[0]-idle[0]),mix(idle[1],wind[1],m.coil)+m.release*(attack[1]-idle[1])+m.stagger*11+m.fall*13);
    const elbow=[mix(shoulder[0],wrist[0],.5)+side*(8-m.coil*3),mix(shoulder[1],wrist[1],.5)+7-m.release*5];
    return {shoulder,elbow,wrist};
  }
  function leg(c,m,p,side,wide=8,armour=false){
    const stride=m.step*side,hip=bodyPoint(m,side*wide,-23),foot=[side*wide+stride*8+m.fall*side*13, -Math.max(0,stride)*5+m.fall*2];
    const knee=[mix(hip[0],foot[0],.5)+stride*4+m.coil*2,mix(hip[1],foot[1],.5)-Math.max(0,stride)*3];
    joint(c,hip,knee,foot,armour?9:6,p,side<0);box(c,foot[0]-4,foot[1]-5,11,6,p.dark);box(c,foot[0]-3,foot[1]-5,5,2,p.edge);box(c,foot[0]-3,foot[1],10,1,p.gold);
  }
  function weapon(c,at,angle,id,p,m){
    const axis=[Math.sin(angle),-Math.cos(angle)],side=[Math.cos(angle),Math.sin(angle)];
    const A=(d,s=0)=>[at[0]+axis[0]*d+side[0]*s,at[1]+axis[1]*d+side[1]*s];
    if(id==='scroll'){
      poly(c,[A(-3,-9),A(19,-9),A(19,12),A(-3,12)],'#e8d8b8');seg(c,A(-5,-11),A(21,-11),4,p.gold);seg(c,A(-5,13),A(21,13),4,p.gold);
      for(let i=0;i<3;i++)seg(c,A(2+i*5,-5),A(2+i*5,8),1,p.body);
      return;
    }
    if(id==='lantern'){
      seg(c,A(0),A(-10),2,p.gold);const q=A(-17);box(c,q[0]-9,q[1]-8,18,18,p.dark);box(c,q[0]-6,q[1]-6,12,12,p.glow);box(c,q[0]-2,q[1]-6,4,12,'#f8ffe2');box(c,q[0]-11,q[1]-10,22,3,p.gold);box(c,q[0]-11,q[1]+8,22,3,p.gold);aura(c,q[0],q[1],22,.5+m.coil,p.glow);return;
    }
    const length=id==='greatsword'?63:id==='spear'||id==='oar'?49:id==='hammer'?34:35;
    seg(c,A(-13),A(length),5,p.ink);seg(c,A(-12),A(length),3,p.gold);seg(c,A(-5),A(5),4,p.dark);
    if(id==='sword'||id==='spear'||id==='greatsword'){
      const breadth=id==='greatsword'?8:4;
      poly(c,[A(12,-breadth),A(length+12),A(12,breadth+1),A(8)],p.edge);poly(c,[A(12),A(length+12),A(12,breadth)],p.glow);seg(c,A(8,-12),A(8,12),3,p.gold);
      if(id==='greatsword'){seg(c,A(16),A(length-5),2,p.gold);gem(c,...A(-10),5,p.glow);}
    }else if(id==='hammer'){
      poly(c,[A(25,-16),A(43,-16),A(43,16),A(25,16)],p.ink);poly(c,[A(27,-14),A(41,-14),A(41,14),A(27,14)],p.body);seg(c,A(39,-14),A(39,14),4,p.edge);gem(c,...A(33),5,p.glow);
    }else if(id==='oar'){
      poly(c,[A(30,-5),A(54,-7),A(58),A(54,7),A(30,5)],p.edge);seg(c,A(33),A(54),2,p.gold);
    }else if(id==='scales'){
      const q=A(30);seg(c,[q[0]-15,q[1]],[q[0]+15,q[1]],3,p.gold);for(const s of[-1,1]){const sway=m.flutter*1.3+m.release*4;seg(c,[q[0]+s*14,q[1]],[q[0]+s*14+sway,q[1]+12],1,p.edge);poly(c,[[q[0]+s*14-6+sway,q[1]+12],[q[0]+s*14+6+sway,q[1]+12],[q[0]+s*14+sway,q[1]+17]],p.gold);}
    }else if(id==='mirror'){
      gem(c,...A(37),13,p.gold);gem(c,...A(37),10,'#8caac4');seg(c,A(31,-3),A(43,3),2,'#e5e9ff');
    }else{gem(c,...A(36),9,p.ink);gem(c,...A(36),7,p.glow);gem(c,...A(36),3,'#fff8dd');}
    if(m.coil>0||m.stage==='active')aura(c,...A(length),19,m.coil+m.release*.7,p.glow);
    if(m.stage==='active'&&m.melee&&!m.still){
      c.save();c.globalAlpha*=.45*(1-m.q*.55);for(let i=0;i<3;i++){const aa=angle-.18-i*.14;seg(c,[at[0]+Math.sin(aa)*12,at[1]-Math.cos(aa)*12],[at[0]+Math.sin(aa)*(length+7),at[1]-Math.cos(aa)*(length+7)],2+i,p.glow);}c.restore();
    }
  }
  function humanoid(c,id,m,p,actor){
    const armour=['king','smith','sentinel','knight','golem'].includes(id),wide=id==='smith'||id==='golem'?20:id==='king'?18:14;
    const B=(x,y)=>bodyPoint(m,x,y),head=B(0,-66),left=armPose(m,-1,wide),right=armPose(m,1,wide);
    if(id==='cometqueen'||id==='constellation'){
      for(const s of[-1,1]){const flutter=m.flutter*2+Math.sin(m.time+s)*2;
        poly(c,[B(s*10,-55),B(s*(37+m.coil*9),-75-m.coil*12),B(s*(43+flutter),-28),B(s*21,-36),B(s*(33+flutter),-8),B(s*8,-16)],p.dark);
        seg(c,B(s*17,-52),B(s*(38+flutter),-19),2,p.edge);gem(c,...B(s*(34+flutter),-24),4,p.glow);
      }
    }
    if(id==='king'){
      for(const s of[-1,1]){
        const fold=s*(24+m.flutter*2+m.release*10);
        poly(c,[B(s*13,-56),B(s*29,-47),B(fold+7*s,-2),B(s*9,-10),B(s*5,-35)],p.ink);
        poly(c,[B(s*16,-53),B(s*26,-46),B(fold+3*s,-6),B(s*12,-12),B(s*8,-35)],'#713c59');
        seg(c,B(s*27,-46),B(fold+3*s,-6),2,p.gold);
      }
    }
    if(id==='lantern')wings(c,m,p,B(0,-47),37,true);
    leg(c,m,p,-1,armour?10:7,armour);leg(c,m,p,1,armour?10:7,armour);
    const robe=!['king','smith','knight','golem','sentinel'].includes(id),hem=robe?-7:-19;
    if(robe){for(const s of[-1,1])poly(c,[B(s*8,-43),B(s*19,-29),B(s*(23+m.flutter),hem),B(s*9,hem-4),B(s*3,-24)],p.dark);}
    joint(c,left.shoulder,left.elbow,left.wrist,armour?11:7,p,true);
    poly(c,[B(-wide,-52),B(wide,-52),B(wide-2,-29),B(wide+4,hem),B(-wide-4,hem),B(-wide+2,-29)],p.ink);
    poly(c,[B(-wide+2,-50),B(wide-2,-50),B(wide-3,-28),B(wide+1,hem-2),B(-wide+1,hem-2),B(-wide+3,-28)],p.body);
    poly(c,[B(-wide+3,-49),B(-3,-44),B(-3,hem-3),B(-wide+1,hem-3)],p.edge);
    poly(c,[B(4,-46),B(wide-3,-48),B(wide-4,hem-3),B(5,hem-3)],p.dark);
    seg(c,B(-wide+1,-28),B(wide,-28),4,p.gold);gem(c,...B(1,-40),5,p.glow);
    if(id==='smith'){poly(c,[B(-12,-48),B(13,-48),B(16,-14),B(-15,-14)],'#bc8668');box(c,...B(-6,-31),13,10,'#594554');}
    if(id==='merchant'){poly(c,[B(5,-31),B(23,-29),B(25,-12),B(8,-10)],'#d5ad74');gem(c,...B(17,-22),5,'#ffe1a2');}
    if(id==='golem'){for(let i=0;i<3;i++){seg(c,B(-11,-45+i*9),B(10,-39+i*8),2,p.glow);}for(const s of[-1,1])poly(c,[B(s*17,-56),B(s*29,-45),B(s*24,-32),B(s*14,-40)],p.edge);}
    if(id==='king'||id==='sentinel'||id==='knight'){poly(c,[B(-wide,-51),B(0,-42),B(wide,-51),B(wide-3,-31),B(0,-23),B(-wide+3,-31)],p.edge);seg(c,B(0,-42),B(0,-25),2,p.gold);}
    if(id==='hollow'){
      const q=B(0,-29);poly(c,[[q[0]-12,q[1]-16],[q[0]+12,q[1]-16],[q[0]+20,q[1]+12],[q[0]-20,q[1]+12]],'#9a866b');seg(c,[q[0]-21,q[1]+12],[q[0]+21,q[1]+12],4,'#d7bb83');const swing=(m.coil*-5+m.release*11+m.flutter);joint(c,[q[0],q[1]-8],[q[0]+swing*.5,q[1]+6],[q[0]+swing,q[1]+18],3,p);disk(c,q[0]+swing,q[1]+18,4,p.glow);
    }
    // The skull/face is independent of the robe and arms, with side/back views.
    const hx=head[0]+m.release*2-m.stagger*4,hy=head[1]+m.coil*2+m.stagger*3;
    box(c,hx-11,hy-10,23,23,p.ink);box(c,hx-9,hy-9,19,18,m.back?p.body:p.skin);box(c,hx+6,hy-7,4,16,p.dark);
    if(!m.back){eye(c,hx-5,hy,p,!!actor.boss);eye(c,hx+5,hy,p,!!actor.boss);box(c,hx-2,hy+7,5,1,p.dark);}
    if(id==='witch'){
      box(c,hx-11,hy-11,22,7,p.edge);box(c,hx-9,hy+8,18,5,p.edge);for(let i=0;i<3;i++)box(c,hx-6+i*5,hy+8,2,4,p.dark);
      for(let i=0;i<5;i++){box(c,hx-17+i*8,hy-23-(i%2?0:4),4,16,p.gold);}seg(c,[hx-19,hy-13],[hx+19,hy-13],5,p.gold);
    }else if(id==='hollow'||id==='ferryman'||id==='shade'||id==='merchant'){
      poly(c,[[hx-17,hy+9],[hx-15,hy-14],[hx,hy-26],[hx+17,hy-12],[hx+19,hy+11],[hx+9,hy+5],[hx+8,hy-8],[hx-8,hy-8],[hx-10,hy+8]],p.body);
      seg(c,[hx-14,hy-13],[hx,hy-25],2,p.edge);
    }else if(id==='healer'){
      poly(c,[[hx-29,hy-6],[hx-24,hy-20],[hx-10,hy-30],[hx+10,hy-30],[hx+25,hy-20],[hx+29,hy-6]],'#b8758d');box(c,hx-30,hy-7,60,5,'#eac2b6');for(const s of[-1,1])box(c,hx+s*14-4,hy-20,8,5,'#f4ddb9');
    }else if(id==='echo'||id==='cartographer'){
      poly(c,[[hx-24,hy-11],[hx-6,hy-38],[hx+7,hy-30],[hx+18,hy-11]],p.body);seg(c,[hx-27,hy-10],[hx+27,hy-10],5,p.edge);gem(c,hx+5,hy-22,4,p.glow);
      if(id==='cartographer'&&!m.back){box(c,hx+1,hy-4,12,9,p.gold);box(c,hx+4,hy-2,6,5,'#98bbc8');}
    }else if(['king','smith','knight','golem','sentinel'].includes(id)){
      poly(c,[[hx-15,hy+5],[hx-14,hy-14],[hx,hy-22],[hx+14,hy-14],[hx+16,hy+5]],p.body);seg(c,[hx-12,hy-7],[hx+12,hy-7],3,p.edge);box(c,hx-11,hy-1,23,6,p.dark);if(!m.back){eye(c,hx-6,hy+1,p);eye(c,hx+6,hy+1,p);}seg(c,[hx,hy-17],[hx,hy-3],2,p.gold);
      if(id==='king'){for(let i=0;i<5;i++){const x=hx-16+i*8;poly(c,[[x-3,hy-15],[x,hy-30-(i===2?7:0)],[x+4,hy-15]],p.gold);}seg(c,[hx-19,hy-16],[hx+20,hy-16],4,p.glow);gem(c,hx,hy-20,4,'#f6adc7');}
    }else if(id==='lantern'){
      box(c,hx-14,hy-12,28,6,p.body);for(const s of[-1,1]){seg(c,[hx+s*6,hy-12],[hx+s*17,hy-24+m.flutter],2,p.edge);gem(c,hx+s*17,hy-24+m.flutter,3,p.glow);}
    }else if(id==='cometqueen'||id==='constellation'){
      for(const s of[-1,1])poly(c,[[hx+s*8,hy-10],[hx+s*17,hy+2],[hx+s*(17+m.flutter),hy+27],[hx+s*8,hy+17]],p.edge);
      for(let i=0;i<5;i++){const xx=hx-17+i*8;gem(c,xx,hy-18-(i===2?7:0),6,p.gold);}gem(c,hx,hy-23,5,p.glow);
    }
    joint(c,right.shoulder,right.elbow,right.wrist,armour?11:7,p);
    for(const wrist of[left.wrist,right.wrist]){box(c,wrist[0]-3,wrist[1]-3,6,6,p.skin);box(c,wrist[0]+1,wrist[1]-2,2,4,p.edge);}
    if(id==='sentinel'||id==='knight'){
      const q=left.wrist;poly(c,[[q[0]-12,q[1]-15],[q[0]+8,q[1]-15],[q[0]+11,q[1]+9],[q[0]-1,q[1]+18],[q[0]-14,q[1]+5]],p.dark);poly(c,[[q[0]-9,q[1]-12],[q[0]+5,q[1]-12],[q[0]+8,q[1]+7],[q[0]-1,q[1]+13],[q[0]-10,q[1]+3]],p.edge);gem(c,q[0]-1,q[1],7,p.gold);
    }
    const tool=id==='king'?'greatsword':id==='smith'?'hammer':id==='sentinel'?'spear':id==='knight'||id==='golem'?'sword':id==='merchant'?'scales':id==='ferryman'?'oar':id==='cartographer'?'scroll':id==='echo'?'mirror':id==='lantern'?'lantern':'staff';
    let angle=-.1-m.coil*.85+m.release*1.05;
    if(m.melee){
      const direction=Math.atan2(m.directionX,-m.directionY);
      const strike=direction+(m.style==='overhead'?.48:m.style==='sweep'?.4:0);
      const wind=m.style==='overhead'?-.22:m.style==='thrust'?direction-.35:m.style==='charge'?direction-.25:direction-2.15;
      angle=-.1+m.coil*(wind+.1)+m.release*(strike+.1);
    }
    angle+=m.step*.05+m.fall*.6;
    weapon(c,right.wrist,angle,tool,p,m);
    if(m.coil>0&&!m.melee)aura(c,left.wrist[0],left.wrist[1],13+m.coil*8,m.coil,p.glow);
  }
  function wings(c,m,p,root,width,moth=false){
    for(const s of[-1,1]){
      const flap=(m.still?0:Math.sin(m.time*5))*5+m.coil*14-m.release*19-m.fall*20;
      const elbow=[root[0]+s*width*.55,root[1]-22-flap],tip=[root[0]+s*width,root[1]-34-flap*.6];
      poly(c,[root,elbow,tip,[tip[0]-s*5,root[1]+9],[root[0]+s*width*.56,root[1]-3],[root[0]+s*width*.35,root[1]+20]],p.dark);
      poly(c,[[root[0]+s*5,root[1]],elbow,[tip[0]-s*5,tip[1]+7],[root[0]+s*width*.62,root[1]-5],[root[0]+s*width*.4,root[1]+12]],p.body);
      joint(c,root,elbow,tip,3,p,s<0);seg(c,elbow,[root[0]+s*width*.42,root[1]+13],2,p.edge);
      if(moth){gem(c,root[0]+s*width*.68,root[1]-10-flap*.2,8,p.glow);gem(c,root[0]+s*width*.66,root[1]-10-flap*.2,4,p.dark);}
    }
  }
  function tree(c,m,p,actor){
    const B=(x,y)=>bodyPoint(m,x,y);
    for(const s of[-1,1])for(let i=0;i<2;i++){
      const root=B(s*(9+i*7),-17),knee=[s*(26+i*8)+m.step*s*4,-5-Math.max(0,m.step*s)*5],foot=[s*(35+i*10)+m.step*s*6,2];joint(c,root,knee,foot,8-i*2,p,s<0);
    }
    for(const s of[-1,1]){
      const shoulder=B(s*21,-59),elbow=B(s*(40-m.coil*6+m.release*10),-71-m.coil*18+m.release*18),wrist=B(s*(55-m.coil*10+m.release*15),-53-m.coil*22+m.release*22);
      joint(c,shoulder,elbow,wrist,11,p,s<0);for(let i=0;i<3;i++){const tip=[wrist[0]+s*(10+i*3),wrist[1]+(i-1)*12+m.release*8];seg(c,wrist,tip,4,p.edge);gem(c,...tip,3,p.glow);}
    }
    poly(c,[B(-25,-79),B(22,-80),B(30,-23),B(17,-7),B(-18,-7),B(-29,-24)],p.ink);
    poly(c,[B(-21,-79),B(17,-78),B(25,-21),B(13,-10),B(-15,-10),B(-25,-24)],p.body);
    for(let i=0;i<4;i++){seg(c,B(-17+i*10,-72),B(-20+i*11,-27),i===2?4:2,i%2?p.dark:p.edge);}
    for(const s of[-1,1]){
      const root=B(s*12,-77),branch=B(s*25,-100-m.coil*3),tip=B(s*42,-111+m.flutter);joint(c,root,branch,tip,6,p,s<0);seg(c,branch,B(s*20,-120),4,p.edge);
      disk(c,...B(s*30,-102),17,p.dark);disk(c,...B(s*28,-106),12,'#598668');box(c,...B(s*31-4,-113),9,3,'#9bc28b');
    }
    const face=B(0,-59);eye(c,face[0]-9,face[1],p);eye(c,face[0]+9,face[1],p);box(c,face[0]-10,face[1]+16,20,6,p.dark);gem(c,...B(0,-28),9,p.glow);aura(c,...B(0,-28),25,m.coil,p.glow);
    if(actor.phase>1){for(const s of[-1,1])gem(c,...B(s*31,-83),8,p.glow);}
  }
  function mushroom(c,m,p,boss){
    const B=(x,y)=>bodyPoint(m,x,y),size=boss?1:.63;
    c.save();c.scale(size,size);
    for(const s of[-1,1])for(let i=0;i<(boss?3:1);i++){
      const root=B(s*(9+i*4),-33),bend=B(s*(22+i*9)+Math.sin(m.phase+i)*m.moving*5,-19-m.coil*13),tip=B(s*(28+i*13)+m.release*10,-3-Math.max(0,m.step*s)*5);
      joint(c,root,bend,tip,7-i,p,s<0);gem(c,...tip,4,p.glow);
    }
    poly(c,[B(-16,-58),B(17,-58),B(23,-15),B(10,-7),B(-14,-7),B(-24,-17)],p.dark);
    poly(c,[B(-12,-57),B(12,-57),B(17,-17),B(-16,-15)],p.skin);seg(c,B(-5,-50),B(-6,-18),4,p.edge);
    const face=B(0,-38);eye(c,face[0]-7,face[1],p);eye(c,face[0]+7,face[1],p);
    const cap=B(m.stagger*-6,-65-m.coil*8+m.release*5);
    poly(c,[[cap[0]-45,cap[1]+9],[cap[0]-39,cap[1]-9],[cap[0]-24,cap[1]-22],[cap[0],cap[1]-30],[cap[0]+27,cap[1]-21],[cap[0]+42,cap[1]-5],[cap[0]+46,cap[1]+10]],p.ink);
    poly(c,[[cap[0]-41,cap[1]+6],[cap[0]-35,cap[1]-10],[cap[0]-20,cap[1]-23],[cap[0]+1,cap[1]-26],[cap[0]+25,cap[1]-18],[cap[0]+40,cap[1]-3],[cap[0]+42,cap[1]+6]],p.body);
    box(c,cap[0]-42,cap[1]+5,85,6,p.edge);for(let i=0;i<7;i++)seg(c,[cap[0]-30+i*10,cap[1]+12],[cap[0]-21+i*7,cap[1]+19],2,p.dark);
    for(const [x,y,r]of[[-22,-8,7],[2,-17,8],[26,-5,6]]){disk(c,cap[0]+x,cap[1]+y,r,p.glow);box(c,cap[0]+x-2,cap[1]+y-3,3,3,'#fff3d5');}
    if(boss){for(let i=0;i<5;i++)gem(c,cap[0]-19+i*10,cap[1]-27-(i===2?8:0),6,p.glow);for(const s of[-1,1]){const elbow=B(s*34,-53-m.coil*16),hand=B(s*(43+m.release*15),-37-m.coil*28);joint(c,B(s*16,-46),elbow,hand,5,p,s<0);aura(c,...hand,18,m.coil,p.glow);}}
    c.restore();
  }
  function beast(c,id,m,p,actor){
    const B=(x,y)=>bodyPoint(m,x,y),prism=id==='prism',astral=id==='astral';
    if(!prism)wings(c,m,p,B(0,-55),astral?70:64);
    else for(const s of[-1,1])for(let i=0;i<3;i++){
      const start=B(s*12,-44),tip=B(s*(39+i*9+m.coil*10),-76+i*17-m.release*10),base=B(s*(30+i*6),-31+i*8);
      poly(c,[start,tip,base],p.ink);poly(c,[[start[0]+s*3,start[1]],[tip[0]-s*3,tip[1]+5],[base[0],base[1]-3]],i%2?p.edge:p.body);seg(c,start,tip,1,p.glow);
    }
    // Rear legs, a two-joint tail, then torso and front claws.
    const tailBase=B(21,-27),tailMid=B(48,-12+m.flutter),tailTip=B(62,-29+m.flutter*2-m.coil*11);joint(c,tailBase,tailMid,tailTip,8,p,true);gem(c,...tailTip,prism?11:8,p.glow);
    for(const s of[-1,1]){const stride=m.step*s,hip=B(s*19,-28),knee=B(s*28+stride*3,-13),ankle=[s*29+stride*7,-Math.max(0,stride)*5];joint(c,hip,knee,ankle,12,p,s<0);for(let i=0;i<3;i++)poly(c,[[ankle[0]-10+i*7,ankle[1]-3],[ankle[0]-7+i*7,ankle[1]+4],[ankle[0]-4+i*7,ankle[1]-3]],p.skin);}
    poly(c,[B(-23,-64),B(20,-65),B(31,-30),B(16,-14),B(-17,-14),B(-31,-31)],p.ink);
    poly(c,[B(-20,-62),B(17,-62),B(26,-31),B(13,-17),B(-14,-17),B(-26,-31)],p.body);
    poly(c,[B(-8,-58),B(11,-58),B(13,-21),B(-9,-21)],p.edge);for(let i=0;i<4;i++)seg(c,B(-7,-50+i*8),B(12,-49+i*8),2,p.dark);
    for(const s of[-1,1]){
      const shoulder=B(s*21,-55),elbow=B(s*(33-m.coil*7+m.release*10),-43-m.coil*20),wrist=B(s*(28-m.coil*13+m.release*24),-23-m.coil*29+m.release*7);
      joint(c,shoulder,elbow,wrist,10,p,s<0);for(let i=0;i<3;i++)poly(c,[[wrist[0]-6+i*5,wrist[1]-1],[wrist[0]-3+i*5+m.release*8,wrist[1]+10],[wrist[0]-1+i*5,wrist[1]-2]],p.skin);
      if(m.stage==='active'&&!m.still){c.save();c.globalAlpha*=.55;for(let i=0;i<3;i++)seg(c,[wrist[0]+s*(i*5+4),wrist[1]-15],[wrist[0]+s*(i*5+17),wrist[1]+12],2,p.glow);c.restore();}
    }
    const head=B(-4+m.release*8-m.coil*5,-78+m.coil*4),jaw=4+m.coil*3+m.release*12;
    poly(c,[[head[0]-18,head[1]-13],[head[0]+17,head[1]-12],[head[0]+21,head[1]+10],[head[0]-20,head[1]+13],[head[0]-27,head[1]+4]],p.ink);
    poly(c,[[head[0]-15,head[1]-11],[head[0]+14,head[1]-9],[head[0]+17,head[1]+7],[head[0]-20,head[1]+9],[head[0]-24,head[1]+1]],p.body);
    poly(c,[[head[0]-22,head[1]+12+jaw*.2],[head[0]+10,head[1]+12+jaw*.2],[head[0]+7,head[1]+15+jaw],[head[0]-19,head[1]+15+jaw]],p.edge);
    eye(c,head[0]-10,head[1],p);eye(c,head[0]+11,head[1]-4,p);
    for(const s of[-1,1]){poly(c,[[head[0]+s*9,head[1]-10],[head[0]+s*20,head[1]-29],[head[0]+s*16,head[1]-8]],p.skin);gem(c,head[0]+s*21,head[1]-1,prism?7:4,p.edge);}
    gem(c,...B(0,-39),8,p.glow);aura(c,head[0]-17,head[1]+12,22,m.coil,p.glow);
    if(actor.phase>1)for(let i=0;i<3;i++)gem(c,...B(-9+i*9,-105-(i===1?6:0)),6,p.glow);
  }
  function smallCreature(c,id,m,p){
    const B=(x,y)=>bodyPoint(m,x,y);
    if(['moth','raven','starling'].includes(id)){
      const q=B(0,-24);wings(c,m,p,q,id==='moth'?30:34,id==='moth');
      poly(c,[B(-8,-38),B(8,-39),B(12,-20),B(0,-9),B(-12,-21)],p.body);poly(c,[B(-5,-21),B(4,-19),B(9,-3),B(-3,-8),B(-8,-4)],p.edge);
      const head=B(m.coil*-3+m.release*6,-38);disk(c,...head,10,p.dark);eye(c,head[0]+4,head[1],p);poly(c,[[head[0]+8,head[1]],[head[0]+19,head[1]+3],[head[0]+9,head[1]+7]],p.gold);
      for(const s of[-1,1])joint(c,B(s*4,-15),B(s*8,-8),B(s*11,0),2,p,s<0);return;
    }
    if(id==='astrolabe'){
      for(const s of[-1,1])joint(c,B(s*9,-23),B(s*22,-15-m.step*s*6),[s*25+m.step*s*7,0],5,p,s<0);
      const q=B(0,-30);for(let ring=0;ring<3;ring++){const angle=(m.still?0:m.time*(ring%2?-1:1))+ring;for(let i=0;i<6;i++){const a=i*TAU/6+angle,b=(i+1)*TAU/6+angle,r=22-ring*4+m.coil*5;seg(c,[q[0]+Math.cos(a)*r,q[1]+Math.sin(a)*r*.6],[q[0]+Math.cos(b)*r,q[1]+Math.sin(b)*r*.6],2,ring===1?p.glow:p.edge);}}gem(c,...q,12,p.glow);gem(c,...q,6,p.body);return;
    }
    if(id==='spider'){
      for(const s of[-1,1])for(let i=0;i<4;i++)joint(c,B(s*7,-20),B(s*(22+i*3),-25+i*6-m.coil*10),[s*(29+i*3)+Math.sin(m.phase+i)*m.moving*5,Math.max(0,Math.sin(m.phase+i))*-4*m.moving],3,p,s<0);
      disk(c,...B(0,-27),17,p.dark);disk(c,...B(0,-15),12,p.body);eye(c,...B(-5,-16),p);eye(c,...B(5,-16),p);return;
    }
    if(id==='eye'||id==='wisp'||id==='stardust'){
      const q=B(0,-31-m.coil*4);for(let i=0;i<5;i++){const xx=(i-2)*6,sway=Math.sin(m.time*2.4+i)*3;const root=[q[0]+xx,q[1]+9],knee=[q[0]+xx+sway,q[1]+20],tip=[q[0]+xx+sway*2+m.release*(i-2)*6,q[1]+28-m.coil*12];joint(c,root,knee,tip,3,p,i<2);}
      disk(c,...q,17+m.coil*2,p.dark);disk(c,q[0]-1,q[1]-2,14,p.body);
      if(id==='eye'){disk(c,q[0]+3+m.release*3,q[1],10,p.skin);disk(c,q[0]+5+m.release*3,q[1],6,p.body);box(c,q[0]+4+m.release*3,q[1]-6,3,12,p.ink);box(c,q[0]+4,q[1]-4,2,3,p.glow);}
      else{gem(c,...q,12,p.glow);gem(c,q[0]+1,q[1]-1,6,p.body);for(const s of[-1,1])gem(c,q[0]+s*22,q[1]-6+m.flutter,4,p.edge);}
      aura(c,...q,25,m.coil,p.glow);return;
    }
    // A slime deforms its outline and pseudopods independently during each stage.
    const squash=m.coil*7-m.release*4+m.fall*14,spread=m.coil*4+m.fall*8;
    const outline=[];for(let i=0;i<11;i++){const a=Math.PI+i*Math.PI/10,rr=23+Math.sin(m.time*3+i*.8)*1.2;outline.push([Math.cos(a)*(rr+spread)+m.release*7,Math.sin(a)*(rr-squash)-9+Math.sin(m.phase)*m.moving*2]);}
    outline.push([23+spread,1],[-23-spread,1]);poly(c,outline,p.dark);poly(c,outline.map(([x,y])=>[x*.85,y*.83-2]),p.body);
    for(const s of[-1,1]){const toe=[s*(19+spread)+m.step*s*4,0];joint(c,[s*12,-12],[s*22,-6-m.coil*2],toe,6,p,s<0);}eye(c,-6+m.release*7,-14+squash*.5,p);eye(c,7+m.release*7,-14+squash*.5,p);box(c,-10,-26+squash,8,3,p.edge);
  }
  function supports(id){return KNOWN.has(String(id||'').replace(/^npc-/,''));}
  function draw(c,pose={},actor={}){
    const id=String(actor.npcId||actor.sprite||actor.enemyId||actor.id||'slime').replace(/^npc-/,''),boss=actor.kind==='boss'||actor.boss;
    if(!supports(id))return false;
    const p=palette(id),m=motion(pose);c.save();
    try{
      if(n(pose.facingX,1)<-.08)c.scale(-1,1);
      const humanoids=NPC.has(id)||['king','witch','hollow','cometqueen','constellation','knight','shade','golem','skeleton'].includes(id);
      if(humanoids){const scale=boss?1.13:NPC.has(id)?1:['golem'].includes(id)?.78:.68;c.scale(scale,scale);humanoid(c,id,m,p,{...actor,boss});}
      else if(id==='thorn')tree(c,m,p,actor);
      else if(id==='spore'||id==='mushroom')mushroom(c,m,p,boss);
      else if(['astral','prism'].includes(id))beast(c,id,m,p,actor);
      else smallCreature(c,id,m,p);
      return true;
    }finally{c.restore();}
  }
  window.DungeonEnemyCharacter=Object.freeze({draw,supports});
})();
