'use strict';
const assert = require('node:assert/strict');
const Engine = require('../dungeon-engine.js');
const Arena = require('../dungeon-arena.js');
function combat(seed = 31, encounter = 0, difficulty = 'standard') {
  const run = Engine.createRun({ word: 'robot', zh: '機器人', rarity: 'N' }, true, seed);
  run.nodesPerRegion = 4; // Exercise compatibility with already-running twelve-room expeditions.
  run.difficulty = difficulty;
  run.encounter = encounter; run.region = Math.floor(encounter / 4);
  if (encounter % 4 === 3) run.routes = [{ id: 'boss', type: 'boss', name: '首領' }];
  Engine.chooseRoute(run, encounter % 4 === 3 ? 'boss' : 'battle'); Arena.ensure(run); return run;
}
function advance(run, seconds, input = {}) { for (let i = 0; i < Math.ceil(seconds / 0.05); i++) Arena.update(run, 0.05, input); }
function sumHp(run) { return run.arena.enemies.reduce((sum, e) => sum + e.hp, 0); }
function roomRun(id) { for (let seed = 0; seed < 100; seed++) { const run = combat(seed); if (run.arena.room.id === id) return run; } throw new Error('missing room ' + id); }
function noAttacks(run) { run.enemy.intent.remaining = 10000; for (const enemy of run.arena.enemies) { enemy.cooldown = 10000; enemy.spawnAt = 10000; } }
const original = combat();
assert.equal(original.arena.width, 960); assert.equal(original.arena.height, 540);
assert.equal(sumHp(original), original.enemy.hp); assert.ok(original.arena.enemies.length >= 3);
const ref = original.arena; assert.equal(Arena.ensure(original), ref, 'ensure does not reset an ongoing room');
assert.deepEqual(combat(7).arena, combat(7).arena, 'deterministic room and actors');

const movement = roomRun('pillars'); noAttacks(movement);
const p = movement.arena.player; p.x = 280; p.y = 165;
advance(movement, 1, { x: 1 });
assert.ok(p.x <= 330 - p.r + 0.001, 'moving cannot pass through pillar');
Arena.update(movement, 0.05, { x: 1, dash: true }); advance(movement, 0.3, { x: 1 });
assert.ok(p.x <= 330 - p.r + 0.001, 'dash cannot clip through pillar');
p.x = 80; p.y = 85; advance(movement, 4, { x: -1, y: -1 });
assert.ok(p.x >= 40 + p.r && p.y >= 58 + p.r, 'movement obeys world bounds');
const dash = roomRun('spring'); noAttacks(dash); const dp = dash.arena.player;
Arena.update(dash, 0.05, { x: 1, dash: true });
assert.equal(dash.arena.dashes, 1); assert.ok(dp.dashTime > 0); assert.ok(dp.invulnerable > 0);
advance(dash, 0.2, { dash: true }); assert.equal(dash.arena.dashes, 1, 'held key does not repeat dash');
Arena.update(dash, 0.05, {}); Arena.update(dash, 0.05, { dash: true });
assert.equal(dash.arena.dashes, 1, 'cooldown prevents re-trigger');
advance(dash, 1.5); Arena.update(dash, 0.05, { dash: true }); assert.equal(dash.arena.dashes, 2);

const focused = roomRun('spring'); noAttacks(focused);
const normal = JSON.parse(JSON.stringify(focused));
advance(focused, 2, { focus: true }); advance(normal, 2);
assert.ok(Math.abs(focused.arena.time / normal.arena.time - 0.18) < 1e-10, 'focus slows world by prescribed factor');
assert.ok(Math.abs(focused.arena.player.focusEnergy - 76) < 1e-8, 'focus drains using real time');
assert.equal(focused.spell.elapsed, normal.spell.elapsed, 'typing speed uses real time, not slowed time');
advance(focused, 7, { focus: true }); assert.equal(focused.arena.player.focusEnergy, 0);
const timeBefore = focused.arena.time; advance(focused, 1, { focus: true });
assert.ok(focused.arena.time - timeBefore > 0.99, 'exhausted focus no longer slows time');
advance(focused, 2); assert.ok(Math.abs(focused.arena.player.focusEnergy - 50) < 1e-8);

const idle = roomRun('spring'); advance(idle, 240);
assert.equal(idle.status, 'lost', 'standing idle cannot survive indefinitely');
const afterLoss = JSON.stringify(idle); advance(idle, 1); assert.equal(JSON.stringify(idle), afterLoss, 'terminal arena is frozen');

