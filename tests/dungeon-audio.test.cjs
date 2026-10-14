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
      for (const key of ['gain', 'frequency', 'detune', 'Q', 'pan', 'threshold', 'knee', 'ratio', 'attack', 'release']) this[key] = new Param();
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

  await test('all three regional compositions schedule a full 32-bar cycle safely', async () => {
    const h = harness(); await h.audio.setEnabled(true);
    assert.equal(h.window.DungeonAudio.THEMES.length, 3);
    assert.match(h.audio.themeName, /Fireflies/);
    for (let region = 0; region < 3; region++) {
      h.audio.setScene({ region, combat: true, boss: region === 2 });
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
    assert.ok(music.every(v => v.source.stopTime === 0.035));
    assert.deepEqual(sfx.map(v => v.source.stopTime), effectStops);
    h.audio.dispose();
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
