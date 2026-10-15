const assert = require('node:assert/strict');
const Engine = require('../dungeon-engine.js');
const Explore = require('../dungeon-explore.js');

function run(seed = 24) { return Engine.createRun({ word: 'magic', zh: '魔法', rarity: 'N' }, true, seed); }
function room(type, npcId) {
  const state = run();
  state.routes = [{ id: type, type, npcId, name: '測試房間' }];
  assert.equal(Engine.chooseRoute(state, type).ok, true);
  return state;
}
function approach(state, id) {
  const area = Explore.ensure(state), target = area.objects.find(o => o.id === id);
  assert.ok(target, `Missing object ${id}`);
  area.player.x = target.x;
  area.player.y = target.y + 55;
  return target;
}
function openPerson(state) {
  const person = Explore.ensure(state).objects.find(o => o.kind === 'npc' || o.kind === 'merchant');
  approach(state, person.id);
  assert.equal(Explore.interact(state).dialog, true);
  return person;
}

// Movement and proximity are mandatory for both route choice and loot selection.
const route = run(), routeArea = Explore.ensure(route);
assert.equal(routeArea.player.x, 480);
assert.equal(Explore.nearest(route), null);
assert.equal(Explore.interact(route).ok, false);
assert.equal(Explore.act(route, 'chooseRoute', 'battle').ok, false);
const door = approach(route, 'route-battle');
routeArea.player.y = door.y + Explore.RANGE + 0.01;
assert.equal(Explore.nearest(route), null, 'outside radius is not interactable');
routeArea.player.y = door.y + Explore.RANGE;
assert.equal(Explore.nearest(route).id, door.id);
assert.equal(Explore.interact(route).ok, true);
assert.equal(route.status, 'combat');
assert.equal(Explore.ensure(route), null);
assert.equal(Explore.update(route, .1, { x: 1 }), null);

const walking = run(), w = Explore.ensure(walking);
const rngBefore = walking.rng, hpBefore = walking.player.hp;
Explore.update(walking, .1, { x: 1, y: -1 });
assert.ok(Math.abs(Math.hypot(w.player.x - 480, w.player.y - 435) - 18) < 1e-8, 'normalized diagonal movement');
assert.equal(w.player.moving, true);
assert.equal(walking.rng, rngBefore, 'movement never consumes random rewards');
assert.equal(walking.player.hp, hpBefore, 'safe rooms do not inflict damage');
const mobileX = w.player.x;
Explore.update(walking, .1, { x: -1, y: 0 });
assert.ok(Math.abs(w.player.x - mobileX + 18) < 1e-8, 'touch direction matches keyboard direction');
const dashX = w.player.x;
Explore.update(walking, .1, { x: 1, y: 0, dash: true });
assert.equal(w.dashes, 1);
assert.ok(Math.abs(w.player.x - dashX - 76) < 1e-8);
Explore.update(walking, .1, { dash: true });
assert.equal(w.dashes, 1, 'dash obeys cooldown');
for (let i = 0; i < 100; i++) Explore.update(walking, .1, { x: 1, y: 1, dash: true });
assert.ok(w.player.x <= 916 && w.player.y <= 498, 'walking and dashing remain in bounds');
w.player.x = 400; w.player.y = 300; w.player.dashTime = 0; w.player.dashCooldown = 0;
w.obstacles = [{ x: 430, y: 250, w: 35, h: 100 }];
Explore.update(walking, .1, { x: 1, dash: true });
assert.ok(w.player.x <= 418, 'dash cannot tunnel through an obstacle');
const finiteBefore = { x: w.player.x, y: w.player.y };
Explore.update(walking, NaN, { x: Infinity, y: NaN });
assert.equal(w.player.x, finiteBefore.x);
assert.equal(w.player.y, finiteBefore.y);

