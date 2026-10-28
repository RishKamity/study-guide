/* exam.js — paper-style timed exam: foundation check, mini-mocks, Mocks A/B/C and the Sample Exam. */
U.views.exam = { tab: function (p) { return p && (p.kind === 'mock' || p.kind === 'sample') ? 'mock' : 'path'; }, render: function (main, p) {
  var id = p.id, rec = A.store.state.mocks[id], isMock = p.kind === 'mock' || p.kind === 'sample';
  if (rec && rec.submittedAt && !p.retake) return results(main, p, rec);
  var cur = 0, timerEl = U.h('span', { class: 'timer' }), paceEl = U.h('span', { class: 'muted small' }), tick = null, warned = {}, lastSwitch = Date.now();
  if (!rec || rec.submittedAt) {
    var ids = p.fixed ? p.fixed.slice() : (p.mockKey ? A.buildNamedMock(p.mockKey) : A.buildMock(p.chapters, null));
    rec = { ids: ids, ans: {}, flag: {}, strike: {}, t: {}, startedAt: 0, updatedAt: Date.now(), submittedAt: 0, minutes: p.minutes, kind: p.kind, title: p.title, hist: (rec && rec.hist) || [], retake: !!(rec && rec.submittedAt) };
    if (!p.autostart) return intro(main, p, rec);
  }
  if (!rec.startedAt) { rec.startedAt = Date.now(); save(); }
  rec.t = rec.t || {}; rec.strike = rec.strike || {};
  var items = rec.ids.map(function (x) { return A.makeItem(x); });
  var qwrap = U.h('div'), navwrap = U.h('div'), calc = isMock ? makeCalc() : null;
  main.appendChild(U.h('div', { class: 'stack' }, U.h('div', { class: 'row', style: { justifyContent: 'space-between', alignItems: 'flex-start' } }, U.h('div', null, U.h('div', { class: 'eyebrow' }, 'Exam mode · no feedback until you submit' + (rec.retake ? ' · retake' : '')), U.h('h1', { class: 'h2' }, rec.title || p.title), paceEl), U.h('div', { class: 'stack', style: { alignItems: 'flex-end', gap: '6px' } }, timerEl, calc ? calc.btn : null)), calc ? calc.panel : null, qwrap, navwrap));
  function save() { A.store.quiet(function (s) { rec.updatedAt = Date.now(); s.mocks[id] = rec; }); }
  function flushTime() { var now = Date.now(); rec.t[cur] = (rec.t[cur] || 0) + Math.round((now - lastSwitch) / 1000); lastSwitch = now; }
  function remaining() { return rec.minutes * 60 - (Date.now() - rec.startedAt) / 1000; }
  function paintTimer() {
    var r = remaining(); timerEl.textContent = U.fmtTime(r); timerEl.className = 'timer' + (r < 120 ? ' low' : '');
    var total = rec.minutes * 60, el = total - r, n = items.length;
    if (isMock) paceEl.textContent = 'Pace: you should be on Q' + Math.max(1, Math.min(n, Math.ceil(el / total * n)));
    if (isMock && r <= 600 && r > 595 && !warned.a) { warned.a = 1; U.toast('10 minutes left'); }
    if (isMock && r <= 300 && r > 295 && !warned.b) { warned.b = 1; U.toast('5 minutes left'); }
    if (r <= 0) { clearInterval(tick); submit(true); }
  }
  tick = setInterval(paintTimer, 1000); paintTimer();
  function setAns(i) { rec.ans[cur] = (rec.ans[cur] === i ? undefined : i); if (rec.ans[cur] === undefined) delete rec.ans[cur]; save(); show(); }
  function toggleStrike(i) { rec.strike[cur] = rec.strike[cur] || {}; rec.strike[cur][i] = !rec.strike[cur][i]; save(); show(); }
  function goto(i) { flushTime(); cur = Math.max(0, Math.min(items.length - 1, i)); show(); }
  function show() {
    U.clear(qwrap); U.clear(navwrap); var it = items[cur];
    var opts = U.h('div', { class: 'opts' }), struck = rec.strike[cur] || {};
    it.options.forEach(function (_, i) {
      var el = U.h('div', { class: 'opt' + (rec.ans[cur] === i ? ' sel' : '') + (struck[i] ? ' struck' : '') });
      var pressTimer = null, longPressed = false;
      var main1 = U.h('button', { class: 'optmain', type: 'button', onclick: function () { if (longPressed) { longPressed = false; return; } setAns(i); } }, U.h('span', { class: 'lt' }, U.letters[i]), U.h('span', { class: 'tx' }, U.optBody(it, i)));
      main1.addEventListener('touchstart', function () { longPressed = false; pressTimer = setTimeout(function () { longPressed = true; toggleStrike(i); }, 550); }, { passive: true });
      ['touchend', 'touchmove', 'touchcancel'].forEach(function (ev) { main1.addEventListener(ev, function () { clearTimeout(pressTimer); }, { passive: true }); });
      el.appendChild(main1);
      el.appendChild(U.h('button', { class: 'xbtn', type: 'button', 'aria-label': 'Cross out', onclick: function () { toggleStrike(i); } }, '✕'));
      opts.appendChild(el);
    });
    qwrap.appendChild(U.h('div', { class: 'paper stack' }, U.h('div', { class: 'row', style: { justifyContent: 'space-between' } }, U.h('b', { class: 'mono' }, (cur + 1) + ' / ' + items.length), U.h('button', { class: 'btn ghost sm', onclick: function () { if (rec.flag[cur]) delete rec.flag[cur]; else rec.flag[cur] = 1; save(); show(); } }, rec.flag[cur] ? '⚑ Flagged' : '⚐ Flag')), U.h('div', { class: 'stem' }, it.stem), it.table ? U.dataTable(it.table) : null, opts,
      U.h('div', { class: 'row' }, U.h('button', { class: 'btn ghost', disabled: cur === 0, onclick: function () { goto(cur - 1); } }, '← Prev'), U.h('button', { class: 'btn ghost', disabled: cur === items.length - 1, onclick: function () { goto(cur + 1); } }, 'Next →'))));
    var nav = U.h('div', { class: 'nav' }); items.forEach(function (_, i) { nav.appendChild(U.h('button', { class: (rec.ans[i] !== undefined ? 'ans ' : '') + (i === cur ? 'cur ' : '') + (rec.flag[i] ? 'flag' : ''), onclick: function () { goto(i); } }, i + 1)); });
    var un = items.length - Object.keys(rec.ans).length, nf = Object.keys(rec.flag).length;
    navwrap.appendChild(U.h('div', { class: 'card stack' }, nav, U.h('div', { class: 'muted small' }, (un ? un + ' unanswered' : 'All answered') + (nf ? ' · ' + nf + ' flagged' : '')), U.h('button', { class: 'btn block', onclick: function () { confirmSubmit(un); } }, 'Submit')));
  }
  function confirmSubmit(un) {
    U.clear(navwrap); navwrap.appendChild(U.h('div', { class: 'card stack' }, U.h('b', null, un ? un + ' question' + (un === 1 ? ' is' : 's are') + ' still blank. Submit anyway?' : 'Submit your answers?'), U.h('div', { class: 'row' }, U.h('button', { class: 'btn', onclick: function () { submit(false); } }, 'Yes, submit'), U.h('button', { class: 'btn ghost', onclick: show }, 'Keep working'))));
  }
  function submit(timeUp) {
    clearInterval(tick); flushTime(); var correct = 0, perTopic = {}, perCh = {}, predBefore = A.score.now().pct, wasRetake = !!rec.retake;
    items.forEach(function (it, i) {
      var ch = rec.ans[i], ok = ch === it.answer; perTopic[it.topic] = perTopic[it.topic] || [0, 0]; perTopic[it.topic][1]++; if (ok) { correct++; perTopic[it.topic][0]++; }
      var c = A.TOPIC[it.topic].ch; perCh[c] = perCh[c] || [0, 0]; perCh[c][1]++; if (ok) perCh[c][0]++;
      A.recordAnswer({ item: it, chosen: ch === undefined ? -1 : ch, conf: null, ms: (rec.t[i] || 0) * 1000, mode: 'mock', fresh: true, retake: wasRetake });
    });
    rec.submittedAt = Date.now();
    if ((p.kind === 'mock' || p.kind === 'sample') && items.length >= 36 && !wasRetake) A.score.calibrate('cal:' + id + ':' + rec.submittedAt, rec.submittedAt, 100 * correct / items.length);
    rec.predBefore = predBefore; rec.predAfter = A.score.now().pct; rec.score = correct; rec.total = items.length; rec.perTopic = perTopic; rec.perCh = perCh; rec.timeUp = !!timeUp; rec.hist = (rec.hist || []).concat([{ at: rec.submittedAt, c: correct, n: items.length }]);
    A.store.mutate(function (s) {
      rec.updatedAt = Date.now(); s.mocks[id] = rec;
      if (p.kind === 'sample') { s.sample.attempts = (s.sample.attempts || []).concat([{ id: 'a' + rec.submittedAt, at: rec.submittedAt, c: correct, n: items.length, official: !(s.sample.attempts || []).length, ans: JSON.parse(JSON.stringify(rec.ans)) }]); s.sample.unlocked = true; }
    });
    U.go('exam', Object.assign({}, p, { retake: false, autostart: false }));
  }
  U.keyFn = function (e) {
    var k = e.key.toLowerCase(), code = e.code || '', d = /^Digit([1-4])$/.exec(code);
    if (e.shiftKey && d) { toggleStrike(+d[1] - 1); return; }
    var i = 'abcd'.indexOf(k); if (i < 0 && '1234'.indexOf(k) >= 0) i = '1234'.indexOf(k);
    if (i >= 0 && i < 4) setAns(i); else if (k === 'arrowright' && cur < items.length - 1) goto(cur + 1); else if (k === 'arrowleft' && cur > 0) goto(cur - 1); else if (k === 'f') { if (rec.flag[cur]) delete rec.flag[cur]; else rec.flag[cur] = 1; save(); show(); }
  };
  show(); return function () { clearInterval(tick); U.keyFn = null; };
} };

