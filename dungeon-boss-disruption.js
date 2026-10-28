/* Boss spell-disruption attacks. All status data remains JSON-serializable. */
(function (root, factory) {
  'use strict';
  const api=factory();
  if (typeof module==='object' && module.exports) module.exports=api;
  if(root) root.DungeonBossDisruption=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const ATTACKS={
    sever:{name:'斷字斬',notice:'字符被斬斷，已寫的咒語會失去後半段',color:'#ffbb86',duration:1.5},
    veil:{name:'盲頁霧',notice:'尚未輸入的字符暫時被遮蔽',color:'#b5a0e9',duration:4.3},
    scatter:{name:'亂序風',notice:'字符被吹往畫面角落，但正確拼字不變',color:'#a2e3ee',duration:4.4},
    steal:{name:'咒語竊取',notice:'首領偷走目前咒語；躲過反擊，數秒後可取回',color:'#f0a0d9',duration:5.0}
  };
  const BOSS_STYLES={
    thorn:'sever', spore:'veil', witch:'steal', prism:'scatter',
    king:'sever', hollow:'veil', astral:'steal', cometqueen:'scatter', constellation:'steal',
    merchant:'steal', healer:'veil', smith:'sever', cartographer:'scatter', ferryman:'scatter',
    lantern:'veil', echo:'steal', sentinel:'sever', lumina:'veil'
  };
  function forBoss(run){
    const id=run && run.enemy && (run.enemy.npcId||run.enemy.id);
    return BOSS_STYLES[id]||null;
  }
  function active(run){
    const s=run && run.status==='combat' && run.arena && run.arena.spellDisruption;
    return s && s.remaining>0?s:null;
  }
  function schedule(run,arena,boss,hazard,effect){
    const type=forBoss(run),spec=ATTACKS[type];
    if(!spec || !arena || !boss || arena.ritual?.status==='charging')return null;
    // First stage cycle and every other cycle thereafter; readable and dash-avoidable.
    if((arena.roomPulse||0)%2!==1 && (run.enemy.phase||1)<2)return null;
    if(active(run))return null;
    const point=arena.player;
    const mark=hazard(arena,{
      source:'boss',ownerId:boss.id,disruption:type,
      x:point.x,y:point.y,kind:'circle',r:83,
      delay:1.75,life:.55,damage:0,color:spec.color
    });
    effect(arena,'impact',boss.x,boss.y,{text:spec.name+' · 警戒',color:spec.color,r:33,life:.8});
    arena.disruptionWarning={id:mark.id,kind:type,name:spec.name,remaining:1.75};
    return mark;
  }
  function apply(run,arena,type,effect,hazard){
    const spec=ATTACKS[type];if(!run||!arena||!spec||run.status!=='combat')return false;
    if(arena.ritual?.status==='charging'||active(run))return false;
    const boss=(arena.enemies||[]).find(e=>e.kind==='boss'&&e.alive);
    const serial=(arena.disruptionSerial||0)+1;
    arena.disruptionSerial=serial;
    arena.spellDisruption={kind:type,remaining:spec.duration,duration:spec.duration,
      serial,spellWord:run.spell?.word||'',source:boss?.id||run.enemy.id};
    arena.lastDisruption={kind:type,serial,name:spec.name,notice:spec.notice};
    arena.disruptionWarning=null;
    if(effect){
      const x=type==='steal'&&boss?boss.x:arena.player.x;
      const y=type==='steal'&&boss?boss.y:arena.player.y;
      effect(arena,'impact',x,y,{text:type==='steal'?'奪取 '+(run.spell?.word||'咒語'):spec.name,color:spec.color,r:59,life:1.05});
    }
    if(type==='scatter'){
      // A gust also displaces the mage, respecting world collision in caller.
      arena.disruptionGust={vx:arena.player.x<480?-150:150,vy:arena.player.y<280?-108:108,remaining:.32};
    }
    if(type==='steal'&&hazard&&boss){
      // The stolen word returns as a telegraphed, dodgeable echo attack.
      hazard(arena,{source:'boss',ownerId:boss.id,kind:'circle',
        x:arena.player.x,y:arena.player.y,r:56,delay:1.4,life:.35,
        damage:run.difficulty==='story'?5:9,color:spec.color});
    }
    return true;
  }
  function tick(run,arena,realDt){
    if(!arena)return;
    const w=arena.disruptionWarning;
    if(w){w.remaining=Math.max(0,w.remaining-realDt);
      if(w.remaining<=0)arena.disruptionWarning=null;}
    const state=arena.spellDisruption;
    if(!state||!Number.isFinite(state.remaining))return;
    state.remaining=Math.max(0,state.remaining-realDt);
    if(state.remaining<=0){arena.spellDisruption=null;arena.disruptionGust=null;}
  }
  function blocksCast(run){const s=active(run);return !!s&&s.kind==='steal'&&s.spellWord===run.spell?.word;}
  return {ATTACKS,BOSS_STYLES,forBoss,active,schedule,apply,tick,blocksCast};
});
