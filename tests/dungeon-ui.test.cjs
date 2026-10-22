'use strict';
// Run the shipping UI event handlers against the real engine/arena. This intentionally
// models only DOM operations used by this page; browser layout and rendering need visual QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Engine = require('../dungeon-engine.js');
const Arena = require('../dungeon-arena.js');
const Explore = require('../dungeon-explore.js');
const Joystick = require('../dungeon-controls.js');
const Chant = require('../dungeon-chant.js');
const Icons = require('../dungeon-icons.js');
const source = fs.readFileSync(path.join(__dirname, '../dungeon.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../dungeon.html'), 'utf8');
const decode = s => s.replace(/&(?:amp|lt|gt|quot|#39);/g, x => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"})[x]);
const makeEvent = (type, values = {}) => ({type,bubbles:true,defaultPrevented:false,...values,
  preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.propagationStopped=true;}});

class Element {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase(); this.ownerDocument = doc; this.children = []; this.parentElement = null;
    this.attrs = {}; this.dataset = {}; this.style = {setProperty(name,value){this[name]=String(value);},getPropertyValue(name){return this[name] || '';}};
    this.listeners = {}; this.captures = new Set(); this.value = ''; this.open = false; this.hidden = false;
    this.readOnly = false; this.disabled = false; this.inert = false; this._text = ''; this.focusCount = 0;
    const classes = new Set();
    this.classList = { add: (...a) => a.forEach(x => classes.add(x)), remove: (...a) => a.forEach(x => classes.delete(x)),
      contains: x => classes.has(x), toggle: (x, force) => { const yes = force == null ? !classes.has(x) : force; yes ? classes.add(x) : classes.delete(x); return yes; },
      values: () => [...classes] };
  }
  set className(value) { this.classList.remove(...this.classList.values()); this.classList.add(...value.split(/\s+/).filter(Boolean)); }
  setAttribute(name, value) {
    this.attrs[name] = String(value);
    if (name === 'id') this.id = value;
    if (name === 'class') this.className = value;
    if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    if (name === 'value') this.value = value;
    if (name === 'readonly') this.readOnly = true;
    if (['hidden', 'disabled', 'inert'].includes(name)) this[name] = true;
  }
  getAttribute(name) { return this.attrs[name] ?? null; }
  appendChild(child) { child.parentElement = this; this.children.push(child); return child; }
  before(child) { child.parentElement = this.parentElement; this.parentElement.children.splice(this.parentElement.children.indexOf(this), 0, child); }
  set innerHTML(value) {
    this.children = []; this._text = ''; const stack = [this];
    const tokens = value.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) || [];
    for (const token of tokens) {
      if (/^<\//.test(token)) { if (stack.length > 1) stack.pop(); }
      else if (/^<[a-z]/i.test(token)) {
        const tag = token.match(/^<([\w-]+)/)[1], child = new Element(tag, this.ownerDocument);
        const rest = token.slice(tag.length + 1).replace(/\/?\s*>$/, '');
        for (const a of rest.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) child.setAttribute(a[1], decode(a[2] ?? a[3] ?? a[4] ?? ''));
        stack.at(-1).appendChild(child);
        if (!/^(input|meta|link|br|hr|img)$/i.test(tag) && !token.endsWith('/>')) stack.push(child);
      } else if (!token.startsWith('<')) stack.at(-1)._text += decode(token);
    }
  }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(x => x.textContent).join(''); }
  matches(selector) {
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
    if (selector.startsWith('#')) return this.id === selector.slice(1);
    const attr = selector.match(/^\[([^=\]]+)(?:=['"]?([^'"\]]+)['"]?)?\]$/);
    if (attr) return Object.hasOwn(this.attrs, attr[1]) && (attr[2] == null || this.attrs[attr[1]] === attr[2]);
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }
  querySelectorAll(selector) {
    const parts = selector.trim().split(/\s+/), result = [];
    const visit = node => node.children.forEach(child => {
      if (child.matches(parts.at(-1))) {
        let ancestor = child.parentElement, i = parts.length - 2;
        while (i >= 0 && ancestor) { if (ancestor.matches(parts[i])) i--; ancestor = ancestor.parentElement; }
        if (i < 0) result.push(child);
      }
      visit(child);
    }); visit(this); return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { for (let p = this; p; p = p.parentElement) if (selector.split(',').some(s => p.matches(s))) return p; return null; }
  focus() {
    if (this.disabled || this.ownerDocument.activeElement === this) return;
    if (++this.focusCount > 20) throw new Error('Recursive focus event');
    this.ownerDocument.activeElement = this; this.onfocus?.({target:this});
  }
  blur() { if (this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = this.ownerDocument.body; }
  addEventListener(type, fn) { (this.listeners[type] ||= new Set()).add(fn); }
  removeEventListener(type, fn) { this.listeners[type]?.delete(fn); }
  dispatchEvent(event) {
    event.target ||= this; event.currentTarget = this;
    this['on'+event.type]?.(event);
    for (const fn of this.listeners[event.type] || []) fn(event);
    if (event.bubbles && !event.propagationStopped) {
      if (this.parentElement) this.parentElement.dispatchEvent(event);
      else this.ownerDocument.dispatchEvent?.(event);
    }
    return !event.defaultPrevented;
  }
  getBoundingClientRect() { return {left:0,top:0,width:160,height:160,right:160,bottom:160}; }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) {
    if (!this.captures.delete(id)) return;
    this.dispatchEvent(makeEvent('lostpointercapture',{pointerId:id}));
  }
  scrollIntoView() {}
  showModal() { this.open = true; }
  close() { this.open = false; }
}