/* optional on-screen four-function calculator (phone only, off by default) */
function makeCalc() {
  var disp = '0', acc = null, op = null, fresh = true, out = U.h('div', { class: 'calc-d mono' }, '0');
  function paint() { out.textContent = disp; }
  function apply(a, b, o) { return o === '+' ? a + b : o === '−' ? a - b : o === '×' ? a * b : o === '÷' ? (b === 0 ? NaN : a / b) : b; }
  function press(c) {
    if (/\d/.test(c)) { disp = fresh || disp === '0' ? c : disp + c; fresh = false; }
    else if (c === '.') { if (fresh) { disp = '0.'; fresh = false; } else if (disp.indexOf('.') < 0) disp += '.'; }
    else if (c === 'C') { disp = '0'; acc = null; op = null; fresh = true; }
    else { var v = parseFloat(disp); if (op && !fresh) { v = apply(acc, v, op); disp = String(+v.toFixed(8)); } acc = parseFloat(disp); op = c === '=' ? null : c; fresh = true; }
    paint();
  }
  var keys = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '=', '+', 'C'];
  var panel = U.h('div', { class: 'calc card stack', hidden: true }, out, U.h('div', { class: 'calc-k' }, keys.map(function (c) { return U.h('button', { type: 'button', class: 'btn ghost sm', onclick: function () { press(c); } }, c); })), U.h('div', { class: 'small dim' }, 'Use a real calculator on exam day.'));
  var btn = U.h('button', { class: 'btn ghost sm calc-btn', type: 'button', onclick: function () { panel.hidden = !panel.hidden; } }, 'Calc');
  return { panel: panel, btn: btn };
}

