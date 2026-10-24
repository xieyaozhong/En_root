(function (root, factory) {
  'use strict';
  var story = typeof module === 'object' && module.exports ? require('./dungeon-story.js') : root.DungeonStory;
  var api = factory(root, story);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DungeonEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root, Story) {
  'use strict';

  var REGIONS = [
    { id: 'forest', name: '苔光秘林', subtitle: '字根在古樹之間甦醒', color: '#75dba0', boss: 'thorn' },
    { id: 'mirror', name: '碎月書庫', subtitle: '讓咒語穿透月影與幻象', color: '#9d9bff', boss: 'witch' },
    { id: 'void', name: '失名王座', subtitle: '為被遺忘的世界找回名字', color: '#ff9174', boss: 'king' },
    { id: 'astral', name: '星誓花庭', subtitle: '讓未完成的約定重新成為星光', color: '#efb2e3', boss: 'astral' }
  ];
  var ITEMS = {
    potion: { id: 'potion', name: '苔露藥水', icon: '✚', description: '恢復 38 點生命；任何探索階段皆可使用。', price: 24 },
    bomb: { id: 'bomb', name: '星火炸彈', icon: '✹', description: '造成 42 點無視護盾的傷害。', price: 30 },
    hourglass: { id: 'hourglass', name: '凝時沙漏', icon: '⌛', description: '敵方大型招式延後 6 秒；敵人與飛彈減速 6 秒。', price: 22 },
    barrier: { id: 'barrier', name: '琥珀護符', icon: '◇', description: '立即獲得 30 點護盾，持續至戰鬥結束。', price: 25 },
    focus: { id: 'focus', name: '靈感墨水', icon: '◆', description: '接下來 3 次咒語傷害增加 12 點。', price: 26 }
  };
  var RELICS = {
    ember: { id: 'ember', name: '餘燼羽毛', icon: '♨', description: '所有咒語傷害增加 4 點。', price: 65 },
    moss: { id: 'moss', name: '苔心種子', icon: '❧', description: '每次正確施法恢復 2 點生命。', price: 65 },
    shell: { id: 'shell', name: '古龍鱗片', icon: '▰', description: '每場戰鬥開始時獲得 18 點護盾。', price: 60 },
    prism: { id: 'prism', name: '詞源稜鏡', icon: '◈', description: '本命咒語額外造成 14 點傷害。', price: 65 },
    clock: { id: 'clock', name: '靜夜懷錶', icon: '◷', description: '敵方大型招式的準備時間延長 2 秒。', price: 65 },
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
    { word: 'storm', zh: '風暴', name: '風暴術', type: 'attack', power: 19 },
    { word: 'wind', zh: '風', name: '風刃術', type: 'attack', power: 17 }
  ];
  // Spatial boons also appear in the existing reward/shop pools. Old turn-based
  // saves retain their original behavior until the arena is lazily created.
  Object.assign(RELICS, {
    gale: { id: 'gale', name: '迅風羽', icon: '➶', description: '移動速度增加 22%；衝刺冷卻縮短 0.25 秒。', price: 65 },
    thunderstep: { id: 'thunderstep', name: '雷步印', icon: 'ϟ', description: '衝刺結束時，對 100 步內的敵人各造成 10 點穿透傷害。', price: 70 },
    starlace: { id: 'starlace', name: '連星線', icon: '✧', description: '施法命中後，對目標 180 步內的另一名敵人追加 8 點穿透傷害。', price: 70 },
    frostglass: { id: 'frostglass', name: '霜時石', icon: '❄', description: '每次正確施法後，敵人與飛彈減速 35%，持續 2 秒。', price: 70 }
  });
  // Challenge trophies are earned from their owner, never from a normal loot roll.
  Object.assign(RELICS, {
    goldseal: { id: 'goldseal', name: '契金王印', icon: '¤', description: '獲得的金幣增加 25%，可與拾星口袋疊加。', special: true },
    dewheart: { id: 'dewheart', name: '千露之心', icon: '❦', description: '每次正確施法恢復 3 點生命，可與苔心種子疊加。', special: true },
    forgecore: { id: 'forgecore', name: '不滅爐心', icon: '♨', description: '所有咒語傷害增加 7 點。', special: true },
    wayfinder: { id: 'wayfinder', name: '活頁星圖', icon: '✥', description: '每次迅捷施法獲得 5 點護盾，護盾上限為 90。', special: true },
    ferrypass: { id: 'ferrypass', name: '歸航燈票', icon: '☽', description: '每趟遠征一次：受到致命傷時恢復 70 點生命，並獲得 20 點護盾。', special: true },
    lanternwake: { id: 'lanternwake', name: '不眠星燈', icon: '✺', description: '每場戰鬥開始時獲得 12 點護盾，可與古龍鱗片疊加。', special: true },
    echoquill: { id: 'echoquill', name: '複音羽筆', icon: '♫', description: '本命咒語的基礎傷害增加 8 點。', special: true },
    paperedge: { id: 'paperedge', name: '千摺刃印', icon: '▱', description: '所有咒語傷害增加 3 點；護盾咒額外獲得 6 點護盾。', special: true }
  });
  var NPCS = {
    merchant: { id: 'merchant', name: '鍍金旅商・柯恩', title: '流浪商人', sprite: 'merchant', color: '#f3c26f', icon: '◆',
      description: '他收購旅人的珍物，也把未清償的契約鑄成金幣。', helpDescription: '花費金幣購買補給與遺物；交易不會取消挑戰資格。',
      challengeWord: 'debt', challengeDescription: '輸入 debt 宣告拒絕契約，挑戰金幣彈幕與封路金庫。', lootId: 'goldseal', lootName: '契金王印', hp: 260,
      patterns: ['追債金雨', '金庫封街'] },
    healer: { id: 'healer', name: '苔露醫師・芙苓', title: '苔露醫師', sprite: 'healer', color: '#91dfb1', icon: '❦',
      description: '她用月露照料傷者，藥箱底下卻藏著帶刺的古老誓言。', helpDescription: '恢復 45 點生命，並獲得 1 瓶苔露藥水。',
      challengeWord: 'thorn', challengeDescription: '輸入 thorn 喚醒荊棘誓言，迎戰追蹤毒花與環形根蔓。', lootId: 'dewheart', lootName: '千露之心', hp: 235,
      patterns: ['藥園禁足', '千露根環'] },
    smith: { id: 'smith', name: '星鐵鍛師・布洛', title: '星鐵鍛師', sprite: 'smith', color: '#ffa578', icon: '⚒',
      description: '他的巨錘能替咒語鍛出鋒芒，也能把整座庭院當作鐵砧。', helpDescription: '本趟所有咒語威力永久增加 4 點。',
      challengeWord: 'forge', challengeDescription: '輸入 forge 提出試煉，閃避巨錘落點與熔鐵橫掃。', lootId: 'forgecore', lootName: '不滅爐心', hp: 280,
      patterns: ['星鐵墜錘', '熔爐掃刃'] },
    cartographer: { id: 'cartographer', name: '迷途繪師・墨里', title: '迷途繪師', sprite: 'cartographer', color: '#b8abff', icon: '✥',
      description: '他不停重畫不存在的道路，據說每張星圖都有自己的意志。', helpDescription: '獲得一件未持有的探索遺物；已全數擁有時改贈 40 金幣。',
      challengeWord: 'erase', challengeDescription: '輸入 erase 擦去星圖，穿越格線封鎖與交錯星軌。', lootId: 'wayfinder', lootName: '活頁星圖', hp: 240,
      patterns: ['刪界方格', '錯位星軌'] },
    ferryman: { id: 'ferryman', name: '渡燈船夫・赫渡', title: '渡燈船夫', sprite: 'ferryman', color: '#8ccce3', icon: '☽',
      description: '他替迷失的燈火引路，卻從不回答河流通往何處。', helpDescription: '生命上限增加 10、恢復 20 點生命，並獲得 20 金幣。',
      challengeWord: 'toll', challengeDescription: '輸入 toll 質疑渡河代價，躲過靈潮與吸魂燈火。', lootId: 'ferrypass', lootName: '歸航燈票', hp: 265,
      patterns: ['忘川渡潮', '引魂燈陣'] }
  };
  Object.assign(NPCS, {
    lantern: { id: 'lantern', name: '燈旅精靈・路米', title: '提燈同行者', sprite: 'lantern', color: '#81ead8', icon: '✺', companionRole: 'support',
      description: '它把遠行者的願望收進星燈，會跟在你身後，替即將熄滅的勇氣續光。', helpDescription: '邀請路米同行至本趟結束；跟隨走位，戰鬥中定期補充護盾。',
      challengeWord: 'eclipse', challengeDescription: '輸入 eclipse 熄去星燈，閃避追光燈陣與層疊日蝕環。', lootId: 'lanternwake', lootName: '不眠星燈', hp: 245,
      patterns: ['追光燈陣', '不眠日蝕'] },
    echo: { id: 'echo', name: '回聲學徒・伊可', title: '複音詠唱者', sprite: 'echo', color: '#c8a4ff', icon: '♫', companionRole: 'mimic',
      description: '伊可總慢半拍念出你的最後一個字；那些回聲卻能化為真正的魔法。', helpDescription: '邀請伊可同行至本趟結束；成功施法後，延遲模仿攻擊、治癒或護盾咒。錯字不會被模仿。',
      challengeWord: 'silence', challengeDescription: '輸入 silence 打斷回聲，迎戰複音光束與延遲落點；第二道攻勢會晚一步落下。', lootId: 'echoquill', lootName: '複音羽筆', hp: 250,
      patterns: ['雙聲迴廊', '遲來的咒語'] },
    sentinel: { id: 'sentinel', name: '紙甲衛士・折鋒', title: '千摺守衛', sprite: 'sentinel', color: '#f5d48c', icon: '▱', companionRole: 'guard',
      description: '一頁古老的守護誓言摺成了鎧甲。它不說話，只會跟上值得守護的旅人。', helpDescription: '邀請折鋒同行至本趟結束；跟隨玩家，定期以紙刃迎擊附近敵人。',
      challengeWord: 'unfold', challengeDescription: '輸入 unfold 展開戰書，躲過摺紙斬線與千刃交叉突擊。', lootId: 'paperedge', lootName: '千摺刃印', hp: 290,
      patterns: ['摺界斬', '千刃列陣'] }
  });
  Object.assign(RELICS, {
    moonbrooch: { id: 'moonbrooch', name: '露米娜的月紋別針', icon: '✧', description: '每場戰鬥開始時獲得 10 點護盾；每次迅捷施法恢復 1 點生命。', special: true },
    starpromise: { id: 'starpromise', name: '雙星之約', icon: '✧', description: '完成星光之約的紀念；本命咒語額外造成 10 點傷害。', special: true }
  });
  NPCS.lumina = { id: 'lumina', name: '星露法師・露米娜', title: '24 歲・觀星研究員', age: 24, sprite: 'lumina', color: '#efb2e3', icon: '✧', companionRole: 'starmage',
    description: '帽緣綴著小月亮的年輕女法師，正尋找被遺忘的星座。她記得每一份心意，也願意陪你踏上長路。', helpDescription: '邀請露米娜同行；定期恢復少量生命，並以星光模仿你的成功施法。',
    challengeWord: 'starlight', challengeDescription: '輸入 starlight 邀請友誼試煉；閃避連星光線與花庭月環。勝敗不會抹去既有的情誼。', lootId: 'moonbrooch', lootName: '露米娜的月紋別針', hp: 265, patterns: ['連星練習曲', '月花圓舞'] };
  // Explicit campaign versioning keeps both twelve- and eighteen-node saves intact.
  function getNodesPerRegion(s) { return s && s.nodesPerRegion === 6 ? 6 : 4; }
  function getRegionCount(s) { return s && s.regionCount === 4 ? 4 : 3; }
  function getCampaignLength(s) { return getNodesPerRegion(s) * getRegionCount(s); }
  function startingShield(s) { return (has(s, 'shell') ? 18 : 0) + (has(s, 'lanternwake') ? 12 : 0) + (has(s, 'moonbrooch') ? 10 : 0); }
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
    ],
    [
      { id: 'stardust', name: '碎誓星塵', description: '失散的星屑聚成生命，追逐仍然明亮的心。' },
      { id: 'starling', name: '月羽星雀', description: '羽翼折射遺忘的光，以成串星箭守住花庭。' },
      { id: 'astrolabe', name: '失序星儀', description: '逆向運轉的觀星儀器，蓄力後沿星軌突進。' }
    ]
  ];
  var BOSS = {
    thorn: { id: 'thorn', name: '棘冠典獄長', description: '交替編織荊棘護盾與重擊；本命咒語可穿透部分護盾。', hp: 205 },
    witch: { id: 'witch', name: '鏡月女巫', description: '月蝕會吸取生命；用護盾擋住傷害，就能阻止她恢復。', hp: 280 },
    king: { id: 'king', name: '失名之王', description: '每三次行動蓄力末頁湮滅；把沙漏與護符留給重擊。', hp: 365 },
    astral: { id: 'astral', name: '忘誓星龍', description: '龍翼刻出星軌，接著落下延遲星雨；第二階段月環與交錯光線接連爆發。', hp: 440 },
    constellation: { id: 'constellation', name: '失約星影', description: '它複寫你停留的位置，再以雙星連線封住歸途；移動後別急著折返。', hp: 320 }
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
    var value = Math.round(amount * (1 + (has(s, 'purse') ? 0.35 : 0) + (has(s, 'goldseal') ? 0.25 : 0)));
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
      } else if (has(s, 'ferrypass') && !s.ferryPassUsed) {
        s.ferryPassUsed = true; s.player.hp = Math.min(70, s.player.maxHp); s.player.shield += 20;
        event(s, 'revive', '歸航燈票燃起！船夫送你回到此岸，恢復 70 點生命並獲得 20 點護盾。');
      } else {
        s.status = 'lost'; s.player.hp = 0;
        event(s, 'lost', '你的燈火暫時熄滅了。帶著學會的咒語，再次出發吧。');
      }
    }
    return { damage: actual, blocked: blocked };
  }
  function hitEnemy(s, damage, pierce, damageLimit) {
    if (!s.enemy) return 0;
    var direct = Math.round(damage * (pierce || 0));
    var blocked = Math.min(s.enemy.shield, damage - direct);
    s.enemy.shield -= blocked;
    var actual = Math.min(s.enemy.hp, damage - blocked, Number.isFinite(damageLimit) ? Math.max(0, damageLimit) : Infinity);
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
  function createRun(card, practice, seed, profile) {
    var source = card && typeof card.word === 'string' && card.word.trim() ? card : { word: 'magic', zh: '魔法', rarity: 'N' };
    var cleanCard = { word: source.word.trim().toLowerCase(), zh: source.zh || source.word, rarity: source.rarity || 'N', root: source.root || '' };
    var rarity = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 }[cleanCard.rarity] || 0;
    var runSeed = seed === undefined ? Date.now() : seed;
    var s = {
      version: 1, nodesPerRegion: 6, regionCount: 4, companions: [], relationship: Story.createProfile(profile), giftDrops: [], bondQuest: null, status: 'route', practice: !!practice, card: cleanCard, cardBonus: rarity,
      seed: runSeed, rng: hash(runSeed),
      region: 0, regionName: REGIONS[0].name, encounter: 0, completedNodes: 0,
      player: { hp: 120 + rarity * 3, maxHp: 120 + rarity * 3, shield: 0, gold: 35, power: 0, combo: 0, focus: 0 },
      enemy: null, npc: null, spell: null, queue: [], routes: [], rewards: [], shop: [], inventory: [], relics: [],
      generatedSpells: 0, elapsed: 0, log: [], eventId: 0, lastEvent: null, phoenixUsed: false,
      stats: { casts: 0, correct: 0, mistakes: 0, maxCombo: 0, damageDealt: 0, damageTaken: 0, healing: 0,
        enemiesDefeated: 0, bossesDefeated: 0, npcBossesDefeated: 0, goldEarned: 0, itemsUsed: 0, fastCasts: 0, elapsed: 0 }
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
    var nodes = getNodesPerRegion(s), localNode = s.encounter % nodes;
    s.region = Math.min(getRegionCount(s) - 1, Math.floor(s.encounter / nodes)); s.regionName = REGIONS[s.region].name;
    s.routes = [];
    if (localNode === nodes - 1) {
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
    var alternatives = shuffle(s, ['elite', 'treasure', 'camp', 'shop', 'npc']).slice(0, 2);
    // A safe rest is always available directly before the second and third bosses.
    if (localNode === nodes - 2 && alternatives.indexOf('camp') < 0) alternatives[1] = 'camp';
    // Each expanded chapter offers a random un-recruited companion early on.
    var recruits = ['lantern', 'echo', 'sentinel'].filter(function (id) { return !(s.companions || []).some(function (c) { return c.id === id; }); });
    if (nodes === 6 && localNode === 1 && recruits.length && alternatives.indexOf('npc') < 0) alternatives[1] = 'npc';
    var luminaVisit = s.regionCount === 4 && s.region === 0 && localNode === 2;
    if (luminaVisit && alternatives.indexOf('npc') < 0) alternatives[1] = 'npc';
    if (alternatives.indexOf('npc') >= 0) {
      var visitors = (s.region === 0 ? ['healer', 'smith', 'cartographer'] : s.region === 1 ? ['healer', 'cartographer', 'ferryman'] : ['smith', 'cartographer', 'ferryman']).concat(recruits, s.regionCount === 4 ? ['lumina'] : []);
      if (nodes === 6 && localNode === 1 && recruits.length) visitors = recruits;
      var visitor = NPCS[luminaVisit ? 'lumina' : pick(s, visitors)];
      definitions.npc = { npcId: visitor.id, name: visitor.name, icon: visitor.icon, description: visitor.description, danger: '旅途邂逅' };
    }
    s.routes = ['battle'].concat(alternatives).map(function (kind) {
      return Object.assign({ id: kind, type: kind }, definitions[kind]);
    });
  }
  function makeIntent(s) {
    var e = s.enemy, turn = e.turn, damage = 8 + s.region * 4 + (e.kind === 'elite' ? 4 : 0);
    var duration = 10.5 - s.region * 0.4, kind = 'attack', name = '蓄力撞擊', description = '準備攻擊；護盾會優先吸收傷害。', shield = 0;
    if (e.kind === 'boss') {
      damage = 12 + s.region * 4 + (e.phase === 2 ? 4 : 0); duration = e.phase === 2 ? 9.5 : 11;
      if (e.isNpcBoss && NPCS[e.npcId]) {
        var npc = NPCS[e.npcId]; name = npc.patterns[turn % 2]; duration = e.phase === 2 ? 7.5 : 9.5;
        description = npc.challengeDescription; damage += 2;
        if (e.npcId === 'smith' && turn % 2 === 0) { kind = 'guard'; shield = e.phase === 2 ? 20 : 12; }
        if (e.npcId === 'ferryman' && turn % 2 === 1) kind = 'drain';
      } else if (e.id === 'thorn') {
        if (turn % 3 === 0) { name = '荊棘結界'; kind = 'guard'; shield = e.phase === 2 ? 22 : 16; damage = 5; description = '獲得荊棘護盾並造成小量傷害；本命咒語能穿透一半護盾。'; }
        else { name = '棘冠重擊'; description = '荊棘即將落下，及時施放護盾或擊敗它。'; }
      } else if (e.id === 'witch') {
        if (turn % 3 === 1) { name = '鏡面折光'; kind = 'guard'; shield = 24; damage = 6; description = '鏡面會形成護盾，準備本命咒語突破。'; }
        else { name = '月蝕汲取'; kind = 'drain'; description = '造成傷害並吸取等量生命；護盾可阻止生命被吸取。'; }
      } else if (e.id === 'astral' || e.id === 'constellation') {
        name = e.id === 'constellation' ? (turn % 2 ? '雙星斷章' : '未寄出的回聲') : ['龍翼星軌', '忘誓流星', '花庭星環'][turn % 3];
        duration = e.phase === 2 ? 8.5 : 10;
        description = e.description;
        if (turn % 3 === 2) { kind = 'guard'; shield = e.phase === 2 ? 24 : 16; }
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
    s.status = 'combat'; s.player.combo = 0; s.player.shield = startingShield(s);
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
      var gift = awardGift(s, true);
      makeRewards(s, true); event(s, 'treasure', '寶匣裡有 ' + amount + ' 金幣。再選擇一份寶藏帶走。' + (gift ? '另找到' + Story.GIFTS[gift].name + '。' : ''), { gift: gift });
    } else if (route.type === 'camp') {
      s.status = 'camp'; event(s, 'camp', '星燈下十分安全。休息回復生命，或磨練咒語威力。');
    } else if (route.type === 'npc' && NPCS[route.npcId] && route.npcId !== 'merchant') {
      s.status = 'npc'; s.npc = { id: route.npcId, encounter: s.encounter, helped: false, challenged: false, defeated: false };
      event(s, 'npc', NPCS[route.npcId].name + ' 正在路旁等候。靠近交談，可以接受幫助，或主動提出挑戰。');
    } else { makeShop(s); event(s, 'shop', '流浪商人掀開斗篷：「下一個房間，也許正好用得上。」'); }
    return done('進入' + route.name + '。');
  }
  function makeRewards(s, guaranteedRelic) {
    s.status = 'reward';
    var available = Object.keys(RELICS).filter(function (id) { return !RELICS[id].special && !has(s, id); });
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
  function awardGift(s, guaranteed) {
    // The roll is tied to the seeded encounter and saved even when it yields no gift.
    // Reopening a reward screen cannot roll again or consume the campaign RNG.
    var key = String(s.encounter) + (s.bondQuest && s.bondQuest.active ? ':bond-' + s.bondQuest.step : ':main');
    if (!Array.isArray(s.giftDrops)) s.giftDrops = [];
    if (s.giftDrops.indexOf(key) >= 0) return null;
    s.giftDrops.push(key);
    var roll = hash(String(s.seed) + ':gift:' + key);
    if (!guaranteed && s.encounter !== 0 && roll % 100 >= 58) return null;
    var id = guaranteed && s.enemy && s.enemy.kind === 'boss' ? 'star' : ['flower', 'tea', 'flower', 'star'][Math.floor(roll / 100) % 4];
    s.relationship = Story.createProfile(s.relationship);
    s.relationship.gifts[id] = Math.min(999, s.relationship.gifts[id] + 1);
    return id;
  }
  function winEncounter(s) {
    if (s.status !== 'combat' || !s.enemy) return;
    var e = s.enemy;
    s.stats.enemiesDefeated += 1;
    if (e.kind === 'boss' && !e.isNpcBoss && !e.isStoryBoss) s.stats.bossesDefeated += 1;
    if (e.isNpcBoss) s.stats.npcBossesDefeated = (s.stats.npcBossesDefeated || 0) + 1;
    var amount = coins(s, e.kind === 'boss' ? 55 + s.region * 15 : e.kind === 'elite' ? 42 + s.region * 9 : 22 + s.region * 7);
    s.player.shield = 0; s.player.combo = 0;
    var drop = null;
    if (e.kind === 'boss' || random(s) < 0.42) { drop = pick(s, Object.keys(ITEMS)); addItem(s, drop); }
    var gift = awardGift(s, e.kind === 'boss');
    var message = '擊敗' + e.name + '！獲得 ' + amount + ' 金幣' + (drop ? '與' + ITEMS[drop].name : '') + '。' + (gift ? ' 找到心意小物「' + Story.GIFTS[gift].name + '」。' : '');
    var specialLoot = e.isNpcBoss && NPCS[e.npcId] ? NPCS[e.npcId].lootId : null;
    if (specialLoot) {
      if (addRelic(s, specialLoot)) message += ' 特殊戰利品「' + RELICS[specialLoot].name + '」已放入背包！';
      else message += ' 已持有特殊戰利品，額外獲得 ' + coins(s, 35) + ' 金幣。';
      if (s.npc) s.npc.defeated = true;
    }
    if (e.isStoryBoss) {
      s.relationship = Story.createProfile(s.relationship); s.relationship.questCleared = true;
      s.relationship.affection = Math.min(100, s.relationship.affection + 8);
      if (s.relationship.scenes.indexOf('lumina-promise') < 0) s.relationship.scenes.push('lumina-promise');
      addRelic(s, 'starpromise'); message += ' 星圖重新完整，獲得專屬遺物「雙星之約」。';
    }
    if (s.encounter === getCampaignLength(s) - 1 && e.id === REGIONS[getRegionCount(s) - 1].boss && !e.isNpcBoss && !e.isStoryBoss) {
      s.status = 'won'; s.completedNodes = getCampaignLength(s);
      event(s, 'won', '最後的封印化作晨光。你為世界找回了名字！' + message, { gold: amount, drop: drop, gift: gift });
    } else {
      if (e.kind === 'boss' && !e.isNpcBoss) heal(s, 24);
      makeRewards(s, e.kind !== 'battle');
      event(s, 'victory', message + (e.kind === 'boss' && !e.isNpcBoss ? '區域淨化，恢復 24 點生命。' : ''), { gold: amount, drop: drop, gift: gift, specialLoot: specialLoot });
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
  function submit(s, text, options) {
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
    var rawDamage = base + p.power + (has(s, 'ember') ? 4 : 0) + (has(s, 'forgecore') ? 7 : 0) + (has(s, 'paperedge') ? 3 : 0) + (has(s, 'fang') && p.combo >= 3 ? 6 : 0)
      + (spell.type === 'signature' && has(s, 'prism') ? 14 : 0) + (spell.type === 'signature' && has(s, 'echoquill') ? 8 : 0) + (spell.type === 'signature' && has(s, 'starpromise') ? 10 : 0) + (p.focus > 0 ? 12 : 0);
    var damage = hitEnemy(s, Math.round(rawDamage * multiplier), spell.type === 'signature' ? 0.5 : 0, options && options.damageLimit);
    var healing = spell.type === 'heal' ? heal(s, spell.power + p.power) : 0, shield = 0;
    if (has(s, 'moss')) healing += heal(s, 2);
    if (has(s, 'dewheart')) healing += heal(s, 3);
    if (fast && has(s, 'moonbrooch')) healing += heal(s, 1);
    if (spell.type === 'shield') { shield = Math.min(Math.max(0, 90 - p.shield), spell.power + p.power + (has(s, 'paperedge') ? 6 : 0)); p.shield += shield; }
    if (fast && has(s, 'wayfinder')) { var starShield = Math.min(5, Math.max(0, 90 - p.shield)); shield += starShield; p.shield += starShield; }
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
    if (s.bondQuest && s.bondQuest.active) {
      s.rewards = [];
      if (s.bondQuest.step < 2) { s.bondQuest.step += 1; startBondRoom(s); }
      else {
        s.bondQuest.active = false; s.bondQuest.completed = true; s.status = 'npc'; s.enemy = null; s.arena = null;
        s.currentRoute = s.bondQuest.originalRoute; s.npc = Object.assign({}, s.bondQuest.originalNpc, { id: 'lumina', encounter: s.encounter, challenged: false, defeated: false });
      }
      return;
    }
    s.completedNodes = s.encounter + 1; s.encounter += 1;
    s.rewards = []; s.shop = []; s.npc = null;
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
    s.npc = { id: 'merchant', encounter: s.encounter, helped: false, challenged: false, defeated: false };
    var itemIds = ['potion'].concat(shuffle(s, ['bomb', 'hourglass', 'barrier', 'focus']).slice(0, 2));
    s.shop = itemIds.map(function (id) { return Object.assign({}, ITEMS[id], { id: 'buy-' + id, itemId: id, kind: 'item', sold: false }); });
    var available = Object.keys(RELICS).filter(function (id) { return !RELICS[id].special && !has(s, id); });
    if (available.length) {
      var id = pick(s, available); s.shop.push(Object.assign({}, RELICS[id], { id: 'buy-' + id, relicId: id, kind: 'relic', sold: false }));
    }
  }
  function getNpc(s) {
    if (!s || (s.status !== 'shop' && s.status !== 'npc')) return null;
    // Upgrade existing shop saves without changing offers or their sold state.
    if (s.status === 'shop' && (!s.npc || s.npc.id !== 'merchant' || s.npc.encounter !== s.encounter)) {
      s.npc = { id: 'merchant', encounter: s.encounter, helped: false, challenged: false, defeated: false };
    }
    return s.npc && NPCS[s.npc.id] || null;
  }
  function friendlyLumina(s) {
    var npc = getNpc(s);
    return npc && npc.id === 'lumina' && s.status === 'npc' && !s.npc.challenged;
  }
  function remember(s, id) {
    if (s.relationship.scenes.indexOf(id) < 0) s.relationship.scenes.push(id);
  }
  function giveGift(s, id) {
    if (!friendlyLumina(s)) return fail('請先與露米娜交談，再送出小物品。');
    if (!Object.prototype.hasOwnProperty.call(Story.GIFTS, id)) return fail('找不到這份心意。');
    var profile = Story.createProfile(s.relationship), gift = Story.GIFTS[id];
    if (profile.gifts[id] <= 0) return fail('背包裡還沒有這份小物品。');
    if ((s.npc.giftsGiven || 0) >= 3) return fail('她想好好收藏今天的心意；下次邂逅再送禮吧。');
    if (profile.affection >= 100) return fail('心意已經滿滿了，把小物品留作旅途紀念吧。');
    profile.gifts[id] -= 1; profile.affection = Math.min(100, profile.affection + gift.affection);
    s.relationship = profile; s.npc.giftsGiven = (s.npc.giftsGiven || 0) + 1;
    var scene = Story.dialogue(s); remember(s, scene.id);
    var message = '露米娜收下' + gift.name + '：「謝謝你還記得我喜歡這個。」好感度 +' + gift.affection + '。';
    event(s, 'bond-gift', message, { gift: id, affection: profile.affection });
    return done(message);
  }
  function talkNpc(s, choice) {
    if (!friendlyLumina(s)) return fail('現在無法與露米娜談心。');
    if (choice !== undefined && ['listen', 'stars', 'journey'].indexOf(choice) < 0) return fail('請選擇聆聽她的故事。');
    s.relationship = Story.createProfile(s.relationship);
    if (!s.npc.talked) { s.npc.talked = true; s.relationship.affection = Math.min(100, s.relationship.affection + 1); }
    var scene = Story.dialogue(s); remember(s, scene.id);
    event(s, 'bond-talk', scene.text, { scene: scene.id });
    return done(scene.text, { scene: scene });
  }
  function startBondRoom(s) {
    var quest = s.bondQuest, step = quest.step;
    var template = step === 2 ? BOSS.constellation : {
      id: step === 0 ? 'stardust' : 'starling', name: step === 0 ? '殘星守望者' : '月花記憶',
      description: step === 0 ? '穿過變換的星軌，找回第一片座標。' : '採集月露花光，守護她未說完的心願。', hp: (step === 0 ? 145 : 180) + s.region * 22
    };
    s.status = 'combat'; s.arena = null; s.exploration = null; s.rewards = [];
    s.player.combo = 0; s.player.shield = startingShield(s);
    s.enemy = Object.assign({}, template, { kind: step === 2 ? 'boss' : 'elite', isStoryBoss: step === 2,
      hp: template.hp, maxHp: template.hp, shield: 0, phase: 1, turn: 0 });
    s.currentRoute = { id: 'bond-' + step, type: step === 2 ? 'boss' : 'elite', name: Story.QUEST[step].title, storyRoom: ['starlanes', 'bloom', null][step] };
    s.spell.elapsed = 0; makeIntent(s);
    remember(s, 'bond-' + step);
    event(s, 'story', Story.QUEST[step].text);
  }
  function beginBondQuest(s) {
    if (!friendlyLumina(s)) return fail('請先走近露米娜，聽她說明星光之約。');
    var profile = Story.createProfile(s.relationship);
    if (profile.affection < 45) return fail('好感度達到 45，露米娜才會分享這段私人旅程。');
    if (profile.questCleared || s.bondQuest && s.bondQuest.active) return fail('這段星光之約已經開啟或完成。');
    s.relationship = profile;
    if (!s.npc.helped) helpNpc(s);
    s.bondQuest = { active: true, step: 0, originEncounter: s.encounter, originalRoute: copy(s.currentRoute), originalNpc: copy(s.npc) };
    startBondRoom(s);
    return done('與露米娜踏上星光之約。完成三個房間後，會回到目前的旅途節點。');
  }
  function confessBond(s) {
    if (!friendlyLumina(s)) return fail('請親自走到露米娜身邊，再告訴她你的心意。');
    var profile = Story.createProfile(s.relationship);
    if (profile.dating) return fail('你們已經約定一起走向下一個明天。');
    if (profile.affection < 75 || !profile.questCleared) return fail('好感度達到 75，並完成星光之約後，才能選擇告白。');
    profile.dating = true; s.relationship = profile; remember(s, 'lumina-confession');
    var text = Story.SCENES['lumina-confession'].text;
    event(s, 'bond-romance', text, { scene: 'lumina-confession' });
    return done(text);
  }
  function helpNpc(s) {
    var npc = getNpc(s);
    if (!npc || s.status !== 'npc') return fail('請與旅途中的夥伴交談；商人的補給需要交易。');
    if (s.npc.helped || s.npc.challenged) return fail('這次邂逅已經做出選擇，無法再次取得幫助或挑戰。');
    s.npc.helped = true;
    var message;
    if (npc.companionRole) {
      if (!Array.isArray(s.companions)) s.companions = [];
      if (!s.companions.some(function (c) { return c.id === npc.id; }) && (s.companions.length < 3 || npc.id === 'lumina' || s.companions.some(function (c) { return c.id === 'lumina'; }) && s.companions.length < 4)) {
        s.companions.push({ id: npc.id, npcId: npc.id, name: npc.name, sprite: npc.sprite, color: npc.color, role: npc.companionRole });
        message = npc.name + ' 加入隊伍，將陪伴你走完本趟遠征。';
      } else { addItem(s, 'potion'); message = npc.name + ' 已與你同行，送你一瓶苔露藥水。'; }
    } else if (npc.id === 'healer') { var healed = heal(s, 45); addItem(s, 'potion'); message = '芙苓包紮了傷口，恢復 ' + healed + ' 點生命，並送你 1 瓶苔露藥水。'; }
    else if (npc.id === 'smith') { s.player.power += 4; message = '布洛替咒語淬上星鐵：本趟咒語威力永久增加 4。'; }
    else if (npc.id === 'cartographer') {
      var options = ['gale', 'clock', 'starlace', 'frostglass'].filter(function (id) { return !has(s, id); });
      if (options.length) { var relic = pick(s, options); addRelic(s, relic); message = '墨里從星圖取出「' + RELICS[relic].name + '」，交到你手中。'; }
      else message = '你已集齊探索遺物，墨里改贈 ' + coins(s, 40) + ' 金幣作為盤纏。';
    } else { s.player.maxHp += 10; var recovery = heal(s, 20); message = '赫渡點亮歸航燈：生命上限增加 10，恢復 ' + recovery + ' 點生命，獲得 ' + coins(s, 20) + ' 金幣。'; }
    s.npc.helpMessage = message;
    event(s, 'npc-help', message + ' 接受善意後，本次邂逅不再能提出挑戰。');
    return done(message);
  }
  function challengeNpc(s, text) {
    var npc = getNpc(s);
    if (!npc) return fail('現在沒有可以挑戰的旅人。');
    if (s.npc.helped || s.npc.challenged || s.npc.defeated) return fail('這次邂逅已經做出選擇，無法再次挑戰。');
    var normalized = String(text || '').trim().toLowerCase();
    if (normalized !== npc.challengeWord) return fail('只有完整輸入「' + npc.challengeWord + '」才會展開首領戰；一般交談不會觸發戰鬥。');
    s.npc.challenged = true; s.status = 'combat'; s.player.combo = 0;
    s.player.shield = startingShield(s); s.shop = []; s.arena = null;
    var hp = npc.hp + s.region * 60;
    s.enemy = { id: 'npc-' + npc.id, npcId: npc.id, isNpcBoss: true, sprite: npc.sprite,
      name: npc.name, description: npc.challengeDescription, kind: 'boss', hp: hp, maxHp: hp, shield: 0, phase: 1, turn: 0 };
    s.spell.elapsed = 0; makeIntent(s);
    event(s, 'encounter', npc.name + ' 接下挑戰！擊敗後可獲得專屬遺物「' + npc.lootName + '」。');
    return done('挑戰開始：' + npc.name + '。');
  }
  function leaveNpc(s) {
    if (s.status !== 'npc' || !getNpc(s)) return fail('目前沒有旅途邂逅可離開。');
    var name = getNpc(s).name;
    nextEncounter(s); event(s, 'route', '向' + name + '道別，繼續旅程。');
    return done('繼續探索。');
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
  function useItem(s, id, options) {
    if (s.status === 'won' || s.status === 'lost') return fail('這趟遠征已經結束。');
    var item = s.inventory.find(function (i) { return i.id === id; });
    if (!item || item.count <= 0) return fail('背包裡沒有這件道具。');
    if (id !== 'potion' && s.status !== 'combat') return fail('這件道具只能在戰鬥中使用。');
    if (id === 'potion' && s.player.hp >= s.player.maxHp) return fail('生命已滿，先保留藥水。');
    if (id === 'barrier' && s.player.shield >= 90) return fail('護盾已達上限。');
    var message, damage = 0;
    item.count -= 1; s.stats.itemsUsed += 1;
    if (id === 'potion') message = '喝下苔露藥水，恢復 ' + heal(s, 38) + ' 點生命。';
    else if (id === 'bomb') { damage = hitEnemy(s, 42, 1, options && options.damageLimit); message = '星火炸彈爆開，造成 ' + damage + ' 點穿透傷害！'; }
    else if (id === 'hourglass') { s.enemy.intent.remaining += 6; s.enemy.intent.duration = Math.max(s.enemy.intent.duration, s.enemy.intent.remaining); message = '凝時沙漏啟動：敵方大型招式延後 6 秒。'; }
    else if (id === 'barrier') { var shield = Math.min(30, 90 - s.player.shield); s.player.shield += shield; message = '琥珀護符展開，獲得 ' + shield + ' 點護盾。'; }
    else if (id === 'focus') { s.player.focus += 3; message = '靈感墨水流動：接下來 3 次咒語傷害增加 12。'; }
    event(s, 'item', message, { damage: damage, itemId: id });
    if (s.status === 'combat') { if (s.enemy.hp <= 0) winEncounter(s); else checkPhase(s); }
    return done(message, { damage: damage });
  }
  function damagePlayer(s, amount, options) {
    if (s.status !== 'combat') return { ok: false, damage: 0, blocked: 0, restored: 0 };
    var value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return { ok: false, damage: 0, blocked: 0, restored: 0 };
    var result = hitPlayer(s, Math.round(value));
    result.ok = true; result.restored = 0;
    if (result.damage > 0) s.player.combo = 0;
    if (options && options.drain && s.enemy && s.enemy.hp > 0) {
      result.restored = Math.min(s.enemy.maxHp - s.enemy.hp, result.damage);
      s.enemy.hp += result.restored;
    }
    if (s.status !== 'lost') event(s, 'arena-hit', (options && options.name || '敵人的攻擊') + '：' +
      (result.damage ? '受到 ' + result.damage + ' 點傷害。' : '護盾完全擋住了傷害。'), result);
    return result;
  }
  function damageEnemy(s, amount, pierce) {
    if (s.status !== 'combat' || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return 0;
    var damage = hitEnemy(s, Math.round(Number(amount)), Math.max(0, Math.min(1, Number(pierce) || 0)));
    if (s.enemy.hp <= 0) winEncounter(s); else checkPhase(s);
    return damage;
  }
  function healPlayer(s, amount) {
    return s.status === 'combat' && Number.isFinite(Number(amount)) ? heal(s, Math.max(0, Math.round(Number(amount)))) : 0;
  }
  function resolveArenaIntent(s) {
    if (s.status !== 'combat') return null;
    var e = s.enemy, intent = copy(e.intent);
    e.shield = Math.min(70, e.shield + (intent.shield || 0));
    e.turn += 1; makeIntent(s);
    return intent;
  }
  return { createRun: createRun, submit: submit, tick: tick, chooseRoute: chooseRoute, chooseReward: chooseReward,
    chooseCamp: chooseCamp, useItem: useItem, buy: buy, leaveShop: leaveShop, damagePlayer: damagePlayer,
    damageEnemy: damageEnemy, healPlayer: healPlayer, resolveArenaIntent: resolveArenaIntent,
    getNpc: getNpc, helpNpc: helpNpc, challengeNpc: challengeNpc, leaveNpc: leaveNpc,
    giveGift: giveGift, talkNpc: talkNpc, beginBondQuest: beginBondQuest, confessBond: confessBond,
    getNodesPerRegion: getNodesPerRegion, getRegionCount: getRegionCount, getCampaignLength: getCampaignLength,
    ITEMS: ITEMS, RELICS: RELICS, REGIONS: REGIONS, NPCS: NPCS };
});
