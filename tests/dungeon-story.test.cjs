'use strict';
const assert = require('node:assert/strict');
const E = require('../dungeon-engine.js');
const A = require('../dungeon-arena.js');
const X = require('../dungeon-explore.js');
const S = require('../dungeon-story.js');
const clone = value => JSON.parse(JSON.stringify(value));
const fresh = (profile, seed = 119) => E.createRun({ word: 'magic', zh: '魔法' }, false, seed, profile);
function visit(profile, node = 2) {
  const run = fresh(profile); run.encounter = node;
  run.routes = [{ id: 'lumina', type: 'npc', npcId: 'lumina', name: E.NPCS.lumina.name }];
  assert.equal(E.chooseRoute(run, 'lumina').ok, true); X.ensure(run); return run;
}
function open(run) {
  const area = X.ensure(run), person = area.objects.find(o => o.npcId === 'lumina');
  assert.ok(person, 'recruited Lumina remains available to talk');
  area.player.x = person.x; area.player.y = person.y + 35;
  assert.equal(X.interact(run).ok, true);
}
function finish(run) { E.damageEnemy(run, 100000, 1); assert.equal(run.status, 'reward'); E.chooseReward(run, run.rewards[0].id); }

const malformed = S.createProfile({ affection: 200, gifts: { flower: -7, tea: Infinity, star: 2.8 }, scenes: ['x', 'x', 2], dating: true });
assert.deepEqual(malformed, { version: 1, affection: 100, gifts: { flower: 0, tea: 0, star: 2 }, scenes: ['x'], dating: false, questCleared: false });
const profile = S.createProfile({ affection: 19, gifts: { flower: 4 } }), runCopy = fresh(profile);
runCopy.relationship.gifts.flower = 0; runCopy.relationship.scenes.push('test');
assert.equal(profile.gifts.flower, 4); assert.deepEqual(profile.scenes, [], 'run copies never mutate the saved profile by reference');
assert.equal(S.getBond({ affection: 0 }).name, '初次相識');
assert.equal(S.getBond({ affection: 20 }).name, '熟悉的旅伴');
assert.equal(S.getBond({ affection: 45 }).name, '彼此信任');
assert.equal(S.getBond({ affection: 75 }).name, '心意相通');
assert.ok(S.getBond({ affection: 19 }).progress <= 100);
assert.equal(E.NPCS.lumina.age, 24);
assert.match(S.dialogue(fresh()).text, /二十四歲/);
assert.ok(Object.values(S.SCENES).every(scene => scene.id && scene.title && typeof scene.text === 'string'));

for (const nodes of [4, 6]) {
  const legacy = fresh(); delete legacy.regionCount; legacy.nodesPerRegion = nodes;
  assert.match(S.storyFor(legacy).text, /三個名字/);
  legacy.status = 'won'; assert.match(S.storyFor(legacy).text, /三道/);
  assert.ok(!S.storyFor(legacy).text.includes('四道'));
}
const modern = fresh(); modern.status = 'won'; assert.match(S.storyFor(modern).text, /四道/);

// Saved encounter rolls do not depend on movement/RNG or reward-button retries.
for (let seed = 0; seed < 20; seed++) {
  const fight = fresh(null, seed); E.chooseRoute(fight, 'battle');
  const resumed = clone(fight); resumed.rng = 123456;
  E.damageEnemy(fight, 100000, 1); E.damageEnemy(resumed, 100000, 1);
  assert.deepEqual(resumed.relationship.gifts, fight.relationship.gifts, 'reloading or unrelated RNG never rerolls gifts');
  assert.equal(Object.values(fight.relationship.gifts).reduce((a, b) => a + b, 0), 1, 'first victory guarantees one keepsake');
  const drops = clone(fight.relationship.gifts);
  E.damageEnemy(fight, 100000, 1); E.useItem(fight, 'bomb');
  assert.deepEqual(fight.relationship.gifts, drops);
  E.chooseReward(fight, fight.rewards[0].id);
  assert.equal(E.chooseReward(fight, 'power').ok, false);
  assert.deepEqual(fight.relationship.gifts, drops);
}
const chest = fresh(); chest.routes = [{ id: 'treasure', type: 'treasure', name: '寶匣' }];
E.chooseRoute(chest, 'treasure'); const chestGift = clone(chest.relationship.gifts);
assert.equal(Object.values(chestGift).reduce((a, b) => a + b, 0), 1);
assert.equal(E.chooseRoute(chest, 'treasure').ok, false); assert.deepEqual(chest.relationship.gifts, chestGift);

