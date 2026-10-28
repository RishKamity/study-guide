/* station.js — the station loop: warm-up, pretest, lesson, worked, faded, practice, exit ticket. */
U.views.station = { tab: 'path', render: function (main, p) {
  var id = p.id, T = A.TOPIC[id], S = A.STATIONS[id];
  if (!T || !S) { main.appendChild(U.h('div', { class: 'card' }, 'This station is not built yet.', U.h('button', { class: 'btn', onclick: function () { U.go('path'); } }, 'Back to Path'))); return; }
  var st = A.store.state.stations[id], step = Math.min(st ? st.step : 0, 6), done = st && st.step >= 7;
  var stage = U.h('div', { class: 'stack' }); var bar = U.h('div', { class: 'steps' });
  var head = U.h('div', null, U.h('div', { class: 'eyebrow' }, A.CHAPTERS[T.ch] + ' · ' + T.id), U.h('h1', { class: 'h1', style: { marginTop: '4px' } }, T.title));
  main.appendChild(U.h('div', { class: 'stack' }, U.h('div', { class: 'row', style: { justifyContent: 'space-between' } }, U.h('button', { class: 'btn ghost sm', onclick: function () { U.go('path'); } }, '← Path'), U.aiBtn && A.FEAT.ai ? U.aiBtn('Ask the tutor', function () { U.openTutor(id); }) : null), head, bar, stage));
  var lastSkill = null, ok = 0, tot = 0;
  var SHORT = ['Warm-up', 'Pretest', 'Lesson', 'Worked', 'Your turn', 'Practice', 'Exit'];
  function hasStep(i) { return i === 3 ? !!S.worked : i === 4 ? !!S.faded : true; }
  function setBar(cur) {
    U.clear(bar); bar.className = 'stepnav'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'Station steps');
    for (var i = 0; i < 7; i++) (function (i) {
      if (!hasStep(i)) return; var reached = st && st.step >= i || i <= step;
      bar.appendChild(U.h('button', { type: 'button', role: 'tab', class: (i < cur ? 'on ' : '') + (i === cur ? 'cur' : ''), 'aria-selected': i === cur ? 'true' : 'false', title: A.STEPS[i] + (reached ? '' : ' (jump ahead)'), onclick: function () { if (i !== cur) go(i); } }, SHORT[i]));
    })(i);
  }
  function go(n) { if (n > step || !st) { step = n; A.setStation(id, { step: n }); } run(n); }
  function title(t, sub) { return U.h('div', null, U.h('div', { class: 'eyebrow' }, t), sub ? U.h('p', { class: 'muted small', style: { marginTop: '2px' } }, sub) : null); }
  function nextBtn(label, fn) { return U.h('button', { class: 'btn block', onclick: fn }, label); }
  function setKeys(fn) { U.keyFn = fn; }

  function qFlow(opts) { /* run N questions; opts: {n, label, pretest, mkItem, onFinish, topics} */
    var i = 0, correct = 0;
    function one() {
      U.clear(stage);
      if (i >= opts.n) { opts.onFinish(correct, opts.n); return; }
      var item = opts.mkItem(i); if (!item) { opts.onFinish(correct, i); return; }
      lastSkill = item.skill;
      var q = U.question(item, { label: opts.label + ' ' + (i + 1) + '/' + opts.n, pretest: opts.pretest, mode: opts.mode || 'learn',
        onAnswer: function (r) { if (r.correct) correct++; }, nextLabel: (i + 1 >= opts.n ? 'Finish' : 'Next'), onNext: function () { i++; one(); } });
      stage.appendChild(U.h('div', { class: 'card' }, q)); setKeys(function (e) { q.keys(e); });
    }
    one();
  }
  function topicItem() { return A.nextItem({ topics: [id], lastSkill: lastSkill, includeNew: true }); }
  function pretestItem() { var sk = A.topicSkillIds(id); var rr = A.mulberry32(Math.floor(Math.random() * 4e9)); return A.freshItem(rr.pick(sk), rr, A.store.state.seen); }

  function warmup() {
    var others = A.poolTopics(A.store.state, false).filter(function (t) { return t.id !== id && A.topicSkillIds(t.id).length; }).map(function (t) { return t.id; });
    if (!others.length) { go(1); return; }
    stage.appendChild(title('Warm-up', 'Two questions from what you already studied. Pulling it back is what cements it.'));
    qFlow({ n: 2, label: 'Warm-up', mkItem: function () { return A.nextItem({ topics: others, lastSkill: lastSkill }); }, onFinish: function () { go(1); } });
  }
  function pretest() {
    U.clear(stage); stage.appendChild(U.h('div', { class: 'card stack' }, title('Pretest', S.intro), U.h('p', null, 'Three questions before the lesson. They are not graded. Getting them wrong first makes the lesson stick better, so just give your best guess.'), nextBtn('Start pretest', function () {
      var c = 0; qFlow({ n: 3, label: 'Pretest', pretest: true, mkItem: pretestItem, onFinish: function (cc, n) { A.setStation(id, { pretest: [cc, n] }); go(2); } });
    })));
  }
  function lesson() {
    var i = 0, cards = S.cards;
    function show() {
      U.clear(stage); var c = cards[i];
      var body = U.h('div', { class: 'card lesson stack' }, U.h('div', { class: 'eyebrow' }, 'Lesson · card ' + (i + 1) + ' of ' + cards.length), U.h('h3', null, c.h), c.general ? U.h('span', { class: 'pill gen', title: 'Written from standard textbook knowledge because your course files barely cover this. Check it against your notes.' }, 'Not from your course files') : null,
        U.h('ul', null, c.rule.map(function (r) { return U.h('li', null, r); })), U.visual(c.visual),
        c.hook ? U.h('div', { class: 'box hook' }, U.h('b', { class: 'k' }, 'Remember'), c.hook) : null,
        c.analogy ? U.h('div', { class: 'box' }, U.h('b', { class: 'k' }, 'Think of it as'), c.analogy) : null,
        c.trap ? U.h('div', { class: 'box trap' }, U.h('b', { class: 'k' }, 'Exam trap'), c.trap.t, c.trap.quote ? U.h('div', { class: 'quote' }, '“' + c.trap.quote.text + '” — ' + (A.COURSE.instructor ? A.COURSE.instructor + ', ' : '') + 'Lecture ' + c.trap.quote.lec + (c.trap.quote.ts ? ' at ' + c.trap.quote.ts : '')) : null) : null);
      stage.appendChild(body);
      var nav = U.h('div', { class: 'row' }, i > 0 ? U.h('button', { class: 'btn ghost', onclick: function () { i--; show(); } }, 'Back') : null,
        U.h('button', { class: 'btn', style: { flex: 1 }, onclick: function () { if (i < cards.length - 1) { i++; show(); } else go(S.worked ? 3 : (S.faded ? 4 : 5)); } }, i < cards.length - 1 ? 'Next card' : (S.worked ? 'See a worked example' : 'Start practice')));
      stage.appendChild(nav); window.scrollTo(0, 0);
      setKeys(function (e) { if (e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); if (i < cards.length - 1) { i++; show(); } else go(S.worked ? 3 : (S.faded ? 4 : 5)); } else if (e.key === 'ArrowLeft' && i > 0) { i--; show(); } });
    }
    show();
  }
  function stepCard(s, i, n) {
    return U.h('div', { class: 'wstep' }, U.h('div', { class: 'lab' }, s.label), U.h('div', null, U.h('div', { class: 'act' }, s.action), s.math ? U.h('div', { class: 'math' }, s.math) : null, s.je ? U.jeTable(s.je) : null, s.why ? U.h('div', { class: 'why' }, s.why) : null));
  }
  function worked() {
    var W = S.worked, i = 0; U.clear(stage);
    var list = U.h('div', { class: 'stack' }), btnRow = U.h('div');
    stage.appendChild(U.h('div', { class: 'card stack' }, title(/^worked example/i.test(W.title) ? W.title : 'Worked example · ' + W.title, 'Read each step and ask yourself why it is the next step.'), U.h('div', { class: 'callout' }, W.setup), list));
    stage.appendChild(btnRow);
    function more() {
      list.appendChild(stepCard(W.steps[i], i, W.steps.length)); i++; U.clear(btnRow);
      btnRow.appendChild(i < W.steps.length ? nextBtn('Next step', more) : nextBtn(S.faded ? 'Try one yourself' : 'Start practice', function () { go(S.faded ? 4 : 5); }));
    }
    more(); setKeys(function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); var b = btnRow.querySelector('button'); if (b) b.click(); } });
  }
  function faded() {
    var F = S.faded, i = 0; U.clear(stage);
    var list = U.h('div', { class: 'stack' }), area = U.h('div');
    stage.appendChild(U.h('div', { class: 'card stack' }, title(/^your turn/i.test(F.title) ? F.title : 'Your turn · ' + F.title, 'The same idea with fewer hints. Answer each step.'), U.h('div', { class: 'callout' }, F.setup), list)); stage.appendChild(area);
    function next() {
      U.clear(area); if (i >= F.steps.length) { area.appendChild(nextBtn('Start practice', function () { go(5); })); return; }
      var s = F.steps[i]; i++;
      if (!s.ask) { list.appendChild(stepCard(s)); next(); return; }
      var box = U.h('div', { class: 'card stack' }), done = false;
      box.appendChild(U.h('div', { class: 'eyebrow' }, s.label)); box.appendChild(U.h('div', { class: 'act', style: { fontWeight: 600 } }, s.action)); box.appendChild(U.h('div', null, s.ask.q));
      var opts = U.h('div', { class: 'opts' });
      var ao = (function () { var r = A.mulberry32(A.hash(s.label + '|' + s.ask.q)), idx = r.shuffle(s.ask.opts.map(function (_, q) { return q; })); return { opts: idx.map(function (q) { return s.ask.opts[q]; }), ans: idx.indexOf(s.ask.ans) }; })();
      ao.opts.forEach(function (t, k) {
        var el = U.h('div', { class: 'opt' }); var b = U.h('button', { class: 'optmain', type: 'button', onclick: function () {
          if (done) return; done = true; var good = k === ao.ans; U.sfx(good ? 'ok' : 'bad');
          Array.prototype.forEach.call(opts.children, function (o, j) { o.classList.add('locked'); if (j === ao.ans) o.classList.add('ok'); else if (j === k) o.classList.add('bad'); });
          box.appendChild(U.h('div', { class: 'callout ' + (good ? 'good' : 'bad') }, (good ? 'Right. ' : 'Not quite. ') + s.ask.why));
          if (s.je) box.appendChild(U.jeTable(s.je));
          box.appendChild(nextBtn('Continue', function () { list.appendChild(stepCard(s)); box.remove(); next(); }));
        } }, U.h('span', { class: 'lt' }, U.letters[k]), U.h('span', { class: 'tx' }, t));
        el.appendChild(b); opts.appendChild(el);
      });
      box.appendChild(opts); area.appendChild(box);
    }
    next(); setKeys(null);
  }
  function practice() {
    var rounds = 0; function round() {
      var n = 6; qFlow({ n: n, label: 'Practice', mkItem: topicItem, onFinish: function (c, t) {
        U.clear(stage); ok += c; tot += t; var pct = Math.round(100 * c / t);
        stage.appendChild(U.h('div', { class: 'card stack' }, title('Practice result'), U.h('div', { class: 'big' }, c + '/' + t), U.h('p', { class: 'muted' }, pct >= 80 ? 'Strong. Time for the exit ticket.' : (pct >= 50 ? 'Getting there. The exit ticket will show what stuck.' : 'This topic needs more reps. Do 6 more, or review the lesson first.')),
          U.h('div', { class: 'row' }, U.h('button', { class: 'btn ghost', onclick: function () { go(2); } }, 'Review lesson'), U.h('button', { class: 'btn ghost', onclick: function () { round(); } }, 'Six more'), U.h('button', { class: 'btn', style: { flex: 1 }, onclick: function () { go(6); } }, 'Exit ticket'))));
        setKeys(null);
      } });
    } round();
  }
  function exit() {
    U.clear(stage); stage.appendChild(U.h('div', { class: 'card stack' }, title('Exit ticket', 'Three questions. This is your check that the topic stuck.'), nextBtn('Start', function () {
      qFlow({ n: 3, label: 'Exit ticket', mkItem: topicItem, onFinish: function (c, t) { A.setStation(id, { step: 7, exit: [c, t] }); finish(c, t); } });
    })));
  }
  function finish(c, t) {
    U.clear(stage); setBar(7); var ts = A.topicStat(id); var nx = A.nextSeq();
    stage.appendChild(U.h('div', { class: 'card stack' }, U.h('div', { class: 'eyebrow' }, 'Station complete'), U.h('div', { class: 'big' }, c + '/' + t), U.h('div', null, U.h('span', { class: 'pill ' + ts.state }, A.stateLabel[ts.state]), ' ', ts.p !== null ? U.h('span', { class: 'muted small' }, Math.round(ts.p * 100) + '% recent accuracy') : null),
      U.h('p', { class: 'muted' }, c >= 2 ? 'Nice. It will come back in Endless so it stays fresh.' : 'Wobbly. It is queued in Misses and will keep coming back until it sticks.'),
      nx ? nextBtn('Next: ' + (nx.item.title || (A.TOPIC[nx.item.id] && A.TOPIC[nx.item.id].title) || nx.item.id), function () { U.openSeq(nx.item); }) : null,
      U.h('button', { class: 'btn ghost', onclick: function () { U.go('today'); } }, 'Back to Today'))); setKeys(null);
  }
  function run(n) {
    setBar(n); window.scrollTo(0, 0); U.clear(stage); setKeys(null);
    if (n === 0) warmup(); else if (n === 1) pretest(); else if (n === 2) lesson(); else if (n === 3) { if (S.worked) worked(); else go(S.faded ? 4 : 5); }
    else if (n === 4) { if (S.faded) faded(); else go(5); } else if (n === 5) practice(); else exit();
  }
  if (done) { run(2); stage.insertBefore(U.h('div', { class: 'callout good' }, 'You finished this station. Reviewing the lesson again is fine.'), stage.firstChild); setBar(7); }
  else if (step === 0 && !st) { stage.appendChild(U.h('div', { class: 'card stack' }, U.h('p', null, S.intro), U.h('p', { class: 'muted small' }, 'About ' + T.mins + ' minutes. Warm-up, pretest, lesson, worked example, practice, exit ticket.'), nextBtn('Start station', function () { run(0); }))); setBar(0); }
  else run(step);
  return function () { U.keyFn = null; };
} };
U.openSeq = function (it) {
  var slot = A.plan ? A.plan(Date.now(), A.store.state).slotOf(it) : null;
  if (it.type === 'station' && slot && slot.skim && !A.stationStarted(it.id)) { A.markSkim(it.id); U.go('session', { title: A.TOPIC[it.id].title + ' \u00B7 practice only', topics: [it.id], noFilter: true }); return; }
  if (it.type === 'drill') { U.go('session', { title: A.TOPIC[it.id].title, topics: [it.id], noFilter: true }); return; }
  if (it.type === 'station') U.go('station', { id: it.id });
  else if (it.type === 'foundation') U.go('exam', { id: 'foundation', title: 'Foundation check', minutes: 10, fixed: A.FOUNDATION, pass: 0.8, kind: 'foundation' });
  else if (it.type === 'minimock') U.go('exam', { id: it.id, title: it.title, minutes: Math.max(8, Math.round(A.COURSE.format.minutes * 10 / Math.max(10, A.MOCK_N || 40)) + 1), chapters: [it.ch], kind: 'minimock', pass: 0.7 });
  else if (it.type === 'misses') U.go('session', { title: 'Clear your Misses', onlyMisses: true });
  else if (it.type === 'mock') U.go('mock');
  else if (it.type === 'sample') U.go('mock');
  else U.toast('Coming in the next version');
};