async function harness(active = null, options = {}) {
  const listeners = { document: {}, window: {} }, frames = [], calls = { updates:0, castAttempts:0, consumes:0, saves:0, sounds:[] }, doc = {};
  const media = {width:options.width ?? 1280,coarse:options.coarse ?? false}, mediaQueries = new Map();
  const matchesMedia = query => query.split(',').some(part => {
    const width = part.match(/max-width:\s*(\d+)px/);
    return width ? media.width <= Number(width[1]) : /pointer:\s*coarse/.test(part) ? media.coarse : false;
  });
  const matchMedia = query => {
    if (!mediaQueries.has(query)) mediaQueries.set(query, {media:query,matches:matchesMedia(query),listeners:[],
      addEventListener(type, listener){if(type==='change')this.listeners.push(listener);}});
    return mediaQueries.get(query);
  };
  const documentRoot = new Element('root', doc); documentRoot.innerHTML = html;
  doc.body = documentRoot.querySelector('body'); doc.activeElement = doc.body; doc.hidden = false;
  doc.getElementById = id => documentRoot.querySelector('#' + id);
  doc.querySelectorAll = s => documentRoot.querySelectorAll(s);
  doc.createElement = tag => new Element(tag, doc);
  doc.addEventListener = (name, callback) => (listeners.document[name] ||= []).push(callback);
  doc.dispatchEvent = event => {for(const fn of listeners.document[event.type] || [])fn(event);return !event.defaultPrevented;};
  let time = 1, run = active?.run || null, audioScene;
  class Audio {
    setVolume() {} setScene(scene) { audioScene = scene; } async setEnabled(value) { return value; } sfx(kind) {calls.sounds.push(kind);}
    getTrackInfo() {return {name:audioScene?.boss?'Boss '+audioScene.bossId:'Forest',kind:audioScene?.boss?'boss':'exploration'};}
  }
  class Renderer { draw() {} burst() {} }
  const Storage = {
    load: async () => ({ok:true, active}), listOwned: () => ({ok:true, cards:[{word:'robot',zh:'機器人',rarity:'N',count:2}]}),
    consumeEntry: async (word, cards, next) => { calls.consumes++; active = {run:next, receipt:{id:'entry-1',word}}; return {ok:true,receipt:active.receipt}; },
    saveRun: async () => { calls.saves++; return {ok:true}; }, finishRun: async () => ({ok:true}), abandonRun: async () => {active = null; return {ok:true};}
  };
  const win = {
    DungeonEngine: {...Engine, createRun: (card, practice) => run = Engine.createRun(card, practice, 31)}, DungeonStorage: Storage,
    DungeonArena: {...Arena, update: (...args) => { calls.updates++; calls.lastInput={...args[2]}; return Arena.update(...args); },
      cast: (...args) => { calls.castAttempts++; return Arena.cast(...args); }, ensure: next => {run = next; return Arena.ensure(next);}},
    DungeonExplore: Explore, DungeonJoystick: Joystick, DungeonChant: Chant, DungeonIcons: Icons,
    DungeonArenaRenderer: Renderer, DungeonAudio: Audio, ENROOT_CARDS: [{word:'robot',zh:'機器人',rarity:'N'}],
    addEventListener: (name, callback) => (listeners.window[name] ||= []).push(callback)
  };
  vm.runInNewContext(source, {window:win, document:doc, navigator:{}, HTMLElement:Element,
    matchMedia, performance:{now:() => time}, requestAnimationFrame: fn => frames.push(fn), console});
  await Promise.resolve(); await Promise.resolve();
  const $ = doc.getElementById;
  const dispatch = async (target, name, values = {}) => {
    const event=makeEvent(name,values);for (const fn of listeners[target][name] || []) await fn(event);return event;
  };
  const key = async (code, type = 'keydown', target = doc.activeElement) => dispatch('document', type,
    {code,key:code.startsWith('Key') ? code.slice(3).toLowerCase() : code === 'Space' ? ' ' : code,target,repeat:false});
  const tick = (seconds = .05) => { time += seconds * 1000; const frame = frames.shift(); assert.ok(frame, 'animation loop remains scheduled'); frame(time); };
  const click = async id => {
    const el = $(id); assert.ok(el, id + ' exists');
    if(['touchCast','touchInteract'].includes(id) || el.classList.contains('rune-key')) return touchTap(el);
    el.focus(); await el.onclick?.({target:el,detail:1,preventDefault(){}});
  };
  const combat = async (practice = true) => {
    await click(practice ? 'practiceRun' : 'startRun');
    const choice = run.exploration.objects.find(o => o.args[0] === 'battle');
    assert.ok(choice, 'battle door exists');
    run.exploration.player.x=choice.x;run.exploration.player.y=choice.y+50;
    await key('KeyE');tick();
    return run;
  };
  const fire = (el, type, values = {}) => {const event=makeEvent(type,{target:el,...values});el.dispatchEvent(event);return event;};
  const touchTap = (el, values = {}) => {
    const pointer={pointerId:99,pointerType:'touch',button:0,isPrimary:false,...values};
    const press=fire(el,'pointerdown',pointer);
    fire(el,'pointerup',pointer);fire(el,'click',{...pointer,detail:1});return press;
  };
  const pointer = (id, type, x = 80, y = 80) => {
    return fire($('moveJoystick'),type,{pointerId:id,pointerType:'touch',button:0,clientX:x,clientY:y});
  };
  const input = (value, options = {}) => {const el=$('spellInput');el.value=value;return fire(el,'input',{inputType:'insertText',...options});};
  const resize = async (width, coarse = media.coarse) => {
    media.width=width;media.coarse=coarse;
    for(const query of mediaQueries.values()){
      const matches=matchesMedia(query.media);
      if(matches!==query.matches){query.matches=matches;for(const listener of query.listeners)await listener({matches,media:query.media});}
    }
    await dispatch('window','resize');
  };
  return {$,doc,calls,click,combat,key,tick,pointer,dispatch,fire,touchTap,input,resize,get run(){return run;},get audioScene(){return audioScene;}};
}