const dodge = roomRun('spring'); noAttacks(dodge);
dodge.arena.hazards.push({ id: 'test-hit', kind: 'circle', x: dodge.arena.player.x + 38, y: dodge.arena.player.y,
  r: 65, delay: 0, maxDelay: 0, life: 0.06, damage: 25, source: 'enemy', hit: false });
const beforeDodgeHp = dodge.player.hp;
Arena.update(dodge, 0.05, { x: 1, dash: true });
assert.equal(dodge.player.hp, beforeDodgeHp, 'dash grants actual invulnerability'); assert.equal(dodge.arena.dodges, 1);
const hit = roomRun('spring'); noAttacks(hit);
hit.arena.hazards.push({ id: 'test-hit', kind: 'circle', x: hit.arena.player.x, y: hit.arena.player.y, r: 60, delay: 0, life: 0.3, damage: 25, hit: false });
Arena.update(hit, 0.05, {}); assert.equal(hit.player.hp, hit.player.maxHp - 25, 'same area harms an undodged player');
const escaped = roomRun('spring'); noAttacks(escaped);
escaped.arena.hazards.push({ id: 'telegraph', kind: 'circle', x: escaped.arena.player.x, y: escaped.arena.player.y, r: 45, delay: 1, life: 0.25, damage: 25, hit: false });
advance(escaped, 1.4, { x: 1 }); assert.equal(escaped.player.hp, escaped.player.maxHp, 'walking out of a warning prevents damage');

const shotCover = roomRun('pillars'); noAttacks(shotCover);
shotCover.arena.player.x = 280; shotCover.arena.player.y = 165;
shotCover.arena.projectiles.push({ id: 'cover', x: 430, y: 165, vx: -180, vy: 0, r: 5, life: 5, damage: 25 });
advance(shotCover, 1); assert.equal(shotCover.arena.projectiles.length, 0); assert.equal(shotCover.player.hp, shotCover.player.maxHp, 'pillar blocks projectile');

for (const id of Arena.ROOMS.map(r => r.id)) {
  const run = roomRun(id); assert.equal(run.arena.room.id, id);
  if (id === 'lanes') { advance(run, 3); assert.ok(run.arena.hazards.some(h => h.source === 'trap' && h.kind === 'rect')); }
  if (id === 'embers') assert.equal(run.arena.hazards.filter(h => h.repeat).length, 2);
  if (id === 'bridges') assert.equal(run.arena.obstacles.filter(o => o.type === 'wall').length, 2);
  if (id === 'spring') {
    noAttacks(run); run.player.hp -= 15; run.arena.player.x = 480; run.arena.player.y = 280;
    advance(run, 0.1); assert.equal(run.player.hp, run.player.maxHp - 12, 'spring actually heals');
  }
  if (id === 'waves') {
    assert.equal(run.arena.enemies.filter(e => e.active).length, 2);
    run.player.power = 999; run.arena.player.x = 540; run.arena.player.y = 280;
    const dormant = run.arena.enemies.filter(e => !e.active).map(e => e.hp);
    Arena.cast(run, run.spell.word);
    assert.deepEqual(run.arena.enemies.filter(e => !e.active).map(e => e.hp), dormant, 'overflow cannot kill dormant reinforcements');
    assert.equal(sumHp(run), run.enemy.hp);
    assert.equal(run.status, 'combat');
    const waitingSpell = run.spell.word, bombCount = run.inventory.find(item => item.id === 'bomb').count;
    assert.equal(Arena.cast(run, waitingSpell).ok, false, 'waiting for reinforcements does not consume a spell');
    assert.equal(run.spell.word, waitingSpell);
    assert.equal(Arena.useItem(run, 'bomb').ok, false, 'waiting for reinforcements does not consume a bomb');
    assert.equal(run.inventory.find(item => item.id === 'bomb').count, bombCount);
    advance(run, 9.5, {});
    assert.ok(run.arena.enemies.every(e => e.active), 'third wave really enters');
  }
}

for (const encounter of [3, 7, 11]) {
  const run = combat(2, encounter);
  assert.equal(run.arena.enemies.length, 1); assert.equal(run.arena.enemies[0].kind, 'boss');
  const hp = run.player.hp;
  run.enemy.intent.remaining = 0;
  Arena.update(run, 0.05, {});
  assert.equal(run.player.hp, hp, 'intent expiry is a warning, not unavoidable damage');
  assert.equal(run.arena.patternCount, 1);
  assert.ok(run.arena.hazards.length || run.arena.enemies[0].volley);
  const boss = run.arena.enemies[0];
  const damage = Math.floor(run.enemy.hp * 0.55);
  const applied = Engine.damageEnemy(run, damage, 1); boss.hp -= applied;
  assert.equal(run.enemy.phase, 2);
  Arena.update(run, 0.05, {});
  assert.equal(boss.phase, 2);
  for (let i = 0; i < 3; i++) { run.enemy.intent.remaining = 0; Arena.update(run, 0.05, {}); }
  assert.ok(run.arena.patternCount >= 4, 'phase two maintains varied spatial patterns');
  assert.equal(sumHp(run), run.enemy.hp);
}

