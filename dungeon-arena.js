(function (root, factory) {
  'use strict';
  var engine = typeof module === 'object' && module.exports ? require('./dungeon-engine.js') : root.DungeonEngine;
  var api = factory(engine);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DungeonArena = api;
})(typeof window !== 'undefined' ? window : globalThis, function (Engine) {
  'use strict';
  var WIDTH = 960, HEIGHT = 540, RANGE = 440;
  var ROOMS = [
    { id: 'pillars', type: 'cover', name: '古柱迴廊', description: '石柱能擋住敵人的飛彈，也會阻擋移動。利用掩體靠近施法。', mutator: '四柱掩體' },
    { id: 'lanes', type: 'traps', name: '碎光十字', description: '地面每隔五秒亮起交錯光帶；預警結束前離開紅色區域。', mutator: '交替陷阱' },
    { id: 'embers', type: 'lava', name: '餘燼環庭', description: '熔池持續灼傷停留者。從外環繞行，或用衝刺跨越短距離危險。', mutator: '持續灼燒' },
    { id: 'waves', type: 'waves', name: '回聲競技場', description: '敵人分三波出現。擊敗所有援軍才能開啟出口，利用空檔恢復專注。', mutator: '三波援軍' },
    { id: 'bridges', type: 'corridor', name: '雙橋密道', description: '長牆將場地分成窄橋。從兩端繞行，別讓蓄力衝撞封住退路。', mutator: '狹道走位' },
    { id: 'spring', type: 'spring', name: '月露泉庭', description: '中央靈泉每三秒恢復 3 點生命；敵人的攻擊仍能穿過泉水。', mutator: '爭奪靈泉' },
    { id: 'tempest', type: 'wind', name: '風暴天橋', description: '兩側風牆交替掃過，金色箭頭預告風向。避開光帶，或逆風衝刺脫離。', mutator: '風牆推移' },
    { id: 'meteor', type: 'meteor', name: '落星殘庭', description: '星隕會記住你停留的位置，稍後落下。看見圓形預警便移動，不要回到原點。', mutator: '追蹤星隕' },
    { id: 'mirrors', type: 'mirrors', name: '稜鏡觀測所', description: '稜鏡依序掃出橫向、縱向光束。石柱提供掩體，預警線之間留有安全空隙。', mutator: '交錯光束' },
    { id: 'eclipse', type: 'eclipse', name: '蝕月祭壇', description: '中央祭壇依序放出擴散月環。留在環與環之間，或趁預警衝過將爆發的月環。', mutator: '擴散月環' }
  ];
  var ACTOR_NAMES = { chaser: '逐光獵影', ranged: '符箭侍從', charger: '重甲破陣者' };
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function has(run, id) { return (run.relics || []).some(function (r) { return r.id === id; }); }
  function hash(value) { var h = 2166136261, str = String(value); for (var i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function unit(x, y) { var n = Math.hypot(x, y); return n ? { x: x / n, y: y / n } : { x: 1, y: 0 }; }
  function effect(a, kind, x, y, extra) {
    var e = Object.assign({ id: 'fx-' + a.nextId++, kind: kind, x: x, y: y, r: 25, life: 0.45, maxLife: 0.45, color: '#d6b8ff' }, extra || {});
    e.maxLife = e.life; a.effects.push(e); if (a.effects.length > 80) a.effects.shift(); return e;
  }
  function rect(id, x, y, w, h, type) { return { id: id, x: x, y: y, w: w, h: h, type: type || 'pillar' }; }
  function circleRect(x, y, r, box) { return Math.hypot(x - clamp(x, box.x, box.x + box.w), y - clamp(y, box.y, box.y + box.h)) < r; }
  function validPosition(a, body, x, y) {
    return x >= a.bounds.left + body.r && x <= a.bounds.right - body.r && y >= a.bounds.top + body.r && y <= a.bounds.bottom - body.r &&
      !a.obstacles.some(function (b) { return circleRect(x, y, body.r, b); });
  }
  function move(a, body, dx, dy) {
    var steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(4, body.r * 0.45)));
    dx /= steps; dy /= steps;
    for (var i = 0; i < steps; i++) {
      var x = clamp(body.x + dx, a.bounds.left + body.r, a.bounds.right - body.r);
      var y = clamp(body.y + dy, a.bounds.top + body.r, a.bounds.bottom - body.r);
      if (validPosition(a, body, x, body.y)) body.x = x;
      if (validPosition(a, body, body.x, y)) body.y = y;
    }
  }
  function place(a, body, preferredX, preferredY) {
    if (validPosition(a, body, preferredX, preferredY)) { body.x = preferredX; body.y = preferredY; return; }
    for (var y = 100; y <= 450; y += 35) for (var x = 110; x <= 850; x += 35) {
      if (validPosition(a, body, x, y) && Math.hypot(x - preferredX, y - preferredY) < 180) { body.x = x; body.y = y; return; }
    }
    body.x = 150; body.y = 275;
  }
  function hazard(a, spec) {
    var h = Object.assign({ id: 'hazard-' + a.nextId++, kind: 'circle', x: 0, y: 0, r: 50, delay: 0.9, life: 0.28,
      damage: 9, color: '#ff746f', source: 'enemy', hit: false, dodgeCounted: false, drain: false }, spec);
    h.maxDelay = h.delay; a.hazards.push(h); if (a.hazards.length > 70) a.hazards.shift(); return h;
  }
  function difficulty(run) {
    return run.difficulty === 'story' ? { damage: 0.65, bullet: 0.85 } : run.difficulty === 'veteran' ? { damage: 1.25, bullet: 1.12 } : { damage: 1, bullet: 1 };
  }
  function projectile(run, a, owner, x, y, angle, speed, damage, extra) {
    var mult = difficulty(run).bullet;
    var b = Object.assign({ id: 'shot-' + a.nextId++, x: x, y: y, vx: Math.cos(angle) * speed * mult,
      vy: Math.sin(angle) * speed * mult, r: 6, life: 7, damage: damage, color: '#ffac7d', source: 'enemy', ownerId: owner,
      drain: false, dodgeCounted: false }, extra || {});
    a.projectiles.push(b); if (a.projectiles.length > 160) a.projectiles.shift(); return b;
  }
  function ensure(run) {
    if (!run || run.status !== 'combat' || !run.enemy) return null;
    var key = String(run.seed) + ':' + run.encounter + ':' + run.enemy.id;
    if (run.arena && run.arena.version === 1 && run.arena.key === key) {
      syncCompanions(run, run.arena);
      return run.arena;
    }
    var boss = run.enemy.kind === 'boss', roomIndex = (hash(run.seed) + run.encounter) % ROOMS.length;
    var room = Object.assign({}, ROOMS[roomIndex]);
    if (boss) room = { id: 'boss-' + run.enemy.id, type: 'boss', name: run.enemy.name + '・封印殿',
      description: run.enemy.description, mutator: '雙階段首領戰' };
    var a = run.arena = {
      version: 1, key: key, width: WIDTH, height: HEIGHT, bounds: { left: 40, top: 58, right: 920, bottom: 500 },
      player: { x: 200, y: 280, r: 12, facingX: 1, facingY: 0, dashTime: 0, dashCooldown: 0, invulnerable: 0,
        dashX: 1, dashY: 0, focusEnergy: 100 },
      enemies: [], obstacles: [], hazards: [], projectiles: [], effects: [], room: room, time: 0, realTime: 0,
      casts: 0, dodges: 0, dashes: 0, hitsTaken: 0, nextId: 1, roomClock: 2.5, roomPulse: 0, springClock: 0,
      slowTime: 0, focusActive: false, targetId: null, castRange: RANGE, wavesReleased: 1,
      dashHeld: false, previousPhase: run.enemy.phase, lastPattern: null, patternCount: 0,
      introRemaining: boss ? 1.2 : 0, companions: [], echoQueue: []
    };
    if (room.id === 'pillars') a.obstacles = [rect('p1', 330, 130, 62, 66), rect('p2', 590, 130, 62, 66), rect('p3', 330, 355, 62, 66), rect('p4', 590, 355, 62, 66)];
    if (room.id === 'bridges') a.obstacles = [rect('wall1', 300, 170, 355, 40, 'wall'), rect('wall2', 300, 355, 355, 40, 'wall')];
    if (room.id === 'mirrors') a.obstacles = [rect('prism1', 350, 150, 36, 46, 'prism'), rect('prism2', 590, 365, 36, 46, 'prism')];
    if (boss && run.enemy.id === 'witch') a.obstacles = [rect('mirror1', 410, 115, 44, 60), rect('mirror2', 410, 385, 44, 60)];
    if (room.id === 'embers') {
      hazard(a, { source: 'trap', x: 395, y: 190, r: 60, delay: 1.5, life: 100000, damage: 6, repeat: true, color: '#f08a55' });
      hazard(a, { source: 'trap', x: 620, y: 380, r: 63, delay: 1.5, life: 100000, damage: 6, repeat: true, color: '#f08a55' });
    }
    if (room.id === 'spring') a.room.spring = { x: 480, y: 280, r: 48, heal: 3 };
    var count = boss ? 1 : room.id === 'waves' ? 5 : run.enemy.kind === 'elite' ? 5 : 3 + run.region % 2;
    var original = run.enemy.maxHp, remaining = run.enemy.hp, maxUsed = 0, hpUsed = 0;
    var spots = [[640, 280], [760, 135], [760, 435], [520, 110], [540, 450]];
    for (var i = 0; i < count; i++) {
      var maxHp = i === count - 1 ? original - maxUsed : Math.floor(original / count); maxUsed += maxHp;
      var hp = i === count - 1 ? remaining - hpUsed : Math.floor(remaining / count); hpUsed += hp;
      var kind = boss ? 'boss' : ['chaser', 'ranged', 'charger'][i % 3];
      var spawnAt = room.id === 'waves' ? i < 2 ? 0 : i < 4 ? 4.5 : 9 : 0;
      var enemy = { id: boss ? run.enemy.id : run.enemy.id + '-' + i, kind: kind, npcId: run.enemy.npcId || null,
        sprite: boss ? run.enemy.sprite || run.enemy.id : kind === 'ranged' ? 'eye' : kind === 'charger' ? 'knight' : run.enemy.id,
        name: boss ? run.enemy.name : ACTOR_NAMES[kind], x: 0, y: 0, r: boss ? 30 : kind === 'charger' ? 20 : 16,
        hp: hp, maxHp: maxHp, alive: hp > 0, active: spawnAt === 0, spawnAt: spawnAt, phase: run.enemy.phase,
        cooldown: 1.8 + i * 0.3, telegraph: 0, chargeX: 0, chargeY: 0, chargeTime: 0, volley: null, hurt: 0 };
      place(a, enemy, spots[i][0], spots[i][1]); a.enemies.push(enemy);
    }
    if (!run.difficulty) run.difficulty = 'standard';
    syncCompanions(run, a);
    if (boss) effect(a, 'boss-intro', a.enemies[0].x, a.enemies[0].y, { name: run.enemy.name, text: '封印解除', r: 130, life: 1.2, color: '#ffb27c' });
    updateTarget(a); return a;
  }
  function syncCompanions(run, a) {
    var saved = Array.isArray(a.companions) ? a.companions : [];
    a.companions = (Array.isArray(run.companions) ? run.companions : []).filter(function (c, index, list) {
      return c && ['lantern', 'echo', 'sentinel'].indexOf(c.id) >= 0 && list.findIndex(function (other) { return other && other.id === c.id; }) === index;
    }).slice(0, 3).map(function (c, i) {
      var existing = saved.find(function (body) { return body.npcId === c.id; });
      var body = Object.assign({ x: a.player.x - 36, y: a.player.y + (i - 1) * 26, r: 11, cooldown: c.id === 'echo' ? 0 : 2 + i, castFlash: 0 }, existing || {},
        { id: 'companion-' + c.id, npcId: c.id, name: c.name, sprite: c.sprite || c.id, color: c.color || '#b9deff', role: c.role });
      if (!Number.isFinite(body.x) || !Number.isFinite(body.y) || !validPosition(a, body, body.x, body.y)) place(a, body, a.player.x - 35, a.player.y);
      return body;
    });
    if (!Array.isArray(a.echoQueue)) a.echoQueue = [];
  }
  function companionCast(a, companion, target, spellType, spellWord) {
    companion.castFlash = 0.45;
    effect(a, 'companion-cast', companion.x, companion.y, { fromX: companion.x, fromY: companion.y, targetX: target.x, targetY: target.y,
      x2: target.x, y2: target.y, npcId: companion.npcId, spellType: spellType || 'attack', spellWord: spellWord || '', color: companion.color, life: 0.65 });
  }
  function advanceCompanions(run, a, dt) {
    a.companions.forEach(function (c, index) {
      var angle = Math.atan2(a.player.facingY, a.player.facingX) + Math.PI + (index - 1) * 0.7;
      var destination = { x: a.player.x + Math.cos(angle) * 42, y: a.player.y + Math.sin(angle) * 42 };
      var direction = unit(destination.x - c.x, destination.y - c.y), distance = dist(c, destination);
      move(a, c, direction.x * Math.min(distance, 210 * dt), direction.y * Math.min(distance, 210 * dt));
      // Reunite after a dash around a wall; companions never block actors or doors.
      if (dist(c, a.player) > 185) place(a, c, a.player.x - 35, a.player.y);
      c.castFlash = Math.max(0, c.castFlash - dt);
      c.cooldown = Math.max(0, c.cooldown - dt);
      if (run.status !== 'combat' || a.introRemaining > 0 || c.cooldown > 0) return;
      if (c.npcId === 'lantern') {
        var shield = Math.min(6, Math.max(0, 24 - run.player.shield));
        c.cooldown = 8;
        if (shield) { run.player.shield += shield; companionCast(a, c, a.player, 'shield'); effect(a, 'companion-shield', a.player.x, a.player.y, { r: 35, color: c.color, life: 0.7 }); }
      } else if (c.npcId === 'sentinel') {
        var target = targets(a, c).find(function (enemy) { return dist(enemy, c) <= 230; });
        if (target) { c.cooldown = 4.5; companionCast(a, c, target, 'strike'); directDamage(run, a, target, 5 + Math.min(3, run.region)); }
      }
    });
    a.echoQueue.forEach(function (echo) {
      echo.delay -= dt;
      if (echo.delay > 0 || echo.done || run.status !== 'combat') return;
      echo.done = true;
      var companion = a.companions.find(function (c) { return c.npcId === 'echo'; });
      if (!companion) return;
      if (echo.heal > 0 || echo.shield > 0) {
        if (echo.heal > 0) Engine.healPlayer(run, echo.heal);
        if (echo.shield > 0) run.player.shield += Math.min(echo.shield, Math.max(0, 90 - run.player.shield));
        companionCast(a, companion, a.player, echo.spellType, echo.spellWord);
      }
      var target = targets(a, companion).find(function (enemy) { return enemy.id === echo.targetId && dist(enemy, companion) <= RANGE + enemy.r; }) ||
        targets(a, companion).find(function (enemy) { return dist(enemy, companion) <= RANGE + enemy.r; });
      if (!target || !(echo.damage > 0)) return;
      var attackType = echo.spellType === 'heal' || echo.spellType === 'shield' ? 'attack' : echo.spellType;
      companionCast(a, companion, target, attackType, echo.spellWord);
      directDamage(run, a, target, echo.damage);
    });
    a.echoQueue = a.echoQueue.filter(function (echo) { return !echo.done && echo.delay > 0; });
  }
  function living(a) { return a.enemies.filter(function (e) { return e.alive && e.hp > 0; }); }
  function targets(a, origin) { return living(a).filter(function (e) { return e.active; }).sort(function (x, y) { return dist(x, origin || a.player) - dist(y, origin || a.player); }); }
  function updateTarget(a) { var list = targets(a); a.targetId = list.length && dist(list[0], a.player) <= RANGE + list[0].r ? list[0].id : null; }
  function hurtActor(a, actor, amount) {
    var actual = Math.min(actor.hp, amount); actor.hp -= actual; actor.hurt = 0.18;
    if (actor.hp <= 0) { actor.hp = 0; actor.alive = false; actor.telegraph = 0; actor.volley = null;
      effect(a, 'death', actor.x, actor.y, { r: actor.r + 18, life: actor.kind === 'boss' ? 1.6 : 0.95, color: actor.kind === 'boss' ? '#ffbe83' : '#a9e5d0', boss: actor.kind === 'boss',
        actor: { id: actor.id, npcId: actor.npcId, sprite: actor.sprite, kind: actor.kind, name: actor.name, x: actor.x, y: actor.y, r: actor.r, phase: actor.phase } }); }
    return actual;
  }
  function distribute(a, amount, first) {
    var order = targets(a, first || a.player).sort(function (x, y) { if (first && x.id === first.id) return -1; if (first && y.id === first.id) return 1; return dist(x, first || a.player) - dist(y, first || a.player); });
    var left = amount, from = first || a.player;
    order.forEach(function (e) {
      if (left <= 0) return;
      var hit = hurtActor(a, e, left); left -= hit;
      if (first && e.id !== first.id) effect(a, 'chain', from.x, from.y, { x2: e.x, y2: e.y, color: '#d5b6ff', life: 0.35 });
      from = e;
    });
  }
  function directDamage(run, a, actor, amount) {
    if (run.status !== 'combat' || !actor.alive) return 0;
    var actual = Engine.damageEnemy(run, Math.min(actor.hp, amount), 1);
    hurtActor(a, actor, actual); return actual;
  }
  function applyHit(run, a, amount, source) {
    var p = a.player;
    if (p.invulnerable > 0 || a.introRemaining > 0 || run.status !== 'combat') return false;
    var result = Engine.damagePlayer(run, Math.max(1, Math.round(amount * difficulty(run).damage)), { drain: source && source.drain, name: source && source.source === 'trap' ? '地面陷阱' : run.enemy.name });
    if (!result.ok) return false;
    p.invulnerable = 0.75; a.hitsTaken += 1;
    effect(a, 'hit', p.x, p.y, { color: result.damage ? '#ff847a' : '#8ad6ff', life: 0.3, r: 22 });
    if (run.status === 'lost') effect(a, 'death', p.x, p.y, { r: 34, life: 1.3, color: '#b8d5ff', actor: { id: 'player', kind: 'player', sprite: 'player', x: p.x, y: p.y, r: p.r } });
    if (result.restored > 0) {
      var recipient = a.enemies.find(function (e) { return e.id === source.ownerId; }) || living(a)[0];
      if (recipient) recipient.hp = Math.min(recipient.maxHp, recipient.hp + result.restored);
    }
    return true;
  }
  function countDodge(a, danger) {
    if (a.player.dashTime > 0 && !danger.dodgeCounted) { danger.dodgeCounted = true; a.dodges += 1; }
  }
  function segmentDistance(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1, n = dx * dx + dy * dy;
    var t = n ? clamp(((px - x1) * dx + (py - y1) * dy) / n, 0, 1) : 0;
    return Math.hypot(px - x1 - t * dx, py - y1 - t * dy);
  }
  function contains(h, p) {
    if (h.kind === 'rect') return circleRect(p.x, p.y, p.r, h);
    if (h.kind === 'line') return segmentDistance(p.x, p.y, h.x, h.y, h.x2, h.y2) <= (h.width || 22) / 2 + p.r;
    var d = dist(h, p);
    return h.kind === 'ring' ? d <= h.r + p.r && d >= (h.innerR || h.r - 24) - p.r : d <= h.r + p.r;
  }
  function npcPattern(run, a, boss, intent, turn, phase) {
    var npc = Engine.NPCS[run.enemy.npcId], p = a.player, damage = intent.damage;
    var base = { source: 'boss', ownerId: boss.id, damage: damage, color: npc.color };
    function mark(spec) { return hazard(a, Object.assign({}, base, spec)); }
    a.lastPattern = npc.patterns[turn % 2];
    if (npc.id === 'merchant') {
      if (turn % 2 === 0) {
        boss.volley = { delay: 1.15, radial: phase === 2 ? 26 : 16, rotation: turn * 0.23,
          damage: damage, color: '#ffd36e', shape: 'coin', speed: phase === 2 ? 150 : 125 };
        mark({ kind: 'ring', x: boss.x, y: boss.y, r: 64, innerR: 57, delay: 1, life: 0.15, cosmetic: true });
        if (phase === 2) mark({ kind: 'circle', x: p.x, y: p.y, r: 66, delay: 1.9, life: 0.35 });
      } else {
        [185, 410, 635, 860].forEach(function (x, i) {
          mark({ kind: 'line', x: x, y: 70, x2: x, y2: 490, width: phase === 2 ? 58 : 40, delay: 1.15 + i * 0.15, life: 0.65 });
        });
        if (phase === 2) mark({ kind: 'line', x: 55, y: p.y, x2: 905, y2: p.y, width: 36, delay: 2.05, life: 0.4 });
      }
    } else if (npc.id === 'healer') {
      if (turn % 2 === 0) {
        for (var flower = 0; flower < (phase === 2 ? 5 : 3); flower++) {
          var angle = flower * 2.4, radius = flower ? 85 : 0;
          mark({ x: clamp(p.x + Math.cos(angle) * radius, 100, 860), y: clamp(p.y + Math.sin(angle) * radius, 110, 450),
            r: 44, delay: 1.1 + flower * 0.22, life: phase === 2 ? 2.2 : 0.65, repeat: phase === 2 });
        }
      } else {
        [110, 205, phase === 2 ? 300 : 0].filter(Boolean).forEach(function (r, i) {
          mark({ kind: 'ring', x: boss.x, y: boss.y, r: r, innerR: r - 30, delay: 1.1 + i * 0.45, life: 0.55 });
        });
        if (phase === 2) mark({ x: p.x, y: p.y, r: 45, delay: 2.2, life: 1.3 });
      }
    } else if (npc.id === 'smith') {
      if (turn % 2 === 0) {
        mark({ x: p.x, y: p.y, r: phase === 2 ? 112 : 88, delay: 1.4, life: 0.25, damage: damage + 5 });
        mark({ kind: 'ring', x: p.x, y: p.y, r: phase === 2 ? 195 : 160, innerR: phase === 2 ? 158 : 130, delay: 1.9, life: 0.45 });
        if (phase === 2) mark({ x: boss.x, y: boss.y, r: 80, delay: 2.3, life: 0.45 });
      } else {
        mark({ kind: 'line', x: 70, y: 85, x2: 890, y2: 475, width: 60, delay: 1.4, life: 0.5 });
        mark({ kind: 'line', x: 70, y: 475, x2: 890, y2: 85, width: 60, delay: phase === 2 ? 1.65 : 2.2, life: 0.5 });
        if (phase === 2) mark({ kind: 'line', x: 70, y: 280, x2: 890, y2: 280, width: 48, delay: 2.1, life: 0.5 });
      }
    } else if (npc.id === 'lantern') {
      if (turn % 2 === 0) {
        [88, 168, phase === 2 ? 248 : 0].filter(Boolean).forEach(function (radius, index) {
          mark({ kind: 'ring', x: boss.x, y: boss.y, r: radius, innerR: radius - 27, delay: 1.2 + index * 0.45, life: 0.42 });
        });
      } else {
        for (var lantern = 0; lantern < (phase === 2 ? 4 : 3); lantern++) {
          mark({ x: clamp(p.x + (lantern - 1) * 105, 100, 860), y: p.y, r: 48, delay: 1.25 + lantern * 0.3, life: 0.5 });
        }
        boss.volley = { delay: 1.3, radial: phase === 2 ? 16 : 10, rotation: turn * 0.41, damage: damage, color: npc.color, shape: 'lantern', speed: 110 };
      }
    } else if (npc.id === 'echo') {
      if (turn % 2 === 0) {
        // Echoes capture the player's location once, so walking beats the delayed copy.
        mark({ kind: 'line', x: boss.x, y: boss.y, x2: p.x, y2: p.y, width: 42, delay: 1.2, life: 0.4 });
        mark({ x: p.x, y: p.y, r: phase === 2 ? 90 : 65, delay: 1.95, life: 0.4 });
      } else {
        [-95, 95].forEach(function (offset, index) {
          mark({ kind: 'line', x: 65, y: clamp(p.y + offset, 95, 455), x2: 895, y2: clamp(p.y - offset, 95, 455), width: phase === 2 ? 45 : 30, delay: 1.25 + index * 0.45, life: 0.45 });
        });
        if (phase === 2) mark({ x: p.x, y: p.y, r: 54, delay: 2.25, life: 0.4 });
      }
    } else if (npc.id === 'sentinel') {
      if (turn % 2 === 0) {
        [235, 480, 725].forEach(function (x, index) { mark({ kind: 'line', x: x, y: 70, x2: x, y2: 490, width: phase === 2 ? 62 : 42, delay: 1.15 + index * 0.3, life: 0.4 }); });
      } else {
        mark({ kind: 'line', x: boss.x, y: boss.y, x2: p.x, y2: p.y, width: phase === 2 ? 86 : 60, delay: 1.4, life: 0.5, damage: damage + 3 });
        boss.volley = { delay: 1.45, radial: phase === 2 ? 18 : 12, rotation: turn * 0.27, damage: damage, color: npc.color, shape: 'paper', speed: 135 };
      }
    } else if (npc.id === 'cartographer') {
      if (turn % 2 === 0) {
        [265, 515, 765].forEach(function (x) { mark({ kind: 'line', x: x, y: 70, x2: x, y2: 490, width: phase === 2 ? 48 : 28, delay: 1.5, life: 0.6 }); });
        [185, 385].forEach(function (y) { mark({ kind: 'line', x: 55, y: y, x2: 905, y2: y, width: phase === 2 ? 48 : 28, delay: phase === 2 ? 1.6 : 2, life: 0.6 }); });
      } else {
        [-95, 95].forEach(function (offset, i) {
          mark({ kind: 'line', x: 80, y: clamp(p.y + offset, 90, 450), x2: 880, y2: clamp(540 - p.y - offset, 90, 450), width: 38, delay: 1.2 + i * 0.35, life: 0.45 });
        });
        if (phase === 2) mark({ x: p.x, y: p.y, r: 70, delay: 1.85, life: 0.55 });
      }
    } else {
      if (turn % 2 === 0) {
        var top = turn % 4 === 0;
        mark({ kind: 'rect', x: 55, y: top ? 65 : 345, w: 850, h: 145, delay: 1.5, life: 0.8, drain: true });
        if (phase === 2) mark({ kind: 'rect', x: 55, y: top ? 345 : 65, w: 850, h: 145, delay: 2.1, life: 0.8, drain: true });
        mark({ kind: 'line', x: p.x, y: 70, x2: p.x, y2: 490, width: 34, delay: 1.8, life: 0.4 });
      } else {
        boss.volley = { delay: 1.1, radial: phase === 2 ? 22 : 14, rotation: turn * 0.34, damage: damage,
          drain: true, color: '#94dce8', speed: 118 };
        mark({ kind: 'ring', x: boss.x, y: boss.y, r: 62, innerR: 54, delay: 0.9, life: 0.15, cosmetic: true });
        if (phase === 2) mark({ x: p.x, y: p.y, r: 58, delay: 1.8, life: 0.5, drain: true });
      }
    }
  }
  function bossPattern(run, a, intent) {
    var boss = living(a)[0]; if (!boss) return;
    var phase = run.enemy.phase, turn = run.enemy.turn - 1, p = a.player, damage = intent.damage;
    a.patternCount += 1;
    if (run.enemy.isNpcBoss && Engine.NPCS[run.enemy.npcId]) {
      npcPattern(run, a, boss, intent, turn, phase);
    } else if (run.enemy.id === 'thorn') {
      if (turn % 2 === 0) {
        a.lastPattern = '荊棘追跡';
        for (var i = 0; i < (phase === 2 ? 5 : 3); i++) {
          var angle = i * 2.4, offset = i ? 65 + i * 10 : 0;
          hazard(a, { source: 'boss', ownerId: boss.id, x: clamp(p.x + Math.cos(angle) * offset, 90, 870), y: clamp(p.y + Math.sin(angle) * offset, 90, 465), r: 42,
            delay: 1.2 + i * 0.2, damage: Math.max(8, damage), color: '#de9776' });
        }
      } else {
        a.lastPattern = '棘冠環震';
        [100, 180, phase === 2 ? 260 : 0].filter(Boolean).forEach(function (radius, index) {
          hazard(a, { kind: 'ring', source: 'boss', ownerId: boss.id, x: boss.x, y: boss.y, r: radius, innerR: radius - 25,
            delay: 1.15 + index * 0.3, life: 0.4, damage: damage });
        });
      }
    } else if (run.enemy.id === 'witch') {
      if (turn % 2 === 0) {
        a.lastPattern = '鏡月星雨';
        var count = phase === 2 ? 16 : 10;
        boss.volley = { delay: 1, radial: count, rotation: turn * 0.28, damage: damage, drain: intent.kind === 'drain' };
        hazard(a, { kind: 'ring', source: 'boss', ownerId: boss.id, x: boss.x, y: boss.y, r: 55, innerR: 48, delay: 0.85, life: 0.15, damage: 0, cosmetic: true, color: '#bd9aff' });
      } else {
        a.lastPattern = '折光封線';
        var y = p.y;
        hazard(a, { kind: 'line', source: 'boss', ownerId: boss.id, x: 65, y: y, x2: 895, y2: y, width: 34, delay: 1.4, damage: damage, drain: true, color: '#b9a1ff' });
        if (phase === 2) hazard(a, { kind: 'line', source: 'boss', ownerId: boss.id, x: p.x, y: 75, x2: p.x, y2: 485, width: 34, delay: 1.75, damage: damage, drain: true, color: '#b9a1ff' });
      }
    } else {
      if (turn % 3 === 2) {
        a.lastPattern = '末頁湮滅';
        // Broad rows alternate, leaving a real safe strip throughout the attack.
        var top = (turn % 2) === 0;
        hazard(a, { kind: 'rect', source: 'boss', ownerId: boss.id, x: 45, y: top ? 65 : 325, w: 870, h: 165,
          delay: 2, life: 0.5, damage: damage, color: '#ff745f' });
        hazard(a, { kind: 'line', source: 'boss', ownerId: boss.id, x: p.x, y: 68, x2: p.x, y2: 492, width: phase === 2 ? 60 : 38,
          delay: 2.3, life: 0.4, damage: damage, color: '#ffab76' });
      } else {
        a.lastPattern = turn % 3 === 0 ? '王座星環' : '失名突刺';
        if (turn % 3 === 0) boss.volley = { delay: 1.1, radial: phase === 2 ? 18 : 12, rotation: turn * 0.3, damage: Math.max(8, damage), drain: false };
        else {
          hazard(a, { kind: 'line', source: 'boss', ownerId: boss.id, x: boss.x, y: boss.y, x2: p.x, y2: p.y, width: 52, delay: 1.25, damage: damage });
          if (phase === 2) hazard(a, { kind: 'circle', source: 'boss', ownerId: boss.id, x: p.x, y: p.y, r: 85, delay: 1.8, damage: damage });
        }
      }
    }
  }
  function intentPattern(run, a) {
    var intent = Engine.resolveArenaIntent(run); if (!intent) return;
    if (run.enemy.kind === 'boss') bossPattern(run, a, intent);
    else {
      a.lastPattern = '符文落擊'; a.patternCount += 1;
      hazard(a, { x: a.player.x, y: a.player.y, r: run.enemy.kind === 'elite' ? 70 : 52, delay: 1.1,
        damage: intent.damage, source: 'enemy' });
    }
  }
  function advanceRoom(run, a, dt) {
    a.roomClock -= dt;
    if (a.room.id === 'lanes' && a.roomClock <= 0) {
      a.roomClock += 5; a.roomPulse += 1;
      var vertical = a.roomPulse % 2;
      hazard(a, { kind: 'rect', source: 'trap', x: vertical ? 435 : 55, y: vertical ? 65 : 250,
        w: vertical ? 90 : 850, h: vertical ? 425 : 60, delay: 1.3, life: 0.4, damage: 10 + run.region * 2 });
    }
    if (a.room.id === 'tempest' && a.roomClock <= 0) {
      a.roomClock += 5.2; a.roomPulse += 1;
      var fromLeft = a.roomPulse % 2 === 1;
      hazard(a, { kind: 'rect', source: 'trap', x: fromLeft ? 65 : 520, y: 65, w: 375, h: 425,
        delay: 1.5, life: 1.15, repeat: true, damage: 5 + run.region, pushX: fromLeft ? 95 : -95, color: '#89dbe8' });
    }
    if (a.room.id === 'meteor' && a.roomClock <= 0) {
      a.roomClock += 4.3; a.roomPulse += 1;
      for (var star = 0; star < 3; star++) {
        var angle = a.roomPulse * 1.7 + star * Math.PI * 2 / 3;
        hazard(a, { source: 'trap', x: clamp(a.player.x + Math.cos(angle) * star * 68, 100, 860), y: clamp(a.player.y + Math.sin(angle) * star * 68, 110, 450),
          r: 46 + star * 5, delay: 1.3 + star * 0.35, life: 0.35, damage: 9 + run.region * 2, color: '#ffc27f' });
      }
    }
    if (a.room.id === 'mirrors' && a.roomClock <= 0) {
      a.roomClock += 5.4; a.roomPulse += 1;
      var cross = a.roomPulse % 2 === 0;
      [180, 375].forEach(function (y, index) {
        hazard(a, { kind: 'line', source: 'trap', x: cross ? 280 + index * 390 : 65, y: cross ? 65 : y,
          x2: cross ? 280 + index * 390 : 895, y2: cross ? 490 : y, width: 34, delay: 1.4 + index * 0.4, life: 0.6, damage: 9 + run.region * 2, color: '#c5a3ff' });
      });
    }
    if (a.room.id === 'eclipse' && a.roomClock <= 0) {
      a.roomClock += 6.2; a.roomPulse += 1;
      [90, 180, 270].forEach(function (radius, index) {
        hazard(a, { kind: 'ring', source: 'trap', x: 480, y: 280, r: radius, innerR: radius - 25,
          delay: 1.25 + index * 0.6, life: 0.4, damage: 10 + run.region * 2, color: '#e0b4ff' });
      });
    }
    if (a.room.spring) {
      a.springClock = Math.max(0, a.springClock - dt);
      if (dist(a.player, a.room.spring) <= a.room.spring.r && a.springClock <= 0) {
        a.springClock = 3;
        var healed = Engine.healPlayer(run, 3);
        if (healed) effect(a, 'heal', a.player.x, a.player.y, { color: '#8beac2', r: 30 });
      }
    }
  }
  function enemyAI(run, a, e, dt, motionScale) {
    if (!e.alive) return;
    if (!e.active) {
      if (a.time >= e.spawnAt) { e.active = true; a.wavesReleased = Math.max(a.wavesReleased, e.spawnAt >= 9 ? 3 : 2); effect(a, 'spawn', e.x, e.y, { r: 40, life: 0.7 }); }
      else return;
    }
    var p = a.player, dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy), direction = unit(dx, dy);
    e.hurt = Math.max(0, e.hurt - dt); e.phase = run.enemy.phase;
    if (e.volley) {
      e.volley.delay -= dt;
      if (e.volley.delay <= 0) {
        var volley = e.volley; e.volley = null;
        if (volley.radial) {
          for (var n = 0; n < volley.radial; n++) projectile(run, a, e.id, e.x, e.y, volley.rotation + n * Math.PI * 2 / volley.radial, volley.speed || 125 + run.region * 10, volley.damage,
            { drain: volley.drain, color: volley.color || '#c69fff', shape: volley.shape || 'orb' });
        } else {
          var angle = Math.atan2(volley.y - e.y, volley.x - e.x);
          for (var spread = -volley.spread; spread <= volley.spread; spread++) projectile(run, a, e.id, e.x, e.y, angle + spread * 0.18, 150 + run.region * 9, volley.damage);
        }
      }
    }
    if (e.kind === 'boss') {
      // Boss movement is slow and readable; the dangerous part is its telegraphed pattern.
      if (d > 260) move(a, e, direction.x * (e.phase === 2 ? 34 : 24) * dt * motionScale, direction.y * (e.phase === 2 ? 34 : 24) * dt * motionScale);
      e.cooldown -= dt;
      if (e.cooldown <= 0 && d < 76) { e.cooldown = 3; hazard(a, { x: e.x, y: e.y, r: 67, delay: 0.9, damage: 10 + run.region * 3, source: 'boss', ownerId: e.id }); }
      return;
    }
    if (e.chargeTime > 0) {
      e.chargeTime = Math.max(0, e.chargeTime - dt);
      var beforeX = e.x, beforeY = e.y;
      move(a, e, e.chargeX * 365 * dt * motionScale, e.chargeY * 365 * dt * motionScale);
      if (Math.hypot(e.x - beforeX, e.y - beforeY) < 1 || e.chargeTime === 0) e.chargeTime = 0;
      if (dist(e, p) <= e.r + p.r) { if (p.invulnerable > 0) countDodge(a, e); else applyHit(run, a, 11 + run.region * 2, e); }
      return;
    }
    if (e.telegraph > 0) {
      e.telegraph = Math.max(0, e.telegraph - dt);
      if (e.telegraph === 0 && e.kind === 'charger') { e.chargeTime = 0.6; e.dodgeCounted = false; }
      return;
    }
    e.cooldown -= dt;
    if (e.kind === 'chaser') {
      if (d > 48) move(a, e, direction.x * (49 + run.region * 5) * dt * motionScale, direction.y * (49 + run.region * 5) * dt * motionScale);
      if (d < 82 && e.cooldown <= 0) {
        e.cooldown = 2.7; e.telegraph = 0.8;
        hazard(a, { x: p.x, y: p.y, r: 38, delay: 0.8, damage: 7 + run.region * 2, ownerId: e.id });
      }
    } else if (e.kind === 'ranged') {
      var sign = d > 320 ? 1 : d < 190 ? -1 : 0;
      move(a, e, direction.x * 36 * sign * dt * motionScale, direction.y * 36 * sign * dt * motionScale);
      if (e.cooldown <= 0 && !e.volley) {
        e.cooldown = 3.8; e.telegraph = 0.7;
        e.volley = { delay: 0.7, x: p.x, y: p.y, spread: run.region === 2 ? 1 : 0, damage: 7 + run.region * 2 };
        hazard(a, { kind: 'line', x: e.x, y: e.y, x2: p.x, y2: p.y, width: 4, delay: 0.7, life: 0.08, damage: 0,
          ownerId: e.id, cosmetic: true, color: '#e4bba2' });
      }
    } else {
      if (e.cooldown <= 0) {
        e.cooldown = 4.3; e.telegraph = 1;
        e.chargeX = direction.x; e.chargeY = direction.y;
        hazard(a, { kind: 'line', x: e.x, y: e.y, x2: clamp(e.x + direction.x * 220, 55, 905), y2: clamp(e.y + direction.y * 220, 73, 485),
          width: e.r * 2, delay: 1, life: 0.1, damage: 0, cosmetic: true, ownerId: e.id, color: '#ffa46d' });
      } else if (d > 200) move(a, e, direction.x * 36 * dt * motionScale, direction.y * 36 * dt * motionScale);
    }
  }
  function updateHazards(run, a, dt, motionScale) {
    a.hazards.forEach(function (h) {
      if (h.delay > 0) { h.delay = Math.max(0, h.delay - dt); return; }
      h.life -= dt;
      if (h.pushX && contains(h, a.player) && a.player.dashTime <= 0) move(a, a.player, h.pushX * dt, 0);
      if (!h.impactShown && !h.cosmetic) { h.impactShown = true; effect(a, 'impact', h.x, h.y, { r: h.r || 26, color: h.color, life: 0.4 }); }
      if (!h.cosmetic && (!h.hit || h.repeat) && contains(h, a.player)) {
        if (a.player.invulnerable > 0) countDodge(a, h);
        else if (applyHit(run, a, h.damage, h) && !h.repeat) h.hit = true;
      }
    });
    a.hazards = a.hazards.filter(function (h) { return h.life > 0; });
    a.projectiles.forEach(function (b) {
      var dx = b.vx * dt * motionScale, dy = b.vy * dt * motionScale;
      var steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(4, b.r)));
      for (var i = 0; i < steps && b.life > 0; i++) {
        b.x += dx / steps; b.y += dy / steps;
        if (b.x < 30 || b.x > 930 || b.y < 45 || b.y > 515 || a.obstacles.some(function (o) { return circleRect(b.x, b.y, b.r, o); })) { b.life = 0; break; }
        if (dist(b, a.player) <= b.r + a.player.r) {
          if (a.player.invulnerable > 0) { countDodge(a, b); if (a.player.dashTime <= 0) b.life = 0; }
          else { applyHit(run, a, b.damage, b); b.life = 0; }
        }
      }
      b.life -= dt;
    });
    a.projectiles = a.projectiles.filter(function (b) { return b.life > 0; });
  }
  function dashBurst(run, a) {
    effect(a, 'dash', a.player.x, a.player.y, { r: has(run, 'thunderstep') ? 100 : 25, color: '#a3d9ff' });
    if (has(run, 'thunderstep')) targets(a).filter(function (e) { return dist(e, a.player) <= 100 + e.r; }).forEach(function (e) { directDamage(run, a, e, 10); });
  }
  function update(run, deltaSeconds, input) {
    var a = ensure(run); if (!a) return run.arena || null;
    var raw = Number(deltaSeconds), dt = Number.isFinite(raw) ? clamp(raw, 0, 0.1) : 0;
    if (!dt) return a;
    input = input || {}; var p = a.player;
    var focusRequested = !!input.focus;
    a.focusActive = focusRequested && p.focusEnergy > 0;
    if (focusRequested) p.focusEnergy = Math.max(0, p.focusEnergy - dt * 12);
    else p.focusEnergy = Math.min(100, p.focusEnergy + dt * 25);
    var worldDt = dt * (a.focusActive ? 0.18 : 1);
    a.realTime += dt; a.time += worldDt;
    a.introRemaining = Math.max(0, (a.introRemaining || 0) - dt);
    run.elapsed += dt; run.stats.elapsed = run.elapsed; run.spell.elapsed += dt;
    p.invulnerable = Math.max(0, p.invulnerable - dt); p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    var ix = Number(input.x) || 0, iy = Number(input.y) || 0, magnitude = Math.hypot(ix, iy);
    if (!Number.isFinite(magnitude)) { ix = 0; iy = 0; magnitude = 0; }
    if (magnitude > 1) { ix /= magnitude; iy /= magnitude; }
    if (magnitude && !focusRequested) { p.facingX = ix; p.facingY = iy; }
    if (input.dash && !a.dashHeld && p.dashCooldown <= 0 && p.dashTime <= 0) {
      var facing = unit(!focusRequested && magnitude ? ix : p.facingX, !focusRequested && magnitude ? iy : p.facingY);
      p.dashX = facing.x; p.dashY = facing.y; p.dashTime = 0.22; p.dashCooldown = has(run, 'gale') ? 1.15 : 1.4; p.invulnerable = 0.28;
      a.dashes += 1; effect(a, 'dash', p.x, p.y, { x2: p.x + p.dashX * 50, y2: p.y + p.dashY * 50, life: 0.25, color: '#9cdaff' });
    }
    a.dashHeld = !!input.dash;
    if (p.dashTime > 0) {
      var dashDt = Math.min(dt, p.dashTime);
      move(a, p, p.dashX * 760 * dashDt, p.dashY * 760 * dashDt);
      p.dashTime = Math.max(0, p.dashTime - dt);
      if (p.dashTime === 0) dashBurst(run, a);
    } else if (!focusRequested) {
      var speed = 180 * (has(run, 'gale') ? 1.22 : 1);
      move(a, p, ix * speed * dt, iy * speed * dt);
    }
    if (run.status !== 'combat') return a;
    a.slowTime = Math.max(0, a.slowTime - dt);
    var motionScale = a.slowTime > 0 ? 0.65 : 1;
    if (run.enemy.phase !== a.previousPhase) {
      a.previousPhase = run.enemy.phase;
      a.projectiles = []; a.hazards = a.hazards.filter(function (h) { return h.source === 'trap'; });
      effect(a, 'phase', a.enemies[0].x, a.enemies[0].y, { name: run.enemy.name + ' · 第二階段', text: '第二階段 · 封印崩解', r: 120, life: 1.3, color: '#ffd3a0' });
      if (run.enemy.kind === 'boss') {
        var phaseBoss = a.enemies[0];
        phaseBoss.volley = null;
        [115, 215].forEach(function (radius, index) { hazard(a, { kind: 'ring', source: 'boss', ownerId: phaseBoss.id,
          x: phaseBoss.x, y: phaseBoss.y, r: radius, innerR: radius - 25, delay: 1.3 + index * 0.5, life: 0.4,
          damage: 9 + run.region * 2, color: '#ffd3a0' }); });
        run.enemy.intent.remaining = Math.max(2.7, run.enemy.intent.remaining);
      }
    }
    advanceCompanions(run, a, worldDt);
    if (run.status !== 'combat') { updateTarget(a); return a; }
    advanceRoom(run, a, worldDt);
    a.enemies.forEach(function (e) { if (run.status === 'combat') enemyAI(run, a, e, worldDt, motionScale); });
    run.enemy.intent.remaining = Math.max(0, run.enemy.intent.remaining - worldDt);
    if (run.enemy.intent.remaining <= 0) intentPattern(run, a);
    updateHazards(run, a, worldDt, motionScale);
    a.effects.forEach(function (e) { e.life -= dt; }); a.effects = a.effects.filter(function (e) { return e.life > 0; });
    updateTarget(a); return a;
  }
  function cast(run, text) {
    var a = ensure(run);
    if (!a) return { ok: false, message: '目前不在戰鬥中。' };
    var possible = targets(a), target = possible[0];
    if (!target) return { ok: false, message: '下一波敵人正在進場，利用空檔移動與恢復專注。' };
    if (dist(target, a.player) > RANGE + target.r) return { ok: false, message: '敵人超出咒語射程，先靠近再施法。' };
    var type = run.spell.type, word = run.spell.word, result = Engine.submit(run, text, { damageLimit: possible.reduce(function (sum, e) { return sum + e.hp; }, 0) });
    if (!result.ok) {
      if (run.status === 'lost') effect(a, 'death', a.player.x, a.player.y, { r: 34, life: 1.3, color: '#b8d5ff',
        actor: { id: 'player', kind: 'player', sprite: 'player', x: a.player.x, y: a.player.y, r: a.player.r } });
      return result;
    }
    a.casts += 1;
    var facing = unit(target.x - a.player.x, target.y - a.player.y); a.player.facingX = facing.x; a.player.facingY = facing.y;
    effect(a, 'cast', a.player.x, a.player.y, { x2: target.x, y2: target.y, targetId: target.id,
      spellType: type, spellWord: word, color: type === 'heal' ? '#88e7bf' : type === 'shield' ? '#89d6ff' : type === 'signature' ? '#f8d294' : '#c2a3ff', life: 0.45 });
    distribute(a, result.damage || 0, target);
    var echo = a.companions.find(function (c) { return c.npcId === 'echo' && c.cooldown <= 0; });
    if (echo && run.status === 'combat') {
      echo.cooldown = 2.5;
      a.echoQueue.push({ delay: 0.65, targetId: target.id, spellType: type, spellWord: word,
        damage: result.damage > 0 ? clamp(Math.round(result.damage * 0.3), 3, 12) : 0,
        heal: clamp(Math.round((result.heal || 0) * 0.3), 0, 8), shield: clamp(Math.round((result.shield || 0) * 0.3), 0, 8) });
    }
    if (has(run, 'starlace') && run.status === 'combat') {
      var chained = targets(a, target).find(function (e) { return e.id !== target.id && dist(e, target) <= 180 + e.r; });
      if (chained) { var extra = directDamage(run, a, chained, 8); result.damage += extra;
        effect(a, 'chain', target.x, target.y, { x2: chained.x, y2: chained.y, color: '#bcecff', life: 0.4 }); }
    }
    if (has(run, 'frostglass') || word === 'frost') a.slowTime = Math.max(a.slowTime, 2);
    updateTarget(a); return result;
  }
  function useItem(run, id) {
    var a = ensure(run), available = a ? targets(a) : [], target = available[0];
    if (a && id === 'bomb' && !target) return { ok: false, message: '下一波敵人尚未出現，先保留炸彈。' };
    var result = Engine.useItem(run, id, { damageLimit: a ? available.reduce(function (sum, e) { return sum + e.hp; }, 0) : Infinity });
    if (result.ok && a) {
      if (result.damage) { distribute(a, result.damage, target); effect(a, 'bomb', target ? target.x : a.player.x, target ? target.y : a.player.y, { r: 95, life: 0.65, color: '#ffca86' }); }
      if (id === 'hourglass') { a.slowTime = Math.max(a.slowTime, 6); a.enemies.forEach(function (e) { e.cooldown += 2; }); }
      if (id === 'potion' || id === 'barrier') effect(a, id === 'potion' ? 'heal' : 'shield', a.player.x, a.player.y, { r: 32, color: id === 'potion' ? '#89e4ac' : '#9edcff' });
      updateTarget(a);
    }
    return result;
  }
  function getSummary(run) {
    var a = run && run.arena;
    return a ? { room: a.room.name, mutator: a.room.mutator, enemiesAlive: living(a).length, activeEnemies: targets(a).length,
      wavesReleased: a.wavesReleased, casts: a.casts, dodges: a.dodges, dashes: a.dashes, hitsTaken: a.hitsTaken,
      focusEnergy: Math.round(a.player.focusEnergy), focusActive: a.focusActive, dashReady: a.player.dashCooldown <= 0,
      time: a.realTime, pattern: a.lastPattern } : null;
  }
  return { ensure: ensure, update: update, cast: cast, useItem: useItem, getSummary: getSummary, ROOMS: ROOMS,
    WIDTH: WIDTH, HEIGHT: HEIGHT, CAST_RANGE: RANGE };
});
