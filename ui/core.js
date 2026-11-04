/* core.js — tiny DOM helper, router, sound, toast, keys, theme. */
var U = {};
U.h = function (tag, attrs) {
  var el = document.createElement(tag), i, k, v;
  if (attrs) for (k in attrs) { v = attrs[k]; if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v; else if (k === 'html') { el.innerHTML = v; if (U.mathOn()) U.mathify(el); } else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, ''); else el.setAttribute(k, v); }
  for (i = 2; i < arguments.length; i++) U.add(el, arguments[i]);
  return el;
};
U.add = function (el, c) {
  if (c === null || c === undefined || c === false) return;
  if (Array.isArray(c)) c.forEach(function (x) { U.add(el, x); });
  else if (c.nodeType) el.appendChild(c); else { var t = String(c); el.appendChild(U.mathOn() && t.indexOf('$') >= 0 ? U.mathFrag(t, /^T[DH]$/.test(el.tagName)) : document.createTextNode(t)); }
};
/* ---- math: with pack.json "math": "katex", text between $…$ is typeset with KaTeX (\$ is a literal dollar sign) ---- */
U.mathOn = function () { return !!(A.MATH && typeof katex !== 'undefined'); };
U.mathFrag = function (t, compact) {
  var f = document.createDocumentFragment(), re = /\$((?:\\\$|[^$])+?)\$/g, last = 0, m;
  function txt(s) { if (s) f.appendChild(document.createTextNode(s.replace(/\\\$/g, '$'))); }
  /* a node that is nothing but one formula (an answer choice, a worked-step line) is set in display size so fractions stay readable */
  var solo = !compact && /^\s*\$[^$]+\$\s*$/.test(t);
  while ((m = re.exec(t))) {
    if (m.index > 0 && t[m.index - 1] === '\\') continue;
    txt(t.slice(last, m.index));
    var sp = document.createElement('span'); sp.className = 'mx';
    /* renderToString, not render: render refuses to run when the page has no doctype (the host adds one; local file previews may not) */
    try { sp.innerHTML = katex.renderToString((solo ? '\\displaystyle ' : '') + m[1], { throwOnError: false, output: 'htmlAndMathml', strict: false }); } catch (e) { sp.textContent = m[1]; }
    f.appendChild(sp); last = re.lastIndex;
  }
  txt(t.slice(last)); return f;
};
/* U.tex: plain Unicode math → $…$ when the course asks for automatic conversion (A.COURSE.math === 'auto') */
U.tex = function (s) { return typeof s === 'string' && U.mathOn() && A.COURSE.math === 'auto' && A.texify ? A.texify(s) : s; };
/* U.mathify(root, auto): render $…$ in every text node under root; with auto, convert plain math first (for authored HTML such as the reference sheet) */
U.mathify = function (root, auto) {
  if (!U.mathOn() || !root) return root;
  var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), list = [], n, v;
  while ((n = w.nextNode())) if (!(n.parentNode && n.parentNode.closest && n.parentNode.closest('.katex,script,style,textarea,code'))) list.push(n);
  list.forEach(function (x) { v = auto ? U.tex(x.nodeValue) : x.nodeValue; if (v.indexOf('$') >= 0) x.parentNode.replaceChild(U.mathFrag(v, !!(x.parentNode.closest && x.parentNode.closest('td,th'))), x); });
  return root;
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
/* ---- place: where the viewer is inside a view (current question, lesson card), kept across tab switches and reloads.
   Saved per device in browser storage; progress itself lives in A.store. ---- */
U.place = (function () {
  var mem = null, K = function () { return A.KEY('place'); };
  function load() { if (mem) return mem; try { mem = JSON.parse(localStorage.getItem(K()) || '{}') || {}; } catch (e) { mem = {}; } return mem; }
  function save() { try { localStorage.setItem(K(), JSON.stringify(mem)); } catch (e) {} }
  return {
    get: function (key) { var v = load()[key]; return v ? JSON.parse(JSON.stringify(v)) : null; },
    set: function (key, val) { load()[key] = val; save(); },
    del: function (key) { if (load()[key] !== undefined) { delete mem[key]; save(); } }
  };
})();
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
