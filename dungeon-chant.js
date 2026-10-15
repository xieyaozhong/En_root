(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DungeonChant = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  // Keep whitespace and punctuation visible: an accidental space is a typo.
  // These values are text data; the view must render characters with textContent.
  function normalize(value) {
    return value == null ? '' : String(value).toLowerCase();
  }

  function analyze(word, typed) {
    var target = Array.from(normalize(word));
    var input = Array.from(normalize(typed));
    var matched = 0;
    while (matched < target.length && matched < input.length && target[matched] === input[matched]) matched++;
    var extra = input.slice(target.length).join('');
    var wrong = matched < Math.min(target.length, input.length) || extra.length > 0;
    var complete = target.length > 0 && !wrong && input.length === target.length;
    var letters = target.map(function (char, i) {
      var state = 'pending';
      if (i < input.length) state = input[i] === char ? 'correct' : 'wrong';
      else if (i === matched) state = 'current';
      return { char: char, state: state };
    });
    return {
      letters: letters,
      matched: matched,
      progress: target.length ? matched / target.length : 0,
      complete: complete,
      wrong: wrong,
      next: target[matched] === undefined ? null : target[matched],
      index: matched,
      extra: extra
    };
  }

  // Call only for input events. Identical input is idle, including repeated full
  // spell checks, so merely redrawing a ready spell cannot retrigger feedback.
  function feedback(previousTyped, typed, word) {
    var previous = normalize(previousTyped);
    var current = normalize(typed);
    var result = analyze(word, current);
    var kind = 'idle';
    if (previous !== current) {
      if (result.complete) kind = 'ready';
      else if (result.wrong) kind = 'wrong';
      else if (analyze(word, previous).wrong || Array.from(current).length < Array.from(previous).length) kind = 'corrected';
      else if (current.length) kind = 'correct';
    }
    return Object.assign({ kind: kind }, result);
  }

  return { analyze: analyze, feedback: feedback };
});
