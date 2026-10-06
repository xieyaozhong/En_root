(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DungeonEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var REGIONS = [
    { id: 'forest', name: '苔光秘林', subtitle: '字根在古樹之間甦醒', color: '#75dba0', boss: 'thorn' },
    { id: 'mirror', name: '碎月書庫', subtitle: '讓咒語穿透月影與幻象', color: '#9d9bff', boss: 'witch' },
    { id: 'void', name: '失名王座', subtitle: '為被遺忘的世界找回名字', color: '#ff9174', boss: 'king' }
  ];
  var ITEMS = {
    potion: { id: 'potion', name: '苔露藥水', icon: '✚', description: '恢復 38 點生命；任何探索階段皆可使用。', price: 24 },
    bomb: { id: 'bomb', name: '星火炸彈', icon: '✹', description: '造成 42 點無視護盾的傷害。', price: 30 },
    hourglass: { id: 'hourglass', name: '凝時沙漏', icon: '⌛', description: '將敵人下一次行動延後 6 秒。', price: 22 },
    barrier: { id: 'barrier', name: '琥珀護符', icon: '◇', description: '立即獲得 30 點護盾，持續至戰鬥結束。', price: 25 },
    focus: { id: 'focus', name: '靈感墨水', icon: '◆', description: '接下來 3 次咒語傷害增加 12 點。', price: 26 }
  };
  var RELICS = {
    ember: { id: 'ember', name: '餘燼羽毛', icon: '♨', description: '所有咒語傷害增加 4 點。', price: 65 },
    moss: { id: 'moss', name: '苔心種子', icon: '❧', description: '每次正確施法恢復 2 點生命。', price: 65 },
    shell: { id: 'shell', name: '古龍鱗片', icon: '▰', description: '每場戰鬥開始時獲得 18 點護盾。', price: 60 },
    prism: { id: 'prism', name: '詞源稜鏡', icon: '◈', description: '本命咒語額外造成 14 點傷害。', price: 65 },
    clock: { id: 'clock', name: '靜夜懷錶', icon: '◷', description: '敵人的每次行動準備時間延長 2 秒。', price: 65 },
    fang: { id: 'fang', name: '連響獠牙', icon: 'ϟ', description: '連擊達 3 時，咒語額外造成 6 點傷害。', price: 60 },
    purse: { id: 'purse', name: '拾星口袋', icon: '✧', description: '獲得金幣時增加 35%；取得時立刻獲得 20 金幣。', price: 55 },
    phoenix: { id: 'phoenix', name: '不熄燈芯', icon: '☀', description: '每趟遠征一次：受到致命傷時恢復 50 點生命。', price: 75 }
  };
  var BASICS = [
    { word: 'spark', zh: '火花', name: '星火術', type: 'attack', power: 17 },
    { word: 'fire', zh: '火焰', name: '焰矢術', type: 'attack', power: 18 },
    { word: 'frost', zh: '冰霜', name: '霜刺術', type: 'attack', power: 16 },
    { word: 'rune', zh: '符文', name: '符文飛彈', type: 'attack', power: 17 },
    { word: 'light', zh: '光', name: '曦光術', type: 'heal', power: 14 },
    { word: 'bloom', zh: '綻放', name: '花息術', type: 'heal', power: 15 },
    { word: 'ward', zh: '守護', name: '結界術', type: 'shield', power: 17 },
    { word: 'stone', zh: '石頭', name: '石壁術', type: 'shield', power: 16 },
    { word: 'storm', zh: '風暴', name: '風暴術', type: 'attack', power: 19 }
  ];
  var ENEMIES = [
    [
      { id: 'slime', name: '墨滴史萊姆', description: '沾滿墨水的小生物，正準備彈跳撞擊。' },
      { id: 'moth', name: '噬字飛蛾', description: '吞食散落的字母，翅膀帶著微光。' },
      { id: 'mushroom', name: '孢子書靈', description: '從潮濕書頁長出，會以孢子保護自己。' }
    ],
    [
      { id: 'wisp', name: '失語月靈', description: '在碎裂的鏡面間遊蕩，凝聚寒冷月光。' },
      { id: 'knight', name: '空頁守衛', description: '盔甲由空白書頁構成，持盾緩慢逼近。' },
      { id: 'eye', name: '凝視魔眼', description: '窺視你的咒語，蓄積紫色光束。' }
    ],
    [
      { id: 'shade', name: '失名幽影', description: '失去名字的影子，仍記得戰鬥的方式。' },
      { id: 'golem', name: '黑曜碑衛', description: '刻著禁咒的巨石，正在積蓄毀滅之力。' },
      { id: 'raven', name: '終章渡鴉', description: '從末頁飛出的渡鴉，銜著王座的碎片。' }
    ]
  ];
  var BOSS = {
    thorn: { id: 'thorn', name: '棘冠典獄長', description: '交替編織荊棘護盾與重擊；本命咒語可穿透部分護盾。', hp: 205 },
    witch: { id: 'witch', name: '鏡月女巫', description: '月蝕會吸取生命；用護盾擋住傷害，就能阻止她恢復。', hp: 280 },
    king: { id: 'king', name: '失名之王', description: '每三次行動蓄力末頁湮滅；把沙漏與護符留給重擊。', hp: 365 }
  };

  function copy(value) { return Object.assign({}, value); }
  function hash(value) {
    var text = String(value), h = 2166136261;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function random(s) {
    s.rng = (s.rng + 0x6D2B79F5) >>> 0;
    var t = s.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function pick(s, list) { return list[Math.floor(random(s) * list.length)]; }
  function shuffle(s, list) {
    var result = list.slice();
    for (var i = result.length - 1; i > 0; i--) {
      var j = Math.floor(random(s) * (i + 1)), old = result[i]; result[i] = result[j]; result[j] = old;
    }
    return result;
  }
  function has(s, id) { return s.relics.some(function (r) { return r.id === id; }); }
  function event(s, type, message, extra) {
    s.eventId += 1;
    s.lastEvent = Object.assign({ id: s.eventId, type: type, message: message }, extra || {});
    s.log.unshift(message);
    if (s.log.length > 35) s.log.length = 35;
    return s.lastEvent;
  }
  function fail(message) { return { ok: false, message: message }; }
  function done(message, extra) { return Object.assign({ ok: true, message: message }, extra || {}); }
  function heal(s, amount) {
    var actual = Math.min(Math.max(0, amount), s.player.maxHp - s.player.hp);
    s.player.hp += actual; s.stats.healing += actual; return actual;
  }
  function coins(s, amount) {
    var value = Math.round(amount * (has(s, 'purse') ? 1.35 : 1));
    s.player.gold += value; s.stats.goldEarned += value; return value;
  }
  function addItem(s, id, count) {
    var current = s.inventory.find(function (item) { return item.id === id; });
    if (current) current.count += count || 1;
    else s.inventory.push(Object.assign({}, ITEMS[id], { count: count || 1 }));
  }
  function addRelic(s, id) {
    if (!RELICS[id] || has(s, id)) return false;
    s.relics.push(copy(RELICS[id]));
    if (id === 'purse') { s.player.gold += 20; s.stats.goldEarned += 20; }
    return true;
  }
  function hitPlayer(s, damage) {
    var blocked = Math.min(s.player.shield, damage);
    s.player.shield -= blocked;
    var actual = Math.min(s.player.hp, Math.max(0, damage - blocked));
    s.player.hp -= actual; s.stats.damageTaken += actual;
    if (s.player.hp <= 0) {
      if (has(s, 'phoenix') && !s.phoenixUsed) {
        s.phoenixUsed = true; s.player.hp = Math.min(50, s.player.maxHp); s.player.shield += 15;
        event(s, 'revive', '不熄燈芯重新燃起！恢復 50 點生命並獲得 15 點護盾。');
      } else {
        s.status = 'lost'; s.player.hp = 0;
        event(s, 'lost', '你的燈火暫時熄滅了。帶著學會的咒語，再次出發吧。');
      }
    }
    return { damage: actual, blocked: blocked };
  }
  function hitEnemy(s, damage, pierce) {
    if (!s.enemy) return 0;
    var direct = Math.round(damage * (pierce || 0));
    var blocked = Math.min(s.enemy.shield, damage - direct);
    s.enemy.shield -= blocked;
    var actual = Math.min(s.enemy.hp, damage - blocked);
    s.enemy.hp -= actual; s.stats.damageDealt += actual;
    return actual;
  }
  function spellDescription(spell) {
    if (spell.type === 'heal') return '恢復生命，並以餘光傷害敵人';
    if (spell.type === 'shield') return '獲得護盾，並以符文傷害敵人';
    if (spell.type === 'signature') return '本命咒語：強力傷害，穿透一半護盾';
    return spell.word === 'frost' ? '造成傷害，並將敵人行動延後 1 秒' : '將字母化為魔力，攻擊敵人';
  }
  function makeSpell(s) {
    var n = s.generatedSpells++, spell;
    if (n % 5 === 4) {
      spell = { word: s.card.word, zh: s.card.zh, type: 'signature', name: '本命・' + s.card.zh,
        power: 26 + Math.min(s.card.word.length, 16) * 2 + s.cardBonus };
    } else if (n % 3 === 2 && s.wordPool.length) {
      var card = pick(s, s.wordPool);
      spell = { word: card.word, zh: card.zh, name: '詞源飛彈', type: 'attack', power: 18 + Math.floor(card.word.length / 2), root: card.root };
    } else {
      // Each block starts with an attack, keeping a healing-heavy draw from stalling a fight.
      spell = copy(n % 5 === 0 ? pick(s, BASICS.filter(function (b) { return b.type === 'attack'; })) : pick(s, BASICS));
    }
    spell.description = spellDescription(spell); spell.elapsed = 0;
    return spell;
  }
  function advanceSpell(s) {
    s.spell = s.queue.shift() || makeSpell(s);
    while (s.queue.length < 3) s.queue.push(makeSpell(s));
    if (s.enemy && s.enemy.intent && s.spell.word.length > 9) {
      // A long consumed card remains usable: the next telegraph always gives time to read it.
      s.enemy.intent.remaining = Math.max(s.enemy.intent.remaining, 3 + s.spell.word.length * 0.6);
      s.enemy.intent.duration = Math.max(s.enemy.intent.duration, s.enemy.intent.remaining);
    }
  }
  function createRun(card, practice, seed) {
    var source = card && typeof card.word === 'string' && card.word.trim() ? card : { word: 'magic', zh: '魔法', rarity: 'N' };
    var cleanCard = { word: source.word.trim().toLowerCase(), zh: source.zh || source.word, rarity: source.rarity || 'N', root: source.root || '' };
    var rarity = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 }[cleanCard.rarity] || 0;
    var runSeed = seed === undefined ? Date.now() : seed;
    var s = {
      version: 1, status: 'route', practice: !!practice, card: cleanCard, cardBonus: rarity,
      seed: runSeed, rng: hash(runSeed),
      region: 0, regionName: REGIONS[0].name, encounter: 0, completedNodes: 0,
      player: { hp: 120 + rarity * 3, maxHp: 120 + rarity * 3, shield: 0, gold: 35, power: 0, combo: 0, focus: 0 },
      enemy: null, spell: null, queue: [], routes: [], rewards: [], shop: [], inventory: [], relics: [],
      generatedSpells: 0, elapsed: 0, log: [], eventId: 0, lastEvent: null, phoenixUsed: false,
      stats: { casts: 0, correct: 0, mistakes: 0, maxCombo: 0, damageDealt: 0, damageTaken: 0, healing: 0,
        enemiesDefeated: 0, bossesDefeated: 0, goldEarned: 0, itemsUsed: 0, fastCasts: 0, elapsed: 0 }
    };
    var seen = Object.create(null);
    s.wordPool = (root.ENROOT_CARDS || []).filter(function (c) {
      if (!c || !/^[a-z]{3,8}$/i.test(c.word) || seen[c.word.toLowerCase()] || c.word.toLowerCase() === cleanCard.word) return false;
      seen[c.word.toLowerCase()] = true; return true;
    }).map(function (c) { return { word: c.word.toLowerCase(), zh: c.zh, root: c.root }; });
    addItem(s, 'potion', 2); addItem(s, 'bomb', 1);
    advanceSpell(s); buildRoutes(s);
    event(s, 'start', '提起星燈，踏入苔光秘林。你的本命咒語是 ' + cleanCard.word + '。');
    return s;
  }
  function buildRoutes(s) {
    s.status = 'route'; s.enemy = null; s.player.shield = 0; s.player.combo = 0;
    s.region = Math.min(2, Math.floor(s.encounter / 4)); s.regionName = REGIONS[s.region].name;
    s.routes = [];
    if (s.encounter % 4 === 3) {
      var boss = BOSS[REGIONS[s.region].boss];
      s.routes = [{ id: 'boss', type: 'boss', name: boss.name, icon: '♜', description: boss.description, danger: '區域首領' }];
      return;
    }
    var definitions = {
      battle: { name: '幽光小徑', icon: '⚔', description: '迎戰魔物，獲得金幣與一份戰利品。', danger: '普通戰鬥' },
      elite: { name: '危險裂隙', icon: '♠', description: '更強的敵人、更多金幣，並保證出現遺物選項。', danger: '精英戰鬥' },
      treasure: { name: '遺落寶匣', icon: '▣', description: '找到金幣，並選擇一份寶藏。', danger: '安全' },
      camp: { name: '星燈營地', icon: '♨', description: '休息恢復生命，或磨練永久咒語威力。', danger: '安全' },
      shop: { name: '流浪商人', icon: '◆', description: '花費本趟金幣，補給藥水、道具與遺物。', danger: '安全' }
    };
    var alternatives = shuffle(s, ['elite', 'treasure', 'camp', 'shop']).slice(0, 2);
    // A safe rest is always available directly before the second and third bosses.
    if (s.encounter % 4 === 2 && s.region > 0 && alternatives.indexOf('camp') < 0) alternatives[1] = 'camp';
    s.routes = ['battle'].concat(alternatives).map(function (kind) {
      return Object.assign({ id: kind, type: kind }, definitions[kind]);
    });
  }
  function makeIntent(s) {
    var e = s.enemy, turn = e.turn, damage = 8 + s.region * 4 + (e.kind === 'elite' ? 4 : 0);
    var duration = 10.5 - s.region * 0.4, kind = 'attack', name = '蓄力撞擊', description = '準備攻擊；護盾會優先吸收傷害。', shield = 0;
    if (e.kind === 'boss') {
      damage = 12 + s.region * 4 + (e.phase === 2 ? 4 : 0); duration = e.phase === 2 ? 9.5 : 11;
      if (e.id === 'thorn') {
        if (turn % 3 === 0) { name = '荊棘結界'; kind = 'guard'; shield = e.phase === 2 ? 22 : 16; damage = 5; description = '獲得荊棘護盾並造成小量傷害；本命咒語能穿透一半護盾。'; }
        else { name = '棘冠重擊'; description = '荊棘即將落下，及時施放護盾或擊敗它。'; }
      } else if (e.id === 'witch') {
        if (turn % 3 === 1) { name = '鏡面折光'; kind = 'guard'; shield = 24; damage = 6; description = '鏡面會形成護盾，準備本命咒語突破。'; }
        else { name = '月蝕汲取'; kind = 'drain'; description = '造成傷害並吸取等量生命；護盾可阻止生命被吸取。'; }
      } else {
        if (turn % 3 === 2) { name = '末頁湮滅'; damage = e.phase === 2 ? 35 : 29; duration = 14; description = '高傷害蓄力！使用琥珀護符或凝時沙漏爭取時間。'; }
        else if (turn % 3 === 0) { name = '王座封印'; kind = 'guard'; damage = 10; shield = e.phase === 2 ? 26 : 18; description = '在王座周圍凝聚護盾，並釋出小量衝擊。'; }
        else { name = '失名審判'; description = '黑色字母凝聚成刃，即將造成傷害。'; }
      }
    } else if (e.kind === 'elite') {
      name = turn % 2 ? '狂暴重擊' : '符甲衝撞'; duration = 10;
      if (!(turn % 2)) { kind = 'guard'; shield = 12; damage -= 3; description = '衝撞後獲得 12 點護盾。'; }
    } else if (turn % 3 === 2) {
      name = '魔力護殼'; kind = 'guard'; shield = 10 + s.region * 3; damage = Math.max(3, damage - 4);
      description = '獲得護盾並造成小量傷害。';
    }
    if (has(s, 'clock')) duration += 2;
    if (s.spell && s.spell.word.length > 9) duration = Math.max(duration, 3 + s.spell.word.length * 0.6);
    e.intent = { name: name, kind: kind, damage: damage, shield: shield, duration: duration, remaining: duration, description: description };
  }
  function startCombat(s, kind) {
    var boss = kind === 'boss', template = boss ? BOSS[REGIONS[s.region].boss] : pick(s, ENEMIES[s.region]);
    var hp = boss ? template.hp : 78 + s.region * 42 + (kind === 'elite' ? 48 : 0) + Math.floor(random(s) * 13);
    s.status = 'combat'; s.player.combo = 0; s.player.shield = has(s, 'shell') ? 18 : 0;
    s.enemy = Object.assign({}, template, { kind: kind, hp: hp, maxHp: hp, shield: 0, phase: 1, turn: 0 });
    s.spell.elapsed = 0; makeIntent(s);
    event(s, 'encounter', template.name + ' 出現了！' + (boss ? template.description : '輸入畫面中的英文並按 Enter 施法。'));
  }
  function chooseRoute(s, id) {
    if (s.status !== 'route') return fail('現在無法選擇路線。');
    var route = s.routes.find(function (r) { return r.id === id; });
    if (!route) return fail('找不到這條路線。');
    s.routes = []; s.currentRoute = route;
    if (route.type === 'battle' || route.type === 'elite' || route.type === 'boss') startCombat(s, route.type);
    else if (route.type === 'treasure') {
      var amount = coins(s, 24 + s.region * 9);
      makeRewards(s, true); event(s, 'treasure', '寶匣裡有 ' + amount + ' 金幣。再選擇一份寶藏帶走。');
    } else if (route.type === 'camp') {
      s.status = 'camp'; event(s, 'camp', '星燈下十分安全。休息回復生命，或磨練咒語威力。');
    } else { makeShop(s); event(s, 'shop', '流浪商人掀開斗篷：「下一個房間，也許正好用得上。」'); }
    return done('進入' + route.name + '。');
  }
  function makeRewards(s, guaranteedRelic) {
    s.status = 'reward';
    var available = Object.keys(RELICS).filter(function (id) { return !has(s, id); });
    var choices = [
      { id: 'vigor', kind: 'upgrade', name: '生命結晶', icon: '♥', description: '生命上限增加 14，並恢復 28 點生命。' },
      { id: 'power', kind: 'upgrade', name: '刻印殘頁', icon: '✦', description: '本趟所有咒語威力永久增加 3。' },
      { id: 'supplies', kind: 'supply', name: '旅行補給', icon: '✚', description: '獲得 1 瓶苔露藥水與 22 金幣。' }
    ];
    var item = pick(s, ['bomb', 'hourglass', 'barrier', 'focus']);
    choices.push({ id: 'item-' + item, kind: 'item', itemId: item, name: ITEMS[item].name + ' × 2', icon: ITEMS[item].icon, description: ITEMS[item].description });
    if (available.length && (guaranteedRelic || random(s) < 0.72)) {
      var relic = RELICS[pick(s, available)];
      var r = Object.assign({}, relic, { id: 'relic-' + relic.id, kind: 'relic', relicId: relic.id });
      s.rewards = [r].concat(shuffle(s, choices).slice(0, 2));
    } else s.rewards = shuffle(s, choices).slice(0, 3);
  }
  function winEncounter(s) {
    var e = s.enemy;
    s.stats.enemiesDefeated += 1;
    if (e.kind === 'boss') s.stats.bossesDefeated += 1;
    var amount = coins(s, e.kind === 'boss' ? 55 + s.region * 15 : e.kind === 'elite' ? 42 + s.region * 9 : 22 + s.region * 7);
    s.player.shield = 0; s.player.combo = 0;
    var drop = null;
    if (e.kind === 'boss' || random(s) < 0.42) { drop = pick(s, Object.keys(ITEMS)); addItem(s, drop); }
    var message = '擊敗' + e.name + '！獲得 ' + amount + ' 金幣' + (drop ? '與' + ITEMS[drop].name : '') + '。';
    if (s.encounter === 11) {
      s.status = 'won'; s.completedNodes = 12;
      event(s, 'won', '失名之王化作晨光。你為世界找回了名字！' + message, { gold: amount, drop: drop });
    } else {
      if (e.kind === 'boss') heal(s, 24);
      makeRewards(s, e.kind !== 'battle');
      event(s, 'victory', message + (e.kind === 'boss' ? '區域淨化，恢復 24 點生命。' : ''), { gold: amount, drop: drop });
    }
  }
  function checkPhase(s) {
    var e = s.enemy;
    if (e.kind !== 'boss' || e.phase !== 1 || e.hp > e.maxHp / 2 || e.hp <= 0) return false;
    e.phase = 2;
    if (e.id === 'thorn') e.shield += 15;
    else if (e.id === 'witch') e.shield += 20;
    else e.shield += 25;
    makeIntent(s);
    event(s, 'phase', e.name + ' 進入第二階段！護盾再生，攻勢增強。');
    return true;
  }
  function submit(s, text) {
    if (s.status !== 'combat') return fail('目前不在戰鬥中。');
    var normalized = String(text || '').trim().toLowerCase();
    if (!normalized) return fail('輸入咒語後按 Enter。');
    if (normalized !== s.spell.word.toLowerCase()) {
      s.stats.mistakes += 1; s.player.combo = 0;
      var penalty = hitPlayer(s, 2);
      if (s.status !== 'lost') event(s, 'mistake', '字母稍微偏離了：受到 ' + penalty.damage + ' 點傷害。再試一次，咒語沒有改變。', { damage: penalty.damage });
      return fail('咒語未吻合，再試一次。');
    }
    var spell = s.spell, p = s.player;
    s.stats.casts += 1; s.stats.correct += 1; p.combo += 1;
    s.stats.maxCombo = Math.max(s.stats.maxCombo, p.combo);
    var fast = spell.elapsed <= Math.max(3.5, spell.word.length * 0.65);
    if (fast) s.stats.fastCasts += 1;
    var multiplier = 1 + Math.min(8, p.combo - 1) * 0.055 + (fast ? 0.16 : 0);
    var base = spell.type === 'heal' || spell.type === 'shield' ? 8 : spell.power;
    var rawDamage = base + p.power + (has(s, 'ember') ? 4 : 0) + (has(s, 'fang') && p.combo >= 3 ? 6 : 0)
      + (spell.type === 'signature' && has(s, 'prism') ? 14 : 0) + (p.focus > 0 ? 12 : 0);
    var damage = hitEnemy(s, Math.round(rawDamage * multiplier), spell.type === 'signature' ? 0.5 : 0);
    var healing = spell.type === 'heal' ? heal(s, spell.power + p.power) : 0, shield = 0;
    if (has(s, 'moss')) healing += heal(s, 2);
    if (spell.type === 'shield') { shield = Math.min(90 - p.shield, spell.power + p.power); p.shield += shield; }
    if (p.focus > 0) p.focus -= 1;
    if (spell.word === 'frost') s.enemy.intent.remaining = Math.min(s.enemy.intent.duration + 4, s.enemy.intent.remaining + 1);
    var message = spell.name + '！造成 ' + damage + ' 傷害' + (healing ? '，恢復 ' + healing + ' 生命' : '') + (shield ? '，獲得 ' + shield + ' 護盾' : '') + (fast ? '・迅捷施法' : '') + '。';
    event(s, 'cast', message, { damage: damage, heal: healing, shield: shield, fast: fast, spellType: spell.type, word: spell.word });
    advanceSpell(s);
    if (s.enemy.hp <= 0) winEncounter(s); else checkPhase(s);
    return done(message, { damage: damage, heal: healing, shield: shield, fast: fast, spellType: spell.type });
  }
  function tick(s, deltaSeconds) {
    if (s.status !== 'combat') return s;
    var dt = Math.min(1, Math.max(0, Number(deltaSeconds) || 0));
    s.elapsed += dt; s.stats.elapsed = s.elapsed; s.spell.elapsed += dt;
    s.enemy.intent.remaining = Math.max(0, s.enemy.intent.remaining - dt);
    if (s.enemy.intent.remaining <= 0) {
      var e = s.enemy, intent = e.intent, outcome = hitPlayer(s, intent.damage);
      if (s.status === 'lost') return s;
      e.shield = Math.min(70, e.shield + intent.shield);
      var restored = 0;
      if (intent.kind === 'drain') { restored = Math.min(e.maxHp - e.hp, outcome.damage); e.hp += restored; }
      // A large hit breaks the combo, but an entirely shielded hit rewards preparation.
      if (outcome.damage > 0) s.player.combo = 0;
      var message = e.name + '施放' + intent.name + '：' + (outcome.damage ? '受到 ' + outcome.damage + ' 傷害' : '護盾完全擋住攻擊')
        + (outcome.blocked && outcome.damage ? '，護盾吸收 ' + outcome.blocked : '')
        + (intent.shield ? '；敵人獲得 ' + intent.shield + ' 護盾' : '') + (restored ? '；吸取 ' + restored + ' 生命' : '') + '。';
      event(s, 'enemy', message, { damage: outcome.damage, blocked: outcome.blocked });
      e.turn += 1; makeIntent(s);
    }
    return s;
  }
  function nextEncounter(s) {
    s.completedNodes = s.encounter + 1; s.encounter += 1;
    s.rewards = []; s.shop = [];
    buildRoutes(s);
  }
  function chooseReward(s, id) {
    if (s.status !== 'reward') return fail('現在沒有可選擇的戰利品。');
    var reward = s.rewards.find(function (r) { return r.id === id; });
    if (!reward) return fail('找不到這份戰利品。');
    if (reward.kind === 'relic') addRelic(s, reward.relicId);
    else if (reward.kind === 'item') addItem(s, reward.itemId, 2);
    else if (reward.id === 'vigor') { s.player.maxHp += 14; heal(s, 28); }
    else if (reward.id === 'power') s.player.power += 3;
    else if (reward.id === 'supplies') { addItem(s, 'potion'); coins(s, 22); }
    nextEncounter(s); event(s, 'reward', '獲得' + reward.name + '。下一段路正在等待。');
    return done('獲得' + reward.name + '。');
  }
  function chooseCamp(s, choice) {
    if (s.status !== 'camp') return fail('目前不在營地。');
    if (choice !== 'rest' && choice !== 'train') return fail('請選擇休息或磨練。');
    var message;
    if (choice === 'rest') { var amount = heal(s, Math.round(s.player.maxHp * 0.48)); message = '星燈照亮傷口，恢復 ' + amount + ' 點生命。'; }
    else { s.player.power += 3; heal(s, 10); message = '磨練完成：咒語威力永久增加 3，並恢復 10 點生命。'; }
    nextEncounter(s); event(s, 'camp', message); return done(message);
  }
  function makeShop(s) {
    s.status = 'shop';
    var itemIds = ['potion'].concat(shuffle(s, ['bomb', 'hourglass', 'barrier', 'focus']).slice(0, 2));
    s.shop = itemIds.map(function (id) { return Object.assign({}, ITEMS[id], { id: 'buy-' + id, itemId: id, kind: 'item', sold: false }); });
    var available = Object.keys(RELICS).filter(function (id) { return !has(s, id); });
    if (available.length) {
      var id = pick(s, available); s.shop.push(Object.assign({}, RELICS[id], { id: 'buy-' + id, relicId: id, kind: 'relic', sold: false }));
    }
  }
  function buy(s, id) {
    if (s.status !== 'shop') return fail('目前不在商店。');
    var offer = s.shop.find(function (o) { return o.id === id; });
    if (!offer || offer.sold) return fail('這件商品已售完。');
    if (s.player.gold < offer.price) return fail('金幣不足。');
    s.player.gold -= offer.price; offer.sold = true;
    if (offer.kind === 'relic') addRelic(s, offer.relicId); else addItem(s, offer.itemId);
    event(s, 'purchase', '購買' + offer.name + '，花費 ' + offer.price + ' 金幣。');
    return done('已購買' + offer.name + '。');
  }
  function leaveShop(s) {
    if (s.status !== 'shop') return fail('目前不在商店。');
    nextEncounter(s); event(s, 'route', '向商人道別，繼續深入。'); return done('繼續探索。');
  }
  function useItem(s, id) {
    if (s.status === 'won' || s.status === 'lost') return fail('這趟遠征已經結束。');
    var item = s.inventory.find(function (i) { return i.id === id; });
    if (!item || item.count <= 0) return fail('背包裡沒有這件道具。');
    if (id !== 'potion' && s.status !== 'combat') return fail('這件道具只能在戰鬥中使用。');
    if (id === 'potion' && s.player.hp >= s.player.maxHp) return fail('生命已滿，先保留藥水。');
    if (id === 'barrier' && s.player.shield >= 90) return fail('護盾已達上限。');
    var message, damage = 0;
    item.count -= 1; s.stats.itemsUsed += 1;
    if (id === 'potion') message = '喝下苔露藥水，恢復 ' + heal(s, 38) + ' 點生命。';
    else if (id === 'bomb') { damage = hitEnemy(s, 42, 1); message = '星火炸彈爆開，造成 ' + damage + ' 點穿透傷害！'; }
    else if (id === 'hourglass') { s.enemy.intent.remaining += 6; s.enemy.intent.duration = Math.max(s.enemy.intent.duration, s.enemy.intent.remaining); message = '凝時沙漏啟動：敵人的下一次行動延後 6 秒。'; }
    else if (id === 'barrier') { var shield = Math.min(30, 90 - s.player.shield); s.player.shield += shield; message = '琥珀護符展開，獲得 ' + shield + ' 點護盾。'; }
    else if (id === 'focus') { s.player.focus += 3; message = '靈感墨水流動：接下來 3 次咒語傷害增加 12。'; }
    event(s, 'item', message, { damage: damage, itemId: id });
    if (s.status === 'combat') { if (s.enemy.hp <= 0) winEncounter(s); else checkPhase(s); }
    return done(message, { damage: damage });
  }
  return { createRun: createRun, submit: submit, tick: tick, chooseRoute: chooseRoute, chooseReward: chooseReward,
    chooseCamp: chooseCamp, useItem: useItem, buy: buy, leaveShop: leaveShop, ITEMS: ITEMS, RELICS: RELICS, REGIONS: REGIONS };
});
