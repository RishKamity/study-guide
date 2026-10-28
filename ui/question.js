/* question.js — one practice question with strike-outs, confidence, instant explanatory feedback. */
U.question = function (item, o) {
  o = o || {}; var shownAt = Date.now(), sel = null, locked = false, struck = {}, res = null;
  var root = U.h('div', { class: 'q' }), optsEl = U.h('div', { class: 'opts' }), confEl = U.h('div', { class: 'conf hide' }), after = U.h('div');
  var t = A.TOPIC[item.topic];
  var meta = U.h('div', { class: 'qhead' }, U.h('div', { class: 'row', style: { gap: '8px' } }, o.label ? U.h('span', { class: 'eyebrow' }, o.label) : null, U.h('span', { class: 'pill' }, t ? (t.id + ' · ' + t.title) : item.topic), item.calc ? U.h('span', { class: 'pill' }, 'Calculator') : null), o.right || null);
  if (item.general) meta.appendChild(U.h('span', { class: 'pill gen', title: 'Written from standard textbook knowledge; check it against your notes.' }, 'Not from your course files'));
  root.appendChild(meta);
  root.appendChild(U.h('div', { class: 'stem' }, item.stem));
  if (item.table) root.appendChild(U.dataTable(item.table));
  var optEls = [];
  item.options.forEach(function (_, i) {
    var xb = U.h('button', { class: 'xbtn', type: 'button', 'aria-label': 'Cross out option ' + U.letters[i], title: 'Cross out', onclick: function (e) { e.stopPropagation(); if (locked) return; struck[i] = !struck[i]; if (struck[i] && sel === i) { sel = null; confEl.classList.add('hide'); } paint(); } }, '✕');
    var main = U.h('button', { class: 'optmain', type: 'button', onclick: function () { choose(i); } }, U.h('span', { class: 'lt' }, U.letters[i]), U.h('span', { class: 'tx' }, U.optBody(item, i)));
    var el = U.h('div', { class: 'opt' }, main, xb); optEls.push(el); optsEl.appendChild(el);
  });
  root.appendChild(optsEl);
  if (!o.pretest) {
    confEl.appendChild(U.h('div', { class: 'lbl' }, 'How sure are you? (this locks your answer)'));
    [['Sure', 0], ['Unsure', 1], ['Guess', 2]].forEach(function (c) { confEl.appendChild(U.h('button', { type: 'button', onclick: function () { submit(c[1]); } }, c[0])); });
    root.appendChild(confEl);
  }
  root.appendChild(after);
  function paint() {
    optEls.forEach(function (el, i) {
      el.className = 'opt' + (struck[i] ? ' struck' : '') + (sel === i && !locked ? ' sel' : '') + (locked ? ' locked' : '') + (locked && i === item.answer ? ' ok' : '') + (locked && i === sel && i !== item.answer ? ' bad' : '');
    });
  }
  function choose(i) {
    if (locked) return; struck[i] = false; sel = i; U.sfx('tick'); paint();
    if (o.pretest) submit(null); else confEl.classList.remove('hide');
  }
  function submit(conf) {
    if (locked || sel === null) return; locked = true;
    res = A.recordAnswer({ item: item, chosen: sel, conf: conf, ms: Date.now() - shownAt, mode: o.mode || 'learn', pretest: !!o.pretest, fresh: o.fresh });
    confEl.classList.add('hide'); paint(); U.sfx(res.correct ? 'ok' : 'bad'); if (res.milestone) { setTimeout(function () { U.sfx('win'); U.toast(res.milestone + ' in a row!'); }, 350); }
    var banner;
    if (o.pretest) banner = U.h('div', { class: 'callout' }, 'Pretest: not graded. Seeing the answer first makes the lesson stick.');
    else if (res.correct && conf === 2) banner = U.h('div', { class: 'callout warn' }, 'Right, but you guessed. It will come back once so it is earned.');
    else if (res.correct) banner = U.h('div', { class: 'callout good' }, 'Correct.' + (conf === 1 ? ' You were unsure, so it comes back once.' : ''));
    else if (conf === 0) banner = U.h('div', { class: 'callout bad' }, 'You were sure, and it was wrong. These are the dangerous ones. It is pinned to your walk-in sheet and returns soon.');
    else banner = U.h('div', { class: 'callout bad' }, 'Not yet. Read the rule and the work, then it returns in a few questions.');
    after.appendChild(U.h('div', { class: 'stack' }, banner, U.revealBlock(item, sel), (!o.pretest && U.aiWhy && A.FEAT.ai) ? U.aiWhy(item, sel) : null,
      o.onNext ? U.h('button', { class: 'btn block', type: 'button', onclick: function () { o.onNext(); } }, o.nextLabel || 'Next') : null));
    if (o.onAnswer) o.onAnswer({ correct: res.correct, chosen: sel, conf: conf, res: res });
    var nb = after.querySelector('.btn'); if (nb && o.focusNext !== false) setTimeout(function () { try { nb.focus({ preventScroll: true }); } catch (e) {} }, 0);
  }
  root.keys = function (e) {
    var k = e.key.toLowerCase();
    if (!locked) {
      var idx = 'abcd'.indexOf(k); if (idx < 0 && '1234'.indexOf(k) >= 0 && k.length === 1) idx = '1234'.indexOf(k);
      if (idx >= 0 && idx < 4) { choose(idx); e.preventDefault(); return true; }
      if (sel !== null && !o.pretest) { var ci = { s: 0, u: 1, g: 2 }[k]; if (ci !== undefined) { submit(ci); e.preventDefault(); return true; } }
      if (k === 'x' && sel !== null) { struck[sel] = true; sel = null; confEl.classList.add('hide'); paint(); return true; }
    } else if ((k === 'enter' || k === ' ') && o.onNext) { e.preventDefault(); o.onNext(); return true; }
    return false;
  };
  paint(); return root;
};
