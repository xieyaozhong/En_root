const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// A clock-driven Web Audio fake: sources finish at their scheduled stop time,
// and browser timers run only when the test advances the clock.
function harness(options = {}) {
  const timers = new Map(), contexts = [], documentListeners = new Map();
  let nextTimer = 0;
  class Param {
    constructor(value = 0) { this.value = value; this.events = []; }
    record(kind, value, time) {
      assert.ok(Number.isFinite(value) && Number.isFinite(time));
      this.events.push({ kind, value, time }); this.value = value;
    }
    setValueAtTime(value, time) { this.record('set', value, time); }
    linearRampToValueAtTime(value, time) { this.record('linear', value, time); }
    exponentialRampToValueAtTime(value, time) { assert.ok(value > 0); this.record('exponential', value, time); }
    cancelAndHoldAtTime(time) { this.events.push({ kind: 'hold', time }); }
    cancelScheduledValues(time) { this.events.push({ kind: 'cancel', time }); }
  }
  class Node {
    constructor(context) {
      this.context = context; this.disconnected = false;
      for (const key of ['gain', 'frequency', 'detune', 'Q', 'pan', 'threshold', 'knee', 'ratio', 'attack', 'release', 'delayTime']) this[key] = new Param();
      context.nodes.push(this);
    }
    connect(node) { assert.ok(node); return node; }
    disconnect() { this.disconnected = true; }
  }
  class Source extends Node {
    constructor(context) { super(context); this.startTime = null; this.stopTime = null; this.ended = false; context.sources.push(this); }
    start(time) { assert.ok(time >= 0); this.startTime = time; }
    stop(time) { assert.ok(time >= 0); this.stopTime = time; }
  }
  class Context {
    constructor() {
      this.currentTime = 0; this.state = 'suspended'; this.sampleRate = 8000;
      this.nodes = []; this.sources = []; this.listeners = new Map(); this.destination = {};
      this.resumeCalls = 0; this.closeCalls = 0; contexts.push(this);
    }
    createGain() { return new Node(this); }
    createDynamicsCompressor() { return new Node(this); }
    createBiquadFilter() { return new Node(this); }
    createStereoPanner() { return new Node(this); }
    createDelay() { this.delayCount = (this.delayCount || 0) + 1; return new Node(this); }
    createOscillator() { return new Source(this); }
    createBufferSource() { return new Source(this); }
    createBuffer(channels, length) { const data = new Float32Array(length); return { getChannelData() { return data; } }; }
    addEventListener(name, fn) { this.listeners.set(name, fn); }
    removeEventListener(name, fn) { if (this.listeners.get(name) === fn) this.listeners.delete(name); }
    async resume() {
      this.resumeCalls++;
      if (options.rejectResume) throw new Error('Gesture denied');
      if (options.deferResume) await new Promise(resolve => { this.finishResume = resolve; });
      this.state = 'running'; this.listeners.get('statechange')?.();
    }
    close() { this.closeCalls++; this.state = 'closed'; return Promise.resolve(); }
  }
  const document = {
    hidden: false,
    addEventListener(name, fn) { documentListeners.set(name, fn); },
    removeEventListener(name, fn) { if (documentListeners.get(name) === fn) documentListeners.delete(name); }
  };
  const window = {
    AudioContext: options.unsupported ? undefined : Context, document,
    setInterval(fn) { const id = ++nextTimer; timers.set(id, fn); return id; },
    clearInterval(id) { timers.delete(id); }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'dungeon-audio.js'), 'utf8'), { window });
  const audio = new window.DungeonAudio();
  function advance(seconds, tick = true) {
    for (const context of contexts) {
      context.currentTime += seconds;
      for (const source of context.sources) {
        if (!source.ended && source.stopTime !== null && source.stopTime <= context.currentTime) {
          source.ended = true; source.onended?.();
        }
      }
    }
    if (tick) for (const fn of [...timers.values()]) fn();
  }
  return { audio, contexts, timers, documentListeners, window, advance,
    hidden(value) { document.hidden = value; documentListeners.get('visibilitychange')?.(); } };
}

