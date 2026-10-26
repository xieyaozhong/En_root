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
    { id: 'eclipse', type: 'eclipse', name: '蝕月祭壇', description: '中央祭壇依序放出擴散月環。留在環與環之間，或趁預警衝過將爆發的月環。', mutator: '擴散月環' },
    { id: 'starlanes', type: 'starlanes', name: '流轉星軌', description: '四條星軌輪流留下一條安全通道。金粉浮起後，找到沒有光帶的那一列再施法。', mutator: '移動安全通道' },
    { id: 'bloom', type: 'bloom', name: '月花願庭', description: '三朵月花每八秒甦醒，走入花心可恢復 6 點生命；花外圓環稍後爆發，別停在花瓣邊緣。', mutator: '採集治癒月花' },
    { id: 'comet', type: 'comet', name: '彗光渡橋', description: '細線預告彗星航道，稍後真正的星核會從兩側掠過。避開飛行中的星核，善用它們之間的空隙。', mutator: '雙向彗星穿越' }
  ];
  var ACTOR_NAMES = { chaser: '逐光獵影', ranged: '符箭侍從', charger: '重甲破陣者' };
  var FORMATIONS = {
    balanced: { name: '混合守軍', description: '追擊者、射手與衝撞者共同守衛房間', roles: ['chaser', 'ranged', 'charger'], spots: [[640, 280], [760, 135], [760, 435], [520, 110], [540, 450]] },
    pack: { name: '追獵群集', description: '多名追擊者結群逼近，從側面拉開距離', roles: ['chaser', 'chaser', 'chaser', 'ranged', 'charger'], spots: [[565, 245], [650, 180], [680, 350], [755, 255], [550, 415]] },
    crossfire: { name: '交叉射陣', description: '射手分散在上下兩翼，留意交叉飛彈', roles: ['ranged', 'ranged', 'chaser', 'ranged', 'ranged'], spots: [[610, 135], [780, 280], [610, 435], [485, 115], [850, 425]] },
    rush: { name: '破陣突襲', description: '衝撞者與追擊者交替進攻，預留橫向閃避空間', roles: ['charger', 'chaser', 'charger', 'chaser', 'charger'], spots: [[565, 195], [720, 360], [600, 430], [800, 150], [470, 280]] }
  };
  var LAYOUTS = ['西側入口', '倒置側翼', '東側入口'];
  var OMEN_DETAILS = {
    none: '',
    haste: '疾風異象：敵人移動速度增加 15%，飛彈速度不變。',
    ward: '符甲異象：敵群額外獲得 12 點護盾。',
    fortune: '豐饒異象：敵群生命增加 12%，勝利可獲得額外金幣。'
  };
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function has(run, id) { return (run.relics || []).some(function (r) { return r.id === id; }); }
  function hash(value) { var h = 2166136261, str = String(value); for (var i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function unit(x, y) { var n = Math.hypot(x, y); return n ? { x: x / n, y: y / n } : { x: 1, y: 0 }; }
  function cue(a, kind, boss) { a.cue = { id: a.nextId++, kind: kind, boss: !!boss }; }
  function meleeBoss(e) { return e && e.kind === 'boss' && (['king', 'prism'].indexOf(e.id) >= 0 || ['smith', 'sentinel'].indexOf(e.npcId) >= 0); }
  function face(e, x, y) { var direction = unit(x - e.x, y - e.y); e.facingX = direction.x; e.facingY = direction.y; return Math.atan2(direction.y, direction.x); }
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
  function layoutPoint(x, y, layout) {
    return { x: layout === 2 ? WIDTH - x : x, y: layout === 1 ? 560 - y : y };
  }
  function arrangeRoom(a, layout) {
    var start = layoutPoint(a.player.x, a.player.y, layout);
    a.player.x = start.x; a.player.y = start.y;
    a.player.facingX = a.player.dashX = layout === 2 ? -1 : 1;
    a.obstacles.forEach(function (box, index) {
      if (layout === 1) { box.y = 560 - box.y - box.h; box.x += index % 2 ? 55 : -40; }
      else if (layout === 2) { box.x = WIDTH - box.x - box.w; box.y += index % 2 ? 24 : -24; }
      box.x = clamp(box.x, 275, 840 - box.w);
      box.y = clamp(box.y, 100, 460 - box.h);
    });
    a.hazards.forEach(function (h) {
      var position = layoutPoint(h.x, h.y, layout); h.x = position.x; h.y = position.y;
    });
    if (a.room.spring) Object.assign(a.room.spring, layoutPoint(a.room.spring.x, a.room.spring.y, layout));
    (a.room.blossoms || []).forEach(function (flower) { Object.assign(flower, layoutPoint(flower.x, flower.y, layout)); });
  }
  function placeFormationActor(a, body, preferredX, preferredY) {
    function clear(x, y) {
      return validPosition(a, body, x, y) && Math.hypot(x - a.player.x, y - a.player.y) >= 180 &&
        a.enemies.every(function (other) { return Math.hypot(x - other.x, y - other.y) >= body.r + other.r + 18; });
    }
    if (clear(preferredX, preferredY)) { body.x = preferredX; body.y = preferredY; return; }
    var best = null, score = Infinity;
    for (var y = 95; y <= 465; y += 25) for (var x = 80; x <= 880; x += 25) {
      var distance = Math.hypot(x - preferredX, y - preferredY);
      if (distance < score && clear(x, y)) { best = { x: x, y: y }; score = distance; }
    }
    if (best) { body.x = best.x; body.y = best.y; }
    else place(a, body, preferredX, preferredY);
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
    if (run.region === 3) room = Object.assign({}, ROOMS[10 + (hash(run.seed) + run.encounter) % 3]);
    if (run.currentRoute && run.currentRoute.storyRoom) room = Object.assign({}, ROOMS.find(function (r) { return r.id === run.currentRoute.storyRoom; }) || room);
    if (boss) room = { id: 'boss-' + run.enemy.id, type: 'boss', name: run.enemy.name + '・封印殿',
      description: run.enemy.description, mutator: '雙階段首領戰' };
    var route = run.currentRoute || {}, plan = null, formation = FORMATIONS.balanced;
    if (run.randomWorldVersion === 1 && !boss && !route.storyRoom && !(run.bondQuest && run.bondQuest.active) &&
        (route.type === 'battle' || route.type === 'elite') && typeof Engine.getFloorPlan === 'function') plan = Engine.getFloorPlan(run);
    if (plan) {
      room = Object.assign({}, ROOMS.find(function (r) { return r.id === plan.roomId; }) || room);
      room.layout = plan.layout === 1 || plan.layout === 2 ? plan.layout : 0;
      room.formation = FORMATIONS[plan.formation] ? plan.formation : 'balanced';
      room.omen = Object.prototype.hasOwnProperty.call(OMEN_DETAILS, plan.omen) ? plan.omen : 'none';
      formation = FORMATIONS[room.formation];
      room.mutator += '・' + formation.name + '・' + LAYOUTS[room.layout];
      room.description += ' ' + formation.description + '。' + LAYOUTS[room.layout] + '，敵人配置與掩體隨入口變化。';
      if (OMEN_DETAILS[room.omen]) {
        room.mutator += '・' + OMEN_DETAILS[room.omen].split('：')[0];
        room.description += ' ' + OMEN_DETAILS[room.omen];
      }
    }
    var a = run.arena = {
      version: 1, key: key, width: WIDTH, height: HEIGHT, bounds: { left: 40, top: 58, right: 920, bottom: 500 },
      player: { x: 200, y: 280, r: 12, facingX: 1, facingY: 0, dashTime: 0, dashCooldown: 0, invulnerable: 0,
        dashX: 1, dashY: 0, dashBuffer: 0, focusEnergy: 100 },
      enemies: [], obstacles: [], hazards: [], projectiles: [], effects: [], room: room, time: 0, realTime: 0,
      casts: 0, dodges: 0, dashes: 0, hitsTaken: 0, nextId: 1, roomClock: 2.5, roomPulse: 0, springClock: 0,
      slowTime: 0, focusActive: false, targetId: null, castRange: RANGE, wavesReleased: 1,
      dashHeld: false, previousPhase: run.enemy.phase, lastPattern: null, patternCount: 0,
      introRemaining: boss ? 1.2 : 0, companions: [], echoQueue: [], bossShots: [], sporeTrail: [],
      sporeTrailClock: 0, enemyMoveScale: plan && room.omen === 'haste' ? 1.15 : 1, ritual: null, counterHits: 0, interrupts: 0
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
    if (room.id === 'bloom') a.room.blossoms = [{ x: 260, y: 170, r: 28, ready: false }, { x: 700, y: 170, r: 28, ready: false }, { x: 480, y: 405, r: 28, ready: false }];
    if (room.id === 'comet') a.room.comets = [];
    if (plan) arrangeRoom(a, room.layout);
    var count = boss ? 1 : room.id === 'waves' ? 5 : run.enemy.kind === 'elite' ? 5 : 3 + run.region % 2;
    var original = run.enemy.maxHp, remaining = run.enemy.hp, maxUsed = 0, hpUsed = 0;
    var spots = formation.spots;
    for (var i = 0; i < count; i++) {
      var maxHp = i === count - 1 ? original - maxUsed : Math.floor(original / count); maxUsed += maxHp;
      var hp = i === count - 1 ? remaining - hpUsed : Math.floor(remaining / count); hpUsed += hp;
      var kind = boss ? 'boss' : formation.roles[i % formation.roles.length];
      var spawnAt = room.id === 'waves' ? i < 2 ? 0 : i < 4 ? 4.5 : 9 : 0;
      var enemy = { id: boss ? run.enemy.id : run.enemy.id + '-' + i, kind: kind, npcId: run.enemy.npcId || null,
        sprite: boss ? run.enemy.sprite || run.enemy.id : run.region === 3 || run.bondQuest && run.bondQuest.active ? ['stardust', 'starling', 'astrolabe'][i % 3] : kind === 'ranged' ? 'eye' : kind === 'charger' ? 'knight' : run.enemy.id,
        name: boss ? run.enemy.name : ACTOR_NAMES[kind], x: 0, y: 0, r: boss ? 30 : kind === 'charger' ? 20 : 16,
        hp: hp, maxHp: maxHp, alive: hp > 0, active: spawnAt === 0, spawnAt: spawnAt, phase: run.enemy.phase,
        cooldown: 1.8 + i * 0.3, telegraph: 0, chargeX: 0, chargeY: 0, chargeTime: 0, volley: null, hurt: 0,
        facingX: -1, facingY: 0, action: null, counterWindow: 0, perfectWindow: 0, counterReady: false };
      var spawn = plan ? layoutPoint(spots[i][0], spots[i][1], room.layout) : { x: spots[i][0], y: spots[i][1] };
      if (plan) placeFormationActor(a, enemy, spawn.x, spawn.y); else place(a, enemy, spawn.x, spawn.y);
      a.enemies.push(enemy);
    }
    if (!run.difficulty) run.difficulty = 'standard';
    syncCompanions(run, a);
    if (boss) effect(a, 'boss-intro', a.enemies[0].x, a.enemies[0].y, { name: run.enemy.name, text: '封印解除', r: 130, life: 1.2, color: '#ffb27c' });
    updateTarget(a); return a;
  }
  function syncCompanions(run, a) {
    var saved = Array.isArray(a.companions) ? a.companions : [];
    var opponent = run.enemy && run.enemy.isNpcBoss ? run.enemy.npcId : null;
    a.companions = (Array.isArray(run.companions) ? run.companions : []).filter(function (c, index, list) {
      // A recruited traveler can be met again. During their duel they appear
      // only as the opponent; the run roster remains intact for the next room.
      return c && c.id !== opponent && ['lantern', 'echo', 'sentinel', 'lumina'].indexOf(c.id) >= 0 && list.findIndex(function (other) { return other && other.id === c.id; }) === index;
    }).slice(0, 4).map(function (c, i) {
      var existing = saved.find(function (body) { return body.npcId === c.id; });
      var body = Object.assign({ x: a.player.x - 36, y: a.player.y + (i - 1) * 26, r: 11, cooldown: c.id === 'echo' ? 0 : 2 + i, castFlash: 0 }, existing || {},
        { id: 'companion-' + c.id, npcId: c.id, name: c.name, sprite: c.sprite || c.id, color: c.color || '#b9deff', role: c.role });
      if (!Number.isFinite(body.x) || !Number.isFinite(body.y) || !validPosition(a, body, body.x, body.y)) place(a, body, a.player.x - 35, a.player.y);
      return body;
    });
    if (!Array.isArray(a.echoQueue)) a.echoQueue = [];
    else if (opponent) a.echoQueue = a.echoQueue.filter(function (echo) { return (echo.npcId || 'echo') !== opponent; });
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
      } else if (c.npcId === 'lumina') {
        c.cooldown = 10;
        var recovery = Engine.healPlayer(run, 4);
        var starShield = Math.min(2, Math.max(0, 24 - run.player.shield));
        run.player.shield += starShield;
        if (recovery || starShield) companionCast(a, c, a.player, recovery ? 'heal' : 'shield', 'light');
      } else if (c.npcId === 'sentinel') {
        var target = targets(a, c).find(function (enemy) { return dist(enemy, c) <= 230; });
        if (target) { c.cooldown = 4.5; companionCast(a, c, target, 'strike'); directDamage(run, a, target, 5 + Math.min(3, run.region)); }
      }
    });
    a.echoQueue.forEach(function (echo) {
      echo.delay -= dt;
      if (echo.delay > 0 || echo.done || run.status !== 'combat') return;
      echo.done = true;
      var companion = a.companions.find(function (c) { return c.npcId === (echo.npcId || 'echo'); });
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
        actor: { id: actor.id, npcId: actor.npcId, sprite: actor.sprite, kind: actor.kind, name: actor.name, x: actor.x, y: actor.y, r: actor.r, phase: actor.phase,
          facingX: actor.facingX, facingY: actor.facingY, action: actor.action } });
      actor.action = null; actor.chargeTime = 0; actor.counterWindow = 0; actor.perfectWindow = 0; actor.counterReady = false;
      a.hazards = a.hazards.filter(function (h) { return h.ownerId !== actor.id; });
      a.projectiles = a.projectiles.filter(function (shot) { return shot.ownerId !== actor.id; });
      a.bossShots = (a.bossShots || []).filter(function (shot) { return shot.ownerId !== actor.id; });
      if (a.ritual && a.ritual.bossId === actor.id && a.ritual.status === 'charging') a.ritual.status = 'cancelled';
    }
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
    if (result.damage > 0) a.enemies.forEach(function (e) { e.counterReady = false; });
    effect(a, 'hit', p.x, p.y, { color: result.damage ? '#ff847a' : '#8ad6ff', life: 0.3, r: 22 });
    if (run.status === 'lost') effect(a, 'death', p.x, p.y, { r: 34, life: 1.3, color: '#b8d5ff', actor: { id: 'player', kind: 'player', sprite: 'player', x: p.x, y: p.y, r: p.r } });
    if (result.restored > 0) {
      var recipient = a.enemies.find(function (e) { return e.id === source.ownerId; }) || living(a)[0];
      if (recipient) recipient.hp = Math.min(recipient.maxHp, recipient.hp + result.restored);
    }
    return true;
  }
  function countDodge(a, danger) {
    if (a.player.dashTime > 0 && !danger.dodgeCounted) {
      danger.dodgeCounted = true; a.dodges += 1;
      var owner = a.enemies.find(function (e) { return e.id === (danger.ownerId || danger.id) && e.alive; });
      if (owner) {
        var action = owner.action;
        var safe = !action || action.stage === 'stagger' || action.stage === 'recovery' && (!action.attacks || action.combo >= action.attacks.length);
        if (safe) {
          owner.perfectWindow = Math.max(owner.perfectWindow || 0, 2.5);
          owner.counterWindow = Math.max(owner.counterWindow || 0, 2.5);
        } else owner.counterReady = true;
        effect(a, 'counter', owner.x, owner.y, { text: safe ? '精準閃避 · 反擊 ×2' : '精準閃避 · 等待連段結束', r: owner.r + 30, color: safe ? '#b8fff0' : '#ffdda6', life: 1.2 });
        cue(a, 'perfect-dodge', owner.kind === 'boss');
      }
    }
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
    if (h.kind === 'arc') {
      if (d > h.r + p.r || d < (h.innerR || 0) - p.r) return false;
      var offset = Math.atan2(Math.sin(Math.atan2(p.y - h.y, p.x - h.x) - h.angle), Math.cos(Math.atan2(p.y - h.y, p.x - h.x) - h.angle));
      return Math.abs(offset) <= h.spread / 2 + Math.asin(Math.min(1, p.r / Math.max(p.r, d)));
    }
    return h.kind === 'ring' ? d <= h.r + p.r && d >= (h.innerR || h.r - 24) - p.r : d <= h.r + p.r;
  }
  function setAction(a, e, spec) {
    e.action = Object.assign({ id: 'action-' + a.nextId++, kind: 'spell', stage: 'windup', elapsed: 0, duration: 1,
      progress: 0, name: '蓄力', combo: 1, angle: Math.atan2(e.facingY || 0, Number.isFinite(e.facingX) ? e.facingX : -1), recovery: 1.4 }, spec);
    e.telegraph = e.action.stage === 'windup' ? e.action.duration : 0;
    e.action.comboTotal = e.action.attacks ? e.action.attacks.length : 1;
    if (e.action.stage === 'windup') { e.counterWindow = 0; e.perfectWindow = 0; }
    if (e.kind === 'boss') cue(a, e.action.stage === 'stagger' ? 'recover' : 'windup', true);
    return e.action;
  }
  function meleeSequence(run, e, damage) {
    var phase = run.enemy.phase, turn = run.enemy.turn, boss = e.kind === 'boss';
    if (!boss) return [{ name: e.kind === 'charger' ? '破陣衝撞' : '獵影揮擊', kind: e.kind === 'charger' ? 'charge' : 'melee',
      windup: e.kind === 'charger' ? 1.05 : 0.85, active: e.kind === 'charger' ? 0.6 : 0.26, recovery: e.kind === 'charger' ? 1.3 : 0.8,
      r: e.kind === 'charger' ? 230 : 83, spread: 2.05, lunge: e.kind === 'charger' ? 365 : 55, damage: damage,
      motion: e.kind === 'charger' ? 'charge' : 'claw' }];
    var id = e.npcId || e.id, heavy = id === 'king' || id === 'smith';
    var list = [{ name: id === 'king' ? '失名延遲斬' : id === 'prism' ? '鏡爪伏擊' : id === 'smith' ? '熔星落鎚' : '紙鋒拔刀',
      kind: 'melee', windup: heavy ? 1.55 : 1.15, active: 0.28, recovery: 0.16, r: heavy ? 185 : 165,
      spread: heavy ? 2.45 : 1.85, lunge: heavy ? 110 : 190, damage: Math.max(18, damage + 4), motion: heavy ? 'overhead' : 'claw' },
      { name: heavy ? '追身橫斬' : '折返追刃', kind: 'melee', windup: heavy ? 0.78 : 0.68, active: 0.26,
        recovery: 1.9, r: heavy ? 190 : 180, spread: 2.35, lunge: 150, damage: Math.max(17, damage + 2), motion: 'sweep' }];
    if (id === 'king') {
      list[0].spread = 1.1; list[0].r = 215;
      list[1].spread = 2.7; list[1].windup = 0.9;
    } else if (id === 'smith') {
      Object.assign(list[0], { name: '熔星懸鎚', windup: 1.85, r: 175, spread: 1.35, lunge: 60 });
      Object.assign(list[1], { name: '鐵砧橫掃', windup: 1.05, r: 155, spread: 2.85, lunge: 45, recovery: 2.15 });
    } else if (id === 'sentinel') {
      Object.assign(list[0], { name: '紙鋒蓄刺', motion: 'thrust', windup: 1.25, r: 235, spread: 0.85, lunge: 150 });
      Object.assign(list[1], { name: '摺紙迴斬', windup: 0.9, r: 170, spread: 2.6, lunge: 65, recovery: 2 });
    } else if (id === 'prism') {
      Object.assign(list[0], { name: '鏡爪伏擊', windup: 1.1, r: 165, spread: 1.75 });
      Object.assign(list[1], { name: '裂光反爪', motion: 'claw', windup: 0.8, r: 185, spread: 2.1, recovery: 2 });
    }
    if (phase === 2 && turn % 2 === 0) {
      list[1].recovery = 0.18;
      list.push({ name: heavy ? '墜王重擊' : '裂鏡終刺', kind: 'melee', windup: heavy ? 1.25 : 0.95, active: 0.32,
        recovery: 2.15, r: 225, spread: heavy ? 1.5 : 1.35, lunge: 220, damage: Math.max(24, damage + 9), motion: heavy ? 'overhead' : 'thrust' });
      if (id === 'smith') Object.assign(list[2], { name: '星鐵終鎚', windup: 1.5, lunge: 75, recovery: 2.4 });
      if (id === 'sentinel') Object.assign(list[2], { name: '穿頁終刺', r: 260, spread: 0.85, windup: 1.05 });
    }
    return list;
  }
  function beginMelee(run, a, e, damage) {
    var attacks = meleeSequence(run, e, damage), attack = attacks[0];
    face(e, a.player.x, a.player.y);
    setAction(a, e, { kind: attack.kind, motion: attack.motion, name: attack.name, duration: attack.windup, attacks: attacks, combo: 1, locked: false });
    a.lastPattern = e.kind === 'boss' ? attack.name + ' · 讀取抬手，連擊後反擊' : a.lastPattern;
  }
  function lockAttack(a, e, action, attack) {
    action.locked = true; action.angle = face(e, a.player.x, a.player.y);
    e.chargeX = Math.cos(action.angle); e.chargeY = Math.sin(action.angle); e.dodgeCounted = false;
    var delay = Math.max(0, action.duration - action.elapsed);
    if (attack.kind === 'charge') {
      hazard(a, { kind: 'line', x: e.x, y: e.y, x2: clamp(e.x + e.chargeX * attack.r, 55, 905),
        y2: clamp(e.y + e.chargeY * attack.r, 73, 485), width: e.r * 2, delay: delay, life: 0.08,
        cosmetic: true, damage: 0, ownerId: e.id, actionId: action.id, combo: action.combo, warningOnly: true, color: '#ffa46d' });
    } else {
      hazard(a, { kind: 'arc', x: e.x, y: e.y, r: attack.r, innerR: 0, angle: action.angle, spread: attack.spread,
        delay: delay, life: attack.active, hitStart: attack.motion === 'thrust' ? 0.28 : 0.18, hitEnd: 0.94,
        damage: attack.damage, ownerId: e.id, actionId: action.id, combo: action.combo, followOwner: true, source: e.kind === 'boss' ? 'boss' : 'enemy',
        color: e.kind === 'boss' ? '#ffac78' : '#edbd9b' });
    }
  }
  function advanceAction(run, a, e, dt, motionScale) {
    var action = e.action;
    if (!action) return false;
    if (action.ritual) return true;
    action.elapsed += dt; action.progress = clamp(action.elapsed / action.duration, 0, 1);
    if (action.stage === 'stagger') {
      e.counterWindow = Math.max(e.counterWindow || 0, Math.max(0, action.duration - action.elapsed));
      if (action.progress >= 1) e.action = null;
      return true;
    }
    var attack = action.attacks && action.attacks[action.combo - 1];
    if (action.stage === 'windup') {
      e.telegraph = Math.max(0, action.duration - action.elapsed);
      if (attack && !action.locked) {
        action.angle = face(e, a.player.x, a.player.y);
        if (action.progress >= 0.52) lockAttack(a, e, action, attack);
      }
      if (action.progress >= 1) {
        action.stage = 'active'; action.elapsed = 0; action.progress = 0; action.duration = attack ? attack.active : action.active || 0.35;
        e.telegraph = 0;
        if (attack && attack.kind === 'charge') e.chargeTime = action.duration;
        if (e.kind === 'boss') cue(a, 'swing', true);
      }
    } else if (action.stage === 'active') {
      if (attack && attack.lunge) {
        move(a, e, Math.cos(action.angle) * attack.lunge * dt * motionScale, Math.sin(action.angle) * attack.lunge * dt * motionScale);
        if (attack.kind === 'charge') {
          e.chargeTime = Math.max(0, action.duration - action.elapsed);
          if (dist(e, a.player) <= e.r + a.player.r) {
            if (a.player.invulnerable > 0) countDodge(a, e);
            else applyHit(run, a, attack.damage, { ownerId: e.id });
          }
        }
      }
      if (action.progress >= 1) {
        action.stage = 'recovery'; action.elapsed = 0; action.progress = 0; action.duration = attack ? attack.recovery : action.recovery;
        e.chargeTime = 0;
        if (!attack || action.combo === action.attacks.length) {
          if (e.counterReady) {
            action.duration = Math.max(action.duration, 2.5); e.perfectWindow = action.duration; e.counterReady = false;
          }
          e.counterWindow = Math.max(e.counterWindow || 0, action.duration);
          if (e.kind === 'boss') cue(a, 'recover', true);
        }
      }
    } else if (action.stage === 'recovery' && action.progress >= 1) {
      if (attack && action.combo < action.attacks.length) {
        action.combo += 1; attack = action.attacks[action.combo - 1];
        action.stage = 'windup'; action.name = attack.name; action.kind = attack.kind; action.motion = attack.motion;
        action.duration = attack.windup; action.elapsed = 0; action.progress = 0; action.locked = false;
        if (e.kind === 'boss') cue(a, 'windup', true);
      } else e.action = null;
    }
    return true;
  }
  var RITUAL_WORDS = [['sun', 'ash', 'seal'], ['ice', 'moon', 'bind'], ['star', 'dawn', 'ward'], ['root', 'rain', 'bloom']];
  function startRitual(run, a, boss, intent) {
    boss.counterReady = false;
    var duration = run.difficulty === 'story' ? 14 : run.difficulty === 'veteran' ? 11 : 12;
    var names = { thorn: '萬棘葬歌', spore: '孢冠永夜', witch: '月鏡崩解', prism: '千面破界', king: '末頁湮滅',
      hollow: '第十三聲終鐘', astral: '忘誓星墜', cometqueen: '彗冕滅世', constellation: '雙星無歸' };
    a.ritual = { id: 'ritual-' + a.nextId++, bossId: boss.id, name: names[boss.id] || boss.name + '・禁式',
      groups: RITUAL_WORDS[(hash(boss.id) + run.enemy.turn) % RITUAL_WORDS.length].slice(), index: 0,
      remaining: duration, duration: duration, status: 'charging', damage: Math.max(42, Math.round(run.player.maxHp * 0.32) + run.region * 3),
      message: '連續輸入三組符文，打斷禁式；倒數不受詠唱減速影響。' };
    face(boss, a.player.x, a.player.y);
    setAction(a, boss, { kind: 'spell', name: a.ritual.name, duration: duration, ritual: true });
    a.lastPattern = a.ritual.name + ' · 三重破咒';
    effect(a, 'ritual', boss.x, boss.y, { text: '三重破咒', color: '#f2a4db', r: 100, life: 1.5 });
    cue(a, 'ritual-start', true);
  }
  function getInterrupt(run) {
    var ritual = run && run.status === 'combat' && run.arena && run.arena.ritual;
    return ritual && ritual.status === 'charging' && ritual.remaining > 0 ? ritual : null;
  }
  function submitInterrupt(run, text) {
    var ritual = getInterrupt(run), a = run && run.arena;
    if (!ritual) return { ok: false, reason: 'inactive', completed: false, message: '目前沒有需要打斷的禁式。' };
    var word = ritual.groups[ritual.index], entered = String(text || '').trim().toLowerCase();
    if (entered !== word) {
      ritual.remaining = Math.max(0, ritual.remaining - 0.65);
      return { ok: false, reason: 'mismatch', completed: false, index: ritual.index, word: word, message: '符文未吻合，倒數減少 0.65 秒；已完成的段落保留。' };
    }
    ritual.index += 1;
    var completed = ritual.index === 3, boss = a.enemies.find(function (e) { return e.id === ritual.bossId && e.alive; });
    effect(a, 'cast', a.player.x, a.player.y, { x2: boss ? boss.x : a.player.x, y2: boss ? boss.y : a.player.y,
      targetId: ritual.bossId, spellType: 'interrupt', spellWord: word, color: '#b8fff0', life: 0.5 });
    a.casts += 1;
    if (completed) {
      ritual.status = 'broken'; ritual.message = '三重破咒成功！首領失衡，反擊傷害 ×2。';
      a.interrupts = (a.interrupts || 0) + 1;
      if (boss) { setAction(a, boss, { kind: 'spell', stage: 'stagger', duration: 3.2, name: '禁式反噬' }); boss.counterWindow = 3.2; boss.perfectWindow = 3.2; boss.counterReady = false; }
      run.enemy.intent.remaining = Math.max(run.enemy.intent.remaining, 1.2);
      effect(a, 'counter', boss ? boss.x : a.player.x, boss ? boss.y : a.player.y, { text: '禁式擊破 · 反擊 ×2', color: '#b8fff0', r: 105, life: 1.3 });
      cue(a, 'ritual-break', true);
    } else cue(a, 'ritual-step', true);
    return { ok: true, reason: completed ? 'broken' : 'matched', completed: completed, index: ritual.index,
      word: completed ? null : ritual.groups[ritual.index], message: completed ? ritual.message : '第 ' + ritual.index + ' 重封印解除。' };
  }
  function advanceRitual(run, a, dt) {
    var ritual = a.ritual;
    if (!ritual || ritual.status !== 'charging') return;
    var boss = a.enemies.find(function (e) { return e.id === ritual.bossId && e.alive; });
    if (!boss || run.status !== 'combat') { ritual.status = 'cancelled'; return; }
    ritual.remaining = Math.max(0, ritual.remaining - dt);
    if (boss.action && boss.action.ritual) {
      boss.action.elapsed = ritual.duration - ritual.remaining;
      boss.action.progress = clamp(boss.action.elapsed / ritual.duration, 0, 1); boss.telegraph = ritual.remaining;
    }
    if (ritual.remaining > 0) return;
    ritual.status = 'released'; ritual.message = '破咒未完成，' + ritual.name + ' 爆發！';
    // The arena-wide forbidden spell is a typing challenge, so dash invulnerability
    // cannot replace its three seals. Ordinary shields and revival relics still work.
    var hit = Engine.damagePlayer(run, Math.round(ritual.damage * difficulty(run).damage), { name: ritual.name + '・禁式重創' });
    ritual.damageDealt = hit.damage || 0; a.hitsTaken += 1; a.player.invulnerable = Math.max(a.player.invulnerable, 1.2);
    effect(a, 'hit', a.player.x, a.player.y, { color: '#e58aba', life: 0.6, r: 40 });
    effect(a, 'impact', boss.x, boss.y, { r: 220, color: '#ef9dd7', life: 0.85 });
    if (run.status === 'lost') effect(a, 'death', a.player.x, a.player.y, { r: 34, life: 1.3, color: '#b8d5ff',
      actor: { id: 'player', kind: 'player', sprite: 'player', x: a.player.x, y: a.player.y, r: a.player.r } });
    setAction(a, boss, { kind: 'spell', stage: 'recovery', duration: 2, name: ritual.name + '・收勢' });
    boss.counterWindow = 2; boss.counterReady = false; boss.telegraph = 0; run.enemy.intent.remaining = Math.max(run.enemy.intent.remaining, 2.5);
    cue(a, 'ritual-fail', true);
  }
  function npcPattern(run, a, boss, intent, turn, phase) {
    var npc = Engine.NPCS[run.enemy.npcId], p = a.player, damage = intent.damage;
    var base = { source: 'boss', ownerId: boss.id, damage: damage, color: npc.color };
    function mark(spec) { return hazard(a, Object.assign({}, base, spec)); }
    a.lastPattern = npc.patterns[turn % 2];
    if (npc.id === 'lumina') {
      if (turn % 2 === 0) {
        [0, 1, 2].forEach(function (i) {
          var x = 210 + i * 265;
          mark({ kind: 'line', x: x, y: 85, x2: 960 - x, y2: 475, width: phase === 2 ? 38 : 26, delay: 1.25 + i * 0.35, life: 0.4 });
        });
      } else {
        [115, 215].forEach(function (radius, i) { mark({ kind: 'ring', x: 480, y: 280, r: radius, innerR: radius - 26, delay: 1.3 + i * 0.55, life: 0.45 }); });
        if (phase === 2) mark({ x: p.x, y: p.y, r: 48, delay: 2.4, life: 0.4 });
      }
    } else if (npc.id === 'merchant') {
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
  function queueBossShot(a, boss, x, y, angle, delay, damage, speed, color, radius, shape) {
    if (!Array.isArray(a.bossShots)) a.bossShots = [];
    var dx = Math.cos(angle), dy = Math.sin(angle), distance = 1200;
    if (dx > 0.0001) distance = Math.min(distance, (905 - x) / dx);
    else if (dx < -0.0001) distance = Math.min(distance, (55 - x) / dx);
    if (dy > 0.0001) distance = Math.min(distance, (490 - y) / dy);
    else if (dy < -0.0001) distance = Math.min(distance, (70 - y) / dy);
    hazard(a, { kind: 'line', source: 'boss', ownerId: boss.id, x: x, y: y,
      x2: x + dx * Math.max(0, distance), y2: y + dy * Math.max(0, distance), width: radius * 2,
      delay: delay, life: 0.08, damage: 0, cosmetic: true, color: color });
    a.bossShots.push({ ownerId: boss.id, x: x, y: y, angle: angle, delay: delay,
      damage: damage, speed: speed, color: color, r: radius, shape: shape || 'orb' });
  }
  function advanceBossShots(run, a, dt) {
    if (run.enemy.id === 'spore') {
      if (!Array.isArray(a.sporeTrail)) a.sporeTrail = [];
      a.sporeTrailClock = (a.sporeTrailClock || 0) - dt;
      if (a.sporeTrailClock <= 0) {
        a.sporeTrailClock += 0.6;
        a.sporeTrail.push({ x: a.player.x, y: a.player.y });
        if (a.sporeTrail.length > 7) a.sporeTrail.shift();
      }
    }
    if (!Array.isArray(a.bossShots)) return;
    a.bossShots.forEach(function (shot) {
      shot.delay -= dt;
      if (shot.delay > 0 || shot.fired) return;
      shot.fired = true;
      if (!a.enemies.some(function (e) { return e.id === shot.ownerId && e.alive; })) return;
      projectile(run, a, shot.ownerId, shot.x, shot.y, shot.angle, shot.speed, shot.damage,
        { r: shot.r, color: shot.color, shape: shot.shape, source: 'boss', life: 5 });
    });
    a.bossShots = a.bossShots.filter(function (shot) { return !shot.fired; });
  }
  function alternateBossPattern(run, a, boss, intent, turn, phase) {
    var damage = intent.damage, stronger = phase === 2, p = a.player;
    function mark(spec) {
      return hazard(a, Object.assign({ source: 'boss', ownerId: boss.id, damage: damage,
        delay: 1.2, life: 0.45, color: '#c6b4f0' }, spec));
    }
    if (run.enemy.id === 'spore') {
      a.lastPattern = turn % 2 === 0 ? '孢夢追憶' : '菌冠輪生';
      if (turn % 2 === 0) {
        var remembered = (a.sporeTrail || []).slice(-(stronger ? 5 : 3));
        if (!remembered.length) remembered = [{ x: p.x, y: p.y }];
        remembered.forEach(function (position, index) {
          mark({ x: clamp(position.x, 85, 875), y: clamp(position.y, 95, 465), r: stronger ? 54 : 44,
            delay: 1.15 + index * 0.4, life: stronger ? 0.7 : 0.45, color: '#d7ba8f' });
        });
      } else {
        (stronger ? [85, 155, 225, 295] : [85, 170, 255]).forEach(function (radius, index) {
          mark({ kind: 'ring', x: boss.x, y: boss.y, r: radius, innerR: radius - 24,
            delay: 1.2 + index * 0.5, life: 0.4, color: '#d1cf95' });
        });
      }
    } else if (run.enemy.id === 'prism') {
      a.lastPattern = turn % 2 === 0 ? '千面棋盤' : '折星扇舞';
      if (turn % 2 === 0) {
        var vertical = Math.floor(turn / 2) % 2 === 0;
        var lines = vertical ? (stronger ? [130, 270, 410, 550, 690, 830] : [170, 370, 570, 770]) :
          (stronger ? [110, 220, 330, 440] : [145, 280, 415]);
        lines.forEach(function (value, index) {
          mark({ kind: 'line', x: vertical ? value : 55, y: vertical ? 70 : value,
            x2: vertical ? value : 905, y2: vertical ? 490 : value, width: stronger ? 36 : 28,
            delay: 1.25 + index * 0.16, life: 0.5, color: '#a3ddf6' });
        });
      } else {
        var aim = Math.atan2(p.y - boss.y, p.x - boss.x), fan = stronger ? 5 : 3;
        for (var ray = -fan; ray <= fan; ray++) {
          queueBossShot(a, boss, boss.x, boss.y, aim + ray * 0.23, 1.3, damage,
            stronger ? 180 : 155, '#bdccff', 7, 'shard');
        }
      }
    } else if (run.enemy.id === 'hollow') {
      a.lastPattern = turn % 2 === 0 ? '空鐘三鳴' : '靜默斷層';
      if (turn % 2 === 0) {
        [110, 210, 310].forEach(function (radius, index) {
          mark({ kind: 'ring', x: 480, y: 280, r: radius, innerR: radius - (stronger ? 38 : 26),
            delay: 1.2 + index * (stronger ? 0.48 : 0.65), life: stronger ? 0.55 : 0.4, color: '#c1b5ed' });
        });
      } else {
        var safeCenter = [135, 280, 420][Math.floor(turn / 2) % 3], halfGap = stronger ? 55 : 65;
        var topEnd = safeCenter - halfGap, bottomStart = safeCenter + halfGap;
        if (topEnd > 65) mark({ kind: 'rect', x: 50, y: 65, w: 860, h: topEnd - 65,
          delay: 2.1, life: stronger ? 0.9 : 0.7, color: '#b3a5d8' });
        if (bottomStart < 495) mark({ kind: 'rect', x: 50, y: bottomStart, w: 860, h: 495 - bottomStart,
          delay: 2.1, life: stronger ? 0.9 : 0.7, color: '#b3a5d8' });
      }
    } else if (run.enemy.id === 'cometqueen') {
      a.lastPattern = turn % 2 === 0 ? '雙尾巡天' : '彗雨織徑';
      if (turn % 2 === 0) {
        var pairs = stronger ? 4 : 3;
        for (var pair = 0; pair < pairs; pair++) {
          var y = 110 + pair * (stronger ? 100 : 130), slope = pair % 2 ? -0.15 : 0.15;
          var delay = 1.3 + pair * (stronger ? 0.2 : 0.28);
          queueBossShot(a, boss, 65, y, slope, delay, damage, stronger ? 260 : 220, '#ffd4ab', stronger ? 12 : 10, 'star');
          queueBossShot(a, boss, 895, 560 - y, Math.PI + slope, delay + 0.16, damage, stronger ? 260 : 220, '#c6dcff', stronger ? 12 : 10, 'star');
        }
      } else {
        var lanes = stronger ? [100, 245, 390, 535, 680, 825] : [110, 290, 470, 650, 830];
        lanes.forEach(function (x, index) {
          mark({ kind: 'rect', x: x - (stronger ? 33 : 24), y: 65, w: stronger ? 66 : 48, h: 430,
            delay: 1.2 + index * (stronger ? 0.24 : 0.38), life: stronger ? 0.7 : 0.45, color: '#f0b9bc' });
        });
      }
    }
  }
  function bossPattern(run, a, intent) {
    var boss = living(a)[0]; if (!boss) return;
    var phase = run.enemy.phase, turn = run.enemy.turn - 1, p = a.player, damage = intent.damage;
    a.patternCount += 1;
    if (a.patternCount % (meleeBoss(boss) ? 4 : 3) === 0) { startRitual(run, a, boss, intent); return; }
    if (meleeBoss(boss)) { beginMelee(run, a, boss, damage); return; }
    face(boss, p.x, p.y);
    var previousHazards = a.nextId;
    if (run.enemy.isNpcBoss && Engine.NPCS[run.enemy.npcId]) {
      npcPattern(run, a, boss, intent, turn, phase);
    } else if (['spore', 'prism', 'hollow', 'cometqueen'].indexOf(run.enemy.id) >= 0) {
      alternateBossPattern(run, a, boss, intent, turn, phase);
    } else if (run.enemy.id === 'constellation') {
      a.lastPattern = turn % 2 === 0 ? '未寄出的回聲' : '雙星斷章';
      if (turn % 2 === 0) {
        [0, 1, phase === 2 ? 2 : null].filter(function (i) { return i !== null; }).forEach(function (i) {
          hazard(a, { source: 'boss', ownerId: boss.id, x: clamp(p.x + (i - 1) * 90, 100, 860), y: p.y, r: 48,
            delay: 1.3 + i * 0.55, life: 0.7, damage: damage, color: '#dc96d0' });
        });
      } else {
        var left = turn % 4 === 1;
        hazard(a, { kind: 'line', source: 'boss', ownerId: boss.id, x: 100, y: left ? 120 : 440, x2: 860, y2: left ? 440 : 120,
          width: phase === 2 ? 60 : 42, delay: 1.4, life: 0.8, damage: damage, color: '#d8a8f5' });
        hazard(a, { kind: 'ring', source: 'boss', ownerId: boss.id, x: p.x, y: p.y, r: 125, innerR: 92,
          delay: 2.05, life: 0.45, damage: damage, color: '#f2b6dc' });
      }
    } else if (run.enemy.id === 'astral') {
      a.lastPattern = ['龍翼星軌', '忘誓流星', '花庭星環'][turn % 3];
      if (turn % 3 === 0) {
        [0, 1, 2].forEach(function (wing) {
          hazard(a, { kind: 'line', source: 'boss', ownerId: boss.id, x: 90, y: 105 + wing * 125, x2: 870, y2: 175 + wing * 125,
            width: phase === 2 ? 48 : 32, delay: 1.3 + wing * 0.3, life: 0.55, damage: damage, color: '#edacd9' });
        });
      } else if (turn % 3 === 1) {
        boss.volley = { delay: 1.4, radial: phase === 2 ? 20 : 12, rotation: turn * 0.43, damage: damage - 4, color: '#d7b6ff', shape: 'star', speed: 145 };
        [0, 1, 2].forEach(function (i) { hazard(a, { source: 'boss', ownerId: boss.id, x: clamp(p.x + (i - 1) * 105, 95, 865), y: clamp(p.y + (i % 2 ? 80 : -30), 105, 450), r: 46, delay: 1.8 + i * 0.4, damage: damage, color: '#ffd4e9' }); });
      } else {
        [110, 205, 300].forEach(function (radius, i) { hazard(a, { kind: 'ring', source: 'boss', ownerId: boss.id, x: 480, y: 280, r: radius, innerR: radius - 27, delay: 1.3 + i * 0.5, life: 0.4, damage: damage, color: '#dca9ef' }); });
        if (phase === 2) hazard(a, { kind: 'line', source: 'boss', ownerId: boss.id, x: p.x, y: 75, x2: p.x, y2: 485, width: 36, delay: 2.9, damage: damage, color: '#ffbfda' });
      }
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
    // The pose follows the actual first release and last active danger in this
    // pattern. The boss cannot begin another attack until its recovery ends.
    var created = a.hazards.filter(function (h) { return h.ownerId === boss.id && Number(h.id.split('-')[1]) >= previousHazards; });
    var first = created.reduce(function (value, h) { return Math.min(value, h.delay); }, boss.volley ? boss.volley.delay : Infinity);
    var last = created.reduce(function (value, h) { return Math.max(value, h.delay + h.life); }, boss.volley ? boss.volley.delay + 0.4 : 0);
    if (!Number.isFinite(first)) first = 1;
    setAction(a, boss, { kind: 'spell', name: a.lastPattern, duration: first, active: Math.max(0.35, last - first), recovery: 1.5 });
  }
  function intentPattern(run, a) {
    var caster = living(a).find(function (e) { return e.active && !e.action; });
    if (!caster) return;
    if (meleeBoss(caster) && dist(caster, a.player) > 285) return;
    var intent = Engine.resolveArenaIntent(run); if (!intent) return;
    if (run.enemy.kind === 'boss') bossPattern(run, a, intent);
    else {
      a.lastPattern = '符文落擊'; a.patternCount += 1;
      face(caster, a.player.x, a.player.y);
      setAction(a, caster, { kind: 'spell', name: '符文落擊', duration: 1.1, active: 0.28, recovery: 0.7 });
      hazard(a, { x: a.player.x, y: a.player.y, r: run.enemy.kind === 'elite' ? 70 : 52, delay: 1.1,
        damage: intent.damage, source: 'enemy', ownerId: caster.id });
    }
  }
  function advanceRoom(run, a, dt) {
    a.roomClock -= dt;
    if (a.room.id === 'starlanes' && a.roomClock <= 0) {
      a.roomClock += 6; a.roomPulse += 1;
      var safeLane = (a.roomPulse + run.encounter) % 4;
      a.room.safeLane = safeLane;
      for (var lane = 0; lane < 4; lane++) if (lane !== safeLane) {
        hazard(a, { kind: 'rect', source: 'trap', x: 50, y: 65 + lane * 105, w: 860, h: 100,
          delay: 1.8, life: 1, damage: 9 + run.region, color: '#e0b3ec' });
      }
    }
    if (a.room.id === 'bloom') {
      if (!Array.isArray(a.room.blossoms)) a.room.blossoms = [{ x: 260, y: 170, r: 28 }, { x: 700, y: 170, r: 28 }, { x: 480, y: 405, r: 28 }];
      if (a.roomClock <= 0) {
        a.roomClock += 8; a.roomPulse += 1;
        a.room.blossoms.forEach(function (flower) {
          flower.ready = true;
          hazard(a, { kind: 'ring', source: 'trap', x: flower.x, y: flower.y, r: 65, innerR: 44,
            delay: 2, life: 0.6, damage: 8 + run.region, color: '#e7b1dd' });
        });
      }
      a.room.blossoms.forEach(function (flower) {
        if (flower.ready && dist(a.player, flower) <= flower.r && run.player.hp < run.player.maxHp) {
          flower.ready = false;
          var recovered = Engine.healPlayer(run, 6);
          if (recovered) effect(a, 'heal', flower.x, flower.y, { color: '#b5f2da', r: 34, life: 0.65 });
        }
      });
    }
    if (a.room.id === 'comet') {
      if (!Array.isArray(a.room.comets)) a.room.comets = [];
      if (a.roomClock <= 0) {
        a.roomClock += 5.6; a.roomPulse += 1;
        [0, 1, 2].forEach(function (i) {
          var fromLeft = (i + a.roomPulse) % 2 === 0, y = 120 + i * 150;
          hazard(a, { kind: 'line', source: 'trap', x: 55, y: y, x2: 905, y2: y, width: 10,
            delay: 1.5 + i * 0.2, life: 0.05, damage: 0, cosmetic: true, color: '#bfe9ff' });
          a.room.comets.push({ delay: 1.5 + i * 0.2, x: fromLeft ? 55 : 905, y: y, angle: fromLeft ? 0 : Math.PI });
        });
      }
      a.room.comets.forEach(function (comet) {
        comet.delay -= dt;
        if (comet.delay <= 0 && !comet.fired) {
          comet.fired = true;
          projectile(run, a, 'comet-room', comet.x, comet.y, comet.angle, 310, 11 + run.region, { r: 13, color: '#d1eaff', shape: 'star', source: 'trap', life: 3.4 });
        }
      });
      a.room.comets = a.room.comets.filter(function (comet) { return !comet.fired; });
    }
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
    e.counterWindow = Math.max(0, (e.counterWindow || 0) - dt);
    e.perfectWindow = Math.max(0, (e.perfectWindow || 0) - dt);
    if (e.volley) {
      e.volley.delay -= dt;
      if (e.volley.delay <= 0) {
        var volley = e.volley; e.volley = null;
        if (volley.radial) {
          for (var n = 0; n < volley.radial; n++) projectile(run, a, e.id, e.x, e.y, volley.rotation + n * Math.PI * 2 / volley.radial, volley.speed || 125 + run.region * 10, volley.damage,
            { drain: volley.drain, color: volley.color || '#c69fff', shape: volley.shape || 'orb', source: e.kind === 'boss' ? 'boss' : 'enemy' });
        } else {
          var angle = Math.atan2(volley.y - e.y, volley.x - e.x);
          for (var spread = -volley.spread; spread <= volley.spread; spread++) projectile(run, a, e.id, e.x, e.y, angle + spread * 0.18, 150 + run.region * 9, volley.damage);
        }
      }
    }
    if (advanceAction(run, a, e, dt, motionScale)) return;
    face(e, p.x, p.y);
    if (e.kind === 'boss') {
      // Melee bosses close distance and guard until their committed attack or
      // recovery; they do not slide around while winding up or swinging.
      var desired = meleeBoss(e) ? 135 : 260;
      var speed = meleeBoss(e) ? (e.phase === 2 ? 118 : 96) : (e.phase === 2 ? 34 : 24);
      if (d > desired) move(a, e, direction.x * speed * dt * motionScale, direction.y * speed * dt * motionScale);
      return;
    }
    // An older saved room may still contain its original charge timer.
    if (e.chargeTime > 0) {
      e.chargeTime = Math.max(0, e.chargeTime - dt);
      move(a, e, e.chargeX * 365 * dt * motionScale, e.chargeY * 365 * dt * motionScale);
      if (dist(e, p) <= e.r + p.r) { if (p.invulnerable > 0) countDodge(a, e); else applyHit(run, a, 11 + run.region * 2, e); }
      return;
    }
    if (e.telegraph > 0) { e.telegraph = Math.max(0, e.telegraph - dt); return; }
    e.cooldown -= dt;
    if (e.kind === 'chaser') {
      if (d > 48) move(a, e, direction.x * (49 + run.region * 5) * dt * motionScale, direction.y * (49 + run.region * 5) * dt * motionScale);
      if (d < 105 && e.cooldown <= 0) { e.cooldown = 1.1; beginMelee(run, a, e, 7 + run.region * 2); }
    } else if (e.kind === 'ranged') {
      var sign = d > 320 ? 1 : d < 190 ? -1 : 0;
      move(a, e, direction.x * 36 * sign * dt * motionScale, direction.y * 36 * sign * dt * motionScale);
      if (e.cooldown <= 0 && !e.volley) {
        e.cooldown = 2.1;
        setAction(a, e, { kind: 'ranged', name: '符箭瞄準', duration: 0.85, active: 0.22, recovery: 0.75 });
        e.volley = { delay: 0.85, x: p.x, y: p.y, spread: run.region >= 2 ? 1 : 0, damage: 7 + run.region * 2 };
        hazard(a, { kind: 'line', x: e.x, y: e.y, x2: p.x, y2: p.y, width: 4, delay: 0.85, life: 0.08, damage: 0,
          ownerId: e.id, cosmetic: true, color: '#e4bba2' });
      }
    } else {
      if (e.cooldown <= 0) { e.cooldown = 1.65; beginMelee(run, a, e, 11 + run.region * 2); }
      else if (d > 200) move(a, e, direction.x * 36 * dt * motionScale, direction.y * 36 * dt * motionScale);
    }
  }
  function updateHazards(run, a, dt, motionScale) {
    a.hazards.forEach(function (h) {
      var owner = null;
      if (h.followOwner || h.actionId) {
        owner = a.enemies.find(function (e) { return e.id === h.ownerId && e.alive; });
        if (!owner) { h.life = 0; return; }
        if (h.followOwner) { h.x = owner.x; h.y = owner.y; }
      }
      if (h.actionId) {
        // The weapon owns this hitbox. Windup and recovery can never deal a
        // lingering hit because of a second, independently rounded timer.
        var action = owner.action;
        if (!action || action.id !== h.actionId || action.combo !== h.combo) { h.life = 0; return; }
        if (action.stage === 'windup') { h.delay = Math.max(0.001, action.duration - action.elapsed); return; }
        if (action.stage !== 'active' || h.warningOnly) { h.life = 0; return; }
        h.delay = Math.max(0, ((h.hitStart || 0) - action.progress) * action.duration);
        h.life = Math.max(0, ((h.hitEnd || 1) - action.progress) * action.duration);
        if (h.delay > 0) return;
      } else {
        if (h.delay > 0) { h.delay = Math.max(0, h.delay - dt); return; }
        h.life -= dt;
      }
      if (h.life <= 0) return;
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
    var focusRequested = !!input.focus, mobileFocus = !!input.mobile && focusRequested;
    var ix = Number(input.x) || 0, iy = Number(input.y) || 0, magnitude = Math.hypot(ix, iy);
    if (!Number.isFinite(magnitude)) { ix = 0; iy = 0; magnitude = 0; }
    if (magnitude > 1) { ix /= magnitude; iy /= magnitude; }
    var canMove = !focusRequested || mobileFocus;
    a.focusActive = focusRequested && p.focusEnergy > 0;
    if (focusRequested) p.focusEnergy = Math.max(0, p.focusEnergy - dt * 12);
    else p.focusEnergy = Math.min(100, p.focusEnergy + dt * 25);
    var meleeEncounter = a.enemies.some(meleeBoss);
    // Mobile chanting allows slower walking. Moving keeps ordinary threats
    // active enough to require positioning; melee timing remains unchanged.
    var focusScale = meleeEncounter ? 0.72 : mobileFocus && magnitude > 0 ? 0.55 : 0.18;
    var worldDt = dt * (a.focusActive ? focusScale : 1);
    a.realTime += dt; a.time += worldDt;
    a.introRemaining = Math.max(0, (a.introRemaining || 0) - dt);
    run.elapsed += dt; run.stats.elapsed = run.elapsed; run.spell.elapsed += dt;
    p.invulnerable = Math.max(0, p.invulnerable - dt); p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    if (magnitude && canMove) { p.facingX = ix; p.facingY = iy; }
    p.dashBuffer = Math.max(0, (p.dashBuffer || 0) - dt);
    if (input.dash && !a.dashHeld) {
      var facing = unit(canMove && magnitude ? ix : p.facingX, canMove && magnitude ? iy : p.facingY);
      p.queuedDashX = facing.x; p.queuedDashY = facing.y; p.dashBuffer = 0.14;
    }
    if (p.dashBuffer > 0 && p.dashCooldown <= 0 && p.dashTime <= 0) {
      p.dashX = p.queuedDashX; p.dashY = p.queuedDashY; p.dashBuffer = 0;
      p.dashTime = 0.22; p.dashCooldown = has(run, 'gale') ? 1.15 : 1.4; p.invulnerable = 0.28;
      a.dashes += 1; effect(a, 'dash', p.x, p.y, { x2: p.x + p.dashX * 50, y2: p.y + p.dashY * 50, life: 0.25, color: '#9cdaff' });
    }
    a.dashHeld = !!input.dash;
    var dashDt = Math.min(dt, p.dashTime), walkDt = dt - dashDt;
    if (dashDt > 0) {
      move(a, p, p.dashX * 760 * dashDt, p.dashY * 760 * dashDt);
      p.dashTime = Math.max(0, p.dashTime - dt);
      if (p.dashTime === 0) dashBurst(run, a);
    }
    if (walkDt > 0 && canMove) {
      var speed = 180 * (has(run, 'gale') ? 1.22 : 1) * (mobileFocus ? 0.75 : 1);
      move(a, p, ix * speed * walkDt, iy * speed * walkDt);
    }
    if (run.status !== 'combat') return a;
    a.slowTime = Math.max(0, a.slowTime - dt);
    var motionScale = a.slowTime > 0 ? 0.65 : 1;
    if (run.enemy.phase !== a.previousPhase) {
      a.previousPhase = run.enemy.phase;
      a.projectiles = []; a.bossShots = []; a.hazards = a.hazards.filter(function (h) { return h.source === 'trap'; });
      effect(a, 'phase', a.enemies[0].x, a.enemies[0].y, { name: run.enemy.name + ' · 第二階段', text: '第二階段 · 封印崩解', r: 120, life: 1.3, color: '#ffd3a0' });
      if (run.enemy.kind === 'boss') {
        var phaseBoss = a.enemies[0];
        phaseBoss.volley = null; phaseBoss.action = null; phaseBoss.counterWindow = 0; phaseBoss.perfectWindow = 0; phaseBoss.counterReady = false; phaseBoss.telegraph = 0; phaseBoss.chargeTime = 0;
        if (a.ritual && a.ritual.status === 'charging') a.ritual.status = 'cancelled';
        [115, 215].forEach(function (radius, index) { hazard(a, { kind: 'ring', source: 'boss', ownerId: phaseBoss.id,
          x: phaseBoss.x, y: phaseBoss.y, r: radius, innerR: radius - 25, delay: 1.3 + index * 0.5, life: 0.4,
          damage: 9 + run.region * 2, color: '#ffd3a0' }); });
        setAction(a, phaseBoss, { kind: 'spell', name: '封印崩解', duration: 1.3, active: 0.9, recovery: 1.2 });
        run.enemy.intent.remaining = Math.max(2.7, run.enemy.intent.remaining);
      }
    }
    advanceRitual(run, a, dt);
    if (run.status !== 'combat') { updateTarget(a); return a; }
    advanceCompanions(run, a, worldDt);
    if (run.status !== 'combat') { updateTarget(a); return a; }
    advanceRoom(run, a, worldDt);
    advanceBossShots(run, a, worldDt);
    a.enemies.forEach(function (e) { if (run.status === 'combat') enemyAI(run, a, e, worldDt, motionScale * (a.enemyMoveScale || 1)); });
    var bossBody = a.enemies.find(function (e) { return e.kind === 'boss' && e.alive; });
    if (!bossBody || (!bossBody.action && !(bossBody.counterWindow > 0))) {
      run.enemy.intent.remaining = Math.max(0, run.enemy.intent.remaining - worldDt);
      if (run.enemy.intent.remaining <= 0) intentPattern(run, a);
    }
    updateHazards(run, a, worldDt, motionScale);
    if (bossBody) { run.enemy.action = bossBody.action; run.enemy.counterWindow = bossBody.counterWindow || 0; run.enemy.perfectWindow = bossBody.perfectWindow || 0; run.enemy.counterReady = !!bossBody.counterReady; }
    a.effects.forEach(function (e) { e.life -= dt; }); a.effects = a.effects.filter(function (e) { return e.life > 0; });
    updateTarget(a); return a;
  }
  function cast(run, text) {
    var a = ensure(run);
    if (!a) return { ok: false, message: '目前不在戰鬥中。' };
    if (getInterrupt(run)) return submitInterrupt(run, text);
    var possible = targets(a), target = possible[0];
    if (!target) return { ok: false, message: '下一波敵人正在進場，利用空檔移動與恢復專注。' };
    if (dist(target, a.player) > RANGE + target.r) return { ok: false, message: '敵人超出咒語射程，先靠近再施法。' };
    var type = run.spell.type, word = run.spell.word, counter = (target.counterWindow || 0) > 0, perfect = (target.perfectWindow || 0) > 0;
    var guarded = meleeBoss(target) && !counter;
    var limit = possible.reduce(function (sum, e) { return sum + e.hp; }, 0);
    // A guarded duelist still takes damage, but punishing its recovery is much
    // more effective than tapping spells from safety for the entire fight.
    if (guarded) limit = Math.min(limit, Math.max(4, Math.round(target.maxHp * (run.difficulty === 'story' ? 0.04 : run.difficulty === 'veteran' ? 0.02 : 0.026))));
    var result = Engine.submit(run, text, { damageLimit: limit });
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
    if (counter && result.damage > 0 && type !== 'heal' && type !== 'shield' && run.status === 'combat' && target.alive) {
      var extra = directDamage(run, a, target, Math.round(result.damage * (perfect ? 1 : 0.55)));
      if (extra > 0) {
        a.counterHits = (a.counterHits || 0) + 1; result.damage += extra; result.counter = true; result.perfect = perfect;
        result.message = (perfect ? '精準反擊！' : '抓住收勢！') + '造成 ' + result.damage + ' 點傷害。';
        effect(a, 'counter', target.x, target.y, { text: perfect ? '精準反擊 ×2' : '收勢反擊 ×1.55', color: '#b8fff0', r: target.r + 26, life: 0.75 });
      }
    } else if (guarded && result.damage > 0) {
      result.guarded = true; result.message += ' 首領護勢中，閃過連擊後反擊更有效。';
    }
    a.companions.filter(function (c) { return (c.npcId === 'echo' && c.cooldown <= 0) || (c.npcId === 'lumina' && (c.echoCooldown || 0) <= a.time); }).forEach(function (echo) {
      if (run.status !== 'combat') return;
      if (echo.npcId === 'echo') echo.cooldown = 2.5; else echo.echoCooldown = a.time + 4;
      a.echoQueue.push({ npcId: echo.npcId, delay: echo.npcId === 'lumina' ? 0.85 : 0.65, targetId: target.id, spellType: type, spellWord: word,
        damage: result.damage > 0 ? clamp(Math.round(result.damage * (echo.npcId === 'lumina' ? 0.22 : 0.3)), 3, echo.npcId === 'lumina' ? 8 : 12) : 0,
        heal: clamp(Math.round((result.heal || 0) * 0.3), 0, 8), shield: clamp(Math.round((result.shield || 0) * 0.3), 0, 8) });
    });
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
    return a ? { room: a.room.name, mutator: a.room.mutator, layout: a.room.layout, formation: a.room.formation, omen: a.room.omen,
      enemiesAlive: living(a).length, activeEnemies: targets(a).length,
      wavesReleased: a.wavesReleased, casts: a.casts, dodges: a.dodges, dashes: a.dashes, hitsTaken: a.hitsTaken,
      focusEnergy: Math.round(a.player.focusEnergy), focusActive: a.focusActive, dashReady: a.player.dashCooldown <= 0,
      time: a.realTime, pattern: a.lastPattern, counterHits: a.counterHits || 0, interrupts: a.interrupts || 0,
      ritual: getInterrupt(run), counterWindow: run.enemy && run.enemy.counterWindow || 0 } : null;
  }
  function clearInput(run) {
    var a = run && run.arena;
    if (!a || !a.player) return;
    a.dashHeld = false; a.player.dashBuffer = 0;
    delete a.player.queuedDashX; delete a.player.queuedDashY;
  }
  return { ensure: ensure, update: update, cast: cast, useItem: useItem, getSummary: getSummary, clearInput: clearInput,
    getInterrupt: getInterrupt, submitInterrupt: submitInterrupt, ROOMS: ROOMS,
    WIDTH: WIDTH, HEIGHT: HEIGHT, CAST_RANGE: RANGE };
});