const casting = roomRun('pillars');
casting.arena.player.x = 580; casting.arena.player.y = 280;
const nearest = casting.arena.enemies.find(e => e.id === casting.arena.targetId) || casting.arena.enemies[0];
const nearHp = nearest.hp; const totalBefore = casting.enemy.hp;
const result = Arena.cast(casting, casting.spell.word);
assert.equal(result.ok, true); assert.equal(casting.enemy.hp, totalBefore - result.damage);
assert.ok(nearest.hp < nearHp); assert.equal(sumHp(casting), casting.enemy.hp, 'visual actors carry real combat HP');
const bomb = Arena.useItem(casting, 'bomb'); assert.equal(bomb.ok, true); assert.equal(sumHp(casting), casting.enemy.hp, 'bomb reconciles actor HP');
const range = roomRun('spring'); range.arena.player.x = 60; range.arena.player.y = 75;
const rangeWord = range.spell.word;
assert.equal(Arena.cast(range, rangeWord).ok, false); assert.equal(range.spell.word, rangeWord, 'out-of-range casting preserves spell');

const originalSave = combat(41, 7); advance(originalSave, 2, { x: 1, focus: false });
const reloaded = JSON.parse(JSON.stringify(originalSave));
assert.equal(Arena.ensure(reloaded).key, originalSave.arena.key);
advance(originalSave, 1.5, { y: -1, focus: true }); advance(reloaded, 1.5, { y: -1, focus: true });
assert.deepEqual(reloaded, originalSave, 'serialized state resumes deterministically without hidden RNG/timers');

const legacySave = combat(41);
delete legacySave.arena; delete legacySave.difficulty;
legacySave.enemy.hp -= 29;
const preserved = { hp: legacySave.player.hp, enemyHp: legacySave.enemy.hp, spell: legacySave.spell.word, rng: legacySave.rng };
Arena.ensure(legacySave);
assert.equal(legacySave.difficulty, 'standard');
assert.equal(sumHp(legacySave), preserved.enemyHp, 'legacy combat HP is distributed without healing enemies');
assert.deepEqual({ hp: legacySave.player.hp, enemyHp: legacySave.enemy.hp, spell: legacySave.spell.word, rng: legacySave.rng }, preserved,
  'upgrading a pre-arena save preserves its combat progress and random state');

for (const shield of [0, 30]) {
  const drain = combat(41, 7); noAttacks(drain);
  drain.arena.introRemaining = 0;
  drain.enemy.hp -= 80; drain.arena.enemies[0].hp -= 80; drain.player.shield = shield;
  const enemyBefore = drain.enemy.hp, playerBefore = drain.player.hp;
  drain.arena.hazards.push({ id: 'drain-hit', kind: 'circle', x: drain.arena.player.x, y: drain.arena.player.y,
    r: 50, delay: 0, life: 0.3, damage: 20, drain: true, ownerId: drain.arena.enemies[0].id, source: 'boss' });
  Arena.update(drain, 0.05);
  const unblocked = Math.max(0, 20 - shield);
  assert.equal(drain.player.hp, playerBefore - unblocked);
  assert.equal(drain.enemy.hp, enemyBefore + unblocked, 'witch heals only damage that passes through shields');
  assert.equal(sumHp(drain), drain.enemy.hp, 'drain preserves actor/engine HP synchronization');
}

const hourglass = roomRun('spring'); noAttacks(hourglass);
hourglass.inventory.push(Object.assign({}, Engine.ITEMS.hourglass, { count: 1 }));
hourglass.arena.projectiles.push({ id: 'slowed-shot', x: 700, y: 100, vx: 100, vy: 0, r: 5, life: 5, damage: 20 });
const beforeDelay = hourglass.enemy.intent.remaining;
assert.equal(Arena.useItem(hourglass, 'hourglass').ok, true);
assert.equal(hourglass.enemy.intent.remaining, beforeDelay + 6);
advance(hourglass, 1);
assert.ok(Math.abs(hourglass.arena.projectiles[0].x - 765) < 1e-8, 'hourglass actually slows an existing projectile by 35%');

