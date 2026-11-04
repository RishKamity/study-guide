/* session.js — Endless / topic drill / misses: adaptive question stream. */
U.views.session = { tab: 'endless', render: function (main, p) {
  var st0 = A.store.state, lastSkill = null, stats = { n: 0, c: 0 }, includeNew = !!p.includeNew, cur = null;
  /* keep the current question across tab switches and reloads (one place per stream) */
  var pkey = 'session:' + (p.onlyMisses ? 'misses' : (p.topics ? 'topics:' + p.topics.join(',') : 'endless')), saved = U.place.get(pkey);
  if (saved) { stats = saved.stats || stats; lastSkill = saved.lastSkill || null; if (saved.includeNew !== undefined && !p.includeNew) includeNew = !!saved.includeNew; }
  function persist(q) { U.place.set(pkey, { id: cur ? cur.id : null, stats: stats, lastSkill: lastSkill, chapter: chapter, includeNew: includeNew, q: q || null }); }
  var area = U.h('div'), counters = U.h('div', { class: 'counter' });
  var chips = U.h('div', { class: 'row' });
  var head = U.h('div', { class: 'stack' }, U.h('div', { class: 'qhead' }, U.h('div', null, U.h('div', { class: 'eyebrow' }, p.onlyMisses ? 'Misses' : (p.topics ? 'Topic drill' : 'Endless')), U.h('h1', { class: 'h2' }, p.title || 'Endless practice')), counters), p.noFilter ? null : chips);
  main.appendChild(U.h('div', { class: 'stack' }, head, area));
  var chapter = p.chapter || (saved && saved.chapter) || 0;
  function paintCounters() { var s = A.store.state; U.clear(counters); counters.appendChild(U.h('span', null, 'Session ', U.h('b', null, stats.c + '/' + stats.n))); counters.appendChild(U.h('span', null, 'Streak ', U.h('b', null, s.streak.cur))); counters.appendChild(U.h('span', null, 'Misses ', U.h('b', null, A.activeMisses(s).length))); }
  function paintChips() {
    U.clear(chips); if (p.onlyMisses || p.topics) return;
    U.unitChips(true).forEach(function (c) { chips.appendChild(U.h('button', { class: 'btn sm ' + ((chapter === c[1]) ? '' : 'ghost'), onclick: function () { chapter = c[1]; paintChips(); next(); } }, c[0])); });
    chips.appendChild(U.h('label', { class: 'small muted', style: { display: 'flex', gap: '6px', alignItems: 'center' } }, U.h('input', { type: 'checkbox', checked: includeNew ? true : null, onchange: function (e) { includeNew = e.target.checked; next(); } }), 'Include topics I have not started'));
  }
  function getItem() {
    var o = { lastSkill: lastSkill, includeNew: includeNew };
    if (p.onlyMisses) o.onlyMisses = true; else if (p.topics) { o.topics = p.topics; o.includeNew = true; }
    if (chapter > 0) o.chapter = chapter; else if (chapter === -1) o.topics = A.TOPICS.filter(function (t) { return t.ch === 0; }).map(function (t) { return t.id; });
    var it = A.nextItem(o);
    if (!it && !p.onlyMisses && !includeNew) { o.includeNew = true; it = null; }
    return it;
  }
  function next() {
    U.clear(area); var it = getItem(); cur = null;
    if (!it) {
      if (p.onlyMisses) { area.appendChild(U.h('div', { class: 'card stack' }, U.h('h2', { class: 'h2' }, 'Misses queue is clear'), U.h('p', { class: 'muted' }, 'Nothing is waiting. Keep going with Endless or start the next station.'), U.h('button', { class: 'btn', onclick: function () { U.go('today'); } }, 'Back to Today'))); }
      else area.appendChild(U.h('div', { class: 'card stack' }, U.h('h2', { class: 'h2' }, 'Nothing in your pool yet'), U.h('p', { class: 'muted' }, 'Endless draws from topics you have started. Start a station on the Path, or tick “include topics I have not started”.'), U.h('button', { class: 'btn', onclick: function () { U.go('path'); } }, 'Open Path')));
      persist(null); paintCounters(); return;
    }
    lastSkill = it.skill; cur = it; persist(null); show(it, null);
  }
  function show(it, rq) {
    U.clear(area); cur = it;
    var answered = !!(rq && rq.answered);
    var skip = U.h('div', { class: 'skiprow' }, U.h('button', { class: 'btn ghost sm', type: 'button', title: 'Skip this question (no effect on your score)', onclick: function () { A.noteSeen(it); next(); } }, 'Skip \u2192'));
    var q = U.question(it, { label: 'Q' + (answered ? stats.n : stats.n + 1), restore: rq, onState: function (qs) { persist(qs); }, onAnswer: function (r) { stats.n++; if (r.correct) stats.c++; paintCounters(); skip.remove(); persist({ sel: r.chosen, conf: r.conf, correct: r.correct, answered: true }); }, onNext: next, nextLabel: 'Next question' });
    if (answered) skip.remove();
    area.appendChild(U.h('div', { class: 'card' }, q, answered ? null : skip)); U.keyFn = function (e) { if (!q.keys(e) && skip.isConnected && e.key.toLowerCase() === 'n') { A.noteSeen(it); next(); } }; paintCounters();
  }
  paintChips(); paintCounters();
  var resumed = null; if (saved && saved.id) { try { resumed = A.makeItem(saved.id); } catch (e) { resumed = null; } }
  if (resumed) show(resumed, saved.q); else next();
  return function () { U.keyFn = null; };
} };
