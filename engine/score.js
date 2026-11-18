/* score.js — predicted score from your hit rate.
   Each answer is an event {i,t,k,d,o,w}: id, time, topic, item rating (difficulty), outcome 0/1, weight.
   Each exam topic's estimate is its recent, difficulty-adjusted hit rate, pulled toward your overall hit rate
   (topics share evidence) and, before there is evidence, toward a fair middle guess. The predicted score is the
   exam-weighted sum of topic estimates; a full mock or the sample exam blends in at 40%. The ± is the 80% margin.
   Events live in their own localStorage key and their own db doc (data/users/<id>/score); the score is rebuilt by
   replaying them, so merging two devices is a plain union and any model change re-scores the same history. */
(function () {
  var C = A.SCORE = { E: 1325, DIFF: { 1: 1150, 2: 1300, 3: 1450 }, SAMPLE_D: 1350, TF_D: 1150,
    PRIOR: 0.6, PRIOR_N: 6, TOPIC_N: 4, TOPIC_WIN: 20, TOPIC_REC: 0.94, ALL_WIN: 60, ALL_REC: 0.97, MOCK_W: 0.4, Z: 1.28, CHECK_W: 1.7, CHECK_TARGET: 0.9,
    GRACE: 24 * 3600e3, DECAY_DAY: 0.9, DECAY_MIN: 0.6, FLOOR: 1 / (A.COURSE.format.options || 4), CEIL: 0.995, MAX_EV: 15000, LSK: A.KEY('score') };
  var TOPS = Object.keys(A.SCORE_W), TOTW = TOPS.reduce(function (s, k) { return s + A.SCORE_W[k]; }, 0) || 1;
  /* kept for tests and simulations: chance a student of rating r gets an item of rating d right */
  function expct(r, d) { return 1 / (1 + Math.pow(10, (d - r) / 400)); }
  A.pCorrect = function (r, d) { return C.FLOOR + (1 - C.FLOOR) * expct(r, d === undefined ? C.E : d); };
  /* harder items count more when right, easier items count more when wrong */
  function dmult(d) { return Math.max(0.85, Math.min(1.15, 1 + ((d || 1300) - 1300) / 1000)); }
  function timeF(t, now) { var g = now - t - C.GRACE; if (g <= 0) return 1; return Math.max(C.DECAY_MIN, Math.pow(C.DECAY_DAY, g / 864e5)); }
  function fresh() { return { all: [], top: {}, cal: [] }; }
  function applyEv(T, e) {
    if (e[2] === '*') { if (e[4] === 2) T.cal.push([e[1], e[3]]); return; }    /* v1 rating-shift events (e[4] !== 2) are ignored */
    var x = [e[1], e[3], e[4], e[5]]; T.all.push(x); (T.top[e[2]] || (T.top[e[2]] = [])).push(x);
  }
  /* Recency-weighted hit rate. Recency is counted in units of question weight, so a quarter-weight answer
     (a T/F claim, a retake) only nudges older answers back by a quarter step. Evidence is how much you have
     answered, capped at what a full window of normal answers gives. A right answer always raises (or keeps)
     the hit rate and never lowers the evidence, so it can never lower the score. */
  function tally(list, win, rec, now) {
    var hw = 0, hc = 0, f = 1, n = 0, ev = 0, tw = 0, tt = 0, cap = 1.15 * (1 - Math.pow(rec, win)) / (1 - rec);
    for (var i = list.length - 1; i >= 0; i--) {
      var x = list[i], tf = timeF(x[0], now), m = x[2] ? dmult(x[1]) : 2 - dmult(x[1]), ew = x[3] * tf * m * f;
      n += x[3] * tf; ev += x[3] * m; hw += ew; if (x[2]) hc += ew; tw += x[3] * f; tt += x[3] * f * tf; f *= Math.pow(rec, x[3]);
    }
    var e = Math.min(ev, cap) * (tw ? tt / tw : 1), h = hw ? hc / hw : 0;   /* idle days shrink the evidence, not the hit rate */
    return { w: e, c: e * h, n: n };
  }
  function clampP(p) { return Math.max(C.FLOOR, Math.min(C.CEIL, p)); }
  function scoreOf(T, now) {
    /* overall hit rate; it only spreads to other topics as far as you have covered the exam (one farmed topic cannot lift the rest) */
    var g = tally(T.all, C.ALL_WIN, C.ALL_REC, now), m0 = (C.PRIOR_N * C.PRIOR + g.c) / (C.PRIOR_N + g.w);
    var cov = TOPS.reduce(function (a, k) { return a + Math.min(1, (T.top[k] || []).reduce(function (q, x) { return q + x[3]; }, 0) / 2); }, 0) / (TOPS.length || 1), m = C.PRIOR + (m0 - C.PRIOR) * cov;
    var tot = 0, ch = {}, per = {}, v = 0; A.UNITS.forEach(function (u) { ch[u] = [0, 0]; });
    TOPS.forEach(function (k) {
      var w = A.SCORE_W[k], tt = tally(T.top[k] || [], C.TOPIC_WIN, C.TOPIC_REC, now), p = clampP((C.TOPIC_N * m + tt.c) / (C.TOPIC_N + tt.w));
      per[k] = p; tot += w * p; v += Math.pow(w / TOTW, 2) * p * (1 - p) / (C.TOPIC_N + tt.n);
      var c = A.TOPIC[k].ch; if (ch[c]) { ch[c][0] += w * p; ch[c][1] += w; }
    });
    var chp = {}; Object.keys(ch).forEach(function (c) { if (ch[c][1]) chp[c] = 100 * ch[c][0] / ch[c][1]; });
    var pct = 100 * tot / TOTW; v += 0.5 * m * (1 - m) / (C.PRIOR_N + g.n * cov);
    var cal = T.cal.length ? T.cal[T.cal.length - 1] : null, pm = 100 * C.Z * Math.sqrt(v);
    /* a mock can pull the score toward its result, but never past what practice alone can reach: skipping mocks never caps you */
    if (cal) { pct = Math.min(100 * C.CEIL, (1 - C.MOCK_W) * pct + C.MOCK_W * Math.min(cal[1], 100 * C.CEIL)); pm *= (1 - C.MOCK_W); }
    return { pct: pct, ch: chp, per: per, pm: Math.max(0.5, pm), overall: m };
  }
  /* quick-check weight: solved per course so a perfect check (one right answer per exam topic) reads CHECK_TARGET,
     whether the exam has 5 topics or 30 (a fixed weight read 85% on big exams and 93% on small ones) */
  C.CHECK_W = (function () {
    function at(w) { var T = fresh(), t = 1e12; TOPS.forEach(function (k, i) { applyEv(T, ['c' + i, t + i, k, C.DIFF[2], 1, w]); }); return scoreOf(T, t + TOPS.length).pct; }
    var lo = 0.2, hi = 20, goal = 100 * C.CHECK_TARGET; if (!TOPS.length || at(hi) < goal) return hi; if (at(lo) > goal) return lo;
    for (var i = 0; i < 40; i++) { var mid = (lo + hi) / 2; if (at(mid) < goal) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  })();
  function cmp(a, b) { return a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0); }

  /* ---------- store ---------- */
  var ev = [], ids = {}, T = fresh(), lastT = 0, listeners = [], dirty = false;
  function lsLoad() { try { var o = JSON.parse(localStorage.getItem(C.LSK) || 'null'); if (o && o.v === 1 && Array.isArray(o.ev)) return o.ev; } catch (e) {} return []; }
  function lsSave() { try { localStorage.setItem(C.LSK, JSON.stringify({ v: 1, ev: ev })); } catch (e) {} }
  function valid(e) { return Array.isArray(e) && e.length === 6 && typeof e[0] === 'string' && typeof e[1] === 'number' && typeof e[2] === 'string' && typeof e[5] === 'number' && isFinite(e[5]); }
  function rebuild() { ev.sort(cmp); T = fresh(); ev.forEach(function (e) { applyEv(T, e); }); lastT = ev.length ? ev[ev.length - 1][1] : 0; }
  function trim() { if (ev.length > C.MAX_EV) { ev.sort(cmp); var cut = ev.splice(0, ev.length - C.MAX_EV); cut.forEach(function (e) { delete ids[e[0]]; }); } }
  function emit(prev, live) { var cur = A.score.now(); listeners.forEach(function (f) { try { f(cur, prev, live); } catch (e) {} }); }
  function insert(list) {
    var added = 0, inOrder = true;
    var tail = ev.length ? ev[ev.length - 1] : null;
    list.forEach(function (e) { if (!valid(e) || ids[e[0]]) return; ids[e[0]] = 1; if (tail && cmp(e, tail) < 0) inOrder = false; ev.push(e); tail = e; added++; });
    if (!added) return 0;
    if (inOrder && added === 1) { var e = ev[ev.length - 1]; applyEv(T, e); lastT = e[1]; } else rebuild();
    trim(); lsSave(); dirty = true; schedule(); return added;
  }
  /* item rating from an item id (cached) */
  var dcache = {};
  function itemRating(id) {
    if (dcache[id] !== undefined) return dcache[id];
    var d = C.DIFF[2];
    if (/^s:/.test(id)) d = C.SAMPLE_D;
    else if (!/^ai:/.test(id)) { try { var it = A.makeItem(id); d = C.DIFF[it.difficulty] || C.DIFF[2]; } catch (e) {} }
    return (dcache[id] = d);
  }
  function weightOf(o) {
    var w = 1;
    if (o.mode === 'aiset' || (o.item && o.item.ai)) w *= 0.5;
    if (o.retake) w *= 0.25;
    if (o.conf === 2) w *= 0.5;
    if (o.conf === 0 && !o.correct) w *= 1.5;
    if (o.mode === 'check') w *= C.CHECK_W;   /* a perfect quick check starts you near 90% */
    return w;
  }
  A.score = {
    now: function (t) { return scoreOf(T, t || Date.now()); },
    ratings: function () { return T; },
    events: function () { return ev; },
    onChange: function (f) { listeners.push(f); },
    /* live answer from A.recordAnswer; id matches the attempt key so later seeding never double counts */
    answer: function (o) {
      var sk = A.skills[o.item.skill]; if (!sk || !A.SCORE_W[sk.topic]) return;
      var prev = A.score.now();
      if (insert([[o.item.id + '|' + o.t, o.t, sk.topic, itemRating(o.item.id), o.correct ? 1 : 0, weightOf(o)]])) emit(prev, true);
    },
    raw: function (e, live) { if (!A.SCORE_W[e[2]]) return; var prev = A.score.now(); if (insert([e])) emit(prev, !!live); },
    /* backfill from the main state's attempt history (last 8 per skill); idempotent */
    seed: function (st) {
      var add = [];
      Object.keys(st.skills || {}).forEach(function (sid) {
        var sk = A.skills[sid]; if (!sk || !A.SCORE_W[sk.topic]) return;
        (st.skills[sid].a || []).forEach(function (x) { var id = x[0] + '|' + x[1]; if (ids[id]) return; add.push([id, x[1], sk.topic, itemRating(x[0]), x[2] ? 1 : 0, weightOf({ conf: x[3], correct: !!x[2], item: { ai: /^ai:/.test(x[0]) } })]); });
      });
      if (add.length) { var prev = A.score.now(); insert(add); emit(prev, false); }
      return add.length;
    },
    merge: function (list) { if (!Array.isArray(list)) return 0; var prev = A.score.now(); var n = insert(list); if (n) emit(prev, false); return n; },
    /* after a full mock or the sample exam: the latest result blends into the prediction at MOCK_W */
    calibrate: function (id, t, actualPct) {
      if (ids[id]) return; var prev = A.score.now();
      if (insert([[id, t, '*', actualPct, 2, 0]])) emit(prev, true);
    },
    /* score after every event, for the graph */
    series: function (maxPts) {
      var T2 = fresh(), out = [], n = ev.length, step = Math.max(1, Math.ceil(n / (maxPts || 120)));
      if (n) out.push([ev[0][1] - 1, scoreOf(fresh(), ev[0][1]).pct]);
      ev.forEach(function (e, i) { applyEv(T2, e); if (i % step === 0 || i === n - 1) out.push([e[1], scoreOf(T2, e[1]).pct]); });
      return out;
    },
    at: function (t) { var T2 = fresh(); for (var i = 0; i < ev.length && ev[i][1] <= t; i++) applyEv(T2, ev[i]); return scoreOf(T2, t).pct; },
    /* what 3 right answers at medium difficulty in each topic would add to the predicted score */
    gains: function (n) {
      n = n || 3; var now = Date.now(), base = scoreOf(T, now).pct, s = scoreOf(T, now);
      return TOPS.map(function (k) {
        var T2 = { all: T.all.slice(), top: {}, cal: T.cal }; Object.keys(T.top).forEach(function (q) { T2.top[q] = T.top[q]; }); T2.top[k] = (T.top[k] || []).slice();
        for (var i = 0; i < n; i++) { var x = [now, C.DIFF[2], 1, 1]; T2.all.push(x); T2.top[k].push(x); }
        return { id: k, p: s.per[k], gain: scoreOf(T2, now).pct - base, n: n };
      }).sort(function (a, b) { return b.gain - a.gain; });
    },
    pm: function () { return A.score.now().pm; },
    count: function (k) { return (T.top[k] || []).length; },
    flush: function () { return flush(); }
  };

  /* ---------- sync (own doc; the main state doc is untouched) ---------- */
  var ref = null, timer = null, writing = false, lastSent = 0;
  function schedule() { if (!ref) return; clearTimeout(timer); timer = setTimeout(flush, 8000); }
  async function flush() {
    if (!ref || writing || !dirty) return; writing = true; dirty = false;
    try { await ref.set({ v: 1, ev: ev.map(function (e) { return e.slice(); }) }); lastSent = ev.length; }
    catch (e) { dirty = true; clearTimeout(timer); timer = setTimeout(flush, 30000); }
    writing = false;
  }
  A.score.initSync = async function () {
    try {
      if (!(window.claude && window.claude.use)) return;
      var db = await window.claude.use('db'), um = await window.claude.use('user'); if (!db || !um) return;
      var id = await um.id(); if (!id) return;
      ref = db.doc('data/users/' + id + '/score');
      ref.onSnapshot(function (snap) {
        if (snap.hasPendingWrites || (snap.metadata && snap.metadata.hasPendingWrites)) return;
        var remote = snap.exists ? (snap.data() || {}).ev : null;
        if (Array.isArray(remote)) A.score.merge(remote);
        if (!Array.isArray(remote) || remote.length < ev.length) { dirty = true; schedule(); }
      }, function () {});
    } catch (e) {}
  };
  document.addEventListener('visibilitychange', function () { if (document.hidden) { clearTimeout(timer); flush(); } });
  window.addEventListener('pagehide', function () { flush(); });

  /* within-topic emphasis from the course notes: weighted average is rarely tested; FIFO/LIFO and highest/lowest are */
  Object.keys(A.COURSE.skillWeights || {}).forEach(function (k) { if (A.skills[k]) A.skills[k].w = A.COURSE.skillWeights[k]; });
  /* ---------- boot ---------- */
  insert(lsLoad()); dirty = false;
})();
