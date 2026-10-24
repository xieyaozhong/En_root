(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const Story = window.DungeonStory;
  const Engine = window.DungeonEngine, Storage = window.DungeonStorage, Arena = window.DungeonArena, Explore = window.DungeonExplore, Chant = window.DungeonChant;
  const cards = window.ENROOT_CARDS || [];
  const renderer = new window.DungeonArenaRenderer($('arena'));
  const soundtrack = new window.DungeonAudio();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touchMedia = matchMedia('(max-width: 780px), (pointer: coarse)');
  let touchLayout = touchMedia.matches, touchSpell = null, touchMissUntil = 0, touchLettersKey = '', touchButtonsKey = '';
  document.body.classList.toggle('touch-layout',touchLayout);
  const names = Engine.REGIONS.map(region=>region.name);
  const bosses = ['棘冠典獄長', '鏡月女巫', '失名之王', '忘誓星龍'];
  const spellTypes = {attack:'攻擊咒', heal:'治癒咒', shield:'護盾咒', signature:'卡片奧義'};
  const icon = name => window.DungeonIcons?.icon(name) || '';
  const itemIcons = {potion:'potion',bomb:'bomb',hourglass:'hourglass',barrier:'shield',focus:'ink'};
  const npcIcons = {merchant:'shop',healer:'heal',smith:'attack',cartographer:'route',ferryman:'camp',lantern:'companion',echo:'spell',sentinel:'shield',lumina:'signature'};
  function spellIcon(spell) {
    if(['heal','shield','signature'].includes(spell.type))return spell.type;
    const word=String(spell.word || '').toLowerCase();
    return /^(fire|spark|flame|blaze)$/.test(word)?'fire':/^(frost|ice|freeze|snow)$/.test(word)?'ice':
      /^(storm|thunder|lightning|bolt)$/.test(word)?'lightning':/^(wind|gust|gale|air)$/.test(word)?'wind':'attack';
  }
  function iconLabel(id, name, label) {
    const element=$(id), key=name+':'+label;
    if(!element || element.dataset.iconLabel===key)return;
    element.dataset.iconLabel=key;
    element.innerHTML=icon(name)+'<span>'+esc(label)+'</span>';
  }
  function textIfChanged(id, value) {
    const element=$(id), text=String(value);
    if(element.textContent!==text)element.textContent=text;
  }
  document.querySelectorAll('[data-ui-icon]').forEach(element=>{element.innerHTML=icon(element.dataset.uiIcon);});
  iconLabel('soundButton','music','配樂：關');
  iconLabel('chantButton','spell','Enter · 詠唱');
  let run = null, receipt = null, saved = null, selectedWord = '', paused = false, busy = false, finished = false;
  let lastTime = 0, lastPaint = 0, saveClock = 0, audioEnabled = false, sessionHeld = false, persistenceBroken = false;
  let logSignature = '', sidebarSignature = '', actionSignature = '', settlementPromise = null, releaseSession = null;
  let chanting = false, dashQueued = false, chosenDifficulty = 'standard';
  let immersive=false, immersiveTouch=false, screenBusy=false, nativeScreen=false, orientationLocked=false, screenEpoch=0;
  const heldKeys = new Set(), keyTimes = new Map(), tapPulses = new Map();
  let joystick=null, previousTyped='', qtePulseUntil=0, castFeedbackUntil=0;
  let partySignature='', presentationRun=null, presentedCombat='', presentedPhase=0, presentedStatus='', lastEchoEffect='';
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
    iconLabel('immersiveSound','music',audioEnabled?'配樂開':'配樂關');
    $('immersiveSound').setAttribute('aria-pressed',String(audioEnabled));
    $('immersiveSound').setAttribute('aria-label',audioEnabled?'關閉配樂':'開啟配樂');
    const isBoss=run?.enemy?.kind==='boss' && run?.status==='combat';
    soundtrack.setScene({region:run?.region || 0,combat:run?.status==='combat',boss:isBoss,bossId:isBoss?(run.enemy.npcId || run.enemy.id):null,phase:run?.enemy?.phase || 1,paused:paused || document.hidden,focus:chanting,npcId:inConversation()?run?.npc?.id:'',story:!!run?.bondQuest?.active,romance:!!run?.relationship?.dating});
    const track=soundtrack.getTrackInfo?.();
    if($('trackCaption'))$('trackCaption').textContent=track?`♫ ${track.name}${isBoss?' · 首領專屬'+(run.enemy.phase===2?' · 狂怒變奏':''):''}${audioEnabled?'':' · 點「配樂」開啟'}`:'';
  }
  function presentation() {
    if(presentationRun!==run){presentationRun=run;presentedCombat='';presentedPhase=0;presentedStatus='';lastEchoEffect='';}
    if(!run)return;
    const key=run.arena?.key || `${run.encounter}:${run.enemy?.id}`,isBoss=run.enemy?.kind==='boss';
    if(run.status==='combat'){
      if(presentedCombat!==key){presentedCombat=key;presentedPhase=run.enemy.phase || 1;if(isBoss)tone('bossIntro');syncAudio();}
      else if(presentedPhase!==run.enemy.phase){presentedPhase=run.enemy.phase;if(isBoss)tone('bossPhase');syncAudio();}
      const echo=(run.arena?.effects || []).filter(f=>f.kind==='companion-cast' && (f.npcId==='echo' || f.role==='mimic')).at(-1);
      if(echo && lastEchoEffect!==key+echo.id){lastEchoEffect=key+echo.id;tone('echo');}
    }
    if(presentedStatus!==run.status){
      if(run.status==='lost')tone('playerDeath');
      else if(presentedStatus==='combat' && ['reward','won'].includes(run.status) && isBoss)tone('bossDeath');
      presentedStatus=run.status;
    }
  }
  function renderParty() {
    const companions=run?.companions || [],key=JSON.stringify(companions);
    $('partyStrip').hidden=!companions.length;
    if(key===partySignature)return;partySignature=key;
    const roles={support:'守護',mimic:'模仿施法',guard:'迎擊'};
    $('partyStrip').innerHTML='<span class="party-label">同行夥伴</span>'+companions.map(c=>`<span class="party-member" data-role="${esc(c.role)}" title="${esc(Engine.NPCS[c.id]?.helpDescription || '')}">${icon(npcIcons[c.id] || 'companion')}${esc(c.name.split('・').pop())}<small>${esc(roles[c.role] || '同行')}</small></span>`).join('');
  }
  function clearMovement() {
    heldKeys.clear();keyTimes.clear();tapPulses.clear();dashQueued=false;joystick?.reset();
  }
  function movementInput() {
    const directions=new Set(),now=performance.now(),stick=joystick?.getVector() || {x:0,y:0};
    heldKeys.forEach(code=>{if(directionKeys[code])directions.add(directionKeys[code]);});
    tapPulses.forEach((until,direction)=>{if(now<until)directions.add(direction);else tapPulses.delete(direction);});
    const keyX=Number(directions.has('right'))-Number(directions.has('left')),keyY=Number(directions.has('down'))-Number(directions.has('up'));
    return {x:keyX || keyY?keyX:stick.x,y:keyX || keyY?keyY:stick.y,dash:dashQueued,focus:chanting};
  }
  function setChant(value) {
    if(!run || run.status!=='combat' || paused || persistenceBroken)value=false;
    chanting=!!value;
    if(touchLayout && !paused && !persistenceBroken && run?.status==='combat'){heldKeys.clear();keyTimes.clear();tapPulses.clear();dashQueued=false;}
    else clearMovement();
    const input=$('spellInput');
    if(input){input.readOnly=touchLayout || !chanting;input.placeholder=chanting?'輸入英文，Enter 施法…':'按 Enter 開始詠唱…';if(chanting && !touchLayout && document.activeElement!==input)input.focus({preventScroll:true});if((!chanting || touchLayout) && document.activeElement===input)input.blur();}
    $('actionPanel').classList.toggle('is-chanting',chanting);
    iconLabel('chantButton',chanting?'dash':'spell',chanting?'Esc · 返回走位':'Enter · 詠唱');
    previousTyped=input?.value || '';paintLetters();
    syncAudio();updateArenaHUD();
  }
  function bindTouchPress(button, action) {
    // Secondary touch pointers do not reliably produce compatibility clicks.
    button.onpointerdown=event=>{if(event.button!=null && event.button!==0)return;event.preventDefault();action();};
    button.onclick=event=>{if(event.detail===0)action();};
  }
  function paintTouchSpell() {
    const combat=run?.status==='combat',spell=run?.spell;
    $('touchSpellPreview').hidden=!combat;$('touchRuneKeys').hidden=!combat;$('touchCast').hidden=!combat;
    $('touchInteract').hidden=combat || !navigable();
    if(!combat){touchSpell=null;textIfChanged('touchChantHint','靠近角色或傳送門，再按互動');return;}
    const input=$('spellInput'),typed=input?.value || '',state=Chant.analyze(spell.word,typed);
    if(touchSpell!==spell){
      touchSpell=spell;touchMissUntil=0;touchLettersKey='';touchButtonsKey='';
      $('touchSpellIcon').innerHTML=icon(spellIcon(spell));
      $('touchSpellPreview').dataset.element=spellIcon(spell);
      $('touchRuneKeys').innerHTML=Chant.touchKeys(spell.word).map(key=>`<button type="button" class="rune-key" data-rune="${esc(key)}" aria-label="符文 ${esc(key)}">${esc(key.replace(/ /g,'␣'))}</button>`).join('');
      $('touchRuneKeys').querySelectorAll('button').forEach(button=>{bindTouchPress(button,()=>tapRune(button.dataset.rune,spell));});
      textIfChanged('touchSpellMeaning',(spellTypes[spell.type] || '魔法')+' · '+(spell.zh || ''));
    }
    const next=Chant.touchSequence(spell.word).find((_,i,sequence)=>sequence.slice(0,i).join('').length===typed.length);
    const lettersKey=JSON.stringify([spell.word,typed]),buttonsKey=JSON.stringify([typed,chanting,paused]);
    if(lettersKey!==touchLettersKey){
      touchLettersKey=lettersKey;
      $('touchSpellName').innerHTML=state.letters.map(letter=>`<span class="${letter.state}">${esc(letter.char)}</span>`).join('');
    }
    if(buttonsKey!==touchButtonsKey){
      touchButtonsKey=buttonsKey;
      $('touchRuneKeys').querySelectorAll('button').forEach(button=>{
        const isNext=chanting && button.dataset.rune===next;
        button.disabled=!chanting || paused;
        button.classList.toggle('next',isNext);
        button.classList.toggle('entered',!isNext && !!typed && typed.includes(button.dataset.rune));
        button.setAttribute('aria-label','符文 '+button.dataset.rune+(isNext?' · 下一組':''));
      });
    }
    iconLabel('touchCast',chanting && !state.complete?'dash':'spell',state.complete?'施放已備咒語':chanting?'返回走位':'詠唱');
    $('touchCast').disabled=paused;
    if(performance.now()>=touchMissUntil){
      $('touchRuneKeys').classList.remove('rune-miss');
      textIfChanged('touchChantHint',state.complete?'咒語已備妥，靠近敵人後點施放':chanting?(run.arena?.player.focusEnergy<=0?'專注耗盡！點「'+(next || '')+'」或衝刺':'點亮起的「'+(next || '')+'」 · '+state.matched+'/'+state.letters.length+' 字母'):'點詠唱 → '+Chant.touchSequence(spell.word).length+' 組符文，自動施放');
    }
    $('touchRuneKeys').dataset.progress=String(state.matched);
  }
  function tapRune(key, spell) {
    if(!touchLayout || !chanting || paused || busy || persistenceBroken || run?.status!=='combat' || run.spell!==spell)return;
    const input=$('spellInput'),candidate=input.value+key;
    if(!Chant.analyze(spell.word,candidate).wrong){input.value=candidate;touchMissUntil=0;paintLetters(true);if(Chant.analyze(spell.word,candidate).complete)cast();}
    else {touchMissUntil=performance.now()+650;$('touchRuneKeys').classList.add('rune-miss');$('touchChantHint').textContent='順序差一點，點亮起的符文即可';tone('error');}
  }
  function requestDash() {
    if(!navigable() || paused || persistenceBroken || inConversation())return;
    if(chanting)setChant(false);dashQueued=true;$('arena').focus({preventScroll:true});
  }
  function canQuickHeal() {
    return navigable() && !paused && !busy && !persistenceBroken && !inConversation() &&
      run.player.hp<run.player.maxHp && run.inventory.some(item=>item.id==='potion' && item.count>0);
  }
  function updateQuickPotion() {
    const button=$('quickPotion'),count=run?.inventory.find(item=>item.id==='potion')?.count || 0;
    button.hidden=!navigable();button.disabled=!canQuickHeal();
    button.classList.toggle('needed',!!run && run.player.hp<=run.player.maxHp*.35 && count>0);
    textIfChanged('quickPotionCount','×'+count);
    const label='使用苔露藥水，剩餘 '+count+' 瓶'+(run && run.player.hp>=run.player.maxHp?'，生命已滿':'');
    if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);
  }
  function quickHeal() {
    if(!canQuickHeal())return;
    const result=Arena.useItem(run,'potion');
    if(!result.ok){notify(result.message,true);return;}
    // Healing must preserve the held joystick and the partially entered spell.
    notify(result.message);tone('heal');renderVitals();updateQuickPotion();renderSidebar();persist();
  }
  function updateArenaHUD() {
    const active=!!navigable(),combat=run?.status==='combat';
    $('expandButton').disabled=!run;
    $('gameSurface').classList.toggle('immersive-conversation',inConversation());
    $('gameSurface').classList.toggle('immersive-terminal',!!run && !active);
    $('arenaHUD').hidden=!active;$('movementBar').hidden=!active;$('touchControls').hidden=!active;
    $('chantQte').hidden=touchLayout || !combat || !chanting || paused;
    if($('inlineQte'))$('inlineQte').hidden=!combat || !chanting || paused;
    document.body.classList.toggle('chanting-mode',combat && chanting);
    document.body.classList.toggle('exploring',explorationStatuses.includes(run?.status));
    $('castFeedback').hidden=!combat || paused || performance.now()>=castFeedbackUntil;
    $('focusFlag').hidden=true;$('focusAbility').hidden=!combat;$('chantButton').hidden=!combat;$('interactButton').hidden=!active || combat;
    paintTouchSpell();updateQuickPotion();
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
      $('interactButton').disabled=!target || inConversation();iconLabel('interactButton','companion',target?'E · 互動':'E · 請先靠近');
      $('touchInteract').disabled=!target || inConversation();iconLabel('touchInteract','companion',target?'互動':'先靠近');
      $('arena').dataset.nearby=target?.id || '';
    }
    $('dashLabel').textContent=player.dashCooldown>0?player.dashCooldown.toFixed(1)+'s':'就緒';
    iconLabel('touchDash','dash',player.dashCooldown>0?player.dashCooldown.toFixed(1)+'s':'衝刺');
    $('touchDash').setAttribute('aria-label',player.dashCooldown>0?'衝刺冷卻中':'衝刺');
    $('dashBar').style.width=Math.max(0,100*(1-player.dashCooldown/1.4))+'%';
    $('focusBar').style.width=(player.focusEnergy || 0)+'%';$('focusLabel').textContent=Math.round(player.focusEnergy || 0)+'%';
    $('focusFlag').textContent=arena.focusActive?'詠唱中 · 時間放慢':'專注耗盡 · 返回走位可恢復';
    $('focusFlag').classList.toggle('exhausted',!arena.focusActive);
    if(combat && chanting){
      const energy=player.focusEnergy || 0;
      $('qteTime').textContent=energy>0?'慢時 '+(energy/12).toFixed(1)+' 秒':'專注耗盡 · 敵人恢復速度';
      if($('inlineQteTime'))$('inlineQteTime').textContent=$('qteTime').textContent;
      $('qteTimeBar').style.width=energy+'%';$('chantQte').classList.toggle('exhausted',energy<=0);
      if(performance.now()>=qtePulseUntil)$('chantQte').classList.remove('qte-hit','qte-miss');
    }
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
  function panel(title, content, extra='') { return `<section class="side-panel ${extra}"><div class="panel-title"><h2>${icon(title==='冒險行囊'?'bag':'spell')}${title}</h2></div>${content}</section>`; }
  function catalogValues(value) { return Array.isArray(value) ? value : Object.values(value || {}); }
  function bondProfile() { return Story.createProfile(run?.relationship || saved?.relationship); }
  function portrait() { return '<img class="bond-portrait" src="assets/dungeon/lumina-portrait.svg?v=20261024-chronicle1" alt="星露法師露米娜，24 歲的星象研究員" width="160" height="180">'; }
  function bondMeter(profile) {
    const bond=Story.getBond(profile);
    return `<div class="bond-status"><b>${esc(bond.name)}</b><span>好感 ${profile.affection} / 100</span></div><div class="bond-meter" role="progressbar" aria-label="露米娜好感度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${profile.affection}"><i style="width:${profile.affection}%"></i></div><p class="bond-next">${esc(bond.next)}</p>`;
  }
  function bondSummary() {
    const profile=bondProfile();
    return `<section class="side-panel story-journal"><div class="panel-title"><h2>${icon('signature')}星露手札</h2><span>${run?.practice?'體驗中':'跨局保存'}</span></div><div class="bond-summary">${portrait()}<div class="bond-copy"><span class="eyebrow">STARGAZER · 24</span><h3>星露法師・露米娜</h3>${bondMeter(profile)}</div></div><div class="gift-pouch">${Object.values(Story.GIFTS).map(g=>`<span title="${esc(g.description)}">${esc(g.name)} <b>×${profile.gifts[g.id]}</b></span>`).join('')}</div><p class="bond-save-note">${run?.practice?'練習中的禮物與好感僅供體驗，離開後不累計。':'正式遠征的禮物與心意會留到下一趟旅程。走近露米娜交談、贈禮。'}</p><button type="button" class="secondary wide" data-open-journal="">閱讀故事與回憶</button></section>`;
  }
  function bondConversation() {
    const profile=bondProfile(),dialogue=Story.dialogue(run),giftsGiven=run.npc?.giftsGiven || 0;
    return `<section class="bond-panel"><div class="bond-intro">${portrait()}<div class="bond-copy"><span class="eyebrow">LUMINA · 24 歲</span><h3>${esc(dialogue.title)}</h3><p>${esc(dialogue.text)}</p>${bondMeter(profile)}</div></div><div class="bond-gifts" aria-label="贈送旅途禮物">${Object.values(Story.GIFTS).map(g=>`<button type="button" class="gift-button" data-action="giveGift" data-choice="${g.id}" ${!profile.gifts[g.id] || giftsGiven>=3?'disabled':''}><span>${icon(g.id==='flower'?'heal':g.id==='tea'?'potion':'signature')}</span><b>${esc(g.name)}</b><small>×${profile.gifts[g.id]} · 好感 +${g.affection}</small></button>`).join('')}</div><p class="bond-save-note">本次已送 ${giftsGiven} / 3 件 · ${run.practice?'練習體驗，不累計正式好感。':'禮物與好感自動保存。'}</p><div class="bond-actions"><button type="button" class="secondary" data-action="talkNpc" data-choice="listen" ${run.npc?.talked?'disabled':''}>${run.npc?.talked?'這次的心事已收藏':'聊聊星圖與心事'}</button><button type="button" class="secondary" data-open-journal="">回看我們的故事</button></div>${!profile.questCleared?`<div class="bond-quest"><h4>星光之約 · 三幕專屬冒險</h4><p>穿越流動星軌與月露花庭，直面失約星影，替露米娜找回完整星圖。</p><button type="button" class="primary" data-action="beginBondQuest" ${dialogue.canQuest?'':'disabled'}>${dialogue.canQuest?'陪她尋回星座':'好感 45 解鎖'}</button></div>`:profile.dating?'<p class="bond-promise">已締結星光之約。接下來的每張旅圖，都有彼此的位置。</p>':`<div class="bond-quest"><h4>把心意說出口</h4><p>星圖已完整。戀愛關係由你的選擇開始；也可以繼續以旅伴的身分同行。</p><button type="button" class="primary" data-action="confessBond" ${dialogue.canConfess?'':'disabled'}>${dialogue.canConfess?'告白：想和妳一起迎接晨光':'好感 75 可表達心意'}</button></div>`}</section>`;
  }
  function bindStoryLinks(scope) {
    scope.querySelectorAll('[data-open-journal]').forEach(button=>{button.onclick=()=>openChronicle(button.dataset.openJournal);});
  }
  function renderStory() {
    const story=Story.storyFor(run);
    $('storyStrip').hidden=!run;
    textIfChanged('storyChapter',story.chapter || '失名紀事');textIfChanged('storyTitle',story.title);
    textIfChanged('storyExcerpt',story.text);
    $('storyStrip').dataset.story=story.id;
  }
  function openChronicle(sceneId) {
    if(run){paused=true;syncPause();renderSidebar();}
    const profile=bondProfile(),current=Story.storyFor(run),scenes=(profile.scenes || []).map(id=>Story.SCENES?.[id]).filter(Boolean);
    const selected=scenes.find(scene=>scene.id===sceneId) || current;
    openDialog(`<article class="story-dialog"><span class="eyebrow">${esc(selected.chapter || '星露手札')}</span><h2>${esc(selected.title)}</h2><div class="story-prose">${esc(selected.text).split('\n').filter(Boolean).map(line=>'<p>'+line+'</p>').join('')}</div><div class="bond-summary">${portrait()}<div class="bond-copy"><h3>露米娜的星圖</h3>${bondMeter(profile)}<p>初識 → 熟悉（20）→ 信任（45）→ 心意相通（75）</p></div></div><p class="bond-save-note">${run?.practice?'目前為練習體驗，回憶與好感不寫入正式手札。':'禮物可能出現在戰鬥與寶箱。好感 45 可展開三幕星約冒險；完成後、好感 75，可主動選擇告白。'}</p><h3>已收藏的回憶</h3><div class="memory-list">${scenes.length?scenes.map(scene=>`<button class="secondary" type="button" data-open-journal="${esc(scene.id)}">${esc(scene.title)}</button>`).join(''):'<p>走近露米娜，讓第一段回憶從一句話開始。</p>'}</div><button type="button" class="primary wide" id="storyReturn">${run?'回到旅程':'回到地牢入口'}</button></article>`);
    bindStoryLinks($('dialogContent'));
    $('storyReturn').onclick=()=>{$('infoDialog').close();if(run && !persistenceBroken){paused=false;syncPause();renderSidebar();if(inConversation())$('conversationClose')?.focus({preventScroll:true});else $('arena').focus({preventScroll:true});}};
  }
  function journey() {
    $('journeyStops').innerHTML = names.slice(0,run?Engine.getRegionCount(run):names.length).map((name,i) => `<div class="journey-stop ${i === (run?.region || 0) ? 'current' : ''} ${run && (i < run.region || run.status === 'won') ? 'cleared' : ''}"><span class="journey-number">0${i+1}</span><div><strong>${esc(name)}</strong><small>${esc(bosses[i])}</small></div><span>${run && i < run.region ? '已突破' : '封印 '+(i+1)}</span></div>`).join('');
  }
  function entryCard(card, owned) {
    const art = window.ENROOT_PIXEL_ART ? window.ENROOT_PIXEL_ART(card, 'large') : '';
    const rank = {N:0,R:1,SR:2,SSR:3,UR:4}[card.rarity] || 0;
    return `<div class="entry-card"><span class="rarity-label">${esc(card.rarity)}</span><div class="card-art">${art}</div>${owned ? '' : '<div class="preview-card-note">練習用借閱卡</div>'}<strong>${esc(card.word)}</strong><div class="translation">${esc(card.zh)}</div><div class="entry-effect">奧義咒語 · ${esc(card.word)}<br>生命 +${rank*3} · 奧義基礎威力 +${rank}</div></div>`;
  }
  function renderWelcome() {
    $('actionPanel').innerHTML = `<div class="action-heading"><h3>走位、閃避，讓文字化為力量</h3><span class="pill">動作遠征</span></div><p>四道封印、24 個節點，通往世界遺忘的星空。與星露法師露米娜同行，收集旅途小物，解開她的星圖與三幕專屬冒險。</p><div class="onboarding"><div><em>01 / MOVE</em><b>${icon('route')}自由移動</b>${touchLayout?'拖曳左側搖桿':'WASD 或方向鍵'}<br>繞過敵人與掩體</div><div><em>02 / DASH</em><b>${icon('dash')}衝刺閃避</b>${touchLayout?'點衝刺瞬間位移':'空白鍵瞬間位移'}<br>穿過危險彈幕</div><div><em>03 / CHANT</em><b>${icon('spell')}專注詠唱</b>${touchLayout?'點詠唱放慢時間<br>依序點符文施法':'Enter 放慢時間<br>打字釋放魔法'}</div></div>`;
  }
  function lobby() {
    if(immersive)void exitImmersive();
    if(releaseSession){releaseSession();releaseSession=null;sessionHeld=false;}
    run = null; receipt = null; paused = false; finished = false; persistenceBroken = false; settlementPromise = null;
    chanting=false;clearMovement();document.body.classList.remove('in-run');$('actionPanel').classList.remove('combat-panel','is-chanting');$('actionPanel').inert=false;
    actionSignature = sidebarSignature = logSignature = '';
    $('pauseButton').hidden = true; $('pauseOverlay').hidden = true; $('bossBanner').hidden = true;
    $('modeLabel').textContent = '以單字喚醒魔法'; $('floorLabel').textContent = '尚未出發'; $('chapterLabel').textContent = 'CHAPTER I'; $('regionLabel').textContent = names[0];
    $('arenaCaption').hidden = false; $('arenaCaption').textContent='✧ 古老的文字，正在等待回聲。'; $('hpText').textContent = '120 / 120'; $('hpBar').style.width = '100%';
    $('shieldText').textContent = '0'; $('goldText').textContent = '0'; $('comboText').textContent = '× 0';
    renderWelcome();
    renderDeparture(); journey();renderParty();renderStory();updateArenaHUD();syncAudio();presentation();
  }
  function renderDeparture() {
    const collection = Storage.listOwned(cards), owned = collection.ok ? collection.cards : [];
    if (!owned.some(c => c.word === selectedWord)) selectedWord = owned[0]?.word || '';
    const card = owned.find(c => c.word === selectedWord) || cards.find(c=>c.word === 'predict') || cards[0];
    const active = saved?.active;
    $('sidebar').innerHTML = `<section class="side-panel departure"><div class="panel-title"><h2>${icon('spell')}${active ? '尚未結束的冒險' : '選擇入場卡片'}</h2><span>${owned.reduce((n,c)=>n+c.count,0)} 張收藏</span></div>${owned.length ? `<label for="entrySelect">從已抽到的卡片中選擇</label><select id="entrySelect" ${active ? 'disabled' : ''}>${owned.map(c=>`<option value="${esc(c.word)}" ${c.word===selectedWord?'selected':''}>${esc(c.word)} · ${esc(c.rarity)} · ×${c.count}</option>`).join('')}</select>` : '<div class="empty-inventory">還沒有收藏卡片。<br><a href="index.html">完成 10 題，抽取第一張卡</a>，或先免費練習。</div>'}${entryCard(active ? cards.find(c=>c.word===active.receipt.word)||card : card, owned.length>0)}<p class="entry-note">${active ? '你的進度已保存。接續冒險不會再次消耗卡片。' : '正式入場將消耗所選卡片 1 張。<br>失敗不退還；每次冒險重新生成路線。'}</p>${active ? '<button id="continueRun" class="primary wide">接續冒險</button><button id="abandonSaved" class="secondary wide">結束這次冒險</button>' : `<button id="startRun" class="primary wide" ${!owned.length || !collection.ok ? 'disabled' : ''}>消耗 1 張 · 踏入地牢</button><button id="practiceRun" class="secondary wide">免費練習 · 不消耗卡片</button>`}<div class="save-note">${active ? '進度已保存' : '正式冒險自動保存 · 隨時回來繼續'}</div></section><section class="side-panel tip-panel"><div class="eyebrow">A WORD OF ADVICE</div><p>普通卡也能走到最後。把重複抽到的卡片帶進地牢，讓每一張收藏都有新的旅程。</p></section>`+bondSummary();
    bindStoryLinks($('sidebar'));
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
      if(!practice){saved=await Storage.load();if(!saved.ok){notify(saved.error,true);return;}}
      const next = Engine.createRun(card,practice,undefined,saved?.relationship);
      next.difficulty=chosenDifficulty;
      if (!practice) {
        const result = await Storage.consumeEntry(card.word,cards,next);
        if (!result.ok) { notify(result.error,true); saved = await Storage.load(); if(releaseSession){releaseSession();releaseSession=null;sessionHeld=false;} renderDeparture(); return; }
        receipt = result.receipt;
        if(result.run?.relationship)next.relationship=result.run.relationship;
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
      if(!candidate.relationship)candidate.relationship=Story.createProfile(saved.relationship);
      run = candidate; receipt = saved.active.receipt; finished = saved.active.finished; paused = run.status === 'combat';
      if(run.status==='combat')Arena.ensure(run);chanting=false;clearMovement();
      actionSignature = sidebarSignature = ''; render(); notify('已接續保存的冒險，沒有再次扣卡。');
      if(!paused && navigable()){if(inConversation())$('conversationClose')?.focus({preventScroll:true});else $('arena').focus({preventScroll:true});}
    } finally {busy=false;}
  }
  function syncPause() {
    if(run && ['won','lost'].includes(run.status) && !persistenceBroken)paused=false;
    $('pauseOverlay').hidden = !run || !paused;
    iconLabel('pauseButton',paused?'play':'pause',''); $('pauseButton').setAttribute('aria-label',paused?'繼續遊戲':'暫停遊戲');
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
    if(['giveGift','talkNpc','confessBond'].includes(method))tone('heal');
    if(method==='helpNpc')tone('heal');else if(method==='challengeNpc')tone('cast');
    if(method==='challengeNpc'||method==='beginBondQuest')$('gameSurface').scrollIntoView({block:'start'});
    if(navigable() && !inConversation())$('arena').focus({preventScroll:true});
    if(method==='confessBond')openChronicle('lumina-confession');
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
        (npc.id==='lumina'?bondConversation():'')+
        (run.status==='shop'?`<div class="shop-caption">${run.player.gold} 金幣 · 走到出口可離開商店</div>${choiceMarkup(run.shop || [],'buy')}`:
        `<div class="npc-help"><b>${helped?(npc.companionRole?'已加入隊伍':'已接受幫助'):npc.companionRole?'邀請旅伴':'旅人的善意'}</b><p>${esc(npc.helpDescription)}</p><button class="primary" data-action="helpNpc" ${helped?'disabled':''}>${helped?(npc.companionRole?'正在同行':'本次幫助已領取'):(npc.companionRole?'邀請同行':'接受幫助')}</button></div>`)+
        (helped?'<p class="npc-peace">已選擇和平相助，這次相逢不再發起挑戰。返回場景後，走到出口繼續。</p>':
        `<form id="npcChallengeForm" class="npc-challenge" autocomplete="off"><div><b>挑戰 ${esc(npc.name)}</b><p>${esc(npc.challengeDescription || '將立即進入雙階段 Boss 戰；失敗會結束本次冒險。')}</p><p>勝利專屬戰利品：<strong>${esc(npc.lootName)}</strong></p><label for="npcChallengeInput">輸入 <code>${esc(npc.challengeWord)}</code>，向對方宣戰</label></div><div class="challenge-input-row"><input id="npcChallengeInput" name="challenge" aria-label="挑戰文字" placeholder="${esc(npc.challengeWord)}" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" maxlength="40"><button type="submit" class="secondary danger">發起 Boss 挑戰</button></div></form>`);
      $('conversationClose').onclick=closeConversation;bindStoryLinks(area);
      if($('npcChallengeForm'))$('npcChallengeForm').onsubmit=event=>{event.preventDefault();doAction('challengeNpc',$('npcChallengeInput').value);};
    }else{
      const labels={route:['選一扇門，走向下一段旅程','走近傳送門，按 E 或 Enter 進入。'],shop:['商人正在攤位等你','走近商人交談、購物或輸入挑戰文字；走到出口繼續。'],npc:['路上遇見了一位旅人','走近對方按 E 交談。接受幫助，或用指定文字發起挑戰。'],reward:['戰利品就在眼前','走近一座祭壇，按 E 領取；每次只能選一項。'],camp:['星燈照亮了營地','走近營火休息，或前往木偶磨練。兩者只能選一項。']};
      const [title,detail]=labels[run.status];
      const trophy=run.status==='reward' && run.npc?.defeated ? Engine.RELICS[Engine.NPCS[run.npc.id]?.lootId] : null;
      area.innerHTML=`<div class="action-heading"><h3>${esc(title)}</h3><span class="pill">走近 · E 互動</span></div><p>${esc(detail)}</p>${trophy?`<div class="special-loot"><span>✦ NPC 專屬遺物 · 已裝備</span><strong>${esc(trophy.name)}</strong><p>${esc(trophy.description)}</p></div>`:''}<div class="nearby-card ${target?'in-range':''}"><span>${target?'◇ 可互動':'↟ 前往場景中的標記'}</span><strong>${esc(target?.name || '移動角色，探索這個房間')}</strong><p>${esc(target?.description || 'WASD／方向鍵移動，Space 衝刺。手機拖曳搖桿移動，再按互動按鈕。')}</p></div><div class="scene-directory" aria-label="場景中的互動物件">${(scene?.objects || []).map(object=>`<span>${icon(npcIcons[object.npcId] || object.routeType || (object.kind==='reward'?'treasure':object.kind==='exit'?'route':object.kind))}${esc(object.name)}</span>`).join('')}</div>`;
    }
  }
  function choiceMarkup(list, method) {
    return `<div class="choices">${list.map((item,i)=>`<button class="choice" data-action="${method}" data-choice="${esc(item.id == null ? i : item.id)}" ${item.sold || (method==='buy' && item.price>run.player.gold)?'disabled':''}><span class="choice-icon">${icon(itemIcons[item.id] || item.type || item.kind || 'relic')}</span><strong>${esc(item.name || item.title || item.label || '神祕路線')}</strong><small>${esc(item.description || item.detail || '')}${method==='buy' && item.price != null ? `<br><span class="price">${item.sold?'已售出':item.price+' 金幣'}</span>`:''}</small></button>`).join('')}</div>`;
  }
  function renderAction() {
    if(explorationStatuses.includes(run.status))Explore.ensure(run);
    const signature = [run.status,run.encounter,run.enemy?.id,run.spell?.word,run.rewards?.map(x=>x.id).join(','),run.shop?.map?.(x=>`${x.id}:${x.sold}`).join(','),run.player.gold,run.exploration?.dialogId,explorationStatuses.includes(run.status)?Explore.nearest(run)?.id:'',run.npc?.helped,JSON.stringify(run.relationship),JSON.stringify(run.bondQuest),run.npc?.giftsGiven,run.npc?.talked].join('|');
    if (signature === actionSignature) {liveCombat();return;}
    actionSignature = signature;
    const area = $('actionPanel');
    area.classList.remove('conversation-panel');
    area.classList.toggle('combat-panel',run.status==='combat');area.classList.toggle('is-chanting',chanting && run.status==='combat');
    if (run.status === 'combat') {
      const spell = run.spell, enemy = run.enemy;
      area.innerHTML = `<div class="enemy-intent"><span id="enemyIntent"></span><b id="intentTime"></b></div><div class="meter enemy-meter"><i id="intentBar"></i></div><div class="spell-row" data-element="${spellIcon(spell)}"><span class="spell-emblem">${icon(spellIcon(spell))}</span><div class="spell-copy"><div class="spell-word" id="spellWord">${esc(spell.word)}</div><div class="spell-meaning">${esc(spell.zh || '')}</div></div><div class="spell-type">${esc(spellTypes[spell.type]||'魔法咒語')}<br><small>${esc(spell.description||'')}</small></div></div><div id="inlineQte" class="inline-qte" hidden><div class="qte-top"><b>✦ 咒語連鎖</b><span id="inlineQteTime"></span></div><div class="qte-letters" id="inlineQteLetters" aria-hidden="true"></div><p id="inlineQteHint" role="status" aria-live="polite"></p></div><form class="spell-form" id="spellForm" autocomplete="off"><input id="spellInput" name="spell" aria-label="輸入咒語" placeholder="按 Enter 開始詠唱…" ${chanting?'':'readonly'} autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" inputmode="text" enterkeyhint="send" maxlength="80"><button class="primary" type="submit">施法 ↵</button></form>`;
      $('spellForm').onsubmit = event => {event.preventDefault();cast();};
      $('spellInput').oninput = event=>{if(!event.isComposing)paintLetters(true);};
      $('spellInput').oncompositionend=()=>paintLetters(true);
      $('spellInput').readOnly=touchLayout || !chanting;
      $('spellInput').onfocus=()=>{if(touchLayout){$('spellInput').blur();return;}if(!chanting)setChant(true);};
      previousTyped='';paintLetters();
      liveCombat();
    } else if (explorationStatuses.includes(run.status)) {
      renderExploration(area);
    } else {
      const won = run.status === 'won', stats=run.stats || {};
      area.innerHTML = `<div class="action-heading"><h3 class="end-title">${won ? '封印已解開，星空重新亮起。' : '火光熄滅，文字仍在。'}</h3></div><p>${won ? '你穿越了符文地牢。這段旅程的每個字，都成了你的力量。' : '這次冒險結束了。帶著記住的咒語，下次再走得更遠。'}${run.practice ? '（練習模式）' : ''}</p><div class="end-stats"><div><b>${Math.min(Engine.getCampaignLength(run),run.encounter+1)}</b><span>抵達關卡</span></div><div><b>${stats.casts ?? stats.correct ?? 0}</b><span>成功施法</span></div><div><b>${run.relics.length}</b><span>獲得遺物</span></div></div><button class="primary" id="returnLobby">回到地牢入口</button>`;
      $('returnLobby').onclick = exitRun;
      settleRun();
    }
    area.querySelectorAll('[data-action]').forEach(button=>{button.onclick=()=>doAction(button.dataset.action,button.dataset.choice);});
    syncPause();
  }
  function paintLetters(fromInput=false) {
    if (run?.status!=='combat' || !$('spellInput')) return;
    const typed=$('spellInput').value,state=Chant.feedback(previousTyped,typed,run.spell.word);
    const display=char=>char===' '?'␣':char;
    $('spellWord').innerHTML=state.letters.map(letter=>`<span class="${letter.state==='correct'?'matched':letter.state==='wrong'?'wrong':''}">${esc(letter.char)}</span>`).join('');
    const keys=state.letters.map(letter=>`<span class="qte-letter ${letter.state}">${esc(display(letter.char))}</span>`).join('')+(state.extra?`<span class="qte-letter wrong">+${[...state.extra].length}</span>`:'');
    $('qteLetters').innerHTML=keys;if($('inlineQteLetters'))$('inlineQteLetters').innerHTML=keys;
    $('qteNext').textContent=state.complete?'↵':display(state.next || '⌫');
    $('qteProgress').style.width=(state.progress*100)+'%';$('qteProgressText').textContent=state.matched+' / '+state.letters.length;
    $('qteHint').textContent=state.complete?'咒語完成！按 Enter 或「施法」':state.extra?'刪除多出的字母，再施法':state.wrong?'第 '+(state.index+1)+' 個字母應為 '+display(state.next)+'，請刪除修正':state.kind==='corrected'?'已修正 · 繼續輸入':state.matched?'命中！繼續輸入下一鍵':'依序輸入亮起的字母';
    if($('inlineQteHint'))$('inlineQteHint').textContent=$('qteHint').textContent;
    if($('inlineQte')){$('inlineQte').classList.toggle('qte-invalid',state.wrong);$('inlineQte').classList.toggle('qte-ready',state.complete);}
    $('chantQte').classList.toggle('qte-ready',state.complete);$('chantQte').classList.toggle('qte-invalid',state.wrong);
    $('chantQte').dataset.state=state.complete?'ready':state.wrong?'wrong':'typing';
    $('spellInput').setAttribute('aria-invalid',state.wrong?'true':'false');
    if(fromInput && chanting && state.kind!=='idle'){
      $('chantQte').classList.remove('qte-hit','qte-miss');
      $('chantQte').classList.add(state.kind==='wrong'?'qte-miss':'qte-hit');qtePulseUntil=performance.now()+180;
      if(state.kind==='wrong')tone('error');else if(state.kind==='ready')tone('heal');
    }
    previousTyped=typed;
    paintTouchSpell();
  }
  function cast() {
    if(!run || run.status!=='combat' || paused || busy || persistenceBroken)return;
    const input=$('spellInput'), text=input.value;
    if(!text.trim()){setChant(true);return;}
    paintLetters();
    const type=run.spell.type, result=Arena.cast(run,text);
    notify(result.message || (result.ok?'咒語施放成功。':'拼寫還差一點，請修正後再試。'),!result.ok);
    if(result.ok){
      $('castFeedback').textContent=result.fast?'✦ 迅捷施法！':'✦ 施法成功！';castFeedbackUntil=performance.now()+850;
      setChant(false);renderer.burst(type);tone(type);actionSignature='';render();$('arena').focus({preventScroll:true});
    }
    else {tone('error');$('spellInput')?.setAttribute('aria-invalid','true'); if(run.status!=='combat'){setChant(false);render();}else if(result.message?.includes('射程') || result.message?.includes('下一波')){setChant(false);$('arena').focus({preventScroll:true});}else renderVitals();}
    persist();
  }
  function liveCombat() {
    if(run.status!=='combat' || !$('enemyIntent'))return;
    const enemy=run.enemy,intent=enemy.intent;
    $('enemyIntent').textContent=`${enemy.name} · ${intent.name} · 留意地面預警`;
    $('intentTime').textContent=Math.max(0,intent.remaining).toFixed(1)+' 秒';
    $('intentBar').style.width=Math.max(0,Math.min(100,intent.remaining/intent.duration*100))+'%';
    $('bossBanner').hidden=enemy.kind!=='boss';
    $('bossName').textContent=enemy.name;$('bossPhase').textContent=enemy.phase===2?'Ⅱ · 狂怒覺醒':'Ⅰ · 封印守衛';
    $('bossHealth').textContent=`${Math.ceil(enemy.hp)} / ${enemy.maxHp}${enemy.shield?' · 護盾 '+enemy.shield:''}`;
    $('bossHealthBar').style.width=Math.max(0,enemy.hp/enemy.maxHp*100)+'%';$('bossBanner').dataset.phase=String(enemy.phase || 1);
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
    const key=JSON.stringify([run.queue,run.inventory,run.relics,run.status,paused,run.relationship]);
    if(key===sidebarSignature)return; sidebarSignature=key;
    const queue=run.queue || [];
    const inventory=run.inventory || [];
    const relics=run.relics || [];
    $('sidebar').innerHTML = panel('接下來的咒語',`<div class="queue-list">${queue.length?queue.map(spell=>`<div class="queue-item"><span class="queue-icon" data-element="${spellIcon(spell)}">${icon(spellIcon(spell))}</span><div><b>${esc(spell.word)}</b><small>${esc(spell.zh)} · ${esc(spellTypes[spell.type]||'魔法')}</small></div></div>`).join(''):'<p>進入戰鬥後，咒語會在這裡浮現。</p>'}</div>`) + panel('冒險行囊',`<div class="bag-items">${inventory.filter(item=>item.count>0).map(item=>`<button class="bag-item" data-item="${esc(item.id)}" ${((item.id!=='potion' && run.status!=='combat') || ['won','lost'].includes(run.status) || paused)?'disabled':''} title="${esc(item.description)}"><span class="item-emblem">${icon(itemIcons[item.id] || 'relic')}</span><span><b>${esc(item.name)}</b><small>${esc(item.description)}</small></span><span class="quantity">×${item.count}</span></button>`).join('') || '<p>行囊空了。到商店或寶箱找找補給。</p>'}</div><p class="card-effect">點擊道具使用；藥水可在探索時補血。</p>${relics.length?`<div class="panel-title" style="margin:20px 0 8px"><h3>${icon('relic')}已裝備遺物</h3><span>自動生效</span></div>${relics.map(item=>`<span class="relic-tag" title="${esc(item.description)}">${esc(item.name||item.id)}</span>`).join('')}`:''}`) + bondSummary() + `<section class="side-panel"><div class="panel-title"><h2>${icon('route')}旅途紀錄</h2><span>${run.practice?'練習':'自動保存'}</span></div><div id="logList"></div><button class="quiet-button danger" id="abandonRun">結束這次冒險</button></section>`;
    $('sidebar').querySelectorAll('[data-item]').forEach(button=>button.onclick=()=>doAction('useItem',button.dataset.item));
    bindStoryLinks($('sidebar'));
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
    $('chapterLabel').textContent='CHAPTER '+['I','II','III','IV'][Math.min(3,run.region)];
    $('regionLabel').textContent=run.regionName || names[run.region];
    $('floorLabel').textContent=String(Math.min(Engine.getCampaignLength(run),run.encounter+1)).padStart(2,'0')+' / '+Engine.getCampaignLength(run);
    $('arenaCaption').hidden=false;
    if(run.status!=='combat') {$('bossBanner').hidden=true;$('arenaCaption').textContent={route:'命運的岔路，在你眼前展開。',reward:'那些微光，是留給旅人的禮物。',camp:'在火焰熄滅以前，歇息片刻。',shop:'走近商人交談，或前往出口繼續。',npc:'善意與挑戰，都從一句話開始。',won:'文字的力量，讓世界再次甦醒。',lost:'下一次，你會帶著更多知識回來。'}[run.status] || '';}
    renderVitals();renderAction();renderSidebar();renderLog();renderParty();renderStory();journey();syncPause();updateArenaHUD();syncAudio();presentation();
  }
  async function settleRun() {
    if(finished)return true;
    if(settlementPromise)return settlementPromise;
    if(run.practice){finished=true;return true;}
    if(persistenceBroken)return false;
    settlementPromise=(async()=>{
      const result=await Storage.finishRun(receipt.id,{won:run.status==='won',shards:0,floor:Math.min(Engine.getCampaignLength(run),run.encounter+1)},run);
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
    openDialog('<h2>結束這次冒險？</h2><p>結束後無法接續；已消耗的入場卡片不會退還。正式遠征已取得的禮物與好感會保留。</p><div class="action-buttons"><button class="primary" id="keepRun">保留進度</button><button class="secondary" id="confirmAbandon">結束冒險</button></div>');
    $('keepRun').onclick=()=>$('infoDialog').close();
    $('confirmAbandon').onclick=async()=>{
      if(busy)return;busy=true;
      try{
        if(!fromLobby && run && !run.practice){await persist();if(persistenceBroken)return;}
        const activeReceipt=fromLobby?saved?.active?.receipt:receipt;
        if(activeReceipt){if(!(await claimSession())){notify('另一個分頁正在冒險，請先關閉該分頁。',true);return;}const result=await Storage.abandonRun(activeReceipt.id);if(!result.ok){notify(result.error,true);return;}}
        $('infoDialog').close();saved=await Storage.load();lobby();notify('這次冒險已結束。');
      }finally{busy=false;}
    };
  }
  function help() {
    if(run){paused=true;syncPause();}
    openDialog('<h2>移動、閃避、詠唱</h2><ol><li><b>WASD／方向鍵移動：</b>繞過石柱、與近戰敵人保持距離。手機拖曳左側搖桿，360 度移動；輕推慢走、推遠加速，放開即停止。</li><li><b>Space 衝刺：</b>沿移動方向快速位移，短暫免疫碰撞傷害，冷卻 1.4 秒；不能穿越牆壁。</li><li><b>Enter 詠唱：</b>時間放慢，依序輸入戰場提示的字母：下一鍵會亮起，打對變綠、打錯標紅；完成後再按 Enter 施法。施法後自動返回走位，也可按 Esc 取消詠唱。</li><li><b>手機符文施法：</b>點「詠唱」，依亮起的順序點 2～4 組符文，完成自動施放；不會開啟系統鍵盤。拖動搖桿或按衝刺立即返回走位，已輸入字母保留。射程外會保留完整咒語，靠近後點「施放已備咒語」。</li><li><b>專注會耗盡：</b>詠唱時消耗專注，離開詠唱即可恢復。專注歸零後敵人恢復正常速度。</li><li><b>看清預警：</b>紅色地面標記會在短暫延遲後造成傷害。用走位離開，或衝刺穿過彈幕。</li><li><b>靠近再施法：</b>咒語自動鎖定射程內最近的敵人；每五次成功施法輪到卡片奧義。</li></ol><h3>走近互動與旅途 NPC</h3><p>探索時用 WASD 或方向鍵走近傳送門、祭壇、營火或 NPC，按 E／Enter 互動；手機點「互動」。商店也要先走近商人才能購物。交談時按 Esc 返回場景，走到出口繼續。</p><p>旅途中可能遇見療癒師、鍛造師、製圖師、擺渡人，以及三位可招募的旅伴：燈旅精靈提供護盾、回聲學徒延遲模仿成功咒語、紙甲衛士主動迎擊。同行夥伴會跟隨走位，隨進度保存，只存在於本趟遠征。交談後可接受一次幫助，或輸入畫面指定文字發起雙階段 Boss 挑戰。商人同樣可被挑戰；擊敗必得專屬遺物。接受幫助後，本次相遇不能再挑戰。</p><h3>房間與遺物</h3><p>新遠征穿過四個區域、24 個節點，每區第六節點為首領。舊存檔保留原有 12／18 節點進度。新增機關房間與原有掩體、熔岩、援軍各有不同走位策略。戰利品三選一，移速、連鎖、衝刺與緩速遺物可以搭配。</p><h3>手機橫向全螢幕</h3><p>開始冒險後，點戰場右上角的展開圖示，再橫放手機。戰場在左側，搖桿、符文與衝刺在右側；上方保留手札、配樂與離開。支援的瀏覽器會進入原生全螢幕並嘗試鎖定橫向，其他瀏覽器使用滿版配置。按「離開」恢復一般版面，進度不受影響。</p><h3>配樂、暫停與接續</h3><p>點「配樂」開啟原創音樂。四位主線 Boss 與九位 NPC 首領各有獨立主題曲，第二階段切換狂怒變奏。登場、攻擊與死亡都有對應特效；系統「減少動畫」設定會抑制震動。按 Esc 暫停；切換分頁也會自動暫停。正式冒險會保存位置與進度，重新整理可接續。</p><h3>星露法師與羈絆</h3><p>24 歲的露米娜正在尋回失落星圖。戰鬥與寶箱可能獲得禮物，走近她交談、贈禮，每次相逢最多送三件。好感 45 解鎖三幕星約冒險；完成後、好感 75，可主動告白。正式遠征的禮物、好感與回憶會跨局保存，練習模式僅體驗，離開後不累計。星露手札可回看已解鎖的故事。</p><h3>卡片與難度</h3><p>正式入場消耗 1 張收藏卡；練習免費。故事難度降低空間傷害，試煉提高傷害與彈速。失敗不退卡；道具、金幣與遺物只屬於本次冒險。</p>');
  }
  function codex() {
    if(run){paused=true;syncPause();}
    const relics=catalogValues(Engine.RELICS),items=catalogValues(Engine.ITEMS),regions=catalogValues(Engine.REGIONS);
    const bossTactics=['棘冠典獄長交替施放追蹤落點與環形震波。生命低於一半後，落點與震波數量增加；離開紅色預警再詠唱。','鏡月女巫發射放射彈幕，並以光束封鎖移動路線。第二階段出現交叉光束，利用彈幕間隙走位。','失名之王輪替星環彈幕、突刺與末頁湮滅。大範圍攻擊保留安全帶，第二階段增加彈數與落點，保留衝刺迎接連續攻勢。','忘誓星龍守望花庭。看清星軌與光環預警，以衝刺穿過星幕，保留專注應對第二階段。'];
    const roomGuide='<h3>'+Arena.ROOMS.length+' 種戰鬥房間</h3><div class="room-codex">'+Arena.ROOMS.map(room=>`<div class="codex-item"><b>${esc(room.name)}</b><p>${esc(room.description)}</p></div>`).join('')+'</div>';
    openDialog(`<h2>地牢見聞錄</h2><h3>四道封印的守護者</h3>${regions.map((region,i)=>`<div class="codex-item" style="margin-bottom:10px"><b>0${i+1} · ${esc(region.boss?.name || bosses[i])}</b><p>${esc(bossTactics[i])}</p></div>`).join('')}${roomGuide}<h3>旅途中的九位角色</h3><div class="codex-grid">${catalogValues(Engine.NPCS).map(npc=>`<div class="codex-item"><b>${esc(npc.name)} · ${esc(npc.title)}</b><p>${esc(npc.helpDescription)}</p><p>挑戰文字：${esc(npc.challengeWord)}<br>特殊戰利品：${esc(npc.lootName)}</p></div>`).join('')}</div><h3>旅途中的遺物</h3><div class="codex-grid">${relics.map(item=>`<div class="codex-item"><b>${esc(item.name)}</b><p>${esc(item.description)}</p></div>`).join('')}</div><h3>消耗道具</h3><div class="codex-grid">${items.map(item=>`<div class="codex-item"><b>${esc(item.name)}</b><p>${esc(item.description)}</p></div>`).join('')}</div>`);
  }
  $('pauseButton').onclick=togglePause;$('resumeButton').onclick=togglePause;$('helpButton').onclick=help;$('codexButton').onclick=codex;
  $('closeDialog').onclick=()=>$('infoDialog').close();
  $('storyButton').onclick=()=>openChronicle();$('storyRead').onclick=()=>openChronicle();
  function returnToArena(){if(navigable() && !paused && !chanting && !inConversation())$('arena').focus({preventScroll:true});}
  $('soundButton').onclick=async()=>{const next=!audioEnabled;const ok=await soundtrack.setEnabled(next);audioEnabled=next && ok!==false;iconLabel('soundButton','music','配樂：'+(audioEnabled?'開':'關'));$('soundButton').setAttribute('aria-pressed',String(audioEnabled));if(next && !audioEnabled)notify('瀏覽器尚未允許播放配樂，請再按一次配樂按鈕。',true);syncAudio();returnToArena();};
  soundtrack.setVolume(.45);$('musicVolume').oninput=event=>soundtrack.setVolume(Number(event.target.value)/100);
  $('musicVolume').onchange=returnToArena;
  $('chantButton').onclick=()=>{setChant(!chanting);if(!chanting)$('arena').focus({preventScroll:true});};
  $('interactButton').onclick=interact;
  bindTouchPress($('touchInteract'),interact);
  bindTouchPress($('touchCast'),()=>{if(!touchLayout)return;if(run?.status==='combat' && Chant.analyze(run.spell.word,$('spellInput')?.value).complete)cast();else setChant(!chanting);});
  bindTouchPress($('touchDash'),requestDash);
  bindTouchPress($('quickPotion'),quickHeal);
  function refreshTouchLayout() {
    clearMovement();setChant(false);touchLayout=touchMedia.matches || immersiveTouch;
    document.body.classList.toggle('touch-layout',touchLayout);touchSpell=null;actionSignature='';
    if(run)render();else {renderWelcome();updateArenaHUD();}
  }
  touchMedia.addEventListener?.('change',refreshTouchLayout);
  window.addEventListener('resize',()=>{clearMovement();if(touchLayout && chanting)setChant(false);});
  function screenState(value) {
    immersive=value;document.body.classList.toggle('immersive-game',value);$('gameSurface').classList.toggle('is-immersive',value);
    $('immersiveTools').hidden=!value;$('expandButton').setAttribute('aria-pressed',String(value));
    $('expandButton').setAttribute('aria-label',value?'離開全螢幕':'橫向全螢幕遊玩');
    $('expandButton').title=value?'離開全螢幕':'橫放手機，戰場與操作台並排';
    clearMovement();
    if(!value){
      nativeScreen=false;immersiveTouch=false;
      if(orientationLocked){try{window.screen?.orientation?.unlock?.();}catch(_){}orientationLocked=false;}
      refreshTouchLayout();
    }
  }
  async function exitImmersive() {
    // Restore layout even if the browser has already dismissed its fullscreen UI.
    screenEpoch++;
    screenState(false);
    try{if(document.fullscreenElement===$('gameSurface'))await document.exitFullscreen();}catch(_){}
    returnToArena();
  }
  async function toggleImmersive() {
    if(screenBusy || !run)return;
    if(immersive){await exitImmersive();return;}
    const epoch=++screenEpoch;
    screenBusy=true;immersiveTouch=touchLayout;screenState(true);refreshTouchLayout();
    try {
      if($('gameSurface').requestFullscreen){
        try{await $('gameSurface').requestFullscreen({navigationUI:'hide'});}catch(_){}
      }
      if(epoch!==screenEpoch || !immersive){
        try{if(document.fullscreenElement===$('gameSurface'))await document.exitFullscreen();}catch(_){}
        return;
      }
      nativeScreen=document.fullscreenElement===$('gameSurface');
      if(immersive && immersiveTouch && nativeScreen && window.screen?.orientation?.lock){
        try{await window.screen.orientation.lock('landscape');orientationLocked=true;
          if(epoch!==screenEpoch || !immersive){window.screen.orientation.unlock?.();orientationLocked=false;}
        }catch(_){}
      }
      if(immersive)notify(nativeScreen?'已開啟全螢幕；橫放手機可使用並排操作台。':'已開啟滿版遊玩；請橫放手機，按「離開」還原版面。');
    } finally {screenBusy=false;returnToArena();}
  }
  document.addEventListener('fullscreenchange',()=>{
    if(document.fullscreenElement===$('gameSurface')){
      if(immersive)nativeScreen=true;
      else void exitImmersive();
    }
    else if(nativeScreen){screenEpoch++;screenState(false);if(navigable()){paused=true;syncPause();renderSidebar();}}
  });
  $('expandButton').onclick=toggleImmersive;$('immersiveExit').onclick=exitImmersive;
  $('immersiveJournal').onclick=()=>openChronicle();
  $('immersiveSound').onclick=()=>$('soundButton').onclick();
  document.addEventListener('keydown',event=>{
    if(event.isComposing || $('infoDialog').open)return;
    if(event.key==='Escape' && immersive && !chanting && !inConversation()){
      event.preventDefault();if(navigable()){paused=true;syncPause();renderSidebar();}void exitImmersive();return;
    }
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
  joystick=new window.DungeonJoystick($('moveJoystick'),{
    canStart:()=>!!navigable() && !paused && !persistenceBroken && !inConversation() && !$('infoDialog').open,
    onStart:()=>{if(chanting)setChant(false);else clearMovement();$('arena').focus({preventScroll:true});},
    onChange:vector=>{if(touchLayout && chanting && (vector.x || vector.y))setChant(false);$('moveJoystick').dataset.x=vector.x.toFixed(3);$('moveJoystick').dataset.y=vector.y.toFixed(3);}
  });
  ['contextmenu','selectstart','dragstart'].forEach(type=>document.addEventListener(type,event=>{
    const target=event.target;
    if(target instanceof HTMLElement && target.closest('#gameSurface') && !target.closest('input,textarea,select,dialog'))event.preventDefault();
  }));
  $('arena').onpointerdown=()=>{if(chanting)setChant(false);$('arena').focus({preventScroll:true});};
  window.addEventListener('blur',()=>{clearMovement();if(navigable()){paused=true;syncPause();persist();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden && navigable()){paused=true;syncPause();persist();}});
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
    if(!paused)presentation();
    renderer.draw({run,focus:chanting,paused,reducedMotion},time);
    requestAnimationFrame(frame);
  }
  async function init(){saved=await Storage.load();lobby();if(!saved.ok)notify(saved.error,true);requestAnimationFrame(frame);}
  init();
})();