// Analog tilt controls walking speed; facing and a dash always retain full direction.
const analog = run(), analogArea = Explore.ensure(analog), ap = analogArea.player;
Explore.update(analog, .1, { x: .25, y: 0 });
assert.ok(Math.abs(ap.x - 480 - 4.5) < 1e-8, 'quarter tilt walks at quarter speed');
assert.equal(ap.facingX, 1); assert.equal(ap.facingY, 0);
const diagonalStart = { x: ap.x, y: ap.y };
Explore.update(analog, .1, { x: .3, y: -.4 });
assert.ok(Math.abs(Math.hypot(ap.x - diagonalStart.x, ap.y - diagonalStart.y) - 9) < 1e-8, 'half tilt diagonal walks at half speed');
assert.ok(Math.abs(ap.facingX - .6) < 1e-8 && Math.abs(ap.facingY + .8) < 1e-8, 'analog facing is a unit vector');
const stoppedAt = { x: ap.x, y: ap.y };
Explore.update(analog, .1, { x: 0, y: 0 });
assert.equal(ap.x, stoppedAt.x); assert.equal(ap.y, stoppedAt.y);
Explore.update(analog, .1, { dash: true });
assert.ok(Math.abs(Math.hypot(ap.x - stoppedAt.x, ap.y - stoppedAt.y) - 76) < 1e-8, 'dash after releasing a partial tilt uses full speed');
assert.ok(Math.abs(ap.dashX - .6) < 1e-8 && Math.abs(ap.dashY + .8) < 1e-8);
const tiltedDash = run(), tiltedPlayer = Explore.ensure(tiltedDash).player;
Explore.update(tiltedDash, .1, { x: -.1, y: 0, dash: true });
assert.ok(Math.abs(tiltedPlayer.x - 480 + 76) < 1e-8, 'dash during partial tilt also uses full speed');
assert.equal(tiltedPlayer.dashX, -1);

// Old saves are upgraded lazily; normal JSON round trips retain location and RNG.
const old = run(), restored = JSON.parse(JSON.stringify(old));
assert.deepEqual(Explore.ensure(old), Explore.ensure(restored));
Explore.update(restored, .1, { x: -1, y: -1 });
const persisted = JSON.parse(JSON.stringify(restored));
assert.deepEqual(Explore.ensure(persisted), Explore.ensure(restored));
Explore.update(restored, .1, { x: 1, dash: true });
Explore.update(persisted, .1, { x: 1, dash: true });
assert.deepEqual(restored.exploration, persisted.exploration, 'restored controls behave deterministically');
const corrupt = JSON.parse(JSON.stringify(persisted));
corrupt.exploration.player.x = null; corrupt.exploration.player.y = 'bad';
corrupt.exploration.player.dashTime = -5;
Explore.ensure(corrupt);
assert.equal(corrupt.exploration.player.x, 480);
assert.equal(corrupt.exploration.player.y, 435);
assert.equal(corrupt.exploration.player.dashTime, 0);
corrupt.exploration.objects = [{ id: 'route-battle', kind: 'door', x: 480, y: 435, action: 'chooseRoute', args: ['boss'] }];
assert.equal(Explore.interact(corrupt).ok, false, 'restored object commands are rebuilt from engine state');
corrupt.exploration.version = 0;
assert.equal(Explore.ensure(corrupt).version, 1, 'incompatible spatial schema is migrated');

const reward = room('treasure');
const rewardArea = Explore.ensure(reward), selected = reward.rewards[0];
assert.equal(Explore.interact(reward).ok, false);
assert.equal(Explore.act(reward, 'chooseReward', selected.id).ok, false);
approach(reward, 'reward-' + selected.id);
assert.equal(Explore.interact(reward).ok, true);
assert.equal(reward.status, 'route');
assert.notEqual(reward.exploration.key, rewardArea.key, 'new room resets its spatial state');
assert.equal(reward.exploration.player.y, 435);
const camp = room('camp');
camp.player.hp = 1;
assert.equal(Explore.interact(camp).ok, false);
approach(camp, 'camp-rest');
assert.equal(Explore.interact(camp).ok, true);
assert.ok(camp.player.hp > 1);
assert.equal(camp.encounter, 1);
const training = room('camp'), powerBefore = training.player.power;
approach(training, 'camp-train');
assert.equal(Explore.interact(training).ok, true);
assert.equal(training.player.power, powerBefore + 3);

