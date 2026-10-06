const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const repo = path.join(__dirname, '..');
const browser = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(repo, 'cards-data.js'), 'utf8'), browser);
vm.runInNewContext(fs.readFileSync(path.join(repo, 'cards-extra.js'), 'utf8'), browser);
global.ENROOT_CARDS = browser.window.ENROOT_CARDS;
const E = require(path.join(repo, 'dungeon-engine.js'));
function advance(s, seconds) { for (let i=0; i<seconds; i++) E.tick(s,1); }
function routeOf(kind) {
  for (let seed=0; seed<100; seed++) {
    const s=E.createRun({word:'robot',zh:'機器人',rarity:'UR'},false,seed);
    if (s.routes.some(r=>r.id===kind)) return s;
  }
  throw Error('Route not found: '+kind);
}
const same1=E.createRun({word:'robot'},false,24), same2=E.createRun({word:'robot'},false,24);
assert.deepEqual(same1,same2,'seed reproduces run');
assert.ok(same1.wordPool.length>20,'English words loaded from card bank');
const s=E.createRun({word:'quarantine',zh:'隔離',rarity:'UR'},false,'test');
assert.equal(s.status,'route');
assert.equal(E.submit(s,'fire').ok,false);
E.chooseRoute(s,'battle');
const word=s.spell.word;
const hp=s.player.hp;
E.submit(s,'incorrect');
assert.equal(s.spell.word,word,'mistake retains spell');
assert.equal(s.player.hp,hp-2);
assert.equal(s.stats.mistakes,1);
assert.equal(E.submit(s,'  '+word.toUpperCase()+'  ').ok,true,'case/whitespace normalized');
assert.equal(s.stats.casts,1);
const spellTime=s.spell.elapsed;
E.tick(s,100);
assert.equal(s.spell.elapsed,spellTime+1,'background delta capped');
const inventoryBefore=s.inventory.find(i=>i.id==='bomb').count;
s.enemy.shield=100;
const enemyBefore=s.enemy.hp;
E.useItem(s,'bomb');
assert.equal(s.enemy.hp,Math.max(0,enemyBefore-42),'bomb pierces shield');
assert.equal(s.inventory.find(i=>i.id==='bomb').count,inventoryBefore-1);
const shop=routeOf('shop');
E.chooseRoute(shop,'shop');
assert.equal(shop.status,'shop');
let potion=shop.shop.find(i=>i.itemId==='potion');
const money=shop.player.gold;
assert.equal(E.buy(shop,potion.id).ok,true);
assert.equal(shop.player.gold,money-potion.price);
assert.equal(E.buy(shop,potion.id).ok,false,'no repeated stock purchase');
assert.equal(E.buy(shop,shop.shop.find(i=>i.kind==='relic').id).ok,false,'insufficient gold');
E.leaveShop(shop);
assert.equal(shop.encounter,1);
const treasure=routeOf('treasure');
E.chooseRoute(treasure,'treasure');
assert.equal(treasure.status,'reward');
assert.ok(treasure.rewards.some(r=>r.kind==='relic'));
assert.equal(treasure.rewards.length,3);
E.chooseReward(treasure,treasure.rewards.find(r=>r.kind==='relic').id);
assert.equal(treasure.relics.length,1);
assert.equal(treasure.encounter,1);
const camp=routeOf('camp');
camp.player.hp=15;
E.chooseRoute(camp,'camp');
E.chooseCamp(camp,'rest');
assert.ok(camp.player.hp>15);
assert.equal(camp.encounter,1);
const lost=E.createRun({word:'rune'},true,4);
E.chooseRoute(lost,'battle');
for(let i=0;i<400;i++) E.tick(lost,1);
assert.equal(lost.status,'lost');
const lostElapsed=lost.elapsed;
E.tick(lost,1);
assert.equal(lost.elapsed,lostElapsed,'terminal states freeze combat');
assert.equal(E.useItem(lost,'potion').ok,false);
const mechanics=E.createRun({word:'rune'},true,31);
mechanics.relics.push(E.RELICS.shell,E.RELICS.clock,E.RELICS.phoenix);
E.chooseRoute(mechanics,'battle');
assert.equal(mechanics.player.shield,18,'dragon relic grants opening shield');
assert.equal(mechanics.enemy.intent.duration,12.5,'clock relic slows attacks');
mechanics.player.shield=0;mechanics.player.hp=1;
mechanics.enemy.intent.remaining=0.1;
E.tick(mechanics,1);
assert.equal(mechanics.status,'combat');assert.equal(mechanics.player.hp,50);assert.equal(mechanics.phoenixUsed,true);
mechanics.player.shield=0;mechanics.player.hp=1;mechanics.enemy.intent.remaining=0.1;
E.tick(mechanics,1);assert.equal(mechanics.status,'lost','phoenix works only once');
for (const bossId of [3,7,11]) {
  const phase=E.createRun({word:'quarantine'},true,100);
  phase.encounter=bossId;phase.region=Math.floor(bossId/4);phase.routes=[{id:'boss',type:'boss',name:'首領'}];
  E.chooseRoute(phase,'boss');
  phase.enemy.hp=Math.floor(phase.enemy.maxHp/2)+1;
  E.submit(phase,phase.spell.word);
  assert.equal(phase.enemy.phase,2,'boss has second phase');
  assert.ok(phase.enemy.shield>0,'second phase reforms shield');
  assert.ok(phase.enemy.intent.duration>=9.5,'boss phase change is fairly telegraphed');
}
const consumables=E.createRun({word:'rune'},true,11);
E.chooseRoute(consumables,'battle');
for(const id of ['hourglass','barrier','focus'])consumables.inventory.push({...E.ITEMS[id],count:1});
const intentTime=consumables.enemy.intent.remaining;
E.useItem(consumables,'hourglass');assert.equal(consumables.enemy.intent.remaining,intentTime+6);
E.useItem(consumables,'barrier');assert.equal(consumables.player.shield,30);
E.useItem(consumables,'focus');assert.equal(consumables.player.focus,3);
E.submit(consumables,consumables.spell.word);assert.equal(consumables.player.focus,2);
for(let seed=0;seed<80;seed++) {
  const mixed=E.createRun({word:'robot'},true,seed);
  let guard=0;
  while(!['won','lost'].includes(mixed.status)&&guard++<1000) {
    if(mixed.player.hp<mixed.player.maxHp-38)E.useItem(mixed,'potion');
    if(mixed.status==='route')E.chooseRoute(mixed,mixed.routes[seed%mixed.routes.length].id);
    else if(mixed.status==='combat'){advance(mixed,5);if(mixed.status==='combat')E.submit(mixed,mixed.spell.word);}
    else if(mixed.status==='reward')E.chooseReward(mixed,mixed.rewards[seed%3].id);
    else if(mixed.status==='shop'){for(const offer of mixed.shop)E.buy(mixed,offer.id);E.leaveShop(mixed);}
    else if(mixed.status==='camp')E.chooseCamp(mixed,mixed.player.hp<mixed.player.maxHp*0.65?'rest':'train');
    assert.ok(mixed.player.hp>=0&&mixed.player.hp<=mixed.player.maxHp);
    assert.ok(mixed.player.gold>=0);
    assert.ok(mixed.inventory.every(i=>i.count>=0));
  }
  assert.ok(guard<1000,'mixed routes always terminate');
}
const summaries=[];
for(const seconds of [0,3,5,7]) {
  const run=E.createRun({word:'quarantine',zh:'隔離',rarity:'N'},false,77);
  let guard=0;
  while(!['won','lost'].includes(run.status) && guard++<1000) {
    if(run.player.hp<run.player.maxHp-38) E.useItem(run,'potion');
    if(run.status==='route') E.chooseRoute(run,run.routes[0].id);
    else if(run.status==='combat') {advance(run,seconds);if(run.status==='combat')E.submit(run,run.spell.word);}
    else if(run.status==='reward') {
      const next=run.rewards.find(r=>r.id==='power') || run.rewards.find(r=>r.id==='vigor') || run.rewards[0];
      E.chooseReward(run,next.id);
    }
  }
  assert.ok(guard<1000,'run always terminates');
  if(seconds<=5) assert.equal(run.status,'won',seconds+' second typing is completable');
  if(run.status==='won') {assert.equal(run.stats.bossesDefeated,3);assert.equal(run.completedNodes,12);assert.equal(run.stats.enemiesDefeated,12);}
  summaries.push({seconds,status:run.status,hp:run.player.hp,casts:run.stats.casts,elapsed:run.elapsed,relics:run.relics.length});
}
console.log('Dungeon engine checks passed. Balance:',JSON.stringify(summaries));
