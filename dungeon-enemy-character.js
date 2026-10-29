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
    slime:['#193b3d','#39766d','#83bba0','#ceefb1','#b6e4be'],moth:['#312b44','#786491','#c4adcb','#f4d4bd','#d8c4cf'],
    mushroom:['#3b2b39','#8f596b','#d8999b','#f6ddac','#dfcdb1'],wisp:['#253e4a','#5a9ba5','#b8e0d9','#eeffcf','#c2e6d8'],
    eye:['#402c44','#a36a89','#dca2bc','#ffd8bf','#e5cdd0'],raven:['#1f263c','#495776','#8a9bb2','#e4d4a8','#c4bead'],
    stardust:['#332d50','#8b78a2','#d2b5d5','#fff0bf','#ded0de'],starling:['#243c4c','#5f8ca7','#b5d4df','#ffebbd','#d0dfdd'],
    astrolabe:['#35333e','#91866e','#d9c299','#fff3c5','#c4b59b'],spider:['#382b3f','#8d657e','#c998ab','#efc194','#dcc5bd'],
    skeleton:['#302d3e','#9c929d','#d9d0c1','#fae5b7','#d8cbb4'],
    default:['#243346','#638395','#b1cbd0','#e6edbf','#d2d6c1']
  };
  function palette(id){const a=PALETTES[id]||PALETTES.default;return {dark:a[0],body:a[1],edge:a[2],glow:a[3],skin:a[4],ink:'#121b2b',gold:'#d0ac72'};}
  function box(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
  function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach((p,i)=>i?c.lineTo(Math.round(p[0]),Math.round(p[1])):c.moveTo(Math.round(p[0]),Math.round(p[1])));c.closePath();c.fill();}
  function seg(c,a,b,width,color){const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,ox=-dy/l*width*.5,oy=dx/l*width*.5;poly(c,[[a[0]+ox,a[1]+oy],[b[0]+ox,b[1]+oy],[b[0]-ox,b[1]-oy],[a[0]-ox,a[1]-oy]],color);}
  function joint(c,a,b,d,width,p,rear=false){seg(c,a,b,width+3,p.ink);seg(c,b,d,width+2,p.ink);seg(c,a,b,width,rear?p.dark:p.body);seg(c,b,d,width-1,rear?p.body:p.edge);box(c,b[0]-2,b[1]-2,4,4,p.edge);}
  function gem(c,x,y,r,color){poly(c,[[x,y-r],[x+r*.65,y],[x,y+r],[x-r*.65,y]],color);}
  function star(c,x,y,r,color){poly(c,[[x,y-r],[x+r*.28,y-r*.28],[x+r,y],[x+r*.28,y+r*.28],[x,y+r],[x-r*.28,y+r*.28],[x-r,y],[x-r*.28,y-r*.28]],color);}
  function rune(c,x,y,r,p,kind=0){
    const shapes=[[[0,-1],[.6,-.3],[-.6,.3],[0,1]],[[0,-1],[-.65,0],[.65,0],[0,1]],[[.5,-1],[-.5,-.3],[.5,.3],[-.5,1]]],shape=shapes[Math.abs(kind)%3];
    for(let i=1;i<shape.length;i++)seg(c,[x+shape[i-1][0]*r,y+shape[i-1][1]*r],[x+shape[i][0]*r,y+shape[i][1]*r],1,p.glow);
  }
  function chain(c,a,b,p,count=5){
    for(let i=0;i<count;i++){const t=i/(count-1),x=mix(a[0],b[0],t),y=mix(a[1],b[1],t)+Math.sin(t*Math.PI)*4;box(c,x-1,y-1,3,3,i%2?p.edge:p.gold);}
  }
  function plate(c,a,b,width,p,rear=false){
    seg(c,a,b,width+2,p.ink);seg(c,a,b,width,rear?p.dark:p.body);seg(c,[a[0]-width*.23,a[1]],[b[0]-width*.23,b[1]],2,p.edge);
    const mid=[mix(a[0],b[0],.52),mix(a[1],b[1],.52)];gem(c,...mid,Math.max(2,width*.22),p.gold);
  }
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
    else if(pose.mode==='intro')coil=.15+Math.sin(ease(n(pose.introProgress))*Math.PI)*.5;
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
      star(c,...A(10,2),5,p.gold);gem(c,...A(-5,-11),3,p.glow);gem(c,...A(21,13),3,p.glow);
      return;
    }
    if(id==='lantern'){
      seg(c,A(0),A(-10),2,p.gold);const q=A(-17);box(c,q[0]-9,q[1]-8,18,18,p.dark);box(c,q[0]-6,q[1]-6,12,12,p.glow);box(c,q[0]-2,q[1]-6,4,12,'#f8ffe2');box(c,q[0]-11,q[1]-10,22,3,p.gold);box(c,q[0]-11,q[1]+8,22,3,p.gold);for(const s of[-1,1])seg(c,[q[0]+s*6,q[1]-7],[q[0]+s*6,q[1]+7],2,p.body);poly(c,[[q[0]-10,q[1]-11],[q[0],q[1]-17],[q[0]+10,q[1]-11]],p.edge);gem(c,q[0],q[1]+13,4,p.glow);aura(c,q[0],q[1],22,.5+m.coil,p.glow);return;
    }
    const length=id==='greatsword'?63:id==='spear'||id==='oar'?49:id==='hammer'?34:35;
    seg(c,A(-13),A(length),5,p.ink);seg(c,A(-12),A(length),3,p.gold);seg(c,A(-5),A(5),4,p.dark);
    for(let i=0;i<3;i++)seg(c,A(-4+i*3,-2),A(-3+i*3,2),1,p.edge);
    gem(c,...A(-12),3,p.edge);
    if(id==='sword'||id==='spear'||id==='greatsword'){
      const breadth=id==='greatsword'?8:4;
      poly(c,[A(12,-breadth),A(length+12),A(12,breadth+1),A(8)],p.edge);poly(c,[A(12),A(length+12),A(12,breadth)],p.glow);seg(c,A(8,-12),A(8,12),3,p.gold);
      if(id==='greatsword'){seg(c,A(16),A(length-5),2,p.gold);gem(c,...A(-10),5,p.glow);for(let i=0;i<3;i++){const q=A(21+i*12);rune(c,...q,4,p,i);}poly(c,[A(10,-14),A(17,-11),A(11,-7)],p.edge);poly(c,[A(10,14),A(17,11),A(11,7)],p.edge);}
      if(id==='spear'){poly(c,[A(6,-4),A(18,-6),A(30,-3),A(17,-2)],p.gold);const q=A(12,7);poly(c,[q,[q[0]+m.flutter*2+8,q[1]+12],[q[0]+m.flutter*2+4,q[1]+23],[q[0]-2,q[1]+11]],p.body);seg(c,[q[0]+m.flutter*2+8,q[1]+12],[q[0]+m.flutter*2+4,q[1]+23],1,p.glow);}
    }else if(id==='hammer'){
      poly(c,[A(25,-16),A(43,-16),A(43,16),A(25,16)],p.ink);poly(c,[A(27,-14),A(41,-14),A(41,14),A(27,14)],p.body);seg(c,A(39,-14),A(39,14),4,p.edge);gem(c,...A(33),5,p.glow);seg(c,A(28,-12),A(28,12),2,p.gold);for(const s of[-1,1]){gem(c,...A(34,s*11),3,p.edge);seg(c,A(26,s*17),A(42,s*17),3,p.dark);}
    }else if(id==='oar'){
      poly(c,[A(30,-5),A(54,-7),A(58),A(54,7),A(30,5)],p.edge);seg(c,A(33),A(54),2,p.gold);for(let i=0;i<3;i++)seg(c,A(35+i*5,-3),A(37+i*5,3),1,p.dark);
    }else if(id==='scales'){
      const q=A(30);seg(c,[q[0]-15,q[1]],[q[0]+15,q[1]],3,p.gold);gem(c,q[0],q[1]-5,5,p.glow);for(const s of[-1,1]){const sway=m.flutter*1.3+m.release*4;seg(c,[q[0]+s*14,q[1]],[q[0]+s*14+sway,q[1]+12],1,p.edge);poly(c,[[q[0]+s*14-6+sway,q[1]+12],[q[0]+s*14+6+sway,q[1]+12],[q[0]+s*14+sway,q[1]+17]],p.gold);for(let i=0;i<2;i++)box(c,q[0]+s*14+sway-3+i*4,q[1]+9-i,4,2,p.glow);}
    }else if(id==='mirror'){
      gem(c,...A(37),13,p.gold);gem(c,...A(37),10,'#8caac4');seg(c,A(31,-3),A(43,3),2,'#e5e9ff');for(const s of[-1,1])gem(c,...A(37,s*8),3,p.glow);const q=A(37);eye(c,q[0],q[1]+1,p,false);
    }else if(id==='healerStaff'){
      const q=A(37);for(let i=0;i<5;i++){const a=i*TAU/5-.5;gem(c,q[0]+Math.cos(a)*8,q[1]+Math.sin(a)*8,6,i%2?p.skin:p.edge);}disk(c,...q,5,p.gold);gem(c,...q,3,p.glow);
    }else if(id==='witchStaff'){
      const q=A(39);poly(c,[[q[0]-12,q[1]-9],[q[0]-4,q[1]-17],[q[0]-5,q[1]-6],[q[0]+3,q[1]+1],[q[0]+12,q[1]-8],[q[0]+9,q[1]+8],[q[0]-3,q[1]+11],[q[0]-13,q[1]+2]],p.edge);gem(c,q[0]+2,q[1]-6,5,p.glow);chain(c,[q[0]-11,q[1]+5],[q[0]-15+m.flutter,q[1]+22],p,4);
    }else if(id==='bellStaff'){
      const q=A(38);poly(c,[[q[0]-6,q[1]-10],[q[0]+6,q[1]-10],[q[0]+12,q[1]+8],[q[0]-12,q[1]+8]],p.gold);seg(c,[q[0]-12,q[1]+8],[q[0]+12,q[1]+8],3,p.edge);gem(c,q[0]+m.flutter,q[1]+12,4,p.glow);rune(c,q[0],q[1],5,p);
    }else if(id==='cometSceptre'||id==='starSceptre'){
      const q=A(39);star(c,...q,14,p.ink);star(c,...q,11,p.gold);star(c,...q,7,p.glow);gem(c,...q,3,'#fff6e8');for(const s of[-1,1]){const tip=[q[0]+s*(13+m.coil*5),q[1]+m.flutter*2];gem(c,...tip,4,p.edge);if(id==='cometSceptre')seg(c,tip,[tip[0]+s*8-m.flutter,tip[1]+15],2,p.body);}
    }else{gem(c,...A(36),9,p.ink);gem(c,...A(36),7,p.glow);gem(c,...A(36),3,'#fff8dd');}
    if(m.coil>0||m.stage==='active')aura(c,...A(length),19,m.coil+m.release*.7,p.glow);
    if(m.stage==='active'&&m.melee&&!m.still){
      c.save();c.globalAlpha*=.45*(1-m.q*.55);for(let i=0;i<3;i++){const aa=angle-.18-i*.14;seg(c,[at[0]+Math.sin(aa)*12,at[1]-Math.cos(aa)*12],[at[0]+Math.sin(aa)*(length+7),at[1]-Math.cos(aa)*(length+7)],2+i,p.glow);}c.restore();
    }
  }
  // Costume pieces share the body's articulated anchors. Cloth remains secondary
  // motion; neither ornament nor weapon animation can start an attack by itself.
  function mantle(c,id,m,p,boss){
    const B=(x,y)=>bodyPoint(m,x,y),sway=m.flutter*(1-m.fall*.6);
    if(['healer','echo','witch','cometqueen','constellation'].includes(id)){
      for(const s of[-1,1]){
        poly(c,[B(s*7,-70),B(s*16,-66),B(s*(20+sway),-29),B(s*(14+sway*1.5),-12),B(s*10,-41)],p.dark);
        seg(c,B(s*12,-64),B(s*(16+sway),-26),3,p.edge);seg(c,B(s*15,-52),B(s*(17+sway),-31),1,p.glow);
      }
    }
    if(id==='merchant'){
      poly(c,[B(-20,-61),B(17,-63),B(25,-19),B(-25,-16)],p.ink);poly(c,[B(-18,-58),B(14,-60),B(21,-21),B(-22,-19)],'#705448');
      for(let i=0;i<3;i++){const q=B(-17+i*13,-61);seg(c,[q[0]-3,q[1]+8],[q[0]-3,q[1]-5],6,p.edge);box(c,q[0]-5,q[1]-8,4,3,p.gold);}chain(c,B(-25,-49),B(-28+sway,-20),p,6);
    }else if(id==='smith'){
      for(const s of[-1,1]){plate(c,B(s*16,-55),B(s*(27+sway*.4),-25),10,p,s<0);seg(c,B(s*23,-56),B(s*31,-72),5,p.dark);box(c,...B(s*31-3,-76),7,7,p.gold);}
    }else if(id==='cartographer'){
      const q=B(-16,-54);disk(c,q[0]-5,q[1]-4,13,p.ink);disk(c,q[0]-5,q[1]-4,10,p.gold);disk(c,q[0]-5,q[1]-4,7,p.dark);star(c,q[0]-5,q[1]-4,6,p.glow);
      for(let i=0;i<2;i++){const x=-23+i*8;poly(c,[B(x,-45),B(x+7,-44),B(x+9+sway,-12),B(x+4+sway,-7),B(x+sway,-13)],p.skin);seg(c,B(x+2,-39),B(x+3+sway,-19),1,p.body);}
    }else if(id==='ferryman'||id==='hollow'){
      for(const s of[-1,1]){poly(c,[B(s*10,-60),B(s*21,-53),B(s*(28+sway),-5),B(s*19,-13),B(s*(14+sway),-2),B(s*7,-40)],p.dark);seg(c,B(s*19,-51),B(s*(23+sway),-10),2,p.edge);chain(c,B(s*15,-52),B(s*(23+sway),-16),p,7);}
      if(id==='hollow'){for(const s of[-1,1])seg(c,B(s*20,-53),B(s*28,-84),5,p.gold);seg(c,B(-28,-84),B(28,-84),4,p.gold);for(let i=0;i<3;i++)rune(c,...B(-16+i*16,-81),3,p,i);}
    }else if(id==='sentinel'||id==='knight'||id==='king'){
      for(const s of[-1,1]){
        poly(c,[B(s*10,-53),B(s*24,-45),B(s*(27+sway),-3),B(s*(13+sway),-9)],p.dark);seg(c,B(s*23,-43),B(s*(26+sway),-5),2,p.gold);
        if(id==='sentinel')for(let i=0;i<3;i++)poly(c,[B(s*18,-42+i*10),B(s*25,-39+i*10),B(s*26,-29+i*10),B(s*20,-32+i*10)],i%2?p.body:p.edge);
      }
    }else if(id==='shade'){
      for(const s of[-1,1])poly(c,[B(s*9,-59),B(s*22,-46),B(s*(28+sway),-8),B(s*16,-20),B(s*(16+sway),-2),B(s*6,-30)],p.dark);
    }
    if(boss&&NPC.has(id)){
      // Challenge regalia is absent from the peaceful encounter's silhouette.
      for(const s of[-1,1]){
        const q=B(s*26,-53);poly(c,[[q[0]-s*7,q[1]+8],[q[0]+s*4,q[1]-8],[q[0]+s*13,q[1]+4],[q[0]+s*8,q[1]+15]],p.ink);seg(c,[q[0]-s*4,q[1]+6],[q[0]+s*5,q[1]-4],3,p.gold);rune(c,q[0]+s*5,q[1]+7,4,p,s+1);
      }
    }
  }
  function tailoring(c,id,m,p,boss,wide,hem){
    const B=(x,y)=>bodyPoint(m,x,y);
    for(const s of[-1,1]){
      seg(c,B(s*(wide-5),-45),B(s*(wide-3),hem-3),1,p.edge);
      seg(c,B(s*3,-44),B(s*7,hem-3),2,p.gold);
      for(let i=0;i<3;i++){const q=B(s*(wide-3),-43+i*7);box(c,q[0],q[1],2,2,p.gold);}
    }
    chain(c,B(-wide+3,-48),B(wide-3,-47),p,7);
    if(['king','knight','sentinel'].includes(id)){
      for(let i=0;i<3;i++){const y=-36+i*5;poly(c,[B(-wide+5,y),B(0,y+3),B(wide-5,y),B(wide-6,y+3),B(0,y+6),B(-wide+6,y+3)],i%2?p.body:p.dark);}
      star(c,...B(0,-43),id==='king'?6:4,p.gold);
      if(id==='king')for(const s of[-1,1]){plate(c,B(s*21,-52),B(s*24,-41),14,p,s<0);gem(c,...B(s*22,-48),5,p.glow);}
    }else if(id==='merchant'){
      seg(c,B(-11,-48),B(16,-22),4,'#614337');seg(c,B(-10,-48),B(17,-22),1,p.gold);
      for(let i=0;i<3;i++){const q=B(9+i*4,-20-i%2*3);disk(c,...q,3,p.gold);box(c,q[0],q[1]-1,1,2,p.glow);}rune(c,...B(-7,-36),4,p,1);
    }else if(id==='smith'){
      for(const s of[-1,1])seg(c,B(s*8,-48),B(s*8,-28),2,p.gold);
      for(let i=0;i<3;i++){const q=B(-5+i*5,-30);seg(c,q,[q[0],q[1]+12],2,p.dark);box(c,q[0]-1,q[1],3,4,p.edge);}
      poly(c,[B(-11,-16),B(-2,-20),B(8,-15),B(12,-18),B(13,-12),B(-12,-12)],'#e0b18b');
    }else if(id==='healer'){
      for(const s of[-1,1])for(let i=0;i<3;i++){const q=B(s*(8+i*3),-49+i*5);poly(c,[[q[0],q[1]-3],[q[0]+s*7,q[1]-6],[q[0]+s*4,q[1]+3]],i%2?p.edge:p.dark);}
      for(let i=0;i<3;i++){const q=B(-7+i*8,-24);box(c,q[0]-3,q[1],6,8,i%2?'#b88caa':'#83bbb1');box(c,q[0]-2,q[1]-3,4,3,p.gold);box(c,q[0]-1,q[1]+1,2,3,p.glow);}
    }else if(id==='cartographer'){
      poly(c,[B(-10,-35),B(11,-38),B(14,-19),B(-8,-17)],p.skin);seg(c,B(-6,-30),B(8,-33),1,p.body);seg(c,B(-3,-26),B(10,-27),1,p.body);star(c,...B(4,-24),4,p.gold);
    }else if(id==='ferryman'){
      for(let i=0;i<3;i++){const q=B(-7+i*7,-37);seg(c,[q[0],q[1]-5],[q[0]+m.flutter*.5,q[1]+8],2,p.skin);rune(c,q[0],q[1]+2,3,p,i);}seg(c,B(-17,-27),B(17,-25),2,p.skin);
    }else if(id==='echo'){
      for(let i=0;i<3;i++){const q=B(-6+i*7,-36+(i%2)*5);gem(c,...q,7,p.gold);gem(c,...q,5,'#a3c7d4');seg(c,[q[0]-2,q[1]-2],[q[0]+2,q[1]+2],1,p.glow);}
    }else if(id==='lantern'){
      for(const s of[-1,1])poly(c,[B(s*2,-42),B(s*16,-38),B(s*9,-17),B(s*2,-23)],p.edge);
      star(c,...B(0,-39),7,p.glow);for(let i=0;i<3;i++)gem(c,...B(-11+i*11,-15-(i%2)*3),3,p.gold);
    }else if(id==='witch'){
      for(let i=0;i<3;i++){const q=B(-8+i*8,-23);disk(c,...q,4,p.skin);box(c,q[0]-2,q[1]-1,1,2,p.dark);box(c,q[0]+1,q[1]-1,1,2,p.dark);}for(const s of[-1,1])rune(c,...B(s*10,-36),5,p,s+1);
    }else if(id==='hollow'){
      for(const s of[-1,1])seg(c,B(s*10,-42),B(s*17,-23),2,p.edge);rune(c,...B(0,-32),7,p,2);seg(c,B(-18,-21),B(18,-21),1,p.glow);
    }else if(id==='cometqueen'||id==='constellation'){
      const points=[B(-9,-40),B(2,-34),B(10,-41),B(7,-23),B(-8,-18)];for(let i=1;i<points.length;i++)seg(c,points[i-1],points[i],1,p.gold);for(const q of points)star(c,...q,3,p.glow);
      for(const s of[-1,1]){seg(c,B(s*14,-45),B(s*20,-12),2,p.gold);gem(c,...B(s*18,-16),4,p.edge);}
    }else if(id==='skeleton'){
      for(let i=0;i<4;i++){const y=-44+i*5;seg(c,B(-9,y),B(9,y+1),3,p.skin);}seg(c,B(0,-47),B(0,-23),3,p.edge);
    }else if(id==='shade'){rune(c,...B(0,-34),8,p,2);}
    if(m.back){poly(c,[B(-8,-46),B(8,-46),B(10,hem-5),B(0,hem-1),B(-10,hem-5)],p.dark);rune(c,...B(0,-32),7,p,id.length);}
    if(boss&&NPC.has(id))for(const s of[-1,1])rune(c,...B(s*(wide-1),hem+1),4,p,s+1);
  }
  function faceFinish(c,id,m,p,hx,hy,boss){
    if(!m.back){
      box(c,hx-8,hy+4,3,2,p.edge);box(c,hx+6,hy+4,3,2,p.edge);box(c,hx+1,hy+2,2,3,p.skin);
      if(!['king','smith','knight','golem','sentinel','hollow','shade'].includes(id))box(c,hx-7,hy-5,14,2,p.dark);
    }
    if(id==='merchant'){chain(c,[hx-13,hy+6],[hx+9,hy+11],p,6);gem(c,hx+13,hy+7,4,p.gold);}
    else if(id==='smith'){seg(c,[hx-13,hy-9],[hx+13,hy-9],4,p.dark);for(const s of[-1,1]){box(c,hx+s*6-4,hy-12,8,6,p.gold);box(c,hx+s*6-2,hy-11,4,3,p.glow);}if(!m.back)poly(c,[[hx-8,hy+6],[hx+8,hy+6],[hx+9+m.flutter*.3,hy+20],[hx+2,hy+17],[hx-3,hy+22],[hx-9,hy+16]],p.edge);}
    else if(id==='healer'){for(let i=0;i<3;i++){const x=hx-17+i*6;disk(c,x,hy-15-i%2*4,3,p.glow);}for(const s of[-1,1]){chain(c,[hx+s*10,hy+5],[hx+s*(15+m.flutter),hy+23],p,6);gem(c,hx+s*(15+m.flutter),hy+25,3,p.glow);}}
    else if(id==='cartographer'){seg(c,[hx+7,hy-29],[hx+22,hy-37],2,p.gold);poly(c,[[hx+9,hy-29],[hx+21,hy-42],[hx+25,hy-37],[hx+13,hy-28]],p.skin);}
    else if(id==='echo'){for(const s of[-1,1])gem(c,hx+s*18,hy-11,5,p.gold);chain(c,[hx-16,hy-12],[hx+17,hy-10],p,8);}
    else if(id==='ferryman'){seg(c,[hx-10,hy-7],[hx+10,hy-6],2,p.edge);if(!m.back){box(c,hx-9,hy-3,19,11,p.dark);eye(c,hx+1,hy+1,p,boss);}gem(c,hx,hy-18,4,p.glow);}
    else if(id==='hollow'){for(const s of[-1,1])poly(c,[[hx+s*10,hy-14],[hx+s*21,hy-30],[hx+s*26,hy-27],[hx+s*17,hy-7]],p.gold);if(!m.back){box(c,hx-9,hy-5,19,11,p.dark);rune(c,hx,hy+1,5,p,2);}}
    else if(id==='sentinel'||id==='knight'){poly(c,[[hx-5,hy-21],[hx+7,hy-28],[hx+19+m.flutter*2,hy-18],[hx+12+m.flutter*2,hy-7],[hx+9,hy-18]],p.edge);seg(c,[hx-11,hy+7],[hx+11,hy+7],2,p.gold);}
    else if(id==='witch'){for(const s of[-1,1]){seg(c,[hx+s*18,hy-15],[hx+s*22,hy+8+m.flutter],1,p.gold);gem(c,hx+s*22,hy+10+m.flutter,4,p.glow);}if(!m.back){box(c,hx-2,hy-7,4,3,p.gold);box(c,hx-1,hy-6,2,2,p.glow);}}
    else if(id==='cometqueen'){for(const s of[-1,1]){star(c,hx+s*15,hy-14,5,p.gold);seg(c,[hx+s*18,hy-3],[hx+s*(21+m.flutter),hy+22],2,p.glow);}star(c,hx,hy-25,5,p.glow);}
    else if(id==='constellation'){for(let i=0;i<5;i++){const a=Math.PI+i*Math.PI/4;star(c,hx+Math.cos(a)*25,hy-7+Math.sin(a)*25,3,p.glow);}rune(c,hx,hy-10,4,p,1);}
    else if(id==='lantern'){for(const s of[-1,1]){gem(c,hx+s*12,hy+8,4,p.gold);seg(c,[hx+s*12,hy+10],[hx+s*(16+m.flutter),hy+18],1,p.edge);}}
    else if(id==='skeleton'&&!m.back){box(c,hx-9,hy-2,7,6,p.ink);box(c,hx+3,hy-2,7,6,p.ink);poly(c,[[hx,hy+3],[hx-2,hy+7],[hx+2,hy+7]],p.dark);for(let i=0;i<4;i++)box(c,hx-6+i*4,hy+9,2,3,p.dark);}
    if(boss&&NPC.has(id)){gem(c,hx,hy-13,4,p.glow);for(const s of[-1,1])seg(c,[hx+s*14,hy-16],[hx+s*22,hy-25],2,p.gold);}
  }
  function humanoid(c,id,m,p,actor){
    const armour=['king','smith','sentinel','knight','golem'].includes(id),wide=id==='smith'||id==='golem'?20:id==='king'?18:14;
    const B=(x,y)=>bodyPoint(m,x,y),head=B(0,-66),left=armPose(m,-1,wide),right=armPose(m,1,wide);
    mantle(c,id,m,p,actor.boss);
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
    tailoring(c,id,m,p,actor.boss,wide,hem);
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
    faceFinish(c,id,m,p,hx,hy,actor.boss);
    joint(c,right.shoulder,right.elbow,right.wrist,armour?11:7,p);
    for(const arm of[left,right]){
      if(armour){plate(c,arm.elbow,[mix(arm.elbow[0],arm.wrist[0],.8),mix(arm.elbow[1],arm.wrist[1],.8)],8,p,arm===left);gem(c,...arm.shoulder,5,p.gold);}
      else{
        const end=[arm.wrist[0]+m.flutter*.4,arm.wrist[1]+7+m.fall*4];poly(c,[[arm.elbow[0]-4,arm.elbow[1]],[arm.wrist[0]+4,arm.wrist[1]-2],[end[0]+5,end[1]],[arm.elbow[0]-3,arm.elbow[1]+7]],p.dark);
        seg(c,[arm.wrist[0]+3,arm.wrist[1]-1],[end[0]+4,end[1]-1],2,p.gold);seg(c,[arm.elbow[0]-1,arm.elbow[1]+1],[end[0],end[1]-1],1,p.edge);
      }
    }
    for(const wrist of[left.wrist,right.wrist]){box(c,wrist[0]-3,wrist[1]-3,6,6,p.skin);box(c,wrist[0]+1,wrist[1]-2,2,4,p.edge);}
    if(id==='sentinel'||id==='knight'){
      const q=left.wrist;poly(c,[[q[0]-12,q[1]-15],[q[0]+8,q[1]-15],[q[0]+11,q[1]+9],[q[0]-1,q[1]+18],[q[0]-14,q[1]+5]],p.dark);poly(c,[[q[0]-9,q[1]-12],[q[0]+5,q[1]-12],[q[0]+8,q[1]+7],[q[0]-1,q[1]+13],[q[0]-10,q[1]+3]],p.edge);gem(c,q[0]-1,q[1],7,p.gold);rune(c,q[0]-1,q[1],4,p,1);for(const s of[-1,1])box(c,q[0]+s*7-1,q[1]-9,2,2,p.glow);seg(c,[q[0]-1,q[1]+6],[q[0]-1,q[1]+12],2,p.dark);
    }
    const tool=id==='king'?'greatsword':id==='smith'?'hammer':id==='sentinel'?'spear':id==='knight'||id==='golem'||id==='skeleton'?'sword':id==='merchant'?'scales':id==='ferryman'?'oar':id==='cartographer'?'scroll':id==='echo'?'mirror':id==='lantern'?'lantern':id==='healer'?'healerStaff':id==='witch'?'witchStaff':id==='hollow'?'bellStaff':id==='cometqueen'?'cometSceptre':id==='constellation'?'starSceptre':'staff';
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
      for(let i=0;i<3;i++){const t=(i+1)/4,edge=[mix(elbow[0],tip[0],t),mix(elbow[1],tip[1],t)],base=[root[0]+s*width*(.36+t*.4),root[1]+8-t*8];seg(c,edge,base,1,p.edge);}
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
    for(let i=0;i<5;i++){
      const x=-19+i*9,y=-72+(i%2)*14;poly(c,[B(x,y),B(x+6,y+5),B(x+3,y+15),B(x-3,y+9)],p.dark);seg(c,B(x,y+2),B(x+3,y+9),1,p.edge);
      const moss=B(-15+i*8,-23-i%2*5);poly(c,[moss,[moss[0]+8,moss[1]-5],[moss[0]+7,moss[1]+5],[moss[0]+3,moss[1]+1]],'#648a62');
    }
    for(const s of[-1,1]){
      const root=B(s*12,-77),branch=B(s*25,-100-m.coil*3),tip=B(s*42,-111+m.flutter);joint(c,root,branch,tip,6,p,s<0);seg(c,branch,B(s*20,-120),4,p.edge);
      disk(c,...B(s*30,-102),17,p.dark);disk(c,...B(s*28,-106),12,'#598668');box(c,...B(s*31-4,-113),9,3,'#9bc28b');
      for(let i=0;i<3;i++){const q=B(s*(24+i*7),-98-i%2*7);gem(c,...q,4,'#9cc591');seg(c,q,[q[0]+m.flutter*.7,q[1]+15+i*3],1,'#648a62');}
    }
    const face=B(0,-59);if(!m.back){eye(c,face[0]-9,face[1],p);eye(c,face[0]+9,face[1],p);box(c,face[0]-10,face[1]+16,20,6,p.dark);}else{seg(c,B(-11,-69),B(4,-43),3,p.dark);seg(c,B(4,-43),B(13,-57),2,p.edge);}gem(c,...B(0,-28),9,p.glow);aura(c,...B(0,-28),25,m.coil,p.glow);
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
    const face=B(0,-38);if(!m.back){eye(c,face[0]-7,face[1],p);eye(c,face[0]+7,face[1],p);}else{for(let i=0;i<3;i++)seg(c,B(-7+i*6,-48),B(-8+i*7,-23),1,p.body);}
    const cap=B(m.stagger*-6,-65-m.coil*8+m.release*5);
    poly(c,[[cap[0]-45,cap[1]+9],[cap[0]-39,cap[1]-9],[cap[0]-24,cap[1]-22],[cap[0],cap[1]-30],[cap[0]+27,cap[1]-21],[cap[0]+42,cap[1]-5],[cap[0]+46,cap[1]+10]],p.ink);
    poly(c,[[cap[0]-41,cap[1]+6],[cap[0]-35,cap[1]-10],[cap[0]-20,cap[1]-23],[cap[0]+1,cap[1]-26],[cap[0]+25,cap[1]-18],[cap[0]+40,cap[1]-3],[cap[0]+42,cap[1]+6]],p.body);
    box(c,cap[0]-42,cap[1]+5,85,6,p.edge);for(let i=0;i<7;i++)seg(c,[cap[0]-30+i*10,cap[1]+12],[cap[0]-21+i*7,cap[1]+19],2,p.dark);
    for(let i=0;i<6;i++){const x=-31+i*12;seg(c,[cap[0]+x,cap[1]+9],[cap[0]+x*.68,cap[1]+19],1,p.skin);box(c,cap[0]+x,cap[1]+3,5,2,p.glow);}
    for(const [x,y,r]of[[-22,-8,7],[2,-17,8],[26,-5,6]]){disk(c,cap[0]+x,cap[1]+y,r,p.glow);box(c,cap[0]+x-2,cap[1]+y-3,3,3,'#fff3d5');}
    if(boss){for(let i=0;i<5;i++)gem(c,cap[0]-19+i*10,cap[1]-27-(i===2?8:0),6,p.glow);for(const s of[-1,1]){const elbow=B(s*34,-53-m.coil*16),hand=B(s*(43+m.release*15),-37-m.coil*28);joint(c,B(s*16,-46),elbow,hand,5,p,s<0);aura(c,...hand,18,m.coil,p.glow);const skirt=B(s*18,-28);poly(c,[skirt,[skirt[0]+s*9,skirt[1]+3],[skirt[0]+s*(12+m.flutter),skirt[1]+18],[skirt[0]+s*3,skirt[1]+14]],p.edge);seg(c,[skirt[0]+s*3,skirt[1]+3],[skirt[0]+s*(7+m.flutter),skirt[1]+14],1,p.dark);}}
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
    for(const s of[-1,1])for(let i=0;i<4;i++){
      const q=B(s*(15+i%2*4),-53+i*9);poly(c,[[q[0]-5,q[1]-4],[q[0]+6,q[1]-3],[q[0]+3,q[1]+5],[q[0]-4,q[1]+3]],i%2?p.dark:p.edge);seg(c,[q[0]-3,q[1]-3],[q[0]+4,q[1]-2],1,p.glow);
    }
    if(astral){for(const s of[-1,1]){const nodes=[B(s*12,-57),B(s*32,-74),B(s*51,-83),B(s*57,-45)];for(let i=1;i<nodes.length;i++)seg(c,nodes[i-1],nodes[i],1,p.gold);for(const q of nodes)star(c,...q,4,p.glow);}}
    for(const s of[-1,1]){
      const shoulder=B(s*21,-55),elbow=B(s*(33-m.coil*7+m.release*10),-43-m.coil*20),wrist=B(s*(28-m.coil*13+m.release*24),-23-m.coil*29+m.release*7);
      joint(c,shoulder,elbow,wrist,10,p,s<0);for(let i=0;i<3;i++)poly(c,[[wrist[0]-6+i*5,wrist[1]-1],[wrist[0]-3+i*5+m.release*8,wrist[1]+10],[wrist[0]-1+i*5,wrist[1]-2]],p.skin);
      if(m.stage==='active'&&!m.still){c.save();c.globalAlpha*=.55;for(let i=0;i<3;i++)seg(c,[wrist[0]+s*(i*5+4),wrist[1]-15],[wrist[0]+s*(i*5+17),wrist[1]+12],2,p.glow);c.restore();}
    }
    const head=B(-4+m.release*8-m.coil*5,-78+m.coil*4),jaw=4+m.coil*3+m.release*12;
    poly(c,[[head[0]-18,head[1]-13],[head[0]+17,head[1]-12],[head[0]+21,head[1]+10],[head[0]-20,head[1]+13],[head[0]-27,head[1]+4]],p.ink);
    poly(c,[[head[0]-15,head[1]-11],[head[0]+14,head[1]-9],[head[0]+17,head[1]+7],[head[0]-20,head[1]+9],[head[0]-24,head[1]+1]],p.body);
    poly(c,[[head[0]-22,head[1]+12+jaw*.2],[head[0]+10,head[1]+12+jaw*.2],[head[0]+7,head[1]+15+jaw],[head[0]-19,head[1]+15+jaw]],p.edge);
    if(!m.back){eye(c,head[0]-10,head[1],p);eye(c,head[0]+11,head[1]-4,p);for(let i=0;i<4;i++)poly(c,[[head[0]-16+i*7,head[1]+11],[head[0]-13+i*7,head[1]+17+jaw*.25],[head[0]-11+i*7,head[1]+11]],p.skin);}else{poly(c,[[head[0]-12,head[1]-6],[head[0],head[1]-17],[head[0]+11,head[1]-4],[head[0]+3,head[1]+8],[head[0]-8,head[1]+5]],p.edge);seg(c,[head[0],head[1]-13],[head[0]+1,head[1]+7],2,p.dark);}
    for(const s of[-1,1]){poly(c,[[head[0]+s*9,head[1]-10],[head[0]+s*20,head[1]-29],[head[0]+s*16,head[1]-8]],p.skin);gem(c,head[0]+s*21,head[1]-1,prism?7:4,p.edge);}
    if(prism){for(const s of[-1,1])seg(c,[head[0]+s*6,head[1]-9],[head[0]+s*14,head[1]-2],2,p.gold);rune(c,...B(0,-39),5,p,1);}
    gem(c,...B(0,-39),8,p.glow);aura(c,head[0]-17,head[1]+12,22,m.coil,p.glow);
    if(actor.phase>1)for(let i=0;i<3;i++)gem(c,...B(-9+i*9,-105-(i===1?6:0)),6,p.glow);
  }
  function smallCreature(c,id,m,p){
    const B=(x,y)=>bodyPoint(m,x,y);
    if(['moth','raven','starling'].includes(id)){
      const q=B(0,-24);wings(c,m,p,q,id==='moth'?30:34,id==='moth');
      poly(c,[B(-8,-38),B(8,-39),B(12,-20),B(0,-9),B(-12,-21)],p.body);poly(c,[B(-5,-21),B(4,-19),B(9,-3),B(-3,-8),B(-8,-4)],p.edge);
      const head=B(m.coil*-3+m.release*6,-38);disk(c,...head,10,p.dark);if(!m.back){eye(c,head[0]+4,head[1],p);poly(c,[[head[0]+8,head[1]],[head[0]+19,head[1]+3],[head[0]+9,head[1]+7]],p.gold);}
      for(let i=0;i<3;i++)poly(c,[B(-7+i*5,-31),B(-3+i*5,-34),B(-2+i*5,-22),B(-6+i*5,-20)],i%2?p.dark:p.edge);
      if(id==='moth'){for(const s of[-1,1]){seg(c,[head[0]+s*4,head[1]-7],[head[0]+s*12,head[1]-17+m.flutter],1,p.edge);gem(c,head[0]+s*12,head[1]-17+m.flutter,2,p.glow);}}
      else if(id==='raven'){poly(c,[[head[0]-7,head[1]-6],[head[0]-3,head[1]-17],[head[0]+1,head[1]-10],[head[0]+5,head[1]-14],[head[0]+8,head[1]-5]],p.edge);}
      else{star(c,head[0]-3,head[1]-7,4,p.glow);for(const s of[-1,1])seg(c,B(s*7,-13),B(s*(12+m.flutter),1),2,p.gold);}
      for(const s of[-1,1])joint(c,B(s*4,-15),B(s*8,-8),B(s*11,0),2,p,s<0);return;
    }
    if(id==='astrolabe'){
      for(const s of[-1,1])joint(c,B(s*9,-23),B(s*22,-15-m.step*s*6),[s*25+m.step*s*7,0],5,p,s<0);
      const q=B(0,-30);for(let ring=0;ring<3;ring++){const angle=(m.still?0:m.time*(ring%2?-1:1))+ring;for(let i=0;i<6;i++){const a=i*TAU/6+angle,b=(i+1)*TAU/6+angle,r=22-ring*4+m.coil*5;seg(c,[q[0]+Math.cos(a)*r,q[1]+Math.sin(a)*r*.6],[q[0]+Math.cos(b)*r,q[1]+Math.sin(b)*r*.6],2,ring===1?p.glow:p.edge);if(ring===0)gem(c,q[0]+Math.cos(a)*r,q[1]+Math.sin(a)*r*.6,3,p.gold);}}gem(c,...q,12,p.glow);gem(c,...q,6,p.body);rune(c,...q,5,p,1);return;
    }
    if(id==='spider'){
      for(const s of[-1,1])for(let i=0;i<4;i++)joint(c,B(s*7,-20),B(s*(22+i*3),-25+i*6-m.coil*10),[s*(29+i*3)+Math.sin(m.phase+i)*m.moving*5,Math.max(0,Math.sin(m.phase+i))*-4*m.moving],3,p,s<0);
      disk(c,...B(0,-27),17,p.dark);disk(c,...B(0,-15),12,p.body);for(let i=0;i<3;i++)seg(c,B(-10+i*5,-37),B(-7+i*5,-22),2,p.edge);gem(c,...B(0,-29),5,p.glow);if(!m.back){eye(c,...B(-5,-16),p);eye(c,...B(5,-16),p);for(const s of[-1,1])poly(c,[B(s*5,-8),B(s*7,-1-m.release*3),B(s*2,-5)],p.skin);}return;
    }
    if(id==='eye'||id==='wisp'||id==='stardust'){
      const q=B(0,-31-m.coil*4);for(let i=0;i<5;i++){const xx=(i-2)*6,sway=Math.sin(m.time*2.4+i)*3;const root=[q[0]+xx,q[1]+9],knee=[q[0]+xx+sway,q[1]+20],tip=[q[0]+xx+sway*2+m.release*(i-2)*6,q[1]+28-m.coil*12];joint(c,root,knee,tip,3,p,i<2);}
      disk(c,...q,17+m.coil*2,p.dark);disk(c,q[0]-1,q[1]-2,14,p.body);
      if(id==='eye'){
        if(!m.back){disk(c,q[0]+3+m.release*3,q[1],10,p.skin);disk(c,q[0]+5+m.release*3,q[1],6,p.body);box(c,q[0]+4+m.release*3,q[1]-6,3,12,p.ink);box(c,q[0]+4,q[1]-4,2,3,p.glow);}
        for(const s of[-1,1])seg(c,[q[0]+s*10,q[1]-8],[q[0]+s*14,q[1]-14],2,p.edge);
      }else{gem(c,...q,12,p.glow);gem(c,q[0]+1,q[1]-1,6,p.body);for(const s of[-1,1]){gem(c,q[0]+s*22,q[1]-6+m.flutter,4,p.edge);seg(c,[q[0]+s*9,q[1]-3],[q[0]+s*18,q[1]-6+m.flutter],1,p.gold);}if(id==='stardust')for(let i=0;i<3;i++)star(c,q[0]-12+i*12,q[1]-17-(i%2)*7,3,p.glow);else rune(c,q[0],q[1],6,p,2);}
      aura(c,...q,25,m.coil,p.glow);return;
    }
    // A slime deforms its outline and pseudopods independently during each stage.
    const squash=m.coil*7-m.release*4+m.fall*14,spread=m.coil*4+m.fall*8;
    const outline=[];for(let i=0;i<11;i++){const a=Math.PI+i*Math.PI/10,rr=23+Math.sin(m.time*3+i*.8)*1.2;outline.push([Math.cos(a)*(rr+spread)+m.release*7,Math.sin(a)*(rr-squash)-9+Math.sin(m.phase)*m.moving*2]);}
    outline.push([23+spread,1],[-23-spread,1]);poly(c,outline,p.dark);poly(c,outline.map(([x,y])=>[x*.85,y*.83-2]),p.body);
    for(const s of[-1,1]){const toe=[s*(19+spread)+m.step*s*4,0];joint(c,[s*12,-12],[s*22,-6-m.coil*2],toe,6,p,s<0);}if(!m.back){eye(c,-6+m.release*7,-14+squash*.5,p);eye(c,7+m.release*7,-14+squash*.5,p);}box(c,-10,-26+squash,8,3,p.edge);box(c,-13,-22+squash,3,4,p.glow);for(let i=0;i<3;i++)disk(c,-12+i*10+m.release*4,-8-i%2*5+squash*.2,2,p.edge);
  }
  function variantRegalia(c,m,p,actor,height){
    const variant=actor.variant||actor.kind;if(!['skirmisher','hexer','warden'].includes(variant))return;
    const B=(x,y)=>bodyPoint(m,x,y),top=height,mark=B(0,-top),flutter=m.flutter;
    if(variant==='skirmisher'){
      // Twin pennants and bright blades identify the fast flanking archetype.
      for(const s of[-1,1]){
        const q=B(s*14,-top*.56);poly(c,[[q[0],q[1]-4],[q[0]+s*15,q[1]+flutter-3],[q[0]+s*10,q[1]+flutter+4],[q[0]+s*22,q[1]+flutter+8],[q[0]+s*5,q[1]+6]],p.dark);seg(c,[q[0]+s*4,q[1]],[q[0]+s*15,q[1]+flutter+4],2,'#e9bd6e');
        poly(c,[B(s*14,-16),B(s*23,-24-m.coil*6),B(s*20,-9)],p.edge);
      }
      poly(c,[[mark[0]-6,mark[1]+5],[mark[0],mark[1]-4],[mark[0]+6,mark[1]+5],[mark[0],mark[1]+1]],'#e9bd6e');
    }else if(variant==='hexer'){
      for(const s of[-1,1]){const q=B(s*19,-top*.58);poly(c,[[q[0]-3,q[1]-7],[q[0]+5,q[1]-6],[q[0]+5+flutter,q[1]+13],[q[0]+1+flutter,q[1]+17],[q[0]-4+flutter,q[1]+12]],p.skin);rune(c,q[0]+flutter*.4,q[1]+2,5,{glow:'#8056a8'},s+1);}
      gem(c,mark[0],mark[1],7,p.ink);gem(c,mark[0],mark[1],5,'#ddadff');for(const s of[-1,1])gem(c,mark[0]+s*12,mark[1]+4+m.coil*3,3,'#bd88df');
    }else{
      for(const s of[-1,1]){const a=B(s*16,-top*.58),b=B(s*20,-top*.3);plate(c,a,b,9,p,s<0);seg(c,[a[0]-s*2,a[1]],[b[0]-s*2,b[1]],2,'#a8e5d4');}
      poly(c,[[mark[0]-7,mark[1]-3],[mark[0]+7,mark[1]-3],[mark[0]+6,mark[1]+5],[mark[0],mark[1]+10],[mark[0]-6,mark[1]+5]],'#a8e5d4');rune(c,mark[0],mark[1]+2,4,{glow:p.dark},1);
    }
  }
  // The material pass follows the same articulated body anchors as weapons
  // and robes. It adds model detail without altering the enemy collision body.
  function surfaceRegalia(c,id,m,p,boss){
    if(!boss)return;
    const B=(x,y)=>bodyPoint(m,x,y);
    const wink=m.still?0:Math.sin(m.time*2.6)*2;
    c.save();
    c.globalAlpha=.91;
    if(id==='thorn'){
      for(const side of[-1,1]){
        const root=B(side*21,-59),tip=B(side*(42+m.flutter*.3),-105);
        seg(c,root,tip,5,p.dark);
        seg(c,[root[0]+side*1,root[1]],[tip[0]+side*1,tip[1]+4],2,'#a0c586');
        for(let i=0;i<3;i++){
          const q=B(side*(26+i*5),-67-i*12);
          poly(c,[[q[0]-side*8,q[1]+5],[q[0]+side*11,q[1]-9],[q[0]+side*2,q[1]+11]],i%2?p.edge:p.glow);
        }
      }
      for(let i=0;i<6;i++){const a=i*TAU/6,at=B(Math.cos(a)*22,-95+Math.sin(a)*9);gem(c,...at,4,p.glow);}
    }else if(id==='spore'){
      const q=B(0,-91);for(let i=0;i<8;i++){
        const dx=-34+i*9,dy=-12+Math.sin(i*.9)*7;
        disk(c,q[0]+dx,q[1]+dy,3+i%3,i%2?'#eee2ba':'#91bfa0');
      }
      for(const side of[-1,1]){const at=B(side*28,-50);gem(c,...at,6,p.glow);seg(c,B(side*20,-49),at,2,p.edge);}
    }else if(id==='prism'){
      for(let i=0;i<8;i++){
        const angle=i*TAU/8,a=B(Math.cos(angle)*38,-52+Math.sin(angle)*24),b=B(Math.cos(angle)*49,-56+Math.sin(angle)*31);
        poly(c,[[a[0]-3,a[1]+3],[b[0],b[1]-8],[b[0]+6,b[1]+8]],i%2?'#91c4e9':'#d5f3ff');
        seg(c,a,b,1,'#fcf9f9');
      }
      for(const side of[-1,1]){const q=B(side*13,-55);
        poly(c,[[q[0]-side*6,q[1]-22],[q[0]+side*8,q[1]-15],[q[0]+side*12,q[1]+13],[q[0]-side*5,q[1]+19]],side>0?'#87bad4':'#d8e8fa');
        seg(c,[q[0]-side*3,q[1]-20],[q[0]+side*2,q[1]+9],2,'#f8f5ff');
      }
      gem(c,...B(0,-51),9,'#d7effd');gem(c,...B(0,-51),5,'#fff4ff');
    }else if(id==='king'||id==='smith'||id==='sentinel'){
      for(const side of[-1,1]){
        const shoulder=B(side*19,-54),elbow=B(side*28,-37);
        poly(c,[[shoulder[0]-11,shoulder[1]-7],[shoulder[0]+10,shoulder[1]-9],
          [elbow[0]+8,elbow[1]+5],[elbow[0]-5,elbow[1]+11]],p.dark);
        poly(c,[[shoulder[0]-8,shoulder[1]-5],[shoulder[0]+8,shoulder[1]-6],
          [elbow[0]+4,elbow[1]+3],[elbow[0]-4,elbow[1]+7]],id==='sentinel'?'#d4cba4':'#b1a4aa');
        seg(c,[shoulder[0]-6,shoulder[1]-4],[elbow[0]-2,elbow[1]+5],2,'#f3d7ac');
        gem(c,...B(side*23,-52),5,p.gold);
      }
      const heart=B(0,-42);
      poly(c,[[heart[0]-13,heart[1]-7],[heart[0]+12,heart[1]-7],[heart[0]+7,heart[1]+18],
        [heart[0],heart[1]+24],[heart[0]-8,heart[1]+18]],p.edge);
      seg(c,[heart[0]-7,heart[1]-5],[heart[0]+1,heart[1]+16],2,'#f7e7cb');
      gem(c,heart[0],heart[1]+6,5,id==='smith'?'#ffbd78':'#f7e9c4');
    }else if(['witch','hollow','cometqueen','constellation','cartographer','echo','lumina'].includes(id)){
      for(const side of[-1,1]){
        const a=B(side*13,-57),b=B(side*(25+m.flutter*.3),-18);
        poly(c,[[a[0]-side*3,a[1]],[a[0]+side*5,a[1]-4],
          [b[0]+side*6,b[1]+8],[b[0]-side*2,b[1]+12]],p.dark);
        seg(c,[a[0]+side*1,a[1]],[b[0]+side*1,b[1]+4],2,p.glow);
        gem(c,...B(side*21,-20),3,'#f5dabb');
      }
      for(let i=0;i<5;i++){
        const a=-1.2+i*.6,at=B(Math.cos(a)*17,-75+Math.sin(a)*7);
        star(c,at[0],at[1],i===2?5:3,p.glow);
      }
      star(c,...B(0,-42+wink*.2),6,'#fff0cf');
    }else if(id==='astral'){
      for(const side of[-1,1])for(let i=0;i<4;i++){
        const at=B(side*(18+i*7),-65-i*11),to=B(side*(26+i*8),-84-i*13);
        seg(c,at,to,4,p.edge);seg(c,[at[0]+side,at[1]],[to[0]+side,to[1]],1,'#e9faff');
        gem(c,...to,3,p.glow);
      }
      for(let i=0;i<3;i++)gem(c,...B(0,-50-i*13),4+i,'#ebdfb4');
    }else if(id==='healer'||id==='lantern'){
      for(const side of[-1,1]){
        const at=B(side*17,-40);
        for(let i=0;i<4;i++){
          const a=i*TAU/4;disk(c,at[0]+Math.cos(a)*7,at[1]+Math.sin(a)*7,5,'#a8dcb4');
        }
        gem(c,...at,6,'#ffedc3');
      }
    }else if(id==='ferryman'){
      for(const side of[-1,1]){
        seg(c,B(side*21,-42),B(side*33,-14),3,'#95c5d4');
        for(let i=0;i<3;i++)gem(c,...B(side*(24+i*3),-34+i*10),3,'#c9e9df');
      }
    }else if(id==='merchant'){
      for(let i=0;i<8;i++){
        const a=i*TAU/8,at=B(Math.cos(a)*28,-43+Math.sin(a)*18);
        disk(c,at[0],at[1],5,'#866448');disk(c,at[0],at[1]-1,3,'#f4d68f');
      }
    }
    c.restore();
  }
  function supports(id){return KNOWN.has(String(id||'').replace(/^npc-/,''));}
  function draw(c,pose={},actor={}){
    const id=String(actor.npcId||actor.sprite||actor.enemyId||actor.id||'slime').replace(/^npc-/,''),boss=actor.kind==='boss'||actor.boss;
    if(!supports(id))return false;
    const p=palette(id),m=motion(pose);c.save();
    try{
      if(n(pose.facingX,1)<-.08)c.scale(-1,1);
      const humanoids=NPC.has(id)||['king','witch','hollow','cometqueen','constellation','knight','shade','golem','skeleton'].includes(id);
      if(humanoids){const scale=boss?1.13:NPC.has(id)?1:['golem'].includes(id)?.78:.68;c.scale(scale,scale);humanoid(c,id,m,p,{...actor,boss});variantRegalia(c,m,p,actor,99);}
      else if(id==='thorn')tree(c,m,p,actor);
      else if(id==='spore'||id==='mushroom')mushroom(c,m,p,boss);
      else if(['astral','prism'].includes(id))beast(c,id,m,p,actor);
      else smallCreature(c,id,m,p);
      if(!humanoids&&!boss)variantRegalia(c,m,p,actor,id==='mushroom'?66:['moth','raven','starling'].includes(id)?59:52);
      surfaceRegalia(c,id,m,p,boss);
      return true;
    }finally{c.restore();}
  }
  window.DungeonEnemyCharacter=Object.freeze({draw,supports});
})();
