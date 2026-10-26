(function (root, factory) {
  'use strict';
  var Joystick = factory();
  if (typeof module === 'object' && module.exports) module.exports = Joystick;
  if (root) root.DungeonJoystick = Joystick;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var DEADZONE = 0.1;

  class DungeonJoystick {
    constructor(element, options) {
      if (!element || typeof element.addEventListener !== 'function') {
        throw new TypeError('DungeonJoystick requires a control element.');
      }
      this.element = element;
      this.options = options || {};
      this.pointerId = null;
      this.vector = { x: 0, y: 0 };
      this.geometry = null;
      this.destroyed = false;
      this.listeners = {
        pointerdown: event => this.start(event),
        pointermove: event => this.move(event),
        pointerup: event => this.finish(event),
        pointercancel: event => this.finish(event),
        lostpointercapture: event => this.finish(event),
        contextmenu: event => event.preventDefault(),
        selectstart: event => event.preventDefault(),
        dragstart: event => event.preventDefault()
      };
      Object.keys(this.listeners).forEach(type => element.addEventListener(type, this.listeners[type], { passive: false }));
      this.paint(0, 0);
    }

    allowed() {
      return !this.destroyed && (!this.options.canStart || this.options.canStart());
    }

    start(event) {
      if (this.pointerId !== null || (event.button != null && event.button !== 0) || !this.allowed()) return;
      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
      event.preventDefault();
      // The gesture owns one pointer; spell and dash buttons can use the other
      // thumb without replacing it or cancelling the held movement vector.
      if (this.options.onStart) this.options.onStart();
      if (!this.allowed()) return;
      var rect = this.element.getBoundingClientRect();
      var radius = Math.min(rect.width, rect.height) * 0.27;
      if (!Number.isFinite(radius) || radius <= 0) return;
      var centerX = rect.left + rect.width / 2;
      var centerY = rect.top + rect.height / 2;
      var inset = radius * 0.8;
      this.geometry = {
        x: Math.max(rect.left + inset, Math.min(rect.right - inset, event.clientX)),
        y: Math.max(rect.top + inset, Math.min(rect.bottom - inset, event.clientY)),
        centerX: centerX, centerY: centerY, radius: radius,
        minX: rect.left + inset, maxX: rect.right - inset,
        minY: rect.top + inset, maxY: rect.bottom - inset
      };
      this.paintBase();
      this.pointerId = event.pointerId;
      this.element.classList.add('active');
      try {
        this.element.setPointerCapture(event.pointerId);
      } catch (_) {
        // A removed control cannot capture a pointer; never leave movement held.
        this.reset();
        return;
      }
      this.position(event);
    }

    move(event) {
      if (this.pointerId === null || event.pointerId !== this.pointerId) return;
      event.preventDefault();
      if (!this.allowed()) { this.reset(); return; }
      this.position(event);
    }

    position(event) {
      if (!this.geometry || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
      var dx = event.clientX - this.geometry.x;
      var dy = event.clientY - this.geometry.y;
      var distance = Math.hypot(dx, dy);
      // Let the base follow a thumb that slides beyond the rim, within the
      // movement pad. Reversing direction then responds without a long drag.
      if (distance > this.geometry.radius) {
        var follow = distance - this.geometry.radius;
        this.geometry.x = Math.max(this.geometry.minX, Math.min(this.geometry.maxX, this.geometry.x + dx / distance * follow));
        this.geometry.y = Math.max(this.geometry.minY, Math.min(this.geometry.maxY, this.geometry.y + dy / distance * follow));
        this.paintBase();
        dx = event.clientX - this.geometry.x;
        dy = event.clientY - this.geometry.y;
        distance = Math.hypot(dx, dy);
      }
      var limited = Math.min(distance, this.geometry.radius);
      var directionX = distance ? dx / distance : 0;
      var directionY = distance ? dy / distance : 0;
      this.paint(directionX * limited, directionY * limited);
      // Remap the remaining range after the deadzone so movement is continuous
      // at its edge and still reaches full strength at the rim.
      var strength = limited <= this.geometry.radius * DEADZONE + 1e-9 ? 0 :
        (limited / this.geometry.radius - DEADZONE) / (1 - DEADZONE);
      this.change(directionX * strength || 0, directionY * strength || 0);
    }

    finish(event) {
      if (this.pointerId === null || event.pointerId !== this.pointerId) return;
      event.preventDefault();
      this.reset();
    }

    paint(x, y) {
      this.element.style.setProperty('--stick-x', x + 'px');
      this.element.style.setProperty('--stick-y', y + 'px');
    }

    paintBase() {
      this.element.style.setProperty('--stick-base-x', (this.geometry ? this.geometry.x - this.geometry.centerX : 0) + 'px');
      this.element.style.setProperty('--stick-base-y', (this.geometry ? this.geometry.y - this.geometry.centerY : 0) + 'px');
    }

    change(x, y) {
      if (x === this.vector.x && y === this.vector.y) return;
      this.vector = { x: x, y: y };
      if (this.options.onChange) this.options.onChange(this.getVector());
    }

    getVector() {
      return { x: this.vector.x, y: this.vector.y };
    }

    reset() {
      var pointerId = this.pointerId;
      // Release may synchronously dispatch lostpointercapture in some hosts.
      // Clear ownership first so it cannot re-enter the reset or release twice.
      this.pointerId = null;
      this.geometry = null;
      this.element.classList.remove('active');
      this.paintBase();
      this.paint(0, 0);
      this.change(0, 0);
      if (pointerId !== null) {
        try { this.element.releasePointerCapture(pointerId); } catch (_) { /* Already released or detached. */ }
      }
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      this.reset();
      Object.keys(this.listeners).forEach(type => this.element.removeEventListener(type, this.listeners[type]));
    }
  }

  return DungeonJoystick;
});
