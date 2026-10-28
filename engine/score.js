/* score.js — Elo-style predicted score.
   Each exam topic has a rating. Each answer is an event {i,t,k,d,o,w}: id, time, topic, item rating, outcome 0/1, weight.
   Ratings are rebuilt by replaying events in time order, so merging two devices is a plain union of events:
   nothing is ever overwritten, and an older open tab can never erase progress.
   Events live in their own localStorage key and their own db doc (data/users/<id>/score), separate from the main state. */
(function () {
  var C = A.SCORE = { E: 1325, DIFF: { 1: 1150, 2: 1300, 3: 1450 }, SAMPLE_D: 1350, TF_D: 1150, G0: 1100, OFF0: -100, KG: 8, K_PROV: 100, K: 40, PROV_N: 8,
    GRACE: 24 * 3600e3, DECAY_PER_DAY: 15, DECAY_MAX: 60, FLOOR: 1 / (A.COURSE.format.options || 4), MAX_EV: 15000, LSK: A.KEY('score') };
  var TOPS = Object.keys(A.SCORE_W), TOTW = TOPS.reduce(function (s, k) { return s + A.SCORE_W[k]; }, 0) || 1;
  function expct(r, d) { return 1 / (1 + Math.pow(10, (d - r) / 400)); }
  A.pCorrect = function (r, d) { return C.FLOOR + (1 - C.FLOOR) * expct(r, d === undefined ? C.E : d); };
  function decayAmt(gapMs) { var g = gapMs - C.GRACE; if (g <= 0) return 0; return Math.min(C.DECAY_MAX, C.DECAY_PER_DAY * g / 864e5); }
  function fresh() { return { r: C.OFF0, n: 0, last: 0, dec: 0 }; }
  function gOf(T) { return T._g ? T._g.g : C.G0; }
  function settle(tt, t) { if (!tt.last) return; var want = decayAmt(t - tt.last); if (want > tt.dec) { tt.r -= (want - tt.dec); tt.dec = want; } }
  function applyEv(T, e) {
    var G = T._g || (T._g = { g: C.G0 });
    if (e[2] === '*') { G.g += e[5]; return; }
    var tt = T[e[2]] || (T[e[2]] = fresh()); settle(tt, e[1]);
    var p = A.pCorrect(G.g + tt.r, e[3]), K = tt.n < C.PROV_N ? C.K_PROV : C.K, delta = e[5] * (e[4] - p);
    G.g += C.KG * delta / (1 + tt.n / 8); tt.r += K * delta; tt.n++; tt.last = e[1]; tt.dec = 0;
  }
  function rAt(tt, now) { if (!tt) return C.OFF0; var want = decayAmt(now - (tt.last || now)); return tt.r - Math.max(0, want - tt.dec); }
  function scoreOf(T, now) {
    var tot = 0, ch = {}, per = {}; A.UNITS.forEach(function (u) { ch[u] = [0, 0]; });
    TOPS.forEach(function (k) { var w = A.SCORE_W[k], p = A.pCorrect(gOf(T) + rAt(T[k], now)); per[k] = p; tot += w * p; var c = A.TOPIC[k].ch; if (ch[c]) { ch[c][0] += w * p; ch[c][1] += w; } });
    var chp = {}, totw = 0; Object.keys(ch).forEach(function (c) { if (ch[c][1]) chp[c] = 100 * ch[c][0] / ch[c][1]; }); TOPS.forEach(function (k) { totw += A.SCORE_W[k]; });
    return { pct: 100 * tot / (totw || 1), ch: chp, per: per };
  }
  function cmp(a, b) { return a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0); }

  /* ---------- store ---------- */
  var ev = [], ids = {}, T = {}, lastT = 0, listeners = [], dirty = false;
  function lsLoad() { try { var o = JSON.parse(localStorage.getItem(C.LSK) || 'null'); if (o && o.v === 1 && Array.isArray(o.ev)) return o.ev; } catch (e) {} return []; }
  function lsSave() { try { localStorage.setItem(C.LSK, JSON.stringify({ v: 1, ev: ev })); } catch (e) {} }
  function valid(e) { return Array.isArray(e) && e.length === 6 && typeof e[0] === 'string' && typeof e[1] === 'number' && typeof e[2] === 'string' && typeof e[5] === 'number' && isFinite(e[5]); }
  function rebuild() { ev.sort(cmp); T = {}; ev.forEach(function (e) { applyEv(T, e); }); lastT = ev.length ? ev[ev.length - 1][1] : 0; }
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
    /* after a full mock: move every topic so the prediction goes halfway toward the real result */
    calibrate: function (id, t, actualPct) {
      if (ids[id]) return; var cur = scoreOf(T, t).pct, target = cur + 0.5 * (actualPct - cur);
      var lo = -300, hi = 300;
      for (var it = 0; it < 40; it++) { var mid = (lo + hi) / 2, T2 = JSON.parse(JSON.stringify(T)); applyEv(T2, ['x', t, '*', 0, 0, mid]); if (scoreOf(T2, t).pct < target) lo = mid; else hi = mid; }
      var s = Math.round((lo + hi) / 2 * 100) / 100; var prev = A.score.now();
      if (insert([[id, t, '*', 0, 0, s]])) emit(prev, true);
    },
    /* score after every event, for the graph */
    series: function (maxPts) {
      var T2 = {}, out = [], n = ev.length, step = Math.max(1, Math.ceil(n / (maxPts || 120)));
      if (n) out.push([ev[0][1] - 1, scoreOf({}, ev[0][1]).pct]);
      ev.forEach(function (e, i) { applyEv(T2, e); if (i % step === 0 || i === n - 1) out.push([e[1], scoreOf(T2, e[1]).pct]); });
      return out;
    },
    at: function (t) { var T2 = {}; for (var i = 0; i < ev.length && ev[i][1] <= t; i++) applyEv(T2, ev[i]); return scoreOf(T2, t).pct; },
    gains: function () {
      var s = A.score.now(); return TOPS.map(function (k) { return { id: k, p: s.per[k], gain: A.SCORE_W[k] * Math.max(0, 0.95 - s.per[k]) * 100 / TOTW }; }).sort(function (a, b) { return b.gain - a.gain; });
    },
    count: function (k) { return T[k] && k !== '_g' ? T[k].n : 0; },
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