const boons = roomRun('spring'); noAttacks(boons); boons.relics.push(Engine.RELICS.gale, Engine.RELICS.thunderstep, Engine.RELICS.frostglass, Engine.RELICS.starlace);
boons.arena.player.x = 480; boons.arena.player.y = 280;
boons.arena.enemies[0].x = 655; boons.arena.enemies[0].y = 280;
boons.arena.enemies[1].x = 690; boons.arena.enemies[1].y = 295;
const boonHp = boons.enemy.hp;
Arena.update(boons, 0.05, { x: 1, dash: true });
assert.ok(boons.arena.player.dashCooldown <= 1.15);
advance(boons, 0.25, {});
assert.ok(boons.enemy.hp < boonHp, 'thunderstep damages nearby actors'); assert.equal(sumHp(boons), boons.enemy.hp);
if (boons.status === 'combat') {
  Arena.cast(boons, boons.spell.word); assert.equal(boons.arena.slowTime, 2, 'frostglass actually slows actors/projectiles'); assert.equal(sumHp(boons), boons.enemy.hp);
}
const story = combat(1, 0, 'story'); noAttacks(story);
story.arena.hazards.push({ id: 'difficulty', kind: 'circle', x: story.arena.player.x, y: story.arena.player.y, r: 45, delay: 0, life: 0.2, damage: 20 });
Arena.update(story, 0.05); assert.equal(story.player.hp, story.player.maxHp - 13);

// Full campaign integration, including arena/engine transitions and finite wave waits.
const campaign = Engine.createRun({ word: 'robot', rarity: 'N' }, true, 51);
let guard = 0;
while (!['won', 'lost'].includes(campaign.status) && guard++ < 600) {
  if (campaign.status === 'route') Engine.chooseRoute(campaign, campaign.routes[0].id);
  else if (campaign.status === 'reward') Engine.chooseReward(campaign, campaign.rewards.find(r => r.id === 'power')?.id || campaign.rewards[0].id);
  else if (campaign.status === 'combat') {
    const a = Arena.ensure(campaign), target = a.enemies.find(e => e.alive && e.active);
    if (target) { a.player.x = target.x - 65; a.player.y = target.y; Arena.cast(campaign, campaign.spell.word); }
    else advance(campaign, 0.5);
    assert.equal(sumHp(campaign), campaign.enemy.hp);
  }
}
assert.equal(campaign.status, 'won'); assert.equal(campaign.stats.bossesDefeated, 4); assert.equal(campaign.completedNodes, 24);

// Each new chamber creates avoidable hazards after its visible warning, with a real safe location.
assert.equal(Arena.ROOMS.length, 13);
for (const id of ['tempest', 'meteor', 'mirrors', 'eclipse']) {
  const run = roomRun(id); noAttacks(run); advance(run, 2.55);
  const hazards = run.arena.hazards.filter(h => h.source === 'trap');
  assert.ok(hazards.length > 0, `${id} produces spatial hazards`);
  assert.ok(hazards.every(h => h.delay > 1 && h.damage > 0), `${id} always warns before dealing damage`);
  const danger = hazards[0], safe = JSON.parse(JSON.stringify(run));
  run.arena.player.x = danger.kind === 'rect' ? danger.x + 70 : danger.kind === 'ring' ? danger.x + danger.r - 8 : danger.x;
  run.arena.player.y = danger.kind === 'rect' ? danger.y + 60 : danger.y;
  safe.arena.player.x = id === 'meteor' ? 860 : id === 'tempest' ? 480 : id === 'mirrors' ? 480 : 480;
  safe.arena.player.y = id === 'meteor' ? 450 : 280;
  const xBefore = run.arena.player.x;
  advance(run, 2.5); advance(safe, 2.5);
  assert.ok(run.player.hp < run.player.maxHp, `${id} hurts a player who remains in the warning`);
  assert.equal(safe.player.hp, safe.player.maxHp, `${id} leaves a reachable safe space`);
  if (id === 'tempest') assert.ok(run.arena.player.x > xBefore, 'active wind pushes actors in the announced direction');
}

function recruit(run, ids) {
  run.companions = ids.map(id => ({ id, name: Engine.NPCS[id].name, sprite: id, color: Engine.NPCS[id].color, role: Engine.NPCS[id].companionRole }));
  Arena.ensure(run); noAttacks(run); return run;
}
const followers = recruit(roomRun('spring'), ['lantern', 'echo', 'sentinel']);
const followerX = followers.arena.companions[0].x;
advance(followers, 1.2, { x: 1 });
assert.ok(followers.arena.companions[0].x > followerX, 'companions visibly follow moving players');
assert.equal(new Set(followers.arena.companions.map(c => c.npcId)).size, 3);
const companionSave = JSON.parse(JSON.stringify(followers));
advance(followers, 0.5, { y: -1 }); advance(companionSave, 0.5, { y: -1 });
assert.deepEqual(companionSave, followers, 'companions resume positions and cooldowns deterministically');

