'use strict';
const assert = require('node:assert/strict');
const Engine = require('../dungeon-engine.js');
const Arena = require('../dungeon-arena.js');
const ids = Object.keys(Engine.NPCS);
const clone = value => JSON.parse(JSON.stringify(value));
function encounter(id, seed = 41, node = 0) {
  const run = Engine.createRun({ word: 'magic', zh: '魔法', rarity: 'N' }, true, seed);
  run.nodesPerRegion = 4;
  delete run.regionCount;delete run.randomWorldVersion;delete run.bossRoster;delete run.floorPlan;
  run.encounter = node; run.region = Math.min(2, Math.floor(node / 4));
  run.routes = [{ id: 'visitor', type: id === 'merchant' ? 'shop' : 'npc', npcId: id, name: Engine.NPCS[id].name }];
  assert.equal(Engine.chooseRoute(run, 'visitor').ok, true);
  return run;
}
function fight(id, node = 0) {
  const run = encounter(id, 41, node);
  assert.equal(Engine.challengeNpc(run, Engine.NPCS[id].challengeWord).ok, true);
  Arena.ensure(run);
  return run;
}
function advance(run, seconds) { for (let n = 0; n < Math.ceil(seconds / 0.05); n++) Arena.update(run, 0.05, {}); }
function pattern(run) {
  run.enemy.intent.remaining = 0;
  Arena.update(run, 0.05, {});
  return { name: run.arena.lastPattern, hazards: clone(run.arena.hazards), volley: clone(run.arena.enemies[0].volley) };
}
function ordinary() {
  const run = Engine.createRun({ word: 'magic' }, true, 19);
  run.floorPlan[0].omen='none';
  Engine.chooseRoute(run, 'battle');
  run.enemy.hp = run.enemy.maxHp = 10000;
  run.spell = { word: 'spark', name: '星火術', type: 'attack', power: 17, elapsed: 0 };
  return run;
}
assert.equal(ids.length, 9, 'merchant, four travelers and four recruitable companions');
assert.equal(new Set(ids.map(id => Engine.NPCS[id].challengeWord)).size, 9);
assert.equal(new Set(ids.map(id => Engine.NPCS[id].lootId)).size, 9);
assert.equal(Engine.NPCS.merchant.challengeWord, 'debt');
const observed = new Set();
for (let seed = 0; seed < 150; seed++) {
  const run = Engine.createRun(null, true, seed);
  assert.deepEqual(run, Engine.createRun(null, true, seed), 'NPC route choice uses the seeded run RNG');
  for (let node = 0; node < 17; node++) {
    for (const route of run.routes) if (route.type === 'npc') observed.add(route.npcId);
    if (run.encounter % 6 === 5) assert.deepEqual(run.routes.map(r => r.type), ['boss']);
    Engine.chooseRoute(run, 'battle' === run.routes[0].id ? 'battle' : 'boss');
    Engine.damageEnemy(run, 100000, 1);
    Engine.chooseReward(run, run.rewards[0].id);
  }
}
assert.deepEqual([...observed].sort(), ids.filter(id => id !== 'merchant').sort(), 'all travelers can be encountered');
console.log('PASS deterministic random encounters and fixed main-boss gates');

