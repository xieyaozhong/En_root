'use strict';
const assert = require('node:assert/strict');
const E = require('../dungeon-engine.js');
const clone = value => JSON.parse(JSON.stringify(value));

for (const length of [12, 18, 24]) {
  const legacy = length === 12;
  const run = E.createRun({word:'rune'}, false, 100);
  if (length < 24) delete run.regionCount;
  if (legacy) { delete run.nodesPerRegion; delete run.companions; }
  const gates = [], visitors = new Set();
  while (run.status !== 'won') {
    const local = run.encounter % E.getNodesPerRegion(run);
    assert.equal(E.getCampaignLength(run), length);
    assert.equal(run.region, Math.floor(run.encounter / E.getNodesPerRegion(run)));
    if (local === E.getNodesPerRegion(run) - 1) {
      assert.deepEqual(run.routes.map(r => r.type), ['boss']); gates.push(run.encounter + 1);
    } else {
      assert.ok(run.routes.some(r => r.type === 'battle'));
      if (local === E.getNodesPerRegion(run) - 2) assert.ok(run.routes.some(r => r.type === 'camp'));
      if (!legacy && local === 1) {
        const visit = run.routes.find(r => r.type === 'npc');
        assert.ok(visit && E.NPCS[visit.npcId].companionRole, 'early chapter offers a companion');
        visitors.add(visit.npcId);
      }
    }
    E.chooseRoute(run, run.routes[0].id); E.damageEnemy(run, 100000, 1);
    if (run.status === 'reward') E.chooseReward(run, run.rewards[0].id);
    assert.ok(run.encounter < length, 'campaign stops at its final king');
  }
  assert.deepEqual(gates, legacy ? [4, 8, 12] : length === 18 ? [6, 12, 18] : [6, 12, 18, 24]);
  assert.equal(run.completedNodes, length); assert.equal(run.stats.bossesDefeated, length === 24 ? 4 : 3);
  if (!legacy) assert.ok(visitors.size);
}
console.log('PASS 24-node chapters and safe legacy 12-/18-node progression');

const party = E.createRun(null, true, 44);
for (const id of ['lantern', 'echo', 'sentinel']) {
  party.status = 'route'; party.routes = [{id:'npc',type:'npc',npcId:id,name:E.NPCS[id].name}];
  E.chooseRoute(party, 'npc');
  assert.equal(E.helpNpc(party).ok, true);
  assert.ok(party.companions.some(c => c.id === id && c.role === E.NPCS[id].companionRole));
  assert.equal(E.challengeNpc(party, E.NPCS[id].challengeWord).ok, false);
  const saved = clone(party), before = JSON.stringify(saved);
  assert.equal(E.helpNpc(saved).ok, false); assert.equal(JSON.stringify(saved), before);
  E.leaveNpc(party);
}
assert.equal(party.companions.length, 3);
const companions = JSON.stringify(party.companions);
for (let node = 3; node < 5; node++) {
  E.chooseRoute(party, 'battle'); E.damageEnemy(party, 100000, 1); E.chooseReward(party, party.rewards[0].id);
  assert.equal(JSON.stringify(party.companions), companions, 'party survives chapter travel');
  assert.ok(party.routes.every(r => !['lantern','echo','sentinel'].includes(r.npcId)), 'recruited travelers do not duplicate on routes');
}
console.log('PASS recruitment, one-time choice, save roundtrip and party persistence');

function combat() { const r=E.createRun(null,true,8); E.chooseRoute(r,'battle'); r.enemy.hp=r.enemy.maxHp=10000; return r; }
const light=combat(); light.status='route'; light.routes=[{id:'battle',type:'battle',name:'fight'}];
light.relics=[clone(E.RELICS.shell),clone(E.RELICS.lanternwake)];E.chooseRoute(light,'battle');
assert.equal(light.player.shield,30);
const base=combat(), boosted=clone(base);
base.spell=boosted.spell={word:'magic',name:'magic',type:'signature',power:30,elapsed:10};
boosted.relics=[clone(E.RELICS.echoquill)];assert.equal(E.submit(boosted,'magic').damage-E.submit(base,'magic').damage,8);
const paper=combat();paper.relics=[clone(E.RELICS.paperedge)];paper.player.shield=88;
paper.spell={word:'ward',name:'ward',type:'shield',power:17,elapsed:10};E.submit(paper,'ward');assert.equal(paper.player.shield,90);
console.log('PASS new boss trophy mechanics and shield cap');
