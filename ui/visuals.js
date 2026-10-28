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
  else if (t === 'twocol') w.appendChild(U.h('div', { class: 'twocol' }, [v.left, v.right].map(function (c) { return U.h('div', null, U.h('h4', null, c.title), U.h('ul', null, c.items.map(function (i) { return U.h('li', null, i); }))); })));
  else if (t === 'stack') w.appendChild(U.h('div', { class: 'stackv' }, v.tiers.map(function (x, i) { return U.h('div', { style: { width: (62 + i * 9) + '%', borderColor: i === v.tiers.length - 1 ? 'var(--accent)' : '' } }, U.h('b', null, x.n), U.h('span', null, x.d)); })));
  else if (t === 'layers') {
    var mx = Math.max.apply(null, v.layers.map(function (l) { return l.u; }));
    w.appendChild(U.h('div', { class: 'layersv' }, v.layers.map(function (l) {
      var sold = l.sold || 0, left = l.u - sold;
      return U.h('div', { class: 'lrow' }, U.h('div', { class: 'ln' }, l.n), U.h('div', { class: 'lbarw' }, U.h('div', { class: 'lbar', style: { width: (l.u / mx * 100) + '%' } }, sold ? U.h('i', { class: 'ls', style: { flex: sold } }, sold + ' sold') : null, left ? U.h('i', { class: 'lk', style: { flex: left } }, left + ' left') : null)), U.h('div', { class: 'lc' }, l.u + ' × $' + l.c));
    })));
    w.appendChild(U.h('div', { class: 'small dim', style: { marginTop: '6px' } }, [U.h('span', { class: 'lgd ls' }), ' in COGS   ', U.h('span', { class: 'lgd lk' }), ' in ending inventory', v.note ? '. ' + v.note : '']));
  }
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
/* the reveal block for a question/result: rule, work, JE, per-option why */
U.optBody = function (item, i) {
  if (item.optsRaw && item.optsRaw[i] && Array.isArray(item.optsRaw[i])) return U.jeTable(item.optsRaw[i], { sm: true });
  return U.h('span', null, item.options[i]);
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
