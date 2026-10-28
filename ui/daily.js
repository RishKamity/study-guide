/* daily.js — Daily puzzle: one question per calendar day, the same for every device, with a streak.
   The scheduled push reminder (set up by the skill, not the page) links to <artifact>#daily. */
(function () {
  var h = U.h;
  function dayKey(t) { var d = new Date(t || Date.now()); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function prevDay(k) { var p = k.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]); d.setDate(d.getDate() - 1); return dayKey(d.getTime()); }
  A.dailyItem = function (k) {
    k = k || dayKey(); var rng = A.mulberry32(A.hash((A.COURSE.id || 'guide') + '|' + k));
    var tops = A.TOPICS.filter(function (t) { return t.exam && A.topicSkillIds(t.id).length; }); if (!tops.length) return null;
    var tot = tops.reduce(function (s, t) { return s + (A.SCORE_W[t.id] || t.exam); }, 0), r = rng() * tot, pick = tops[0];
    for (var i = 0; i < tops.length; i++) { r -= (A.SCORE_W[tops[i].id] || tops[i].exam); if (r <= 0) { pick = tops[i]; break; } }
    var sk = A.topicSkillIds(pick.id); return A.freshItem(sk[Math.floor(rng() * sk.length)], rng, {});
  };
  function D() { var s = A.store.state.settings; return s.daily || { last: '', streak: 0, best: 0 }; }
  function record(ok) {
    var k = dayKey();
    A.store.mutate(function (st) { var d = st.settings.daily || { last: '', streak: 0, best: 0 }; if (d.last === k) return; d.streak = d.last === prevDay(k) ? d.streak + 1 : 1; d.best = Math.max(d.best || 0, d.streak); d.last = k; d.lastOk = !!ok; st.settings.daily = d; st.settings.updatedAt = Date.now(); });
  }
  U.dailyCard = function () {
    if (!A.FEAT.daily || Date.now() > A.EXAM_AT) return null; var d = D(), done = d.last === dayKey();
    return h('div', { class: 'card stack' }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('div', { class: 'eyebrow' }, 'Daily puzzle'), h('span', { class: 'pill' + (d.streak ? ' solid' : '') }, (done || d.last === prevDay(dayKey()) ? d.streak : 0) + '-day streak')),
      h('p', { class: 'small muted' }, done ? 'Done for today' + (d.lastOk ? ', and you got it.' : '. Tomorrow’s is waiting.') : 'One question, under a minute. Keep the streak going.'),
      done ? null : h('button', { class: 'btn', onclick: function () { U.go('daily'); } }, 'Solve today’s puzzle'));
  };
  U.views.daily = { tab: 'today', hash: 'daily', render: function (main) {
    var it = A.dailyItem(), d = D(), done = d.last === dayKey();
    var wrap = h('div', { class: 'stack' }, h('button', { class: 'btn ghost sm', style: { alignSelf: 'flex-start' }, onclick: function () { U.go('today'); } }, '← Today'), h('h1', { class: 'h1' }, 'Daily puzzle'));
    if (!it) { wrap.appendChild(h('p', { class: 'muted' }, 'No questions yet.')); main.appendChild(wrap); return; }
    if (done) wrap.appendChild(h('div', { class: 'callout good' }, 'You already solved today’s puzzle. Streak: ' + d.streak + ' day' + (d.streak === 1 ? '' : 's') + '. You can try it again below; it will not change the streak.'));
    var q = U.question(it, { label: 'Today', mode: 'daily', onAnswer: function (r) { if (!done) record(r.correct); }, onNext: function () { U.go('today'); }, nextLabel: 'Back to Today' });
    wrap.appendChild(h('div', { class: 'card' }, q)); main.appendChild(wrap); U.keyFn = function (e) { q.keys(e); };
    return function () { U.keyFn = null; };
  } };
})();
