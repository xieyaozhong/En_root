(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DungeonIcons = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  // Original Word Relic glyphs: a shared angular stroke and diamond rune.
  // SVG is decorative; controls must retain their own visible or accessible label.
  var shapes = Object.freeze({
    attack: '<path d="m5 20 11-11M13 4l3-2 3 3-2 3-4-4ZM10 6l3 3M16 12l3 3M4 11l2 2-2 2-2-2 2-2ZM20 17l2 2-2 2-2-2 2-2Z"/>',
    heal: '<path d="m12 2 3 5 5 3v4l-8 8-8-8v-4l5-3 3-5Z"/><path d="M8 12h8M12 8v8"/>',
    shield: '<path d="m12 2 8 4v7l-3 5-5 4-5-4-3-5V6l8-4Z"/><path d="m12 7 4 5-4 5-4-5 4-5Z"/>',
    signature: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/><path d="m12 9 3 3-3 3-3-3 3-3ZM4 4l2 2M18 18l2 2M20 4l-2 2M6 18l-2 2"/>',
    battle: '<path d="m3 3 5 1 12 12-4 4L4 8 3 3ZM21 3l-5 1-5 5M9 11l-5 5 4 4 5-5M13 19l6-6M5 21l3-3M19 21l-3-3M5 13l6 6"/>',
    elite: '<path d="m12 2 6 6-2 8-4 6-4-6-2-8 6-6Z"/><path d="m12 6 3 4-3 6-3-6 3-4ZM2 8l3 3-3 3M22 8l-3 3 3 3"/>',
    boss: '<path d="m4 9-2-6 6 3 4-4 4 4 6-3-2 6v7l-4 5H8l-4-5V9Z"/><path d="m6 11 4 2M18 11l-4 2M9 17h6M12 15v4M8 7l4 3 4-3"/>',
    treasure: '<path d="M3 10V7l3-4h12l3 4v3M3 10h18v10H3V10ZM8 4v6M16 4v6M3 15h6M15 15h6"/><path d="m12 11 3 3-3 4-3-4 3-3Z"/>',
    camp: '<path d="m12 2 5 5-1 4 4 3-2 4H6l-2-4 4-4 1-5 3-3Z"/><path d="m12 10 3 5-3 3-3-3 3-5ZM4 22l16-3M4 19l16 3"/>',
    shop: '<path d="M3 9 5 3h14l2 6v3l-3 2-3-2-3 2-3-2-3 2-3-2V9ZM3 9h18M9 3l-1 6M15 3l1 6M5 14v7h14v-7M10 21v-5h4v5"/>',
    dash: '<path d="m14 3 8 9-8 9 3-9-3-9ZM2 5h6l3 3M2 12h11M2 19h6l3-3"/>',
    focus: '<path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M12 2v3M22 12h-3M12 22v-3M2 12h3"/><path d="m12 7 5 5-5 5-5-5 5-5Z"/>',
    gold: '<path d="M7 2h10l5 5v10l-5 5H7l-5-5V7l5-5Z"/><path d="m12 6 5 6-5 6-5-6 5-6ZM12 9v6M9 12h6"/>',
    combo: '<path d="m3 6 6 6-6 6M10 6l6 6-6 6M17 6l5 6-5 6"/>',
    help: '<path d="M7 2h10l5 5v10l-5 5H7l-5-5V7l5-5Z"/><path d="m8 8 2-2h4l2 2v3l-4 3v1M12 18v.1"/>',
    expand: '<path d="M9 3H3v6M3 3l6 6M15 3h6v6M21 3l-6 6M21 15v6h-6M21 21l-6-6M3 15v6h6M3 21l6-6"/>',
    pause: '<path d="M5 3h5v18H5V3ZM14 3h5v18h-5V3Z"/>',
    close: '<path d="m5 5 14 14M19 5 5 19"/>',
    music: '<path d="M9 18V5l12-3v13M9 9l12-3M9 18l-3 3H3l-1-2 2-3h5M21 15l-3 3h-3l-1-2 2-3h5"/>',
    route: '<path d="M12 18V11M5 8v3h14V8M12 3l3 3-3 3-3-3 3-3ZM5 2l3 3-3 3-3-3 3-3ZM19 2l3 3-3 3-3-3 3-3ZM12 17l3 3-3 3-3-3 3-3Z"/>',
    event: '<path d="m12 2 3 6 7 2-5 5 1 7-6-3-6 3 1-7-5-5 7-2 3-6Z"/><path d="m10 10 2-1 2 2-2 3v1M12 17v.1"/>',
    bag: '<path d="M7 7V4l2-2h6l2 2v3M6 7h12l3 14H3L6 7ZM5 12h14"/><path d="m12 11 3 4-3 4-3-4 3-4Z"/>',
    relic: '<path d="m8 2 10 2 4 9-8 9-10-4-2-9 6-7Z"/><path d="m8 2 2 7-6 9M18 4l-4 5 8 4M14 22l-1-7M10 8l5 3-2 5-5-3 2-5Z"/>',
    spell: '<path d="M12 7 7 4H2v15h5l5 3 5-3h5V4h-5l-5 3ZM12 7v15M5 9h3M5 13h3M16 9h3M16 13h3"/><path d="m12 1 3 3-3 3-3-3 3-3Z"/>',
    companion: '<path d="m9 2 5 5v5l4 9H2l4-9V7l3-5ZM6 8h6M8 11h2M17 5l3 2v4l2 7h-3M17 9h3"/><path d="m9 15 2 2-2 2-2-2 2-2Z"/>',
    fire: '<path d="m13 2 5 7-1 3 4 3-3 6H6l-3-6 4-6 1 5 4-5 1-7Z"/><path d="m12 12 4 5-4 4-4-4 4-5Z"/>',
    ice: '<path d="M12 2v20M3 7l18 10M3 17 21 7M8 3l4 4 4-4M8 21l4-4 4 4M3 11l5-2-1-5M21 13l-5 2 1 5M7 20l1-5-5-2M17 4l-1 5 5 2"/>',
    lightning: '<path d="M14 2 4 13h7l-1 9L21 9h-8l1-7Z"/>',
    wind: '<path d="M2 7h13l3-3-2-2h-3M2 12h17l3-3V7M5 17h10l3 3-2 2h-3M8 7l3 5-3 5"/>',
    hex: '<path d="m12 2 9 6v8l-9 6-9-6V8l9-6Z"/><path d="m12 6 5 3v6l-5 3-5-3V9l5-3ZM12 6v12M7 9l10 6M17 9 7 15"/>',
    home: '<path d="m2 11 10-9 10 9M5 9v12h14V9M9 21v-7l3-3 3 3v7"/><path d="m12 5 2 2-2 2-2-2 2-2Z"/>',
    play: '<path d="M6 3v18l15-9L6 3Z"/>',
    potion: '<path d="M9 2h6v5l5 7v5l-3 3H7l-3-3v-5l5-7V2ZM8 2h8M9 6h6M5 14h14"/><path d="M9 18h6M12 15v6"/>',
    bomb: '<path d="m14 6 3 3v3l3 3v4l-3 3H7l-4-4v-7l4-4h5l2-1ZM13 6l3-3h3V1M19 6l2 2M21 3h1M7 11v4"/>',
    hourglass: '<path d="M5 2h14M5 22h14M7 2v6l5 4-5 4v6M17 2v6l-5 4 5 4v6M7 6h10M8 19l4-4 4 4"/>',
    ink: '<path d="M4 10h10v3l2 3v6H2v-6l2-3v-3ZM4 14h10M7 18h4M11 9 20 1l2 4-8 10M17 4l3 3"/>'
  });
  var names = Object.freeze(Object.keys(shapes));

  function icon(name, optionalClass) {
    var key = typeof name === 'string' && Object.prototype.hasOwnProperty.call(shapes, name) ? name : 'spell';
    var extra = typeof optionalClass === 'string' ? optionalClass.split(/\s+/).filter(function (token) {
      return /^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$/.test(token);
    }).slice(0, 8).join(' ') : '';
    return '<svg class="dungeon-icon' + (extra ? ' ' + extra : '') + '" data-icon="' + key + '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="square" stroke-linejoin="bevel" aria-hidden="true" focusable="false">' + shapes[key] + '</svg>';
  }

  return Object.freeze({ icon: icon, names: names });
});
