(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const Engine = window.DungeonEngine, Storage = window.DungeonStorage;
  const cards = window.ENROOT_CARDS || [];
  const renderer = new window.DungeonRenderer($('arena'));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const names = Engine.REGIONS.map(region=>region.name);
  const bosses = ['棘冠典獄長', '鏡月女巫', '失名之王'];
  const spellTypes = {attack:'攻擊咒', heal:'治癒咒', shield:'護盾咒', signature:'卡片奧義'};
  const icons = {battle:'⚔', elite:'✦', boss:'♜', treasure:'◇', camp:'♨', shop:'¤', attack:'ϟ', heal:'✚', shield:'⛨', signature:'✦'};
  let run = null, receipt = null, saved = null, selectedWord = '', paused = false, busy = false, finished = false;
  let lastTime = 0, lastPaint = 0, saveClock = 0, audioEnabled = false, audioContext, sessionHeld = false, persistenceBroken = false;
  let logSignature = '', sidebarSignature = '', actionSignature = '', settlementPromise = null, releaseSession = null;

  function notify(message, error) { $('feedback').textContent = message || ''; $('feedback').classList.toggle('error', !!error); }
  function tone(kind) {
    if (!audioEnabled) return;
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.type = 'triangle'; oscillator.frequency.value = kind === 'error' ? 130 : kind === 'heal' ? 620 : 420;
      gain.gain.setValueAtTime(.035, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .18);
      oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + .2);
    } catch (_) { audioEnabled = false; $('soundButton').textContent = '音效：關'; }
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
    actionSignature = sidebarSignature = logSignature = '';
    $('pauseButton').hidden = true; $('pauseOverlay').hidden = true; $('bossBanner').hidden = true;
    $('modeLabel').textContent = '以單字喚醒魔法'; $('floorLabel').textContent = '尚未出發'; $('chapterLabel').textContent = 'CHAPTER I'; $('regionLabel').textContent = names[0];
    $('arenaCaption').hidden = false; $('arenaCaption').textContent='✧ 古老的文字，正在等待回聲。'; $('hpText').textContent = '120 / 120'; $('hpBar').style.width = '100%';
    $('shieldText').textContent = '0'; $('goldText').textContent = '0'; $('comboText').textContent = '× 0';
    $('actionPanel').innerHTML = `<div class="action-heading"><h3>在遺忘中，找回文字的力量</h3><span class="pill">準備出發</span></div><p>帶上一張單字卡，穿越三道封印。拼出眼前的咒語，讓魔法替你開路。</p><div class="onboarding"><div><em>01 / OFFER</em><b>獻出一張卡</b>選擇收藏卡片<br>喚醒專屬奧義</div><div><em>02 / SPELL</em><b>打字即施法</b>拼出英文單字<br>按 Enter 釋放</div><div><em>03 / EXPLORE</em><b>走自己的路</b>收集隨機遺物<br>挑戰三位守護者</div></div>`;
    renderDeparture(); journey();
  }
  function renderDeparture() {
    const collection = Storage.listOwned(cards), owned = collection.ok ? collection.cards : [];
    if (!owned.some(c => c.word === selectedWord)) selectedWord = owned[0]?.word || '';
    const card = owned.find(c => c.word === selectedWord) || cards.find(c=>c.word === 'predict') || cards[0];
    const active = saved?.active;
    $('sidebar').innerHTML = `<section class="side-panel departure"><div class="panel-title"><h2>${active ? '尚未結束的冒險' : '選擇入場卡片'}</h2><span>${owned.reduce((n,c)=>n+c.count,0)} 張收藏</span></div>${owned.length ? `<label for="entrySelect">從已抽到的卡片中選擇</label><select id="entrySelect" ${active ? 'disabled' : ''}>${owned.map(c=>`<option value="${esc(c.word)}" ${c.word===selectedWord?'selected':''}>${esc(c.word)} · ${esc(c.rarity)} · ×${c.count}</option>`).join('')}</select>` : '<div class="empty-inventory">還沒有收藏卡片。<br><a href="index.html">完成 10 題，抽取第一張卡</a>，或先免費練習。</div>'}${entryCard(active ? cards.find(c=>c.word===active.receipt.word)||card : card, owned.length>0)}<p class="entry-note">${active ? '你的進度已保存。接續冒險不會再次消耗卡片。' : '正式入場將消耗所選卡片 1 張。<br>失敗不退還；每次冒險重新生成路線。'}</p>${active ? '<button id="continueRun" class="primary wide">接續冒險</button><button id="abandonSaved" class="secondary wide">結束這次冒險</button>' : `<button id="startRun" class="primary wide" ${!owned.length || !collection.ok ? 'disabled' : ''}>消耗 1 張 · 踏入地牢</button><button id="practiceRun" class="secondary wide">免費練習 · 不消耗卡片</button>`}<div class="save-note">${active ? '進度已保存' : '正式冒險自動保存 · 隨時回來繼續'}</div></section><section class="side-panel tip-panel"><div class="eyebrow">A WORD OF ADVICE</div><p>普通卡也能走到最後。把重複抽到的卡片帶進地牢，讓每一張收藏都有新的旅程。</p></section>`;
    if (!collection.ok) notify(collection.error,true);
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
      if (!practice) {
        const result = await Storage.consumeEntry(card.word,cards,next);
        if (!result.ok) { notify(result.error,true); saved = await Storage.load(); if(releaseSession){releaseSession();releaseSession=null;sessionHeld=false;} renderDeparture(); return; }
        receipt = result.receipt;
      }
      run = next; paused = false; finished = false; persistenceBroken = false;
      actionSignature = sidebarSignature = ''; notify(practice ? '練習模式：不消耗收藏，也不累計正式戰績。' : `已消耗 1 張 ${card.word}。你的奧義已甦醒。`);
      render(); tone('heal');
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
      if (!candidate.player || !['route','combat','reward','camp','shop','won','lost'].includes(candidate.status)) {notify('這份冒險進度無法接續，請保留資料並重新整理。',true);return;}
      run = candidate; receipt = saved.active.receipt; finished = saved.active.finished; paused = run.status === 'combat';
      actionSignature = sidebarSignature = ''; render(); notify('已接續保存的冒險，沒有再次扣卡。');
    } finally {busy=false;}
  }
  function syncPause() {
    $('pauseOverlay').hidden = !run || !paused;
    $('pauseButton').textContent = paused ? '▷' : 'Ⅱ'; $('pauseButton').setAttribute('aria-label',paused?'繼續遊戲':'暫停遊戲');
    $('resumeButton').disabled = persistenceBroken;
    if (run) $('pauseButton').hidden = ['won','lost'].includes(run.status);
    const input = $('spellInput'); if (input) input.disabled = paused;
    $('actionPanel').inert=paused;
  }
  function togglePause() { if(!run || ['won','lost'].includes(run.status) || persistenceBroken)return; paused=!paused;syncPause();persist();if(!paused)$('spellInput')?.focus(); }
  function doAction(method, ...args) {
    if (!run || paused || busy || persistenceBroken) return;
    const result = Engine[method](run,...args);
    if (result && !result.ok) {notify(result.message || '目前無法使用。',true);return;}
    notify(result?.message || ''); actionSignature=''; render(); persist();
    if (run.status === 'combat') $('spellInput')?.focus({preventScroll:true});
  }
  function choiceMarkup(list, method) {
    return `<div class="choices">${list.map((item,i)=>`<button class="choice" data-action="${method}" data-choice="${esc(item.id == null ? i : item.id)}" ${item.sold || (method==='buy' && item.price>run.player.gold)?'disabled':''}><span class="choice-icon">${esc(icons[item.type] || icons[item.kind] || item.icon || '◇')}</span><strong>${esc(item.name || item.title || item.label || '神祕路線')}</strong><small>${esc(item.description || item.detail || '')}${method==='buy' && item.price != null ? `<br><span class="price">${item.sold?'已售出':item.price+' 金幣'}</span>`:''}</small></button>`).join('')}</div>`;
  }
  function renderAction() {
    const signature = [run.status,run.encounter,run.enemy?.id,run.spell?.word,run.rewards?.map(x=>x.id).join(','),run.shop?.map?.(x=>`${x.id}:${x.sold}`).join(','),run.player.gold].join('|');
    if (signature === actionSignature) {liveCombat();return;}
    actionSignature = signature;
    const area = $('actionPanel');
    if (run.status === 'combat') {
      const spell = run.spell, enemy = run.enemy;
      area.innerHTML = `<div class="enemy-intent"><span id="enemyIntent"></span><b id="intentTime"></b></div><div class="meter enemy-meter"><i id="intentBar"></i></div><div class="spell-row"><div><div class="spell-word" id="spellWord">${esc(spell.word)}</div><div class="spell-meaning">${esc(spell.zh || '')}</div></div><div class="spell-type">${esc(spellTypes[spell.type]||'魔法咒語')}<br><small>${esc(spell.description||'')}</small></div></div><form class="spell-form" id="spellForm" autocomplete="off"><input id="spellInput" name="spell" aria-label="輸入咒語" placeholder="輸入上方英文咒語…" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" inputmode="latin" enterkeyhint="send" maxlength="80"><button class="primary" type="submit">施法 ↵</button></form>`;
      $('spellForm').onsubmit = event => {event.preventDefault();cast();};
      $('spellInput').oninput = paintLetters;
      liveCombat();
    } else if (run.status === 'route') {
      area.innerHTML = `<div class="action-heading"><h3>下一步，往哪裡走？</h3><span class="pill">選擇路線</span></div><p>選定後便無法回頭。戰鬥之外，也別忘了補給。</p>${choiceMarkup(run.routes || [],'chooseRoute')}`;
    } else if (run.status === 'reward') {
      area.innerHTML = `<div class="action-heading"><h3>把戰利品收入行囊</h3><span class="pill">選擇 1 項</span></div><p>金幣已拾取。選一件道具或遺物，繼續深入。</p>${choiceMarkup(run.rewards || [],'chooseReward')}`;
    } else if (run.status === 'camp') {
      area.innerHTML = `<div class="action-heading"><h3>旅人的營火</h3><span class="pill">安全區域</span></div><p>火光驅散了迷霧。休整或研習，只能選擇一次。</p>${choiceMarkup([{id:'rest',name:'在營火旁休息',description:'恢復生命，迎接下一場戰鬥。',icon:'✚'},{id:'train',name:'研習咒語',description:'提升本次冒險的咒語威力。',icon:'✦'}],'chooseCamp')}`;
    } else if (run.status === 'shop') {
      const stock = run.shop || run.stock || [];
      area.innerHTML = `<div class="action-heading"><h3>遊商的小攤</h3><span class="pill">${run.player.gold} 金幣</span></div><p>旅途所得的金幣，可以換來下一次機會。</p>${choiceMarkup(Array.isArray(stock)?stock:stock.stock||[],'buy')}<button class="secondary wide" data-action="leaveShop">離開商店，繼續前進</button>`;
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
    if(!text.trim())return;
    const type=run.spell.type, result=Engine.submit(run,text);
    notify(result.message || (result.ok?'咒語施放成功。':'拼寫還差一點，請修正後再試。'),!result.ok);
    if(result.ok){renderer.burst(type);tone(type);actionSignature='';render();$('spellInput')?.focus({preventScroll:true});}
    else {tone('error');$('spellInput')?.setAttribute('aria-invalid','true'); if(run.status!=='combat')render();else renderVitals();}
    persist();
  }
  function liveCombat() {
    if(run.status!=='combat' || !$('enemyIntent'))return;
    const enemy=run.enemy,intent=enemy.intent;
    $('enemyIntent').textContent=`${enemy.name} · ${intent.name}（${intent.damage} 傷害）`;
    $('intentTime').textContent=Math.max(0,intent.remaining).toFixed(1)+' 秒';
    $('intentBar').style.width=Math.max(0,Math.min(100,intent.remaining/intent.duration*100))+'%';
    $('bossBanner').hidden=enemy.kind!=='boss';
    $('bossBanner').textContent=`${enemy.name} · 第 ${enemy.phase || 1} 階段 · HP ${Math.ceil(enemy.hp)} / ${enemy.maxHp}${enemy.shield?' · 護盾 '+enemy.shield:''}`;
    $('arenaCaption').textContent=`${enemy.name}　${Math.ceil(enemy.hp)} / ${enemy.maxHp} HP${enemy.shield?' · 護盾 '+enemy.shield:''}`;
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
    $('modeLabel').textContent=run.practice?'練習冒險 · 不消耗卡片':'正式冒險';
    $('chapterLabel').textContent='CHAPTER '+['I','II','III'][Math.min(2,run.region)];
    $('regionLabel').textContent=run.regionName || names[run.region];
    $('floorLabel').textContent=String(Math.min(12,run.encounter+1)).padStart(2,'0')+' / 12';
    $('arenaCaption').hidden=false;
    if(run.status!=='combat') {$('bossBanner').hidden=true;$('arenaCaption').textContent={route:'命運的岔路，在你眼前展開。',reward:'那些微光，是留給旅人的禮物。',camp:'在火焰熄滅以前，歇息片刻。',shop:'用沿途拾起的金幣，交換新的可能。',won:'文字的力量，讓世界再次甦醒。',lost:'下一次，你會帶著更多知識回來。'}[run.status] || '';}
    renderVitals();renderAction();renderSidebar();renderLog();journey();syncPause();
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
    openDialog('<h2>把單字變成你的魔法</h2><ol><li>選一張已抽到的卡片，消耗 1 張開始正式冒險。也能免費練習。</li><li>輸入戰鬥面板顯示的英文單字，按 Enter 施法。大小寫不拘；拼錯可以修正。</li><li>觀察敵人的倒數。快速、連續拼對能提高攻擊效果，治癒與護盾咒幫你撐過攻擊。</li><li>每五次施法出現入場卡的專屬奧義。每場戰鬥可使用行囊道具。</li><li>探索三個區域，每區三個隨機房間加一場 Boss 戰。戰利品三選一，遺物會自動生效。</li></ol><h3>暫停與接續</h3><p>按 Esc 或暫停按鈕停止倒數。切換分頁會自動暫停。正式冒險自動保存，重新整理後可接續；練習模式不保存戰績。</p><h3>你的卡片</h3><p>入場只扣所選單字 1 張。敗北或結束冒險不退卡，途中道具與遺物只屬於本次冒險。收藏與進度都保存在目前瀏覽器。</p>');
  }
  function codex() {
    if(run){paused=true;syncPause();}
    const relics=catalogValues(Engine.RELICS),items=catalogValues(Engine.ITEMS),regions=catalogValues(Engine.REGIONS);
    openDialog(`<h2>地牢見聞錄</h2><h3>三道封印的守護者</h3>${regions.map((region,i)=>`<div class="codex-item" style="margin-bottom:10px"><b>0${i+1} · ${esc(region.boss?.name || bosses[i])}</b><p>${esc(region.boss?.description || ['交替施展荊棘護盾與重擊。利用本命咒語穿透護盾，生命低於一半時會進入第二階段。','月蝕攻擊會吸取生命。用護盾擋下傷害，阻止女巫恢復生命。','每三次行動蓄力末頁湮滅。把沙漏與琥珀護符留給重擊，並準備迎接第二階段。'][i])}</p></div>`).join('')}<h3>旅途中的遺物</h3><div class="codex-grid">${relics.map(item=>`<div class="codex-item"><b>${esc(item.name)}</b><p>${esc(item.description)}</p></div>`).join('')}</div><h3>消耗道具</h3><div class="codex-grid">${items.map(item=>`<div class="codex-item"><b>${esc(item.name)}</b><p>${esc(item.description)}</p></div>`).join('')}</div>`);
  }
  $('pauseButton').onclick=togglePause;$('resumeButton').onclick=togglePause;$('helpButton').onclick=help;$('codexButton').onclick=codex;
  $('closeDialog').onclick=()=>$('infoDialog').close();
  $('soundButton').onclick=()=>{audioEnabled=!audioEnabled;$('soundButton').textContent='音效：'+(audioEnabled?'開':'關');$('soundButton').setAttribute('aria-pressed',String(audioEnabled));tone('heal');};
  document.addEventListener('keydown',event=>{if(event.key==='Escape' && !$('infoDialog').open){event.preventDefault();togglePause();}});
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
    if(run && !paused && run.status==='combat' && !persistenceBroken){
      const before=run.status,hp=run.player.hp;
      Engine.tick(run,delta);saveClock+=delta;
      if(run.player.hp<hp)renderer.burst('damage');
      if(before!==run.status){actionSignature='';render();persist();}
      if(saveClock>1.5){saveClock=0;persist();}
    }
    if(time-lastPaint>80){lastPaint=time;if(run){renderVitals();liveCombat();renderLog();}}
    renderer.draw({region:[1,0,2][run?.region || 0],enemy:run?.status==='combat'?run.enemy:null,player:run?.player || {hp:120,maxHp:120},mode:run?.status || 'lobby',paused,reducedMotion},time);
    requestAnimationFrame(frame);
  }
  async function init(){saved=await Storage.load();lobby();if(!saved.ok)notify(saved.error,true);requestAnimationFrame(frame);}
  init();
})();
