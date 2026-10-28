/* views.js — Today, Path, Drill (topic / misses / flashcards), Ref. */
(function () {
  var h = U.h;
  function topicTitle(id) { var t = A.TOPIC[id]; return t ? t.id + ' · ' + t.title : id; }
  function seqTitle(it) { return it.title || (A.TOPIC[it.id] ? A.TOPIC[it.id].title : it.id); }
  function seqSub(it) {
    if (it.type === 'station' || it.type === 'drill') return A.CHAPTERS[A.TOPIC[it.id].ch] + ' · ' + it.mins + ' min' + (it.type === 'drill' ? ' of practice' : '');
    return it.mins + ' min';
  }

  function planCard(s, now) {
    var plan = A.plan(now, s), card = h('div', { class: 'card stack' }), hr = new Date(now).getHours();
    var stop = plan.stop, when = function (t) { return A.fmtWhen(t); };
    if (now >= A.EXAM_AT) { card.appendChild(h('div', null, h('div', { class: 'eyebrow' }, 'Exam'), h('div', { class: 'h2' }, 'Good luck'))); return card; }
    if (now >= stop) { card.appendChild(h('div', null, h('div', { class: 'eyebrow' }, 'Study time is over'), h('div', { class: 'h2' }, 'Light review only'), h('p', { class: 'muted small', style: { marginTop: '4px' } }, 'Read the walk-in sheet, eat, and head over. ' + ((A.COURSE.walkIn && A.COURSE.walkIn.travel) || '')))); return card; }
    if (plan.cur) card.appendChild(h('div', null, h('div', { class: 'eyebrow' }, plan.cur.extra ? 'Extra session' : 'Now'), h('div', { class: 'h2' }, 'Study until ' + when(plan.cur.end))));
    else if (hr >= 23 || hr < 7) card.appendChild(h('div', null, h('div', { class: 'eyebrow' }, 'Now'), h('div', { class: 'h2' }, 'Sleep'), h('p', { class: 'muted small', style: { marginTop: '4px' } }, 'Sleep is when today’s work sticks.' + (plan.next ? ' Next session ' + when(plan.next.start) + '.' : ''))));
    else if (plan.next) card.appendChild(h('div', null, h('div', { class: 'eyebrow' }, 'Break'), h('div', { class: 'h2' }, 'Next session ' + when(plan.next.start))));
    if (plan.fits) card.appendChild(h('p', { class: 'muted small' }, plan.finishAt ? 'On pace: the plan finishes by ' + when(plan.finishAt) + ', before your stop time of ' + when(stop) + '.' : 'Everything on the plan is done.'));
    else {
      var sk = plan.trimmed.filter(function (x) { return x.skim && !x.drop; }), dr = plan.trimmed.filter(function (x) { return x.drop; });
      var nm = function (x) { return x.item.id && A.TOPIC[x.item.id] ? x.item.id : (x.item.title || x.item.id); };
      card.appendChild(h('div', { class: 'callout warn' }, 'Re-planned to fit the time left. ' + (sk.length ? 'Practice only (no lesson): ' + sk.map(nm).join(', ') + '. ' : '') + (dr.length ? 'Skipped (lowest weight): ' + dr.map(nm).join(', ') + '. ' : '') + 'The dress rehearsal stays.'));
    }
    return card;
  }
  function accuracyCard(s) {
    var tot = 0, n = 0; A.TOPICS.forEach(function (t) { if (!t.exam) return; var ts = A.topicStat(t.id, s); if (ts.n) { tot += ts.p * t.exam; n += t.exam; } });
    return h('div', { class: 'card stack' }, h('div', { class: 'eyebrow' }, 'Recent accuracy'), h('div', { class: 'big' }, n ? Math.round(100 * tot / n) + '%' : '—'), h('p', { class: 'muted small' }, n ? 'Weighted by how many exam questions each practiced topic carries.' : 'Answer a few questions to see it.'));
  }
  U.views.today = { tab: 'today', hash: 'today', live: true, render: function (main) {
    var s = A.store.state, now = Date.now(), nx = A.nextSeq(s), C = A.COURSE, F = A.FEAT;
    var clock = h('div', { class: 'clock' }), tm = null;
    function paintClock() {
      var ms = A.EXAM_AT - Date.now(); U.clear(clock);
      if (ms <= 0) { clock.appendChild(h('b', null, 'Exam time')); return; }
      var d = Math.floor(ms / 864e5), hh = Math.floor(ms % 864e5 / 36e5), mm = Math.floor(ms % 36e5 / 6e4), ss = Math.floor(ms % 6e4 / 1000);
      [[d, 'days'], [hh, 'hours'], [mm, 'min'], [ss, 'sec']].forEach(function (x) { clock.appendChild(h('div', null, h('b', null, String(x[0]).padStart(2, '0')), h('span', null, x[1]))); });
    }
    paintClock(); tm = setInterval(paintClock, 1000);
    var whenTxt = new Date(A.EXAM_AT).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    var hero = h('div', { class: 'card stack' }, h('div', { class: 'eyebrow' }, [C.course, C.exam, whenTxt, C.where].filter(Boolean).join(' · ')), clock);
    var go = nx ? h('div', { class: 'card stack', style: { borderColor: 'var(--accent)' } }, h('div', { class: 'eyebrow' }, 'Continue'), h('div', { class: 'h2' }, seqTitle(nx.item)), h('p', { class: 'muted small' }, seqSub(nx.item)), h('button', { class: 'btn block', onclick: function () { U.openSeq(nx.item); } }, 'Continue'))
      : h('div', { class: 'card stack' }, h('div', { class: 'h2' }, 'Core path complete'), h('p', { class: 'muted' }, 'Keep practicing in Endless' + (F.drills ? ', or work your weak spots in Drill.' : '.')), h('button', { class: 'btn', onclick: function () { U.go('session', { title: 'Endless practice' }); } }, 'Open Endless'));
    var due = A.dueMisses(s).length, act = A.activeMisses(s).length;
    var predCard = F.score ? U.scoreCard() : accuracyCard(s);
    var missCard = F.drills ? h('div', { class: 'card stack' }, h('div', { class: 'eyebrow' }, 'Misses queue'), h('div', { class: 'big' }, act), h('p', { class: 'muted small' }, due ? due + ' due now.' : (act ? 'None due yet.' : 'Clean.')), act ? h('button', { class: 'btn ghost sm', onclick: function () { U.go('session', { title: 'Clear your Misses', onlyMisses: true }); } }, 'Clear misses') : null) : null;
    var heat = h('div', { class: 'heat' });
    A.TOPICS.filter(function (t) { return t.exam; }).forEach(function (t) {
      var ts = A.topicStat(t.id, s), ok = F.stations ? !!A.STATIONS[t.id] : A.topicSkillIds(t.id).length > 0;
      heat.appendChild(h('button', { class: (ts.state === 'new' ? '' : ts.state) + (ok ? '' : ' na'), title: t.title + ' · ' + A.stateLabel[ts.state], onclick: function () { if (!ok) return; if (F.stations) U.go('station', { id: t.id }); else U.go('session', { title: t.title, topics: [t.id], noFilter: true }); } }, t.id));
    });
    var facts = (C.facts || []).length ? h('div', { class: 'card stack' }, h('div', { class: 'eyebrow' }, 'Exam facts'), h('ul', { class: 'small muted', style: { margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' } }, C.facts.map(function (f) { return h('li', null, f); }))) : null;
    var oh = null; (C.officeHours || []).forEach(function (o) { if (!oh && now < Date.parse(o.end)) oh = h('div', { class: 'card stack' }, h('div', { class: 'eyebrow' }, 'Office hours'), h('p', { class: 'small' }, o.text), officeList(s)); });
    var daily = U.dailyCard ? U.dailyCard() : null;
    main.appendChild(h('div', { class: 'stack' }, hero, planCard(s, now), daily, oh, go, predCard, missCard, h('div', { class: 'card stack' }, h('div', { class: 'eyebrow' }, 'Topic map'), heat, h('p', { class: 'small dim' }, 'Red is learning, amber is shaky, green is solid. Grey is untouched.')), facts));
    return function () { clearInterval(tm); };
  } };

  U.views.path = { tab: 'path', hash: 'path', live: true, render: function (main) {
    var s = A.store.state, nx = A.nextSeq(s), list = h('div', { class: 'stack' }), plan = A.plan(Date.now(), s);
    var lastG = null, ul = null;
    function groupOf(it) { if (it.optional) return 'opt:' + it.group; if (it.unit !== undefined) return 'u:' + it.unit; return 'end'; }
    function labelOf(g) { if (g.indexOf('opt:') === 0) return A.OPT_LABEL[g.slice(4)] || 'Optional'; if (g.indexOf('u:') === 0) return A.CHAPTERS[+g.slice(2)] || g.slice(2); return 'Final review'; }
    A.SEQ.forEach(function (it) {
      var g = groupOf(it); if (g !== lastG) { lastG = g; list.appendChild(h('div', { class: 'eyebrow', style: { marginTop: '18px' } }, labelOf(g))); ul = h('ul', { class: 'plist' }); list.appendChild(ul); }
      var done = A.seqDone(it, s), avail = A.isAvail(it), next = nx && nx.item === it, slot = plan.slotOf(it), tr = plan.trimOf(it);
      var ts = (it.type === 'station' || it.type === 'drill') ? A.topicStat(it.id, s) : null;
      var when = done ? '' : tr && tr.drop ? ' · skipped to fit time' : slot && slot.start ? ' · planned ' + A.fmtWhen(slot.start) + (slot.skim ? ' (practice only)' : '') : '';
      ul.appendChild(h('li', { class: (done ? 'done ' : '') + (next ? 'next' : '') }, h('button', { disabled: !avail ? true : null, onclick: function () { U.openSeq(it); } },
        h('span', { class: 'ic' }, done ? '✓' : ((it.type === 'station' || it.type === 'drill') ? it.id : '■')), h('span', { class: 't' }, h('b', null, seqTitle(it)), h('span', null, seqSub(it) + when)),
        ts && ts.state !== 'new' ? h('span', { class: 'pill ' + ts.state }, A.stateLabel[ts.state]) : null)));
    });
    main.appendChild(h('div', { class: 'stack' }, h('h1', { class: 'h1' }, 'Your path'), h('p', { class: 'muted' }, 'Ordered by the exam blueprint and re-planned from now every time you open it. Tap any step to open it.'), list));
  } };

  U.views.drill = { tab: 'drill', hash: 'drill', live: true, render: function (main) {
    var s = A.store.state, act = A.activeMisses(s).length, due = A.dueMisses(s).length, F = A.FEAT;
    var sel = h('select', { style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px', font: 'inherit', width: '100%' } });
    A.TOPICS.filter(function (t) { return A.topicSkillIds(t.id).length; }).forEach(function (t) { sel.appendChild(h('option', { value: t.id }, topicTitle(t.id))); });
    var dueCards = A.cardQueue(s).length;
    main.appendChild(h('div', { class: 'stack' }, h('h1', { class: 'h1' }, 'Drill'),
      h('div', { class: 'card stack' }, h('div', { class: 'h3' }, 'Topic drill'), h('p', { class: 'muted small' }, 'Questions on one topic only, with instant feedback.'), sel, h('button', { class: 'btn', onclick: function () { U.go('session', { title: topicTitle(sel.value), topics: [sel.value], noFilter: true }); } }, 'Start drill')),
      F.drills ? h('div', { class: 'card stack' }, h('div', { class: 'h3' }, 'Misses'), h('p', { class: 'muted small' }, act ? act + ' in the queue, ' + due + ' due now. They leave after two correct answers in a row.' : 'Nothing in the queue.'), h('button', { class: 'btn', disabled: act ? null : true, onclick: function () { U.go('session', { title: 'Clear your Misses', onlyMisses: true }); } }, 'Clear misses')) : null,
      F.drills && (A.FLASHCARDS || []).length ? h('div', { class: 'card stack' }, h('div', { class: 'h3' }, 'Flashcards'), h('p', { class: 'muted small' }, dueCards + ' cards ready. Flip, then mark whether you knew it.'), h('button', { class: 'btn', onclick: function () { U.go('cards', {}); } }, 'Open flashcards')) : null,
      F.drills ? U.drillModes() : null,
      F.drills ? h('div', { class: 'card stack' }, h('div', { class: 'h3' }, 'Pins for the walk-in sheet'), pinList(s)) : null));
  } };
  function officeList(s) {
    var q = s.office || []; if (!q.length) return null;
    return h('div', { class: 'stack' }, h('div', { class: 'lab' }, 'Saved for office hours'), h('ul', { class: 'small', style: { margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' } }, q.map(function (x) { return h('li', null, x.q + ' ', h('button', { class: 'btn ghost sm', onclick: function () { A.store.mutate(function (st) { st.office = (st.office || []).filter(function (y) { return y.q !== x.q; }); }); } }, 'Remove')); })));
  }
  /* predicted score card: big number, change today, graph, per-chapter, biggest gains */
  U.scoreCard = function () {
    var sc = A.score.now(), pred = A.predicted(), ser = A.score.series(160), now = Date.now();
    var dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0); var startToday = A.score.at(dayStart.getTime()), dToday = sc.pct - startToday;
    var svg = null;
    if (ser.length > 1) {
      var W = 300, H = 56, xs = ser.map(function (p) { return p[0]; }), ys = ser.map(function (p) { return p[1]; }), x0 = xs[0], x1 = xs[xs.length - 1] || x0 + 1, y0 = Math.min.apply(null, ys) - 1, y1 = Math.max.apply(null, ys) + 1;
      var pts = ser.map(function (p, i) { var x = ser.length === 1 ? 0 : W * i / (ser.length - 1), y = H - (H - 4) * (p[1] - y0) / (y1 - y0) - 2; return x.toFixed(1) + ',' + y.toFixed(1); }).join(' ');
      svg = h('div', { class: 'spark', html: '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Predicted score over time"><polyline fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" points="' + pts + '"/></svg>' });
    }
    var chRow = h('div', { class: 'chscores' }); A.UNITS.forEach(function (c) { if (sc.ch[c] === undefined) return; chRow.appendChild(h('div', null, h('small', null, A.unitShort(c)), h('b', null, sc.ch[c].toFixed(2) + '%'), h('i', { style: { width: Math.max(2, sc.ch[c]) + '%' } }))); });
    var gains = A.score.gains().slice(0, 3), gl = h('div', { class: 'stack', style: { gap: '6px' } });
    gains.forEach(function (g) { var t = A.TOPIC[g.id]; gl.appendChild(h('button', { class: 'gainrow', type: 'button', onclick: function () { U.go('session', { title: t.title, topics: [g.id], noFilter: true }); } }, h('span', null, g.id + ' \u00B7 ' + t.title), h('b', null, 'up to +' + g.gain.toFixed(2) + '%'))); });
    return h('div', { class: 'card stack scorecard' },
      h('div', { class: 'row', style: { justifyContent: 'space-between', alignItems: 'baseline' } }, h('div', { class: 'eyebrow' }, 'Predicted score'), Math.abs(dToday) >= 0.005 ? h('span', { class: 'sd ' + (dToday > 0 ? 'up' : 'down') }, (dToday > 0 ? '\u25B2 +' : '\u25BC \u2212') + Math.abs(dToday).toFixed(2) + ' today') : null),
      h('div', { class: 'big scorebig' }, sc.pct.toFixed(2), h('span', null, '%')),
      svg, chRow,
      h('p', { class: 'muted small' }, 'Rough range ' + pred.lo.toFixed(0) + '\u2013' + pred.hi.toFixed(0) + '%. Hard questions right move it most. Easy ones barely move it, and misses pull it down. Full mocks recalibrate it.'),
      h('div', { class: 'eyebrow' }, 'Biggest gains available'), gl);
  };
  A.MOCK_N = A.TOPICS.reduce(function (n, t) { return n + (A.UNITS.indexOf(t.ch) >= 0 ? (t.exam || 0) : 0); }, 0);
  var SAMPLE_T = (A.COURSE.sample && A.COURSE.sample.title) || 'Sample exam';
  function pinList(s) {
    var ids = Object.keys(s.pins || {}).filter(function (id) { return id.indexOf('s:') !== 0 || (s.sample && s.sample.unlocked); }); if (!ids.length) return h('p', { class: 'muted small' }, 'Questions you got wrong while sure of yourself are pinned here.');
    var rows = []; ids.slice(-12).reverse().forEach(function (id) { try { var it = A.makeItem(id); rows.push([it.topic, it.rule || it.work]); } catch (e) {} });
    return rows.length ? U.dataTable({ head: ['Topic', 'Rule to remember'], rows: rows }) : h('p', { class: 'muted small' }, 'None.');
  }

  /* flashcards (Leitner-ish) */
  A.cardQueue = function (s, ch) {
    var now = Date.now();
    return (A.FLASHCARDS || []).filter(function (c) { if (ch && c.ch !== ch) return false; if (c.sample && !(s.sample && s.sample.unlocked)) return false; var st = s.cards[c.id]; return !st || st.due <= now; }).sort(function (a, b) { var sa = s.cards[a.id], sb = s.cards[b.id]; return (sa ? sa.due : 0) - (sb ? sb.due : 0); });
  };
  U.views.cards = { tab: 'drill', render: function (main, p) {
    var ch = p.ch || 0, flipped = false, area = h('div', { class: 'stack' });
    var chips = h('div', { class: 'row' });
    main.appendChild(h('div', { class: 'stack' }, h('button', { class: 'btn ghost sm', style: { alignSelf: 'flex-start' }, onclick: function () { U.go('drill'); } }, '← Drill'), h('h1', { class: 'h1' }, 'Flashcards'), chips, area));
    function paintChips() { U.clear(chips); U.unitChips().forEach(function (c) { var n = A.cardQueue(A.store.state, c[1]).length; chips.appendChild(h('button', { class: 'btn sm ' + (ch === c[1] ? '' : 'ghost'), onclick: function () { ch = c[1]; paintChips(); next(); } }, c[0] + ' (' + n + ')')); }); }
    function mark(c, knew) {
      A.store.mutate(function (s) { var st = s.cards[c.id] || { box: 0, due: 0, at: 0 }; st.box = knew ? Math.min(st.box + 1, 4) : 0; st.due = Date.now() + (knew ? [0, 3600e3, 6 * 3600e3, 24 * 3600e3, 72 * 3600e3][st.box] : 0); st.at = Date.now(); s.cards[c.id] = st; });
      paintChips(); next();
    }
    function next() {
      U.clear(area); flipped = false; var q = A.cardQueue(A.store.state, ch); var c = q[0];
      if (!c) { area.appendChild(h('div', { class: 'card stack' }, h('h2', { class: 'h2' }, 'All caught up'), h('p', { class: 'muted' }, 'No cards are due in this set. Missed cards return right away.'))); return; }
      var face = h('div', { class: 'face', role: 'button', tabindex: '0', onclick: flip }, c.front), btns = h('div', { class: 'row hide' });
      function flip() { if (flipped) return; flipped = true; face.className = 'face back'; U.clear(face); face.appendChild(h('div', null, h('div', { class: 'eyebrow', style: { marginBottom: '6px' } }, c.front), c.back)); btns.classList.remove('hide'); }
      btns.appendChild(h('button', { class: 'btn ghost', style: { flex: 1 }, onclick: function () { mark(c, false); } }, 'Missed it'));
      btns.appendChild(h('button', { class: 'btn', style: { flex: 1 }, onclick: function () { mark(c, true); } }, 'Knew it'));
      area.appendChild(h('div', { class: 'eyebrow' }, A.unitShort(c.ch) + ' · ' + q.length + ' ready')); area.appendChild(h('div', { class: 'flash' }, face)); area.appendChild(btns);
      U.keyFn = function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } else if (flipped && (e.key === 'ArrowRight' || e.key.toLowerCase() === 'k')) mark(c, true); else if (flipped && (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'm')) mark(c, false); };
    }
    paintChips(); next(); return function () { U.keyFn = null; };
  } };

  U.views.ref = { tab: 'ref', hash: 'ref', render: function (main) {
    var box = h('div', { class: 'ref', html: A.REF_HTML || '<p>Not available.</p>' }), q = h('input', { type: 'search', placeholder: 'Filter the sheet (e.g. NSF, petty, FIFO)', 'aria-label': 'Filter the sheet' });
    q.addEventListener('input', function () {
      var v = q.value.trim().toLowerCase();
      Array.prototype.forEach.call(box.querySelectorAll('tbody tr'), function (r) { r.classList.toggle('hide', !!v && r.textContent.toLowerCase().indexOf(v) < 0); });
    });
    box.querySelectorAll('table').forEach(function (t) { var w = document.createElement('div'); w.className = 'tw'; t.parentNode.insertBefore(w, t); w.appendChild(t); });
    main.appendChild(h('div', { class: 'stack' }, h('h1', { class: 'h1' }, 'Formula and journal entry sheet'), h('p', { class: 'muted small' }, 'Built from the Ch 4 to 7 notes packets and extra practice. Use it as a reference while you study, then practice recalling it.'), q, box, h('button', { class: 'btn ghost', onclick: function () { U.go('sheet'); } }, 'Open the walk-in sheet'), U.dataCard()));
  } };

  U.views.mock = { tab: 'mock', hash: 'mock', live: true, render: function (main) {
    var s = A.store.state, now = Date.now();
    function mockCard(key, note) {
      var m = A.MOCKS[key], rec = s.mocks[key], p = { id: key, title: m.title, minutes: A.COURSE.format.minutes, kind: 'mock', mockKey: key }, card = h('div', { class: 'card stack' });
      card.appendChild(h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('div', null, h('div', { class: 'eyebrow' }, A.MOCK_N + ' questions · ' + A.COURSE.format.minutes + ' minutes'), h('div', { class: 'h2' }, m.title)), rec && rec.submittedAt ? h('div', { class: 'big', style: { fontSize: '26px' } }, rec.score + '/' + rec.total) : null));
      card.appendChild(h('p', { class: 'muted small' }, m.blurb + (note ? ' ' + note : '')));
      if (rec && rec.submittedAt) card.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn', onclick: function () { U.go('exam', p); } }, 'View results'), h('span', { class: 'muted small' }, Math.round(rec.score / rec.total * 100) + '% · ' + new Date(rec.submittedAt).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }))));
      else if (rec && rec.startedAt) { var left = Math.max(0, rec.minutes * 60 - (now - rec.startedAt) / 1000); card.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn', onclick: function () { U.go('exam', Object.assign({}, p, { autostart: true })); } }, 'Resume'), h('span', { class: 'muted small' }, 'In progress · ' + U.fmtTime(left) + ' left'))); }
      else card.appendChild(h('button', { class: 'btn', onclick: function () { U.go('exam', p); } }, 'Start ' + m.title));
      return card;
    }
    var unlock = A.sampleUnlock(s, now), att = s.sample.attempts || [], srec = s.mocks.sample, sp = { id: 'sample', title: SAMPLE_T, minutes: A.COURSE.format.minutes, kind: 'sample', fixed: A.SAMPLE.map(function (q) { return 's:' + q.n; }) };
    var sc = h('div', { class: 'card stack', style: unlock.ok ? { borderColor: 'var(--accent)' } : {} });
    sc.appendChild(h('div', { class: 'eyebrow' }, 'Official sample · your dress rehearsal'));
    sc.appendChild(h('div', { class: 'h2' }, SAMPLE_T));
    if (!unlock.ok) {
      sc.appendChild(h('p', { class: 'muted small' }, 'Sealed so your first attempt is an honest, unseen run. ' + unlock.why));
      var conf = h('div', { class: 'stack' }), ub = h('button', { class: 'btn ghost sm', style: { alignSelf: 'flex-start' }, onclick: function () {
        U.clear(conf); conf.appendChild(h('div', { class: 'callout warn' }, 'You get one clean first attempt. Start now?')); conf.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: function () { A.store.mutate(function (x) { x.sample.unlocked = true; x.sample.updatedAt = Date.now(); }); } }, 'Yes, unlock it'), h('button', { class: 'btn ghost sm', onclick: function () { U.clear(conf); } }, 'Not yet')));
      } }, 'Unlock anyway'); sc.appendChild(ub); sc.appendChild(conf);
    } else {
      var inprog = srec && srec.startedAt && !srec.submittedAt;
      sc.appendChild(h('p', { class: 'muted small' }, att.length ? 'Your first attempt is the official score. Retakes are allowed and marked as retakes.' : 'Unlocked (' + unlock.why + '). Treat this as the real thing: 50 minutes, no help.'));
      if (att.length) sc.appendChild(h('ul', { class: 'small', style: { margin: 0, paddingLeft: '18px' } }, att.map(function (a, i) { return h('li', null, (a.official ? 'Official: ' : 'Retake ' + i + ': ') + a.c + '/' + a.n + ' (' + Math.round(a.c / a.n * 100) + '%)'); })));
      if (inprog) sc.appendChild(h('button', { class: 'btn', onclick: function () { U.go('exam', Object.assign({}, sp, { autostart: true })); } }, 'Resume (' + U.fmtTime(Math.max(0, srec.minutes * 60 - (now - srec.startedAt) / 1000)) + ' left)'));
      else {
        var btns = h('div', { class: 'row' });
        if (att.length) btns.appendChild(h('button', { class: 'btn', onclick: function () { U.go('exam', sp); } }, 'View results'));
        btns.appendChild(h('button', { class: 'btn ' + (att.length ? 'ghost' : ''), onclick: function () { U.go('exam', Object.assign({}, sp, { retake: !!att.length, autostart: false })); } }, att.length ? 'Retake' : 'Start Sample Exam 2'));
        sc.appendChild(btns);
      }
    }
    main.appendChild(h('div', { class: 'stack' }, h('h1', { class: 'h1' }, 'Mock exams'), h('p', { class: 'muted' }, 'Three generated ' + A.MOCK_N + '-question mocks on the exact blueprint, plus the official sample. Paper-style, 50 minutes, no feedback until you submit.'),
      mockCard('mockA', 'Take it right after the Chapter 7 stations.'), sc, mockCard('mockB', 'Best after the dress rehearsal, if time allows or a score is under 85%.'), mockCard('mockC', 'Offered if A or B is under 80%.')));
  } };
})();