(async () => {
  const h = await harness();
  assert.equal(h.$('soundButton').querySelector('svg').getAttribute('data-icon'),'music');
  await h.resize(390);
  assert.ok(h.$('actionPanel').textContent.includes('拖曳左側搖桿'),'lobby help follows the current controls');
  await h.resize(1280);
  h.$('difficultySelect').value = 'story'; h.$('difficultySelect').onchange({target:h.$('difficultySelect')});
  const run = await h.combat(); assert.equal(run.difficulty, 'story'); assert.equal(h.calls.consumes, 0, 'practice never consumes cards');
  assert.equal(h.$('floorLabel').textContent,'01 / 18','new campaign length appears on the HUD');
  assert.equal(h.doc.activeElement, h.$('arena'), 'battle focuses the movement surface');
  const p = run.arena.player, startX = p.x;
  await h.key('KeyD'); h.tick(.1); assert.ok(p.x > startX, 'WASD reaches arena update');
  await h.key('KeyD','keyup'); h.tick(.1); const stopX = p.x; h.tick(.1); assert.equal(p.x, stopX, 'released key does not stick');
  await h.key('KeyW'); await h.key('KeyD'); await h.key('Space'); h.tick(.05);
  assert.equal(run.arena.dashes, 1); assert.ok(p.dashX > 0 && p.dashY < 0, 'dash follows diagonal movement');
  await h.key('KeyW','keyup'); await h.key('KeyD','keyup'); await h.key('Space','keyup');
  for(let i=0;i<5;i++) h.tick(.05);

  await h.click('chantButton');
  assert.equal(h.$('spellInput').readOnly, false, 'chant button opens the editor without recursive focus');
  assert.equal(h.$('chantQte').hidden,false,'chant button reveals the battlefield letter prompt');
  assert.equal(h.$('inlineQte').hidden,false,'the input-adjacent mobile prompt is available while chanting');
  assert.ok(h.doc.body.classList.contains('chanting-mode'),'mobile layout can make room for the keyboard');
  assert.equal(h.$('qteNext').textContent,run.spell.word[0],'the first key to type is shown');
  assert.equal(h.doc.activeElement,h.$('spellInput'),'chant starts with the typing field focused');
  const focusEnergy = p.focusEnergy, chantX = p.x, chantY = p.y;
  await h.key('KeyA'); h.tick(.1); assert.equal(p.x, chantX); assert.equal(p.y, chantY); assert.ok(p.focusEnergy < focusEnergy, 'typing slows world and drains focus');
  await h.key('Escape'); assert.equal(h.$('spellInput').readOnly, true); assert.equal(h.doc.activeElement, h.$('arena'));
  assert.equal(h.$('chantQte').hidden,true,'returning to movement hides the prompt');
  assert.equal(h.$('inlineQte').hidden,true);assert.equal(h.doc.body.classList.contains('chanting-mode'),false);
  await h.key('Enter'); assert.equal(h.$('spellInput').readOnly, false);
  const word=run.spell.word;
  h.input(word[0]);
  assert.equal(h.$('qteNext').textContent,word[1]);
  assert.equal(h.$('qteProgressText').textContent,'1 / '+word.length);
  assert.ok(h.$('qteLetters').children[0].classList.contains('correct'),'typed correct letter lights up');
  assert.ok(h.$('chantQte').classList.contains('qte-hit'),'correct input has immediate feedback');
  const badLetter=word[1]==='x'?'z':'x';h.input(word[0]+badLetter);
  assert.equal(h.$('chantQte').dataset.state,'wrong');
  assert.equal(h.$('spellInput').getAttribute('aria-invalid'),'true');
  assert.ok(h.$('qteLetters').children[1].classList.contains('wrong'),'incorrect letter is visibly marked');
  assert.ok(h.$('inlineQteLetters').children[1].classList.contains('wrong'),'mobile letters mirror the error state');
  assert.equal(h.$('inlineQteHint').textContent,h.$('qteHint').textContent,'mobile correction guidance stays synchronized');
  assert.ok(h.$('chantQte').classList.contains('qte-miss'));
  assert.equal(h.$('qteNext').textContent,word[1],'typo still displays the required letter');
  h.input(word[0],{inputType:'deleteContentBackward'});
  assert.equal(h.$('chantQte').dataset.state,'typing');
  assert.equal(h.$('spellInput').getAttribute('aria-invalid'),'false');
  assert.match(h.$('qteHint').textContent,/已修正/,'backspace gives correction feedback');
  for(let count=2;count<=word.length;count++) {
    h.input(word.slice(0,count));
    assert.equal(h.$('qteProgressText').textContent,count+' / '+word.length,'each typed letter advances progress');
    assert.equal(h.$('qteNext').textContent,count===word.length?'↵':word[count]);
    assert.ok(h.$('qteLetters').children.slice(0,count).every(letter=>letter.classList.contains('correct')));
    assert.equal(h.$('inlineQteLetters').textContent,h.$('qteLetters').textContent);
  }
  h.input(word+'x',{inputType:'insertFromPaste'});
  assert.equal(h.$('chantQte').dataset.state,'wrong');
  assert.equal(h.$('qteNext').textContent,'⌫');assert.match(h.$('qteHint').textContent,/多出/);
  assert.equal(h.$('qteLetters').children.at(-1).textContent,'+1','extra pasted letters are called out');
  h.input(word,{inputType:'deleteContentBackward'});
  assert.equal(h.$('chantQte').dataset.state,'ready');assert.equal(h.$('qteNext').textContent,'↵');
  assert.ok(h.$('inlineQte').classList.contains('qte-ready'),'mobile prompt also shows the completed spell');
  assert.equal(h.$('qteProgress').style.width,'100%');assert.match(h.$('qteHint').textContent,/完成/);
  const editor=h.$('spellInput');h.tick(.1);h.tick(.1);
  assert.equal(h.$('spellInput'),editor);assert.equal(editor.value,word,'animation frames retain the current typed spell');
  h.input('');
  h.fire(editor,'compositionstart');h.input('ㄅ',{isComposing:true});
  assert.equal(h.$('chantQte').dataset.state,'typing','unfinished composition does not emit a spelling error');
  assert.equal(editor.getAttribute('aria-invalid'),'false');
  h.fire(editor,'compositionend');
  assert.equal(h.$('chantQte').dataset.state,'wrong','completed composition is checked once it becomes input');
  p.focusEnergy=.05;h.tick(.1);
  assert.equal(p.focusEnergy,0);assert.match(h.$('qteTime').textContent,/專注耗盡/);
  assert.equal(h.$('inlineQteTime').textContent,h.$('qteTime').textContent,'focus exhaustion remains visible next to the mobile editor');
  assert.ok(h.$('chantQte').classList.contains('exhausted'),'the prompt warns that enemies have regained normal speed');
  p.focusEnergy=100;
  h.$('spellInput').value = 'invalidspell'; h.$('spellForm').onsubmit({preventDefault(){}});
  assert.equal(h.$('spellInput').readOnly, false); assert.equal(h.$('spellInput').value, 'invalidspell', 'typo preserves correction mode');
  p.x = 580; p.y = 280; h.$('spellInput').value = run.spell.word; h.$('spellForm').onsubmit({preventDefault(){}});
  assert.equal(run.arena.casts, 1); assert.equal(h.$('spellInput').readOnly, true); assert.equal(h.doc.activeElement, h.$('arena'), 'successful cast returns to movement');
  assert.equal(h.$('chantQte').hidden,true);assert.equal(h.$('castFeedback').hidden,false);
  assert.equal(h.$('inlineQte').hidden,true);assert.equal(h.doc.body.classList.contains('chanting-mode'),false);
  assert.match(h.$('castFeedback').textContent,/施法/,'a successful cast flashes feedback on the battlefield');

  await h.key('Enter'); await h.dispatch('window','blur');
  assert.equal(h.$('pauseOverlay').hidden, false); assert.equal(h.$('spellInput').readOnly, true, 'blur cancels chant cleanly');
  const updates = h.calls.updates; h.tick(.1); assert.equal(h.calls.updates, updates, 'paused frames do not run combat');
  await h.click('resumeButton'); assert.equal(h.$('spellInput').readOnly, true); assert.equal(h.$('spellInput').disabled, false);
  const resumedX = p.x; h.tick(.1); assert.equal(p.x, resumedX, 'resume has no stale keyboard movement');
  assert.equal(h.audioScene.paused, false);

  await h.click('soundButton'); assert.equal(h.doc.activeElement, h.$('arena'), 'music toggle returns keyboard movement focus');
  h.$('musicVolume').focus(); h.$('musicVolume').onchange?.({target:h.$('musicVolume')});
  assert.equal(h.doc.activeElement, h.$('arena'), 'completed volume adjustment returns keyboard movement focus');

  p.x=480;p.y=435;p.dashTime=0;
  const stick=h.$('moveJoystick');
  assert.equal(h.pointer(11,'pointerdown').defaultPrevented,true,'joystick owns the touch gesture');
  assert.equal(stick.hasPointerCapture(11),true);
  h.pointer(11,'pointermove',55,40);const stickStart={x:p.x,y:p.y};h.tick(.05);
  assert.ok(p.x<stickStart.x && p.y<stickStart.y,'dragging left and up moves continuously in that direction');
  assert.ok(h.calls.lastInput.x<0 && h.calls.lastInput.y<0 && Math.hypot(h.calls.lastInput.x,h.calls.lastInput.y)<1,'partial drag preserves analog strength');
  assert.ok(Math.abs(h.calls.lastInput.x/h.calls.lastInput.y-25/40)<1e-8,'drag angle is not limited to eight directions');
  const heldVector={x:stick.dataset.x,y:stick.dataset.y};
  h.pointer(12,'pointerdown',140,140);h.pointer(12,'pointermove',145,145);h.pointer(12,'pointerup');
  assert.deepEqual({x:stick.dataset.x,y:stick.dataset.y},heldVector,'a second finger cannot steal or release the movement pointer');
  p.dashCooldown = 0; p.dashTime = 0;
  assert.equal(h.fire(h.$('touchDash'),'pointerdown',{pointerId:12,pointerType:'touch',button:0}).defaultPrevented,true);
  h.tick(.05);
  assert.ok(p.dashX < 0 && p.dashY < 0, 'touch dash preserves held direction');
  assert.equal(stick.hasPointerCapture(11),true,'dash button leaves the movement finger captured');
  await h.click('touchDash');h.tick(.05);assert.equal(h.calls.lastInput.dash,false,'synthetic click following pointerdown does not queue a second dash');
  h.pointer(11,'pointercancel');assert.equal(stick.hasPointerCapture(11),false);
  for(let i=0;i<6;i++) h.tick(.05);
  const touchStop = {x:p.x,y:p.y}; h.tick(.1); assert.equal(p.x,touchStop.x); assert.equal(p.y,touchStop.y, 'pointer cancellation releases movement');
  h.pointer(13,'pointerdown',120,80);h.tick(.05);h.pointer(13,'lostpointercapture');
  const lostStop={x:p.x,y:p.y};h.tick(.1);assert.equal(p.x,lostStop.x);assert.equal(p.y,lostStop.y,'lost capture releases movement');
  assert.equal(stick.style.getPropertyValue('--stick-x'),'0px','released thumb returns to its center');
  h.pointer(14,'pointerdown',120,80);h.tick(.05);await h.click('pauseButton');
  assert.equal(stick.hasPointerCapture(14),false,'pause resets the active gesture');
  const pausedAt={x:p.x,y:p.y};h.pointer(15,'pointerdown',120,80);h.tick(.1);
  assert.equal(stick.hasPointerCapture(15),false,'paused control cannot begin a gesture');
  await h.click('resumeButton');h.pointer(14,'pointermove',140,80);h.tick(.1);
  assert.equal(p.x,pausedAt.x);assert.equal(p.y,pausedAt.y,'resuming cannot revive an old drag');
  await h.click('chantButton');h.pointer(16,'pointerdown',110,80);h.tick(.05);
  assert.equal(h.$('chantQte').hidden,true);assert.equal(h.$('spellInput').readOnly,true,'moving the joystick exits chant mode');
  h.pointer(16,'pointerup');
  for(const type of ['contextmenu','selectstart','dragstart']) {
    assert.equal(h.fire(stick,type).defaultPrevented,true,type+' is suppressed on the joystick');
    assert.equal(h.fire(h.$('touchDash'),type).defaultPrevented,true,type+' is suppressed on a game control');
    assert.equal(h.fire(h.$('arena'),type).defaultPrevented,true,type+' is suppressed on the battlefield');
    assert.equal(h.fire(h.$('spellInput'),type).defaultPrevented,false,type+' remains available inside the spell editor');
    assert.equal(h.fire(h.$('helpButton'),type).defaultPrevented,false,type+' is not suppressed outside the game surface');
  }
  await h.key('Enter'); h.doc.hidden = true; await h.dispatch('document','visibilitychange');
  assert.equal(h.$('spellInput').readOnly,true); assert.equal(h.audioScene.paused,true, 'hidden tab pauses both input and music');

  function quietCombat(next) {
    next.enemy.intent.remaining=10000;
    next.arena.enemies.forEach(enemy=>{enemy.cooldown=10000;});
  }
  function nearEnemy(next) {
    const target=next.arena.enemies.find(enemy=>enemy.active && enemy.hp>0);
    assert.ok(target,'fixture retains a live target');
    next.arena.player.x=target.x;next.arena.player.y=target.y+60;
  }
  const quick=await harness(null,{width:390});
  assert.equal(quick.$('quickPotion').hidden,true,'lobby hides adventure healing');
  const quickRun=await quick.combat();quietCombat(quickRun);
  const potion=quickRun.inventory.find(item=>item.id==='potion');potion.count=3;
  quickRun.player.hp=quickRun.player.maxHp;quick.tick(.1);
  assert.equal(quick.$('quickPotion').disabled,true,'full health preserves potions');
  quick.touchTap(quick.$('quickPotion'));assert.equal(potion.count,3);
  quickRun.player.hp=1;quick.tick(.1);
  assert.equal(quick.$('quickPotion').disabled,false);
  assert.ok(quick.$('quickPotion').classList.contains('needed'),'critical health highlights available healing');
  quick.pointer(71,'pointerdown',120,80);await quick.click('touchCast');
  const firstChunk=Chant.touchSequence(quickRun.spell.word)[0];
  quick.touchTap(quick.$('touchRuneKeys').querySelector('[data-rune="'+firstChunk+'"]'));
  const prefix=quick.$('spellInput').value;
  quick.touchTap(quick.$('quickPotion'));
  assert.equal(quickRun.player.hp,39,'one touch heals exactly once including compatibility click');
  assert.equal(potion.count,2);assert.equal(quick.$('quickPotionCount').textContent,'×2');
  assert.equal(quick.$('spellInput').value,prefix,'healing keeps the entered spell prefix');
  assert.ok(quick.doc.body.classList.contains('chanting-mode'),'healing keeps chanting active');
  assert.ok(quick.$('moveJoystick').hasPointerCapture(71),'healing keeps the movement finger');
  const letters=quick.$('touchSpellName').children[0];quick.tick(.1);
  assert.equal(quick.$('touchSpellName').children[0],letters,'idle HUD ticks preserve spell letter nodes');
  assert.ok(quick.calls.lastInput.x>0,'movement continues after healing');
  quick.pointer(71,'pointercancel');await quick.click('pauseButton');
  assert.equal(quick.$('quickPotion').disabled,true);quick.touchTap(quick.$('quickPotion'));assert.equal(potion.count,2,'paused input cannot consume healing');
  await quick.click('resumeButton');quick.fire(quick.$('quickPotion'),'click',{detail:0});
  assert.equal(potion.count,1,'keyboard activation heals once');
  potion.count=0;quick.tick(.1);quick.touchTap(quick.$('quickPotion'));
  assert.equal(potion.count,0);assert.equal(quick.$('quickPotion').disabled,true,'empty stock disables healing');
  quickRun.spell={word:'cocoon',zh:'重複符文',type:'attack',power:5};quick.input('');quick.tick(.1);await quick.click('touchCast');
  const repeatedRune=quick.$('touchRuneKeys').querySelector('[data-rune="co"]');quick.touchTap(repeatedRune);
  assert.equal(quick.$('spellInput').value,'co');
  assert.ok(repeatedRune.classList.contains('next'),'a repeated chunk remains the next target');
  assert.equal(repeatedRune.classList.contains('entered'),false,'completed styling cannot override the next target');
  const repeatLetter=quick.$('touchSpellName').children[0];quickRun.arena.player.focusEnergy=0;quick.tick(.1);
  assert.match(quick.$('touchChantHint').textContent,/專注耗盡/,'dynamic focus guidance still refreshes without text input');
  assert.equal(quick.$('touchSpellName').children[0],repeatLetter);
  function touchSequence(ui, word) {
    let lastButton, prefix='';
    for(const chunk of Chant.touchSequence(word)) {
      const button=ui.$('touchRuneKeys').querySelectorAll('[data-rune]').find(button=>button.dataset.rune===chunk);
      assert.ok(button,'every required rune chunk is offered');
      assert.equal(button.disabled,false,'required rune is enabled during chanting');
      const pointer={pointerId:91,pointerType:'touch',button:0,isPrimary:false};
      const attempts=ui.calls.castAttempts;
      assert.equal(ui.fire(button,'pointerdown',pointer).defaultPrevented,true,'a non-primary rune pointer owns its press');
      prefix+=chunk;
      if(prefix!==word)assert.equal(ui.$('spellInput').value,prefix,'the second finger enters a chunk before pointerup or click');
      else assert.equal(ui.calls.castAttempts,attempts+1,'the final press attempts its one automatic cast immediately');
      const afterPress={text:ui.$('spellInput').value,attempts:ui.calls.castAttempts,casts:ui.run.arena.casts,chant:ui.doc.body.classList.contains('chanting-mode')};
      ui.fire(button,'pointerup',pointer);ui.fire(button,'click',{...pointer,detail:1});
      assert.deepEqual({text:ui.$('spellInput').value,attempts:ui.calls.castAttempts,casts:ui.run.arena.casts,chant:ui.doc.body.classList.contains('chanting-mode')},afterPress,'each compatibility click is ignored without duplicating rune progress');
      lastButton=button;
    }
    return lastButton;
  }
  const mobile=await harness(null,{width:390});const mobileRun=await mobile.combat();quietCombat(mobileRun);
  assert.ok(mobile.$('touchSpellIcon').querySelector('svg'),'mobile spell has an original glyph');
  assert.equal(mobile.$('touchCast').querySelector('svg').getAttribute('aria-hidden'),'true','glyph does not duplicate the control name');
  assert.ok(mobile.doc.body.classList.contains('touch-layout'),'narrow screens select the touch layout');
  assert.equal(mobile.$('spellInput').readOnly,true,'mobile never exposes an editable system-keyboard field');
  assert.equal(mobile.$('touchControls').closest('.arena'),null,'the touch controls are outside the battlefield');
  assert.equal(mobile.$('touchRuneKeys').closest('#touchControls'),mobile.$('touchControls'));
  assert.equal(mobile.$('touchSpellName').textContent,mobileRun.spell.word,'the full English word remains visible');
  assert.ok(mobile.$('touchSpellMeaning').textContent.includes(mobileRun.spell.zh),'translation remains available to learn');
  const mobilePlayer=mobileRun.arena.player;
  mobile.pointer(31,'pointerdown',120,80);mobile.tick(.05);
  const mobileStick=mobile.$('moveJoystick');assert.equal(mobileStick.hasPointerCapture(31),true);
  const chantPointer={pointerId:90,pointerType:'touch',button:0,isPrimary:false};
  const chantPress=mobile.fire(mobile.$('touchCast'),'pointerdown',chantPointer);assert.equal(chantPress.defaultPrevented,true);
  assert.ok(mobile.doc.body.classList.contains('chanting-mode'),'a non-primary second finger starts chanting before click');
  mobile.fire(mobile.$('touchCast'),'pointerup',chantPointer);mobile.fire(mobile.$('touchCast'),'click',{...chantPointer,detail:1});
  assert.ok(mobile.doc.body.classList.contains('chanting-mode'),'the compatibility click cannot toggle chanting back off');
  assert.equal(mobile.$('spellInput').readOnly,true);assert.notEqual(mobile.doc.activeElement,mobile.$('spellInput'));
  assert.equal(mobile.$('spellInput').focusCount,0,'touch chanting never attempts to focus the editor');
  assert.equal(mobile.$('chantQte').hidden,true,'mobile chanting does not cover the battlefield with a QTE');
  assert.equal(mobile.$('touchControls').hidden,false,'the thumb controls remain present while chanting');
  assert.equal(mobileStick.hasPointerCapture(31),true,'chanting preserves the left movement finger');
  const chantAt={x:mobilePlayer.x,y:mobilePlayer.y,energy:mobilePlayer.focusEnergy};mobile.tick(.1);
  assert.equal(mobilePlayer.x,chantAt.x);assert.equal(mobilePlayer.y,chantAt.y,'focus freezes locomotion while the held gesture remains captured');
  assert.ok(mobilePlayer.focusEnergy<chantAt.energy);
  const mobileWord=mobileRun.spell.word, chunks=Chant.touchSequence(mobileWord);
  const wrongRune=mobile.$('touchRuneKeys').querySelectorAll('[data-rune]').find(button=>button.dataset.rune!==chunks[0]);
  assert.ok(wrongRune,'fixture has a wrong rune choice');
  const hpBeforeWrong=mobileRun.player.hp,mistakesBeforeWrong=mobileRun.stats.mistakes;
  mobile.touchTap(wrongRune);
  assert.equal(mobile.$('spellInput').value,'','wrong mobile choices do not append invalid text');
  assert.equal(mobileRun.player.hp,hpBeforeWrong);assert.equal(mobileRun.stats.mistakes,mistakesBeforeWrong);
  assert.equal(mobile.calls.castAttempts,0,'a wrong chunk never submits a damaging incorrect spell');
  assert.ok(mobile.$('touchChantHint').textContent.includes('點亮起的符文'));
  nearEnemy(mobileRun);
  const firstOldRune=mobile.$('touchRuneKeys').querySelectorAll('[data-rune]')[0];
  const finalOldRune=touchSequence(mobile,mobileWord);
  assert.equal(mobileRun.arena.casts,1,'completing the mobile sequence auto-casts');
  assert.equal(mobile.calls.castAttempts,1,'one complete sequence sends exactly one cast');
  assert.equal(mobile.doc.body.classList.contains('chanting-mode'),false,'success immediately restores movement');
  assert.equal(mobile.$('spellInput').value,'','the next spell starts with an empty buffer');
  assert.equal(mobile.$('spellInput').readOnly,true);assert.equal(mobile.$('spellInput').focusCount,0);
  assert.equal(mobileStick.hasPointerCapture(31),true,'successful casting preserves the still-held movement finger');
  const afterAutoCastX=mobilePlayer.x;mobile.tick(.05);
  assert.ok(mobilePlayer.x>afterAutoCastX,'the held direction resumes without lifting and dragging again');
  mobile.touchTap(finalOldRune);
  assert.equal(mobile.calls.castAttempts,1,'a trailing click cannot cast the next spell');
  await mobile.click('touchCast');mobile.touchTap(firstOldRune);
  assert.equal(mobile.$('spellInput').value,'','old rune elements cannot enter text into a newly started spell');
  assert.equal(mobile.calls.castAttempts,1);
  mobile.pointer(31,'pointercancel');assert.equal(mobileStick.hasPointerCapture(31),false);
  mobile.tick(.05);assert.equal(mobile.calls.lastInput.x,0,'cancelled touch pointers leave no stale direction');

  mobile.pointer(32,'pointerdown',40,80);await mobile.click('touchCast');
  mobilePlayer.dashCooldown=0;mobilePlayer.dashTime=0;
  const dashesBeforeTouch=mobileRun.arena.dashes;
  const dashPress=mobile.fire(mobile.$('touchDash'),'pointerdown',{pointerId:33,pointerType:'touch',button:0});
  assert.equal(dashPress.defaultPrevented,true);
  assert.equal(mobile.doc.body.classList.contains('chanting-mode'),false,'touch dash cancels chanting on press');
  mobile.tick(.05);
  assert.equal(mobileRun.arena.dashes,dashesBeforeTouch+1,'second finger dashes before its pointerup or click');
  assert.ok(mobilePlayer.dashX<0,'dash keeps the left thumb direction');
  assert.equal(mobileStick.hasPointerCapture(32),true,'the dash finger cannot release the movement finger');
  mobile.fire(mobile.$('touchDash'),'pointerup',{pointerId:33,pointerType:'touch',button:0});
  mobile.fire(mobile.$('touchDash'),'click',{detail:1});mobile.tick(.05);
  assert.equal(mobile.calls.lastInput.dash,false,'the compatibility click does not repeat the press action');
  mobile.pointer(32,'pointercancel');
  for(let i=0;i<6;i++)mobile.tick(.05);
  mobilePlayer.dashCooldown=0;mobilePlayer.dashTime=0;
  mobile.fire(mobile.$('touchDash'),'click',{detail:0});mobile.tick(.05);
  assert.equal(mobileRun.arena.dashes,dashesBeforeTouch+2,'keyboard-generated activation still triggers dash');
  for(let i=0;i<6;i++)mobile.tick(.05);

  mobile.pointer(34,'pointerdown',120,80);await mobile.click('touchCast');await mobile.click('pauseButton');
  assert.equal(mobileStick.hasPointerCapture(34),false,'pause clears capture even during a mobile chant');
  assert.equal(mobile.$('touchControls').inert,true);
  const pausedMobile=mobile.calls.castAttempts;
  mobile.touchTap(mobile.$('touchRuneKeys').querySelectorAll('[data-rune]')[0]);
  assert.equal(mobile.calls.castAttempts,pausedMobile,'paused rune events cannot submit spells');
  await mobile.click('resumeButton');mobile.tick(.05);assert.equal(mobile.calls.lastInput.x,0);
  mobile.pointer(35,'pointerdown',120,80);await mobile.resize(430);
  assert.equal(mobileStick.hasPointerCapture(35),false,'resizing within the mobile breakpoint clears old joystick geometry');
  mobile.tick(.05);assert.equal(mobile.calls.lastInput.x,0);
  mobile.pointer(36,'pointerdown',120,80);await mobile.resize(1024,false);
  assert.equal(mobileStick.hasPointerCapture(36),false,'changing to desktop releases mobile pointer capture');
  assert.equal(mobile.doc.body.classList.contains('touch-layout'),false);
  await mobile.click('chantButton');assert.equal(mobile.$('spellInput').readOnly,false,'desktop editor becomes usable after a layout change');
  assert.equal(mobile.doc.activeElement,mobile.$('spellInput'));
  await mobile.resize(390,false);
  assert.equal(mobile.$('spellInput').readOnly,true);assert.notEqual(mobile.doc.activeElement,mobile.$('spellInput'));
  assert.equal(mobile.doc.body.classList.contains('chanting-mode'),false,'layout changes cancel a pending chant');
  const tablet=await harness(null,{width:1100,coarse:true});
  assert.ok(tablet.doc.body.classList.contains('touch-layout'),'wide touch devices also receive the thumb layout');

  const keyboardTouch=await harness(null,{width:390});const keyboardTouchRun=await keyboardTouch.combat();quietCombat(keyboardTouchRun);nearEnemy(keyboardTouchRun);
  keyboardTouch.fire(keyboardTouch.$('touchCast'),'click',{detail:0});
  assert.ok(keyboardTouch.doc.body.classList.contains('chanting-mode'),'keyboard activation can open the touch chant controls');
  const keyboardWord=keyboardTouchRun.spell.word;
  let keyboardPrefix='';
  for(const chunk of Chant.touchSequence(keyboardWord)){
    const button=keyboardTouch.$('touchRuneKeys').querySelectorAll('[data-rune]').find(button=>button.dataset.rune===chunk);
    keyboardTouch.fire(button,'click',{detail:0});keyboardPrefix+=chunk;
    if(keyboardPrefix!==keyboardWord)assert.equal(keyboardTouch.$('spellInput').value,keyboardPrefix,'keyboard-generated clicks enter rune chunks');
  }
  assert.equal(keyboardTouchRun.arena.casts,1);assert.equal(keyboardTouch.calls.castAttempts,1,'keyboard rune completion still auto-casts once');

  for(const activation of ['pointer','keyboard']){
    const touchRoute=await harness(null,{width:390});await touchRoute.click('practiceRun');
    const door=touchRoute.run.exploration.objects.find(object=>object.args[0]==='battle');
    touchRoute.run.exploration.player.x=door.x;touchRoute.run.exploration.player.y=door.y+50;touchRoute.tick(.1);
    assert.equal(touchRoute.$('touchInteract').disabled,false);
    if(activation==='pointer'){
      const secondFinger={pointerId:92,pointerType:'touch',button:0,isPrimary:false};
      assert.equal(touchRoute.fire(touchRoute.$('touchInteract'),'pointerdown',secondFinger).defaultPrevented,true);
      assert.equal(touchRoute.run.status,'combat','a non-primary interaction press enters the nearby room immediately');
      touchRoute.fire(touchRoute.$('touchInteract'),'click',{...secondFinger,detail:1});
    }else touchRoute.fire(touchRoute.$('touchInteract'),'click',{detail:0});
    assert.equal(touchRoute.run.status,'combat',activation+' interaction enters exactly one room');
    assert.equal(touchRoute.run.encounter,0);
  }

  for(const reason of ['range','wave']) {
    const retry=await harness(null,{width:390,coarse:true});const next=await retry.combat();quietCombat(next);
    const readyWord=next.spell.word;
    next.arena.player.x=52;next.arena.player.y=70;
    next.arena.enemies.forEach(enemy=>{enemy.x=850;enemy.y=430;if(reason==='wave'){enemy.active=false;enemy.spawnAt=10000;}});
    await retry.click('touchCast');const staleRune=touchSequence(retry,readyWord);
    assert.equal(next.arena.casts,0,reason+' fixture correctly rejects the first attempt');
    assert.equal(retry.calls.castAttempts,1);
    assert.equal(retry.$('spellInput').value,readyWord,reason+' failure preserves the fully prepared word');
    assert.equal(retry.doc.body.classList.contains('chanting-mode'),false,reason+' failure returns to movement');
    assert.equal(retry.$('touchCast').textContent,'施放已備咒語');
    retry.touchTap(staleRune);
    for(let i=0;i<4;i++)retry.tick(.05);
    assert.equal(retry.calls.castAttempts,1,'ready spells do not retry automatically each frame or from stale rune clicks');
    next.arena.enemies[0].active=true;next.arena.enemies[0].spawnAt=0;nearEnemy(next);
    await retry.click('touchCast');
    assert.equal(next.arena.casts,1,reason+' prepared word can be retried without retyping');
    assert.equal(retry.calls.castAttempts,2);assert.equal(retry.$('spellInput').value,'');
  }

  const walking=await harness();await walking.click('practiceRun');walking.tick(.1);
  assert.equal(walking.$('interactButton').disabled,true,'remote route selection is unavailable');
  await walking.key('KeyE');assert.equal(walking.run.status,'route');
  await walking.key('KeyW');for(let i=0;i<11;i++)walking.tick(.1);await walking.key('KeyW','keyup');
  assert.ok(walking.run.exploration.player.y<260,'exploration uses the real movement loop');
  assert.equal(walking.$('interactButton').disabled,false,'walking into range enables interaction');
  const walkY=walking.run.exploration.player.y;await walking.dispatch('window','blur');walking.tick(.1);
  assert.equal(walking.run.exploration.player.y,walkY,'exploration pauses on blur');
  await walking.click('resumeButton');assert.equal(walking.doc.activeElement,walking.$('arena'));
  await walking.click('interactButton');assert.notEqual(walking.run.status,'route','nearby portal enters its room');

  function encounter(id){
    const next=Engine.createRun({word:'robot',zh:'機器人',rarity:'N'},false,31);
    next.routes=[{id:id==='merchant'?'shop':'npc-'+id,type:id==='merchant'?'shop':'npc',npcId:id,name:id}];
    Engine.chooseRoute(next,next.routes[0].id);
    return {run:next,receipt:{id:'npc-entry',word:'robot'},finished:false};
  }
  const merchant=await harness(encounter('merchant'));await merchant.click('continueRun');merchant.tick(.1);
  assert.equal(merchant.$('npcChallengeForm'),null,'merchant controls stay hidden until approaching');
  const mp=merchant.run.exploration.player;mp.x=440;mp.y=270;merchant.tick(.1);
  await merchant.key('KeyE');assert.ok(merchant.$('npcChallengeForm'),'merchant conversation opens nearby');
  merchant.run.player.hp=1;merchant.tick(.1);
  const merchantPotions=merchant.run.inventory.find(item=>item.id==='potion');
  const beforeConversationPotion=merchantPotions.count;
  assert.equal(merchant.$('quickPotion').disabled,true);merchant.touchTap(merchant.$('quickPotion'));
  assert.equal(merchantPotions.count,beforeConversationPotion,'conversation blocks quick healing');
  merchant.run.player.hp=merchant.run.player.maxHp;
  assert.equal(merchant.fire(merchant.$('npcChallengeInput'),'contextmenu').defaultPrevented,false,'NPC challenge input keeps the native editing menu');
  const stayY=mp.y;await merchant.key('KeyW');merchant.tick(.1);assert.equal(mp.y,stayY,'conversation freezes movement');
  merchant.$('npcChallengeInput').focus();merchant.$('npcChallengeInput').value='wrong';
  merchant.$('npcChallengeForm').onsubmit({preventDefault(){}});assert.equal(merchant.run.status,'shop');
  merchant.tick(.1);assert.equal(merchant.$('npcChallengeInput').value,'wrong','typo remains editable between frames');
  merchant.$('npcChallengeInput').value='debt';merchant.$('npcChallengeForm').onsubmit({preventDefault(){}});
  assert.equal(merchant.run.status,'combat');assert.equal(merchant.run.enemy.npcId,'merchant');
  assert.equal(merchant.doc.activeElement,merchant.$('arena'),'typed NPC challenge returns control to battle');
  assert.equal(merchant.audioScene.bossId,'merchant','NPC identity selects an independent score');
  assert.equal(merchant.$('bossName').textContent,Engine.NPCS.merchant.name);
  assert.equal(merchant.$('bossHealthBar').style.width,'100%');
  await merchant.click('soundButton');
  Engine.damageEnemy(merchant.run,Math.ceil(merchant.run.enemy.maxHp*.51),1);merchant.tick(.1);
  assert.equal(merchant.audioScene.phase,2);assert.equal(merchant.$('bossBanner').dataset.phase,'2');
  assert.ok(merchant.$('trackCaption').textContent.includes('狂怒變奏'));
  assert.equal(merchant.calls.sounds.filter(s=>s==='bossPhase').length,1);
  merchant.tick(.1);assert.equal(merchant.calls.sounds.filter(s=>s==='bossPhase').length,1,'phase cue fires once');

  const helper=await harness(encounter('healer'));await helper.click('continueRun');helper.tick(.1);
  helper.run.player.hp=30;helper.run.exploration.player.x=440;helper.run.exploration.player.y=270;helper.tick(.1);
  await helper.key('KeyE');await helper.$('actionPanel').querySelector('[data-action="helpNpc"]').onclick();
  assert.ok(helper.run.player.hp>30);assert.equal(helper.run.npc.helped,true);assert.equal(helper.$('npcChallengeForm'),null);
  await helper.key('Escape');assert.equal(helper.run.exploration.dialogId,null);assert.equal(helper.$('pauseOverlay').hidden,true);
  helper.run.exploration.player.x=795;helper.run.exploration.player.y=400;helper.tick(.1);await helper.key('KeyE');
  assert.equal(helper.run.status,'route');assert.equal(helper.run.encounter,1,'walking to NPC exit advances exactly one node');

  for(const npcId of ['lantern','echo','sentinel']){
    const ally=await harness(encounter(npcId));await ally.click('continueRun');
    ally.run.exploration.player.x=440;ally.run.exploration.player.y=270;ally.tick(.1);await ally.key('KeyE');
    assert.equal(ally.$('actionPanel').querySelector('[data-action="helpNpc"]').textContent,'邀請同行');
    await ally.$('actionPanel').querySelector('[data-action="helpNpc"]').onclick();
    assert.equal(ally.run.companions[0].id,npcId);
    assert.equal(ally.$('partyStrip').hidden,false);assert.ok(ally.$('partyStrip').textContent.includes(Engine.NPCS[npcId].name.split('・').pop()));
    assert.equal(ally.$('npcChallengeForm'),null,'recruiting commits to a peaceful encounter');
    await ally.key('Escape');
    ally.run.exploration.player.x=795;ally.run.exploration.player.y=400;ally.tick(.1);await ally.key('KeyE');
    const snapshot=JSON.parse(JSON.stringify({run:ally.run,receipt:{id:'ally-entry',word:'robot'}}));
    const restored=await harness(snapshot);await restored.click('continueRun');
    assert.equal(restored.calls.consumes,0);assert.equal(restored.run.companions[0].id,npcId);
    assert.equal(restored.run.exploration.companions[0].npcId,npcId,'companion actor reappears after resume');
  }

  const formal = await harness(); const formalRun = await formal.combat(false);
  assert.equal(formal.calls.consumes,1,'formal admission consumes once');
  formalRun.arena.player.x = 260; formalRun.arena.player.y = 310;
  const saved = JSON.parse(JSON.stringify({run:formalRun,receipt:{id:'entry-1',word:'robot'},finished:false}));
  const resumed = await harness(saved); await resumed.click('continueRun');
  assert.equal(resumed.calls.consumes,0,'continuing an adventure never consumes again');
  assert.equal(resumed.$('pauseOverlay').hidden,false,'saved combat resumes paused');
  assert.equal(resumed.run.arena.player.x,260); assert.equal(resumed.run.arena.player.y,310);
  await resumed.click('resumeButton'); const before = resumed.run.arena.player.x;
  await resumed.key('KeyD'); resumed.tick(.1); resumed.tick(.1);
  assert.ok(resumed.run.arena.player.x > before,'resumed save accepts movement');
  const legacy=JSON.parse(JSON.stringify(saved));delete legacy.run.nodesPerRegion;delete legacy.run.companions;
  const legacyUI=await harness(legacy);await legacyUI.click('continueRun');
  assert.equal(legacyUI.$('floorLabel').textContent,'01 / 12','untagged saves keep original campaign length');
  assert.equal(legacyUI.$('partyStrip').hidden,true);
  const ending=await harness();await ending.combat();
  ending.run.player.hp=1;ending.run.arena.player.x=420;await ending.click('chantButton');
  ending.input('incorrect');await ending.$('spellForm').onsubmit({preventDefault(){}});
  assert.equal(ending.run.status,'lost');
  assert.equal(ending.$('quickPotion').hidden,true,'completed adventures hide quick healing');
  ending.doc.hidden=true;await ending.dispatch('document','visibilitychange');
  ending.doc.hidden=false;await ending.dispatch('document','visibilitychange');
  assert.equal(ending.$('pauseOverlay').hidden,true,'returning to a completed run never traps results behind an unusable pause screen');
  assert.equal(ending.$('actionPanel').inert,false);assert.ok(ending.$('returnLobby'));
  console.log('UI integration checks passed: admission, desktop QTE, mobile rune auto-casting and retries, simultaneous joystick/dash/chant, gesture cancellation and responsive layout changes, long-press guards, NPC interactions, and saved-run resume.');
})().catch(error => {console.error(error); process.exitCode = 1;});
