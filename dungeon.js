(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const Engine = window.DungeonEngine, Storage = window.DungeonStorage, Arena = window.DungeonArena, Explore = window.DungeonExplore;
  const cards = window.ENROOT_CARDS || [];
  const renderer = new window.DungeonArenaRenderer($('arena'));
  const soundtrack = new window.DungeonAudio();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const names = Engine.REGIONS.map(region=>region.name);
  const bosses = ['棘冠典獄長', '鏡月女巫', '失名之王'];
  const spellTypes = {attack:'攻擊咒', heal:'治癒咒', shield:'護盾咒', signature:'卡片奧義'};
  const icons = {battle:'⚔', elite:'✦', boss:'♜', treasure:'◇', camp:'♨', shop:'¤', attack:'ϟ', heal:'✚', shield:'⛨', signature:'✦'};
  let run = null, receipt = null, saved = null, selectedWord = '', paused = false, busy = false, finished = false;
  let lastTime = 0, lastPaint = 0, saveClock = 0, audioEnabled = false, sessionHeld = false, persistenceBroken = false;
  let logSignature = '', sidebarSignature = '', actionSignature = '', settlementPromise = null, releaseSession = null;
  let chanting = false, dashQueued = false, chosenDifficulty = 'standard';
  const heldKeys = new Set(), keyTimes = new Map(), touchDirections = new Map(), tapPulses = new Map();
  const directionKeys = {KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
  const difficultyNames = {story:'故事',standard:'標準',veteran:'試煉'};
  const explorationStatuses = ['route','shop','npc','camp','reward'];
  function navigable(){return run && (run.status==='combat' || explorationStatuses.includes(run.status));}
  function world(){return run?.status==='combat'?run.arena:run?.exploration;}
  function inConversation(){return explorationStatuses.includes(run?.status) && !!run?.exploration?.dialogId;}

  function notify(message, error) { $('feedback').textContent = message || ''; $('feedback').classList.toggle('error', !!error); }
  function tone(kind) {
    if(audioEnabled)soundtrack.sfx(['attack','shield','signature'].includes(kind)?'cast':kind==='damage'?'hit':kind);
  }
  function syncAudio() {
    soundtrack.setScene({region:run?.region || 0,combat:run?.status==='combat',boss:run?.enemy?.kind==='boss' && run?.status==='combat',paused:paused || document.hidden,focus:chanting});
  }
  function clearMovement() {
    heldKeys.clear();keyTimes.clear();touchDirections.clear();tapPulses.clear();dashQueued=false;
    document.querySelectorAll('[data-move]').forEach(button=>button.classList.remove('held'));
  }
  function movementInput() {
    const directions=new Set(touchDirections.values()),now=performance.now();
    heldKeys.forEach(code=>{if(directionKeys[code])directions.add(directionKeys[code]);});
    tapPulses.forEach((until,direction)=>{if(now<until)directions.add(direction);else tapPulses.delete(direction);});
    return {x:Number(directions.has('right'))-Number(directions.has('left')),y:Number(directions.has('down'))-Number(directions.has('up')),dash:dashQueued,focus:chanting};
  }
  function setChant(value) {
    if(!run || run.status!=='combat' || paused || persistenceBroken)value=false;
    chanting=!!value;clearMovement();
    const input=$('spellInput');
    if(input){input.readOnly=!chanting;input.placeholder=chanting?'輸入英文，Enter 施法…':'按 Enter 開始詠唱…';if(chanting && document.activeElement!==input)input.focus({preventScroll:true});if(!chanting && document.activeElement===input)input.blur();}
    $('actionPanel').classList.toggle('is-chanting',chanting);
    $('chantButton').textContent=chanting?'Esc · 返回走位':'Enter · 詠唱';
    syncAudio();updateArenaHUD();
  }
  function requestDash() {
    if(!navigable() || paused || persistenceBroken || inConversation())return;
    if(chanting)setChant(false);dashQueued=true;$('arena').focus({preventScroll:true});
  }
  function updateArenaHUD() {
    const active=!!navigable(),combat=run?.status==='combat';
    $('arenaHUD').hidden=!active;$('movementBar').hidden=!active;$('touchControls').hidden=!active;
    $('focusFlag').hidden=!combat || !chanting;$('focusAbility').hidden=!combat;$('chantButton').hidden=!combat;$('interactButton').hidden=!active || combat;
    if(!active || !world())return;
    const arena=world(),player=arena.player;
    if(combat){
      const remaining=arena.enemies.filter(enemy=>enemy.hp>0 && enemy.active).length;
      $('roomBadge').textContent=arena.room.name;$('roomBadge').title=arena.room.description;
      $('enemyCount').textContent=remaining+' 位敵人'+(arena.room.id==='waves'?' · 第 '+(arena.wavesReleased || 1)+'/3 波':'');
    }else{
      const target=Explore.nearest(run);
      $('roomBadge').textContent={route:'命運路口',shop:'遊商驛站',npc:'旅途相逢',camp:'星燈營地',reward:'戰利品祭壇'}[run.status];
      $('roomBadge').title='走近場景中的角色或物件，按 E 互動';
      $('enemyCount').textContent=inConversation()?'交談中 · Esc 返回':target?'E · '+target.name:'靠近發光物件';
      $('interactButton').disabled=!target || inConversation();$('interactButton').textContent=target?'E · 互動':'E · 請先靠近';
      $('arena').dataset.nearby=target?.id || '';
    }
    $('dashLabel').textContent=player.dashCooldown>0?player.dashCooldown.toFixed(1)+'s':'就緒';
    $('dashBar').style.width=Math.max(0,100*(1-player.dashCooldown/1.4))+'%';
    $('focusBar').style.width=(player.focusEnergy || 0)+'%';$('focusLabel').textContent=Math.round(player.focusEnergy || 0)+'%';
    $('focusFlag').textContent=arena.focusActive?'詠唱中 · 時間放慢':'專注耗盡 · 返回走位可恢復';
    $('focusFlag').classList.toggle('exhausted',!arena.focusActive);
    $('arena').dataset.playerX=player.x.toFixed(1);$('arena').dataset.playerY=player.y.toFixed(1);
    $('arena').dataset.dashCount=String(arena.dashes || 0);$('arena').dataset.focus=String(chanting);$('arena').dataset.mode=run.status;
    $('touchControls').inert=paused || inConversation();
  }
  async function claimSession() {
    if (sessionHeld) return true;
    if (!navigator.locks) { sessionHeld = true; return true; }
    return new Promise(resolve => {
      navigator.locks.request('enroot-dungeon-play-session', {ifAvailable:true}, async lock => {
        if (!lock) { resolve(false); return; }
        sessionHeld = true; resolve(true);
        await new Promise(release => {releaseSession=release;window.addEventListener('pagehide', release, {once:true});});
        sessionHeld = false;
      }).catch(() => resolve(false));
    });
  }
  function storageFailure(result) {
    persistenceBroken = true; paused = true; syncPause();
    notify(result.error || '無法儲存進度，冒險已暫停。請重新整理後接續。', true);
  }
  async function persist() {
    if (!run || run.practice || !receipt || persistenceBroken) return;
    const result = await Storage.saveRun(run, receipt.id);
    if (!result.ok) storageFailure(result);
  }
  function panel(title, content, extra='') { return `<section class="side-panel ${extra}"><div class="panel-title"><h2>${title}</h2></div>${content}</section>`; }
  function catalogValues(value) { return Array.isArray(value) ? value : Object.values(value || {}); }
  function journey() {
    $('journeyStops').innerHTML = names.map((name,i) => `<div class="journey-stop ${i === (run?.region || 0) ? 'current' : ''} ${run && (i < run.region || run.status === 'won') ? 'cleared' : ''}"><span class="journey-number">0${i+1}</span><div><strong>${esc(name)}</strong><small>${esc(bosses[i])}</small></div><span>${run && i < run.region ? '已突破' : '封印 '+(i+1)}</span></div>`).join('');
  }
  function entryCard(card, owned) {
    const art = window.ENROOT_PIXEL_ART ? window.ENROOT_PIXEL_ART(card, 'large') : '';
    const rank = {N:0,R:1,SR:2,SSR:3,UR:4}[card.rarity] || 0;
    return `<div class="entry-card"><span class="rarity-label">${esc(card.rarity)}</span><div class="card-art">${art}</div>${owned ? '' : '<div class="preview-card-note">練習用借閱卡</div>'}<strong>${esc(card.word)}</strong><div class="translation">${esc(card.zh)}</div><div class="entry-effect">奧義咒語 · ${esc(card.word)}<br>生命 +${rank*3} · 奧義基礎威力 +${rank}</div></div>`;
  }
  function lobby() {
    if(releaseSession){releaseSession();releaseSession=null;sessionHeld=false;}
    run = null; receipt = null; paused = false; finished = false; persistenceBroken = false; settlementPromise = null;
    chanting=false;clearMovement();document.body.classList.remove('in-run');$('actionPanel').classList.remove('combat-panel','is-chanting');$('actionPanel').inert=false;
    actionSignature = sidebarSignature = logSignature = '';
    $('pauseButton').hidden = true; $('pauseOverlay').hidden = true; $('bossBanner').hidden = true;
    $('modeLabel').textContent = '以單字喚醒魔法'; $('floorLabel').textContent = '尚未出發'; $('chapterLabel').textContent = 'CHAPTER I'; $('regionLabel').textContent = names[0];
    $('arenaCaption').hidden = false; $('arenaCaption').textContent='✧ 古老的文字，正在等待回聲。'; $('hpText').textContent = '120 / 120'; $('hpBar').style.width = '100%';
    $('shieldText').textContent = '0'; $('goldText').textContent = '0'; $('comboText').textContent = '× 0';
    $('actionPanel').innerHTML = `<div class="action-heading"><h3>走位、閃避，讓文字化為力量</h3><span class="pill">動作遠征</span></div><p>穿過彈幕與地面陷阱，在敵人的破綻中詠唱。走近傳送門選路、與旅人交談，決定接受善意或展開挑戰。</p><div class="onboarding"><div><em>01 / MOVE</em><b>自由移動</b>WASD 或方向鍵<br>繞過敵人與掩體</div><div><em>02 / DASH</em><b>衝刺閃避</b>空白鍵瞬間位移<br>穿過危險彈幕</div><div><em>03 / CHANT</em><b>專注詠唱</b>Enter 放慢時間<br>打字釋放魔法</div></div>`;
    renderDeparture(); journey();updateArenaHUD();syncAudio();
  }
  function renderDeparture() {
    const collection = Storage.listOwned(cards), owned = collection.ok ? collection.cards : [];
    if (!owned.some(c => c.word === selectedWord)) selectedWord = owned[0]?.word || '';
    const card = owned.find(c => c.word === selectedWord) || cards.find(c=>c.word === 'predict') || cards[0];
    const active = saved?.active;
    $('sidebar').innerHTML = `<section class="side-panel departure"><div class="panel-title"><h2>${active ? '尚未結束的冒險' : '選擇入場卡片'}</h2><span>${owned.reduce((n,c)=>n+c.count,0)} 張收藏</span></div>${owned.length ? `<label for="entrySelect">從已抽到的卡片中選擇</label><select id="entrySelect" ${active ? 'disabled' : ''}>${owned.map(c=>`<option value="${esc(c.word)}" ${c.word===selectedWord?'selected':''}>${esc(c.word)} · ${esc(c.rarity)} · ×${c.count}</option>`).join('')}</select>` : '<div class="empty-inventory">還沒有收藏卡片。<br><a href="index.html">完成 10 題，抽取第一張卡</a>，或先免費練習。</div>'}${entryCard(active ? cards.find(c=>c.word===active.receipt.word)||card : card, owned.length>0)}<p class="entry-note">${active ? '你的進度已保存。接續冒險不會再次消耗卡片。' : '正式入場將消耗所選卡片 1 張。<br>失敗不退還；每次冒險重新生成路線。'}</p>${active ? '<button id="continueRun" class="primary wide">接續冒險</button><button id="abandonSaved" class="secondary wide">結束這次冒險</button>' : `<button id="startRun" class="primary wide" ${!owned.length || !collection.ok ? 'disabled' : ''}>消耗 1 張 · 踏入地牢</button><button id="practiceRun" class="secondary wide">免費練習 · 不消耗卡片</button>`}<div class="save-note">${active ? '進度已保存' : '正式冒險自動保存 · 隨時回來繼續'}</div></section><section class="side-panel tip-panel"><div class="eyebrow">A WORD OF ADVICE</div><p>普通卡也能走到最後。把重複抽到的卡片帶進地牢，讓每一張收藏都有新的旅程。</p></section>`;
    if (!collection.ok) notify(collection.error,true);
    const tip=$('sidebar').querySelector('.tip-panel p');
    if(tip)tip.textContent='紅色標記是即將落下的攻擊。走出範圍或衝刺穿過彈幕，等安全時再按 Enter 詠唱。點上方「配樂」可開啟區域音樂。';
    if(!active){
      const picker=document.createElement('div');picker.className='difficulty-picker';
      picker.innerHTML=`<label for="difficultySelect">遠征難度</label><select id="difficultySelect"><option value="story">故事 · 空間傷害降低 35%</option><option value="standard">標準 · 完整走位挑戰</option><option value="veteran">試煉 · 更快彈幕與更高傷害</option></select>`;
      $('startRun').before(picker);$('difficultySelect').value=chosenDifficulty;$('difficultySelect').onchange=event=>chosenDifficulty=event.target.value;
    }
    if ($('entrySelect')) $('entrySelect').onchange = event => {selectedWord=event.target.value;renderDeparture();};
    if ($('startRun')) $('startRun').onclick = () => start(false);
    if ($('practiceRun')) $('practiceRun').onclick = () => start(true);
    if ($('continueRun')) $('continueRun').onclick = resumeSaved;
    if ($('abandonSaved')) $('abandonSaved').onclick = () => confirmAbandon(true);
  }
  async function start(practice) {
    if (busy) return; busy = true;
    try {
      const card = cards.find(c=>c.word === selectedWord) || cards.find(c=>c.word === 'predict') || cards[0];
      if (!practice && !(await claimSession())) {notify('另一個分頁正在冒險。請先關閉該地牢分頁，再回來開始。',true);return;}
      const next = Engine.createRun(card,practice);
      next.difficulty=chosenDifficulty;
      if (!practice) {
        const result = await Storage.consumeEntry(card.word,cards,next);
        if (!result.ok) { notify(result.error,true); saved = await Storage.load(); if(releaseSession){releaseSession();releaseSession=null;sessionHeld=false;} renderDeparture(); return; }
        receipt = result.receipt;
      }
      run = next; paused = false; finished = false; persistenceBroken = false;chanting=false;clearMovement();
      actionSignature = sidebarSignature = ''; notify(practice ? '練習模式：不消耗收藏，也不累計正式戰績。' : `已消耗 1 張 ${card.word}。你的奧義已甦醒。`);
      render(); tone('heal');$('arena').focus({preventScroll:true});
    } finally { busy = false; }
  }
  async function resumeSaved() {
    if (busy) return; busy = true;
    try {
      if (!(await claimSession())) {notify('另一個分頁正在冒險。請先關閉該地牢分頁。',true);return;}
      saved = await Storage.load();
      if (!saved.ok) {notify(saved.error,true);return;}
      if (!saved.active) {lobby();return;}
      const candidate = saved.active.run;
      if (!candidate.player || !['route','combat','reward','camp','shop','npc','won','lost'].includes(candidate.status)) {notify('這份冒險進度無法接續，請保留資料並重新整理。',true);return;}
      run = candidate; receipt = saved.active.receipt; finished = saved.active.finished; paused = run.status === 'combat';
      if(run.status==='combat')Arena.ensure(run);chanting=false;clearMovement();
      actionSignature = sidebarSignature = ''; render(); notify('已接續保存的冒險，沒有再次扣卡。');
      if(!paused && navigable()){if(inConversation())$('conversationClose')?.focus({preventScroll:true});else $('arena').focus({preventScroll:true});}
    } finally {busy=false;}
  }
  function syncPause() {
    $('pauseOverlay').hidden = !run || !paused;
    $('pauseButton').textContent = paused ? '▷' : 'Ⅱ'; $('pauseButton').setAttribute('aria-label',paused?'繼續遊戲':'暫停遊戲');
    $('resumeButton').disabled = persistenceBroken;
    if (run) $('pauseButton').hidden = ['won','lost'].includes(run.status);
    const input = $('spellInput'); if (input) input.disabled = paused;
    $('actionPanel').inert=paused;
    $('movementBar').inert=paused;$('touchControls').inert=paused;
    if(paused)setChant(false);
    syncAudio();updateArenaHUD();
  }
  function togglePause() { if(!run || ['won','lost'].includes(run.status) || persistenceBroken)return; setChant(false);paused=!paused;syncPause();renderSidebar();persist();if(!paused)$('arena').focus({preventScroll:true}); }
  function doAction(method, ...args) {
    if (!run || paused || busy || persistenceBroken) return;
    const result = method==='useItem'?Arena.useItem(run,...args):Explore.act(run,method,...args);
    if (result && !result.ok) {notify(result.message || '目前無法使用。',true);return;}
    if(run.status==='combat')Arena.ensure(run);
    chanting=false;clearMovement();notify(result?.message || ''); actionSignature=''; render(); persist();
    if(method==='chooseReward'||method==='buy')tone('loot');else if(method==='useItem')tone(args[0]==='potion'?'heal':'cast');
    if(method==='helpNpc')tone('heal');else if(method==='challengeNpc')tone('cast');
    if(method==='challengeNpc')$('gameSurface').scrollIntoView({block:'start'});
    if(navigable() && !inConversation())$('arena').focus({preventScroll:true});
  }
  function interact() {
    if(!run || paused || busy || persistenceBroken || !explorationStatuses.includes(run.status))return;
    const result=Explore.interact(run);
    if(!result.ok){notify(result.message,true);return;}
    clearMovement();chanting=false;actionSignature='';notify(result.message || '');render();persist();
    if(inConversation()){$('conversationClose')?.focus({preventScroll:true});$('actionPanel').scrollIntoView({block:'nearest'});}else $('arena').focus({preventScroll:true});
  }
  function closeConversation(){
    if(!inConversation())return;
    Explore.close(run);clearMovement();actionSignature='';render();persist();$('arena').focus({preventScroll:true});$('gameSurface').scrollIntoView({block:'start'});
  }
  function renderExploration(area) {
    const scene=Explore.ensure(run),target=Explore.nearest(run),npc=inConversation()?Engine.getNpc(run):null;
    area.classList.toggle('conversation-panel',!!npc);
    if(npc){
      const helped=!!run.npc?.helped;
      area.innerHTML=`<div class="action-heading"><div><span class="eyebrow">${esc(npc.title || '旅途相逢')}</span><h3>${esc(npc.name)}</h3></div><button id="conversationClose" class="secondary">Esc · 返回走位</button></div><p>${esc(npc.description)}</p>`+
        (run.status==='shop'?`<div class="shop-caption">${run.player.gold} 金幣 · 走到出口可離開商店</div>${choiceMarkup(run.shop || [],'buy')}`:
        `<div class="npc-help"><b>${helped?'已接受幫助': '旅人的善意'}</b><p>${esc(npc.helpDescription)}</p><button class="primary" data-action="helpNpc" ${helped?'disabled':''}>${helped?'本次幫助已領取':'接受幫助'}</button></div>`)+
        (helped?'<p class="npc-peace">已選擇和平相助，這次相逢不再發起挑戰。返回場景後，走到出口繼續。</p>':
        `<form id="npcChallengeForm" class="npc-challenge" autocomplete="off"><div><b>挑戰 ${esc(npc.name)}</b><p>${esc(npc.challengeDescription || '將立即進入雙階段 Boss 戰；失敗會結束本次冒險。')}</p><p>勝利專屬戰利品：<strong>${esc(npc.lootName)}</strong></p><label for="npcChallengeInput">輸入 <code>${esc(npc.challengeWord)}</code>，向對方宣戰</label></div><div class="challenge-input-row"><input id="npcChallengeInput" name="challenge" aria-label="挑戰文字" placeholder="${esc(npc.challengeWord)}" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" maxlength="40"><button type="submit" class="secondary danger">發起 Boss 挑戰</button></div></form>`);
      $('conversationClose').onclick=closeConversation;
      if($('npcChallengeForm'))$('npcChallengeForm').onsubmit=event=>{event.preventDefault();doAction('challengeNpc',$('npcChallengeInput').value);};
    }else{
      const labels={route:['選一扇門，走向下一段旅程','走近傳送門，按 E 或 Enter 進入。'],shop:['商人正在攤位等你','走近商人交談、購物或輸入挑戰文字；走到出口繼續。'],npc:['路上遇見了一位旅人','走近對方按 E 交談。接受幫助，或用指定文字發起挑戰。'],reward:['戰利品就在眼前','走近一座祭壇，按 E 領取；每次只能選一項。'],camp:['星燈照亮了營地','走近營火休息，或前往木偶磨練。兩者只能選一項。']};
      const [title,detail]=labels[run.status];
      const trophy=run.status==='reward' && run.npc?.defeated ? Engine.RELICS[Engine.NPCS[run.npc.id]?.lootId] : null;
      area.innerHTML=`<div class="action-heading"><h3>${esc(title)}</h3><span class="pill">走近 · E 互動</span></div><p>${esc(detail)}</p>${trophy?`<div class="special-loot"><span>✦ NPC 專屬遺物 · 已裝備</span><strong>${esc(trophy.name)}</strong><p>${esc(trophy.description)}</p></div>`:''}<div class="nearby-card ${target?'in-range':''}"><span>${target?'◇ 可互動':'↟ 前往場景中的標記'}</span><strong>${esc(target?.name || '移動角色，探索這個房間')}</strong><p>${esc(target?.description || 'WASD／方向鍵移動，Space 衝刺。手機使用下方方向鍵與互動按鈕。')}</p></div><div class="scene-directory" aria-label="場景中的互動物件">${(scene?.objects || []).map(object=>`<span>${esc(object.icon || '◇')} ${esc(object.name)}</span>`).join('')}</div>`;
    }
  }
  function choiceMarkup(list, method) {
    return `<div class="choices">${list.map((item,i)=>`<button class="choice" data-action="${method}" data-choice="${esc(item.id == null ? i : item.id)}" ${item.sold || (method==='buy' && item.price>run.player.gold)?'disabled':''}><span class="choice-icon">${esc(icons[item.type] || icons[item.kind] || item.icon || '◇')}</span><strong>${esc(item.name || item.title || item.label || '神祕路線')}</strong><small>${esc(item.description || item.detail || '')}${method==='buy' && item.price != null ? `<br><span class="price">${item.sold?'已售出':item.price+' 金幣'}</span>`:''}</small></button>`).join('')}</div>`;
  }
  function renderAction() {
    if(explorationStatuses.includes(run.status))Explore.ensure(run);
    const signature = [run.status,run.encounter,run.enemy?.id,run.spell?.word,run.rewards?.map(x=>x.id).join(','),run.shop?.map?.(x=>`${x.id}:${x.sold}`).join(','),run.player.gold,run.exploration?.dialogId,explorationStatuses.includes(run.status)?Explore.nearest(run)?.id:'',run.npc?.helped].join('|');
    if (signature === actionSignature) {liveCombat();return;}
    actionSignature = signature;
    const area = $('actionPanel');
    area.classList.remove('conversation-panel');
    area.classList.toggle('combat-panel',run.status==='combat');area.classList.toggle('is-chanting',chanting && run.status==='combat');
    if (run.status === 'combat') {
      const spell = run.spell, enemy = run.enemy;
      area.innerHTML = `<div class="enemy-intent"><span id="enemyIntent"></span><b id="intentTime"></b></div><div class="meter enemy-meter"><i id="intentBar"></i></div><div class="spell-row"><div><div class="spell-word" id="spellWord">${esc(spell.word)}</div><div class="spell-meaning">${esc(spell.zh || '')}</div></div><div class="spell-type">${esc(spellTypes[spell.type]||'魔法咒語')}<br><small>${esc(spell.description||'')}</small></div></div><form class="spell-form" id="spellForm" autocomplete="off"><input id="spellInput" name="spell" aria-label="輸入咒語" placeholder="按 Enter 開始詠唱…" ${chanting?'':'readonly'} autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" inputmode="text" enterkeyhint="send" maxlength="80"><button class="primary" type="submit">施法 ↵</button></form>`;
      $('spellForm').onsubmit = event => {event.preventDefault();cast();};
      $('spellInput').oninput = paintLetters;
      $('spellInput').onfocus=()=>{if(!chanting)setChant(true);};
      liveCombat();
    } else if (explorationStatuses.includes(run.status)) {
      renderExploration(area);
    } else {
      const won = run.status === 'won', stats=run.stats || {};
      area.innerHTML = `<div class="action-heading"><h3 class="end-title">${won ? '三道封印，已被你解開。' : '火光熄滅，文字仍在。'}</h3></div><p>${won ? '你穿越了符文地牢。這段旅程的每個字，都成了你的力量。' : '這次冒險結束了。帶著記住的咒語，下次再走得更遠。'}${run.practice ? '（練習模式）' : ''}</p><div class="end-stats"><div><b>${Math.min(12,run.encounter+1)}</b><span>抵達關卡</span></div><div><b>${stats.casts ?? stats.correct ?? 0}</b><span>成功施法</span></div><div><b>${run.relics.length}</b><span>獲得遺物</span></div></div><button class="primary" id="returnLobby">回到地牢入口</button>`;
      $('returnLobby').onclick = exitRun;
      settleRun();
    }
    area.querySelectorAll('[data-action]').forEach(button=>{button.onclick=()=>doAction(button.dataset.action,button.dataset.choice);});
    syncPause();
  }
  function paintLetters() {
    if (!run?.spell || !$('spellInput')) return;
    const typed = $('spellInput').value.toLowerCase(), target = run.spell.word.toLowerCase();
    $('spellWord').innerHTML = [...run.spell.word].map((letter,i)=>`<span class="${i<typed.length ? (typed[i]===target[i]?'matched':'wrong'):''}">${esc(letter)}</span>`).join('');
    $('spellInput').setAttribute('aria-invalid',typed && !target.startsWith(typed) ? 'true':'false');
  }
  function cast() {
    if(!run || run.status!=='combat' || paused || busy || persistenceBroken)return;
    const input=$('spellInput'), text=input.value;
    if(!text.trim()){setChant(true);return;}
    const type=run.spell.type, result=Arena.cast(run,text);
    notify(result.message || (result.ok?'咒語施放成功。':'拼寫還差一點，請修正後再試。'),!result.ok);
    if(result.ok){setChant(false);renderer.burst(type);tone(type);actionSignature='';render();$('arena').focus({preventScroll:true});}
    else {tone('error');$('spellInput')?.setAttribute('aria-invalid','true'); if(run.status!=='combat'){setChant(false);render();}else if(result.message?.includes('射程')){setChant(false);$('arena').focus({preventScroll:true});}else renderVitals();}
    persist();
  }
  function liveCombat() {
    if(run.status!=='combat' || !$('enemyIntent'))return;
    const enemy=run.enemy,intent=enemy.intent;
    $('enemyIntent').textContent=`${enemy.name} · ${intent.name} · 留意地面預警`;
    $('intentTime').textContent=Math.max(0,intent.remaining).toFixed(1)+' 秒';
    $('intentBar').style.width=Math.max(0,Math.min(100,intent.remaining/intent.duration*100))+'%';
    $('bossBanner').hidden=enemy.kind!=='boss';
    $('bossBanner').textContent=`${enemy.name} · 第 ${enemy.phase || 1} 階段 · HP ${Math.ceil(enemy.hp)} / ${enemy.maxHp}${enemy.shield?' · 護盾 '+enemy.shield:''}`;
    $('arenaCaption').textContent=`敵群生命 ${Math.ceil(enemy.hp)} / ${enemy.maxHp}${enemy.shield?' · 護盾 '+enemy.shield:''} · 咒語鎖定最近的敵人`;
    updateArenaHUD();
  }
  function renderVitals() {
    const player=run.player;
    $('hpText').textContent=`${Math.ceil(player.hp)} / ${player.maxHp}`;
    $('hpBar').style.width=Math.max(0,player.hp/player.maxHp*100)+'%';
    $('shieldText').textContent=Math.ceil(player.shield);$('goldText').textContent=player.gold;$('comboText').textContent='× '+player.combo;
  }
  function renderSidebar() {
    const key=JSON.stringify([run.queue,run.inventory,run.relics,run.status,paused]);
    if(key===sidebarSignature)return; sidebarSignature=key;
    const queue=run.queue || [];
    const inventory=run.inventory || [];
    const relics=run.relics || [];
    $('sidebar').innerHTML = panel('接下來的咒語',`<div class="queue-list">${queue.length?queue.map(spell=>`<div class="queue-item"><span class="queue-icon">${icons[spell.type] || '✦'}</span><div><b>${esc(spell.word)}</b><small>${esc(spell.zh)} · ${esc(spellTypes[spell.type]||'魔法')}</small></div></div>`).join(''):'<p>進入戰鬥後，咒語會在這裡浮現。</p>'}</div>`) + panel('冒險行囊',`<div class="bag-items">${inventory.filter(item=>item.count>0).map(item=>`<button class="bag-item" data-item="${esc(item.id)}" ${((item.id!=='potion' && run.status!=='combat') || ['won','lost'].includes(run.status) || paused)?'disabled':''} title="${esc(item.description)}"><span>${esc(item.icon||'◇')}</span><span><b>${esc(item.name)}</b><small>${esc(item.description)}</small></span><span class="quantity">×${item.count}</span></button>`).join('') || '<p>行囊空了。到商店或寶箱找找補給。</p>'}</div><p class="card-effect">點擊道具使用；藥水可在探索時補血。</p>${relics.length?`<div class="panel-title" style="margin:20px 0 8px"><h3>已裝備遺物</h3><span>自動生效</span></div>${relics.map(item=>`<span class="relic-tag" title="${esc(item.description)}">${esc(item.name||item.id)}</span>`).join('')}`:''}`) + `<section class="side-panel"><div class="panel-title"><h2>旅途紀錄</h2><span>${run.practice?'練習':'自動保存'}</span></div><div id="logList"></div><button class="quiet-button danger" id="abandonRun">結束這次冒險</button></section>`;
    $('sidebar').querySelectorAll('[data-item]').forEach(button=>button.onclick=()=>doAction('useItem',button.dataset.item));
    $('abandonRun').onclick=()=>confirmAbandon(false); logSignature='';renderLog();
  }
  function renderLog() {
    if(!$('logList'))return;
    const logs=(run.log || []).slice(0,3),key=JSON.stringify(logs);
    if(key===logSignature)return;logSignature=key;
    $('logList').innerHTML=logs.map(item=>`<div class="log-line">${esc(typeof item==='string'?item:item.message||item.text||'')}</div>`).join('');
  }
  function render() {
    if(!run)return;
    document.body.classList.add('in-run');
    if(run.status==='combat')Arena.ensure(run);else{chanting=false;clearMovement();Explore.ensure(run);}
    $('modeLabel').textContent=(run.practice?'練習':'正式')+' · '+(difficultyNames[run.difficulty] || '標準');
    $('chapterLabel').textContent='CHAPTER '+['I','II','III'][Math.min(2,run.region)];
    $('regionLabel').textContent=run.regionName || names[run.region];
    $('floorLabel').textContent=String(Math.min(12,run.encounter+1)).padStart(2,'0')+' / 12';
    $('arenaCaption').hidden=false;
    if(run.status!=='combat') {$('bossBanner').hidden=true;$('arenaCaption').textContent={route:'命運的岔路，在你眼前展開。',reward:'那些微光，是留給旅人的禮物。',camp:'在火焰熄滅以前，歇息片刻。',shop:'走近商人交談，或前往出口繼續。',npc:'善意與挑戰，都從一句話開始。',won:'文字的力量，讓世界再次甦醒。',lost:'下一次，你會帶著更多知識回來。'}[run.status] || '';}
    renderVitals();renderAction();renderSidebar();renderLog();journey();syncPause();updateArenaHUD();syncAudio();
  }
  async function settleRun() {
    if(finished)return true;
    if(settlementPromise)return settlementPromise;
    if(run.practice){finished=true;return true;}
    if(persistenceBroken)return false;
    settlementPromise=(async()=>{
      const result=await Storage.finishRun(receipt.id,{won:run.status==='won',shards:0,floor:Math.min(12,run.encounter+1)},run);
      if(!result.ok){storageFailure(result);return false;}
      finished=true;return true;
    })();
    const ok=await settlementPromise;settlementPromise=null;return ok;
  }
  async function exitRun() {
    if(busy)return;busy=true;
    try {
      if(run && !run.practice && receipt){if(!(await settleRun()) || persistenceBroken)return;const result=await Storage.abandonRun(receipt.id);if(!result.ok){storageFailure(result);return;}}
      saved=await Storage.load();lobby();notify('');
    }finally{busy=false;}
  }
  function openDialog(html) {$('dialogContent').innerHTML=html;$('infoDialog').showModal();}
  function confirmAbandon(fromLobby) {
    if(run && !['won','lost'].includes(run.status)){paused=true;syncPause();}
    openDialog('<h2>結束這次冒險？</h2><p>結束後無法接續；已消耗的入場卡片不會退還。</p><div class="action-buttons"><button class="primary" id="keepRun">保留進度</button><button class="secondary" id="confirmAbandon">結束冒險</button></div>');
    $('keepRun').onclick=()=>$('infoDialog').close();
    $('confirmAbandon').onclick=async()=>{
      if(busy)return;busy=true;
      try{
        const activeReceipt=fromLobby?saved?.active?.receipt:receipt;
        if(activeReceipt){if(!(await claimSession())){notify('另一個分頁正在冒險，請先關閉該分頁。',true);return;}const result=await Storage.abandonRun(activeReceipt.id);if(!result.ok){notify(result.error,true);return;}}
        $('infoDialog').close();saved=await Storage.load();lobby();notify('這次冒險已結束。');
      }finally{busy=false;}
    };
  }
  function help() {
    if(run){paused=true;syncPause();}
    openDialog('<h2>移動、閃避、詠唱</h2><ol><li><b>WASD／方向鍵移動：</b>繞過石柱、與近戰敵人保持距離。手機使用畫面下方方向鍵。</li><li><b>Space 衝刺：</b>沿移動方向快速位移，短暫免疫碰撞傷害，冷卻 1.4 秒；不能穿越牆壁。</li><li><b>Enter 詠唱：</b>時間放慢，輸入畫面的英文，再按 Enter 施法。施法後自動返回走位，也可按 Esc 取消詠唱。</li><li><b>專注會耗盡：</b>詠唱時消耗專注，離開詠唱即可恢復。專注歸零後敵人恢復正常速度。</li><li><b>看清預警：</b>紅色地面標記會在短暫延遲後造成傷害。用走位離開，或衝刺穿過彈幕。</li><li><b>靠近再施法：</b>咒語自動鎖定射程內最近的敵人；每五次成功施法輪到卡片奧義。</li></ol><h3>走近互動與旅途 NPC</h3><p>探索時用 WASD 或方向鍵走近傳送門、祭壇、營火或 NPC，按 E／Enter 互動；手機點「E · 互動」。商店也要先走近商人才能購物。交談時按 Esc 返回場景，走到出口繼續。</p><p>旅途中可能遇見療癒師、鍛造師、製圖師與擺渡人。交談後可接受一次幫助，或輸入畫面指定文字發起雙階段 Boss 挑戰。商人同樣可被挑戰；擊敗必得專屬遺物。接受幫助後，本次相遇不能再挑戰。</p><h3>房間與遺物</h3><p>穿過三個區域、12 個節點。掩體、熔岩、機關與追擊者會改變走位策略。戰利品三選一，移速、連鎖、衝刺與緩速遺物可以搭配。</p><h3>配樂、暫停與接續</h3><p>點「配樂」開啟原創區域音樂，Boss 戰會增加節奏。按 Esc 暫停；切換分頁也會自動暫停。正式冒險會保存位置與進度，重新整理可接續。</p><h3>卡片與難度</h3><p>正式入場消耗 1 張收藏卡；練習免費。故事難度降低空間傷害，試煉提高傷害與彈速。失敗不退卡；道具、金幣與遺物只屬於本次冒險。</p>');
  }
  function codex() {
    if(run){paused=true;syncPause();}
    const relics=catalogValues(Engine.RELICS),items=catalogValues(Engine.ITEMS),regions=catalogValues(Engine.REGIONS);
    const bossTactics=['棘冠典獄長交替施放追蹤落點與環形震波。生命低於一半後，落點與震波數量增加；離開紅色預警再詠唱。','鏡月女巫發射放射彈幕，並以光束封鎖移動路線。第二階段出現交叉光束，利用彈幕間隙走位。','失名之王輪替星環彈幕、突刺與末頁湮滅。大範圍攻擊保留安全帶，第二階段增加彈數與落點，保留衝刺迎接連續攻勢。'];
    const roomGuide='<h3>六種戰鬥房間</h3><div class="room-codex">'+Arena.ROOMS.map(room=>`<div class="codex-item"><b>${esc(room.name)}</b><p>${esc(room.description)}</p></div>`).join('')+'</div>';
    openDialog(`<h2>地牢見聞錄</h2><h3>三道封印的守護者</h3>${regions.map((region,i)=>`<div class="codex-item" style="margin-bottom:10px"><b>0${i+1} · ${esc(region.boss?.name || bosses[i])}</b><p>${esc(bossTactics[i])}</p></div>`).join('')}${roomGuide}<h3>旅途中的五位角色</h3><div class="codex-grid">${catalogValues(Engine.NPCS).map(npc=>`<div class="codex-item"><b>${esc(npc.name)} · ${esc(npc.title)}</b><p>${esc(npc.helpDescription)}</p><p>挑戰文字：${esc(npc.challengeWord)}<br>特殊戰利品：${esc(npc.lootName)}</p></div>`).join('')}</div><h3>旅途中的遺物</h3><div class="codex-grid">${relics.map(item=>`<div class="codex-item"><b>${esc(item.name)}</b><p>${esc(item.description)}</p></div>`).join('')}</div><h3>消耗道具</h3><div class="codex-grid">${items.map(item=>`<div class="codex-item"><b>${esc(item.name)}</b><p>${esc(item.description)}</p></div>`).join('')}</div>`);
  }
  $('pauseButton').onclick=togglePause;$('resumeButton').onclick=togglePause;$('helpButton').onclick=help;$('codexButton').onclick=codex;
  $('closeDialog').onclick=()=>$('infoDialog').close();
  function returnToArena(){if(navigable() && !paused && !chanting && !inConversation())$('arena').focus({preventScroll:true});}
  $('soundButton').onclick=async()=>{const next=!audioEnabled;const ok=await soundtrack.setEnabled(next);audioEnabled=next && ok!==false;$('soundButton').textContent='配樂：'+(audioEnabled?'開':'關');$('soundButton').setAttribute('aria-pressed',String(audioEnabled));if(next && !audioEnabled)notify('瀏覽器尚未允許播放配樂，請再按一次配樂按鈕。',true);syncAudio();returnToArena();};
  soundtrack.setVolume(.45);$('musicVolume').oninput=event=>soundtrack.setVolume(Number(event.target.value)/100);
  $('musicVolume').onchange=returnToArena;
  $('chantButton').onclick=()=>{setChant(!chanting);if(!chanting)$('arena').focus({preventScroll:true});};
  $('interactButton').onclick=interact;
  $('touchDash').onclick=requestDash;
  $('expandButton').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('gameSurface').requestFullscreen();}catch(_){notify('此瀏覽器不支援全螢幕，仍可直接遊玩。');}returnToArena();};
  document.addEventListener('keydown',event=>{
    if(event.isComposing || $('infoDialog').open)return;
    if(event.key==='Escape'){event.preventDefault();if(chanting){setChant(false);$('arena').focus({preventScroll:true});}else if(inConversation() && !paused)closeConversation();else togglePause();return;}
    if(!navigable() || paused || persistenceBroken || inConversation())return;
    const editing=event.target instanceof HTMLElement && event.target.closest('input,textarea,select,button,a');
    if(chanting || editing)return;
    if(directionKeys[event.code]){event.preventDefault();heldKeys.add(event.code);if(!keyTimes.has(event.code))keyTimes.set(event.code,performance.now());}
    else if(event.code==='Space'){event.preventDefault();if(!event.repeat){dashQueued=true;}}
    else if(event.key==='Enter' || (event.code==='KeyE' && run.status!=='combat')){event.preventDefault();if(!event.repeat){if(run.status==='combat')setChant(true);else interact();}}
  });
  document.addEventListener('keyup',event=>{
    const started=keyTimes.get(event.code);heldKeys.delete(event.code);keyTimes.delete(event.code);
    if(started!=null && performance.now()-started<70 && directionKeys[event.code] && !chanting && !paused && !inConversation())tapPulses.set(directionKeys[event.code],performance.now()+90);
  });
  document.querySelectorAll('[data-move]').forEach(button=>{
    button.onpointerdown=event=>{if(!navigable() || paused || persistenceBroken || inConversation())return;event.preventDefault();if(chanting)setChant(false);button.setPointerCapture(event.pointerId);touchDirections.set(event.pointerId,button.dataset.move);button.classList.add('held');};
    const release=event=>{touchDirections.delete(event.pointerId);button.classList.remove('held');};
    button.onpointerup=release;button.onpointercancel=release;button.onlostpointercapture=release;
    button.onclick=event=>{if(event.detail===0 && navigable() && !paused && !persistenceBroken && !inConversation()){setChant(false);tapPulses.set(button.dataset.move,performance.now()+180);}};
  });
  $('arena').onpointerdown=()=>{if(chanting)setChant(false);$('arena').focus({preventScroll:true});};
  window.addEventListener('blur',()=>{clearMovement();if(navigable()){paused=true;syncPause();persist();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden && run){paused=true;syncPause();persist();}});
  window.addEventListener('pagehide',()=>{if(run && !run.practice)persist();});
  window.addEventListener('pageshow',async event=>{
    if(!event.persisted || !run || run.practice)return;
    paused=true;sessionHeld=false;persistenceBroken=true;syncPause();
    if(!(await claimSession())){notify('另一個分頁正在冒險。請先關閉該分頁，再重新整理。',true);return;}
    const latest=await Storage.load();
    if(!latest.ok || latest.active?.receipt.id!==receipt?.id){notify(latest.error || '冒險進度已有變動，請重新整理後接續。',true);return;}
    run=latest.active.run;finished=latest.active.finished;persistenceBroken=false;actionSignature=sidebarSignature='';render();
  });
  window.addEventListener('storage',async event=>{
    if(event.key==='enroot_cards' && !run){renderDeparture();return;}
    if(event.key==='enroot_dungeon_v1' && run && !run.practice){paused=true;syncPause();notify('冒險進度在另一分頁有所變動，請重新整理後接續。',true);persistenceBroken=true;syncPause();}
  });
  function frame(time) {
    const delta=lastTime?Math.min((time-lastTime)/1000,.25):0;lastTime=time;
    if(navigable() && !paused && !persistenceBroken){
      const before=run.status,hp=run.player.hp,dashBefore=world()?.player?.dashCooldown || 0;
      if(run.status==='combat')Arena.update(run,delta,movementInput());else Explore.update(run,delta,movementInput());
      dashQueued=false;saveClock+=delta;
      if(run.player.hp<hp){renderer.burst('damage');tone('hit');}
      if(dashBefore<=0 && world()?.player?.dashCooldown>0){renderer.burst('dash');tone('dash');}
      if(before!==run.status){setChant(false);actionSignature='';render();persist();tone(run.status==='won'?'win':run.status==='reward'?'loot':'hit');}
      if(saveClock>1.5){saveClock=0;persist();}
    }
    if(time-lastPaint>80){lastPaint=time;if(run){renderVitals();if(explorationStatuses.includes(run.status))renderAction();liveCombat();updateArenaHUD();renderLog();}}
    renderer.draw({run,focus:chanting,paused,reducedMotion},time);
    requestAnimationFrame(frame);
  }
  async function init(){saved=await Storage.load();lobby();if(!saved.ok)notify(saved.error,true);requestAnimationFrame(frame);}
  init();
})();