const lantern = recruit(roomRun('spring'), ['lantern']);
advance(lantern, 2.1); assert.equal(lantern.player.shield, 6, 'lantern grants an actual shield');
lantern.player.shield = 23; lantern.arena.companions[0].cooldown = 0; advance(lantern, 0.1);
assert.equal(lantern.player.shield, 24, 'lantern support cannot stack beyond its 24-point limit');
lantern.player.shield = 70; lantern.arena.companions[0].cooldown = 0; advance(lantern, 0.1);
assert.equal(lantern.player.shield, 70, 'lantern never lowers an existing stronger shield');

const sentinel = recruit(roomRun('spring'), ['sentinel']);
sentinel.arena.player.x = 580; sentinel.arena.player.y = 280;
sentinel.arena.companions[0].x = 600; sentinel.arena.companions[0].y = 280;
sentinel.arena.companions[0].cooldown = 0;
const sentinelHp = sentinel.enemy.hp; advance(sentinel, .1);
assert.equal(sentinel.enemy.hp, sentinelHp - 5, 'sentinel applies bounded damage through the combat engine');
assert.equal(sumHp(sentinel), sentinel.enemy.hp);
assert.ok(sentinel.arena.effects.some(e => e.kind === 'companion-cast' && Number.isFinite(e.targetX)));
const followerFinisher = recruit(roomRun('spring'), ['sentinel']);
followerFinisher.arena.enemies.forEach((enemy, i) => { enemy.hp = i ? 0 : 3; enemy.alive = !i; });
followerFinisher.enemy.hp = 3;
followerFinisher.arena.player.x = 580;
followerFinisher.arena.companions[0].x = 600; followerFinisher.arena.companions[0].y = 280; followerFinisher.arena.companions[0].cooldown = 0;
advance(followerFinisher, .1);
assert.equal(followerFinisher.status, 'reward', 'a follower final blow still grants the normal encounter reward');
assert.equal(sumHp(followerFinisher), 0);

const mimic = recruit(roomRun('spring'), ['echo']);
mimic.arena.player.x = 530; mimic.arena.player.y = 280;
assert.equal(Arena.cast(mimic, 'incorrect').ok, false);
assert.equal(mimic.arena.echoQueue.length, 0, 'incorrect spells never trigger a copied spell');
const mimicResult = Arena.cast(mimic, mimic.spell.word);
assert.ok(mimicResult.ok); assert.equal(mimic.arena.echoQueue.length, 1);
const afterCastHp = mimic.enemy.hp, castsBeforeEcho = mimic.stats.casts;
advance(mimic, .5); assert.equal(mimic.enemy.hp, afterCastHp, 'copy visibly waits before striking');
advance(mimic, .2); assert.ok(mimic.enemy.hp < afterCastHp);
assert.equal(sumHp(mimic), mimic.enemy.hp); assert.equal(mimic.stats.casts, castsBeforeEcho, 'copy never submits or recursively copies a spell');
assert.equal(mimic.arena.echoQueue.length, 0);
const mimickedHp = mimic.enemy.hp; advance(mimic, 1);
assert.equal(mimic.enemy.hp, mimickedHp, 'one successful spell produces one delayed copy');