for (const id of ids.filter(id => id !== 'merchant')) {
  const run = encounter(id); run.player.hp = 20;
  assert.equal(Engine.getNpc(run).id, id);
  const before = clone(run);
  assert.equal(Engine.helpNpc(run).ok, true);
  assert.equal(run.status, 'npc', 'help keeps the conversation available');
  assert.equal(run.npc.helped, true);
  assert.ok(run.npc.helpMessage);
  if (id === 'healer') { assert.equal(run.player.hp, 65); assert.equal(run.inventory[0].count, before.inventory[0].count + 1); }
  if (id === 'smith') assert.equal(run.player.power, before.player.power + 4);
  if (id === 'cartographer') assert.equal(run.relics.length, before.relics.length + 1);
  if (id === 'ferryman') { assert.equal(run.player.maxHp, before.player.maxHp + 10); assert.equal(run.player.hp, 40); assert.equal(run.player.gold, before.player.gold + 20); }
  const restored = clone(run), after = JSON.stringify(restored);
  assert.equal(Engine.helpNpc(restored).ok, false);
  assert.equal(Engine.challengeNpc(restored, Engine.NPCS[id].challengeWord).ok, false);
  assert.equal(JSON.stringify(restored), after, 'restoring cannot repeat help or challenge after help');
  assert.equal(Engine.leaveNpc(restored).ok, true);
  assert.equal(restored.encounter, 1); assert.equal(restored.completedNodes, 1);
  assert.equal(Engine.leaveNpc(restored).ok, false); assert.equal(restored.encounter, 1);
}
const map = encounter('cartographer');
map.relics = ['gale', 'clock', 'starlace', 'frostglass'].map(id => clone(Engine.RELICS[id]));
Engine.helpNpc(map); assert.equal(map.player.gold, 75, 'cartographer safely compensates when all exploration relics are owned');
const merchant = encounter('merchant');
assert.equal(Engine.helpNpc(merchant).ok, false, 'merchant help is trading rather than free repeatable supplies');
const offer = merchant.shop.find(o => o.itemId === 'potion');
assert.equal(Engine.buy(merchant, offer.id).ok, true);
assert.equal(Engine.buy(merchant, offer.id).ok, false);
delete merchant.npc; const stock = JSON.stringify(merchant.shop);
assert.equal(Engine.getNpc(merchant).id, 'merchant', 'legacy shop saves acquire an NPC record');
assert.equal(JSON.stringify(merchant.shop), stock, 'legacy migration keeps bought stock');
for (const text of ['', 'hello', 'deb', 'debt please', 'debt!']) {
  const before = JSON.stringify(merchant);
  assert.equal(Engine.challengeNpc(merchant, text).ok, false);
  assert.equal(JSON.stringify(merchant), before, 'only deliberate exact challenge input can start a fight');
}
assert.equal(Engine.challengeNpc(merchant, '  DEBT  ').ok, true, 'challenge accepts surrounding whitespace and letter case');
assert.equal(Engine.buy(merchant, offer.id).ok, false, 'shop closes after challenge');
assert.equal(Engine.leaveShop(merchant).ok, false, 'combat cannot be escaped through old shop actions');
console.log('PASS distinct help, one-time choices, safe challenge words and old shop migration');

for (const id of ids) {
  const run = fight(id, 4);
  assert.equal(run.enemy.kind, 'boss'); assert.equal(run.enemy.isNpcBoss, true);
  assert.equal(run.arena.enemies.length, 1);
  assert.equal(run.arena.enemies[0].sprite, id);
  assert.equal(run.arena.enemies[0].npcId, id);
  run.arena.player.invulnerable = 999;
  const first = pattern(run);
  assert.equal(first.name, Engine.NPCS[id].patterns[0]);
  assert.ok(first.hazards.length || first.volley);
  run.arena.hazards = []; run.arena.enemies[0].volley = null;
  const second = pattern(run);
  assert.equal(second.name, Engine.NPCS[id].patterns[1]);
  assert.notDeepEqual(first, second, 'each boss alternates two actual spatial patterns');
  Engine.damageEnemy(run, Math.ceil(run.enemy.maxHp * 0.51), 1);
  assert.equal(run.enemy.phase, 2);
  Arena.update(run, 0.05, {});
  assert.ok(run.enemy.intent.remaining >= 2.6, 'phase awakening leaves a readable warning window');
  const phase = pattern(run);
  assert.equal(phase.name, Engine.NPCS[id].patterns[0]);
  assert.notDeepEqual(phase, first, 'phase two expands actual attacks, not only the label');
  const saved = clone(run);
  advance(run, 0.5); advance(saved, 0.5);
  assert.deepEqual(saved, run, 'mid-pattern save resumes deterministically');
  Engine.damageEnemy(run, 100000, 1);
  assert.equal(run.status, 'reward');
  assert.equal(run.stats.bossesDefeated, 0, 'optional NPC boss does not count toward the four region bosses');
  assert.equal(run.stats.npcBossesDefeated, 1);
  assert.equal(run.npc.defeated, true);
  assert.equal(run.relics.filter(r => r.id === Engine.NPCS[id].lootId).length, 1, 'special trophy is guaranteed before reward selection');
  assert.equal(run.lastEvent.specialLoot, Engine.NPCS[id].lootId);
  const lootSave = clone(run), gold = lootSave.player.gold;
  assert.equal(Engine.damageEnemy(lootSave, 100000, 1), 0);
  assert.equal(Engine.challengeNpc(lootSave, Engine.NPCS[id].challengeWord).ok, false);
  assert.equal(lootSave.player.gold, gold);
  assert.equal(Engine.chooseReward(lootSave, lootSave.rewards[0].id).ok, true);
  assert.equal(lootSave.encounter, 5); assert.equal(lootSave.completedNodes, 5);
  assert.equal(Engine.chooseReward(lootSave, 'power').ok, false);
  assert.equal(lootSave.encounter, 5, 'reward can advance only once');
}
const coins = fight('merchant'); coins.arena.player.invulnerable = 999; pattern(coins); advance(coins, 1.2);
assert.ok(coins.arena.projectiles.some(p => p.shape === 'coin' && p.color === '#ffd36e'), 'merchant launches visible coin projectiles');
const lane = fight('merchant'); lane.arena.player.x = 185; lane.arena.player.y = 280; lane.enemy.turn = 1;
pattern(lane); lane.enemy.intent.remaining = 1000;
const escaped = clone(lane); escaped.arena.player.x = 300;
advance(lane, 1.7); advance(escaped, 1.7);
assert.ok(lane.player.hp < lane.player.maxHp, 'merchant lanes deal real collision damage after their warning');
assert.equal(escaped.player.hp, escaped.player.maxHp, 'walking out of merchant lanes avoids the damage');
for (const id of ids) {
  const run = fight(id); run.arena.player.x = 420; run.arena.player.invulnerable = 1000;
  let casts = 0;
  while (run.status === 'combat' && casts++ < 100) {
    assert.equal(Arena.cast(run, run.spell.word).ok, true);
    assert.equal(run.arena.enemies[0].hp, run.enemy.hp, 'NPC actor HP tracks real spell damage');
  }
  assert.equal(run.status, 'reward', 'normal typing can defeat each NPC boss');
  assert.ok(run.relics.some(r => r.id === Engine.NPCS[id].lootId));
}
const endNode = fight('merchant', 11); Engine.damageEnemy(endNode, 100000, 1);
assert.equal(endNode.status, 'reward', 'optional boss cannot trigger the king ending');
console.log('PASS nine unique two-phase bosses, save restoration, guaranteed trophy and single advancement');

