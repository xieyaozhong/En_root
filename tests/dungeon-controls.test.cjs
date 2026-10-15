'use strict';
const assert = require('node:assert/strict');
const DungeonJoystick = require('../dungeon-controls.js');

class Control {
  constructor() {
    this.listeners = new Map();
    this.properties = {};
    this.style = { setProperty: (name, value) => { this.properties[name] = value; } };
    const classes = new Set();
    this.classList = { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) };
    this.rect = { left: 20, top: 40, width: 200, height: 200 };
    this.captured = null;
    this.releases = [];
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  getBoundingClientRect() { return this.rect; }
  setPointerCapture(id) { this.captured = id; }
  releasePointerCapture(id) {
    this.releases.push(id);
    if (this.captured === id) { this.captured = null; this.fire('lostpointercapture', { pointerId: id }); }
  }
  fire(type, extra = {}) {
    const event = { pointerId: 1, button: 0, clientX: 120, clientY: 140, prevented: false,
      preventDefault() { this.prevented = true; }, ...extra };
    this.listeners.get(type)?.(event);
    return event;
  }
}
function setup(options = {}) {
  const control = new Control(), changes = [];
  const joystick = new DungeonJoystick(control, { onChange: value => changes.push(value), ...options });
  return { control, joystick, changes };
}
function close(actual, expected, message) { assert.ok(Math.abs(actual - expected) < 1e-10, `${message}: ${actual} != ${expected}`); }
function zero(joystick) { assert.deepEqual(joystick.getVector(), { x: 0, y: 0 }); }

// The fixed centre, rather than the initial finger position, defines movement.
const drag = setup();
assert.equal(drag.control.properties['--stick-x'], '0px');
assert.equal(drag.control.fire('pointerdown', { clientX: 152 }).prevented, true);
assert.equal(drag.control.captured, 1);
assert.equal(drag.control.classList.contains('active'), true);
close(drag.joystick.getVector().x, (0.5 - 0.14) / 0.86, 'partial radial movement');
assert.equal(drag.joystick.getVector().y, 0);
assert.equal(drag.control.properties['--stick-x'], '32px');
drag.control.fire('pointermove', { clientX: 520 });
assert.deepEqual(drag.joystick.getVector(), { x: 1, y: 0 });
assert.equal(drag.control.properties['--stick-x'], '64px', 'thumb stays inside circular base');
drag.control.fire('pointermove', { clientX: -100, clientY: -80 });
close(drag.joystick.getVector().x, -Math.SQRT1_2, 'diagonal x');
close(drag.joystick.getVector().y, -Math.SQRT1_2, 'diagonal y');
close(Math.hypot(drag.joystick.getVector().x, drag.joystick.getVector().y), 1, 'diagonal magnitude');
close(Math.hypot(parseFloat(drag.control.properties['--stick-x']), parseFloat(drag.control.properties['--stick-y'])), 64, 'circular thumb limit');
const copy = drag.joystick.getVector(); copy.x = 99;
assert.notEqual(drag.joystick.getVector().x, 99, 'callers cannot mutate held input');

// Centre jitter has a true deadzone; immediately outside it begins smoothly.
drag.control.fire('pointermove', { clientX: 125 });
zero(drag.joystick);
drag.control.fire('pointermove', { clientX: 120 + 64 * 0.14 });
zero(drag.joystick);
drag.control.fire('pointermove', { clientX: 120 + 64 * 0.15 });
close(drag.joystick.getVector().x, 0.01 / 0.86, 'continuous deadzone edge');
drag.control.fire('pointermove', { clientX: NaN });
close(drag.joystick.getVector().x, 0.01 / 0.86, 'invalid coordinates ignored');

// A second finger cannot steal the stick, move it, or release the first finger.
drag.control.fire('pointerdown', { pointerId: 2, clientX: -500 });
drag.control.fire('pointermove', { pointerId: 2, clientX: -500 });
drag.control.fire('pointerup', { pointerId: 2 });
assert.equal(drag.control.captured, 1);
close(drag.joystick.getVector().x, 0.01 / 0.86, 'second finger ignored');
assert.equal(drag.control.fire('pointerup').prevented, true);
zero(drag.joystick);
assert.deepEqual(drag.control.releases, [1], 'lost capture does not recursively release');
assert.equal(drag.control.classList.contains('active'), false);
assert.equal(drag.control.properties['--stick-x'], '0px');
assert.equal(drag.control.properties['--stick-y'], '0px');

for (const ending of ['pointercancel', 'lostpointercapture']) {
  const h = setup();
  h.control.fire('pointerdown', { clientX: 184 });
  h.control.fire(ending);
  zero(h.joystick);
  assert.equal(h.control.captured, null);
  assert.deepEqual(h.control.releases, [1], `${ending} releases once`);
  assert.deepEqual(h.changes.at(-1), { x: 0, y: 0 });
  h.control.fire('pointermove', { clientX: -100 });
  zero(h.joystick);
}

const reset = setup();
reset.control.fire('pointerdown', { clientX: 184 });
reset.joystick.reset();
reset.joystick.reset();
zero(reset.joystick);
assert.deepEqual(reset.control.releases, [1]);
assert.deepEqual(reset.changes, [{ x: 1, y: 0 }, { x: 0, y: 0 }]);

// Starting may reset the host's previous controls without clearing the new hold.
let started = 0, enabled = false;
const guarded = setup({ canStart: () => enabled, onStart: () => { started++; guarded.joystick.reset(); } });
guarded.control.fire('pointerdown', { clientX: 184 });
zero(guarded.joystick);
assert.equal(started, 0);
assert.equal(guarded.control.captured, null);
enabled = true;
guarded.control.fire('pointerdown', { clientX: 184 });
assert.equal(started, 1);
assert.equal(guarded.control.captured, 1);
assert.equal(guarded.joystick.getVector().x, 1);
enabled = false;
guarded.control.fire('pointermove', { clientX: 184 });
zero(guarded.joystick);
assert.equal(guarded.control.captured, null, 'blocking a held gesture also stops movement');

const noRightClick = setup();
noRightClick.control.fire('pointerdown', { button: 2, clientX: 184 });
noRightClick.control.fire('pointerdown', { clientX: NaN });
zero(noRightClick.joystick);
assert.equal(noRightClick.control.captured, null);
for (const type of ['contextmenu', 'selectstart', 'dragstart']) {
  assert.equal(noRightClick.control.fire(type).prevented, true, `${type} suppressed on stick only`);
}

const rectangle = setup();
rectangle.control.rect = { left: 10, top: 30, width: 300, height: 100 };
rectangle.control.fire('pointerdown', { clientX: 500, clientY: 80 });
assert.equal(rectangle.control.properties['--stick-x'], '32px', 'radius uses smaller dimension');
rectangle.joystick.destroy();
zero(rectangle.joystick);
assert.equal(rectangle.control.listeners.size, 0, 'destroy removes every handler');
assert.deepEqual(rectangle.control.releases, [1]);
rectangle.joystick.destroy();
rectangle.control.fire('pointerdown', { clientX: 500 });
zero(rectangle.joystick);

const detached = setup();
detached.control.setPointerCapture = () => { throw new Error('detached'); };
detached.control.fire('pointerdown', { clientX: 184 });
zero(detached.joystick);
assert.equal(detached.control.classList.contains('active'), false);

const hidden = setup();
hidden.control.rect.width = 0;
hidden.control.fire('pointerdown', { clientX: 184 });
zero(hidden.joystick);
assert.equal(hidden.control.captured, null, 'hidden controls cannot begin a gesture');

console.log('Dungeon joystick tests passed.');