for (const type of ['heal', 'shield']) {
  const support = recruit(roomRun('spring'), ['echo']);
  support.arena.player.x = 530; support.player.hp -= 55;
  support.spell = { word: 'ward', name: '測試咒語', type, power: 20, elapsed: 0 };
  const copied = Arena.cast(support, 'ward'), hpBeforeCopy = support.player.hp, shieldBeforeCopy = support.player.shield;
  advance(support, .7);
  if (type === 'heal') assert.equal(support.player.hp, hpBeforeCopy + Math.round(copied.heal * .3), 'echo copies bounded healing');
  else assert.equal(support.player.shield, shieldBeforeCopy + Math.round(copied.shield * .3), 'echo copies bounded shields');
  const copyEffects = support.arena.effects.filter(e => e.kind === 'companion-cast');
  assert.equal(copyEffects.length, 2, 'hybrid spells separate support and offensive copied effects');
  const supportFx = copyEffects.find(e => e.spellType === type), attackFx = copyEffects.find(e => e.spellType === 'attack');
  assert.ok(supportFx && attackFx);
  assert.equal(supportFx.targetX, support.arena.player.x); assert.equal(supportFx.targetY, support.arena.player.y, 'copied healing or shield targets the player');
  assert.notEqual(attackFx.targetX, support.arena.player.x, 'offensive component targets an enemy with an attack effect');
  assert.equal(attackFx.spellWord, 'ward', 'offensive copy preserves the original spell word for elemental effects');
}
const emptyEcho = recruit(roomRun('spring'), ['echo']);
emptyEcho.arena.player.x = 530; emptyEcho.enemy.shield = 70;
emptyEcho.spell = { word: 'ward', name: '無傷咒語', type: 'shield', power: 20, elapsed: 0 };
const blockedCopy = Arena.cast(emptyEcho, 'ward'); assert.equal(blockedCopy.damage, 0);
advance(emptyEcho, .7);
const emptyEffects = emptyEcho.arena.effects.filter(e => e.kind === 'companion-cast');
assert.equal(emptyEffects.length, 1, 'zero-damage copied spell emits only its real support effect');
assert.equal(emptyEffects[0].spellType, 'shield'); assert.equal(emptyEffects[0].targetX, emptyEcho.arena.player.x);
const noOpEcho = recruit(roomRun('spring'), ['echo']);
noOpEcho.arena.player.x = 530; noOpEcho.enemy.shield = 70;
noOpEcho.spell = { word: 'spark', name: '無傷咒語', type: 'attack', power: 8, elapsed: 0 };
assert.equal(Arena.cast(noOpEcho, 'spark').damage, 0); advance(noOpEcho, .7);
assert.equal(noOpEcho.arena.effects.filter(e => e.kind === 'companion-cast').length, 0, 'zero-damage attack copy produces no fake enemy impact');

const entrance = combat(4, 3); noAttacks(entrance);
entrance.arena.hazards.push({ kind: 'circle', x: entrance.arena.player.x, y: entrance.arena.player.y, r: 100, delay: 0, life: 3, damage: 5, repeat: true });
advance(entrance, 1.1); assert.equal(entrance.player.hp, entrance.player.maxHp, 'boss entrance cannot silently hurt the player');
advance(entrance, .3); assert.ok(entrance.player.hp < entrance.player.maxHp, 'combat resumes after entrance immunity');
const killed = roomRun('spring'); killed.player.power = 999; killed.arena.player.x = 540;
Arena.cast(killed, killed.spell.word);
assert.equal(killed.status, 'reward');
assert.ok(killed.arena.effects.filter(e => e.kind === 'death').every(e => e.actor && e.actor.sprite && e.maxLife >= .9), 'dead actors remain as persistent visual snapshots');
const playerDeath = roomRun('spring'); noAttacks(playerDeath); playerDeath.player.hp = 1;
playerDeath.arena.hazards.push({ kind: 'circle', x: playerDeath.arena.player.x, y: playerDeath.arena.player.y, r: 50, delay: 0, life: .5, damage: 5 });
advance(playerDeath, .1);
assert.ok(playerDeath.arena.effects.some(e => e.kind === 'death' && e.actor.kind === 'player'), 'player defeat has its own death animation snapshot');
const typoDeath = roomRun('spring'); typoDeath.player.hp = 1; typoDeath.arena.player.x = 530;
assert.equal(Arena.cast(typoDeath, 'not-a-spell').ok, false);
assert.equal(typoDeath.status, 'lost');
assert.ok(typoDeath.arena.effects.some(e => e.kind === 'death' && e.actor.kind === 'player'), 'fatal spell mistakes also produce the player death snapshot');
console.log('Arena checks passed: movement, thirteen room mechanics, boss phases, three follower roles, copied spells, death snapshots, save resume, and full twenty-four-room campaign.');

const starLanes = roomRun('starlanes'); noAttacks(starLanes); advance(starLanes, 2.55);
assert.equal(starLanes.arena.hazards.filter(h => h.source === 'trap').length, 3);
assert.ok(starLanes.arena.hazards.every(h => h.delay > 1.6), 'safe-lane puzzle grants a readable repositioning window');
const safeStar = JSON.parse(JSON.stringify(starLanes));
safeStar.arena.player.x = 480; safeStar.arena.player.y = 115 + safeStar.arena.room.safeLane * 105;
const badLane = starLanes.arena.hazards[0];
starLanes.arena.player.x = 480; starLanes.arena.player.y = badLane.y + 50;
advance(starLanes, 2.5); advance(safeStar, 2.5);
assert.ok(starLanes.player.hp < starLanes.player.maxHp);
assert.equal(safeStar.player.hp, safeStar.player.maxHp, 'the unlit lane is genuinely safe');
const firstSafeLane = safeStar.arena.room.safeLane;
safeStar.arena.player.invulnerable = 1000; advance(safeStar, 4);
assert.notEqual(safeStar.arena.room.safeLane, firstSafeLane, 'subsequent pulses demand a different safe lane');

