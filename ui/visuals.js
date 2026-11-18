/* visuals.js — renderers for lesson visuals and journal-entry tables. */
U.jeTable = function (rows, o) {
  o = o || {}; var box = U.h('div', { class: 'je' + (o.sm ? ' sm' : '') });
  rows.forEach(function (r) {
    var d = r[1] !== null && r[1] !== undefined; box.appendChild(U.h('div', { class: 'l ' + (d ? 'd' : 'c') }, U.h('span', null, (d ? 'Dr  ' : 'Cr  ') + r[0]), U.h('span', { class: 'a' }, A.num(d ? r[1] : r[2]))));
  });
  if (o.note) box.appendChild(U.h('div', { class: 'note' }, o.note)); return box;
};
U.dataTable = function (t) {
  var tb = U.h('table', { class: 'data' });
  if (t.head) tb.appendChild(U.h('thead', null, U.h('tr', null, t.head.map(function (x) { return U.h('th', null, x); }))));
  var body = U.h('tbody'); t.rows.forEach(function (r) { body.appendChild(U.h('tr', null, r.map(function (c, i) { return U.h('td', { class: (/^\$?[\d,.\-]+%?$/.test(String(c)) ? 'r' : '') }, c); }))); }); tb.appendChild(body);
  return U.h('div', { class: 'tablewrap' }, tb);
};
var ICONS = {
  sign: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16M5 16l2 1 10-10-3-3L4 14z"/></svg>',
  split: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="8" r="3"/><circle cx="18" cy="8" r="3"/><path d="M3 20c0-3 2-5 5-5M21 20c0-3-2-5-5-5"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/></svg>'
};
U.visual = function (v) {
  if (!v) return null; var w = U.h('div', { class: 'vis' }), t = v.type;
  if (t === 'je') w.appendChild(U.jeTable(v.rows, { note: v.note }));
  else if (t === 'table') w.appendChild(U.dataTable(v));
  else if (t === 'twocol') w.appendChild(U.h('div', { class: 'twocol' }, [v.left, v.right].map(function (c) { return U.h('div', null, U.h('h4', null, c.title), U.h('ul', null, c.items.map(function (i) { return U.h('li', null, U.h('span', null, i)); }))); })));
  else if (t === 'stack') w.appendChild(U.h('div', { class: 'stackv' }, v.tiers.map(function (x, i) { return U.h('div', { style: { width: (62 + i * 9) + '%', borderColor: i === v.tiers.length - 1 ? 'var(--accent)' : '' } }, U.h('b', null, x.n), U.h('span', null, x.d)); })));
  else if (t === 'layers') {
    var mx = Math.max.apply(null, v.layers.map(function (l) { return l.u; }));
    w.appendChild(U.h('div', { class: 'layersv' }, v.layers.map(function (l) {
      var sold = l.sold || 0, left = l.u - sold;
      return U.h('div', { class: 'lrow' }, U.h('div', { class: 'ln' }, l.n), U.h('div', { class: 'lbarw' }, U.h('div', { class: 'lbar', style: { width: (l.u / mx * 100) + '%' } }, sold ? U.h('i', { class: 'ls', style: { flex: sold } }, sold + ' sold') : null, left ? U.h('i', { class: 'lk', style: { flex: left } }, left + ' left') : null)), U.h('div', { class: 'lc' }, l.u + ' × $' + l.c));
    })));
    w.appendChild(U.h('div', { class: 'small dim', style: { marginTop: '6px' } }, [U.h('span', { class: 'lgd ls' }), ' in COGS   ', U.h('span', { class: 'lgd lk' }), ' in ending inventory', v.note ? '. ' + v.note : '']));
  }
  else if (t === 'code') { w.appendChild(U.h('pre', { class: 'code' }, v.src)); if (v.note) w.appendChild(U.h('div', { class: 'small dim', style: { marginTop: '6px' } }, v.note)); }
  else if (t === 'signs') w.appendChild(U.signChart(v));
  else if (t === 'plot') { w.appendChild(U.plot(v)); if (v.note) w.appendChild(U.h('div', { class: 'small dim', style: { marginTop: '6px' } }, v.note)); }
  else if (t === 'flow') { w.appendChild(U.h('div', { class: 'flow' }, v.steps.map(function (s) { return U.h('div', null, s); }))); if (v.note) w.appendChild(U.h('div', { class: 'small dim', style: { marginTop: '6px' } }, v.note)); }
  else if (t === 'icons') w.appendChild(U.h('div', { class: 'icons3' }, v.items.map(function (i) { return U.h('div', null, U.h('div', { html: ICONS[i.k] || '' }), U.h('b', null, i.t), U.h('span', null, i.d)); })));
  else if (t === 'tri') {
    var c = v.corners, col = function (x) { return x.hl ? 'var(--accent)' : 'var(--text-2)'; };
    var svg = '<svg class="tri" viewBox="0 0 400 270" role="img" aria-label="' + (v.label || 'Triangle diagram').replace(/"/g, '') + '"><polygon points="200,18 40,238 360,238" fill="color-mix(in srgb,var(--accent) 8%,transparent)" stroke="var(--line)" stroke-width="2"/>' +
      '<g font-family="Sora,sans-serif" text-anchor="middle"><text x="200" y="70" fill="' + col(c[0]) + '" font-weight="700" font-size="17">' + c[0].t + '</text><text x="200" y="90" fill="var(--text-2)" font-size="12">' + c[0].d + '</text>' +
      '<text x="96" y="210" fill="' + col(c[1]) + '" font-weight="700" font-size="16">' + c[1].t + '</text><text x="96" y="228" fill="var(--text-2)" font-size="11">' + c[1].d + '</text>' +
      '<text x="304" y="210" fill="' + col(c[2]) + '" font-weight="700" font-size="16">' + c[2].t + '</text><text x="304" y="228" fill="var(--text-2)" font-size="11">' + c[2].d + '</text></g></svg>';
    w.appendChild(U.h('div', { html: svg }));
  }
  else if (t === 'recon') {
    var col2 = function (title, rows) { return U.h('div', null, U.h('h4', null, title), rows.map(function (r) { return U.h('div', { class: 'r' }, r[0]); })); };
    w.appendChild(U.h('div', { class: 'recon' }, col2('Bank side', v.bank), col2('Book side', v.book), U.h('div', { class: 'adj' }, '= ' + v.adj + ' (both sides)')));
  }
  else if (t === 'tacct') {
    var side = function (arr) { return U.h('div', null, arr.map(function (x) { return U.h('span', null, U.h('span', null, x[0]), U.h('span', null, typeof x[1] === 'number' ? A.num(x[1]) : x[1])); })); };
    w.appendChild(U.h('div', { class: 'tacct' }, U.h('h4', null, v.name), U.h('div', { class: 'cols' }, side(v.left), side(v.right)), U.h('div', { class: 'end' }, 'Ending ' + (v.end ? A.num(v.end) : ''))));
  }
  return w;
};
/* sign chart: the number-line sign analysis. v = {type:'signs', pts:['−1','0'], rows:[{name:'f′(x)', s:['+','−','+'], at:['0','DNE'], mark:'arrow'|'cup'}], note} */
U.signChart = function (v) {
  var clean = function (t) { t = String(t).replace(/\$/g, '').trim(); return t === '-' ? '−' : t; };
  var MK = { arrow: { '+': '↗', '−': '↘' }, cup: { '+': '∪', '−': '∩' } };
  var tb = U.h('table', { class: 'signs' }), n = v.pts.length;
  var top = U.h('tr', null, U.h('th', null, ''));
  for (var i = 0; i <= n; i++) { top.appendChild(U.h('th', { class: 'iv' }, '')); if (i < n) top.appendChild(U.h('th', { class: 'pt' }, v.pts[i])); }
  tb.appendChild(U.h('thead', null, top));
  var body = U.h('tbody');
  v.rows.forEach(function (r) {
    var tr = U.h('tr', null, U.h('th', { class: 'nm' }, r.name));
    for (var i = 0; i <= n; i++) {
      var sg = clean(r.s[i]), mk = r.mark && MK[r.mark] ? MK[r.mark][sg] : '';
      tr.appendChild(U.h('td', { class: 'iv ' + (sg === '+' ? 'pos' : sg === '−' ? 'neg' : '') }, U.h('b', null, sg), mk ? U.h('span', { class: 'mk' }, ' ' + mk) : null));
      if (i < n) tr.appendChild(U.h('td', { class: 'pt' }, r.at && r.at[i] ? r.at[i] : '│'));
    }
    body.appendChild(tr);
  });
  tb.appendChild(body);
  var w = U.h('div', { class: 'tablewrap signwrap' }, tb);
  return v.note ? U.h('div', null, w, U.h('div', { class: 'small dim', style: { marginTop: '6px' } }, v.note)) : w;
};
/* graph: v = {type:'plot', xr:[a, b], yr:[c, d], f: function (x) {…}, asym:[{x:0} | {y:1} | {m:1, c:-1}], pts:[{x, y, label, open}], label}.
   The curve breaks at vertical asymptotes and wherever f is undefined. sm: a small version for answer choices. */
U.plot = function (v, sm) {
  var W = 320, H = sm ? 170 : 220, P = 8, x0 = v.xr[0], x1 = v.xr[1], y0 = v.yr[0], y1 = v.yr[1];
  var X = function (x) { return P + (x - x0) / (x1 - x0) * (W - 2 * P); }, Y = function (y) { return H - P - (y - y0) / (y1 - y0) * (H - 2 * P); };
  var r = function (n) { return Math.round(n * 10) / 10; }, esc = function (t) { return String(t).replace(/[$\\]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
  var g = '', id = 'pc' + Math.floor(Math.random() * 1e9);
  /* grid and ticks at integers when the range is small */
  var nice = function (span) { var raw = span / 7, p10 = Math.pow(10, Math.floor(Math.log10(raw))), k = raw / p10; return (k <= 1 ? 1 : k <= 2 ? 2 : k <= 5 ? 5 : 10) * p10; };
  var step = nice(x1 - x0), stepY = nice(y1 - y0), lab = function (n) { return String(Math.round(n * 1000) / 1000).replace('-', '−'); };
  for (var gi = Math.ceil(x0 / step), gx; (gx = gi * step) <= x1 + 1e-9; gi++) if (gi) g += '<line x1="' + r(X(gx)) + '" y1="' + P + '" x2="' + r(X(gx)) + '" y2="' + (H - P) + '" class="pg"/>' + ('<text x="' + r(X(gx)) + '" y="' + r(Math.min(H - P - 2, Math.max(P + 10, Y(0) + 12))) + '" class="pt" text-anchor="middle">' + lab(gx) + '</text>');
  for (var gj = Math.ceil(y0 / stepY), gy; (gy = gj * stepY) <= y1 + 1e-9; gj++) if (gj) g += '<line x1="' + P + '" y1="' + r(Y(gy)) + '" x2="' + (W - P) + '" y2="' + r(Y(gy)) + '" class="pg"/>' + ('<text x="' + r(Math.min(W - P - 4, Math.max(P + 4, X(0) - 4))) + '" y="' + r(Y(gy) + 4) + '" class="pt" text-anchor="end">' + lab(gy) + '</text>');
  if (y0 < 0 && y1 > 0) g += '<line x1="' + P + '" y1="' + r(Y(0)) + '" x2="' + (W - P) + '" y2="' + r(Y(0)) + '" class="pa"/>';
  if (x0 < 0 && x1 > 0) g += '<line x1="' + r(X(0)) + '" y1="' + P + '" x2="' + r(X(0)) + '" y2="' + (H - P) + '" class="pa"/>';
  var vx = [];
  (v.asym || []).forEach(function (a) {
    if (a.x !== undefined) { vx.push(a.x); g += '<line x1="' + r(X(a.x)) + '" y1="' + P + '" x2="' + r(X(a.x)) + '" y2="' + (H - P) + '" class="pd"/>'; }
    else { var m = a.y !== undefined ? 0 : a.m, c = a.y !== undefined ? a.y : a.c; g += '<line x1="' + r(X(x0)) + '" y1="' + r(Y(m * x0 + c)) + '" x2="' + r(X(x1)) + '" y2="' + r(Y(m * x1 + c)) + '" class="pd"/>'; }
  });
  /* the curve: sample, break at undefined points, vertical asymptotes and big jumps */
  var fs = v.fns || (v.f ? [v.f] : []);
  fs.forEach(function (f) {
    var d = '', pen = false, N = 600, py = null, lim = (y1 - y0) * 3;
    for (var i = 0; i <= N; i++) {
      var x = x0 + (x1 - x0) * i / N, y; try { y = f(x); } catch (e) { y = NaN; }
      var crossed = vx.some(function (a) { var xp = x0 + (x1 - x0) * (i - 1) / N; return i > 0 && ((xp - a) * (x - a) <= 0); });
      if (!isFinite(y) || crossed) { pen = false; py = null; continue; }
      var yc = Math.max(y0 - lim, Math.min(y1 + lim, y));
      if (py !== null && Math.abs(yc - py) > (y1 - y0) * 1.5) pen = false;
      d += (pen ? 'L' : 'M') + r(X(x)) + ' ' + r(Y(yc)); pen = true; py = yc;
    }
    g += '<path d="' + d + '" class="pc" clip-path="url(#' + id + ')"/>';
  });
  /* small versions (answer choices) leave out the marked points so the right choice does not stand out */
  (sm ? [] : v.pts || []).forEach(function (p) {
    g += '<circle cx="' + r(X(p.x)) + '" cy="' + r(Y(p.y)) + '" r="' + (sm ? 3 : 4) + '" class="' + (p.open ? 'po' : 'pp') + '"/>';
    if (p.label && !sm) { var right = p.side ? p.side === 'right' : X(p.x) < W * 0.62; g += '<text x="' + r(X(p.x) + (right ? 7 : -7)) + '" y="' + r(Y(p.y) + (p.below ? 15 : -7)) + '" class="pl" text-anchor="' + (right ? 'start' : 'end') + '">' + esc(p.label) + '</text>'; }
  });
  var svg = '<svg class="plot' + (sm ? ' sm' : '') + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(v.label || 'Graph') + '"><defs><clipPath id="' + id + '"><rect x="' + P + '" y="' + P + '" width="' + (W - 2 * P) + '" height="' + (H - 2 * P) + '"/></clipPath></defs>' + g + '</svg>';
  return U.h('div', { class: 'plotwrap', html: svg });
};
/* the reveal block for a question/result: rule, work, JE, per-option why */
U.optBody = function (item, i) {
  if (item.optsRaw && item.optsRaw[i] && Array.isArray(item.optsRaw[i])) return U.jeTable(item.optsRaw[i], { sm: true });
  var o = String(item.options[i]); return U.h('span', { class: o.indexOf('\n') >= 0 ? 'optpre' : null }, o);
};
U.letters = ['A', 'B', 'C', 'D'];
U.revealBlock = function (item, chosen) {
  var out = U.h('div', { class: 'reveal' });
  out.appendChild(U.h('div', null, U.h('div', { class: 'lab' }, 'Answer'), U.h('div', null, U.h('b', null, U.letters[item.answer] + '. '), item.optsRaw ? U.optBody(item, item.answer) : item.options[item.answer])));
  if (item.rule) out.appendChild(U.h('div', null, U.h('div', { class: 'lab' }, 'Rule'), item.rule));
  if (item.work) out.appendChild(U.h('div', null, U.h('div', { class: 'lab' }, 'Work'), U.h('div', { class: 'mono', style: { fontSize: '14px', overflowWrap: 'anywhere' } }, item.work)));
  if (item.je) out.appendChild(U.jeTable(item.je));
  var whys = []; item.why.forEach(function (w, i) { if (w && i !== item.answer) whys.push(U.h('div', { class: 'why-i' }, U.h('b', null, U.letters[i] + ': '), w)); });
  if (whys.length) out.appendChild(U.h('div', null, U.h('div', { class: 'lab' }, 'Why the others miss'), whys));
  return out;
};
