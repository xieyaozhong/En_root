/* Word Relic 2.0: game feel, perfect chants and the Star Chart (2026-11-22).
 *
 * This module layers on top of the existing game without rewriting it:
 *   - Combat feel: damage numbers, knockback, crit hit-stop and shake, kill bursts,
 *     room-clear banner, dash afterimages, dust, low-HP heartbeat, combo badge.
 *   - Character motion: squash & stretch for the player (dash, landing, cast, hurt).
 *   - Perfect chant: a fast spell with no typo becomes a critical hit.
 *   - Star Chart (星盤): stardust earned at the end of every run buys permanent upgrades.
 *   - Run summary dialog.
 *
 * It wraps public entry points that dungeon.js already looks up at call time
 * (DungeonArena.cast / update, DungeonCombatArts.afterCast, DungeonEngine.createRun,
 * DungeonArenaRenderer.prototype.draw, the character draw functions). Saves stay
 * compatible: new run fields (feel, metaApplied, metaWardKey) are optional JSON.
 */
(function () {
  'use strict';
  const R = window.DungeonArenaRenderer, Arena = window.DungeonArena, Engine = window.DungeonEngine,
        Arts = window.DungeonCombatArts, Chant = window.DungeonChant;
  if (!R || !Arena || !Engine || !Arts) return;

  const doc = document, W = 960, H = 540;
  const $ = id => doc.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const reduced = () => reduceMQ.matches;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ------------------------------------------------------------------ *
   * Star Chart: persistent meta progression
   * ------------------------------------------------------------------ */
  const META_KEY = 'enroot_dungeon_meta_v1';
  const UPGRADES = [
    { id: 'vigor', name: '星辰體魄', icon: '✚', max: 5, cost: [40, 80, 140, 220, 320], text: l => `最大生命 +${l * 6}` },
    { id: 'ward', name: '晨星護盾', icon: '◇', max: 3, cost: [50, 110, 200], text: l => `每場戰鬥開場護盾 +${l * 5}` },
    { id: 'purse', name: '旅費錦囊', icon: '◎', max: 3, cost: [35, 80, 150], text: l => `起始金幣 +${l * 20}` },
    { id: 'tonic', name: '藥師的饋贈', icon: '⚗', max: 2, cost: [90, 220], text: l => `起始多帶 ${l} 瓶苔露藥水` },
    { id: 'intuition', name: '詠唱直覺', icon: '✧', max: 3, cost: [60, 130, 240], text: l => `完美詠唱的判定時間 +${l * 12}%` },
    { id: 'cadence', name: '致命韻律', icon: '✦', max: 3, cost: [70, 150, 270], text: l => `完美詠唱額外傷害 +${25 + l * 10}%` }
  ];
  function loadMeta() {
    let m = null;
    try { m = JSON.parse(localStorage.getItem(META_KEY)); } catch (e) {}
    if (!m || typeof m !== 'object') m = {};
    return {
      v: 1, stardust: Math.max(0, Math.floor(+m.stardust || 0)), total: Math.max(0, Math.floor(+m.total || 0)),
      runs: Math.max(0, Math.floor(+m.runs || 0)), levels: m.levels && typeof m.levels === 'object' ? m.levels : {},
      best: Object.assign({ nodes: 0, perfect: 0, combo: 0 }, m.best || {}), awarded: Array.isArray(m.awarded) ? m.awarded.slice(-30) : []
    };
  }
  let meta = loadMeta();
  function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {} }
  const lvl = id => { const u = UPGRADES.find(x => x.id === id); return u ? clamp(Math.floor(+meta.levels[id] || 0), 0, u.max) : 0; };
  window.addEventListener('storage', e => { if (e.key === META_KEY) { meta = loadMeta(); renderMetaButton(); } });

  // New runs (seed undefined) start with the purchased upgrades. Tests and saved runs are untouched.
  const origCreate = Engine.createRun;
  Engine.createRun = function (card, practice, seed) {
    const run = origCreate.apply(this, arguments);
    if (seed === undefined && run && run.player) {
      try {
        const applied = { vigor: lvl('vigor'), ward: lvl('ward'), purse: lvl('purse'), tonic: lvl('tonic'), intuition: lvl('intuition'), cadence: lvl('cadence') };
        run.player.maxHp += applied.vigor * 6; run.player.hp += applied.vigor * 6;
        run.player.gold += applied.purse * 20;
        if (applied.tonic) {
          const potion = run.inventory.find(i => i.id === 'potion');
          if (potion) potion.count += applied.tonic;
          else if (Engine.ITEMS && Engine.ITEMS.potion) run.inventory.push(Object.assign({}, Engine.ITEMS.potion, { count: applied.tonic }));
        }
        run.metaApplied = applied;
        run.feel = { perfect: 0, crits: 0, critDamage: 0 };
      } catch (e) {}
    }
    return run;
  };
  const runMeta = (run, id) => (run && run.metaApplied && +run.metaApplied[id]) || 0;

  /* ------------------------------------------------------------------ *
   * Perfect chant tracking
   * ------------------------------------------------------------------ */
  let liveRun = null;            // last run seen by update/draw
  const flawed = new Set();      // spell keys that had a typo
  const spellKey = run => run && run.spell ? run.spell.word + ':' + ((run.stats && run.stats.casts) || 0) : '';
  function perfectWindow(run) {
    const sp = run && run.spell; if (!sp) return 0;
    return Math.max(3.5, String(sp.word).length * 0.65) * (1 + 0.12 * runMeta(run, 'intuition'));
  }
  // The game's own cast banner says 迅捷施法; on a perfect chant it becomes the crit callout.
  function watchCastFeedback() {
    const el = $('castFeedback'); if (!el) return;
    new MutationObserver(() => {
      const t = el.textContent || '';
      if (/迅捷施法/.test(t) && performance.now() - lastPerfectAt < 600) { el.textContent = '✦ 完美詠唱・暴擊'; el.classList.add('feel-perfect'); }
      else if (!/完美詠唱/.test(t)) el.classList.remove('feel-perfect');
    }).observe(el, { childList: true, characterData: true, subtree: true });
  }
  function watchTypos() {
    const letters = $('qteLetters');
    if (letters) new MutationObserver(() => { if (letters.querySelector('.wrong') && liveRun) flawed.add(spellKey(liveRun)); })
      .observe(letters, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    const runes = $('touchRuneKeys');
    // Capture-phase pointerdown runs before the game's own rune handler updates the input.
    if (runes && Chant) runes.addEventListener('pointerdown', e => {
      const key = e.target.closest('.rune-key'); const run = liveRun;
      if (!key || key.disabled || !run || !run.spell) return;
      const word = run.spell.word, seq = Chant.touchSequence(word), size = Math.ceil(String(word).length / 4) || 1;
      const typed = ($('spellInput') && $('spellInput').value) || '';
      const expected = seq[Math.floor(Chant.analyze(word, typed).matched / size)];
      if (expected !== undefined && key.dataset.rune !== expected) flawed.add(spellKey(run));
    }, true);
  }

  let pending = null;            // the cast currently being resolved
  let lastPerfectAt = 0;
  const critMarks = new Map();   // enemy id -> time of a perfect hit (for number styling)
  const origCast = Arena.cast;
  Arena.cast = function (run, text) {
    pending = null;
    try {
      if (run && run.spell && run.status === 'combat') {
        const sp = run.spell, key = spellKey(run);
        const exact = String(text || '').trim().toLowerCase() === String(sp.word).toLowerCase();
        pending = { key, type: sp.type, perfect: exact && !flawed.has(key) && sp.elapsed <= perfectWindow(run) };
      }
    } catch (e) { pending = null; }
    const result = origCast.apply(this, arguments);
    try {
      if (pending && result && !result.ok && String(text || '').trim()) flawed.add(pending.key);
      if (flawed.size > 300) flawed.clear();
      if (result && result.ok && pending && run) {
        if (!run.feel) run.feel = { perfect: 0, crits: 0, critDamage: 0 };
        if (pending.perfect) {
          run.feel.perfect += 1; lastPerfectAt = performance.now();
          FX.perfect(pending);
        }
      }
    } catch (e) {}
    pending = null;
    return result;
  };

  const origAfter = Arts.afterCast;
  Arts.afterCast = function (run, arena, target, result, api) {
    const out = origAfter.apply(this, arguments);
    try {
      if (!pending || !result || !result.ok || !target) return out;
      pending.target = { x: target.x, y: target.y, id: target.id, boss: target.kind === 'boss' };
      const offensive = pending.type !== 'heal' && pending.type !== 'shield';
      if (pending.perfect && offensive && result.damage > 0 && run.status === 'combat' && target.alive) {
        const bonus = Math.max(1, Math.round(result.damage * (0.25 + 0.1 * runMeta(run, 'cadence'))));
        const dealt = api.damage(run, arena, target, bonus);
        if (dealt > 0) {
          result.damage += dealt;
          if (run.feel) { run.feel.crits += 1; run.feel.critDamage += dealt; }
        }
      }
      if (pending.perfect && offensive) {
        critMarks.set(target.id, performance.now());
        arena.hitStop = Math.max(arena.hitStop || 0, 0.11);
      }
      if (offensive && result.damage > 0 && target.alive && target.kind !== 'boss') knock(arena, target, pending.perfect ? 30 : 16);
    } catch (e) {}
    return out;
  };

  /* ------------------------------------------------------------------ *
   * Knockback (moves the real actor, respecting walls and pillars)
   * ------------------------------------------------------------------ */
  const knocks = new Map();
  function circleRect(x, y, r, b) { return Math.hypot(x - clamp(x, b.x, b.x + b.w), y - clamp(y, b.y, b.y + b.h)) < r; }
  function valid(a, body, x, y) {
    const b = a.bounds; if (!b) return false;
    const r = body.r || 14;
    if (x < b.left + r || x > b.right - r || y < b.top + r || y > b.bottom - r) return false;
    return !(a.obstacles || []).some(o => circleRect(x, y, r, o));
  }
  function knock(a, e, distance) {
    const p = a.player; let dx = e.x - p.x, dy = e.y - p.y; const d = Math.hypot(dx, dy) || 1;
    knocks.set(e, { a, vx: dx / d * distance / 0.14, vy: dy / d * distance / 0.14, t: 0.14 });
  }
  function stepKnocks(dt) {
    for (const [e, k] of knocks) {
      if (!e.alive || k.t <= 0) { knocks.delete(e); continue; }
      const s = Math.min(dt, k.t); k.t -= s;
      const nx = e.x + k.vx * s, ny = e.y + k.vy * s;
      if (valid(k.a, e, nx, ny)) { e.x = nx; e.y = ny; }
      else if (valid(k.a, e, nx, e.y)) e.x = nx;
      else if (valid(k.a, e, e.x, ny)) e.y = ny;
      else knocks.delete(e);
    }
  }

  const origUpdate = Arena.update;
  Arena.update = function (run, dt) {
    const out = origUpdate.apply(this, arguments);
    try {
      liveRun = run;
      const a = run && run.arena;
      if (a && run.status === 'combat') {
        stepKnocks(Math.max(0, +dt || 0) * ((a.hitStop || 0) > 0 ? 0.18 : 1));
        // 晨星護盾: once per encounter, remembered in the save so a reload doesn't repeat it.
        const ward = runMeta(run, 'ward');
        const key = String(run.encounter) + ':' + String(run.stats && run.stats.enemiesDefeated);
        if (ward && run.metaWardKey !== key) { run.metaWardKey = key; run.player.shield = Math.min(90, (run.player.shield || 0) + ward * 5); }
      }
    } catch (e) {}
    return out;
  };

  /* ------------------------------------------------------------------ *
   * Character motion: squash & stretch around the feet
   * ------------------------------------------------------------------ */
  const bodyState = new Map();
  function squash(appearance, pose) {
    if (!pose || pose.still || reduced()) return [1, 1];
    const now = performance.now() / 1000;
    let s = bodyState.get(appearance);
    if (!s) { s = { mode: pose.mode, land: 0, moving: 0 }; bodyState.set(appearance, s); }
    const mode = pose.mode || 'idle';
    if (s.mode === 'dash' && mode !== 'dash') s.land = now;                       // landing after a dash
    if (s.moving > 0.55 && (+pose.moving || 0) < 0.15) s.land = Math.max(s.land, now - 0.06); // stopping
    s.mode = mode; s.moving = +pose.moving || 0;
    let sx = 1, sy = 1;
    const fx = Math.abs(+pose.facingX || 0), fy = Math.abs(+pose.facingY || 0);
    if (mode === 'dash') { if (fx >= fy) { sx = 1.16; sy = 0.9; } else { sx = 0.9; sy = 1.14; } }
    else if (mode === 'cast') {
      const c = clamp(+pose.castProgress || 0, 0, 1);
      if (c < 0.22) { const k = c / 0.22; sx = 1 + 0.07 * k; sy = 1 - 0.07 * k; }            // anticipation crouch
      else if (c < 0.5) { const k = Math.sin((c - 0.22) / 0.28 * Math.PI); sx = 1 - 0.05 * k; sy = 1 + 0.09 * k; } // release
    } else if (mode === 'hurt') {
      const k = Math.sin(clamp(+pose.hurtProgress || 0.5, 0, 1) * Math.PI); sx = 1 + 0.1 * k; sy = 1 - 0.1 * k;
    } else if (mode === 'chant') { const k = (Math.sin(now * 7) + 1) / 2; sx = 1 - 0.012 * k; sy = 1 + 0.02 * k; }
    const land = now - s.land;
    if (land >= 0 && land < 0.16) { const k = Math.sin(land / 0.16 * Math.PI); sx *= 1 + 0.12 * k; sy *= 1 - 0.12 * k; }
    return [sx, sy];
  }
  function wrapDraw(original, kind) {
    return function (c, pose, appearance) {
      const id = appearance || kind;
      if (id !== 'player' || !c) return original.apply(this, arguments);
      const [sx, sy] = squash('player', pose);
      ghosts.capture(original, this, arguments, pose, c);
      if (sx === 1 && sy === 1) return original.apply(this, arguments);
      c.save(); c.scale(sx, sy);
      try { return original.apply(this, arguments); } finally { c.restore(); }
    };
  }
  function patchCharacters() {
    const ch = window.DungeonCharacter;
    if (ch && typeof ch.draw === 'function' && !ch.__feel) {
      window.DungeonCharacter = Object.freeze(Object.assign({}, ch, { draw: wrapDraw(ch.draw, 'player'), __feel: true }));
    }
    const forge = window.DungeonForgeSprites;
    if (forge && typeof forge.draw === 'function' && !forge.__feel) {
      window.DungeonForgeSprites = Object.freeze(Object.assign({}, forge, { draw: wrapDraw(forge.draw, 'player'), __feel: true }));
    }
  }

  /* ------------------------------------------------------------------ *
   * Dash afterimages: the player sprite is re-drawn into small offscreen
   * canvases while dashing, then faded out behind the player.
   * ------------------------------------------------------------------ */
  const ghosts = {
    list: [], last: 0, busy: false,
    capture(original, self, args, pose, c) {
      if (this.busy || reduced() || !pose || pose.mode !== 'dash' || !c.getTransform) return;
      const now = performance.now(); if (now - this.last < 38) return;
      const m = c.getTransform(), cv = doc.createElement('canvas'); cv.width = 96; cv.height = 110;
      const g = cv.getContext('2d'); if (!g) return;
      this.busy = true;
      try {
        g.translate(48, 92);
        const copy = Array.prototype.slice.call(args); copy[0] = g;
        if (original.apply(self, copy) === false) { this.busy = false; return; }   // forge not ready: fallback draw will capture
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';
        g.fillStyle = 'rgba(150,215,255,0.55)'; g.fillRect(0, 0, 96, 110);
      } catch (e) { this.busy = false; return; }
      this.busy = false; this.last = now;
      this.list.push({ cv, x: m.e, y: m.f, life: 0.32, max: 0.32 });
      if (this.list.length > 8) this.list.shift();
    },
    draw(c, dt) {
      for (const gh of this.list) {
        gh.life -= dt; if (gh.life <= 0) continue;
        c.globalAlpha = 0.45 * gh.life / gh.max;
        c.drawImage(gh.cv, gh.x - 48, gh.y - 92);
      }
      c.globalAlpha = 1;
      this.list = this.list.filter(gh => gh.life > 0);
    }
  };

  /* ------------------------------------------------------------------ *
   * Effects layer, drawn on the arena canvas right after the game frame
   * ------------------------------------------------------------------ */
  const FX = {
    nums: [], parts: [], rings: [], banner: null, combo: { value: 0, pop: 0, seen: 0, fade: 0 },
    prev: null, lastTime: null, heart: 0, perfectQueue: [],
    perfect(p) { this.perfectQueue.push(p); },
    reset() { this.nums = []; this.parts = []; this.rings = []; this.banner = null; ghosts.list = []; },
    num(x, y, text, style) {
      this.nums.push({ x: x + (Math.random() - 0.5) * 14, y, vy: style === 'crit' ? -62 : -46, text, style, life: style === 'crit' ? 1.15 : 0.9, max: style === 'crit' ? 1.15 : 0.9 });
      if (this.nums.length > 40) this.nums.shift();
    },
    burst(x, y, color, n, speed, size) {
      if (reduced()) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
        this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.25, g: 220, life: 0.45 + Math.random() * 0.4, max: 0.85, color, size: size * (0.6 + Math.random() * 0.8) });
      }
      if (this.parts.length > 260) this.parts.splice(0, this.parts.length - 260);
    },
    ring(x, y, color, r0, r1, life, width) { if (!reduced()) this.rings.push({ x, y, color, r0, r1, life, max: life, width: width || 3 }); },
    dust(x, y) { if (reduced()) return; for (let i = 0; i < 4; i++) this.parts.push({ x: x + (Math.random() - 0.5) * 16, y: y + 2, vx: (Math.random() - 0.5) * 50, vy: -18 - Math.random() * 20, g: 30, life: 0.4, max: 0.4, color: 'rgba(214,226,210,0.55)', size: 3 + Math.random() * 3, soft: true }); }
  };

  function snapshot(run) {
    const a = run && run.arena; if (!a || run.status !== 'combat') return null;
    const enemies = new Map();
    for (const e of a.enemies || []) enemies.set(e.id, { hp: e.hp, alive: e.alive, x: e.x, y: e.y, r: e.r || 18, boss: e.kind === 'boss', active: e.active });
    return { arena: a, run, enemies, hp: run.player.hp, shield: run.player.shield || 0, dashes: a.dashes || 0, combo: run.player.combo || 0,
             px: a.player.x, py: a.player.y, moving: !!a.player.moving, status: run.status, encounter: run.encounter };
  }

  function detect(renderer, run, prev, cur) {
    const now = performance.now();
    if (!cur) return;
    if (!prev || prev.arena !== cur.arena) return;     // new room: nothing to diff yet
    // Enemies: damage numbers, kill bursts
    for (const [id, e] of cur.enemies) {
      const before = prev.enemies.get(id); if (!before) continue;
      const lost = Math.round(before.hp - e.hp);
      if (lost > 0) {
        const crit = now - (critMarks.get(id) || 0) < 350;
        FX.num(e.x, e.y - e.r - 18, (crit ? '完美 ' : '') + lost, crit ? 'crit' : 'hit');
        FX.burst(e.x, e.y - 8, crit ? '#ffd27a' : '#f4f1ff', crit ? 16 : 7, crit ? 230 : 150, crit ? 3.2 : 2.4);
        FX.ring(e.x, e.y - 6, crit ? '#ffd27a' : 'rgba(255,255,255,0.8)', e.r * 0.6, e.r + (crit ? 46 : 24), crit ? 0.42 : 0.26, crit ? 4 : 2.5);
        if (crit) renderer.shake = Math.max(renderer.shake || 0, 1.7);
      }
      if (before.alive && !e.alive && !e.boss) {
        FX.burst(e.x, e.y - 10, '#c9f3e0', 22, 260, 3);
        FX.burst(e.x, e.y - 10, '#ffe7a8', 8, 160, 2.2);
        FX.ring(e.x, e.y - 8, 'rgba(201,243,224,0.9)', 6, e.r + 54, 0.5, 3);
        renderer.shake = Math.max(renderer.shake || 0, 0.9);
      }
    }
    // Player
    const hpLost = prev.hp - cur.hp, hpGain = cur.hp - prev.hp, shieldGain = cur.shield - prev.shield;
    if (hpLost > 0) { FX.num(cur.px, cur.py - 64, '-' + Math.round(hpLost), 'hurt'); FX.heart = 0.5; }
    if (hpGain > 0) FX.num(cur.px + 14, cur.py - 64, '+' + Math.round(hpGain), 'heal');
    if (shieldGain > 0) FX.num(cur.px - 14, cur.py - 70, '+' + Math.round(shieldGain) + ' 盾', 'shield');
    // Dash: dust at the start
    if (cur.dashes > prev.dashes) { FX.dust(prev.px, prev.py); FX.dust(prev.px, prev.py); }
    else if (cur.moving && Math.random() < 0.06) FX.dust(cur.px, cur.py);
    // Combo badge
    if (cur.combo > prev.combo && cur.combo >= 2) { FX.combo.value = cur.combo; FX.combo.pop = 1; FX.combo.fade = 3.2; }
    if (cur.combo < prev.combo) FX.combo.fade = Math.min(FX.combo.fade, 0.35);
    // Perfect chant callout
    while (FX.perfectQueue.length) {
      const p = FX.perfectQueue.shift(), t = p.target;
      const x = t ? t.x : cur.px, y = t ? t.y : cur.py;
      FX.ring(x, y - 6, '#ffd27a', 14, 90, 0.5, 4);
      FX.ring(cur.px, cur.py - 30, '#ffd27a', 10, 70, 0.4, 3);
      renderer.flash = Math.max(renderer.flash || 0, 0.35); renderer.flashKind = renderer.flashKind || 'signature';
    }
  }

  function roomCleared(renderer, prev, run) {
    if (!prev || !run) return;
    if (prev.status === 'combat' && run.status !== 'combat' && run.status !== 'lost' && prev.run === run) {
      const won = run.status === 'won';
      FX.banner = { text: won ? '封印全數解放' : '淨化完成', sub: won ? '遠征凱旋' : '敵人已全數消散', life: 1.7, max: 1.7 };
      FX.burst(prev.px, prev.py - 20, '#ffe7a8', 26, 300, 3);
      renderer.shake = Math.max(renderer.shake || 0, 1.2);
    }
  }

  function drawLayer(renderer, scene, dtRaw) {
    const c = renderer.ctx; if (!c) return;
    const run = scene && scene.run, paused = !!(scene && scene.paused), dt = paused ? 0 : dtRaw;
    const still = reduced();
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    const shake = renderer.shake || 0, t = renderer.clock || 0;
    if (!still && shake > 0) c.translate(Math.round(Math.sin(t * 73) * shake * 3), Math.round(Math.cos(t * 91) * shake * 2));

    ghosts.draw(c, dt);

    // Rings
    for (const r of FX.rings) {
      r.life -= dt; if (r.life <= 0) continue;
      const k = 1 - r.life / r.max;
      c.globalAlpha = (1 - k) * 0.9; c.strokeStyle = r.color; c.lineWidth = r.width * (1 - k * 0.6);
      c.beginPath(); c.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * ease(k), 0, Math.PI * 2); c.stroke();
    }
    FX.rings = FX.rings.filter(r => r.life > 0);
    // Particles
    for (const p of FX.parts) {
      p.life -= dt; if (p.life <= 0) continue;
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - 2.2 * dt;
      c.globalAlpha = clamp(p.life / p.max, 0, 1); c.fillStyle = p.color;
      const s = p.soft ? p.size * (1.6 - p.life / p.max) : p.size;
      c.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), Math.ceil(s), Math.ceil(s));
    }
    FX.parts = FX.parts.filter(p => p.life > 0);
    c.globalAlpha = 1;

    // Combo badge above the player
    const a = run && run.status === 'combat' ? run.arena : null;
    if (a && FX.combo.fade > 0 && FX.combo.value >= 2) {
      FX.combo.fade -= dt; FX.combo.pop = Math.max(0, FX.combo.pop - dt * 4);
      const s = 1 + FX.combo.pop * 0.45, alpha = clamp(FX.combo.fade / 0.4, 0, 1);
      c.save(); c.globalAlpha = alpha; c.translate(a.player.x, a.player.y - 92); c.scale(s, s);
      c.font = '700 20px "Space Grotesk","Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 4; c.strokeStyle = 'rgba(10,18,28,0.85)'; c.lineJoin = 'round';
      const label = FX.combo.value + ' 連擊';
      c.strokeText(label, 0, 0); c.fillStyle = FX.combo.value >= 8 ? '#ffd27a' : FX.combo.value >= 5 ? '#c9f3e0' : '#eef4ed'; c.fillText(label, 0, 0);
      c.restore();
    }

    // Numbers
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    for (const n of FX.nums) {
      n.life -= dt; if (n.life <= 0) continue;
      const k = 1 - n.life / n.max;
      n.y += n.vy * dt; n.vy *= 1 - 3 * dt;
      const pop = n.style === 'crit' || n.style === 'callout' ? 1 + 0.6 * Math.max(0, 1 - k * 6) : 1 + 0.25 * Math.max(0, 1 - k * 8);
      const size = { crit: 30, callout: 22, hit: 20, hurt: 19, heal: 17, shield: 16 }[n.style] || 18;
      const fill = { crit: '#ffd27a', callout: '#ffe7a8', hit: '#f6f4ff', hurt: '#ff8f8f', heal: '#9ff0c4', shield: '#9fd8ff' }[n.style] || '#fff';
      c.save(); c.globalAlpha = clamp(n.life / (n.max * 0.35), 0, 1); c.translate(n.x, n.y); c.scale(pop, pop);
      c.font = `800 ${size}px "Space Grotesk","Noto Sans TC",sans-serif`;
      c.lineWidth = n.style === 'crit' ? 6 : 4.5; c.strokeStyle = n.style === 'crit' ? 'rgba(74,32,6,0.92)' : 'rgba(10,18,28,0.88)';
      c.strokeText(n.text, 0, 0); c.fillStyle = fill; c.fillText(n.text, 0, 0);
      c.restore();
    }
    FX.nums = FX.nums.filter(n => n.life > 0);

    // Banner
    if (FX.banner) {
      const b = FX.banner; b.life -= dt;
      if (b.life <= 0) FX.banner = null;
      else {
        const k = 1 - b.life / b.max, inK = ease(k / 0.18), outA = clamp(b.life / 0.4, 0, 1);
        c.save(); c.globalAlpha = outA;
        c.fillStyle = 'rgba(10,20,30,0.55)'; c.fillRect(0, H / 2 - 54, W, 108 * inK);
        c.fillStyle = 'rgba(255,215,140,0.75)'; c.fillRect(W / 2 - 220 * inK, H / 2 - 54, 440 * inK, 2); c.fillRect(W / 2 - 220 * inK, H / 2 + 52, 440 * inK, 2);
        c.translate(W / 2, H / 2 - 8); c.scale(0.85 + 0.15 * inK, 0.85 + 0.15 * inK);
        c.font = '800 40px "Noto Sans TC","Space Grotesk",sans-serif'; c.lineWidth = 6; c.strokeStyle = 'rgba(28,18,8,0.9)';
        c.strokeText(b.text, 0, 0); c.fillStyle = '#ffe1a0'; c.fillText(b.text, 0, 0);
        c.font = '600 16px "Noto Sans TC",sans-serif'; c.fillStyle = '#d9e6e0'; c.fillText(b.sub, 0, 38);
        c.restore();
      }
    }

    c.restore();

    // Low-HP heartbeat: a CSS layer over the arena, so the GPU blends it instead of the canvas.
    let strength = 0;
    if (run && run.player && run.status === 'combat') {
      const ratio = run.player.hp / Math.max(1, run.player.maxHp);
      FX.heart = Math.max(0, FX.heart - dt);
      const low = ratio <= 0.3 ? (0.3 - ratio) / 0.3 : 0;
      const beat = still ? 0.5 : Math.pow((Math.sin(t * (6 + low * 4)) + 1) / 2, 3);
      strength = clamp(low * (0.45 + 0.55 * beat) + FX.heart, 0, 1);
    } else FX.heart = 0;
    vignette(strength);
  }
  let vig = null, vigShown = -1;
  function vignette(strength) {
    if (!vig) {
      const canvas = $('arena'); if (!canvas || !canvas.parentNode) return;
      vig = doc.createElement('div'); vig.className = 'feel-vignette'; vig.setAttribute('aria-hidden', 'true');
      canvas.parentNode.insertBefore(vig, canvas.nextSibling);
    }
    const v = Math.round(strength * 50) / 50;
    if (v !== vigShown) { vigShown = v; vig.style.opacity = String(v); }
  }

  /* ------------------------------------------------------------------ *
   * Hook into the frame
   * ------------------------------------------------------------------ */
  let lastRun = null, ended = new Set();
  const origDraw = R.prototype.draw;
  R.prototype.draw = function (input, time) {
    patchCharacters();
    origDraw.apply(this, arguments);
    try {
      const scene = input && Object.prototype.hasOwnProperty.call(input, 'run') ? input : { run: input };
      const run = scene.run || null;
      const stamp = +time || 0, dt = FX.lastTime === null ? 0 : clamp((stamp - FX.lastTime) / 1000, 0, 0.05); FX.lastTime = stamp;
      if (run !== lastRun) { FX.reset(); FX.prev = null; lastRun = run; }
      if (run) liveRun = run;
      const cur = snapshot(run);
      if (!scene.paused) { detect(this, run, FX.prev, cur); roomCleared(this, FX.prev, run); }
      FX.prev = cur || (FX.prev && run && FX.prev.run === run ? Object.assign({}, FX.prev, { status: run.status }) : null);
      drawLayer(this, scene, dt);
      updatePerfectChip(run);
      checkRunEnd(run);
    } catch (e) { if (!drawLayer.warned) { drawLayer.warned = true; console.warn('[dungeon-feel]', e); } }
  };

  /* ------------------------------------------------------------------ *
   * Perfect-chant chip inside the chant panel
   * ------------------------------------------------------------------ */
  let chip = null;
  function updatePerfectChip(run) {
    if (!chip) {
      const top = doc.querySelector('#chantQte .qte-top'); if (!top) return;
      chip = doc.createElement('span'); chip.className = 'feel-perfect-chip'; chip.setAttribute('aria-live', 'off');
      top.insertBefore(chip, top.lastElementChild);
    }
    if (!run || run.status !== 'combat' || !run.spell) { chip.hidden = true; return; }
    const left = perfectWindow(run) - (run.spell.elapsed || 0), bad = flawed.has(spellKey(run));
    chip.hidden = false;
    const state = bad ? 'lost' : left > 0 ? 'live' : 'lost';
    if (chip.dataset.state !== state) chip.dataset.state = state;
    const text = bad ? '完美 ✕ 有錯字' : left > 0 ? `完美 ${left.toFixed(1)}s` : '完美 — 超時';
    if (chip.textContent !== text) chip.textContent = text;
  }

  /* ------------------------------------------------------------------ *
   * Run end: stardust and summary
   * ------------------------------------------------------------------ */
  function runKey(run) { return String(run.seed) + (run.practice ? ':p' : ''); }
  function checkRunEnd(run) {
    if (!run || (run.status !== 'won' && run.status !== 'lost')) return;
    const key = runKey(run);
    if (ended.has(key)) return; ended.add(key);
    const already = meta.awarded.includes(key);
    const s = run.stats || {}, f = run.feel || { perfect: 0, crits: 0, critDamage: 0 };
    const nodes = +run.completedNodes || 0;
    let dust = nodes * 6 + (+s.bossesDefeated || 0) * 30 + (+s.correct || 0) + f.perfect * 2 + (run.status === 'won' ? 60 : 0);
    if (run.practice) dust = Math.floor(dust / 2);
    dust = Math.max(run.status === 'won' ? 30 : 5, Math.round(dust));
    const records = [];
    if (!already) {
      meta.stardust += dust; meta.total += dust; meta.runs += 1; meta.awarded.push(key); meta.awarded = meta.awarded.slice(-30);
      if (nodes > meta.best.nodes) { meta.best.nodes = nodes; records.push('最遠節點'); }
      if (f.perfect > meta.best.perfect) { meta.best.perfect = f.perfect; records.push('完美詠唱'); }
      if ((+s.maxCombo || 0) > meta.best.combo) { meta.best.combo = +s.maxCombo || 0; records.push('最高連擊'); }
      saveMeta(); renderMetaButton();
    }
    setTimeout(() => showSummary(run, already ? 0 : dust, records), run.status === 'lost' ? 1700 : 1200);
  }

  /* ------------------------------------------------------------------ *
   * Dialogs: summary and Star Chart
   * ------------------------------------------------------------------ */
  function dialog(id, cls) {
    let d = $(id);
    if (!d) {
      d = doc.createElement('dialog'); d.id = id; d.className = 'feel-dialog ' + cls;
      d.addEventListener('click', e => { if (e.target === d) d.close(); });
      doc.body.appendChild(d);
    }
    return d;
  }
  function openDialog(d) { try { if (!d.open) d.showModal(); } catch (e) { d.setAttribute('open', ''); } }

  function showSummary(run, dust, records) {
    const s = run.stats || {}, f = run.feel || { perfect: 0, crits: 0 };
    const tries = (+s.correct || 0) + (+s.mistakes || 0);
    const accuracy = tries ? Math.round((+s.correct || 0) / tries * 100) : 0;
    const total = Engine.getCampaignLength ? Engine.getCampaignLength(run) : 24;
    const won = run.status === 'won';
    const stat = (label, value) => `<div class="feel-stat"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;
    const d = dialog('feelSummary', 'feel-summary');
    d.innerHTML = `<div class="dialog-top"><span class="eyebrow">${won ? 'EXPEDITION COMPLETE' : 'EXPEDITION REPORT'}</span><button class="icon-button" type="button" data-close aria-label="關閉">✕</button></div>
      <h2>${won ? '遠征凱旋' : '冒險結束'}${run.practice ? '<small>練習</small>' : ''}</h2>
      <p class="feel-lead">${won ? '四道封印全數解放。' : `你抵達了第 ${esc(Math.min(total, (+run.completedNodes || 0) + 1))} / ${esc(total)} 個節點。`}學會的每個字，都會留在你身上。</p>
      <div class="feel-stats">
        ${stat('擊敗敵人', +s.enemiesDefeated || 0)}${stat('擊敗首領', +s.bossesDefeated || 0)}${stat('正確詠唱', +s.correct || 0)}
        ${stat('正確率', tries ? accuracy + '%' : '—')}${stat('完美詠唱', f.perfect || 0)}${stat('最高連擊', +s.maxCombo || 0)}
      </div>
      <div class="feel-dust"><span>獲得星塵</span><b data-count="${dust}">+0</b><small>目前 ${esc(meta.stardust)} 星塵${run.practice ? '・練習取得一半' : ''}</small></div>
      ${records.length ? `<p class="feel-records">新紀錄：${records.map(esc).join('、')}</p>` : ''}
      <div class="feel-actions"><button type="button" class="primary" data-chart>打開星盤</button><button type="button" class="secondary" data-close>繼續</button></div>`;
    d.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => d.close()));
    d.querySelector('[data-chart]').addEventListener('click', () => { d.close(); showChart(); });
    openDialog(d);
    const counter = d.querySelector('[data-count]'), target = dust, start = performance.now();
    const tick = now => { const k = reduced() ? 1 : clamp((now - start) / 900, 0, 1); counter.textContent = '+' + Math.round(target * ease(k)); if (k < 1 && d.open) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }

  function showChart() {
    const d = dialog('feelChart', 'feel-chart');
    const rows = UPGRADES.map(u => {
      const l = lvl(u.id), maxed = l >= u.max, cost = maxed ? 0 : u.cost[l];
      const pips = Array.from({ length: u.max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('');
      return `<li class="feel-up${maxed ? ' maxed' : ''}">
        <span class="feel-up-icon" aria-hidden="true">${u.icon}</span>
        <div class="feel-up-body"><b>${esc(u.name)}</b><span class="feel-pips" aria-label="等級 ${l} / ${u.max}">${pips}</span>
          <small>${l ? '目前：' + esc(u.text(l)) : '尚未點亮'}${maxed ? '' : '・下一級：' + esc(u.text(l + 1))}</small></div>
        <button type="button" class="${!maxed && meta.stardust >= cost ? 'primary' : 'secondary'}" data-buy="${u.id}" ${maxed || meta.stardust < cost ? 'disabled' : ''}>${maxed ? '已滿級' : '✦ ' + cost}</button>
      </li>`;
    }).join('');
    d.innerHTML = `<div class="dialog-top"><span class="eyebrow">STAR CHART · 星盤</span><button class="icon-button" type="button" data-close aria-label="關閉">✕</button></div>
      <h2>星盤 <span class="feel-balance">✦ ${esc(meta.stardust)} 星塵</span></h2>
      <p class="feel-lead">每次冒險結束都會依表現獲得星塵，練習模式取得一半。點亮的星位會套用在之後開始的每一場冒險。</p>
      <ul class="feel-ups">${rows}</ul>
      <p class="feel-foot">累計獲得 ${esc(meta.total)} 星塵・已完成 ${esc(meta.runs)} 次冒險・最遠第 ${esc(meta.best.nodes + (meta.best.nodes ? 1 : 0) || '—')} 節點・最多完美詠唱 ${esc(meta.best.perfect)} 次</p>`;
    d.querySelector('[data-close]').addEventListener('click', () => d.close());
    d.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => {
      const u = UPGRADES.find(x => x.id === b.dataset.buy), l = lvl(u.id);
      if (l >= u.max || meta.stardust < u.cost[l]) return;
      meta = loadMeta();                                  // re-read in case another tab spent stardust
      if (meta.stardust < u.cost[l]) { showChart(); return; }
      meta.stardust -= u.cost[l]; meta.levels[u.id] = l + 1; saveMeta(); renderMetaButton(); showChart();
    }));
    openDialog(d);
  }

  let metaButton = null;
  function renderMetaButton() {
    if (!metaButton) {
      const host = doc.querySelector('.heading-meta'); if (!host) return;
      metaButton = doc.createElement('button'); metaButton.type = 'button'; metaButton.className = 'quiet-button feel-chart-button';
      metaButton.addEventListener('click', showChart);
      const story = $('storyButton'); host.insertBefore(metaButton, story ? story.nextSibling : host.firstChild);
    }
    metaButton.innerHTML = `<span aria-hidden="true">✦</span>星盤 <b>${esc(meta.stardust)}</b>`;
    metaButton.setAttribute('aria-label', `星盤，目前 ${meta.stardust} 星塵`);
  }

  function init() {
    patchCharacters(); watchTypos(); watchCastFeedback(); renderMetaButton();
    window.WordRelicFeel = Object.freeze({ meta: () => JSON.parse(JSON.stringify(meta)), showChart, upgrades: UPGRADES.map(u => u.id), _run: () => liveRun });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true }); else init();
  // The sprite forge is an ES module and loads after classic scripts; patch it once it appears.
  window.addEventListener('load', patchCharacters, { once: true });
})();
