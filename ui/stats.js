/* stats.js — Stats tab: totals from the answer history (score events) and the saved state. Read-only. */
(function () {
  var h = U.h;
  function dayKey(t) { var d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function tile(label, value, sub) { return h('div', { class: 'stile' }, h('small', null, label), h('b', null, value), sub ? h('span', null, sub) : null); }
  function bar(p) { return h('div', { class: 'bar' }, h('div', { style: { width: Math.max(0, Math.min(100, p)) + '%', height: '100%', background: 'var(--accent)' } })); }
  function fmtMin(m) { return m < 60 ? Math.round(m) + ' min' : Math.floor(m / 60) + ' h ' + Math.round(m % 60) + ' min'; }
  A.statsOf = function (st, evs, now) {
    now = now || Date.now();
    var ev = (evs || []).filter(function (e) { return e[2] !== '*'; }).slice().sort(function (a, b) { return a[1] - b[1]; });
    var right = 0, days = {}, per = {}, mins = 0, today = dayKey(now), todayN = 0;
    ev.forEach(function (e, i) {
      if (e[4] === 1) right++;
      var k = dayKey(e[1]); days[k] = (days[k] || 0) + 1; if (k === today) todayN++;
      var p = per[e[2]] || (per[e[2]] = [0, 0]); p[0]++; if (e[4] === 1) p[1]++;
      var gap = i ? (e[1] - ev[i - 1][1]) / 6e4 : 0.5; mins += gap > 10 ? 0.5 : Math.min(gap, 1.5);   /* breaks over 10 min don't count */
    });
    var streak = 0, d = new Date(now); if (!days[dayKey(d)]) d.setDate(d.getDate() - 1);
    while (days[dayKey(d)]) { streak++; d.setDate(d.getDate() - 1); }
    var stIds = Object.keys(A.STATIONS || {}), skIds = Object.keys(A.skills || {}).filter(function (k) { var t = A.TOPIC[A.skills[k].topic]; return t && t.exam; });
    var ms = Object.keys(st.misses || {}).map(function (k) { return st.misses[k]; });
    var cards = Object.keys(st.cards || {}).map(function (k) { return st.cards[k]; });
    var mocks = Object.keys(st.mocks || {}).map(function (k) { var r = st.mocks[k]; return r && r.submittedAt && r.total ? { id: k, title: r.title || k, score: r.score, total: r.total, at: r.submittedAt } : null; }).filter(Boolean).sort(function (a, b) { return a.at - b.at; });
    return {
      answered: ev.length, right: right, wrong: ev.length - right, acc: ev.length ? 100 * right / ev.length : null, today: todayN,
      days: Object.keys(days).length, dayStreak: streak, byDay: days, minutes: mins, per: per,
      lessonsDone: stIds.filter(function (id) { return A.stationDone(id, st); }).length, lessonsStarted: stIds.filter(function (id) { return A.stationStarted(id, st); }).length, lessons: stIds.length,
      mastered: skIds.filter(function (k) { return A.skillMastered(k, st); }).length, skills: skIds.length,
      missOpen: ms.filter(function (m) { return !m.done; }).length, missCleared: ms.filter(function (m) { return m.done; }).length,
      cards: cards.length, cardsKnown: cards.filter(function (c) { return c.box >= 1; }).length,
      bestStreak: (st.streak && st.streak.best) || 0, curStreak: (st.streak && st.streak.cur) || 0,
      daily: (st.settings && st.settings.daily) || null, mocks: mocks, firstOpen: st.firstOpen || null
    };
  };
  U.views.stats = { tab: 'stats', hash: 'stats', render: function (main) {
    var st = A.store.state, S = A.statsOf(st, A.score ? A.score.events() : []), now = Date.now();
    var wrap = h('div', { class: 'stack' });
    wrap.appendChild(h('div', null, h('div', { class: 'eyebrow' }, 'Stats'), h('h1', null, 'Your numbers')));
    if (!S.answered && !S.lessonsStarted) wrap.appendChild(h('p', { class: 'muted' }, 'Nothing yet. Answer a few questions and your numbers show up here.'));
    wrap.appendChild(h('div', { class: 'sgrid' },
      tile('Questions answered', String(S.answered), S.today ? S.today + ' today' : null),
      tile('Right', String(S.right)),
      tile('Wrong', String(S.wrong)),
      tile('Accuracy', S.acc === null ? '—' : S.acc.toFixed(1) + '%'),
      tile('Days studied', String(S.days), S.dayStreak > 1 ? S.dayStreak + ' days in a row' : null),
      tile('Practice time', fmtMin(S.minutes), 'about, from answer times'),
      tile('Best run', String(S.bestStreak), 'right in a row' + (S.curStreak ? ' · now ' + S.curStreak : '')),
      A.FEAT.daily ? tile('Daily puzzle', String(S.daily ? S.daily.streak || 0 : 0), 'day streak' + (S.daily && S.daily.best ? ' · best ' + S.daily.best : '')) : null));
    function prog(label, n, of, note) {
      return h('div', { class: 'stack', style: { gap: '6px' } }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', null, label), h('b', null, n + ' / ' + of)), bar(of ? 100 * n / of : 0), note ? h('small', { class: 'muted' }, note) : null);
    }
    var pc = h('div', { class: 'card stack' }, h('div', { class: 'eyebrow' }, 'Progress'));
    if (S.lessons) pc.appendChild(prog('Lessons completed', S.lessonsDone, S.lessons, S.lessonsStarted > S.lessonsDone ? (S.lessonsStarted - S.lessonsDone) + ' started, not finished' : null));
    pc.appendChild(prog('Question types mastered', S.mastered, S.skills, 'Mastered = 2 right in a row'));
    pc.appendChild(prog('Misses cleared', S.missCleared, S.missCleared + S.missOpen, S.missOpen ? S.missOpen + ' still in your misses queue' : null));
    if ((A.FLASHCARDS || []).length) pc.appendChild(prog('Flashcards you knew', S.cardsKnown, (A.FLASHCARDS || []).length, S.cards ? S.cards + ' reviewed' : null));
    wrap.appendChild(pc);
    /* last 14 days */
    var dc = h('div', { class: 'card stack' }, h('div', { class: 'eyebrow' }, 'Last 14 days')), cols = h('div', { class: 'sdays' }), mx = 1, list = [];
    for (var i = 13; i >= 0; i--) { var d = new Date(now); d.setDate(d.getDate() - i); var n = S.byDay[dayKey(d)] || 0; mx = Math.max(mx, n); list.push([d, n]); }
    list.forEach(function (x) { cols.appendChild(h('div', { title: x[0].toDateString() + ': ' + x[1] + ' answers' }, h('small', null, x[1] ? String(x[1]) : ''), h('i', { style: { height: (x[1] ? Math.max(6, 100 * x[1] / mx) : 2) + '%' } }), h('span', null, 'SMTWTFS'.charAt(x[0].getDay())))); });
    dc.appendChild(cols); wrap.appendChild(dc);
    /* mocks */
    if (S.mocks.length) {
      var mc = h('div', { class: 'card stack' }, h('div', { class: 'eyebrow' }, 'Mocks and timed sets'));
      S.mocks.forEach(function (m) { mc.appendChild(h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', null, m.title), h('b', null, m.score + '/' + m.total + ' · ' + Math.round(100 * m.score / m.total) + '%'))); });
      wrap.appendChild(mc);
    }
    /* per topic, weakest first. Topics with fewer than MIN answers sort last (too few to judge); ties go to the topic
       with more exam questions. Tapping a row opens that topic's lesson. */
    var MIN = 3, rows = A.TOPICS.filter(function (t) { return t.exam; }).map(function (t) { var p = S.per[t.id] || [0, 0]; return { t: t, n: p[0], acc: p[0] ? 100 * p[1] / p[0] : null }; });
    rows.sort(function (a, b) { var ea = a.n >= MIN, eb = b.n >= MIN; if (ea !== eb) return ea ? -1 : 1; if (!ea) return a.t.order - b.t.order; return a.acc - b.acc || (b.t.exam || 0) - (a.t.exam || 0) || a.t.order - b.t.order; });
    var tc = h('div', { class: 'card stack' }, h('div', { class: 'eyebrow' }, 'By topic · weakest first · tap one to open its lesson'));
    rows.forEach(function (r) {
      var has = !!A.STATIONS[r.t.id];
      tc.appendChild(h('button', { class: 'strow', type: 'button', title: has ? 'Open the ' + r.t.id + ' lesson' : 'Drill ' + r.t.id, onclick: function () { if (has) U.go('station', { id: r.t.id }); else U.go('session', { title: 'Weak spot ' + r.t.id, topics: [r.t.id], noFilter: true }); } }, h('span', { class: 'sn' }, r.t.id + ' · ' + r.t.title), h('div', null, r.acc === null ? h('div', { class: 'bar' }) : bar(r.acc)), h('span', { class: 'sv' }, r.n ? Math.round(r.acc) + '% of ' + r.n : '—')));
    });
    if (rows.some(function (r) { return r.n < MIN; })) tc.appendChild(h('small', { class: 'muted' }, 'Topics with fewer than ' + MIN + ' answers are listed last.'));
    wrap.appendChild(tc);
    if (S.firstOpen) wrap.appendChild(h('p', { class: 'muted', style: { fontSize: '13px' } }, 'Counting since ' + new Date(S.firstOpen).toLocaleDateString() + '. Your stats are private to you.'));
    main.appendChild(wrap);
  } };
})();
