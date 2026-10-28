/* Word Relic: boss archetypes, visible casting, contested spells, summons and NPC signatures. */
(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DungeonBossEvolution=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  var MELEE={king:1,prism:1,smith:1,sentinel:1};
  var SUMMONERS={spore:'菌絲孢僕',hollow:'殘鐘侍靈',witch:'鏡面使徒',astral:'墜星使徒',constellation:'失名紙靈',echo:'複音幻影',merchant:'契約收債者'};
  var STYLES={
    thorn:{name:'荊棘穿刺',type:'attack',word:'thorn',effect:'roots'},
    spore:{name:'繁衍菌潮',type:'attack',word:'bloom',effect:'summon'},
    witch:{name:'月鏡剝奪',type:'shield',word:'mirror',effect:'veil'},
    hollow:{name:'沉鐘共振',type:'attack',word:'echo',effect:'pulse'},
    astral:{name:'彗星癒光',type:'heal',word:'light',effect:'heal'},
    cometqueen:{name:'流星風暴',type:'attack',word:'storm',effect:'meteor'},
    constellation:{name:'雙星封書',type:'signature',word:'rune',effect:'seal'},
    healer:{name:'禁忌回春',type:'heal',word:'bloom',effect:'heal'},
    cartographer:{name:'寰宇星圖',type:'attack',word:'atlas',effect:'lattice'},
    ferryman:{name:'逆流禁渡',type:'shield',word:'ward',effect:'flood'},
    lantern:{name:'燈影反射',type:'shield',word:'ward',effect:'shield'},
    echo:{name:'回聲鏡像',type:'attack',word:'echo',effect:'summon'},
    lumina:{name:'月花星誓',type:'heal',word:'light',effect:'heal'},
    merchant:{name:'千金契印',type:'signature',word:'debt',effect:'summon'}
  };
  function id(run){return run&&run.enemy&&(run.enemy.npcId||run.enemy.id)||'';}
  function isMelee(run){return !!MELEE[id(run)];}
  function spec(run){return STYLES[id(run)]||STYLES.thorn;}
  function start(run,arena,boss){
    if(!run||!arena||!boss||isMelee(run))return null;
    var base=spec(run),turn=arena.patternCount||0;
    var kinds=['attack','shield','heal','signature'];
    var type=turn%3===2&&base.type==='attack'?'shield':base.type;
    var word=type==='shield'&&base.type!==type?'ward':base.word;
    var total=Math.max(1.4,Number(boss.action&&boss.action.duration)||2.2);
    var cast=arena.bossChant={type:type,word:word,name:base.name,effect:base.effect,
      elapsed:0,duration:total,serial:(arena.bossChantSerial||0)+1,status:'chanting'};
    arena.bossChantSerial=cast.serial;
    return cast;
  }
  function active(run){var c=run&&run.status==='combat'&&run.arena&&run.arena.bossChant;return c&&c.status==='chanting'?c:null;}
  function findBoss(arena){return (arena.enemies||[]).find(function(e){return e.kind==='boss'&&e.alive;});}
  function beginClash(run,arena,boss,spellType,effect){
    var chant=active(run);
    if(!chant||!boss||!boss.alive||chant.type!==spellType||arena.spellClash)return null;
    var needed=run.difficulty==='story'?8:run.difficulty==='veteran'?17:12;
    var clash=arena.spellClash={type:spellType,name:chant.name,word:chant.word,remaining:3.0,
      duration:3.0,taps:0,needed:needed,serial:(arena.spellClashSerial||0)+1};
    arena.spellClashSerial=clash.serial;
    // Cancel the committed boss spell's offensive zones when the magical duel begins.
    arena.hazards=(arena.hazards||[]).filter(function(h){return h.ownerId!==boss.id||h.actionId||h.disruption;});
    boss.volley=null;
    if(boss.action)boss.action=null;
    run.enemy.intent.remaining=Math.max(3.1,run.enemy.intent.remaining||0);
    chant.status='clash';
    if(effect)effect(arena,'counter',boss.x,boss.y,{text:'同系法術對決！',r:100,color:'#f1dd9e',life:1});
    return clash;
  }
  function mash(run,arena,effect){
    var clash=arena&&arena.spellClash;
    if(!clash||run.status!=='combat')return {ok:false};
    clash.taps=Math.min(80,clash.taps+1);
    if(effect)effect(arena,'impact',arena.player.x,arena.player.y,{color:'#e2d5ff',r:15,life:.17});
    return {ok:true,taps:clash.taps,needed:clash.needed};
  }
  function resolveClash(run,arena,api){
    var clash=arena.spellClash;if(!clash)return null;
    var won=clash.taps>=clash.needed,boss=findBoss(arena);
    arena.spellClash=null;arena.bossChant=null;arena.bossChantCooldown=3;
    if(boss&&boss.alive){
      boss.action=null;boss.counterReady=false;
      if(won){boss.counterWindow=Math.max(boss.counterWindow||0,2.6);
        boss.perfectWindow=Math.max(boss.perfectWindow||0,1.5);
        if(api.damage)api.damage(run,arena,boss,Math.min(40,22+(run.region||0)*5));
      }else if(api.hurt)api.hurt(run,arena,run.difficulty==='story'?9:run.difficulty==='veteran'?23:15);
    }
    if(api.effect)api.effect(arena,won?'counter':'impact',boss?boss.x:arena.player.x,boss?boss.y:arena.player.y,
      {text:won?'法術對決勝利！':'法術對決落敗',r:100,color:won?'#adf1ce':'#f1b0b0',life:1.1});
    arena.lastClash={won:won,taps:clash.taps,needed:clash.needed,serial:clash.serial};
    return arena.lastClash;
  }
  function tick(run,arena,dt,api){
    if(!arena||run.status!=='combat')return;
    if(arena.bossChantCooldown>0)arena.bossChantCooldown=Math.max(0,arena.bossChantCooldown-dt);
    var boss=findBoss(arena),chant=arena.bossChant;
    if(chant&&chant.status==='chanting'){
      if(!boss||!boss.action||arena.ritual&&arena.ritual.status==='charging'){arena.bossChant=null;}
      else {chant.elapsed=Math.min(chant.duration,chant.elapsed+dt);
        chant.duration=Math.max(chant.duration,Number(boss.action.duration)||chant.duration);}
    }
    var clash=arena.spellClash;
    if(clash){clash.remaining=Math.max(0,clash.remaining-dt);
      if(clash.remaining<=0||clash.taps>=clash.needed)resolveClash(run,arena,api);}
  }
  function wideMagic(run,arena,boss,add){
    if(!run||!boss||isMelee(run))return;
    // Oversized attacks always expose a real walkable safe lane and a visible tell.
    var turn=arena.patternCount||0,phase=run.enemy.phase||1;
    var dmg=Math.max(5,Math.round(6+run.region*2+(phase-1)*3));
    var delay=run.difficulty==='story'?2.0:1.65;
    var color=arena.room.color||'#bcabe8';
    var mode=turn%4;
    var safe=90+((turn*173+(run.region||0)*67)%4)*112;
    if(mode===0){
      add({kind:'rect',x:45,y:65,w:870,h:Math.max(10,safe-110),delay:delay,life:.58,damage:dmg,color:color});
      add({kind:'rect',x:45,y:safe+65,w:870,h:Math.max(10,490-(safe+65)),delay:delay,life:.58,damage:dmg,color:color});
    } else if(mode===1){
      for(var i=0;i<3;i++)add({kind:'line',x:55,y:100+i*145,x2:910,y2:100+i*145,width:62,delay:delay+i*.22,life:.47,damage:dmg,color:color});
    } else if(mode===2){
      add({kind:'ring',x:480,y:280,r:230,innerR:142,delay:delay,life:.6,damage:dmg,color:color});
      add({kind:'circle',x:arena.player.x,y:arena.player.y,r:90,delay:delay+.45,life:.35,damage:dmg,color:color});
    } else {
      var side=turn%2?55:610;
      add({kind:'rect',x:side,y:64,w:285,h:430,delay:delay,life:.7,damage:dmg,color:color});
      add({kind:'line',x:52,y:245,x2:908,y2:245,width:62,delay:delay+.5,life:.5,damage:dmg,color:color});
    }
    var effect=spec(run).effect;
    if(effect==='heal'){var shield=Math.min(30,(run.enemy.shield||0)+8);run.enemy.shield=shield;}
    if(effect==='flood'){add({kind:'rect',x:55,y:402,w:850,h:86,delay:delay+.3,life:.7,damage:4,pushX:90,color:'#8ccce3'});}
  }
  function summon(run,arena,boss,api){
    if(!run||!arena||!boss||!boss.alive||!SUMMONERS[id(run)])return 0;
    var summoned=(arena.enemies||[]).filter(function(e){return e.summoned&&e.alive;});
    if(summoned.length>=3||(arena.summonsTotal||0)>=7)return 0;
    var amount=Math.min(summoned.length?1:2,3-summoned.length,7-(arena.summonsTotal||0)),count=0;
    for(var i=0;i<amount;i++){
      var num=(arena.summonsTotal||0)+i,theta=(num*2.4+1.1);
      var minion={id:'summon-'+boss.id+'-'+(arena.nextId++),kind:num%3===1?'ranged':'chaser',
        sprite:num%3===1?'eye':'wisp',name:SUMMONERS[id(run)],summoned:true,
        x:Math.max(72,Math.min(885,boss.x+Math.cos(theta)*100)),
        y:Math.max(92,Math.min(475,boss.y+Math.sin(theta)*100)),
        r:14,hp:20+run.region*3,maxHp:20+run.region*3,alive:true,active:true,spawnAt:0,
        phase:1,cooldown:1.4,telegraph:0,chargeX:0,chargeY:0,chargeTime:0,volley:null,hurt:0,
        facingX:-1,facingY:0,action:null,counterWindow:0,perfectWindow:0,counterReady:false};
      if(api.place)api.place(arena,minion,minion.x,minion.y);
      arena.enemies.push(minion);
      // Existing engine distributes a shared enemy HP pool; preserve the invariant.
      run.enemy.hp+=minion.hp;run.enemy.maxHp+=minion.maxHp;
      if(api.effect)api.effect(arena,'spawn',minion.x,minion.y,{text:'召喚！',color:'#d5b6f1',r:34,life:.8});
      count++;
    }
    arena.summonsTotal=(arena.summonsTotal||0)+count;
    return count;
  }
  function interrupt(run,arena,api){
    if(!arena||run.status!=='combat')return false;
    var boss=findBoss(arena),chant=active(run),ritual=arena.ritual;
    if(!boss||(!chant&&ritual?.status!=='charging'&&boss.action?.kind!=='spell'))return false;
    if(ritual&&ritual.status==='charging')ritual.status='broken';
    if(arena.spellClash)arena.spellClash=null;
    arena.bossChant=null;arena.bossChantCooldown=5;
    arena.hazards=(arena.hazards||[]).filter(function(h){return h.ownerId!==boss.id||h.source==='trap';});
    arena.bossShots=(arena.bossShots||[]).filter(function(p){return p.ownerId!==boss.id;});
    arena.projectiles=(arena.projectiles||[]).filter(function(p){return p.ownerId!==boss.id;});
    boss.volley=null;boss.action=null;boss.counterWindow=3.3;boss.perfectWindow=2;
    boss.counterReady=false;boss.telegraph=0;run.enemy.action=null;
    run.enemy.intent.remaining=Math.max(2.3,run.enemy.intent.remaining);
    if(api.effect)api.effect(arena,'counter',boss.x,boss.y,{text:'破咒針打斷施法！',r:95,color:'#b1f0d9',life:1.1});
    arena.interrupts=(arena.interrupts||0)+1;
    return true;
  }
  return {MELEE,SUMMONERS,STYLES,id,isMelee,spec,start,active,beginClash,mash,resolveClash,tick,wideMagic,summon,interrupt};
});
