/* ai.js — AI helpers through the `sample` capability: why explainer, tutor drawer/tab, AI weak-spot sets.
   Every call starts from a click. Nothing runs on load. The page works fully when sample is null. */
(function () {
  var h = U.h, S = null, state = 'pending', waiters = [], dead = false;
  function fire() { var w = waiters; waiters = []; w.forEach(function (f) { try { f(state === 'ok'); } catch (e) {} }); }
  function init() {
    try {
      if (window.claude && window.claude.use) {
        var timer = setTimeout(function () { if (state === 'pending') { state = 'none'; fire(); } }, 12000);
        window.claude.use('sample').then(function (s) { clearTimeout(timer); S = s || null; state = S ? 'ok' : 'none'; fire(); }, function () { clearTimeout(timer); state = 'none'; fire(); });
      } else { state = 'none'; setTimeout(fire, 0); }
    } catch (e) { state = 'none'; }
  }
  U.aiOnReady = function (fn) { if (state === 'pending') waiters.push(fn); else fn(state === 'ok'); };
  U.aiOK = function () { return state === 'ok' && !dead; };
  function kill() { dead = true; Array.prototype.forEach.call(document.querySelectorAll('.aihide'), function (e) { e.hidden = true; }); }
  /* element hidden until AI is available; hidden for good after not_granted etc. */
  U.aiShow = function (el) { el.classList.add('aihide'); el.hidden = true; U.aiOnReady(function (ok) { el.hidden = !(ok && !dead); }); return el; };
  U.aiBtn = function (label, fn, cls) { return U.aiShow(h('button', { class: cls || 'btn ghost sm', type: 'button', onclick: fn }, label)); };
  U.aiNote = function () { var el = h('p', { class: 'small dim' }, 'AI help needs the page open in claude.ai while signed in.'); el.hidden = true; U.aiOnReady(function (ok) { el.hidden = ok && !dead; }); el.classList.add('ainote'); return el; };
  function errMsg(e) {
    var c = e && e.code;
    if (c === 'cancelled') return null;
    if (c === 'not_granted' || c === 'sampling_disabled' || c === 'not_declared' || c === 'capability_disabled' || c === 'capability_removed') { kill(); return 'AI help is turned off for this page.'; }
    if (c === 'rate_limited') return 'AI is busy, try again in a minute.';
    if (c === 'session_expired') return 'Sign in to Claude again to use AI help.';
    if (c === 'invalid_json') return 'The AI answer was not usable. Try once more.';
    return 'The AI helper could not answer just now. The rule and work above still apply.';
  }
  U.aiErr = errMsg;

  /* ---------- shared course context ---------- */
  var TC = A.COURSE.tutor || {};
  var RULES = (TC.context || ('You are a tutor helping a student prepare for ' + [A.COURSE.course, A.COURSE.exam].filter(Boolean).join(' ') + '.')) + '\n' + (TC.conventions ? 'Course conventions: ' + TC.conventions + '\n' : '') + 'Be brief, plain and concrete. No long paragraphs. Write journal entries or worked steps as plain lines. If unsure, say so.';
  function topicCtx(tid) {
    var t = A.TOPIC[tid], S0 = A.STATIONS[tid], out = '';
    if (t) out += 'Topic: ' + t.id + ' ' + t.title + '\n';
    if (S0 && S0.cards) S0.cards.forEach(function (c) { if (c && c.h && c.rule) out += '- ' + c.h + ': ' + String(c.rule).replace(/\s+/g, ' ') + '\n'; });
    return out.slice(0, 6000);
  }
  function optText(item, i) { return item.optsRaw && Array.isArray(item.optsRaw[i]) ? A.jeStr(item.optsRaw[i]) : item.options[i]; }
  function itemText(item, chosen) {
    var L = 'ABCD', s = 'Question: ' + item.stem + '\n';
    if (item.table) { s += 'Table: ' + (item.table.head ? item.table.head.join(' | ') + '\n' : '') + item.table.rows.map(function (r) { return r.join(' | '); }).join('\n') + '\n'; }
    item.options.forEach(function (_, i) { s += L[i] + '. ' + optText(item, i) + '\n'; });
    s += 'Correct: ' + L[item.answer] + '\n';
    if (chosen !== null && chosen !== undefined && chosen >= 0) s += 'Student chose: ' + L[chosen] + (chosen === item.answer ? ' (correct)' : ' (wrong)') + '\n';
    if (item.rule) s += 'Rule: ' + item.rule + '\n'; if (item.work) s += 'Work: ' + item.work + '\n';
    var wh = (item.why || []).map(function (w, i) { return w ? L[i] + ': ' + w : null; }).filter(Boolean); if (wh.length) s += 'Why the wrong options tempt: ' + wh.join(' ') + '\n';
    return s;
  }
  function bubbleText(el, text) { el.textContent = text; }
  function aiLabel() { return h('span', { class: 'ailab' }, 'AI'); }

  /* ---------- 1. why explainer ---------- */
  U.aiWhy = function (item, chosen) {
    var box = h('div', { class: 'stack aiwhy' }), out = h('div', { class: 'callout ai', hidden: true }), outTxt = h('div'), follow = h('div', { class: 'row', hidden: true }), ctl = null, busy = false, turns = null;
    out.appendChild(aiLabel()); out.appendChild(outTxt);
    var stop = h('button', { class: 'btn ghost sm', type: 'button', hidden: true, onclick: function () { if (ctl) ctl.abort(); } }, 'Stop');
    function run(msgs, tier, cache, onDone) {
      if (busy) return; busy = true; ctl = new AbortController(); stop.hidden = false; outTxt.textContent = 'Thinking…'; out.hidden = false;
      var opts = { signal: ctl.signal, modelTier: tier, cache: cache, onText: function (u) { if (!box.isConnected) { ctl.abort(); return; } outTxt.textContent = u.text; } };
      S(msgs, opts).then(function (r) { outTxt.textContent = r.text + (r.truncated ? ' …' : ''); onDone(r.text); }, function (e) { var m = errMsg(e); if (m) outTxt.textContent = (e.text ? e.text + '\n\n' : '') + m; else if (!e.text) out.hidden = true; }).then(function () { busy = false; stop.hidden = true; });
    }
    var btn = U.aiBtn('Why? (AI)', function () {
      var base = RULES + '\n\n' + topicCtx(item.topic) + '\n' + itemText(item, chosen) + '\nIn at most 3 short sentences: (1) the specific mistake the student’s choice reflects (or, if they were right, the trap to watch), (2) the rule, (3) the right reasoning using this question’s numbers.';
      turns = [{ role: 'user', content: base }]; btn.hidden = true;
      run(turns, 'quick', true, function (t) { turns.push({ role: 'assistant', content: t }); follow.hidden = false; });
    });
    var inp = h('input', { type: 'text', placeholder: 'Ask a follow-up', 'aria-label': 'Ask a follow-up', class: 'aiinp' });
    function ask() {
      var v = inp.value.trim(); if (!v || busy || !turns) return; inp.value = ''; turns.push({ role: 'user', content: v });
      run(turns.slice(-8), 'default', false, function (t) { turns.push({ role: 'assistant', content: t }); });
    }
    inp.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); ask(); } });
    follow.appendChild(inp); follow.appendChild(h('button', { class: 'btn sm', type: 'button', onclick: ask }, 'Ask'));
    var tbtn = U.aiBtn('Ask the tutor', function () { U.openTutor(item.topic, 'I just did this question and want to understand it:\n' + itemText(item, chosen)); });
    box.appendChild(h('div', { class: 'row' }, btn, tbtn, stop)); box.appendChild(out); box.appendChild(follow);
    return box;
  };

  /* ---------- 2. tutor ---------- */
  var HIST = {};
  function tutorPanel(topic, seed) {
    var root = h('div', { class: 'stack tutor' }), log = h('div', { class: 'tlog stack' }), busy = false, ctl = null;
    var sel = h('select', { 'aria-label': 'Topic', class: 'jesel', style: { font: 'inherit', padding: '10px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--text)' } });
    A.TOPICS.filter(function (t) { return t.exam && A.STATIONS[t.id]; }).forEach(function (t) { sel.appendChild(h('option', { value: t.id }, t.id + ' · ' + t.title)); });
    topic = A.TOPIC[topic] && A.STATIONS[topic] ? topic : '4E'; sel.value = topic;
    var inp = h('textarea', { rows: 2, placeholder: 'Ask about this topic…', 'aria-label': 'Message', class: 'aiinp', style: { resize: 'vertical' } });
    var stop = h('button', { class: 'btn ghost sm', type: 'button', hidden: true, onclick: function () { if (ctl) ctl.abort(); } }, 'Stop');
    function hist() { return HIST[topic] || (HIST[topic] = []); }
    function paint() {
      U.clear(log); var hh = hist();
      if (!hh.length) log.appendChild(h('p', { class: 'small muted' }, 'Ask anything about this topic, or tap a prompt below. Answers are short and end with a check question.'));
      hh.forEach(function (m, i) {
        var b = h('div', { class: 'tmsg ' + m.role }, m.role === 'assistant' ? aiLabel() : null, h('div', { class: 'tt' }, m.content));
        if (m.role === 'assistant') { var q = hh[i - 1] && hh[i - 1].content; b.appendChild(h('button', { class: 'btn ghost sm', type: 'button', onclick: function () { A.store.mutate(function (s) { s.office = s.office || []; if (!s.office.some(function (x) { return x.q === q; })) s.office.push({ q: String(q).slice(0, 300), at: Date.now(), topic: topic }); }); U.toast('Saved for office hours'); } }, 'Save for office hours')); }
        log.appendChild(b);
      });
    }
    function send(text, label) {
      text = String(text || '').trim(); if (!text || busy) return; busy = true; var hh = hist(); hh.push({ role: 'user', content: label || text }); paint();
      var live = h('div', { class: 'tmsg assistant' }, aiLabel(), h('div', { class: 'tt' }, 'Thinking…')); log.appendChild(live); stop.hidden = false; ctl = new AbortController();
      var lead = RULES + '\n\n' + topicCtx(topic) + '\nReply rules: at most 120 words unless a worked example is requested; end with one short check question for the student.';
      var turns = [{ role: 'user', content: lead }].concat(hh.slice(0, -1).slice(-9).map(function (m) { return { role: m.role, content: m.content }; })); turns.push({ role: 'user', content: text });
      S(turns, { cache: false, signal: ctl.signal, modelTier: 'default', onText: function (u) { if (!root.isConnected) { ctl.abort(); return; } live.querySelector('.tt').textContent = u.text; } }).then(function (r) { hh.push({ role: 'assistant', content: r.text }); if (hh.length > 10) HIST[topic] = hh.slice(-10); }, function (e) { var m = errMsg(e); if (m) hh.push({ role: 'assistant', content: (e.text ? e.text + '\n\n' : '') + m }); else if (e.text) hh.push({ role: 'assistant', content: e.text }); }).then(function () { busy = false; stop.hidden = true; if (root.isConnected) paint(); });
    }
    sel.addEventListener('change', function () { topic = sel.value; paint(); });
    var chips = h('div', { class: 'row' }); [['Explain like I’m new', 'Explain this topic like I am new to it.'], ['Give me an analogy', 'Give me an analogy for the main idea of this topic.'], ['Similar example', 'Walk me through a similar worked example with different numbers.'], ['Quiz me', 'Quiz me with one question on this topic. Wait for my answer.'], ['What’s the trap?', 'What is the most common trap on this topic and how do I avoid it?']].forEach(function (c) { chips.appendChild(h('button', { class: 'btn ghost sm', type: 'button', onclick: function () { send(c[1], c[0]); } }, c[0])); });
    inp.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); var v = inp.value; inp.value = ''; send(v); } });
    root.appendChild(sel); root.appendChild(log); root.appendChild(chips); root.appendChild(inp); root.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn sm', type: 'button', onclick: function () { var v = inp.value; inp.value = ''; send(v); } }, 'Send'), stop));
    paint(); if (seed) setTimeout(function () { send(seed, 'About the question I just answered'); }, 0);
    return root;
  }
  U.openTutor = function (topic, seed) {
    if (!U.aiOK()) return; var old = document.getElementById('tutordrawer'); if (old) old.remove();
    var d = h('div', { id: 'tutordrawer', class: 'drawer', role: 'dialog', 'aria-label': 'Tutor' });
    d.appendChild(h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('div', { class: 'h3' }, 'Tutor'), h('button', { class: 'btn ghost sm', type: 'button', onclick: function () { d.remove(); } }, 'Close')));
    d.appendChild(tutorPanel(topic, seed)); document.body.appendChild(d);
  };
  U.views.tutor = { tab: 'drill', render: function (main, p) {
    main.appendChild(h('div', { class: 'stack' }, h('button', { class: 'btn ghost sm', style: { alignSelf: 'flex-start' }, onclick: function () { U.go('drill'); } }, '← Drill'), h('h1', { class: 'h1' }, 'Tutor'), U.aiNote(), U.aiShow(h('div', { class: 'stack' }, tutorPanel(p && p.topic)))));
  } };

  /* ---------- 3. AI weak-spot set ---------- */
  function recentMisses(st) {
    var rows = [];
    Object.keys(st.skills).forEach(function (k) { (st.skills[k].a || []).forEach(function (x) { if (!x[2] && String(x[0]).indexOf('s:') !== 0 && A.skills[k]) rows.push({ skill: k, id: x[0], at: x[1] }); }); });
    rows.sort(function (a, b) { return b.at - a.at; }); return rows.slice(0, 10);
  }
  function conceptTopic(tid) { return A.skills[tid + '.bank'] && A.TOPIC[tid] && A.TOPIC[tid].ch >= 4; }
  function validItem(o) {
    if (!o || typeof o.stem !== 'string' || o.stem.length < 15 || o.stem.length > 600) return false;
    if (!Array.isArray(o.options) || o.options.length !== 4 || o.options.some(function (x) { return typeof x !== 'string' || !x.trim() || x.length > 300; })) return false;
    if (new Set(o.options.map(function (x) { return x.trim().toLowerCase(); })).size !== 4) return false;
    if (typeof o.answer !== 'number' || o.answer < 0 || o.answer > 3 || o.answer % 1) return false;
    if (!A.TOPIC[o.topic] || !conceptTopic(o.topic)) return false;
    return true;
  }
  function toItem(o, n) {
    var rng = A.mulberry32(Math.floor(Math.random() * 4e9)), idx = rng.shuffle([0, 1, 2, 3]);
    var opts = idx.map(function (i) { return o.options[i]; }), why = idx.map(function (i) { return Array.isArray(o.why) && typeof o.why[i] === 'string' ? o.why[i] : null; });
    return { id: 'ai:' + n + ':' + Date.now().toString(36), topic: o.topic, skill: o.topic + '.bank', format: 'mc4', stem: o.stem, table: null, options: opts, answer: idx.indexOf(o.answer), rule: typeof o.rule === 'string' ? o.rule : '', work: '', why: why, je: null, difficulty: 2, calc: false, seconds: 45, num: null, ai: true };
  }
  function buildSet(setStatus, signal) {
    var st = A.store.state, ms = recentMisses(st), plans = [], rng = A.mulberry32(Math.floor(Math.random() * 4e9));
    var skillsSeen = {}, tops = {}; ms.forEach(function (m) { skillsSeen[m.skill] = (skillsSeen[m.skill] || 0) + 1; tops[A.skills[m.skill].topic] = (tops[A.skills[m.skill].topic] || 0) + 1; });
    /* generator items first (numbers always come from local code) */
    var local = [];
    Object.keys(skillsSeen).sort(function (a, b) { return skillsSeen[b] - skillsSeen[a]; }).forEach(function (k) { if (local.length < 5 && A.skills[k].kind === 'gen') { var it = A.freshItem(k, rng, st.seen); if (it) local.push(it); } });
    var cTopics = Object.keys(tops).filter(conceptTopic).sort(function (a, b) { return tops[b] - tops[a]; }).slice(0, 3);
    if (!cTopics.length) cTopics = A.TOPICS.filter(function (t) { return t.ch >= 4 && conceptTopic(t.id); }).map(function (t) { return t.id; }).sort(function (a, b) { return A.topicStat(a).p - A.topicStat(b).p; }).slice(0, 2);
    var want = Math.max(2, Math.min(3, 5 - Math.min(local.length, 2)));
    var missTxt = ms.map(function (m) { var s = A.skills[m.skill], it = null; try { it = A.makeItem(m.id); } catch (e) {} return '- ' + s.topic + ' ' + s.label + (it ? ': ' + String(it.stem).slice(0, 160) + ' (rule: ' + String(it.rule || '').slice(0, 120) + ')' : ''); }).join('\n');
    var ctx = cTopics.map(topicCtx).join('\n');
    var prompt = RULES + '\n\nThe student recently missed these:\n' + missTxt + '\n\nTopic notes:\n' + ctx + '\n\nWrite ' + want + ' NEW conceptual multiple-choice questions (no calculations, no dollar figures needed) aimed at the same confusions, on these topic ids only: ' + cTopics.join(', ') + '. Four options, exactly one correct, plausible wrong options that each encode a real mistake. Reply with only JSON: {"items":[{"topic":"4E","stem":"...","options":["...","...","...","..."],"answer":0,"rule":"one sentence","why":["why A is wrong or right","...","...","..."]}]}';
    setStatus('Writing questions…');
    return S.json(prompt, { modelTier: 'default', signal: signal, cache: false }).then(function (r) {
      var raw = (r && r.items || []).filter(validItem).slice(0, want);
      if (!raw.length) return { items: local, dropped: want, ai: 0 };
      setStatus('Checking them with an independent pass…');
      var L = 'ABCD', vp = 'Answer each multiple-choice question for a student in ' + (A.COURSE.course || 'this course') + (TC.conventions ? ' (course conventions: ' + TC.conventions + ')' : '') + '. Reply with only JSON: {"answers":[{"n":0,"answer":"A"}]}. If a question has no single best answer, use "X".\n\n' + raw.map(function (o, n) { return 'n=' + n + '\n' + o.stem + '\n' + o.options.map(function (x, i) { return L[i] + '. ' + x; }).join('\n'); }).join('\n\n');
      return S.json(vp, { modelTier: 'default', signal: signal, cache: false }).then(function (v) {
        var ans = {}; ((v && v.answers) || []).forEach(function (a) { if (a && typeof a.n === 'number') ans[a.n] = String(a.answer || '').toUpperCase(); });
        var kept = []; raw.forEach(function (o, n) { if (ans[n] === L[o.answer]) kept.push(toItem(o, n)); });
        var items = local.concat(kept); return { items: items, dropped: raw.length - kept.length, ai: kept.length };
      });
    });
  }
  U.views.aiset = { tab: 'drill', render: function (main) {
    var area = h('div', { class: 'stack' }), ctl = null;
    main.appendChild(h('div', { class: 'stack' }, h('button', { class: 'btn ghost sm', style: { alignSelf: 'flex-start' }, onclick: function () { U.go('drill'); } }, '← Drill'), h('h1', { class: 'h1' }, 'AI weak-spot set'), U.aiNote(), area));
    function intro() {
      U.clear(area); var ms = recentMisses(A.store.state);
      area.appendChild(h('p', { class: 'muted' }, 'Builds five questions aimed at your ten most recent misses. Calculations come from the local generators, so the numbers are always computed, never guessed. Concept questions written by AI are checked by a second independent pass and dropped if the two passes disagree.'));
      if (!ms.length) { area.appendChild(h('div', { class: 'callout' }, 'Answer a few questions first. This set aims at what you miss.')); return; }
      var go = U.aiBtn('Build my set', start, 'btn'); area.appendChild(go);
      area.appendChild(h('button', { class: 'btn ghost sm', onclick: function () { localSet(); } }, 'Use the local generators only'));
    }
    function localSet(note) {
      var st = A.store.state, ms = recentMisses(st), rng = A.mulberry32(Math.floor(Math.random() * 4e9)), items = [], seen = {};
      ms.forEach(function (m) { if (items.length < 5 && !seen[m.skill]) { seen[m.skill] = 1; var it = A.freshItem(m.skill, rng, st.seen); if (it) items.push(it); } });
      run(items, note || 'Built from the local generators.');
    }
    function start() {
      if (!U.aiOK()) return; ctl = new AbortController(); U.clear(area); var status = h('p', { class: 'muted' }, 'Thinking…'); area.appendChild(status);
      area.appendChild(h('button', { class: 'btn ghost sm', onclick: function () { ctl.abort(); intro(); } }, 'Stop'));
      buildSet(function (t) { status.textContent = t; }, ctl.signal).then(function (r) {
        if (!main.isConnected) return; if (!r.items.length) { localSet('AI could not write usable questions this time, so this set uses the local generators.'); return; }
        run(r.items, r.ai ? r.ai + ' AI-written question' + (r.ai === 1 ? '' : 's') + (r.dropped ? ' (' + r.dropped + ' dropped by the check)' : '') + ', the rest computed locally.' : 'Built from the local generators.');
      }, function (e) {
        if (!main.isConnected || (e && e.code === 'cancelled')) return;
        var m = errMsg(e); if (e && e.code === 'rate_limited') localSet('AI is busy, try again in a minute. Here is a set from the local generators instead.'); else { U.clear(area); area.appendChild(h('div', { class: 'callout warn' }, m)); intro(); }
      });
    }
    function run(items, note) {
      var i = 0, c = 0;
      function one() {
        U.clear(area);
        if (i >= items.length) { area.appendChild(h('div', { class: 'card stack' }, h('div', { class: 'big' }, c + '/' + items.length), h('p', { class: 'muted' }, 'Anything you missed is back in your Misses queue.'), h('div', { class: 'row' }, h('button', { class: 'btn', onclick: intro }, 'Another set'), h('button', { class: 'btn ghost', onclick: function () { U.go('drill'); } }, 'Back to Drill')))); return; }
        var it = items[i], q = U.question(it, { label: 'Q' + (i + 1) + '/' + items.length, onAnswer: function (r) { if (r.correct) c++; }, onNext: function () { i++; one(); }, nextLabel: i + 1 >= items.length ? 'Finish' : 'Next', mode: 'aiset' });
        var card = h('div', { class: 'card stack' }); if (i === 0 && note) card.appendChild(h('p', { class: 'small muted' }, note));
        if (it.ai) card.appendChild(h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'ailab' }, 'AI-written'), h('button', { class: 'btn ghost sm', type: 'button', onclick: function () { items.splice(i, 1); U.toast('Dropped'); one(); } }, 'Report wrong')));
        card.appendChild(q); area.appendChild(card); U.keyFn = function (e) { q.keys(e); };
      }
      one();
    }
    intro(); return function () { if (ctl) ctl.abort(); U.keyFn = null; };
  } };

  /* Drill menu card for AI features */
  U.aiCards = function () {
    var wrap = h('div', { class: 'stack' });
    var c1 = U.aiShow(h('div', { class: 'card stack' }, h('div', { class: 'h3' }, 'AI weak-spot set'), h('p', { class: 'muted small' }, 'Five fresh questions aimed at your latest misses. Checked twice before you see them.'), h('button', { class: 'btn', onclick: function () { U.go('aiset'); } }, 'Build a set')));
    var c2 = U.aiShow(h('div', { class: 'card stack' }, h('div', { class: 'h3' }, 'Tutor'), h('p', { class: 'muted small' }, 'Ask about any topic. Short answers, then a check question.'), h('button', { class: 'btn', onclick: function () { U.go('tutor', {}); } }, 'Open the tutor')));
    wrap.appendChild(c1); wrap.appendChild(c2); wrap.appendChild(U.aiNote()); return wrap;
  };
  init();
})();
