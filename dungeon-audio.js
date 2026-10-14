(function (global) {
  'use strict';

  // Original melodies written for EnRoot. Every instrument is synthesized in
  // this file; no recording, sound font, sample download, or network is used.
  const COMPOSITIONS = [
    {
      name: 'Lanterns in the Lost Library', tonic: 38, tempo: 88,
      scale: [0, 2, 3, 5, 7, 8, 10], wave: 'square', cutoff: 2200,
      harmony: [0, 0, -2, -2, 3, 3, 4, 4, 0, 2, -2, 3, 4, 4, 0, 0],
      melody: [
        [7, null, 9, 8, 7, 4, 5, null], [4, 7, 6, null, 5, 4, 2, null],
        [5, null, 7, 9, 8, 7, 5, 4], [2, 4, 5, null, 4, 2, 1, null],
        [3, 5, 7, null, 8, 7, 5, 3], [5, null, 6, 7, 5, 3, 2, null],
        [4, 6, 8, 7, 6, null, 4, 3], [2, 1, 4, null, 0, null, null, null],
        [7, 9, 11, null, 9, 8, 7, 5], [9, null, 8, 7, 6, 4, 2, null],
        [12, 9, 7, 5, 7, null, 9, 8], [10, 8, 7, null, 5, 3, 5, null],
        [8, 6, 4, 6, 8, 9, 8, 6], [4, null, 6, 8, 7, 6, 4, 2],
        [7, 5, 4, 2, 4, 5, 7, null], [9, 8, 7, 4, 0, null, null, null]
      ]
    },
    {
      name: 'Fireflies Beneath the Thorns', tonic: 40, tempo: 96,
      scale: [0, 2, 3, 5, 7, 9, 10], wave: 'triangle', cutoff: 3200,
      harmony: [0, 3, 0, -1, 3, 1, 4, 0, -1, 3, 1, 4, 0, 3, 4, 0],
      melody: [
        [7, 9, null, 11, 9, 7, 4, null], [10, 8, 5, null, 7, 8, 10, 8],
        [7, 4, 2, 4, 7, null, 9, 7], [6, null, 8, 10, 8, 6, 4, null],
        [5, 7, 8, null, 10, 8, 7, 5], [8, 6, 3, null, 6, 8, 9, 8],
        [6, 8, 11, 8, 6, null, 4, 2], [7, 4, 2, null, 0, null, 4, null],
        [13, 10, 8, null, 6, 8, 10, 8], [12, 10, 8, 7, 5, null, 8, 10],
        [8, 10, 12, null, 10, 8, 6, 3], [11, 8, 6, 4, 6, 8, 6, null],
        [9, 7, 4, null, 2, 4, 7, 9], [10, 8, 7, 5, 8, null, 10, 12],
        [11, 8, 6, 4, 6, 4, 2, null], [7, 9, 7, 4, 0, null, null, null]
      ]
    },
    {
      name: 'The Obsidian Crown', tonic: 37, tempo: 92,
      scale: [0, 2, 3, 5, 7, 8, 11], wave: 'sawtooth', cutoff: 1900,
      harmony: [0, 4, -2, 4, 0, 3, -2, 4, 0, -2, 3, 4, -2, 3, 4, 0],
      melody: [
        [7, null, 6, 7, 9, null, 8, 7], [6, 4, 6, null, 8, 6, 4, null],
        [5, 7, 9, 8, 7, null, 5, 4], [6, null, 8, 11, 8, 6, 4, 3],
        [7, 9, 11, null, 9, 7, 6, 7], [8, 5, 3, null, 5, 7, 8, null],
        [9, 7, 5, 4, 5, 7, 9, 8], [6, 4, 6, null, 7, null, null, null],
        [14, 13, 11, 9, 11, null, 13, 14], [12, 9, 7, null, 5, 7, 9, 12],
        [10, 8, 5, 3, 5, 8, 10, null], [11, 8, 6, null, 4, 6, 8, 11],
        [12, 9, 7, 5, 7, null, 9, 7], [10, 8, 7, 5, 3, null, 5, 8],
        [11, 8, 6, 4, 6, 8, 6, 4], [7, 6, 7, 9, 7, null, 0, null]
      ]
    }
  ];
  // Region order follows DungeonEngine: forest, library, then the throne.
  const THEMES = [COMPOSITIONS[1], COMPOSITIONS[0], COMPOSITIONS[2]];
  const MAX_VOICES = 96;
  const LOOKAHEAD = 0.12;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const frequency = midi => 440 * Math.pow(2, (midi - 69) / 12);

  class DungeonAudio {
    constructor() {
      this._enabled = false;
      this._disposed = false;
      this._volume = 0.55;
      this._scene = { region: 0, combat: false, boss: false, paused: false, focus: false };
      this._context = null;
      this._nodes = [];
      this._voices = new Set();
      this._timer = null;
      this._playing = false;
      this._silenced = true;
      this._step = 0;
      this._nextTime = 0;
      this._toggleVersion = 0;
      this._lastSfx = Object.create(null);
      this._visibility = () => this._reconcile();
      this._stateChange = () => this._reconcile();
      if (global.document) global.document.addEventListener('visibilitychange', this._visibility);
    }

    get enabled() { return this._enabled; }
    get volume() { return this._volume; }
    get supported() { return !!(global.AudioContext || global.webkitAudioContext); }
    get themeName() { return THEMES[this._scene.region].name; }

    // Call directly from the sound toggle's click/tap handler. Construction,
    // scene changes, and sound effects never create or resume an audio context.
    async setEnabled(enabled) {
      if (this._disposed) return false;
      const version = ++this._toggleVersion;
      if (!enabled) {
        this._enabled = false;
        this._halt();
        return true;
      }
      try {
        if (!this._context) this._createContext();
        if (this._context.state !== 'running') await this._context.resume();
        if (version !== this._toggleVersion || this._disposed) return false;
        if (this._context.state !== 'running') throw new Error('Audio context did not start');
        this._enabled = true;
        this._reconcile();
        return true;
      } catch (_) {
        if (version === this._toggleVersion) {
          this._enabled = false;
          this._halt();
        }
        return false;
      }
    }

    setScene(scene) {
      if (this._disposed || !scene || typeof scene !== 'object') return;
      const previous = this._scene;
      const next = Object.assign({}, previous);
      if (Number.isFinite(scene.region)) next.region = clamp(Math.floor(scene.region), 0, 2);
      for (const key of ['combat', 'boss', 'paused', 'focus']) {
        if (typeof scene[key] === 'boolean') next[key] = scene[key];
      }
      this._scene = next;
      // Focus means the player's limited chanting mode, not browser focus.
      // Keep the soundtrack playing while moving; soften it during typing.
      if (previous.focus !== next.focus && this._music) this._ramp(this._music.gain, next.focus ? 0.40 : 0.72, 0.12);
      if (previous.region !== next.region) {
        this._step = 0;
        this._nextTime = this._context ? this._context.currentTime + 0.055 : 0;
        this._stopVoices('music');
      }
      this._reconcile();
    }

    setVolume(value) {
      if (this._disposed || !Number.isFinite(value)) return;
      this._volume = clamp(value, 0, 1);
      if (this._master) this._ramp(this._master.gain, this._volume, 0.035);
      this._reconcile();
    }

    sfx(kind) {
      if (!this._canPlay() || !this._playing) return false;
      const aliases = { attack: 'cast', damage: 'hit', shield: 'heal', signature: 'cast' };
      kind = aliases[kind] || kind;
      if (!['cast', 'dash', 'hit', 'heal', 'win', 'loot', 'error'].includes(kind)) return false;
      const now = this._context.currentTime + 0.008;
      if (this._lastSfx[kind] !== undefined && now - this._lastSfx[kind] < (kind === 'win' ? 0.8 : 0.07)) return false;
      this._lastSfx[kind] = now;
      const root = THEMES[this._scene.region].tonic + 24;
      if (kind === 'cast') {
        this._tone(root + 7, now, 0.10, { channel: 'sfx', wave: 'square', gain: 0.065, slide: root + 19, cutoff: 3600 });
        this._tone(root + 12, now + 0.035, 0.16, { channel: 'sfx', wave: 'triangle', gain: 0.06 });
      } else if (kind === 'dash') {
        this._noise(now, 0.16, 0.09, 3400, 'sfx', 'bandpass');
        this._tone(root + 12, now, 0.13, { channel: 'sfx', wave: 'triangle', gain: 0.045, slide: root - 5 });
      } else if (kind === 'hit') {
        this._noise(now, 0.14, 0.12, 1400, 'sfx', 'lowpass');
        this._tone(root - 12, now, 0.16, { channel: 'sfx', wave: 'sawtooth', gain: 0.085, slide: root - 24, cutoff: 850 });
      } else if (kind === 'heal' || kind === 'loot') {
        const notes = kind === 'heal' ? [0, 3, 7, 12] : [7, 12, 15];
        notes.forEach((note, i) => this._tone(root + note + 12, now + i * 0.07, 0.25, { channel: 'sfx', wave: 'sine', gain: 0.075 }));
      } else if (kind === 'win') {
        [0, 7, 12, 15, 19, 24].forEach((note, i) => this._tone(root + note, now + i * 0.105, 0.42, { channel: 'sfx', wave: 'triangle', gain: 0.08 }));
        [0, 3, 7].forEach(note => this._tone(root + note, now + 0.52, 0.85, { channel: 'sfx', wave: 'sine', gain: 0.045, attack: 0.025 }));
      } else {
        this._tone(root, now, 0.12, { channel: 'sfx', wave: 'triangle', gain: 0.075 });
        this._tone(root - 1, now + 0.13, 0.17, { channel: 'sfx', wave: 'triangle', gain: 0.065 });
      }
      return true;
    }

    dispose() {
      if (this._disposed) return;
      this._disposed = true;
      this._enabled = false;
      this._toggleVersion++;
      this._halt(true);
      if (global.document) global.document.removeEventListener('visibilitychange', this._visibility);
      const context = this._context;
      if (context && context.removeEventListener) context.removeEventListener('statechange', this._stateChange);
      this._nodes.forEach(node => { try { node.disconnect(); } catch (_) {} });
      this._nodes = [];
      this._noiseBuffer = null;
      if (context && context.state !== 'closed') {
        try { const closing = context.close(); if (closing && closing.catch) closing.catch(() => {}); } catch (_) {}
      }
      this._context = null;
    }

    _createContext() {
      const AudioContext = global.AudioContext || global.webkitAudioContext;
      if (!AudioContext) throw new Error('Web Audio is unavailable');
      const context = new AudioContext({ latencyHint: 'interactive' });
      this._context = context;
      try {
        this._music = context.createGain();
        this._effects = context.createGain();
        this._master = context.createGain();
        this._gate = context.createGain();
        this._compressor = context.createDynamicsCompressor();
        this._nodes = [this._music, this._effects, this._master, this._gate, this._compressor];
        this._music.gain.value = this._scene.focus ? 0.40 : 0.72;
        this._effects.gain.value = 0.85;
        this._master.gain.value = this._volume;
        this._gate.gain.value = 0;
        this._compressor.threshold.value = -14;
        this._compressor.knee.value = 18;
        this._compressor.ratio.value = 4;
        this._compressor.attack.value = 0.003;
        this._compressor.release.value = 0.18;
        this._music.connect(this._compressor);
        this._effects.connect(this._compressor);
        this._compressor.connect(this._master);
        this._master.connect(this._gate);
        this._gate.connect(context.destination);
        this._noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
        const samples = this._noiseBuffer.getChannelData(0);
        let noiseSeed = 0x45A3B1;
        for (let i = 0; i < samples.length; i++) {
          noiseSeed = (Math.imul(noiseSeed, 1664525) + 1013904223) >>> 0;
          samples[i] = (noiseSeed / 4294967296) * 2 - 1;
        }
        if (context.addEventListener) context.addEventListener('statechange', this._stateChange);
      } catch (error) {
        this._nodes.forEach(node => { try { node.disconnect(); } catch (_) {} });
        this._nodes = [];
        this._context = null;
        this._music = this._effects = this._master = this._gate = this._compressor = null;
        this._noiseBuffer = null;
        try { const closing = context.close(); if (closing && closing.catch) closing.catch(() => {}); } catch (_) {}
        throw error;
      }
    }

    _canPlay() {
      return this._enabled && this._volume > 0 && !this._disposed && this._context && this._context.state === 'running' &&
        !this._scene.paused && !(global.document && global.document.hidden);
    }

    _reconcile() {
      if (!this._canPlay()) { this._halt(); return; }
      if (this._playing) return;
      this._playing = true;
      this._silenced = false;
      this._nextTime = this._context.currentTime + 0.045;
      this._ramp(this._gate.gain, 1, 0.05);
      this._schedule();
      this._timer = global.setInterval(() => this._schedule(), 25);
    }

    _halt(immediate) {
      if (this._timer !== null) { global.clearInterval(this._timer); this._timer = null; }
      this._playing = false;
      if (this._silenced && !immediate) return;
      this._silenced = true;
      if (this._gate && this._context) this._ramp(this._gate.gain, 0, immediate ? 0 : 0.035);
      this._stopVoices(null, immediate);
    }

    _ramp(param, value, duration) {
      const now = this._context.currentTime;
      if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
      else { param.cancelScheduledValues(now); param.setValueAtTime(param.value, now); }
      if (duration) param.linearRampToValueAtTime(value, now + duration);
      else param.setValueAtTime(value, now);
    }

    _stopVoices(channel, immediate) {
      if (!this._context) return;
      const now = this._context.currentTime;
      for (const voice of Array.from(this._voices)) {
        if (channel && voice.channel !== channel) continue;
        try {
          this._ramp(voice.envelope.gain, 0, immediate ? 0 : 0.03);
          voice.source.stop(now + (immediate ? 0 : 0.035));
        } catch (_) { voice.cleanup(); }
        if (immediate) voice.cleanup();
      }
    }

    _track(source, envelope, nodes, channel) {
      const voice = { source, envelope, channel, cleanup: null };
      voice.cleanup = () => {
        source.onended = null;
        nodes.forEach(node => { try { node.disconnect(); } catch (_) {} });
        this._voices.delete(voice);
      };
      source.onended = voice.cleanup;
      this._voices.add(voice);
      return voice;
    }

    _tone(midi, when, duration, options) {
      if (!this._context || this._voices.size >= MAX_VOICES) return;
      const opts = options || {}, context = this._context;
      const oscillator = context.createOscillator(), envelope = context.createGain();
      const nodes = [oscillator, envelope];
      const channel = opts.channel || 'music';
      const attack = opts.attack || 0.007;
      const release = Math.min(duration * 0.55, opts.release || 0.10);
      oscillator.type = opts.wave || 'triangle';
      oscillator.frequency.setValueAtTime(frequency(midi), when);
      if (opts.slide !== undefined) oscillator.frequency.exponentialRampToValueAtTime(frequency(opts.slide), when + duration * 0.8);
      if (opts.detune) oscillator.detune.value = opts.detune;
      envelope.gain.setValueAtTime(0, when);
      envelope.gain.linearRampToValueAtTime(opts.gain === undefined ? 0.04 : opts.gain, when + attack);
      envelope.gain.setValueAtTime(opts.gain === undefined ? 0.04 : opts.gain, when + Math.max(attack, duration - release));
      envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      let output = oscillator;
      if (opts.cutoff) {
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = opts.cutoff; filter.Q.value = 0.7;
        output.connect(filter); output = filter; nodes.push(filter);
      }
      output.connect(envelope);
      output = envelope;
      if (opts.pan && context.createStereoPanner) {
        const pan = context.createStereoPanner(); pan.pan.value = opts.pan;
        output.connect(pan); output = pan; nodes.push(pan);
      }
      output.connect(channel === 'sfx' ? this._effects : this._music);
      const voice = this._track(oscillator, envelope, nodes, channel);
      try { oscillator.start(when); oscillator.stop(when + duration + 0.015); }
      catch (_) { voice.cleanup(); }
    }

    _noise(when, duration, gain, cutoff, channel, type) {
      if (!this._context || this._voices.size >= MAX_VOICES) return;
      const context = this._context, source = context.createBufferSource();
      const envelope = context.createGain(), filter = context.createBiquadFilter();
      source.buffer = this._noiseBuffer;
      filter.type = type || 'highpass'; filter.frequency.value = cutoff; filter.Q.value = 0.7;
      envelope.gain.setValueAtTime(0, when);
      envelope.gain.linearRampToValueAtTime(gain, when + 0.003);
      envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      source.connect(filter); filter.connect(envelope);
      envelope.connect(channel === 'sfx' ? this._effects : this._music);
      const voice = this._track(source, envelope, [source, filter, envelope], channel || 'music');
      try { source.start(when); source.stop(when + duration + 0.01); }
      catch (_) { voice.cleanup(); }
    }

    _degree(theme, degree, octaves) {
      const octave = Math.floor(degree / 7);
      const index = ((degree % 7) + 7) % 7;
      return theme.tonic + theme.scale[index] + (octave + octaves) * 12;
    }

    _schedule() {
      if (!this._canPlay()) { this._halt(); return; }
      const now = this._context.currentTime;
      // Returning from a suspended tab never generates a catch-up burst.
      if (this._nextTime < now - 0.2) this._nextTime = now + 0.035;
      let scheduled = 0;
      while (this._nextTime < now + LOOKAHEAD && scheduled++ < 16) {
        const theme = THEMES[this._scene.region];
        const tempo = theme.tempo + (this._scene.boss ? 28 : this._scene.combat ? 16 : 0);
        const sixteenth = 60 / tempo / 4;
        this._playStep(theme, this._step, this._nextTime, sixteenth);
        this._step = (this._step + 1) % 512; // Four eight-bar movements.
        this._nextTime += sixteenth;
      }
    }

    _playStep(theme, step, when, unit) {
      const bar = Math.floor(step / 16), tick = step % 16, movement = Math.floor(bar / 8);
      const combat = this._scene.combat || this._scene.boss, boss = this._scene.boss;
      const phrase = bar < 16 ? bar : bar < 24 ? bar - 8 : bar - 24;
      const root = theme.harmony[bar % 16];
      const degree = (note, octave) => this._degree(theme, note, octave);

      if (tick === 0) {
        const voicing = [root, root + 2, root + 4];
        if (movement === 2 || boss) voicing.push(root + 8);
        voicing.forEach((note, i) => this._tone(degree(note, 1), when, unit * 15.7, {
          wave: 'triangle', gain: combat ? 0.016 : 0.023, attack: 0.08, release: unit * 3,
          cutoff: combat ? 1350 : 1000, detune: i % 2 ? 3 : -3, pan: (i - 1) * 0.22
        }));
      }

      if (tick === 0 || tick === 8 || (combat && (tick === 6 || tick === 14)) || (boss && tick === 12)) {
        const note = root + (tick === 6 || tick === 14 ? 4 : tick === 12 ? 7 : 0);
        this._tone(degree(note, 0), when, unit * (combat ? 2.4 : 6.3), {
          wave: 'triangle', gain: combat ? 0.085 : 0.055, cutoff: 650, release: 0.09
        });
      }

      if (tick % 2 === 0) {
        let note = theme.melody[phrase][tick / 2];
        if (bar === 31 && tick >= 12) note = tick === 12 ? 0 : null;
        const breathing = !combat && movement === 1 && tick === 6;
        if (note !== null && !breathing) {
          const reprise = movement === 3 && tick < 8 ? 7 : 0;
          this._tone(degree(note + reprise, 2), when, unit * (tick === 12 && bar % 8 === 7 ? 3.7 : 1.65), {
            wave: theme.wave, gain: theme.wave === 'triangle' ? 0.063 : 0.034,
            cutoff: theme.cutoff, pan: -0.10, release: unit * 0.7
          });
        }
      }

      if ((movement === 2 || boss) && (tick === 4 || tick === 12)) {
        this._tone(degree(root + (tick === 4 ? 11 : 9), 2), when, unit * 2.8, {
          wave: 'sine', gain: 0.028, pan: 0.28, attack: 0.015, release: unit * 1.5
        });
      }

      if (combat && (boss || tick % 2 === 0)) {
        const arpeggio = bar % 2 ? [7, 4, 2, 4] : [0, 2, 4, 7];
        this._tone(degree(root + arpeggio[(boss ? tick : tick / 2) % 4], 2), when, unit * 0.72, {
          wave: 'square', gain: boss ? 0.014 : 0.012, cutoff: 2000, pan: 0.23, release: unit * 0.35
        });
      }

      if (tick === 0 || (combat && tick === 8) || (boss && (tick === 6 || tick === 10))) {
        this._tone(43, when, 0.19, { wave: 'sine', gain: combat ? 0.15 : 0.045, slide: 27, release: 0.15 });
      }
      if (combat && (tick === 4 || tick === 12)) {
        this._noise(when, 0.15, boss ? 0.07 : 0.05, 1400);
        this._tone(53, when, 0.085, { wave: 'triangle', gain: 0.042, slide: 46 });
      }
      if ((combat && tick % 2 === 0) || (boss && tick % 2 === 1) || (!combat && tick === 8)) {
        this._noise(when, tick % 4 === 2 ? 0.09 : 0.045, boss && tick % 2 ? 0.010 : combat ? 0.025 : 0.008, 6500);
      }
      if (combat && bar % 8 === 7 && tick >= 13) {
        this._tone(47 - (tick - 13) * 2, when, unit * 0.85, { wave: 'sine', gain: 0.085, slide: 37 - (tick - 13) * 2 });
        if (boss) this._noise(when, 0.06, 0.03, 1900);
      }
    }
  }

  DungeonAudio.THEMES = Object.freeze(THEMES.map(theme => Object.freeze({ name: theme.name, bars: 32, tempo: theme.tempo })));
  global.DungeonAudio = DungeonAudio;
})(window);