const flowers = roomRun('bloom'); noAttacks(flowers); flowers.player.hp -= 30;
advance(flowers, 2.55);
assert.equal(flowers.arena.room.blossoms.filter(f => f.ready).length, 3);
const flower = flowers.arena.room.blossoms[0], oldHp = flowers.player.hp;
flowers.arena.player.x = flower.x; flowers.arena.player.y = flower.y;
advance(flowers, .1); assert.equal(flowers.player.hp, oldHp + 6); assert.equal(flower.ready, false);
const flowerSave = JSON.parse(JSON.stringify(flowers));
advance(flowers, 2.5); advance(flowerSave, 2.5);
assert.equal(flowers.player.hp, oldHp + 6, 'standing on a collected blossom cannot repeatedly heal in the same pulse');
assert.deepEqual(flowerSave, flowers, 'collected blossoms and pending rings survive saves');
flowers.arena.player.x = 480; flowers.arena.player.y = 280; advance(flowers, 6);
assert.equal(flowers.arena.room.blossoms[0].ready, true, 'next pulse replenishes collected blossoms');

const comets = roomRun('comet'); noAttacks(comets); advance(comets, 2.55);
assert.equal(comets.arena.room.comets.length, 3);
assert.equal(comets.arena.projectiles.length, 0);
assert.ok(comets.arena.hazards.every(h => h.cosmetic && h.delay > 1.3), 'comet trails preview rather than instantly deal line damage');
comets.arena.player.x = 480; comets.arena.player.y = 270;
const safeComets = JSON.parse(JSON.stringify(comets)); safeComets.arena.player.y = 335;
advance(comets, 1.8); advance(safeComets, 1.8);
assert.ok(comets.arena.projectiles.some(p => p.ownerId === 'comet-room' && Math.abs(p.vx) > 250));
const cometSave = JSON.parse(JSON.stringify(safeComets));
advance(comets, 2); advance(safeComets, 2); advance(cometSave, 2);
assert.ok(comets.player.hp < comets.player.maxHp, 'crossing stars collide with a player in their flight lane');
assert.equal(safeComets.player.hp, safeComets.player.maxHp, 'walking between flight lanes avoids comet damage');
assert.deepEqual(cometSave, safeComets, 'pending stars and projectiles resume deterministically');

function chronicleBoss(id) {
  const r = Engine.createRun(null, true, 771);
  if (id === 'astral') {
    r.region = 3; r.encounter = 23; r.routes = [{ id: 'boss', type: 'boss', name: 'Final' }]; Engine.chooseRoute(r, 'boss');
  } else {
    r.relationship.affection = 45;
    r.routes = [{ id: 'lumina', type: 'npc', npcId: 'lumina', name: 'Mage' }]; Engine.chooseRoute(r, 'lumina');
    Engine.beginBondQuest(r);
    for (let i = 0; i < 2; i++) { Engine.damageEnemy(r, 100000, 1); Engine.chooseReward(r, r.rewards[0].id); }
  }
  Arena.ensure(r); r.arena.player.invulnerable = 1000;
  r.arena.companions.forEach(c => { c.cooldown = 1000; });
  return r;
}
for (const id of ['astral', 'constellation']) {
  const boss = chronicleBoss(id), patterns = new Set();
  for (let turn = 0; turn < (id === 'astral' ? 3 : 2); turn++) {
    boss.enemy.intent.remaining = 0; Arena.update(boss, .05);
    patterns.add(boss.arena.lastPattern);
    assert.ok(boss.arena.hazards.length || boss.arena.enemies[0].volley, `${id} generates actual spatial attacks`);
    assert.ok(boss.arena.hazards.every(h => h.delay >= 1.2), `${id} never launches an unannounced instant hit`);
    boss.arena.hazards = []; boss.arena.enemies[0].volley = null;
  }
  assert.equal(patterns.size, id === 'astral' ? 3 : 2);
  Engine.damageEnemy(boss, Math.ceil(boss.enemy.maxHp * .51), 1);
  Arena.update(boss, .05); assert.equal(boss.enemy.phase, 2);
  boss.arena.hazards = []; boss.enemy.intent.remaining = 0;
  Arena.update(boss, .05);
  assert.ok(boss.arena.hazards.length || boss.arena.enemies[0].volley);
  const saved = JSON.parse(JSON.stringify(boss));
  advance(boss, 2.8); advance(saved, 2.8);
  assert.deepEqual(saved, boss, `${id} phase and pending volley survive a save`);
}

