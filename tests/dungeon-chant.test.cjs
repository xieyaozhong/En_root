'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Chant = require('../dungeon-chant.js');

const empty = Chant.analyze('spark', '');
assert.deepEqual(empty.letters.map(letter => letter.state), ['current', 'pending', 'pending', 'pending', 'pending']);
assert.equal(empty.matched, 0);
assert.equal(empty.progress, 0);
assert.equal(empty.next, 's');
assert.equal(empty.index, 0);
assert.equal(empty.complete, false);
assert.equal(empty.wrong, false);

const prefix = Chant.analyze('Spark', 'SP');
assert.deepEqual(prefix.letters.map(letter => letter.state), ['correct', 'correct', 'current', 'pending', 'pending']);
assert.equal(prefix.matched, 2);
assert.equal(prefix.progress, 2 / 5);
assert.equal(prefix.next, 'a');
assert.equal(prefix.index, 2);
assert.equal(prefix.complete, false);
assert.equal(prefix.wrong, false);

const typo = Chant.analyze('spark', 'sprrk');
assert.deepEqual(typo.letters.map(letter => letter.state), ['correct', 'correct', 'wrong', 'correct', 'correct']);
assert.equal(typo.matched, 2, 'later matching letters do not repair a broken prefix');
assert.equal(typo.progress, 2 / 5);
assert.equal(typo.next, 'a');
assert.equal(typo.wrong, true);
assert.equal(typo.complete, false);
assert.deepEqual(Chant.analyze('spark', 'sx').letters.map(letter => letter.state), ['correct', 'wrong', 'pending', 'pending', 'pending']);

const exact = Chant.analyze('spark', 'SPARK');
assert.equal(exact.complete, true);
assert.equal(exact.progress, 1);
assert.equal(exact.next, null);
assert.equal(exact.index, 5);
assert.equal(exact.extra, '');
assert.ok(exact.letters.every(letter => letter.state === 'correct'));
const extra = Chant.analyze('spark', 'spark!');
assert.equal(extra.extra, '!');
assert.equal(extra.wrong, true);
assert.equal(extra.complete, false);
assert.equal(extra.next, null, 'extra letters must be deleted rather than prompting another character');
assert.equal(extra.progress, 1, 'progress tracks the matching target prefix while wrong flags excess input');

assert.equal(Chant.analyze('spark', ' spark').wrong, true);
assert.equal(Chant.analyze('spark', 'spark ').complete, false, 'typed whitespace is never silently trimmed');
assert.equal(Chant.analyze('spark', 'spark ').extra, ' ');
assert.equal(Chant.analyze('will-o-wisp', 'WILL-O-WISP').complete, true);
assert.equal(Chant.analyze('ice storm', 'ice storm').complete, true);
assert.equal(Chant.analyze('ice storm', 'ice').next, ' ');
assert.equal(Chant.analyze('ice storm', 'icestorm').wrong, true);
assert.equal(Chant.analyze('⚡fire', '⚡f').matched, 2);
assert.equal(Chant.analyze('🌟fire', '🌟').matched, 1, 'letters use whole Unicode characters');

assert.equal(Chant.feedback('', '', 'spark').kind, 'idle');
assert.equal(Chant.feedback('', 's', 'spark').kind, 'correct');
assert.equal(Chant.feedback('s', 'sp', 'spark').kind, 'correct');
assert.equal(Chant.feedback('sp', 'sx', 'spark').kind, 'wrong');
assert.equal(Chant.feedback('sx', 's', 'spark').kind, 'corrected');
assert.equal(Chant.feedback('sp', 's', 'spark').kind, 'corrected');
assert.equal(Chant.feedback('s', '', 'spark').kind, 'corrected');
assert.equal(Chant.feedback('sprr', 'spr', 'spark').kind, 'wrong', 'deletion still reports an unrepaired typo');
assert.equal(Chant.feedback('sx', 'sp', 'spark').kind, 'corrected', 'replacing a typo can also repair the prefix');
assert.equal(Chant.feedback('spar', 'spark', 'spark').kind, 'ready');
assert.equal(Chant.feedback('', 'SPARK', 'spark').kind, 'ready', 'paste follows the same validation as typing');
assert.equal(Chant.feedback('', 'spa', 'spark').kind, 'correct');
assert.equal(Chant.feedback('', 'sparky', 'spark').kind, 'wrong');
assert.equal(Chant.feedback('spark', 'sparky', 'spark').kind, 'wrong');
assert.equal(Chant.feedback('sparky', 'spark', 'spark').kind, 'ready');
assert.equal(Chant.feedback('spark', 'spark', 'spark').kind, 'idle', 'a ready spell does not repeat success feedback');
assert.equal(Chant.feedback('SPARK', 'spark', 'spark').kind, 'idle', 'changing case is not new progress');
assert.equal(Chant.feedback('', ' ', 'spark').kind, 'wrong');

assert.equal(Chant.analyze('', '').complete, false, 'missing spells are never ready');
assert.equal(Chant.analyze(null, null).complete, false);
assert.equal(Chant.analyze('', 'x').wrong, true);
assert.equal(Chant.analyze('', 'x').extra, 'x');
assert.equal(Chant.analyze(undefined, '').progress, 0);
assert.equal(Chant.analyze(undefined, '').next, null);

const hostile = '<img src=x onerror=alert(1)>';
const data = Chant.analyze(hostile, hostile);
assert.equal(data.letters.map(letter => letter.char).join(''), hostile);
assert.equal(data.complete, true);
assert.ok(data.letters.every(letter => Object.keys(letter).join(',') === 'char,state'), 'character objects contain text data only');
assert.equal(Chant.analyze('spark', hostile).extra, hostile.slice(5));

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(require.resolve('../dungeon-chant.js'), 'utf8'), context);
assert.equal(typeof context.window.DungeonChant.analyze, 'function', 'UMD supports the static browser page');
assert.equal(context.window.DungeonChant.analyze('rune', 'rune').complete, true);
console.log('dungeon-chant: letter hints, prefix feedback, correction, paste and text safety passed');
