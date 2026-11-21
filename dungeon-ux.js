/* Word Relic UX pass (2026-11-22).
   1. Developer tools stay hidden unless the page was opened with ?dev=1 (remembered).
   2. On phones, a start shortcut under the stage mirrors the sidebar's departure
      buttons, so players don't have to scroll past the whole page to begin.
      It only forwards clicks to the existing buttons; no game logic lives here. */
(function () {
  'use strict';
  const doc = document;

  // ---- Developer mode ----
  try {
    const flag = new URLSearchParams(location.search).get('dev');
    if (flag === '1') localStorage.setItem('wr_dev', '1');
    else if (flag === '0') localStorage.removeItem('wr_dev');
  } catch (e) { /* storage blocked: stay in player mode */ }
  let dev = false;
  try { dev = localStorage.getItem('wr_dev') === '1'; } catch (e) {}
  doc.documentElement.classList.toggle('wr-dev', dev);

  // ---- Mobile start shortcut ----
  const frame = doc.querySelector('#gameSurface > .stage-frame');
  const sidebar = doc.getElementById('sidebar');
  if (!frame || !sidebar) return;

  const bar = doc.createElement('div');
  bar.className = 'ux-quickstart';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', '開始冒險');
  bar.innerHTML = '<button type="button" class="primary" data-ux="primary"></button>' +
                  '<button type="button" class="secondary" data-ux="secondary"></button>';
  const note = doc.createElement('p');
  note.className = 'ux-quickstart-note';
  frame.after(bar, note);

  const byId = id => doc.getElementById(id);
  const departure = () => (byId('practiceRun') || byId('continueRun') || byId('startRun'))?.closest('.side-panel') || sidebar;
  const showDeparture = () => {
    departure().scrollIntoView({ behavior: 'smooth', block: 'start' });
    const select = departure().querySelector('select');
    if (select) setTimeout(() => select.focus({ preventScroll: true }), 450);
  };
  const press = id => { const b = byId(id); if (b && !b.disabled) b.click(); };

  let actions = {};
  function sync() {
    const cont = byId('continueRun'), start = byId('startRun'), practice = byId('practiceRun');
    const [primary, secondary] = bar.children;
    if (cont) {
      actions = { primary: () => press('continueRun'), secondary: showDeparture };
      primary.textContent = '接續冒險'; secondary.textContent = '查看進度';
      note.textContent = '';
    } else if (start && !start.disabled) {
      // Entering for real spends a card, so the shortcut takes players to the card picker first.
      actions = { primary: showDeparture, secondary: () => press('practiceRun') };
      primary.textContent = '選卡片入場'; secondary.textContent = '免費練習';
      note.textContent = '';
    } else if (practice) {
      actions = { primary: () => press('practiceRun'), secondary: showDeparture };
      primary.textContent = '免費練習'; secondary.textContent = '難度與卡片';
      note.textContent = '還沒有卡片也能練習。完成 10 題單字練習可抽第一張卡。';
    } else {
      bar.hidden = true; note.textContent = ''; return;
    }
    bar.hidden = false;
  }
  bar.addEventListener('click', e => {
    const b = e.target.closest('button[data-ux]');
    if (b && actions[b.dataset.ux]) actions[b.dataset.ux]();
  });
  new MutationObserver(sync).observe(sidebar, { childList: true, subtree: true });
  sync();
})();
