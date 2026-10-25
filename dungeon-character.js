/* Original articulated pixel characters for Wordbound.
 * draw(ctx, pose, appearance): ctx origin is the actor's feet; no caller mirroring.
 * time is seconds, phase is a distance-driven walking cycle in radians.
 * The renderer is stateless and preserves the caller's transform and opacity. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const number = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const PALETTES = {
    player: {
      outline:'#131c31', deep:'#1c2a42', coat:'#2a435d', fold:'#385c72', edge:'#558a96',
      lining:'#397e88', liningLight:'#6ec7c7', ivory:'#e9e5d1', ivoryShade:'#b6bdba',
      gold:'#c99d59', goldLight:'#f3dca0', hair:'#c5d3dc', hairShade:'#829aaa', hairLight:'#edf5ed',
      skin:'#f2d6bd', skinShade:'#c99889', eye:'#356977', glow:'#a6f3e6', leather:'#38404b'
    },
    lumina: {
      outline:'#232035', deep:'#302e4b', coat:'#444766', fold:'#676b86', edge:'#9496aa',
      lining:'#b47891', liningLight:'#ecc0c9', ivory:'#f2e7d6', ivoryShade:'#c3b9be',
      gold:'#cda574', goldLight:'#f9dfad', hair:'#e5c7d4', hairShade:'#ac8aa6', hairLight:'#fff0e7',
      skin:'#f8d7c5', skinShade:'#ce9d9d', eye:'#83597d', glow:'#f9ccdc', leather:'#58465c'
    }
  };
  function polygon(c, points, color) {
    c.fillStyle = color; c.beginPath();
    points.forEach((p, i) => i ? c.lineTo(Math.round(p[0]), Math.round(p[1])) : c.moveTo(Math.round(p[0]), Math.round(p[1])));
    c.closePath(); c.fill();
  }
  function box(c, x, y, w, h, color) {
    c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }
  function segment(c, a, b, width, color) {
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length * width / 2, ny = dx / length * width / 2;
    polygon(c, [[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny]], color);
  }
  function jewel(c, x, y, size, color) {
    polygon(c, [[x,y-size],[x+size*.62,y],[x,y+size],[x-size*.62,y]], color);
  }
  function star(c, x, y, size, color) {
    polygon(c, [[x,y-size],[x+size*.24,y-size*.22],[x+size,y],[x+size*.24,y+size*.22],
      [x,y+size],[x-size*.24,y+size*.22],[x-size,y],[x-size*.24,y-size*.22]], color);
  }
  function hand(c, wrist, p, raised) {
    box(c, wrist[0]-2, wrist[1]-2, 5, 5, p.outline);
    box(c, wrist[0]-1, wrist[1]-2, 3, 3, p.skin);
    box(c, wrist[0]+1, wrist[1]+(raised ? -3 : 0), 2, 2, p.skinShade);
  }
  function arm(c, shoulder, elbow, wrist, p, rear, flutter) {
    segment(c, shoulder, elbow, 9, p.outline);
    segment(c, elbow, wrist, 8, p.outline);
    segment(c, shoulder, elbow, 6, rear ? p.deep : p.coat);
    segment(c, elbow, wrist, 5, rear ? p.coat : p.fold);
    // The open bell sleeve hangs from the bent elbow; the hand remains separate.
    polygon(c, [[elbow[0]-4,elbow[1]-2],[wrist[0]+4,wrist[1]-2],[wrist[0]+6+flutter,wrist[1]+7],
      [elbow[0]-3+flutter,elbow[1]+8]], p.outline);
    polygon(c, [[elbow[0]-2,elbow[1]-1],[wrist[0]+3,wrist[1]-1],[wrist[0]+4+flutter,wrist[1]+5],
      [elbow[0]-2+flutter,elbow[1]+5]], rear ? p.deep : p.coat);
    segment(c, [wrist[0]+1,wrist[1]-1], [wrist[0]+4+flutter,wrist[1]+5], 2, p.gold);
    segment(c, [elbow[0],elbow[1]+1], [wrist[0]+1+flutter,wrist[1]+3], 1, p.edge);
    hand(c, wrist, p, wrist[1] < shoulder[1]);
  }
  function leg(c, hip, knee, ankle, p, rear, toe) {
    segment(c, hip, knee, 8, p.outline);
    segment(c, knee, ankle, 7, p.outline);
    segment(c, hip, knee, 5, rear ? p.deep : p.coat);
    segment(c, knee, [ankle[0],ankle[1]-1], 4, rear ? p.leather : p.fold);
    segment(c, [knee[0]-1,knee[1]+4], [ankle[0]-1,ankle[1]-1], 2, p.leather);
    polygon(c, [[ankle[0]-4,ankle[1]-7],[ankle[0]+3,ankle[1]-7],[ankle[0]+3+toe,ankle[1]-2],
      [ankle[0]+5+toe,ankle[1]-1],[ankle[0]+5+toe,ankle[1]+2],[ankle[0]-4,ankle[1]+2]], p.outline);
    polygon(c, [[ankle[0]-2,ankle[1]-6],[ankle[0]+2,ankle[1]-6],[ankle[0]+2+toe,ankle[1]-1],
      [ankle[0]+4+toe,ankle[1]],[ankle[0]-2,ankle[1]]], rear ? p.leather : p.coat);
    box(c, ankle[0]-2, ankle[1]-6, 4, 2, p.gold);
    box(c, ankle[0]-2, ankle[1], 7+Math.max(0,toe), 1, p.ivoryShade);
  }
  function staff(c, wrist, angle, p, charge, time, still) {
    const axis = [Math.sin(angle), -Math.cos(angle)];
    const along = d => [wrist[0]+axis[0]*d, wrist[1]+axis[1]*d];
    const bottom = along(-15), top = along(31), middle = along(19);
    segment(c, bottom, top, 5, p.outline);
    segment(c, bottom, top, 3, p.gold);
    segment(c, [bottom[0]-1,bottom[1]], [top[0]-1,top[1]], 1, p.goldLight);
    segment(c, along(-4), along(4), 4, p.leather);
    jewel(c, bottom[0], bottom[1], 3, p.lining);
    jewel(c, middle[0], middle[1], 4, p.outline);
    jewel(c, middle[0], middle[1], 2, p.liningLight);
    const crown = along(34);
    star(c, crown[0], crown[1], 8, p.outline);
    star(c, crown[0], crown[1], 6, p.gold);
    star(c, crown[0], crown[1], 4, p.glow);
    box(c, crown[0]-1, crown[1]-2, 2, 3, '#fff8e9');
    if (charge > 0) {
      c.save(); c.globalAlpha *= .32 * charge;
      star(c, crown[0], crown[1], 10 + (still ? 0 : Math.sin(time*7)*1.2), p.glow);
      c.restore();
      const a = still ? -.8 : time * 2.6;
      for (let i=0; i<3; i++) {
        const t = a + i*TAU/3;
        box(c, crown[0]+Math.cos(t)*11-1, crown[1]+Math.sin(t)*8-1, 2, 2, p.glow);
      }
    }
    hand(c, wrist, p, false);
  }
  function draw(c, pose = {}, appearance = 'player') {
    if (!c) return;
    const p = PALETTES[appearance] || PALETTES.player, lumina = appearance === 'lumina';
    const still = !!pose.still, time = still ? 0 : number(pose.time);
    const mode = pose.mode || 'idle', fallen = mode === 'fallen', dash = mode === 'dash';
    const chant = mode === 'chant', casting = mode === 'cast', hurt = mode === 'hurt';
    const movement = still || fallen ? 0 : clamp(number(pose.moving),0,1);
    const phase = still ? 0 : number(pose.phase), cycle = Math.sin(phase), stride = cycle * movement;
    const step = Math.max(0, Math.sin(phase)), otherStep = Math.max(0, -Math.sin(phase));
    const fx = number(pose.facingX,1), fy = number(pose.facingY);
    const back = fy < -.38, profile = Math.abs(fx) > .63, mirror = fx < -.08 ? -1 : 1;
    const cast = clamp(number(pose.castProgress),0,1);
    const windup = casting ? 1-ease(cast/.28) : chant ? .68 : 0;
    const release = casting ? ease((cast-.2)/.16) * (1-ease((cast-.62)/.38)) : 0;
    const recoil = hurt ? Math.sin(clamp(number(pose.hurtProgress),0,1)*Math.PI) || .65 : 0;
    const fall = fallen ? ease(number(pose.hurtProgress,1)) : 0;
    const speed = clamp(number(pose.speed)/220,0,1.6);
    const breath = still || fallen ? 0 : Math.sin(time*2.5)*.65;
    const bob = Math.abs(Math.cos(phase))*1.4*movement + breath - windup*.7 + recoil*2;
    const lean = fallen ? .08+fall*.48 : dash ? .34 : .045*movement*speed + release*.15 - windup*.08 - recoil*.13;
    const flow = (dash ? -11 : -movement*speed*3) + (still ? 0 : Math.sin(phase-.65)*2.3*movement + Math.sin(time*2.1)*.65);
    const lag = (dash ? -7 : -movement*2) + (still ? 0 : Math.sin(phase-1)*1.6*movement + Math.sin(time*1.9-.5)*.8);
    const collapse = 1-fall*.72;
    const B = (x,y) => [x - y*lean, y*collapse + (fallen ? -fall*2 : bob)];
    const shape = (points,color) => polygon(c,points.map(([x,y])=>B(x,y)),color);
    const mark = (x,y,w,h,color) => { const at=B(x,y); box(c,at[0],at[1],w,h,color); };
    c.save();
    try {
      c.scale(mirror,1);
      // Feet alternate lift and reach while the knees bend independently.
      const rearHip=B(-4,-28), frontHip=B(5,-28);
      const rearAnkle = fallen ? [mix(-4,-8,fall),-fall] : [dash ? -13 : -4-stride*8, -otherStep*6*movement-(dash?5:0)];
      const frontAnkle = fallen ? [mix(5,14,fall),0] : [dash ? 9 : 5+stride*8, -step*6*movement];
      const rearKnee = [mix(rearHip[0],rearAnkle[0],.47)-otherStep*3*movement, mix(rearHip[1],rearAnkle[1],.5)-otherStep*3*movement];
      const frontKnee = [mix(frontHip[0],frontAnkle[0],.47)+step*4*movement, mix(frontHip[1],frontAnkle[1],.5)-step*3*movement];
      leg(c,rearHip,rearKnee,rearAnkle,p,true,profile?2:0);
      // Rear hair, split coat tails and their bright inner lining lag behind motion.
      shape([[-8,-66],[-13,-60],[-13+lag,-43],[-18+lag,-29],[-10+lag,-32],[-5,-48],[9,-50],[12+lag,-35],[17+lag,-31],[14+lag,-52],[9,-66]],p.outline);
      shape([[-7,-64],[-11,-58],[-10+lag,-42],[-15+lag,-32],[-10+lag,-35],[-4,-50],[9,-54],[11+lag,-38],[14+lag,-35],[11+lag,-53],[7,-64]],p.hairShade);
      shape([[-10,-42],[-17,-30],[-18+flow,-13],[-4+flow*.7,-19],[2,-35],[10,-42],[14+flow*.5,-24],[20+flow,-14],[23+flow,-18],[14,-44]],p.outline);
      shape([[-9,-40],[-15,-29],[-16+flow,-16],[-6+flow*.7,-21],[0,-35],[-1,-43]],p.coat);
      shape([[-12,-30],[-14+flow,-17],[-7+flow*.7,-22],[-3,-35]],p.lining);
      shape([[8,-42],[11+flow*.5,-24],[19+flow,-17],[21+flow,-19],[13,-43]],p.coat);
      shape([[11,-37],[12+flow*.5,-25],[18+flow,-19],[14+flow*.6,-26]],p.liningLight);
      leg(c,frontHip,frontKnee,frontAnkle,p,false,profile?2:0);
      const rearShoulder=B(-8,-49), frontShoulder=B(8,-49);
      const rearElbow=B(-12-stride*2-windup*2,-39-windup*8-release*3);
      const rearWrist=B(-9+stride*4-windup*2+release*3,-31-windup*18-release*15);
      const frontElbow=B(13+stride*2-windup*3+release*3,-39-windup*4-release*4);
      const frontWrist=B(15-stride*2-windup*10+release*6,-35-windup*15-release*6);
      if (back) arm(c,frontShoulder,frontElbow,frontWrist,p,true,flow*.16);
      else arm(c,rearShoulder,rearElbow,rearWrist,p,true,flow*.18);
      // Fitted vest, separate shoulder cape and split ivory tabard keep the body readable.
      shape([[-10,-50],[-4,-55],[5,-55],[11,-50],[10,-38],[14,-26],[8,-20],[-9,-22],[-13,-27],[-9,-39]],p.outline);
      shape([[-8,-49],[-3,-53],[5,-53],[9,-49],[7,-37],[11,-27],[6,-23],[-7,-24],[-10,-28],[-7,-38]],p.coat);
      shape([[-8,-45],[-3,-48],[-2,-35],[-7,-27],[-9,-29]],p.fold);
      shape([[5,-48],[8,-45],[6,-35],[9,-27],[5,-24],[3,-35]],p.deep);
      if (back) {
        shape([[-9,-50],[0,-54],[10,-50],[13+flow*.3,-36],[4,-29],[-4,-30],[-13+flow*.3,-36]],p.outline);
        shape([[-7,-50],[0,-52],[8,-49],[10+flow*.3,-37],[3,-32],[-3,-33],[-10+flow*.3,-37]],lumina?p.ivory:p.coat);
        shape([[-4,-48],[-5+flow*.15,-37],[0,-34],[4,-37],[2,-49]],lumina?p.ivoryShade:p.fold);
        const badge=B(0,-43);star(c,badge[0],badge[1],4,p.goldLight);
        shape([[-9+flow*.3,-36],[-2,-32],[4,-31],[11+flow*.3,-36],[4,-29],[-4,-30]],p.gold);
      } else {
        shape([[-4,-51],[4,-51],[4,-37],[7+flow*.15,-21],[1,-18],[-5,-22],[-3,-36]],p.ivoryShade);
        shape([[-3,-51],[2,-51],[2,-36],[4+flow*.15,-22],[1,-20],[-2,-23],[-1,-36]],p.ivory);
        shape([[-8,-51],[-3,-53],[-1,-44],[-6,-45]],p.liningLight);
        shape([[4,-53],[10,-49],[6,-44],[1,-45]],p.lining);
        mark(-1,-46,2,3,p.goldLight);mark(-1,-40,2,2,p.gold);
        shape([[-9,-35],[8,-35],[9,-32],[-9,-32]],p.leather);
        mark(1,-35,4,4,p.gold);mark(2,-34,2,2,p.deep);
        shape([[-7,-34],[-11,-31],[-10,-25],[-5,-25],[-4,-31]],p.outline);
        shape([[-7,-33],[-9,-30],[-8,-27],[-6,-27],[-5,-31]],p.lining);
        mark(-8,-31,3,1,p.goldLight);
      }
      const headX=profile?2:0, hy=-63;
      shape([[headX-7,hy-7],[headX+5,hy-8],[headX+9,hy-3],[headX+9,hy+6],[headX+4,hy+11],[headX-4,hy+9],[headX-8,hy+3]],p.outline);
      if (!back) {
        shape([[headX-6,hy-5],[headX+5,hy-6],[headX+7,hy-2],[headX+7,hy+5],[headX+3,hy+9],[headX-3,hy+7],[headX-6,hy+2]],p.skinShade);
        shape([[headX-4,hy-5],[headX+4,hy-5],[headX+6,hy],[headX+6,hy+5],[headX+2,hy+7],[headX-3,hy+5]],p.skin);
        if (profile) {
          mark(headX+3,hy+1,3,2,p.outline);mark(headX+4,hy+1,1,2,p.eye);mark(headX+4,hy,1,1,p.hairLight);
          mark(headX+7,hy+3,2,2,p.skin);mark(headX+3,hy+6,2,1,p.skinShade);
        } else {
          mark(headX-3,hy+1,2,2,p.eye);mark(headX+3,hy+1,2,2,p.eye);
          mark(headX-3,hy,1,1,p.hairLight);mark(headX+3,hy,1,1,p.hairLight);
          mark(headX,hy+6,2,1,p.skinShade);
        }
      }
      // Swept, separately layered locks move less at the roots than at the tips.
      shape([[headX-7,hy-7],[headX+1,hy-10],[headX+7,hy-7],[headX+9,hy-2],[headX+6,hy+1],
        [headX+2,hy-3],[headX-1,hy+2],[headX-4,hy],[headX-6,hy+8],[headX-9+lag*.3,hy+12],[headX-9,hy-1]],p.hairShade);
      shape([[headX-6,hy-6],[headX+1,hy-8],[headX+6,hy-6],[headX+7,hy-3],[headX+4,hy-1],
        [headX+1,hy-5],[headX-2,hy],[headX-4,hy-2],[headX-6,hy+6],[headX-7,hy+8],[headX-7,hy-1]],p.hair);
      shape([[headX-5,hy-5],[headX,hy-7],[headX+4,hy-6],[headX+1,hy-5],[headX-2,hy-2],[headX-3,hy-4]],p.hairLight);
      if (back) {
        shape([[headX-6,hy-4],[headX+7,hy-3],[headX+8+lag*.2,hy+9],[headX+4+lag*.4,hy+16],[headX-2+lag*.5,hy+19],[headX-7+lag*.3,hy+11]],p.hairShade);
        shape([[headX-4,hy-4],[headX+4,hy-3],[headX+5+lag*.2,hy+8],[headX+2+lag*.4,hy+14],[headX-1+lag*.5,hy+16],[headX-5+lag*.3,hy+10]],p.hair);
        shape([[headX-2,hy-3],[headX,hy-3],[headX+1+lag*.2,hy+9],[headX-1+lag*.4,hy+13]],p.hairLight);
      } else {
        shape([[headX+6,hy-3],[headX+9,hy-1],[headX+10+lag*.25,hy+11],[headX+6+lag*.4,hy+15],[headX+6,hy+8]],p.hairShade);
        shape([[headX+7,hy-1],[headX+8,hy],[headX+8+lag*.25,hy+10],[headX+7+lag*.4,hy+12]],p.hair);
        mark(headX-7,hy+1,2,2,p.goldLight);
      }
      // A low star-trimmed travelling hat, with a soft asymmetric crown.
      const hatSway=lag*.12;
      shape([[-19+hatSway,-68],[-10,-72],[-7,-80],[-1,-84],[7,-81],[12,-73],[20+hatSway,-69],[17+hatSway,-65],[5,-64],[-9,-65]],p.outline);
      shape([[-16+hatSway,-68],[-8,-71],[-5,-79],[0,-81],[6,-79],[10,-72],[17+hatSway,-69],[15+hatSway,-67],[4,-66],[-8,-67]],p.coat);
      shape([[-5,-79],[0,-81],[4,-79],[2,-76],[-7,-71]],p.fold);
      shape([[-9,-71],[10,-72],[12,-70],[-9,-69]],p.lining);
      shape([[-15+hatSway,-68],[-7,-67],[5,-66],[15+hatSway,-68],[13+hatSway,-66],[4,-65],[-8,-66]],p.gold);
      const hatStar=B(back?-5:7,-71); star(c,hatStar[0],hatStar[1],3,p.goldLight);
      if(lumina) {
        shape([[-8,-74],[-13,-78],[-12,-74],[-17,-74],[-12,-71]],p.liningLight);
        mark(-10,-76,2,2,p.hairLight);
      }
      if(back) arm(c,rearShoulder,rearElbow,rearWrist,p,false,flow*.18);
      else arm(c,frontShoulder,frontElbow,frontWrist,p,false,flow*.16);
      // Staff orientation follows the wrist through a held wind-up and a sharp release.
      const staffAngle=fallen ? mix(-.08,.78,fall) : dash ? -.34 : -.08-stride*.04-windup*.24+release*.58;
      staff(c,frontWrist,staffAngle,p,chant ? .75 : casting ? Math.max(windup,release) : 0,time,still);
      if (release>.15 && !still) {
        c.save(); c.globalAlpha *= release*.55;
        const tip=[frontWrist[0]+Math.sin(staffAngle)*34,frontWrist[1]-Math.cos(staffAngle)*34];
        segment(c,[tip[0]-10,tip[1]+8],[tip[0]+5,tip[1]-3],2,p.glow);
        star(c,tip[0]+6,tip[1]-4,3,p.goldLight);c.restore();
      }
    } finally { c.restore(); }
  }
  window.DungeonCharacter = Object.freeze({draw});
})();
