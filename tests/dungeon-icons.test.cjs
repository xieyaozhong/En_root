'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const icons = require('../dungeon-icons.js');

const expected = ['attack', 'heal', 'shield', 'signature', 'battle', 'elite', 'boss', 'treasure', 'camp', 'shop', 'dash', 'focus', 'gold', 'combo', 'help', 'expand', 'pause', 'close', 'music', 'route', 'bag', 'relic', 'spell', 'companion', 'fire', 'ice', 'lightning', 'wind', 'hex', 'home', 'play', 'potion', 'bomb', 'hourglass', 'ink'];
assert.deepEqual(icons.names, expected);
assert.ok(Object.isFrozen(icons));
assert.ok(Object.isFrozen(icons.names));

for (const name of expected) {
  const svg = icons.icon(name);
  assert.ok(svg.startsWith('<svg '));
  assert.ok(svg.endsWith('</svg>'));
  assert.ok(svg.includes(`data-icon="${name}"`));
  assert.ok(svg.includes('viewBox="0 0 24 24"'));
  assert.ok(svg.includes('stroke="currentColor"'));
  assert.ok(svg.includes('aria-hidden="true"'));
  assert.ok(svg.includes('focusable="false"'));
  assert.ok(!/href|<script|<foreignObject|<image|\bon\w+=/.test(svg));
}

// UI interpolation remains safe even when an item type or CSS token is hostile.
for (const value of ['toString', '__proto__', '<script>alert(1)</script>', null, undefined, {}]) {
  assert.equal(icons.icon(value), icons.icon('spell'));
}
assert.ok(icons.icon('fire', 'ability-icon accent-fire').includes('class="dungeon-icon ability-icon accent-fire"'));
assert.ok(!icons.icon('fire', '"><script>alert(1)</script> onload=alert(1)').includes('<script>'));
assert.ok(!icons.icon('fire', 'foo" onload="bad').includes('onload='));
assert.ok(!icons.icon('fire', { toString() { throw new Error('must not coerce objects'); } }).includes('[object'));

for (const file of ['crest.svg', 'favicon.svg']) {
  const svg = fs.readFileSync(path.join(__dirname, '../assets/dungeon', file), 'utf8');
  assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(!/href|<script|<foreignObject|<image/.test(svg), `${file} must render offline without external assets`);
}
console.log('DungeonIcons: 35 original glyphs, safe interpolation, and standalone crest assets passed.');
