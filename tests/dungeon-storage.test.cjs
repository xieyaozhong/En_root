const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../dungeon-storage.js'), 'utf8');
const cards = [{word:'fire',rarity:'R',zh:'火'}, {word:'ice',rarity:'SR'}];
const seedRun = { seed: 42, phase: 'battle', hp: 100 };
function setup(initial, nativeLock = true, sharedMap) {
  const map = sharedMap || new Map(Object.entries(initial || {}));
  const calls = [];
  const failures = [];
  const storage = {
    getItem(key) { if (failures[0] === 'read') { failures.shift(); throw Error('denied'); } return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { calls.push(['set', key]); if (failures[0] === key) { failures.shift(); throw Error('denied'); } map.set(key, String(value)); },
    removeItem(key) { calls.push(['remove', key]); if (failures[0] === key) { failures.shift(); throw Error('denied'); } map.delete(key); }
  };
  let locks = 0;
  const window = { localStorage: storage, navigator: nativeLock ? { locks: { async request(name, opts, fn) { locks++; return fn(); } } } : {} };
  vm.runInNewContext(source, { window, console });
  return {api:window.DungeonStorage,map,calls,failures,locks:()=>locks};
}
const owned = count => JSON.stringify({fire:{count,first:1,last:2,rarity:'R'},ice:{count:2,first:8}});
const value = (ctx,key) => JSON.parse(ctx.map.get(key));
const tests = [];
function test(name, body) { tests.push({name, body}); }

test('debits exactly one and preserves all original metadata at zero', async () => {
  const ctx = setup({enroot_cards:owned(1)});
  assert.equal(ctx.api.listOwned(cards).cards.length, 2);
  const entry = await ctx.api.consumeEntry('fire',cards,seedRun);
  assert.equal(entry.ok,true);
  assert.deepEqual(value(ctx,'enroot_cards'),{fire:{count:0,first:1,last:2,rarity:'R'},ice:{count:2,first:8}});
  assert.equal(entry.receipt.remaining,0);
  assert.equal(ctx.api.listOwned(cards).cards.length,1);
  assert.equal((await ctx.api.load()).active.receipt.id,entry.receipt.id);
  assert.equal(ctx.map.has('enroot_dungeon_entry_pending'),false);
  assert.ok(ctx.locks()>=2);
});
test('rejects unavailable or invalid cards without changing storage', async () => {
  for (const raw of [owned(0),'{broken',JSON.stringify({fire:{count:-1}}),JSON.stringify({fire:{count:1.5}})]) {
    const ctx=setup({enroot_cards:raw});
    const entry=await ctx.api.consumeEntry('fire',cards,seedRun);
    assert.equal(entry.ok,false);
    assert.equal(ctx.map.get('enroot_cards'),raw);
    assert.equal(ctx.calls.length,0);
  }
  const ctx=setup({enroot_cards:owned(1)});
  assert.equal((await ctx.api.consumeEntry('absent',cards,seedRun)).code,'UNKNOWN_CARD');
  assert.equal(ctx.calls.length,0);
});
test('rejects corrupted dungeon data instead of overwriting it', async()=>{
  const ctx=setup({enroot_cards:owned(1),enroot_dungeon_v1:'[]'});
  assert.equal((await ctx.api.consumeEntry('fire',cards,seedRun)).code,'CORRUPT_SAVE');
  assert.equal(ctx.map.get('enroot_dungeon_v1'),'[]');
  assert.equal(ctx.calls.length,0);
});
test('serializes duplicate clicks with and without Web Locks', async()=>{
  for(const nativeLock of [true,false]) {
    const ctx=setup({enroot_cards:owned(3)},nativeLock);
    const entries=await Promise.all([ctx.api.consumeEntry('fire',cards,seedRun),ctx.api.consumeEntry('fire',cards,seedRun)]);
    assert.equal(entries.filter(entry=>entry.ok).length,1);
    assert.equal(entries.find(entry=>!entry.ok).code,'ACTIVE_RUN');
    assert.equal(value(ctx,'enroot_cards').fire.count,2);
  }
});
test('resumes the exact seeded snapshot and rejects stale run writes', async()=>{
  const ctx=setup({enroot_cards:owned(1)}),entry=await ctx.api.consumeEntry('fire',cards,seedRun);
  const next={seed:42,phase:'loot',hp:71};
  assert.equal((await ctx.api.saveRun(next,entry.receipt.id)).ok,true);
  next.hp=0;
  assert.equal((await ctx.api.load()).active.run.hp,71);
  assert.equal((await ctx.api.saveRun(seedRun,'old-receipt')).code,'STALE_RUN');
  assert.equal((await ctx.api.load()).active.run.hp,71);
});
test('settles rewards exactly once and keeps terminal run until return', async()=>{
  const ctx=setup({enroot_cards:owned(1)}),entry=await ctx.api.consumeEntry('fire',cards,seedRun);
  const final={seed:42,phase:'victory',hp:9};
  const one=await ctx.api.finishRun(entry.receipt.id,{won:true,shards:24,floor:3},final);
  const two=await ctx.api.finishRun(entry.receipt.id,{won:true,shards:999,floor:99});
  assert.equal(JSON.stringify(one.stats),JSON.stringify({runs:1,wins:1,shards:24,bestFloor:3}));
  assert.equal(JSON.stringify(two.stats),JSON.stringify(one.stats));
  assert.equal(two.active.finished,true);
  assert.equal(two.active.run.phase,'victory');
  assert.equal((await ctx.api.abandonRun(entry.receipt.id)).active,null);
  assert.equal(value(ctx,'enroot_cards').fire.count,0);
});
test('failure before journal write never consumes a card', async()=>{
  const ctx=setup({enroot_cards:owned(1)});
  ctx.failures.push('enroot_dungeon_entry_pending');
  assert.equal((await ctx.api.consumeEntry('fire',cards,seedRun)).ok,false);
  assert.equal(value(ctx,'enroot_cards').fire.count,1);
  assert.equal((await ctx.api.load()).active,null);
});
test('failure before debit cancels an uncharged journal during recovery', async()=>{
  const ctx=setup({enroot_cards:owned(1)});
  ctx.failures.push('enroot_cards');
  assert.equal((await ctx.api.consumeEntry('fire',cards,seedRun)).ok,false);
  assert.equal(value(ctx,'enroot_cards').fire.count,1);
  assert.equal((await ctx.api.load()).active,null);
  assert.equal(ctx.map.has('enroot_dungeon_entry_pending'),false);
});
test('failure after debit recovers a paid run without another debit', async()=>{
  const ctx=setup({enroot_cards:owned(2)});
  ctx.failures.push('enroot_dungeon_v1');
  assert.equal((await ctx.api.consumeEntry('fire',cards,seedRun)).ok,false);
  assert.equal(value(ctx,'enroot_cards').fire.count,1);
  const restored=setup(Object.fromEntries(ctx.map));
  const load=await restored.api.load();
  assert.equal(load.ok,true);
  assert.equal(load.active.run.seed,42);
  assert.equal(value(restored,'enroot_cards').fire.count,1);
  assert.equal(restored.calls.some(call=>call[1]==='enroot_cards'),false);
});
test('recovery never restores inventory after collections were cleared', async()=>{
  const ctx=setup({enroot_cards:owned(2)});
  ctx.failures.push('enroot_dungeon_v1');
  await ctx.api.consumeEntry('fire',cards,seedRun);
  ctx.map.delete('enroot_cards');
  const restored=setup(Object.fromEntries(ctx.map));
  assert.equal((await restored.api.load()).code,'ENTRY_CONFLICT');
  assert.equal(restored.map.has('enroot_cards'),false);
  assert.equal(restored.calls.length,0);
});
test('successful saves stay resumable when journal cleanup initially fails', async()=>{
  const ctx=setup({enroot_cards:owned(1)});
  // Let initial journal write pass and fail only the matching remove.
  const oldRemove=ctx.api;
  const entry=await ctx.api.consumeEntry('fire',cards,seedRun);
  const saved=value(ctx,'enroot_dungeon_v1');
  const before=owned(1), after=ctx.map.get('enroot_cards');
  ctx.map.set('enroot_dungeon_entry_pending',JSON.stringify({version:1,cardsBefore:before,cardsAfter:after,active:saved.active}));
  ctx.map.delete('enroot_cards');
  assert.equal((await ctx.api.load()).active.receipt.id,entry.receipt.id);
  assert.equal(ctx.map.has('enroot_cards'),false);
});
test('unavailable storage blocks entry',async()=>{
  const ctx=setup({enroot_cards:owned(1)});
  ctx.failures.push('read');
  assert.equal((await ctx.api.consumeEntry('fire',cards,seedRun)).code,'STORAGE_UNAVAILABLE');
  assert.equal(ctx.calls.length,0);
});
test('another document cannot overwrite a newer revision of the same run',async()=>{
  const first=setup({enroot_cards:owned(1)}),entry=await first.api.consumeEntry('fire',cards,seedRun);
  const second=setup({},true,first.map);
  await second.api.load();
  assert.equal((await first.api.saveRun({seed:42,hp:70},entry.receipt.id)).ok,true);
  assert.equal((await second.api.saveRun({seed:42,hp:99},entry.receipt.id)).code,'STALE_RUN');
  assert.equal((await second.api.abandonRun(entry.receipt.id)).code,'STALE_RUN');
  assert.equal((await second.api.finishRun(entry.receipt.id,{won:true,shards:1,floor:1})).code,'STALE_RUN');
  assert.equal(value(first,'enroot_dungeon_v1').active.run.hp,70);
});
test('completed run snapshot cannot be rewritten by late autosave or duplicate settlement',async()=>{
  const ctx=setup({enroot_cards:owned(1)}),entry=await ctx.api.consumeEntry('fire',cards,seedRun);
  await ctx.api.finishRun(entry.receipt.id,{won:true,shards:1,floor:3},{seed:42,phase:'victory'});
  const before=ctx.map.get('enroot_dungeon_v1');
  const calls=ctx.calls.length;
  assert.equal((await ctx.api.saveRun(seedRun,entry.receipt.id)).ok,true);
  assert.equal((await ctx.api.finishRun(entry.receipt.id,{won:false,shards:99,floor:9},seedRun)).ok,true);
  assert.equal(ctx.map.get('enroot_dungeon_v1'),before);
  assert.equal(ctx.calls.length,calls);
});

(async()=>{
  for(const item of tests) { await item.body(); console.log('PASS '+item.name); }
  console.log(`${tests.length} focused persistence tests passed.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