(async () => {
  let checks = 0;
  const test = async (name, fn) => { await fn(); checks++; console.log('ok - ' + name); };

  await test('silent construction; only explicit enabling creates/resumes audio', async () => {
    const h = harness();
    h.audio.setScene({ combat: true, focus: false }); h.audio.setVolume(0.4);
    assert.equal(h.audio.sfx('cast'), false); assert.equal(h.contexts.length, 0);
    assert.equal(await h.audio.setEnabled(true), true);
    assert.equal(h.contexts.length, 1); assert.equal(h.contexts[0].resumeCalls, 1);
    assert.ok(h.contexts[0].sources.length > 0, 'moving combat plays music');
    assert.equal(h.timers.size, 1); h.audio.dispose();
  });

  await test('chanting ducks music without stopping movement music or effects', async () => {
    const h = harness(); await h.audio.setEnabled(true);
    h.audio.setScene({ focus: true }); assert.equal(h.audio._music.gain.value, 0.40);
    assert.equal(h.audio.sfx('cast'), true); assert.equal(h.timers.size, 1);
    h.audio.setScene({ focus: false }); assert.equal(h.audio._music.gain.value, 0.72);
    assert.equal(h.timers.size, 1); assert.equal(h.contexts[0].resumeCalls, 1);
    h.audio.dispose();
  });

  await test('mute, pause, hidden page and volume zero stop scheduling and release voices', async () => {
    const h = harness(); await h.audio.setEnabled(true); h.audio.sfx('win');
    const silence = () => {
      assert.equal(h.timers.size, 0); assert.equal(h.audio.sfx('dash'), false);
      const count = h.contexts[0].sources.length; h.advance(2);
      assert.equal(h.contexts[0].sources.length, count); assert.equal(h.audio._voices.size, 0);
      assert.ok(h.contexts[0].sources.every(source => source.disconnected));
    };
    h.audio.setScene({ paused: true }); silence();
    h.audio.setScene({ paused: false }); assert.equal(h.timers.size, 1);
    h.hidden(true); silence(); h.hidden(false); assert.equal(h.timers.size, 1);
    h.audio.setVolume(0); silence(); h.audio.setVolume(0.5); assert.equal(h.timers.size, 1);
    await h.audio.setEnabled(false); silence(); h.audio.dispose();
  });

  await test('all four regional compositions schedule a full 32-bar cycle safely', async () => {
    const h = harness(); await h.audio.setEnabled(true);
    assert.equal(h.window.DungeonAudio.THEMES.length, 4);
    assert.match(h.audio.themeName, /Fireflies/);
    for (let region = 0; region < 4; region++) {
      h.audio.setScene({ region, combat: true, boss: false });
      assert.equal(h.audio.getTrackInfo().id, 'region-' + region);
      const theme = h.window.DungeonAudio.THEMES[region]; assert.equal(theme.bars, 32);
      let wrapped = false, previous = h.audio._step;
      for (let i = 0; i < 4000; i++) {
        h.advance(0.025);
        assert.ok(h.audio._voices.size <= 96, 'voice cap stays bounded');
        if (h.audio._step < previous) wrapped = true;
        previous = h.audio._step;
      }
      assert.ok(wrapped, 'complete musical loop for region ' + region);
    }
    h.audio.dispose(); assert.equal(h.audio._voices.size, 0);
  });

  await test('region transitions replace music but preserve active one-shot effects', async () => {
    const h = harness(); await h.audio.setEnabled(true); h.audio.sfx('win');
    const voices = [...h.audio._voices], music = voices.filter(v => v.channel === 'music'), sfx = voices.filter(v => v.channel === 'sfx');
    const effectStops = sfx.map(v => v.source.stopTime);
    h.audio.setScene({ region: 1 }); assert.match(h.audio.themeName, /Library/);
    assert.ok(music.every(v => v.source.stopTime === 0.16));
    assert.deepEqual(sfx.map(v => v.source.stopTime), effectStops);
    h.audio.dispose();
  });

  await test('every boss and special NPC selects a distinct original score and completes its loop', async () => {
    const h = harness(), ids = ['thorn', 'witch', 'king', 'merchant', 'healer', 'smith', 'cartographer', 'ferryman', 'lantern', 'echo', 'sentinel', 'astral', 'lumina', 'constellation'];
    const catalog = h.window.DungeonAudio.BOSS_THEMES;
    assert.equal(catalog.length, ids.length);
    assert.equal(new Set(catalog.map(track => track.name)).size, ids.length);
    const signatures = new Set();
    await h.audio.setEnabled(true);
    for (const id of ids) {
      h.audio.setScene({ combat: true, boss: true, bossId: id, phase: 1 });
      const info = h.audio.getTrackInfo();
      assert.equal(info.id, 'boss-' + id); assert.equal(info.bossId, id);
      assert.equal(info.kind, 'boss'); assert.equal(info.phase, 1);
      assert.equal(info.name, h.audio.themeName); assert.equal(info.bars, 32);
      assert.equal(info.tempo, catalog.find(track => track.bossId === id).tempo);
      const firstSource = h.contexts[0].sources.length;
      let wrapped = false, previous = h.audio._step;
      for (let i = 0; i < 3500; i++) {
        h.advance(0.025);
        assert.ok(h.audio._voices.size <= 96);
        if (i === 160) {
          // Compare emitted pitches/timbres, not metadata or BPM alone.
          const tones = h.contexts[0].sources.slice(firstSource).filter(source => source.type);
          signatures.add(JSON.stringify(tones.slice(0, 36).map(source => [source.type, source.frequency.events.find(event => event.kind === 'set').value])));
        }
        if (h.audio._step < previous) wrapped = true;
        previous = h.audio._step;
      }
      assert.ok(wrapped, id + ' completes its own 32-bar composition');
    }
    assert.equal(signatures.size, ids.length, 'all identities produce different musical phrases');
    h.audio.dispose();
  });

  await test('boss identity and phase transitions replace the score without duplicating timers or cutting effects', async () => {
    const h = harness(); await h.audio.setEnabled(true);
    h.audio.setScene({ combat: true, boss: true, bossId: 'npc-merchant', phase: 1 }); h.advance(0.1);
    assert.equal(h.audio.getTrackInfo().bossId, 'merchant');
    h.audio.sfx('bossIntro');
    let voices = [...h.audio._voices], music = voices.filter(v => v.channel === 'music'), effects = voices.filter(v => v.channel === 'sfx');
    const musicStops = music.map(v => v.source.stopTime), effectStops = effects.map(v => v.source.stopTime);
    const tempo = h.audio.getTrackInfo().tempo;
    h.audio.setScene({ bossId: 'merchant', phase: 1 });
    assert.deepEqual(music.map(v => v.source.stopTime), musicStops, 'rendering the same scene does not restart music');
    h.audio.setScene({ phase: 2 });
    assert.equal(h.audio.getTrackInfo().tempo, tempo + 16); assert.equal(h.audio.getTrackInfo().phase, 2);
    assert.ok(music.every(v => Math.abs(v.source.stopTime - 0.26) < 0.00001));
    assert.deepEqual(effects.map(v => v.source.stopTime), effectStops);
    assert.equal(h.timers.size, 1); assert.equal(h.contexts[0].resumeCalls, 1);
    h.audio.setScene({ bossId: 'echo' });
    assert.equal(h.audio.getTrackInfo().bossId, 'echo'); assert.equal(h.audio.getTrackInfo().phase, 1, 'new identity clears prior rage');
    h.audio.setScene({ boss: false, combat: false, region: 1 });
    assert.equal(h.audio.getTrackInfo().id, 'region-1'); assert.match(h.audio.themeName, /Library/);
    h.audio.dispose();
  });

  await test('Lumina conversation, romance and story quest have original full-length arrangements', async () => {
    const h = harness(), signatures = new Set();
    assert.equal(h.window.DungeonAudio.STORY_THEMES.length, 3);
    const scenes = [
      { scene: { npcId: 'lumina', romance: false, story: false }, id: 'npc-lumina', kind: 'conversation' },
      { scene: { npcId: 'lumina', romance: true, story: false }, id: 'romance-lumina', kind: 'romance' },
      { scene: { npcId: '', romance: true, story: true }, id: 'story-chronicle', kind: 'story' }
    ];
    await h.audio.setEnabled(true);
    for (const { scene, id, kind } of scenes) {
      h.audio.setScene({ ...scene, combat: false, boss: false, region: 3 });
      assert.equal(h.audio.getTrackInfo().id, id); assert.equal(h.audio.getTrackInfo().kind, kind);
      const start = h.contexts[0].sources.length;
      let wrapped = false, previous = h.audio._step;
      for (let i = 0; i < 4800; i++) {
        h.advance(0.025);
        assert.ok(h.audio._voices.size <= 96);
        if (h.audio._step < previous) wrapped = true;
        previous = h.audio._step;
      }
      assert.ok(wrapped, id + ' completes its composition');
      signatures.add(JSON.stringify(h.contexts[0].sources.slice(start).filter(source => source.type).slice(0, 160)
        .map(source => [source.type, source.frequency.events.find(event => event.kind === 'set').value])));
    }
    assert.equal(signatures.size, 3, 'arrangements differ in emitted harmony and melody');
    h.audio.setScene({ combat: true });
    assert.equal(h.audio.getTrackInfo().id, 'story-chronicle', 'quest combat retains its story score');
    h.audio.setScene({ story: false });
    assert.equal(h.audio.getTrackInfo().id, 'region-3');
    h.audio.dispose();
  });

  await test('boss priority, conversation exit and all story scene lifecycle states remain predictable', async () => {
    const h = harness();
    h.audio.setScene({ region: 3, npcId: 'lumina', romance: true, story: true });
    assert.equal(h.audio.getTrackInfo().id, 'romance-lumina');
    assert.equal(h.contexts.length, 0);
    await h.audio.setEnabled(true);
    for (const id of ['astral', 'lumina', 'constellation']) {
      h.audio.setScene({ boss: true, combat: true, bossId: id });
      assert.equal(h.audio.getTrackInfo().id, 'boss-' + id, 'conversation cannot override boss music');
      const stops = [...h.audio._voices].map(voice => voice.source.stopTime);
      h.audio.setScene({ npcId: 'lumina', romance: false, story: false });
      assert.deepEqual([...h.audio._voices].map(voice => voice.source.stopTime), stops, 'unrelated fields do not restart boss music');
    }
    h.audio.setScene({ boss: false, combat: false, npcId: 'lumina', romance: true });
    assert.equal(h.audio.getTrackInfo().id, 'romance-lumina');
    h.audio.setScene({ paused: true }); h.advance(1);
    assert.equal(h.timers.size, 0); assert.equal(h.audio._voices.size, 0);
    h.audio.setScene({ paused: false }); assert.equal(h.timers.size, 1);
    h.hidden(true); h.advance(1); assert.equal(h.audio._voices.size, 0);
    h.hidden(false); h.audio.setScene({ focus: true });
    assert.equal(h.audio._music.gain.value, 0.4);
    h.audio.setScene({ npcId: null }); assert.equal(h.audio.getTrackInfo().id, 'region-3');
    h.audio.setScene({ npcId: 'constructor' }); assert.equal(h.audio.getTrackInfo().id, 'region-3');
    await h.audio.setEnabled(false);
    h.audio.setScene({ story: true }); h.advance(1);
    assert.equal(h.timers.size, 0); assert.equal(h.audio._voices.size, 0);
    h.audio.dispose();
  });

  await test('music instruments have soft attacks and decaying sustain with one bounded shared room', async () => {
    const h = harness(); h.audio.setScene({ npcId: 'lumina', combat: false });
    await h.audio.setEnabled(true);
    const tones = [...h.audio._voices].filter(voice => voice.source.type);
    assert.ok(tones.length >= 5);
    for (const voice of tones) {
      const ramps = voice.envelope.gain.events.filter(event => event.kind === 'linear');
      assert.ok(ramps.length >= 2);
      assert.ok(ramps[0].time - voice.source.startTime >= 0.007, 'no hard-edged attack');
      assert.ok(ramps[1].value < ramps[0].value, 'instrument settles after its attack');
      assert.ok(ramps[1].time >= ramps[0].time);
      assert.ok(voice.envelope.gain.events.some(event => event.kind === 'exponential' && event.value < 0.001));
    }
    for (let i = 0; i < 400; i++) h.advance(0.025);
    assert.equal(h.contexts[0].delayCount, 1, 'room processor is shared across notes');
    h.audio.dispose(); assert.ok(h.contexts[0].nodes.every(node => node.disconnected));
  });

  await test('phase two adds musical pressure while all boss effects obey mute, pause and visibility', async () => {
    const first = harness(), second = harness();
    for (const [h, phase] of [[first, 1], [second, 2]]) {
      h.audio.setScene({ combat: true, boss: true, bossId: 'king', phase });
      await h.audio.setEnabled(true);
      for (let i = 0; i < 100; i++) h.advance(0.025);
    }
    assert.ok(second.contexts[0].sources.length > first.contexts[0].sources.length, 'rage adds density as well as tempo');
    first.audio.dispose(); second.audio.dispose();
    const h = harness(), effects = ['bossIntro', 'bossPhase', 'bossDeath', 'playerDeath', 'echo'];
    h.audio.setScene({ boss: true, bossId: 'lantern', phase: 2 });
    for (const kind of effects) assert.equal(h.audio.sfx(kind), false);
    assert.equal(h.contexts.length, 0, 'scene changes never create an audio context');
    await h.audio.setEnabled(true);
    for (const kind of effects) {
      assert.equal(h.audio.sfx(kind), true); assert.equal(h.audio.sfx(kind), false);
      h.advance(1);
    }
    h.audio.setScene({ paused: true, bossId: 'sentinel' });
    for (const kind of effects) assert.equal(h.audio.sfx(kind), false);
    h.advance(2); assert.equal(h.audio._voices.size, 0); assert.equal(h.timers.size, 0);
    h.audio.setScene({ paused: false }); h.hidden(true);
    for (const kind of effects) assert.equal(h.audio.sfx(kind), false);
    h.hidden(false); await h.audio.setEnabled(false);
    h.audio.setScene({ bossId: 'ferryman', phase: 2 });
    assert.equal(h.timers.size, 0); assert.equal(h.audio.sfx('bossIntro'), false);
    h.audio.dispose();
  });

  await test('missing or unknown boss identities use the regional boss score safely', async () => {
    const h = harness();
    h.audio.setScene({ region: 2, boss: true, bossId: 'unknown', phase: Infinity });
    assert.equal(h.audio.getTrackInfo().bossId, 'king'); assert.equal(h.audio.getTrackInfo().phase, 1);
    h.audio.setScene({ bossId: '__proto__' }); assert.equal(h.audio.getTrackInfo().bossId, 'king');
    h.audio.setScene({ bossId: 'constructor' }); assert.equal(h.audio.getTrackInfo().bossId, 'king');
    h.audio.setScene({ bossId: null, region: 0 }); assert.equal(h.audio.getTrackInfo().bossId, 'thorn');
    h.audio.setScene({ bossId: null, region: 99 }); assert.equal(h.audio.getTrackInfo().bossId, 'astral');
    h.audio.setScene({ region: 0 });
    h.audio.setScene({ boss: false, combat: false }); assert.equal(h.audio.getTrackInfo().id, 'region-0');
    assert.equal(h.audio.getTrackInfo().tempo, h.window.DungeonAudio.THEMES[0].tempo);
    assert.equal(h.contexts.length, 0); h.audio.dispose();
  });

  await test('long clock gaps do not replay a backlog; effects are throttled', async () => {
    const h = harness(); await h.audio.setEnabled(true);
    assert.equal(h.audio.sfx('cast'), true); assert.equal(h.audio.sfx('cast'), false);
    assert.equal(h.audio.sfx('unknown'), false);
    const count = h.contexts[0].sources.length; h.advance(90);
    const fresh = h.contexts[0].sources.slice(count);
    assert.ok(fresh.length < 20); assert.ok(fresh.every(source => source.startTime >= 90));
    assert.equal(h.audio.sfx('cast'), true); h.audio.dispose();
  });

  await test('a muted pending enable cannot start audio after its resume promise resolves', async () => {
    const h = harness({ deferResume: true });
    const pending = h.audio.setEnabled(true); await h.audio.setEnabled(false);
    h.contexts[0].finishResume(); assert.equal(await pending, false);
    assert.equal(h.audio.enabled, false); assert.equal(h.timers.size, 0); assert.equal(h.contexts[0].sources.length, 0);
    h.audio.dispose();
  });

  await test('unsupported and denied audio fail quietly; disposal releases all resources', async () => {
    for (const options of [{ unsupported: true }, { rejectResume: true }]) {
      const h = harness(options); assert.equal(await h.audio.setEnabled(true), false);
      assert.equal(h.audio.enabled, false); assert.equal(h.timers.size, 0); h.audio.dispose();
    }
    const h = harness(); await h.audio.setEnabled(true); h.audio.dispose(); h.audio.dispose();
    assert.equal(h.contexts[0].closeCalls, 1); assert.equal(h.contexts[0].listeners.size, 0);
    assert.equal(h.documentListeners.size, 0); assert.equal(h.timers.size, 0);
    assert.ok(h.contexts[0].nodes.every(node => node.disconnected));
    assert.equal(await h.audio.setEnabled(true), false);
  });
  console.log('Passed ' + checks + ' audio lifecycle and scheduling tests.');
})().catch(error => { console.error(error); process.exitCode = 1; });