// The shop requires an open nearby conversation for every transaction.
const shop = room('shop'), offer = shop.shop.find(o => o.itemId === 'potion');
assert.equal(Explore.act(shop, 'buy', offer.id).ok, false);
const merchant = openPerson(shop), shopArea = shop.exploration;
const position = { x: shopArea.player.x, y: shopArea.player.y }, cooldown = shopArea.player.dashCooldown;
Explore.update(shop, .1, { x: 1, y: 1, dash: true });
assert.equal(shopArea.player.x, position.x);
assert.equal(shopArea.player.y, position.y);
assert.equal(shopArea.player.dashCooldown, cooldown, 'dialogue freezes movement and dash');
assert.equal(Explore.act(shop, 'leaveShop').ok, false, 'leaving requires walking to the exit');
assert.equal(Explore.act(shop, 'createRun').ok, false, 'unlisted engine dispatch is blocked');
const goldBefore = shop.player.gold;
assert.equal(Explore.act(shop, 'buy', offer.id).ok, true);
assert.equal(shop.player.gold, goldBefore - offer.price);
assert.equal(shop.exploration.key, shopArea.key, 'buying does not reset room');
assert.equal(shop.exploration.player.x, position.x);
assert.equal(shop.exploration.dialogId, merchant.id);
assert.equal(Explore.act(shop, 'buy', offer.id).ok, false, 'stock cannot be purchased twice');
const restoredShop = JSON.parse(JSON.stringify(shop));
assert.equal(Explore.ensure(restoredShop).dialogId, merchant.id, 'restore can resume a nearby conversation');
shopArea.player.x = 900; shopArea.player.y = 490;
assert.equal(Explore.act(shop, 'buy', shop.shop[1].id).ok, false, 'stale dialogue cannot buy remotely');
assert.equal(shopArea.dialogId, null);
openPerson(shop);
assert.equal(Explore.close(shop).ok, true);
assert.equal(shopArea.dialogId, null);
const afterCloseX = shopArea.player.x;
Explore.update(shop, .1, { x: 1 });
assert.ok(shopArea.player.x > afterCloseX, 'closing resumes movement');
assert.equal(Explore.interact(shop).dialog, true);
Explore.close(shop);
approach(shop, 'exit');
assert.equal(Explore.interact(shop).ok, true);
assert.equal(shop.status, 'route');
assert.equal(shop.encounter, 1);

// Merchant migration and NPC help/challenges share the same proximity enforcement.
const oldShop = room('shop');
delete oldShop.npc;
assert.equal(Explore.ensure(oldShop).objects.find(o => o.kind === 'merchant').npcId, 'merchant');
const healer = room('npc', 'healer');
healer.player.hp = 1;
assert.equal(Explore.act(healer, 'helpNpc').ok, false);
openPerson(healer);
assert.equal(Explore.act(healer, 'helpNpc').ok, true);
assert.ok(healer.player.hp > 1);
assert.equal(healer.status, 'npc');
assert.equal(Explore.act(healer, 'helpNpc').ok, false, 'NPC help is single-use');
assert.equal(Explore.act(healer, 'challengeNpc', Engine.NPCS.healer.challengeWord).ok, false, 'help and challenge are exclusive');
Explore.close(healer);
approach(healer, 'exit');
assert.equal(Explore.interact(healer).ok, true);
assert.equal(healer.status, 'route');
for (const npcId of ['merchant', 'healer', 'smith', 'cartographer', 'ferryman']) {
  const state = npcId === 'merchant' ? room('shop') : room('npc', npcId);
  assert.equal(Explore.act(state, 'challengeNpc', Engine.NPCS[npcId].challengeWord).ok, false);
  openPerson(state);
  assert.equal(Explore.act(state, 'challengeNpc', 'incorrect').ok, false);
  assert.ok(state.exploration.dialogId, 'incorrect word keeps conversation open');
  assert.equal(Explore.act(state, 'challengeNpc', Engine.NPCS[npcId].challengeWord).ok, true);
  assert.equal(state.status, 'combat');
  assert.equal(state.enemy.kind, 'boss');
  assert.equal(state.enemy.npcId, npcId);
  assert.equal(Explore.ensure(state), null);
}

console.log('Exploration: movement, collision, proximity, route/loot/camp, shop/NPC dialogue, challenges, and save restoration passed.');
