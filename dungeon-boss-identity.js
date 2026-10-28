/* Word Relic — 18 boss identities. Mechanics are deterministic, JSON-saveable,
 * telegraphed, and keep a real counterplay path. */
(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DungeonBossIdentity=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  var PROFILES={
    thorn:{name:'棘冠典獄長',title:'蔓生王庭',role:'蔓生控制',special:'藤蔓從地板持續生長，封鎖走位並纏住碰到的玩家。',counter:'預先記住藤蔓之間的路，使用衝刺跨越；完成咒語可清除附近藤蔓。',phase2:'藤蔓生長速度提升，逐步形成危險的荊棘地毯。',color:'#98d58b'},
    spore:{name:'孢冠菌后',title:'菌絲蔓延',role:'感染召喚',special:'落點記憶孢子會分裂成持續散播的菌沼，並召喚菌絲孢僕。',counter:'不要站在重疊的孢子圈內，優先清掉召喚物。',phase2:'菌沼持續更久，召喚與孢雨交錯。',color:'#d7bf91'},
    witch:{name:'鏡月女巫',title:'假月鏡術',role:'幻象吸血',special:'召喚可見的月鏡幻影，幻影與本體交錯射出偷取生命的光束。',counter:'辨認帶血條的本體，利用鏡影射線預警閃開，護盾阻止吸血。',phase2:'鏡像數量與光束交錯增加。',color:'#c3a6f3'},
    prism:{name:'千面鏡獸',title:'折鏡穿梭',role:'瞬移獵殺',special:'戰場設有四座鏡面。鏡獸先標記出口，隨後鑽進一面鏡子並從另一面瞬移出來突襲。',counter:'觀察發光出口約 0.85 秒的預警，不要追逐原地殘影；出鏡後仍有可反擊的間隙。',phase2:'穿鏡次數增加，鏡影殘像會爆發碎晶。',color:'#b1e5ef'},
    king:{name:'失名之王',title:'王權敕令',role:'重劍裁決',special:'地板受到王座敕令劃分成禁行區，配合延遲重劍與追身斬。',counter:'看準第一次抬劍而不是猜斬擊時間，別退到王權封鎖區。',phase2:'封鎖區擴大，三段劍勢更快。',color:'#ecac86'},
    hollow:{name:'空鐘司祭',title:'十三鐘鳴',role:'節奏陷阱',special:'大鐘以固定拍點釋放擴散鐘波，被鐘波擊中會短暫緩速。',counter:'記住一、二、三聲的間隔，站在環與環之間，別在鐘聲前貪刀。',phase2:'敲鐘節奏加快並疊加禁行區。',color:'#bdb4e3'},
    astral:{name:'忘誓星龍',title:'星軌天穹',role:'星圖壓制',special:'星龍繪製星座連線，整條星軌會在預告之後爆發。',counter:'提前選擇星線之間的空白區，星雨落下時沿軌道缺口移動。',phase2:'星座連線增加並交叉。',color:'#d8b6eb'},
    cometqueen:{name:'彗尾女皇',title:'雙彗降臨',role:'彗星縱橫',special:'雙向彗星劃破戰場，隕星碎片會循序落在不同方位。',counter:'辨識左右交錯的彗尾，依落星順序穿過間隙。',phase2:'彗星尾跡變密，隕落次數增加。',color:'#f4bcae'},
    constellation:{name:'失約星影',title:'往昔星痕',role:'記憶追蹤',special:'星影記錄玩家數秒前的腳步，在記憶落點再現幻影與封鎖法術。',counter:'持續改變移動方向，切勿回到剛走過的位置。',phase2:'一次追索更多舊位置。',color:'#edb3db'},
    merchant:{name:'鍍金旅商・柯恩',title:'禁契金庫',role:'金幣彈幕',special:'發出追債金彈與封閉金庫，場上掉落可拾取的護盾契金。',counter:'金幣彈幕之間收集亮起的契金回復護盾，再突破封路。',phase2:'契金出現位置變動，金庫封鎖更緊密。',color:'#f4d278'},
    healer:{name:'苔露醫師・芙苓',title:'藥園兩面',role:'毒與療癒',special:'藥園長出毒花和月露芽；Boss 會藉花園增強護盾，玩家可搶先採集月露芽治療。',counter:'辨認帶光暈的治癒花和紅色毒霧，靠近安全花心回復生命。',phase2:'毒花的蔓延與自我防護更頻繁。',color:'#9be5b5'},
    smith:{name:'星鐵鍛師・布洛',title:'灼熱鐵砧',role:'重鎚熔爐',special:'場地左右熔爐交替過熱，錘擊會把高溫波紋傳遍鐵砧。',counter:'觀察爐口變紅的方向，避開烈焰後抓住沉重收招。',phase2:'兩座熔爐開始交錯噴發。',color:'#ffae82'},
    cartographer:{name:'迷途繪師・墨里',title:'改寫地圖',role:'安全區轉換',special:'每次改圖後只有一道安全航線，其他畫出的格線會發光爆發。',counter:'看地板淡色的安全行，別按照上一回合的路線逃跑。',phase2:'安全航線更頻繁地轉移。',color:'#b8aaff'},
    ferryman:{name:'渡燈船夫・赫渡',title:'逆流渡口',role:'浪潮位移',special:'地板形成有方向的潮流，玩家會被推動到另一道靈潮的路徑上。',counter:'順流斜切撤退，必要時用衝刺脫離，避免被推到邊界。',phase2:'潮水方向變換更快，吸魂區加大。',color:'#8bd7e5'},
    lantern:{name:'燈旅精靈・路米',title:'光與蝕',role:'光暗對照',special:'長夜會遮蔽咒語字符；暖光燈圈內可以暫時獲得護盾。',counter:'先站進亮起的燈圈取得庇護，再穿越黑暗。',phase2:'可依靠的燈圈更少，暗影擴散更快。',color:'#8ae7d4'},
    echo:{name:'回聲學徒・伊可',title:'複音劇場',role:'回放影身',special:'記錄你的上一段站位，幻音分身從舊位置延遲釋放第二擊。',counter:'看到回聲影像後立刻換位，利用原本和回放之間的時間差。',phase2:'連續留下多個回放影身。',color:'#c5a4ff'},
    sentinel:{name:'紙甲衛士・折鋒',title:'折頁劍陣',role:'近戰守反',special:'紙牆折疊改變攻擊走廊，衛士高速連擊後會出現可反擊的破綻。',counter:'沿紙牆的缺口移動，等連段結束再施法，不要在第一斬後急著反擊。',phase2:'紙牆與快速三段刺交替出現。',color:'#f4d491'},
    lumina:{name:'星露法師・露米娜',title:'月花守望',role:'月花互動',special:'月花會在地板上短暫綻放；站進光亮花心治療，花外的月環則會爆發。',counter:'沿花瓣內側移動，借月花療癒避開外圈星術。',phase2:'更多月花同時綻放，交錯星軌更複雜。',color:'#f0b6e3'}
  };
  var clamp=function(v,min,max){return Math.max(min,Math.min(max,v));};
  function identity(run){return run&&run.enemy&&(run.enemy.npcId||run.enemy.id)||'';}
  function profile(run){return PROFILES[identity(run)]||null;}
  function ensure(run,area){
    if(!run||run.status!=='combat'||!area||!area.room||!area.room.bossId)return null;
    var id=identity(run);
    if(!PROFILES[id])return null;
    if(!area.bossIdentity||area.bossIdentity.id!==id){
      area.bossIdentity={id:id,pulse:0,vines:[],mirrors:[],decoys:[],flowers:[],coins:[],trace:[],
        traceClock:0,mirrorClock:2.8,warp:null,clock:0,cooldown:0,phase:run.enemy.phase||1};
    }
    var b=area.bossIdentity;
    if(id==='prism'&&b.mirrors.length!==4)b.mirrors=[{x:285,y:150},{x:690,y:410},{x:695,y:148},{x:295,y:414}];
    return b;
  }
  function effect(api,area,kind,x,y,text,color){
    if(api&&api.effect)api.effect(area,kind,x,y,{text:text||'',color:color||'#d2f3f0',r:50,life:.9});
  }
  function marked(api,area,boss,style,spec){
    return api.hazard(area,Object.assign({source:'boss',ownerId:boss.id,color:style.color,
      damage:7,delay:1.55,life:.5},spec));
  }
  function dropItem(list,pulse,point,kind,life){
    list.push({id:kind+'-'+pulse+'-'+list.length,x:point.x,y:point.y,life:life||11,ready:.85,used:false});
    if(list.length>12)list.splice(0,list.length-12);
  }
  function pulse(run,area,boss,api){
    var state=ensure(run,area);if(!state||!boss||!boss.alive)return;
    var id=state.id,p=area.player,phase=run.enemy.phase||1,theme=PROFILES[id];
    state.pulse+=1;var n=state.pulse,mark=function(spec){return marked(api,area,boss,theme,spec);};
    function point(dx,dy){return{x:clamp(p.x+dx,100,860),y:clamp(p.y+dy,103,458)};}
    if(id==='thorn'){
      var count=phase===2?5:3;
      for(var i=0;i<count;i++){
        var cx=130+((n*113+i*163)%680),cy=109+((n*91+i*119)%345);
        // Predictable vines grow from the far edge of the player's current route.
        if(i===0){cx=clamp(p.x+Math.cos(n*1.7)*115,90,865);cy=clamp(p.y+Math.sin(n*1.7)*100,95,465);}
        var vine={id:'vine-'+n+'-'+i,x:cx,y:cy,r:phase===2?37:31,life:phase===2?34:28,grow:1.5};
        state.vines.push(vine);
        vine.hazardId=mark({x:cx,y:cy,r:vine.r,delay:1.45,life:vine.life-1.45,
          damage:phase===2?8:6,repeat:true,hexEffect:'snare',color:'#77c989',terrain:'vine'}).id;
      }
      if(state.vines.length>24){
        var trimmed=state.vines.splice(0,state.vines.length-24).map(function(v){return v.hazardId;});
        area.hazards=(area.hazards||[]).filter(function(h){return trimmed.indexOf(h.id)<0;});
      }
    }else if(id==='spore'){
      for(var s=0;s<(phase===2?3:2);s++){var q=point(Math.sin(n*2+s*2)*110,Math.cos(n+s*2.1)*94);
        mark({x:q.x,y:q.y,r:52+s*9,delay:1.4+s*.25,life:5.5,repeat:true,damage:5,color:'#c5ba81',terrain:'mycelium'});
      }
    }else if(id==='witch'){
      for(var w=0;w<(phase===2?3:2);w++){
        var angle=n*.8+w*6.283/(phase===2?3:2),x=480+Math.cos(angle)*260,y=280+Math.sin(angle)*145;
        state.decoys.push({x:x,y:y,life:3.8,kind:'mirror'});
        mark({kind:'line',x:x,y:y,x2:p.x,y2:p.y,width:phase===2?37:26,
          delay:1.65+w*.2,life:.55,damage:8,drain:true,color:'#bea6ff'});
      }
    }else if(id==='prism'){
      if(state.mirrorClock>1.2)state.mirrorClock=1.2;
      var m=state.mirrors[(n+1)%4];
      state.decoys.push({x:m.x,y:m.y,life:2.7,kind:'prism'});
      mark({kind:'line',x:m.x,y:m.y,x2:p.x,y2:p.y,width:30,delay:2.0,life:.5,damage:9,color:'#a8e4f9'});
    }else if(id==='king'){
      var left=n%2===0;
      mark({kind:'rect',x:left?55:687,y:90,w:220,h:370,delay:1.85,life:1.15,damage:10,color:'#eb957c'});
      mark({kind:'line',x:70,y:left?177:382,x2:880,y2:left?177:382,width:47,delay:2.2,damage:8});
    }else if(id==='hollow'){
      [125,210,290].forEach(function(r,i){
        mark({kind:'ring',x:480,y:280,r:r,innerR:r-30,delay:1.5+i*(phase===2?.34:.53),
          damage:7,hexEffect:'snare',color:'#bbaee7'});
      });
    }else if(id==='astral'){
      var stars=[];for(var j=0;j<(phase===2?5:4);j++){var a=n*.27+j*2*Math.PI/(phase===2?5:4);
        stars.push({x:480+Math.cos(a)*290,y:280+Math.sin(a)*150});}
      for(var k=1;k<stars.length;k++)mark({kind:'line',x:stars[k-1].x,y:stars[k-1].y,
        x2:stars[k].x,y2:stars[k].y,width:39,delay:1.75+(k-1)*.18,life:.52,damage:8,color:'#d4b7f6'});
    }else if(id==='cometqueen'){
      for(var c=0;c<(phase===2?4:3);c++){
        var fromLeft=(n+c)%2===0,x=fromLeft?65:895,y=112+c*100;
        mark({kind:'line',x:x,y:y,x2:fromLeft?895:65,y2:455-y*.28,width:35,
          delay:1.75+c*.2,life:.42,damage:9,color:'#ffc4b9'});
      }
    }else if(id==='constellation'||id==='echo'){
      var trail=state.trace.length?state.trace.slice(-(phase===2?4:2)): [{x:p.x,y:p.y}];
      trail.forEach(function(q,i){state.decoys.push({x:q.x,y:q.y,life:2.3+(i*.25),kind:id==='echo'?'echo':'memory'});
        mark({x:q.x,y:q.y,r:phase===2?70:53,delay:1.65+i*.4,life:.48,damage:8,color:theme.color});});
    }else if(id==='merchant'){
      for(var gold=0;gold<2;gold++)dropItem(state.coins,n,point((gold?1:-1)*155,(gold?1:-1)*75),'coin',10);
      mark({kind:'ring',x:boss.x,y:boss.y,r:210,innerR:172,delay:1.85,life:.5,damage:8,color:'#e8bc67'});
    }else if(id==='healer'){
      dropItem(state.flowers,n,point(-145,80),'flower',12);
      dropItem(state.flowers,n,point(150,-80),'flower',12);
      run.enemy.shield=Math.min(60,(run.enemy.shield||0)+(phase===2?12:7));
      mark({kind:'ring',x:boss.x,y:boss.y,r:190,innerR:145,delay:2,life:.8,damage:8,color:'#9cdc9c'});
    }else if(id==='smith'){
      var hot=n%2===0,rows=phase===2?[110,382]:[hot?110:382];
      rows.forEach(function(y,i){mark({kind:'rect',x:80,y:y,w:800,h:76,delay:1.9+i*.5,life:1.15,repeat:true,damage:8,color:'#ef976e'});});
    }else if(id==='cartographer'){
      var safe=(n*3+run.region)%4;
      state.safeLane=safe;
      for(var lane=0;lane<4;lane++)if(lane!==safe)mark({kind:'rect',x:72,y:75+lane*104,w:816,h:96,
        delay:1.8,life:.8,damage:8,color:'#abacf0'});
    }else if(id==='ferryman'){
      var direction=n%2?-1:1;
      mark({kind:'rect',x:70,y:n%2?112:330,w:820,h:110,delay:1.7,life:1.6,
        pushX:direction*170,repeat:true,damage:5,color:'#80d2dd'});
    }else if(id==='lantern'){
      var light=point(n%2?160:-160,n%2?-85:85);
      dropItem(state.flowers,n,light,'lantern',10);
      mark({kind:'rect',x:n%2?60:535,y:66,w:365,h:415,delay:1.8,life:1.15,damage:0,disruption:'veil',color:'#7470a8'});
    }else if(id==='sentinel'){
      var gap=135+((n%3)*110);
      mark({kind:'rect',x:gap+93,y:85,w:64,h:390,delay:1.85,life:.9,damage:8,color:'#e3c78e'});
      mark({kind:'rect',x:gap-90,y:85,w:64,h:390,delay:1.85,life:.9,damage:8,color:'#e3c78e'});
    }else if(id==='lumina'){
      for(var l=0;l<(phase===2?3:2);l++){
        var flowerX=235+l*(phase===2?245:490);
        dropItem(state.flowers,n,{x:flowerX,y:phase===2?220:300},'moonflower',10);
        mark({kind:'ring',x:flowerX,y:phase===2?220:300,r:88,innerR:57,delay:1.8+l*.3,life:.62,damage:7,color:'#edb8e7'});
      }
    }
  }
  function tick(run,area,dt,api){
    var state=ensure(run,area);if(!state||run.status!=='combat')return;
    var boss=(area.enemies||[]).find(function(e){return e.kind==='boss'&&e.alive;});
    if(!boss)return;
    state.clock+=dt;
    var p=area.player;
    function expire(items){for(var i=items.length-1;i>=0;i--){items[i].life-=dt;items[i].ready=Math.max(0,(items[i].ready||0)-dt);if(items[i].life<=0)items.splice(i,1);}}
    expire(state.vines);expire(state.decoys);expire(state.flowers);expire(state.coins);
    if(state.id==='thorn'){
      var aliveIds=state.vines.map(function(v){return v.hazardId;});
      area.hazards=area.hazards.filter(function(h){return h.terrain!=='vine'||aliveIds.indexOf(h.id)>=0;});
    }
    state.vines.forEach(function(v){v.grow=Math.max(0,(v.grow||0)-dt);});
    state.traceClock-=dt;
    if(state.traceClock<=0){
      state.traceClock=.4;
      state.trace.push({x:p.x,y:p.y});
      if(state.trace.length>16)state.trace.shift();
    }
    if(state.id==='prism'){
      var warp=state.warp;
      if(warp){
        warp.remaining-=dt;
        if(warp.remaining<=0){
          if(api.place)api.place(area,boss,warp.target.x,warp.target.y);
          else {boss.x=warp.target.x;boss.y=warp.target.y;}
          state.decoys.push({x:warp.from.x,y:warp.from.y,life:1.5,kind:'prism'});
          state.decoys.push({x:warp.target.x,y:warp.target.y,life:1,kind:'prism'});
          state.warp=null;state.mirrorClock=run.enemy.phase===2?2.8:4;
          boss.counterWindow=Math.max(boss.counterWindow||0,.8);
          effect(api,area,'counter',boss.x,boss.y,'鏡面躍出','#b7edfa');
          if(api.hazard)marked(api,area,boss,PROFILES.prism,{
            x:boss.x,y:boss.y,r:75,delay:.9,life:.35,damage:9,color:'#a8e9f2'});
        }
      }else if(!area.spellClash && area.ritual?.status!=='charging' && !boss.action && boss.counterWindow<=0){
        state.mirrorClock-=dt;
        if(state.mirrorClock<=0){
          var pool=state.mirrors.filter(function(m){return Math.hypot(m.x-boss.x,m.y-boss.y)>125;});
          pool.sort(function(a,b){return Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y);});
          var mirror=pool[(state.pulse||0)%Math.min(pool.length,2)]||state.mirrors[0];
          state.warp={remaining:.85,total:.85,target:{x:mirror.x,y:mirror.y},
            from:{x:boss.x,y:boss.y}};
          state.mirrorClock=4;
          area.lastPattern='折鏡穿梭 · 先看發光出口';
        }
      }
    }
    // Pickups are earned by stepping into an actual visible rune,
    // never by entering a dangerous ring.
    state.flowers.concat(state.coins).forEach(function(item){
      if(item.used||item.ready>0||Math.hypot(item.x-p.x,item.y-p.y)>30)return;
      item.used=true;item.life=.35;
      if(item.id.indexOf('coin-')===0){
        run.player.shield=Math.min(90,run.player.shield+7);
        effect(api,area,'shield',item.x,item.y,'契金護盾 +7','#f7d680');
      }else if(item.id.indexOf('lantern-')===0){
        run.player.shield=Math.min(90,run.player.shield+8);
        effect(api,area,'shield',item.x,item.y,'燈光庇護 +8','#b7efdc');
      }else{
        if(api.heal)api.heal(run,7);
        effect(api,area,'heal',item.x,item.y,'月露治癒 +7','#c5f6cc');
      }
    });
  }
  function afterCast(run,area,api){
    var state=ensure(run,area);if(!state||state.id!=='thorn'||!state.vines.length)return 0;
    var p=area.player,sorted=state.vines.slice().sort(function(a,b){
      return Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y);});
    var cleared=sorted.filter(function(v){return Math.hypot(v.x-p.x,v.y-p.y)<190;}).slice(0,2);
    if(!cleared.length)return 0;
    var ids=cleared.map(function(v){return v.hazardId;});
    state.vines=state.vines.filter(function(v){return ids.indexOf(v.hazardId)<0;});
    area.hazards=area.hazards.filter(function(h){return ids.indexOf(h.id)<0;});
    cleared.forEach(function(v){effect(api,area,'impact',v.x,v.y,'解開藤蔓','#b5f4ad');});
    return cleared.length;
  }
  return {PROFILES:PROFILES,identity:identity,profile:profile,ensure:ensure,pulse:pulse,tick:tick,afterCast:afterCast};
});