const meeting = visit({ gifts: { flower: 5, tea: 2 } });
assert.equal(X.act(meeting, 'giveGift', 'flower').ok, false, 'gifting requires walking to the NPC and opening dialogue');
open(meeting); assert.equal(X.act(meeting, 'talkNpc', 'listen').ok, true);
assert.equal(meeting.relationship.affection, 1);
assert.equal(X.act(meeting, 'talkNpc', 'stars').ok, true);
assert.equal(meeting.relationship.affection, 1, 'repeated dialogue cannot farm affection');
assert.deepEqual(meeting.relationship.scenes, ['lumina-meeting']);
assert.equal(X.act(meeting, 'giveGift', 'flower').ok, true);
assert.equal(meeting.relationship.gifts.flower, 4); assert.equal(meeting.relationship.affection, 4);
assert.equal(X.act(meeting, 'helpNpc').ok, true);
assert.equal(X.act(meeting, 'giveGift', 'tea').ok, true, 'recruiting preserves peaceful bond actions');
assert.equal(X.act(meeting, 'giveGift', 'flower').ok, true);
assert.equal(meeting.npc.giftsGiven, 3);
const giftsAfterThree = clone(meeting.relationship);
assert.equal(X.act(meeting, 'giveGift', 'flower').ok, false);
assert.deepEqual(meeting.relationship, giftsAfterThree);
X.close(meeting); open(meeting);
assert.equal(X.act(meeting, 'giveGift', 'flower').ok, false, 'closing dialogue cannot reset the visit gift cap');
assert.equal(X.act(meeting, 'challengeNpc', 'starlight').ok, false, 'help excludes a fight but never gifts');
X.ensure(meeting).player.y = 490;
assert.equal(X.act(meeting, 'talkNpc', 'listen').ok, false, 'saved dialogue also enforces current proximity');
assert.equal(X.ensure(meeting).dialogId, null);
const empty = visit(); open(empty);
assert.equal(X.act(empty, 'giveGift', 'star').ok, false);
assert.equal(X.act(empty, 'giveGift', '__proto__').ok, false);
assert.equal(X.act(empty, 'talkNpc', 'unknown').ok, false);
assert.equal(X.act(empty, 'beginBondQuest').ok, false);
assert.equal(X.act(empty, 'confessBond').ok, false);
assert.equal(empty.relationship.affection, 0);

// Three real encounters, save/resume between rooms, and one main-node advancement.
let quest = visit({ affection: 45, gifts: { star: 3 } });
open(quest); const originalNode = quest.encounter, originalCompleted = quest.completedNodes;
assert.equal(X.act(quest, 'beginBondQuest').ok, true);
assert.equal(quest.status, 'combat'); assert.equal(quest.bondQuest.active, true);
assert.ok(quest.companions.some(c => c.id === 'lumina'));
assert.equal(X.act(quest, 'beginBondQuest').ok, false);
for (let step = 0; step < 3; step++) {
  assert.equal(quest.bondQuest.step, step);
  assert.equal(quest.encounter, originalNode); assert.equal(quest.completedNodes, originalCompleted);
  assert.equal(A.ensure(quest).room.id, ['starlanes', 'bloom', 'boss-constellation'][step]);
  assert.equal(S.storyFor(quest).id, 'bond-' + step);
  const saved = clone(quest);
  A.update(quest, .1, { x: .25 }); A.update(saved, .1, { x: .25 });
  assert.deepEqual(saved, quest, 'quest actors and clocks resume without resetting');
  quest = saved;
  finish(quest);
}
assert.equal(quest.status, 'npc'); assert.equal(quest.npc.id, 'lumina');
assert.equal(quest.relationship.questCleared, true); assert.equal(quest.relationship.affection, 53);
assert.equal(quest.relationship.dating, false, 'quest completion never implies consent to romance');
assert.equal(quest.stats.bossesDefeated, 0); assert.equal(quest.stats.enemiesDefeated, 3);
assert.ok(quest.relics.some(relic => relic.id === 'starpromise'));
assert.equal(quest.bondQuest.completed, true); assert.equal(quest.bondQuest.active, false);
assert.equal(quest.encounter, originalNode);
assert.equal(new Set(quest.giftDrops).size, 3, 'quest encounters have separate saved drop rolls');
assert.ok(['bond-0', 'bond-1', 'bond-2', 'lumina-promise'].every(id => quest.relationship.scenes.includes(id)));
open(quest);
assert.equal(X.act(quest, 'beginBondQuest').ok, false);
assert.equal(X.act(quest, 'confessBond').ok, false, 'quest alone does not bypass the 75 affinity threshold');
assert.equal(E.leaveNpc(quest).ok, true);
assert.equal(quest.encounter, originalNode + 1); assert.equal(quest.completedNodes, originalNode + 1);
assert.equal(E.leaveNpc(quest).ok, false);
assert.equal(E.chooseReward(quest, 'power').ok, false);

const noQuest = visit({ affection: 100 }); open(noQuest);
assert.equal(X.act(noQuest, 'confessBond').ok, false);
const romance = visit({ affection: 75, questCleared: true }); open(romance);
assert.equal(romance.relationship.dating, false);
assert.equal(S.dialogue(romance).canConfess, true);
assert.equal(X.act(romance, 'confessBond').ok, true);
assert.equal(romance.relationship.dating, true);
assert.ok(romance.relationship.scenes.includes('lumina-confession'));
assert.equal(X.act(romance, 'confessBond').ok, false);
romance.status = 'won'; assert.equal(S.storyFor(romance).id, 'ending-romance');
const nextRun = fresh(romance.relationship);
assert.equal(nextRun.relationship.dating, true); assert.equal(nextRun.relationship.questCleared, true);
assert.equal(S.getBond(nextRun.relationship).name, '星光戀人');

// The full original party can recruit Lumina without losing another companion.
const party = visit({ affection: 45 });
party.companions = ['lantern', 'echo', 'sentinel'].map(id => ({ id, name: E.NPCS[id].name, role: E.NPCS[id].companionRole, sprite: id }));
open(party); X.act(party, 'helpNpc'); assert.equal(party.companions.length, 4);
X.close(party);
assert.equal(X.ensure(party).objects.filter(o => o.npcId === 'lumina').length, 1);
assert.equal(X.ensure(party).companions.filter(c => c.npcId === 'lumina').length, 0, 'conversation room draws Lumina only once');
open(party); X.act(party, 'beginBondQuest'); assert.equal(A.ensure(party).companions.length, 4);
assert.ok(party.companions.every(c => ['lantern', 'echo', 'sentinel', 'lumina'].includes(c.id)));
console.log('Story checks passed: normalized persistent bonds, deterministic gifts, spatial conversations, three-stage saved quest, explicit romance, legacy endings and four-person party.');
