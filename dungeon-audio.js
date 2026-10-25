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
    },
    {
      name: '星誓花庭・未寄出的願望', tonic: 41, tempo: 90,
      scale: [0, 2, 4, 6, 7, 9, 11], wave: 'sine', cutoff: 3600,
      harmony: [0, 5, 3, 4, 0, 2, 5, 4, 3, 0, 5, 2, 3, 4, 1, 0],
      melody: [
        [7, null, 11, 9, 8, null, 7, 4], [9, null, 12, 11, 9, 7, null, 5],
        [10, 8, null, 5, 7, null, 8, 10], [11, null, 9, 8, 6, 4, null, null],
        [7, 9, 11, null, 14, null, 11, 9], [8, null, 10, 12, 10, 8, 5, null],
        [9, 12, null, 14, 12, 9, 7, null], [8, 6, 4, null, 7, null, null, null],
        [12, null, 10, 8, 10, 12, null, 15], [14, 11, null, 9, 7, null, 9, 11],
        [12, 9, 7, null, 9, 12, 14, null], [10, null, 8, 5, 8, 10, null, 12],
        [12, 10, 8, null, 5, null, 8, 10], [11, null, 9, 6, 4, 6, 8, null],
        [8, 10, 12, null, 10, 8, 7, 4], [7, null, 11, 9, 7, null, 0, null]
      ]
    }
  ];
  // Region order follows DungeonEngine: forest, library, throne, star garden.
  const THEMES = [COMPOSITIONS[1], COMPOSITIONS[0], COMPOSITIONS[2], COMPOSITIONS[3]];
  // Lumina's four-note answer (0, 4, 7, 6) returns in her conversation,
  // relationship and duel scores. Each is an original, playable arrangement.
  const LUMINA_MELODY = [
    [0, null, 4, null, 7, 6, null, 4], [2, null, 5, null, 9, null, 7, null],
    [7, null, 9, 11, null, 9, 7, null], [6, null, 4, null, 2, null, null, null],
    [0, null, 4, null, 7, 6, null, 9], [10, null, 8, null, 5, null, 8, null],
    [9, null, 7, 5, null, 4, 2, null], [4, null, 7, null, 0, null, null, null],
    [7, null, 11, null, 14, 13, null, 11], [9, null, 12, null, 14, null, 12, null],
    [12, null, 10, 8, null, 5, 8, null], [11, null, 9, null, 6, null, null, null],
    [7, null, 4, null, 9, 7, null, 4], [5, null, 8, null, 10, null, 8, null],
    [9, null, 7, 6, null, 4, 2, null], [4, null, 7, null, 0, null, null, null]
  ];
  const STORY_SCORES = {
    lumina: { name: '露米娜・星燈旁的悄悄話', tonic: 48, tempo: 80, scale: [0, 2, 4, 5, 7, 9, 11],
      wave: 'sine', cutoff: 3200, gentle: true, harmony: [0, 1, 3, 4, 0, 5, 3, 4, 0, 1, 5, 4, 0, 3, 4, 0], melody: LUMINA_MELODY },
    romance: { name: '露米娜・只為你點亮的星', tonic: 48, tempo: 76, scale: [0, 2, 4, 5, 7, 9, 11],
      wave: 'sine', cutoff: 2800, gentle: true, harmony: [0, 5, 3, 4, 0, 5, 1, 4, 3, 0, 5, 4, 1, 3, 4, 0],
      melody: LUMINA_MELODY.map((phrase, index) => phrase.map((note, tick) => note === null ? null : note + (index >= 8 && tick < 4 ? 7 : 0))) },
    chronicle: { name: '星根紀事・仍被記得的名字', tonic: 43, tempo: 72, scale: [0, 2, 3, 5, 7, 9, 10],
      wave: 'triangle', cutoff: 1900, gentle: true, harmony: [0, 3, 5, 4, 0, 1, 3, 4, 5, 3, 1, 4, 0, 3, 4, 0],
      melody: LUMINA_MELODY.map(phrase => phrase.map((note, tick) => tick % 4 === 2 ? null : note)) }
  };
  // Each opponent has a separately written motif, harmony, percussion pattern,
  // and timbre. These are original scores, not sped-up exploration tracks.
  const BOSS_SCORES = {
    thorn: {
      name: '荊冠行刑曲', tonic: 38, tempo: 112, scale: [0, 1, 3, 5, 7, 8, 10], wave: 'sawtooth', cutoff: 1650,
      harmony: [0, 0, 1, -2, 0, 3, 1, 0], kick: [0, 3, 8, 10], snare: [4, 12], pulse: [0, 0, 4, 1],
      motifs: [[0, 0, 7, null, 1, 0, 4, null], [7, 6, 4, 1, 0, null, 0, 1], [3, 7, 8, 7, 4, 3, 1, null], [1, 0, null, 4, 1, 0, null, null]]
    },
    witch: {
      name: '鏡月的雙重倒影', tonic: 42, tempo: 106, scale: [0, 2, 3, 6, 7, 9, 11], wave: 'sine', cutoff: 4200,
      harmony: [0, 3, -1, 2, 0, 4, 2, -1], kick: [0, 7, 10], snare: [6, 14], pulse: [7, 2, 6, 3],
      motifs: [[12, null, 8, 5, null, 8, 12, 11], [6, 9, null, 12, 9, null, 6, 5], [10, 7, 10, null, 13, 10, 7, null], [11, null, 8, 6, 5, 8, null, 0]]
    },
    king: {
      name: '無名王的末日加冕', tonic: 33, tempo: 124, scale: [0, 2, 3, 5, 7, 8, 11], wave: 'square', cutoff: 2100,
      harmony: [0, -2, 3, 4, 0, 3, -2, 4], kick: [0, 4, 8, 11, 14], snare: [4, 12], pulse: [0, 7, 4, 7],
      motifs: [[7, 7, null, 11, 10, 7, 6, 4], [5, null, 9, 8, 7, 5, 4, null], [10, 12, 14, null, 12, 10, 7, 5], [8, 6, 4, 6, 7, null, 0, null]]
    },
    merchant: {
      name: '契金與骰子的華爾滋', tonic: 45, tempo: 130, scale: [0, 2, 3, 5, 7, 8, 11], wave: 'square', cutoff: 3100,
      harmony: [0, 2, 4, 1, 3, -1, 4, 0], kick: [0, 6, 12], snare: [3, 9, 15], pulse: [0, 4, 7, 2],
      motifs: [[7, null, 11, 8, null, 6, 7, 9], [4, 8, 6, null, 10, 8, 6, 4], [9, 12, null, 11, 8, 5, null, 8], [6, 3, 6, 8, 7, null, 4, 0]]
    },
    healer: {
      name: '白燼祈禱的逆流', tonic: 41, tempo: 102, scale: [0, 2, 4, 5, 7, 8, 10], wave: 'triangle', cutoff: 2400,
      harmony: [0, 3, 1, -1, 0, 5, 3, -1], kick: [0, 8, 13], snare: [6, 14], pulse: [0, 2, 5, 4],
      motifs: [[0, 4, null, 7, 9, null, 7, 5], [8, null, 5, 3, 1, 3, 5, null], [7, 10, 12, null, 10, 7, 8, 5], [4, null, 2, 1, 4, 2, 0, null]]
    },
    smith: {
      name: '千錘的熔爐節拍', tonic: 36, tempo: 118, scale: [0, 2, 3, 5, 6, 8, 10], wave: 'sawtooth', cutoff: 1500,
      harmony: [0, 0, 4, 1, -2, 0, 4, 0], kick: [0, 2, 8, 10, 14], snare: [4, 7, 12], pulse: [0, 0, 1, 4],
      motifs: [[0, 7, 0, 7, null, 8, 4, null], [1, 1, 8, null, 4, 1, 0, 4], [4, 11, 8, 4, 11, 8, 4, null], [7, 4, 1, 0, 1, 4, 0, null]]
    },
    cartographer: {
      name: '永無終點的星圖', tonic: 46, tempo: 126, scale: [0, 2, 4, 6, 7, 9, 10], wave: 'triangle', cutoff: 3600,
      harmony: [0, 2, 4, 6, 1, 3, 5, 0], kick: [0, 5, 10, 14], snare: [7, 15], pulse: [0, 3, 6, 2],
      motifs: [[0, 3, 6, 9, 12, null, 9, 6], [2, 5, 8, 11, null, 8, 5, 2], [7, 11, 8, 12, 9, null, 6, 10], [5, 8, 4, 7, 3, 6, 2, 0]]
    },
    ferryman: {
      name: '冥河最後一趟船', tonic: 34, tempo: 98, scale: [0, 1, 3, 5, 7, 8, 10], wave: 'sine', cutoff: 1700,
      harmony: [0, -2, 0, 1, 3, -2, 1, 0], kick: [0, 8], snare: [5, 13], pulse: [0, 4, 1, 4],
      motifs: [[7, null, null, 5, 4, null, 1, 0], [5, null, 7, null, 8, 7, 5, null], [3, 4, null, 7, 4, null, 1, 3], [1, null, 0, null, 4, 1, 0, null]]
    },
    lantern: {
      name: '引路燈的失控火花', tonic: 43, tempo: 134, scale: [0, 2, 4, 5, 7, 9, 11], wave: 'triangle', cutoff: 3800,
      harmony: [0, 4, 3, 1, 5, 3, 4, 0], kick: [0, 6, 8, 14], snare: [4, 12, 15], pulse: [0, 4, 2, 7],
      motifs: [[7, 9, 7, 11, null, 9, 12, 11], [8, 5, null, 10, 8, 5, 7, null], [12, 9, 7, 9, 12, 14, 12, 9], [11, 8, 6, null, 7, 9, 7, 0]]
    },
    echo: {
      name: '回聲的逆寫咒語', tonic: 39, tempo: 122, scale: [0, 2, 3, 5, 7, 9, 10], wave: 'sine', cutoff: 4600,
      harmony: [0, 2, -1, 3, 3, -1, 2, 0], kick: [0, 3, 7, 11], snare: [5, 13], pulse: [0, 7, 2, 5],
      motifs: [[0, 4, 7, 9, 9, 7, 4, 0], [8, null, 5, 3, 3, 5, null, 8], [7, 10, null, 12, 12, null, 10, 7], [9, 7, 4, 1, 1, 4, 7, 0]]
    },
    astral: {
      name: '忘誓星龍・墜星的終章', tonic: 35, tempo: 120, scale: [0, 2, 3, 6, 7, 9, 11], wave: 'sawtooth', cutoff: 2300,
      harmony: [0, 3, 1, 4, 5, -1, 3, 0], kick: [0, 3, 8, 11, 14], snare: [4, 12], pulse: [0, 4, 6, 2],
      motifs: [[7, 11, 14, null, 13, 11, 7, 6], [8, null, 12, 10, 8, 5, 3, null], [9, 12, null, 15, 12, 9, 6, 4], [11, 8, 6, null, 4, 7, 0, null]]
    },
    lumina: {
      name: '露米娜・雙星試煉', tonic: 41, tempo: 116, scale: [0, 2, 4, 6, 7, 9, 11], wave: 'triangle', cutoff: 3300,
      harmony: [0, 5, 3, 4, 1, 3, 4, 0], kick: [0, 6, 8, 14], snare: [4, 12], pulse: [0, 4, 7, 6],
      motifs: [[0, 4, 7, 6, null, 9, 7, 4], [9, null, 12, 11, 9, 7, 5, null], [10, 8, 5, 8, 12, null, 10, 8], [11, 9, 6, 4, 7, null, 0, null]]
    },
    constellation: {
      name: '失約星影・未完成的約定', tonic: 38, tempo: 108, scale: [0, 2, 3, 5, 7, 8, 11], wave: 'sine', cutoff: 3600,
      harmony: [0, 5, 3, 4, -2, 3, 1, 0], kick: [0, 5, 8, 14], snare: [6, 12], pulse: [0, 4, 7, 1],
      motifs: [[7, 4, 0, null, 6, 7, 4, null], [9, 6, 3, null, 5, 9, 6, 4], [10, null, 8, 5, 3, 5, 8, null], [11, 8, 4, 1, 0, null, 4, 7]]
    },
    sentinel: {
      name: '碎誓守衛的最後進軍', tonic: 35, tempo: 114, scale: [0, 2, 3, 5, 7, 8, 10], wave: 'square', cutoff: 1800,
      harmony: [0, 0, 3, -2, 4, 3, -2, 0], kick: [0, 4, 8, 12], snare: [2, 6, 10, 14], pulse: [0, 4, 0, 7],
      motifs: [[7, null, 7, 4, 5, 7, null, 11], [8, 5, 3, null, 5, 8, 7, 5], [11, null, 10, 8, 7, 10, 8, null], [7, 5, 4, 2, 4, 7, 0, null]]
    },
    spore: {
      name: '孢冠菌后・繁生的低語', tonic: 40, tempo: 110, scale: [0, 2, 3, 5, 7, 9, 10], wave: 'triangle', cutoff: 2500,
      harmony: [0, 1, 3, 1, -2, 5, 3, 0], kick: [0, 3, 6, 8, 11, 14], snare: [6, 14], pulse: [0, 2, 5, 1],
      motifs: [[2, 5, null, 2, 6, null, 5, 3], [4, 7, 6, null, 3, 6, null, 2], [5, 8, null, 10, 8, 6, 3, 5], [6, 3, 1, null, 2, 5, 1, 0]]
    },
    prism: {
      name: '千面鏡獸・碎光迴旋', tonic: 47, tempo: 138, scale: [0, 1, 4, 6, 7, 9, 11], wave: 'sine', cutoff: 4800,
      harmony: [0, 4, 2, -1, 5, 1, 4, -2], kick: [0, 5, 7, 10, 13], snare: [3, 11, 15], pulse: [6, 1, 7, 3],
      motifs: [[12, 3, 10, 5, null, 13, 6, 11], [4, 11, 2, 9, 5, null, 12, 7], [14, 5, 12, null, 8, 15, 4, 10], [6, 13, 3, 8, 1, 7, null, 0]]
    },
    hollow: {
      name: '空鐘司祭・第十三聲晚禱', tonic: 31, tempo: 94, scale: [0, 1, 3, 5, 6, 8, 10], wave: 'sine', cutoff: 1800,
      harmony: [0, -1, -3, 1, 0, -2, 4, -1], kick: [0, 10], snare: [7, 15], pulse: [0, 1, 4, 1],
      motifs: [[14, null, 6, null, null, 1, 4, null], [11, null, null, 3, 5, null, 1, null], [13, null, 8, null, 4, null, 6, 1], [10, null, 5, null, 1, null, 0, null]]
    },
    cometqueen: {
      name: '彗尾女皇・燃盡的星冕', tonic: 44, tempo: 128, scale: [0, 2, 4, 6, 7, 8, 11], wave: 'sawtooth', cutoff: 3400,
      harmony: [0, 2, 5, 3, 1, 6, 4, 0], kick: [0, 2, 6, 8, 12, 14], snare: [4, 10, 12], pulse: [0, 5, 2, 6],
      motifs: [[2, 6, 9, 13, 12, null, 10, 7], [3, 5, 8, 12, null, 14, 11, 8], [6, 10, 13, 16, 13, 11, null, 9], [12, 10, 7, 5, 8, 6, 2, 0]]
    }
  };
  const REGION_BOSSES = ['thorn', 'witch', 'king', 'astral'];
  const bossKey = value => {
    const id = typeof value === 'string' ? value.replace(/^npc-/, '') : '';
    return Object.prototype.hasOwnProperty.call(BOSS_SCORES, id) ? id : '';
  };
  const scoreFor = scene => scene.boss ? BOSS_SCORES[scene.bossId] || BOSS_SCORES[REGION_BOSSES[scene.region]] :
    !scene.combat && scene.npcId === 'lumina' ? STORY_SCORES[scene.romance ? 'romance' : 'lumina'] :
    scene.story ? STORY_SCORES.chronicle : THEMES[scene.region];
  const tempoFor = (scene, score) => score.tempo + (scene.boss ? scene.phase === 2 ? 16 : 0 : scene.combat ? 16 : 0);
  const MAX_VOICES = 96;
  const LOOKAHEAD = 0.12;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const frequency = midi => 440 * Math.pow(2, (midi - 69) / 12);

  class DungeonAudio {
    constructor() {
      this._enabled = false;
      this._disposed = false;
      this._volume = 0.55;
      this._scene = { region: 0, combat: false, boss: false, bossId: '', phase: 1, paused: false, focus: false,
        npcId: '', story: false, romance: false };
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
    get themeName() { return scoreFor(this._scene).name; }

    getTrackInfo() {
      const scene = this._scene, score = scoreFor(scene);
      const id = scene.boss ? (BOSS_SCORES[scene.bossId] ? scene.bossId : REGION_BOSSES[scene.region]) : null;
      const lumina = !scene.combat && scene.npcId === 'lumina';
      const track = id ? 'boss-' + id : lumina ? (scene.romance ? 'romance-lumina' : 'npc-lumina') : scene.story ? 'story-chronicle' : 'region-' + scene.region;
      return Object.freeze({ id: track, name: score.name,
        kind: scene.boss ? 'boss' : lumina ? scene.romance ? 'romance' : 'conversation' : scene.story ? 'story' : 'exploration', bossId: id, tempo: tempoFor(scene, score),
        phase: scene.boss ? scene.phase : 1, bars: 32 });
    }

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
      if (Number.isFinite(scene.region)) next.region = clamp(Math.floor(scene.region), 0, THEMES.length - 1);
      for (const key of ['combat', 'boss', 'paused', 'focus', 'story', 'romance']) {
        if (typeof scene[key] === 'boolean') next[key] = scene[key];
      }
      if (typeof scene.npcId === 'string' || scene.npcId === null) next.npcId = scene.npcId === 'lumina' ? 'lumina' : '';
      if (typeof scene.bossId === 'string' || scene.bossId === null) next.bossId = bossKey(scene.bossId);
      if (previous.bossId !== next.bossId || (!previous.boss && next.boss)) next.phase = 1;
      if (Number.isFinite(scene.phase)) next.phase = scene.phase >= 2 ? 2 : 1;
      this._scene = next;
      // Focus means the player's limited chanting mode, not browser focus.
      // Keep the soundtrack playing while moving; soften it during typing.
      if (previous.focus !== next.focus && this._music) this._ramp(this._music.gain, next.focus ? 0.40 : 0.72, 0.12);
      if (scoreFor(previous) !== scoreFor(next) || (next.boss && previous.phase !== next.phase)) {
        this._step = 0;
        this._nextTime = this._context ? this._context.currentTime + 0.055 : 0;
        // Overlap the old release with the new first chord for a gentle scene
        // transition. One-shot effects retain their original release times.
        this._stopVoices('music', false, 0.16);
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
      const aliases = { attack: 'cast', damage: 'hit', shield: 'heal', signature: 'cast',
        boss_intro: 'bossIntro', boss_phase: 'bossPhase', boss_death: 'bossDeath', player_death: 'playerDeath' };
      kind = aliases[kind] || kind;
      if (!['cast', 'dash', 'hit', 'heal', 'win', 'loot', 'error', 'bossIntro', 'bossPhase', 'bossDeath', 'playerDeath', 'echo'].includes(kind)) return false;
      const now = this._context.currentTime + 0.008;
      const dramatic = ['win', 'bossIntro', 'bossPhase', 'bossDeath', 'playerDeath'].includes(kind);
      if (this._lastSfx[kind] !== undefined && now - this._lastSfx[kind] < (dramatic ? 0.8 : 0.07)) return false;
      this._lastSfx[kind] = now;
      const root = scoreFor(this._scene).tonic + 24;
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
      } else if (kind === 'bossIntro' || kind === 'bossPhase') {
        const enraged = kind === 'bossPhase';
        this._noise(now, 0.55, 0.08, enraged ? 2100 : 1100, 'sfx', 'lowpass');
        [0, 1, 7].forEach((note, i) => this._tone(root - 24 + note, now + i * 0.045, 0.75, {
          channel: 'sfx', wave: 'sawtooth', gain: 0.035, cutoff: 850, slide: root - 25 + note }));
        (enraged ? [0, 7, 12, 13] : [7, 3, 0]).forEach((note, i) => this._tone(root + note, now + 0.12 + i * 0.1, 0.4, {
          channel: 'sfx', wave: 'triangle', gain: 0.05, cutoff: 1800 }));
      } else if (kind === 'bossDeath' || kind === 'playerDeath') {
        const fallen = kind === 'playerDeath';
        this._noise(now, fallen ? 0.6 : 0.9, 0.085, 1000, 'sfx', 'lowpass');
        this._tone(root - 12, now, 0.8, { channel: 'sfx', wave: 'sawtooth', gain: 0.055, cutoff: 850, slide: root - 36 });
        (fallen ? [12, 7, 3, 0, -1] : [19, 15, 12, 7, 0]).forEach((note, i) => this._tone(root + note, now + i * 0.11, 0.45, {
          channel: 'sfx', wave: fallen ? 'triangle' : 'sine', gain: 0.05, pan: i % 2 ? 0.15 : -0.15 }));
      } else if (kind === 'echo') {
        [0, 0.1, 0.2].forEach((delay, i) => this._tone(root + 12 + i * 7, now + delay, 0.25, {
          channel: 'sfx', wave: 'sine', gain: 0.065 / (i + 1), pan: i % 2 ? 0.3 : -0.3, slide: root + 19 + i * 7 }));
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
        this._compressor.threshold.value = -18;
        this._compressor.knee.value = 18;
        this._compressor.ratio.value = 3;
        this._compressor.attack.value = 0.008;
        this._compressor.release.value = 0.24;
        const musicFilter = context.createBiquadFilter();
        musicFilter.type = 'highpass'; musicFilter.frequency.value = 48; musicFilter.Q.value = 0.5;
        this._nodes.push(musicFilter);
        this._music.connect(musicFilter); musicFilter.connect(this._compressor);
        // One shared, filtered room echo adds depth without creating a reverb
        // processor per note. No feedback loop or unbounded tail is needed.
        if (context.createDelay) {
          const room = context.createDelay(0.5), roomFilter = context.createBiquadFilter(), roomGain = context.createGain();
          room.delayTime.value = 0.135;
          roomFilter.type = 'lowpass'; roomFilter.frequency.value = 2200; roomFilter.Q.value = 0.4;
          roomGain.gain.value = 0.12;
          this._nodes.push(room, roomFilter, roomGain);
          musicFilter.connect(room); room.connect(roomFilter); roomFilter.connect(roomGain); roomGain.connect(this._compressor);
        }
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

    _stopVoices(channel, immediate, release) {
      if (!this._context) return;
      const now = this._context.currentTime, fade = immediate ? 0 : release || 0.035;
      for (const voice of Array.from(this._voices)) {
        if (channel && voice.channel !== channel) continue;
        try {
          this._ramp(voice.envelope.gain, 0, immediate ? 0 : Math.max(0, fade - 0.005));
          voice.source.stop(now + fade);
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
      oscillator.type = opts.wave || 'triangle';
      const attack = Math.min(duration * 0.3, opts.attack || (channel === 'music' ? /square|sawtooth/.test(oscillator.type) ? 0.018 : 0.012 : 0.007));
      const release = Math.min(duration * 0.55, opts.release || (channel === 'music' ? 0.16 : 0.10));
      const peak = opts.gain === undefined ? 0.04 : opts.gain;
      const sustain = peak * (opts.sustain === undefined ? channel === 'music' ? 0.76 : 1 : opts.sustain);
      const decayAt = when + Math.min(duration - release, attack + Math.min(0.055, duration * 0.15));
      oscillator.frequency.setValueAtTime(frequency(midi), when);
      if (opts.slide !== undefined) oscillator.frequency.exponentialRampToValueAtTime(frequency(opts.slide), when + duration * 0.8);
      if (opts.detune) oscillator.detune.value = opts.detune;
      envelope.gain.setValueAtTime(0, when);
      envelope.gain.linearRampToValueAtTime(peak, when + attack);
      envelope.gain.linearRampToValueAtTime(sustain, decayAt);
      envelope.gain.setValueAtTime(sustain, when + Math.max(attack, duration - release));
      envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      let output = oscillator;
      if (opts.cutoff) {
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = opts.cutoff; filter.Q.value = 0.5;
        if (channel === 'music') {
          filter.frequency.setValueAtTime(opts.cutoff, when);
          filter.frequency.exponentialRampToValueAtTime(Math.max(240, opts.cutoff * 0.66), when + duration * 0.8);
        }
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
      envelope.gain.linearRampToValueAtTime(gain, when + (channel === 'sfx' ? 0.003 : 0.005));
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
        const theme = scoreFor(this._scene);
        const tempo = tempoFor(this._scene, theme);
        const sixteenth = 60 / tempo / 4;
        if (this._scene.boss) this._playBossStep(theme, this._step, this._nextTime, sixteenth);
        else this._playStep(theme, this._step, this._nextTime, sixteenth);
        this._step = (this._step + 1) % 512; // Four eight-bar movements.
        this._nextTime += sixteenth;
      }
    }

    _playBossStep(score, step, when, unit) {
      const bar = Math.floor(step / 16), tick = step % 16, movement = Math.floor(bar / 8);
      const root = score.harmony[bar % score.harmony.length], enraged = this._scene.phase === 2;
      const degree = (note, octave) => this._degree(score, note, octave);
      // A low sustained chord and independently patterned bass make the room
      // feel heavier without increasing the overall output level.
      if (tick === 0) {
        [root, root + 2, root + 4].forEach((note, i) => this._tone(degree(note, 1), when, unit * 15.5, {
          wave: 'triangle', gain: 0.014, attack: 0.055, cutoff: 1000,
          detune: i === 1 ? 4 : -2, pan: (i - 1) * 0.2, release: unit * 3
        }));
      }
      if (tick % 4 === 0 || (enraged && tick % 4 === 2)) {
        const note = root + score.pulse[Math.floor(tick / 4)];
        this._tone(degree(note, 0), when, unit * (enraged ? 1.5 : 2.8), {
          wave: 'triangle', gain: 0.075, cutoff: 700, release: unit * 0.7
        });
      }
      if (tick % 2 === 0) {
        const motif = score.motifs[bar % score.motifs.length];
        const note = motif[tick / 2];
        if (note !== null) {
          const reprise = movement === 3 && tick < 8 ? 7 : 0;
          this._tone(degree(note + reprise, 2), when, unit * (tick === 14 ? 1.8 : 1.55), {
            wave: score.wave, gain: score.wave === 'sine' || score.wave === 'triangle' ? 0.065 : 0.034,
            cutoff: score.cutoff, pan: -0.16, release: unit * 0.65
          });
          // The second movement answers the melody; phase two keeps that
          // countervoice active through the entire loop.
          if (movement === 2 || enraged) this._tone(degree(note - 7, 2), when + unit * 0.65, unit * 1.1, {
            wave: 'sine', gain: 0.023, cutoff: 2800, pan: 0.26, release: unit * 0.6
          });
        }
      }
      if (tick % 2 === 1 || enraged) {
        this._tone(degree(root + score.pulse[tick % 4], 2), when, unit * 0.62, {
          wave: 'square', gain: enraged ? 0.013 : 0.01, cutoff: score.cutoff * 0.65,
          pan: 0.2, release: unit * 0.3
        });
      }
      if (score.kick.includes(tick) || (enraged && tick === 15)) {
        this._tone(41, when, 0.18, { wave: 'sine', gain: 0.13, slide: 25, release: 0.14 });
      }
      if (score.snare.includes(tick)) {
        this._noise(when, 0.13, 0.045, 1800, 'music', 'bandpass');
        this._tone(50, when, 0.08, { wave: 'triangle', gain: 0.03, slide: 43 });
      }
      if (tick % 2 === 0 || enraged) this._noise(when, tick % 4 === 2 ? 0.065 : 0.035,
        tick % 2 ? 0.006 : tick % 4 === 0 ? 0.014 : 0.01, 5600);
      if (bar % 8 === 7 && tick >= 13) {
        this._tone(46 - (tick - 13) * 2, when, unit * 0.75, {
          wave: 'sine', gain: 0.065, slide: 34 - (tick - 13) * 2
        });
      }
    }

    _playStep(theme, step, when, unit) {
      const bar = Math.floor(step / 16), tick = step % 16, movement = Math.floor(bar / 8);
      const combat = this._scene.combat || this._scene.boss, gentle = !!theme.gentle && !combat;
      const phrase = bar < 16 ? bar : bar < 24 ? bar - 8 : bar - 24;
      const root = theme.harmony[bar % theme.harmony.length];
      const degree = (note, octave) => this._degree(theme, note, octave);

      if (tick === 0) {
        const voicing = [root, root + 2, root + 4];
        if (movement === 2 || gentle) voicing.push(root + 6);
        voicing.forEach((note, i) => this._tone(degree(note, 1), when, unit * 15.7, {
          wave: gentle ? 'sine' : 'triangle', gain: combat ? 0.016 : gentle ? 0.018 : 0.023, attack: gentle ? 0.16 : 0.08, release: unit * 3,
          cutoff: combat ? 1350 : 1000, detune: i % 2 ? 3 : -3, pan: (i - 1) * 0.22
        }));
      }

      if (tick === 0 || tick === 8 || (combat && (tick === 6 || tick === 14))) {
        const note = root + (tick === 6 || tick === 14 ? 4 : 0);
        this._tone(degree(note, 0), when, unit * (combat ? 2.4 : 6.3), {
          wave: 'triangle', gain: combat ? 0.075 : gentle ? 0.035 : 0.05, cutoff: 650, release: 0.14
        });
      }

      if (tick % 2 === 0) {
        let note = theme.melody[phrase][tick / 2];
        if (bar === 31 && tick >= 12) note = tick === 12 ? 0 : null;
        const breathing = !combat && movement === 1 && tick === 6;
        if (note !== null && !breathing) {
          const reprise = movement === 3 && tick < 8 ? 7 : 0;
          this._tone(degree(note + reprise, 2), when, unit * (tick === 12 && bar % 8 === 7 ? 3.7 : gentle ? 2.8 : 1.85), {
            wave: theme.wave, gain: gentle ? 0.052 : theme.wave === 'triangle' || theme.wave === 'sine' ? 0.062 : 0.034,
            cutoff: theme.cutoff, pan: -0.10, attack: gentle ? 0.025 : 0.014, release: unit * (gentle ? 1.3 : 0.85)
          });
          if (theme.wave === 'sine' && (tick === 0 || tick === 8)) this._tone(degree(note + reprise, 3), when + 0.012, unit * 2.5, {
            wave: 'sine', gain: 0.009, pan: 0.15, attack: 0.008, release: unit * 1.3
          });
        }
      }

      if ((movement === 2 || gentle) && (tick === 4 || tick === 12)) {
        this._tone(degree(root + (tick === 4 ? 11 : 9), 2), when, unit * 2.8, {
          wave: 'sine', gain: gentle ? 0.017 : 0.028, pan: 0.28, attack: 0.025, release: unit * 1.5
        });
      }

      if (combat && tick % 2 === 0) {
        const arpeggio = bar % 2 ? [7, 4, 2, 4] : [0, 2, 4, 7];
        this._tone(degree(root + arpeggio[(tick / 2) % 4], 2), when, unit * 0.72, {
          wave: 'triangle', gain: 0.016, cutoff: 2000, pan: 0.23, release: unit * 0.35
        });
      }

      if (!gentle && (tick === 0 || (combat && tick === 8))) {
        this._tone(43, when, 0.19, { wave: 'sine', gain: combat ? 0.13 : 0.04, slide: 27, release: 0.15 });
      }
      if (combat && (tick === 4 || tick === 12)) {
        this._noise(when, 0.15, 0.04, 1700, 'music', 'bandpass');
        this._tone(53, when, 0.085, { wave: 'triangle', gain: 0.042, slide: 46 });
      }
      if ((combat && tick % 2 === 0) || (!combat && tick === 8)) {
        this._noise(when, tick % 4 === 2 ? 0.07 : 0.045, combat ? tick % 4 === 0 ? 0.018 : 0.012 : gentle ? 0.003 : 0.006, 5600);
      }
      if (combat && bar % 8 === 7 && tick >= 13) {
        this._tone(47 - (tick - 13) * 2, when, unit * 0.85, { wave: 'sine', gain: 0.085, slide: 37 - (tick - 13) * 2 });
      }
    }
  }

  DungeonAudio.THEMES = Object.freeze(THEMES.map(theme => Object.freeze({ name: theme.name, bars: 32, tempo: theme.tempo })));
  DungeonAudio.BOSS_THEMES = Object.freeze(Object.keys(BOSS_SCORES).map(id => Object.freeze({
    id: 'boss-' + id, bossId: id, name: BOSS_SCORES[id].name, tempo: BOSS_SCORES[id].tempo, bars: 32
  })));
  DungeonAudio.STORY_THEMES = Object.freeze([
    Object.freeze({ id: 'npc-lumina', name: STORY_SCORES.lumina.name, tempo: STORY_SCORES.lumina.tempo, bars: 32 }),
    Object.freeze({ id: 'romance-lumina', name: STORY_SCORES.romance.name, tempo: STORY_SCORES.romance.tempo, bars: 32 }),
    Object.freeze({ id: 'story-chronicle', name: STORY_SCORES.chronicle.name, tempo: STORY_SCORES.chronicle.tempo, bars: 32 })
  ]);
  global.DungeonAudio = DungeonAudio;
})(window);