function intro(main, p, rec) {
  var past = (A.store.state.mocks[p.id] && A.store.state.mocks[p.id].hist) || [], mk = p.kind === 'mock' || p.kind === 'sample';
  main.appendChild(U.h('div', { class: 'stack' }, U.h('button', { class: 'btn ghost sm', style: { alignSelf: 'flex-start' }, onclick: function () { U.go(mk ? 'mock' : 'path'); } }, mk ? '← Mock' : '← Path'),
    U.h('div', { class: 'card stack' }, U.h('div', { class: 'eyebrow' }, p.kind === 'foundation' ? 'Check' : (mk ? 'Full-length exam' : 'Mini-mock')), U.h('h1', { class: 'h1' }, p.title), U.h('p', null, rec.ids.length + ' questions in ' + p.minutes + ' minutes, laid out like the real exam: chapter order, A to D, no feedback until you submit.'),
      mk ? U.h('ul', { class: 'small muted', style: { margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' } }, U.h('li', null, 'Cross out an option with the ✕ button, Shift+1 to 4, or a long press on a phone.'), U.h('li', null, 'Flag questions to come back to them. Warnings come at 10 and 5 minutes left.'), U.h('li', null, 'Every answer autosaves. If you close the page, the clock keeps running.'), U.h('li', null, 'Use your real non-programmable calculator. A phone calculator panel is here only for practice.')) : null,
      p.pass ? U.h('p', { class: 'muted' }, 'Target: ' + Math.round(p.pass * rec.ids.length) + ' or more correct.') : null,
      past.length ? U.h('p', { class: 'muted small' }, 'Previous: ' + past.map(function (h) { return h.c + '/' + h.n; }).join(', ')) : null,
      U.h('button', { class: 'btn block', onclick: function () { U.go('exam', Object.assign({}, p, { autostart: true, retake: true })); } }, 'Start (timer begins)'))));
}
function letterFor(pct) { return pct >= 93 ? 'A' : pct >= 90 ? 'A−' : pct >= 87 ? 'B+' : pct >= 83 ? 'B' : pct >= 80 ? 'B−' : pct >= 77 ? 'C+' : pct >= 73 ? 'C' : pct >= 70 ? 'C−' : pct >= 60 ? 'D' : 'F'; }
function results(main, p, rec) {
  var items = rec.ids.map(function (x) { return A.makeItem(x); }), pct = rec.score / rec.total, pass = p.pass ? pct >= p.pass : null, mk = p.kind === 'mock' || p.kind === 'sample';
  var wrap = U.h('div', { class: 'stack' }), wrong = []; items.forEach(function (it, i) { if (rec.ans[i] !== it.answer) wrong.push(i); });
  var byTopic = Object.keys(rec.perTopic || {}).map(function (t) { var v = rec.perTopic[t]; return [A.TOPIC[t].id + ' ' + A.TOPIC[t].title, v[0] + '/' + v[1]]; });
  wrap.appendChild(U.h('button', { class: 'btn ghost sm', style: { alignSelf: 'flex-start' }, onclick: function () { U.go(mk ? 'mock' : 'path'); } }, mk ? '← Mock' : '← Path'));
  var scorePts = Math.round(rec.score * 2.5 * 10) / 10;
  var head = U.h('div', { class: 'card stack' }, U.h('div', { class: 'eyebrow' }, rec.title + ' · results' + (p.kind === 'sample' ? (isOfficial(rec) ? ' · official attempt' : ' · retake') : '')), U.h('div', { class: 'big' }, rec.score + '/' + rec.total), U.h('p', { class: 'muted' }, Math.round(pct * 100) + '%' + (mk ? ' · ' + scorePts + ' of 100 points · ' + letterFor(pct * 100) + ' on a standard scale' : '') + (pass === null ? '' : (pass ? ' · target met' : ' · below target')) + (rec.timeUp ? ' · time ran out' : '')),
    p.kind === 'foundation' && !pass ? U.h('div', { class: 'callout warn' }, 'Redo the boot-camp topics you missed before moving on. They are the base for everything else.') : null);
  wrap.appendChild(head);
  if (rec.predBefore !== undefined && rec.predAfter !== undefined) wrap.appendChild(U.h('div', { class: 'card stack' }, U.h('div', { class: 'eyebrow' }, 'Predicted score'), U.h('div', { class: 'predflow' }, U.h('span', null, U.h('small', null, 'Before'), U.h('b', null, rec.predBefore.toFixed(2) + '%')), U.h('i', null, '\u2192'), U.h('span', null, U.h('small', null, 'Scored'), U.h('b', null, (100 * rec.score / rec.total).toFixed(2) + '%')), U.h('i', null, '\u2192'), U.h('span', null, U.h('small', null, 'Now'), U.h('b', { class: rec.predAfter >= rec.predBefore ? 'up' : 'down' }, rec.predAfter.toFixed(2) + '%')))));
  if (mk) {
    var chBars = U.h('div', { class: 'stack' });
    A.UNITS.forEach(function (c) { var v = (rec.perCh && rec.perCh[c]) || [0, 0], w = v[1] ? Math.round(v[0] / v[1] * 100) : 0; chBars.appendChild(U.h('div', { class: 'bar-row' }, U.h('span', { class: 'bl' }, 'Ch ' + c), U.h('div', { class: 'bar' }, U.h('i', { style: { width: w + '%' }, class: w >= 80 ? 'g' : w >= 60 ? 'w' : 'b' })), U.h('span', { class: 'mono small' }, v[0] + '/' + v[1]))); });
    wrap.appendChild(U.h('div', { class: 'card stack' }, U.h('div', { class: 'eyebrow' }, 'By chapter'), chBars));
    var dots = U.h('div', { class: 'stack' });
    var order = []; items.forEach(function (it) { if (order.indexOf(it.topic) < 0) order.push(it.topic); });
    order.forEach(function (t) { var row = U.h('div', { class: 'dotrow' }, U.h('span', { class: 'dl' }, t + ' ' + A.TOPIC[t].title)); var dd = U.h('span', { class: 'dd' }); items.forEach(function (it, i) { if (it.topic === t) dd.appendChild(U.h('i', { class: rec.ans[i] === it.answer ? 'ok' : (rec.ans[i] === undefined ? 'blank' : 'no'), title: 'Q' + (i + 1) })); }); row.appendChild(dd); dots.appendChild(row); });
    wrap.appendChild(U.h('div', { class: 'card stack' }, U.h('div', { class: 'eyebrow' }, 'By topic (each dot is a question)'), dots));
    var ts = rec.t || {}, totalT = 0, slow = []; Object.keys(ts).forEach(function (k) { totalT += ts[k]; if (ts[k] > 90) slow.push([+k, ts[k]]); });
    var unans = items.length - Object.keys(rec.ans).length;
    wrap.appendChild(U.h('div', { class: 'card stack' }, U.h('div', { class: 'eyebrow' }, 'Time'), U.h('p', null, 'Time on questions: ' + U.fmtTime(totalT) + ' of ' + rec.minutes + ':00. ' + (rec.total ? 'About ' + Math.round(totalT / rec.total) + ' seconds per question.' : '')), slow.length ? U.h('p', { class: 'muted' }, 'Slow (over 90 seconds): ' + slow.sort(function (a, b) { return b[1] - a[1]; }).map(function (x) { return 'Q' + (x[0] + 1) + ' (' + x[1] + 's)'; }).join(', ') + '. Skip and return to these on exam day.') : U.h('p', { class: 'muted' }, 'No question took over 90 seconds.'), unans ? U.h('p', { class: 'muted' }, unans + ' left blank. Always guess: there is no penalty.') : null));
    var flagged = Object.keys(rec.flag || {}).map(Number);
    if (flagged.length) {
      var conf = rec.conf = rec.conf || {}, cal = U.h('div', { class: 'stack' }), calSum = U.h('p', { class: 'muted' });
      var paintCal = function () {
        var sw = 0, gr = 0; flagged.forEach(function (i) { var c = conf[i], ok = rec.ans[i] === items[i].answer; if (c === 'sure' && !ok) sw++; if (c === 'guess' && ok) gr++; });
        calSum.textContent = 'Sure but wrong: ' + sw + ' (the most valuable to fix). Guessed but right: ' + gr + '.';
      };
      flagged.forEach(function (i) {
        var row = U.h('div', { class: 'row', style: { justifyContent: 'space-between' } }, U.h('span', null, 'Q' + (i + 1) + (rec.ans[i] === items[i].answer ? ' · correct' : ' · missed')));
        var bs = U.h('span', { class: 'row' }); ['sure', 'unsure', 'guess'].forEach(function (c) { var b = U.h('button', { class: 'btn sm ' + (conf[i] === c ? '' : 'ghost'), onclick: function () { conf[i] = c; A.store.quiet(function (s) { rec.updatedAt = Date.now(); s.mocks[p.id] = rec; }); Array.prototype.forEach.call(bs.children, function (x) { x.className = 'btn sm ghost'; }); b.className = 'btn sm'; paintCal(); } }, c); bs.appendChild(b); });
        row.appendChild(bs); cal.appendChild(row);
      });
      paintCal(); wrap.appendChild(U.h('div', { class: 'card stack' }, U.h('div', { class: 'eyebrow' }, 'Calibration (flagged questions)'), U.h('p', { class: 'small muted' }, 'How sure were you on each question you flagged?'), cal, calSum));
    }
  } else { wrap.appendChild(U.h('div', { class: 'card stack' }, U.dataTable({ head: ['Topic', 'Score'], rows: byTopic }))); }
  var weakest = Object.keys(rec.perTopic || {}).map(function (t) { var v = rec.perTopic[t]; return [t, v[0] / v[1], v[1]]; }).filter(function (x) { return x[1] < 1; }).sort(function (a, b) { return a[1] - b[1] || b[2] - a[2]; }).slice(0, 3).map(function (x) { return x[0]; });
  var btns = U.h('div', { class: 'row' });
  if (!mk) btns.appendChild(U.h('button', { class: 'btn ghost', onclick: function () { U.go('exam', Object.assign({}, p, { retake: true, autostart: false, fresh: true })); } }, 'Retake (new questions)'));
  if (p.kind === 'sample') btns.appendChild(U.h('button', { class: 'btn ghost', onclick: function () { U.go('exam', Object.assign({}, p, { retake: true, autostart: false })); } }, 'Retake (marked as a retake)'));
  if (wrong.length) btns.appendChild(U.h('button', { class: 'btn', onclick: function () { var r = document.getElementById('review'); if (r) r.scrollIntoView({ behavior: 'smooth' }); } }, 'Review misses (' + wrong.length + ')'));
  if (weakest.length) btns.appendChild(U.h('button', { class: 'btn ghost', onclick: function () { U.go('session', { title: 'Weakest topics from ' + rec.title, topics: weakest }); } }, 'Drill weakest ' + weakest.length));
  if (mk) btns.appendChild(U.h('button', { class: 'btn ghost', onclick: function () { U.go(U.views.sheet ? 'sheet' : 'ref'); } }, 'Update walk-in sheet'));
  btns.appendChild(U.h('button', { class: 'btn ghost', onclick: function () { U.go('today'); } }, 'Back to Today'));
  head.appendChild(btns);
  wrap.appendChild(U.h('h2', { class: 'h2', id: 'review' }, wrong.length ? 'Review what you missed (' + wrong.length + ')' : 'Perfect. Nothing to review.'));
  wrong.forEach(function (i) {
    var it = items[i], ch = rec.ans[i];
    wrap.appendChild(U.h('div', { class: 'card stack' }, U.h('div', { class: 'eyebrow' }, 'Q' + (i + 1) + ' · ' + it.topic + ' ' + A.TOPIC[it.topic].title), U.h('div', { class: 'stem' }, it.stem), it.table ? U.dataTable(it.table) : null,
      U.h('div', { class: 'opts' }, it.options.map(function (_, k) { return U.h('div', { class: 'opt' + (k === it.answer ? ' ok' : (k === ch ? ' no' : '')) }, U.h('span', { class: 'optmain' }, U.h('span', { class: 'lt' }, U.letters[k]), U.h('span', { class: 'tx' }, U.optBody(it, k)))); })),
      U.h('div', { class: 'small muted' }, ch === undefined ? 'You left this blank.' : 'You chose ' + U.letters[ch] + '. Correct: ' + U.letters[it.answer] + '.'), U.revealBlock(it, ch),
      U.h('button', { class: 'btn ghost sm', style: { alignSelf: 'flex-start' }, onclick: function () { U.go('session', { title: 'Drill ' + it.topic, topics: [it.topic] }); } }, 'Drill this topic')));
  });
  main.appendChild(wrap);
}
function isOfficial(rec) { var a = (A.store.state.sample.attempts || []).filter(function (x) { return x.at === rec.submittedAt; })[0]; return !!(a && a.official); }