for (let seed = 0; seed < 100; seed++) {
  const shop = encounter('merchant', seed);
  assert.ok(shop.shop.every(o => o.kind !== 'relic' || !Engine.RELICS[o.relicId].special));
  const run = Engine.createRun(null, true, seed);
  run.routes = [{ id: 'treasure', type: 'treasure', name: '寶箱' }];
  Engine.chooseRoute(run, 'treasure');
  assert.ok(run.rewards.every(r => r.kind !== 'relic' || !Engine.RELICS[r.relicId].special));
}
const base = ordinary(), forge = clone(base); forge.relics.push(clone(Engine.RELICS.forgecore));
assert.ok(Engine.submit(forge, 'spark').damage > Engine.submit(base, 'spark').damage + 6);
const dew = ordinary(); dew.player.hp = 50; dew.relics.push(clone(Engine.RELICS.dewheart), clone(Engine.RELICS.moss));
Engine.submit(dew, 'spark'); assert.equal(dew.player.hp, 55, 'healer trophy stacks with moss healing');
const star = ordinary(); star.relics.push(clone(Engine.RELICS.wayfinder)); star.player.shield = 88;
Engine.submit(star, 'spark'); assert.equal(star.player.shield, 90, 'fast-cast trophy grants shield without exceeding cap');
star.spell.elapsed = 100; Engine.submit(star, star.spell.word); assert.ok(star.player.shield <= 90);
const ferry = ordinary(); ferry.relics.push(clone(Engine.RELICS.ferrypass));
Engine.damagePlayer(ferry, 10000); assert.equal(ferry.status, 'combat'); assert.equal(ferry.player.hp, 70); assert.equal(ferry.player.shield, 20);
const ferrySave = clone(ferry); Engine.damagePlayer(ferrySave, 10000); assert.equal(ferrySave.status, 'lost', 'revival remains spent after save restoration');
const purse = encounter('ferryman'); purse.relics.push(clone(Engine.RELICS.purse), clone(Engine.RELICS.goldseal));
Engine.helpNpc(purse); assert.equal(purse.player.gold, 67, 'merchant trophy stacks additively with coin relic');
console.log('PASS exclusive loot pools and all five real trophy effects');
console.log('All NPC engine and arena tests passed.');
