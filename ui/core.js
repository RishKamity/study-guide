/* core.js — tiny DOM helper, router, sound, toast, keys, theme. */
var U = {};
U.h = function (tag, attrs) {
  var el = document.createElement(tag), i, k, v;
  if (attrs) for (k in attrs) { v = attrs[k]; if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v; else if (k === 'html') el.innerHTML = v; else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, ''); else el.setAttribute(k, v); }
  for (i = 2; i < arguments.length; i++) U.add(el, arguments[i]);
  return el;
};
U.add = function (el, c) {
  if (c === null || c === undefined || c === false) return;
  if (Array.isArray(c)) c.forEach(function (x) { U.add(el, x); });
  else if (c.nodeType) el.appendChild(c); else el.appendChild(document.createTextNode(String(c)));
};
U.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };
U.$ = function (s, r) { return (r || document).querySelector(s); };
U.fmtTime = function (sec) { sec = Math.max(0, Math.round(sec)); var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; };
U.plural = function (n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); };

/* ---- sound ---- */
U.ctx = null;
U.sfx = function (name) {
  try {
    if (!A.store.state.settings.sound) return;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    if (!U.ctx) U.ctx = new AC(); if (U.ctx.state === 'suspended') U.ctx.resume();
    var seq = { ok: [[660, 0, .08], [880, .08, .12]], bad: [[220, 0, .16]], tick: [[520, 0, .04]], win: [[660, 0, .08], [880, .08, .08], [1100, .16, .16]] }[name]; if (!seq) return;
    var t0 = U.ctx.currentTime;
    seq.forEach(function (n) { var o = U.ctx.createOscillator(), g = U.ctx.createGain(); o.type = name === 'bad' ? 'triangle' : 'sine'; o.frequency.value = n[0]; g.gain.setValueAtTime(0.0001, t0 + n[1]); g.gain.exponentialRampToValueAtTime(0.12, t0 + n[1] + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + n[1] + n[2]); o.connect(g); g.connect(U.ctx.destination); o.start(t0 + n[1]); o.stop(t0 + n[1] + n[2] + 0.02); });
  } catch (e) {}
};
U.toast = function (msg) {
  var t = U.h('div', { class: 'toast', role: 'status' }, msg); document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200);
};
/* ---- keyboard ---- */
U.unitChips = function (withBoot) { var out = [['All', 0]].concat(A.UNITS.map(function (u) { return [A.unitShort(u), u]; })); if (withBoot && A.TOPICS.some(function (t) { return t.ch === 0; })) out.push([A.CHAPTERS[0], -1]); return out; };
U.keyFn = null;
document.addEventListener('keydown', function (e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return; var tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (U.keyFn) U.keyFn(e);
});
/* ---- theme ---- */
U.applyTheme = function () { var t = A.store.state.settings.theme === 'light' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', t); if (A.applyAccent) A.applyAccent(t); };
U.toggleTheme = function () { A.store.mutate(function (s) { s.settings.theme = s.settings.theme === 'light' ? 'dark' : 'light'; s.settings.updatedAt = Date.now(); }); U.applyTheme(); };
/* ---- router ---- */
U.views = {}; U.cur = null; U.cleanup = null; U.liveView = false; U.curName = 'today'; U.curParams = null;
U.go = function (name, params) {
  if (U.cleanup) { try { U.cleanup(); } catch (e) {} U.cleanup = null; }
  U.keyFn = null; U.liveView = false; U.curName = name; U.curParams = params || {};
  var main = U.$('#main'); U.clear(main); window.scrollTo(0, 0);
  var tv = U.views[name] && U.views[name].tab, tab = (typeof tv === 'function' ? tv(U.curParams) : tv) || name;
  Array.prototype.forEach.call(document.querySelectorAll('.tabs button'), function (b) { if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  var v = U.views[name]; if (!v) { main.textContent = 'Not found'; return; }
  var r = v.render(main, U.curParams); if (typeof r === 'function') U.cleanup = r;
  if (v.live) U.liveView = true;
  try { if (v.hash) history.replaceState(null, '', '#' + v.hash); } catch (e) {}
};
U.refresh = function () { if (U.liveView) { var y = window.scrollY; U.go(U.curName, U.curParams); window.scrollTo(0, y); } };
U.stateLabel = function (id) { var ts = A.topicStat(id); return ts; };
