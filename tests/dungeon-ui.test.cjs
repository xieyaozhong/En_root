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
const source = fs.readFileSync(path.join(__dirname, '../dungeon.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../dungeon.html'), 'utf8');
const decode = s => s.replace(/&(?:amp|lt|gt|quot|#39);/g, x => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"})[x]);

class Element {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase(); this.ownerDocument = doc; this.children = []; this.parentElement = null;
    this.attrs = {}; this.dataset = {}; this.style = {}; this.value = ''; this.open = false; this.hidden = false;
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
  setPointerCapture(id) { this.pointerId = id; }
  scrollIntoView() {}
  showModal() { this.open = true; }
  close() { this.open = false; }
}

async function harness(active = null) {
  const listeners = { document: {}, window: {} }, frames = [], calls = { updates:0, consumes:0, saves:0 }, doc = {};
  const documentRoot = new Element('root', doc); documentRoot.innerHTML = html;
  doc.body = documentRoot.querySelector('body'); doc.activeElement = doc.body; doc.hidden = false;
  doc.getElementById = id => documentRoot.querySelector('#' + id);
  doc.querySelectorAll = s => documentRoot.querySelectorAll(s);
  doc.createElement = tag => new Element(tag, doc);
  doc.addEventListener = (name, callback) => (listeners.document[name] ||= []).push(callback);
  let time = 1, run = active?.run || null, audioScene;
  class Audio {
    setVolume() {} setScene(scene) { audioScene = scene; } async setEnabled(value) { return value; } sfx() {}
  }
  class Renderer { draw() {} burst() {} }
  const Storage = {
    load: async () => ({ok:true, active}), listOwned: () => ({ok:true, cards:[{word:'robot',zh:'機器人',rarity:'N',count:2}]}),
    consumeEntry: async (word, cards, next) => { calls.consumes++; active = {run:next, receipt:{id:'entry-1',word}}; return {ok:true,receipt:active.receipt}; },
    saveRun: async () => { calls.saves++; return {ok:true}; }, finishRun: async () => ({ok:true}), abandonRun: async () => {active = null; return {ok:true};}
  };
  const win = {
    DungeonEngine: {...Engine, createRun: (card, practice) => run = Engine.createRun(card, practice, 31)}, DungeonStorage: Storage,
    DungeonArena: {...Arena, update: (...args) => { calls.updates++; return Arena.update(...args); }, ensure: next => {run = next; return Arena.ensure(next);}},
    DungeonExplore: Explore, DungeonArenaRenderer: Renderer, DungeonAudio: Audio, ENROOT_CARDS: [{word:'robot',zh:'機器人',rarity:'N'}],
    addEventListener: (name, callback) => (listeners.window[name] ||= []).push(callback)
  };
  vm.runInNewContext(source, {window:win, document:doc, navigator:{}, HTMLElement:Element,
    matchMedia: () => ({matches:false}), performance:{now:() => time}, requestAnimationFrame: fn => frames.push(fn), console});
  await Promise.resolve(); await Promise.resolve();
  const $ = doc.getElementById;
  const dispatch = async (target, name, event = {}) => { for (const fn of listeners[target][name] || []) await fn(event); };
  const key = async (code, type = 'keydown', target = doc.activeElement) => dispatch('document', type,
    {code,key:code.startsWith('Key') ? code.slice(3).toLowerCase() : code === 'Space' ? ' ' : code,target,preventDefault(){},repeat:false});
  const tick = (seconds = .05) => { time += seconds * 1000; const frame = frames.shift(); assert.ok(frame, 'animation loop remains scheduled'); frame(time); };
  const click = async id => { const el = $(id); assert.ok(el, id + ' exists'); el.focus(); await el.onclick?.({target:el,detail:1,preventDefault(){}}); };
  const combat = async (practice = true) => {
    await click(practice ? 'practiceRun' : 'startRun');
    const choice = run.exploration.objects.find(o => o.args[0] === 'battle');
    assert.ok(choice, 'battle door exists');
    run.exploration.player.x=choice.x;run.exploration.player.y=choice.y+50;
    await key('KeyE');tick();
    return run;
  };
  const pointer = (direction, id, type = 'down') => {
    const el = doc.querySelectorAll('[data-move]').find(b => b.dataset.move === direction);
    el['onpointer' + type]?.({pointerId:id,preventDefault(){},target:el}); return el;
  };
  return {$,doc,calls,click,combat,key,tick,pointer,dispatch,get run(){return run;},get audioScene(){return audioScene;}};
}

(async () => {
  const h = await harness();
  h.$('difficultySelect').value = 'story'; h.$('difficultySelect').onchange({target:h.$('difficultySelect')});
  const run = await h.combat(); assert.equal(run.difficulty, 'story'); assert.equal(h.calls.consumes, 0, 'practice never consumes cards');
  assert.equal(h.doc.activeElement, h.$('arena'), 'battle focuses the movement surface');
  const p = run.arena.player, startX = p.x;
  await h.key('KeyD'); h.tick(.1); assert.ok(p.x > startX, 'WASD reaches arena update');
  await h.key('KeyD','keyup'); h.tick(.1); const stopX = p.x; h.tick(.1); assert.equal(p.x, stopX, 'released key does not stick');
  await h.key('KeyW'); await h.key('KeyD'); await h.key('Space'); h.tick(.05);
  assert.equal(run.arena.dashes, 1); assert.ok(p.dashX > 0 && p.dashY < 0, 'dash follows diagonal movement');
  await h.key('KeyW','keyup'); await h.key('KeyD','keyup'); await h.key('Space','keyup');
  for(let i=0;i<5;i++) h.tick(.05);

  h.$('spellInput').focus(); assert.equal(h.$('spellInput').readOnly, false, 'focus enters chant without recursion');
  const focusEnergy = p.focusEnergy, chantX = p.x, chantY = p.y;
  await h.key('KeyA'); h.tick(.1); assert.equal(p.x, chantX); assert.equal(p.y, chantY); assert.ok(p.focusEnergy < focusEnergy, 'typing slows world and drains focus');
  await h.key('Escape'); assert.equal(h.$('spellInput').readOnly, true); assert.equal(h.doc.activeElement, h.$('arena'));
  await h.key('Enter'); assert.equal(h.$('spellInput').readOnly, false);
  h.$('spellInput').value = 'invalidspell'; h.$('spellForm').onsubmit({preventDefault(){}});
  assert.equal(h.$('spellInput').readOnly, false); assert.equal(h.$('spellInput').value, 'invalidspell', 'typo preserves correction mode');
  p.x = 580; p.y = 280; h.$('spellInput').value = run.spell.word; h.$('spellForm').onsubmit({preventDefault(){}});
  assert.equal(run.arena.casts, 1); assert.equal(h.$('spellInput').readOnly, true); assert.equal(h.doc.activeElement, h.$('arena'), 'successful cast returns to movement');

  await h.key('Enter'); await h.dispatch('window','blur');
  assert.equal(h.$('pauseOverlay').hidden, false); assert.equal(h.$('spellInput').readOnly, true, 'blur cancels chant cleanly');
  const updates = h.calls.updates; h.tick(.1); assert.equal(h.calls.updates, updates, 'paused frames do not run combat');
  await h.click('resumeButton'); assert.equal(h.$('spellInput').readOnly, true); assert.equal(h.$('spellInput').disabled, false);
  const resumedX = p.x; h.tick(.1); assert.equal(p.x, resumedX, 'resume has no stale keyboard movement');
  assert.equal(h.audioScene.paused, false);

  await h.click('soundButton'); assert.equal(h.doc.activeElement, h.$('arena'), 'music toggle returns keyboard movement focus');
  h.$('musicVolume').focus(); h.$('musicVolume').onchange?.({target:h.$('musicVolume')});
  assert.equal(h.doc.activeElement, h.$('arena'), 'completed volume adjustment returns keyboard movement focus');

  h.pointer('left', 11); h.pointer('up', 12); h.tick(.05);
  assert.ok(p.facingX < 0 && p.facingY < 0, 'two touch pointers preserve diagonal movement');
  p.dashCooldown = 0; p.dashTime = 0;
  await h.click('touchDash'); h.tick(.05);
  assert.ok(p.dashX < 0 && p.dashY < 0, 'touch dash preserves held direction');
  h.pointer('left', 11, 'up'); h.pointer('up', 12, 'cancel');
  for(let i=0;i<6;i++) h.tick(.05);
  const touchStop = {x:p.x,y:p.y}; h.tick(.1); assert.equal(p.x,touchStop.x); assert.equal(p.y,touchStop.y, 'pointer cancellation releases movement');
  await h.key('Enter'); h.doc.hidden = true; await h.dispatch('document','visibilitychange');
  assert.equal(h.$('spellInput').readOnly,true); assert.equal(h.audioScene.paused,true, 'hidden tab pauses both input and music');

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
  const stayY=mp.y;await merchant.key('KeyW');merchant.tick(.1);assert.equal(mp.y,stayY,'conversation freezes movement');
  merchant.$('npcChallengeInput').focus();merchant.$('npcChallengeInput').value='wrong';
  merchant.$('npcChallengeForm').onsubmit({preventDefault(){}});assert.equal(merchant.run.status,'shop');
  merchant.tick(.1);assert.equal(merchant.$('npcChallengeInput').value,'wrong','typo remains editable between frames');
  merchant.$('npcChallengeInput').value='debt';merchant.$('npcChallengeForm').onsubmit({preventDefault(){}});
  assert.equal(merchant.run.status,'combat');assert.equal(merchant.run.enemy.npcId,'merchant');
  assert.equal(merchant.doc.activeElement,merchant.$('arena'),'typed NPC challenge returns control to battle');

  const helper=await harness(encounter('healer'));await helper.click('continueRun');helper.tick(.1);
  helper.run.player.hp=30;helper.run.exploration.player.x=440;helper.run.exploration.player.y=270;helper.tick(.1);
  await helper.key('KeyE');await helper.$('actionPanel').querySelector('[data-action="helpNpc"]').onclick();
  assert.ok(helper.run.player.hp>30);assert.equal(helper.run.npc.helped,true);assert.equal(helper.$('npcChallengeForm'),null);
  await helper.key('Escape');assert.equal(helper.run.exploration.dialogId,null);assert.equal(helper.$('pauseOverlay').hidden,true);
  helper.run.exploration.player.x=795;helper.run.exploration.player.y=400;helper.tick(.1);await helper.key('KeyE');
  assert.equal(helper.run.status,'route');assert.equal(helper.run.encounter,1,'walking to NPC exit advances exactly one node');

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
  console.log('UI integration checks passed: practice/formal admission, keyboard and touch movement/dash, focus/typing/casting, blur and visibility pause, audio pause, and saved-run resume.');
})().catch(error => {console.error(error); process.exitCode = 1;});