const starmage = recruit(roomRun('spring'), ['lumina']);
starmage.player.hp -= 25; starmage.arena.companions[0].cooldown = 0;
const hpBeforeSupport = starmage.player.hp; advance(starmage, .1);
assert.equal(starmage.player.hp, hpBeforeSupport + 4); assert.equal(starmage.player.shield, 2);
starmage.arena.player.x = 530; starmage.arena.player.y = 280;
starmage.spell = { word: 'spark', name: '星火術', type: 'attack', power: 17, elapsed: 0 };
assert.equal(Arena.cast(starmage, 'wrong').ok, false); assert.equal(starmage.arena.echoQueue.length, 0);
const starCast = Arena.cast(starmage, 'spark'); assert.ok(starCast.ok);
assert.equal(starmage.arena.echoQueue.length, 1); assert.equal(starmage.arena.echoQueue[0].npcId, 'lumina');
const hpAfterStarCast = starmage.enemy.hp, starCasts = starmage.stats.casts;
advance(starmage, .7); assert.equal(starmage.enemy.hp, hpAfterStarCast, 'Lumina visibly waits before repeating a spell');
advance(starmage, .2); assert.ok(starmage.enemy.hp < hpAfterStarCast);
assert.equal(starmage.stats.casts, starCasts, 'support echoes do not recursively count as new player casts');
assert.equal(sumHp(starmage), starmage.enemy.hp);

// A repeated visit can challenge a recruited traveler without cloning them
// into their own boss fight or permanently removing them from the party.
for (const npcId of ['lumina', 'echo', 'lantern', 'sentinel']) {
  const duel = Engine.createRun(null, true, 911);
  const visit = () => {
    duel.routes = [{ id: 'npc', type: 'npc', npcId, name: Engine.NPCS[npcId].name }];
    assert.equal(Engine.chooseRoute(duel, 'npc').ok, true);
  };
  visit(); assert.equal(Engine.helpNpc(duel).ok, true);
  const otherIds = ['lumina', 'echo', 'lantern', 'sentinel'].filter(id => id !== npcId);
  duel.companions.push(...otherIds.map(id => ({ id, name: Engine.NPCS[id].name, sprite: id, role: Engine.NPCS[id].companionRole })));
  const roster = JSON.stringify(duel.companions);
  Engine.leaveNpc(duel);
  Engine.chooseRoute(duel, 'battle'); Arena.ensure(duel); noAttacks(duel);
  duel.arena.player.x = 540; duel.arena.player.y = 280;
  duel.spell = { word: 'spark', name: '星火術', type: 'attack', power: 1, elapsed: 0 };
  assert.equal(Arena.cast(duel, 'spark').ok, true);
  assert.ok(duel.arena.echoQueue.some(echo => echo.npcId === 'lumina'));
  assert.ok(duel.arena.echoQueue.some(echo => echo.npcId === 'echo'));
  Engine.damageEnemy(duel, 100000, 1); Engine.chooseReward(duel, duel.rewards[0].id);
  visit(); assert.equal(Engine.challengeNpc(duel, Engine.NPCS[npcId].challengeWord).ok, true);
  const arena = Arena.ensure(duel);
  assert.equal(arena.enemies[0].npcId, npcId);
  assert.deepEqual(arena.companions.map(c => c.npcId), otherIds, npcId + ' appears only as the boss');
  assert.equal(arena.echoQueue.length, 0, 'fresh duel discards the prior room’s pending echoes');
  assert.equal(JSON.stringify(duel.companions), roster, 'duel preserves the entire recruited roster');
  const otherEcho = npcId === 'echo' ? 'lumina' : 'echo';
  arena.echoQueue.push({ npcId, delay: .3 }, { npcId: otherEcho, delay: .3 });
  if (npcId === 'echo') arena.echoQueue.push({ delay: .3 }); // Legacy echoes omit the identity.
  const resumed = JSON.parse(JSON.stringify(duel));
  assert.deepEqual(Arena.ensure(resumed).echoQueue, [{ npcId: otherEcho, delay: .3 }], 'resume removes only the opponent’s stale copied spell');
  assert.deepEqual(resumed.arena.companions.map(c => c.npcId), otherIds);
  Engine.damageEnemy(duel, 100000, 1); Engine.chooseReward(duel, duel.rewards[0].id);
  assert.equal(Engine.chooseRoute(duel, 'battle').ok, true);
  assert.deepEqual(Arena.ensure(duel).companions.map(c => c.npcId), [npcId, ...otherIds], 'all allies return for the next combat');
  assert.equal(JSON.stringify(duel.companions), roster);
}
console.log('Chronicle arena checks passed: moving safe lanes, collectible healing flowers, real comet projectiles, two new boss patterns and Lumina support.');
