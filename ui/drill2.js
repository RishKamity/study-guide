/* drill2.js — Twins, T/F traps, Calc sprint, JE builder, Weak spots, walk-in Sheet, export/import. */
(function () {
  var h = U.h;
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function back(to, label) { return h('button', { class: 'btn ghost sm', style: { alignSelf: 'flex-start' }, onclick: function () { U.go(to || 'drill'); } }, label || '← Drill'); }
  function topicName(id) { var t = A.TOPIC[id]; return t ? t.id + ' · ' + t.title : id; }

  /* ---- Drill menu cards ---- */
  A.HAS_CALC = function () { if (A._hasCalc === undefined) { A._hasCalc = false; var r = A.mulberry32(7); Object.keys(A.skills).some(function (k) { if (A.skills[k].kind !== 'gen') return false; try { var it = A.freshItem(k, r, {}); if (it && it.num !== null && it.num !== undefined && it.calc) { A._hasCalc = true; return true; } } catch (e) {} return false; }); } return A._hasCalc; };
  U.drillModes = function () {
    var s = A.store.state, weakN = A.weakRank(s).filter(function (x) { return x.n > 0; }).length;
    function card(title, sub, view, label, params) { return h('div', { class: 'card stack' }, h('div', { class: 'h3' }, title), h('p', { class: 'muted small' }, sub), h('button', { class: 'btn', onclick: function () { U.go(view, params || {}); } }, label)); }
    return h('div', { class: 'stack' },
      card('Weak spots', weakN ? 'Your lowest topics, ranked by how many exam points they cost you.' : 'Ranks your topics once you have answered some questions.', 'weak', 'See my weak spots'),
      (A.TWINS || []).length ? card('Twins', 'Look-alike concepts side by side, then a quick test on which is which.', 'twins', 'Open Twins') : null,
      A.HAS_CALC() ? card('Calc sprint', 'Type the number. Timed, calculator in hand.', 'calc', 'Start sprint') : null,
      A.COURSE.jeBuilder ? card('JE builder', 'Build the journal entry yourself: pick accounts, sides and amounts.', 'jebuild', 'Build entries') : null,
      (U.aiCards && A.FEAT.ai ? U.aiCards() : null),
      (A.TF || []).length ? card('True / false traps', 'One-sentence claims built from the exam’s favorite traps.', 'tf', 'Start true / false') : null);
  };

  /* ================= Twins ================= */
  U.views.twins = { tab: 'drill', render: function (main, p) {
    var id = p.id, area = h('div', { class: 'stack' });
    main.appendChild(h('div', { class: 'stack' }, back('drill'), h('h1', { class: 'h1' }, 'Twins'), area));
    function list() {
      U.clear(area); area.appendChild(h('p', { class: 'muted' }, 'Pairs the exam loves to mix up. Open one, read both sides, then test yourself.'));
      A.TWINS.forEach(function (t) { area.appendChild(h('button', { class: 'card twinrow', onclick: function () { id = t.id; pair(); } }, h('b', null, t.title), h('span', { class: 'muted small' }, t.diff))); });
    }
    function pair() {
      U.clear(area); var t = A.TWINS.filter(function (x) { return x.id === id; })[0]; if (!t) return list();
      var qs = shuffle(t.q), qi = 0, right = 0, tried = 0, quiz = h('div', { class: 'card stack' });
      function side(o) { return h('div', { class: 'card stack twinside' }, h('div', { class: 'h3' }, o.name), h('ul', { class: 'small', style: { margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' } }, o.pts.map(function (x) { return h('li', null, x); }))); }
      area.appendChild(h('button', { class: 'btn ghost sm', style: { alignSelf: 'flex-start' }, onclick: list }, '← All pairs'));
      area.appendChild(h('h2', { class: 'h2' }, t.title)); area.appendChild(h('div', { class: 'callout' }, t.diff));
      area.appendChild(h('div', { class: 'twins' }, side(t.L), side(t.R)));
      area.appendChild(quiz);
      function ask() {
        U.clear(quiz);
        if (qi >= qs.length) { quiz.appendChild(h('div', { class: 'eyebrow' }, 'Test yourself')); quiz.appendChild(h('div', { class: 'h3' }, right + ' of ' + tried + ' right on the first try')); quiz.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn', onclick: function () { qs = shuffle(t.q); qi = 0; right = 0; tried = 0; ask(); } }, 'Again'), h('button', { class: 'btn ghost', onclick: list }, 'Other pairs'))); return; }
        var q = qs[qi], answered = false;
        quiz.appendChild(h('div', { class: 'eyebrow' }, 'Test yourself · ' + (qi + 1) + ' of ' + qs.length)); quiz.appendChild(h('div', { class: 'stem' }, 'Which one is this? ' + (/^[“"]/.test(q[0]) ? q[0] : '“' + q[0] + '”')));
        var fb = h('div'), row = h('div', { class: 'row' });
        [['L', t.L.name], ['R', t.R.name]].forEach(function (o) {
          row.appendChild(h('button', { class: 'btn ghost', style: { flex: 1 }, onclick: function (e) {
            if (answered) return; answered = true; tried++; var ok = o[0] === q[1]; if (ok) right++;
            e.target.className = 'btn ' + (ok ? 'okbtn' : 'nobtn'); U.sfx && U.sfx(ok ? 'ok' : 'bad');
            U.clear(fb); fb.appendChild(h('div', { class: 'callout ' + (ok ? 'good' : 'warn') }, (ok ? 'Right. ' : 'It is ' + (q[1] === 'L' ? t.L.name : t.R.name) + '. ') + ''));
            if (!ok) qs.push(q);
            fb.appendChild(h('button', { class: 'btn', onclick: function () { qi++; ask(); } }, 'Next'));
          } }, o[1]));
        });
        quiz.appendChild(row); quiz.appendChild(fb);
      }
      ask();
    }
    if (id) pair(); else list();
  } };

  /* ================= T/F traps ================= */
  U.views.tf = { tab: 'drill', render: function (main) {
    var deck = shuffle(A.TF).slice(0, 12), i = 0, right = 0, missed = [], area = h('div', { class: 'stack' });
    main.appendChild(h('div', { class: 'stack' }, back('drill'), h('h1', { class: 'h1' }, 'True / false traps'), area));
    function next() {
      U.clear(area);
      if (i >= deck.length) {
        area.appendChild(h('div', { class: 'card stack' }, h('div', { class: 'big' }, right + '/' + deck.length), h('p', { class: 'muted' }, missed.length ? 'These are the ones to remember:' : 'Clean sweep.'),
          missed.length ? h('ul', { class: 'small', style: { margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' } }, missed.map(function (c) { return h('li', null, h('b', null, (c.a ? 'True: ' : 'False: ') + c.t), ' ', c.why); })) : null,
          h('div', { class: 'row' }, h('button', { class: 'btn', onclick: function () { deck = shuffle(A.TF).slice(0, 12); i = 0; right = 0; missed = []; next(); } }, 'New set'), h('button', { class: 'btn ghost', onclick: function () { U.go('drill'); } }, 'Back to Drill')))); return;
      }
      var c = deck[i], answered = false, fb = h('div', { class: 'stack' });
      function pick(v) {
        if (answered) return; answered = true; var ok = v === c.a; if (ok) right++; else missed.push(c); var tnow = Date.now(); if (A.score && c.topic) A.score.raw([(c.id || 'tf') + '|' + tnow, tnow, c.topic, A.SCORE.TF_D, ok ? 1 : 0, 0.25], true); U.sfx && U.sfx(ok ? 'ok' : 'bad');
        fb.appendChild(h('div', { class: 'callout ' + (ok ? 'good' : 'warn') }, (ok ? 'Right. ' : 'Not quite. It is ' + (c.a ? 'true' : 'false') + '. ') + c.why));
        fb.appendChild(h('button', { class: 'btn', onclick: function () { i++; next(); } }, i + 1 >= deck.length ? 'See score' : 'Next'));
      }
      area.appendChild(h('div', { class: 'card stack' }, h('div', { class: 'eyebrow' }, (i + 1) + ' of ' + deck.length + ' · ' + topicName(c.topic)), h('div', { class: 'stem' }, c.t), h('div', { class: 'row' }, h('button', { class: 'btn', style: { flex: 1 }, onclick: function () { pick(true); } }, 'True'), h('button', { class: 'btn ghost', style: { flex: 1 }, onclick: function () { pick(false); } }, 'False')), fb));
      U.keyFn = function (e) { var k = e.key.toLowerCase(); if (k === 't') pick(true); else if (k === 'f') pick(false); else if ((k === 'enter' || k === 'arrowright') && answered) { i++; next(); } };
    }
    next(); return function () { U.keyFn = null; };
  } };

  /* ================= Calc sprint ================= */
  function pickCalc(chapter, lastSkill) {
    for (var t = 0; t < 60; t++) {
      var o = { includeNew: true, lastSkill: lastSkill }; if (chapter) o.chapter = chapter;
      var it = A.nextItem(o); if (it && it.format === 'mc4' && it.num !== null && it.num !== undefined && it.calc) return it;
    }
    return null;
  }
  U.views.calc = { tab: 'drill', render: function (main) {
    var chapter = 0, area = h('div', { class: 'stack' }), chips = h('div', { class: 'row' }), n = 0, right = 0, last = null, t0 = 0, tick = null;
    main.appendChild(h('div', { class: 'stack' }, back('drill'), h('h1', { class: 'h1' }, 'Calc sprint'), h('p', { class: 'muted small' }, 'Type the answer. Rounding differences are accepted (within 1 on whole numbers, 0.2 on percents).'), chips, area));
    function paintChips() { U.clear(chips); U.unitChips().forEach(function (c) { chips.appendChild(h('button', { class: 'btn sm ' + (chapter === c[1] ? '' : 'ghost'), onclick: function () { chapter = c[1]; paintChips(); next(); } }, c[0])); }); }
    function parse(v) { var s = String(v).replace(/[$,%\s]/g, ''); var m = /^-?\d*\.?\d+$/.exec(s); return m ? parseFloat(s) : NaN; }
    function next() {
      clearInterval(tick); U.clear(area); var it = pickCalc(chapter, last); if (!it) { area.appendChild(h('div', { class: 'card' }, 'No calculation questions for this chapter yet.')); return; }
      last = it.skill; t0 = Date.now(); var isPct = /%/.test(it.options[it.answer]), tol = isPct ? 0.2 : 1, done = false;
      var inp = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Your answer', 'aria-label': 'Your answer', style: { fontSize: '20px', padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--text)', width: '100%' } });
      var clock = h('span', { class: 'mono muted' }, '0s'), fb = h('div', { class: 'stack' });
      tick = setInterval(function () { var s = Math.round((Date.now() - t0) / 1000); clock.textContent = s + 's of about ' + it.seconds + 's'; }, 500);
      function check() {
        if (done) return; var v = parse(inp.value); if (isNaN(v)) { U.toast('Type a number'); return; } done = true; clearInterval(tick);
        var ok = Math.abs(v - it.num) <= tol, ms = Date.now() - t0; n++; if (ok) right++;
        A.recordAnswer({ item: it, chosen: ok ? it.answer : -1, conf: null, ms: ms, mode: 'calc', fresh: true }); U.sfx && U.sfx(ok ? 'ok' : 'bad');
        fb.appendChild(h('div', { class: 'callout ' + (ok ? 'good' : 'warn') }, ok ? 'Correct in ' + Math.round(ms / 1000) + 's.' : 'The answer is ' + it.options[it.answer] + '.')); fb.appendChild(U.revealBlock(it, it.answer)); if (U.aiWhy && A.FEAT.ai) fb.appendChild(U.aiWhy(it, ok ? it.answer : -1));
        fb.appendChild(h('button', { class: 'btn', onclick: next }, 'Next')); paintScore(); inp.disabled = true;
        U.keyFn = function (e) { if (e.key === 'Enter') next(); };
      }
      var sc = h('div', { class: 'counter' }); function paintScore() { U.clear(sc); sc.appendChild(h('span', null, 'Score ', h('b', null, right + '/' + n))); sc.appendChild(h('span', null, clock)); }
      paintScore();
      area.appendChild(h('div', { class: 'card stack' }, sc, h('div', { class: 'eyebrow' }, it.topic + ' · ' + (A.skills[it.skill] ? A.skills[it.skill].label : '')), h('div', { class: 'stem' }, it.stem), it.table ? U.dataTable(it.table) : null, inp, h('button', { class: 'btn', onclick: check }, 'Check'), fb));
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); check(); } }); U.keyFn = null; setTimeout(function () { inp.focus(); }, 50);
    }
    paintChips(); next(); return function () { clearInterval(tick); U.keyFn = null; };
  } };

  /* ================= JE builder ================= */
  var COMMON = ['Cash', 'Accounts Receivable', 'Sales Revenue', 'Inventory', 'Cost of Goods Sold', 'Accounts Payable', 'Bad Debt Expense', 'Depreciation Expense'];
  function pickJe(chapter, lastSkill) {
    for (var t = 0; t < 80; t++) { var o = { includeNew: true, lastSkill: lastSkill }; if (chapter) o.chapter = chapter; var it = A.nextItem(o); if (it && it.format === 'je-pick' && it.je && it.optsRaw) return it; }
    return null;
  }
  U.views.jebuild = { tab: 'drill', render: function (main) {
    var chapter = 0, area = h('div', { class: 'stack' }), chips = h('div', { class: 'row' }), last = null, n = 0, right = 0;
    main.appendChild(h('div', { class: 'stack' }, back('drill'), h('h1', { class: 'h1' }, 'JE builder'), h('p', { class: 'muted small' }, 'Build the entry: choose each account, mark it Dr or Cr, and type the amount. Debits first, then credits, like the exam.'), chips, area));
    function paintChips() { U.clear(chips); U.unitChips().forEach(function (c) { chips.appendChild(h('button', { class: 'btn sm ' + (chapter === c[1] ? '' : 'ghost'), onclick: function () { chapter = c[1]; paintChips(); next(); } }, c[0])); }); }
    function next() {
      U.clear(area); var it = pickJe(chapter, last); if (!it) { area.appendChild(h('div', { class: 'card' }, 'No entry questions for this chapter yet.')); return; } last = it.skill;
      var seen = {}, accts = []; it.optsRaw.forEach(function (lines) { lines.forEach(function (l) { if (!seen[l[0]]) { seen[l[0]] = 1; accts.push(l[0]); } }); });
      COMMON.forEach(function (c) { if (accts.length < 8 && !seen[c]) { seen[c] = 1; accts.push(c); } }); accts.sort();
      var rows = [], rowsEl = h('div', { class: 'stack' }), fb = h('div', { class: 'stack' }), done = false, t0 = Date.now();
      function addRow() {
        if (rows.length >= 6) return;
        var sel = h('select', { 'aria-label': 'Account', class: 'jesel' }, h('option', { value: '' }, 'Account…'), accts.map(function (a) { return h('option', { value: a }, a); }));
        var side = h('select', { 'aria-label': 'Debit or credit', class: 'jeside' }, h('option', { value: 'd' }, 'Dr'), h('option', { value: 'c' }, 'Cr'));
        var amt = h('input', { type: 'text', inputmode: 'numeric', placeholder: 'Amount', 'aria-label': 'Amount', class: 'jeamt' });
        var r = { sel: sel, side: side, amt: amt, el: h('div', { class: 'jerow' }, sel, side, amt) }; rows.push(r); rowsEl.appendChild(r.el);
      }
      function check() {
        if (done) return; var got = [], bad = false;
        rows.forEach(function (r) { var a = r.sel.value, v = parseFloat(String(r.amt.value).replace(/[$,\s]/g, '')); if (!a && !r.amt.value) return; if (!a || isNaN(v)) { bad = true; return; } got.push([a, r.side.value, Math.round(v * 100) / 100]); });
        if (bad || !got.length) { U.toast('Fill in the account and amount on each line you use'); return; }
        done = true; var want = it.je.map(function (l) { return [l[0], l[1] !== null && l[1] !== undefined ? 'd' : 'c', l[1] !== null && l[1] !== undefined ? l[1] : l[2]]; });
        var key = function (x) { return x[0] + '|' + x[1] + '|' + x[2]; }, wk = want.map(key), gk = got.map(key);
        var ok = wk.length === gk.length && wk.every(function (k) { return gk.indexOf(k) >= 0; }) && gk.every(function (k) { return wk.indexOf(k) >= 0; });
        n++; if (ok) right++; A.recordAnswer({ item: it, chosen: ok ? it.answer : -1, conf: null, ms: Date.now() - t0, mode: 'jebuild', fresh: true }); U.sfx && U.sfx(ok ? 'ok' : 'bad');
        rows.forEach(function (r) { var k = r.sel.value + '|' + r.side.value + '|' + Math.round(parseFloat(String(r.amt.value).replace(/[$,\s]/g, '')) * 100) / 100; r.el.className = 'jerow ' + (wk.indexOf(k) >= 0 ? 'ok' : (r.sel.value ? 'no' : '')); r.sel.disabled = r.side.disabled = r.amt.disabled = true; });
        fb.appendChild(h('div', { class: 'callout ' + (ok ? 'good' : 'warn') }, ok ? 'That is the entry.' : 'Not quite. Lines marked red do not match.'));
        fb.appendChild(h('div', null, h('div', { class: 'lab' }, 'The entry'), U.jeTable(it.je))); if (it.rule) fb.appendChild(h('div', { class: 'small muted' }, it.rule));
        fb.appendChild(h('button', { class: 'btn', onclick: next }, 'Next entry'));
      }
      addRow(); addRow();
      area.appendChild(h('div', { class: 'card stack' }, h('div', { class: 'counter' }, h('span', null, 'Entries ', h('b', null, right + '/' + n))), h('div', { class: 'eyebrow' }, it.topic), h('div', { class: 'stem' }, it.stem), rowsEl,
        h('div', { class: 'row' }, h('button', { class: 'btn ghost sm', onclick: addRow }, '+ Add a line'), h('button', { class: 'btn', onclick: check }, 'Check entry')), fb));
    }
    paintChips(); next();
  } };

  /* ================= Weak spots ================= */
  A.weakRank = function (st) {
    st = st || A.store.state; var sc = A.score.now();
    return A.TOPICS.filter(function (t) { return A.SCORE_W[t.id] && A.topicSkillIds(t.id).length; }).map(function (t) {
      var ts = A.topicStat(t.id, st), p = sc.per[t.id];
      return { id: t.id, topic: t, p: p, n: ts.n, state: ts.state, cost: A.SCORE_W[t.id] * (1 - p) * 2.5 };
    }).sort(function (a, b) { return b.cost - a.cost; });
  };
  A.WEAK_READY = true;
  U.views.weak = { tab: 'drill', hash: null, live: true, render: function (main) {
    var st = A.store.state, rank = A.weakRank(st), top = rank.filter(function (x) { return x.n > 0 || true; }).slice(0, 8), top3 = rank.slice(0, 3).map(function (x) { return x.id; });
    var list = h('div', { class: 'stack' });
    top.forEach(function (x) {
      list.appendChild(h('div', { class: 'card stack' }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('div', null, h('b', null, topicName(x.id)), h('div', { class: 'small muted' }, (x.n ? 'Expected ' + Math.round(x.p * 100) + '% on exam questions · ' + A.stateLabel[x.state] : 'Not practiced yet'))), h('span', { class: 'pill ' + x.state }, '~' + (Math.round(x.cost * 10) / 10) + ' pts at risk')),
        h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: function () { U.go('session', { title: 'Weak spot ' + x.id, topics: [x.id], noFilter: true }); } }, 'Drill it'), A.STATIONS[x.id] ? h('button', { class: 'btn ghost sm', onclick: function () { U.go('station', { id: x.id }); } }, 'Reopen the lesson') : null)));
    });
    var pins = Object.keys(st.pins || {}).filter(function (id) { return id.indexOf('s:') !== 0 || (st.sample && st.sample.unlocked); }).length;
    main.appendChild(h('div', { class: 'stack' }, back('drill'), h('h1', { class: 'h1' }, 'Weak spots'), h('p', { class: 'muted' }, 'Ranked by exam points you are likely losing: how many questions the topic carries times how often you miss it. Untouched topics count as guessing.'),
      h('div', { class: 'card stack', style: { borderColor: 'var(--accent)' } }, h('div', { class: 'h2' }, 'Drill my 3 weakest'), h('p', { class: 'small muted' }, top3.map(topicName).join(' · ')), h('button', { class: 'btn', onclick: function () { A.store.mutate(function (s) { s.settings.weakDone = true; s.settings.updatedAt = Date.now(); }); U.go('session', { title: 'Weak spots', topics: top3, noFilter: true }); } }, 'Start')),
      list, pins ? h('p', { class: 'small muted' }, pins + ' question' + (pins === 1 ? '' : 's') + ' you got wrong while sure of yourself are pinned on the walk-in sheet.') : null));
  } };

  /* ================= Walk-in sheet ================= */
  var SH = A.SHEET || {}, FORMULAS = SH.FORMULAS || [], JES = SH.JES || [], TRAPS = SH.TRAPS || [];
  function mostMissed(st) {
    var rows = Object.keys(st.skills).map(function (k) { var s = st.skills[k]; if (!s.a || !s.a.length) return null; var wr = s.a.filter(function (x) { return !x[2]; }).length; return { id: k, wr: wr, n: s.a.length, p: A.skillP(k, st) }; }).filter(function (x) { return x && x.wr > 0; }).sort(function (a, b) { return (a.p - b.p) || (b.wr - a.wr); }).slice(0, 8);
    var out = rows.map(function (r) { var sk = A.skills[r.id]; var rule = ''; try { var rng = A.mulberry32(A.hash(r.id)); var it = A.freshItem(r.id, rng, {}); rule = it && it.rule || ''; } catch (e) {} return [topicName(sk.topic), sk.label, rule, r.wr + ' of last ' + r.n]; });
    return out;
  }
  function sheetEl(st, forFile) {
    var mm = mostMissed(st), unl = st.sample && st.sample.unlocked, pins = Object.keys(st.pins || {}).filter(function (id) { return unl || id.indexOf('s:') !== 0; }).slice(-8).reverse().map(function (id) { try { var it = A.makeItem(id); return [topicName(it.topic), it.rule || it.work]; } catch (e) { return null; } }).filter(Boolean);
    var w = h('div', { class: 'sheet stack' });
    if (FORMULAS.length) { w.appendChild(h('h2', { class: 'h2' }, SH.FORMULAS_TITLE || 'Formulas')); w.appendChild(U.dataTable({ head: SH.FORMULAS_HEAD || ['', 'Formula'], rows: FORMULAS })); }
    if (JES.length) { w.appendChild(h('h2', { class: 'h2' }, SH.JES_TITLE || 'Journal entry templates')); w.appendChild(U.dataTable({ head: SH.JES_HEAD || ['Transaction', 'Entry'], rows: JES })); }
    if (TRAPS.length) w.appendChild(h('h2', { class: 'h2' }, 'Top ' + TRAPS.length + ' traps')); w.appendChild(h('ol', { class: 'small', style: { margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' } }, TRAPS.map(function (t) { return h('li', null, t); })));
    w.appendChild(h('h2', { class: 'h2' }, 'Your most-missed')); w.appendChild(mm.length ? U.dataTable({ head: ['Topic', 'Skill', 'Rule', 'Misses'], rows: mm }) : h('p', { class: 'muted small' }, 'Fills in from your answers. Practice a bit and come back.'));
    if (pins.length) { w.appendChild(h('h2', { class: 'h2' }, 'Sure but wrong')); w.appendChild(U.dataTable({ head: ['Topic', 'Rule'], rows: pins })); }
    return w;
  }
  var WT = (A.COURSE.walkIn && A.COURSE.walkIn.title) || (A.COURSE.title + ' walk-in sheet');
  function sheetHtml(st) {
    var tmp = sheetEl(st, true), css = 'body{font-family:system-ui,sans-serif;margin:24px;color:#111}h1{font-size:20px}h2{font-size:15px;margin:14px 0 6px}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #bbb;padding:4px 6px;text-align:left;vertical-align:top}ol,li{font-size:12px}';
    return '<!doctype html><meta charset="utf-8"><title>' + WT + '</title><style>' + css + '</style><h1>' + WT + '</h1>' + tmp.innerHTML;
  }
  U.views.sheet = { tab: 'ref', hash: 'sheet', live: true, render: function (main) {
    var st = A.store.state, status = h('span', { class: 'muted small' });
    var save = h('button', { class: 'btn', onclick: async function () {
      try { var dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; if (!dl) { status.textContent = 'File saving is not available here.'; return; } await dl.save({ filename: (A.COURSE.id || 'study') + '-walk-in-sheet.html', data: new Blob([sheetHtml(A.store.state)], { type: 'text/html' }) }); status.textContent = 'Saved. Open it and print it.'; } catch (e) { status.textContent = 'Not saved.'; }
    } }, 'Save as a printable file');
    main.appendChild(h('div', { class: 'stack' }, back('ref', '← Notes sheet'), h('h1', { class: 'h1' }, 'Walk-in sheet'), h('p', { class: 'muted small' }, 'One screen of what to rehearse in the hall. Your most-missed list updates from your answers. The exam is closed book, so use this as a last read, not a crutch.'), h('div', { class: 'row noprint' }, save, status), sheetEl(st)));
  } };

  /* ================= Your data: export / import ================= */
  U.dataCard = function () {
    var msg = h('span', { class: 'muted small' });
    var exp = h('button', { class: 'btn ghost sm', onclick: async function () {
      try { var dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; if (!dl) { msg.textContent = 'File saving is not available here.'; return; } await dl.save({ filename: (A.COURSE.id || 'study') + '-progress.json', data: new Blob([JSON.stringify(Object.assign({}, A.store.state, { _score: A.score.events() }))], { type: 'application/json' }) }); msg.textContent = 'Saved.'; } catch (e) { msg.textContent = 'Not saved.'; }
    } }, 'Export my progress');
    var file = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' }, onchange: function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return; var r = new FileReader();
      r.onload = function () { try { var o = JSON.parse(r.result); if (!o || o.v !== 1) throw new Error('bad'); var sev = o._score; delete o._score; A.store.replace(A.mergeState(A.store.state, A.fillState(o))); if (Array.isArray(sev)) A.score.merge(sev); A.score.seed(A.store.state); msg.textContent = 'Merged.'; } catch (err) { msg.textContent = 'That file is not a progress export.'; } };
      r.readAsText(f);
    } });
    var imp = h('button', { class: 'btn ghost sm', onclick: function () { file.click(); } }, 'Import progress');
    return h('div', { class: 'card stack' }, h('div', { class: 'eyebrow' }, 'Your data'), h('p', { class: 'small muted' }, 'Progress saves in this browser and, when you are signed in, syncs between your devices. You can also keep a backup file.'), h('div', { class: 'row' }, exp, imp, file, msg));
  };
})();
