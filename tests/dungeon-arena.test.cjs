'use strict';
const assert = require('node:assert/strict');
const Engine = require('../dungeon-engine.js');
const Arena = require('../dungeon-arena.js');
function combat(seed = 31, encounter = 0, difficulty = 'standard') {
  const run = Engine.createRun({ word: 'robot', zh: '機器人', rarity: 'N' }, true, seed);
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
assert.equal(campaign.status, 'won'); assert.equal(campaign.stats.bossesDefeated, 3); assert.equal(campaign.completedNodes, 12);
console.log('Arena checks passed: movement/collision, dodge, cooldown, focus exhaustion, six room mechanics, three boss patterns, damage synchronization, save resume, spatial boons, difficulty, and full campaign.');
