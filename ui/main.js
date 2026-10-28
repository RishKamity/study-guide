/* main.js — shell and boot. */
(function () {
  var h = U.h, root = document.getElementById('app');
  var TABS = [['today', 'Today', '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'], ['path', 'Path', '<path d="M5 4v16M5 6h11l-2 3 2 3H5"/>'], ['endless', 'Endless', '<path d="M18 8a5 5 0 1 0 0 8c3 0 4-8 0-8s-5 8-8 8a5 5 0 1 1 0-8"/>'], ['drill', 'Drill', '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>'], ['listen', 'Listen', '<path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H4zM17 14h3v6h-3z"/>'], ['mock', 'Mock', '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13l2 2 4-4"/>'], ['ref', 'Ref', '<path d="M5 3h10l4 4v14H5zM14 3v5h5M8 13h8M8 17h6"/>']];
  var F = A.FEAT;
  TABS = TABS.filter(function (t) { return t[0] === 'mock' ? F.mocks : t[0] === 'listen' ? (F.audio && (A.AUDIO || []).length) : t[0] === 'ref' ? !!(A.REF_HTML || A.SHEET) : true; });
  U.views.endless = { tab: 'endless', hash: 'endless', render: function (m) { return U.views.session.render(m, { title: 'Endless practice' }); } };
  var chip = h('span', { class: 'chip-sync', title: 'Sync status' }), soundBtn, themeBtn;
  var scoreChip = h('button', { class: 'chip-score', type: 'button', title: 'Predicted score: tap for details', 'aria-label': 'Predicted score', onclick: function () { U.go('today'); } }), scoreVal = h('b'), scoreDelta = h('span', { class: 'sd' });
  scoreChip.appendChild(scoreVal); scoreChip.appendChild(scoreDelta);
  function paintScore(cur, prev, live) {
    var v = (cur || A.score.now()).pct; scoreVal.textContent = v.toFixed(2) + '%';
    if (live && prev) { var d = v - prev.pct; if (Math.abs(d) >= 0.005) { scoreDelta.textContent = (d > 0 ? '\u25B2 +' : '\u25BC \u2212') + Math.abs(d).toFixed(2); scoreDelta.className = 'sd ' + (d > 0 ? 'up' : 'down'); U.scorePop(d); } }
  }
  U.scorePop = function (d) {
    var r = scoreChip.getBoundingClientRect(), el = h('div', { class: 'scorepop ' + (d > 0 ? 'up' : 'down'), 'aria-hidden': 'true' }, (d > 0 ? '+' : '\u2212') + Math.abs(d).toFixed(2) + '%');
    el.style.top = (r.bottom + 6) + 'px'; el.style.left = Math.max(8, r.left) + 'px'; document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 1500);
  };
  function paintChip(s) { chip.className = 'chip-sync ' + s; U.clear(chip); chip.appendChild(h('i')); chip.appendChild(document.createTextNode({ local: 'Local', syncing: 'Syncing', synced: 'Synced', offline: 'Offline', error: 'Sync error' }[s] || s)); }
  function build() {
    U.clear(root);
    soundBtn = h('button', { class: 'iconbtn', 'aria-label': 'Toggle sound', onclick: function () { A.store.mutate(function (s) { s.settings.sound = !s.settings.sound; s.settings.updatedAt = Date.now(); }); paintBtns(); U.sfx('tick'); } });
    themeBtn = h('button', { class: 'iconbtn', 'aria-label': 'Toggle light and dark', onclick: function () { U.toggleTheme(); paintBtns(); } });
    root.appendChild(h('header', { class: 'top' }, h('div', { class: 'brand' }, h('span', { class: 'mark' }, A.COURSE.mark || 'L'), h('span', { class: 't' }, A.COURSE.title)), F.score ? scoreChip : null, F.sync ? chip : null, soundBtn, themeBtn));
    var nav = h('nav', { class: 'tabs', 'aria-label': 'Sections' });
    TABS.forEach(function (t) { nav.appendChild(h('button', { 'data-tab': t[0], onclick: function () { U.go(t[0] === 'endless' ? 'endless' : t[0]); } }, h('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + t[2] + '</svg>' }), t[1])); });
    root.appendChild(nav); root.appendChild(h('main', { id: 'main' })); paintBtns();
  }
  function paintBtns() { var s = A.store.state.settings; soundBtn.textContent = s.sound ? '\u266A' : '\u266A\u0338'; soundBtn.title = s.sound ? 'Sound on' : 'Sound off'; soundBtn.style.opacity = s.sound ? 1 : .5; themeBtn.textContent = s.theme === 'light' ? '\u263E' : '\u2600'; themeBtn.title = s.theme === 'light' ? 'Switch to dark' : 'Switch to light'; }
  A.store.load(); A.score.seed(A.store.state); U.applyTheme(); build(); if (F.score) paintScore();
  A.score.onChange(function (cur, prev, live) { if (F.score) paintScore(cur, prev, live); if (!live) U.refresh(); });
  A.store.onStatus(paintChip); A.store.onChange(function () { A.score.seed(A.store.state); U.refresh(); });
  var start = (location.hash || '').replace('#', ''); U.go(U.views[start] && U.views[start].tab ? start : 'today');
  /* keep the last button above the fixed tab bar (and audio player) on every phone */
  function measureBottom() {
    var de = document.documentElement, nav = document.querySelector('.tabs'), pl = document.querySelector('.player');
    var th = nav && getComputedStyle(nav).position === 'fixed' ? Math.ceil(nav.getBoundingClientRect().height) : 0;
    var ph = pl && !pl.hidden && getComputedStyle(pl).position === 'fixed' ? Math.ceil(pl.getBoundingClientRect().height) : 0;
    de.style.setProperty('--tabs-h', th + 'px'); de.style.setProperty('--player-h', ph + 'px');
  }
  var mbT = null; function mbSoon() { if (mbT) return; mbT = requestAnimationFrame(function () { mbT = null; measureBottom(); }); }
  measureBottom(); window.addEventListener('resize', mbSoon); window.addEventListener('orientationchange', mbSoon);
  try { var ro = new ResizeObserver(mbSoon); ro.observe(document.querySelector('.tabs')); new MutationObserver(function () { var pl = document.querySelector('.player'); if (pl && !pl._ro) { pl._ro = 1; ro.observe(pl); } mbSoon(); }).observe(document.body, { childList: true, attributes: true, attributeFilter: ['class'] }); } catch (e) {}
  setTimeout(measureBottom, 500);
  if (F.sync) { A.store.initSync(); A.score.initSync(); }
})();
