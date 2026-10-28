/* adaptive.js — mastery, misses scheduling, next-item picker, predicted score, station helpers. */
A.CONF = { sure: 0, unsure: 1, guess: 2 };
A.CONF_NAMES = ['sure', 'unsure', 'guess'];
A.HOUR = 3600e3;

/* recency-weighted first-try accuracy over last 8 attempts (newest first). A "sure" miss counts double. */
A.skillP = function (sid, st) {
  st = st || A.store.state; var s = st.skills[sid]; if (!s || !s.a.length) return null;
  var num = 0, den = 0, w = 1;
  for (var i = 0; i < s.a.length && i < 8; i++) {
    var x = s.a[i], ok = x[2] === 1;
    var weight = w * ((!ok && x[3] === 0) ? 2 : 1);
    num += ok ? w : 0; den += weight; w *= 0.8;
  }
  return den ? num / den : null;
};
A.skillN = function (sid, st) { st = st || A.store.state; var s = st.skills[sid]; return s ? s.a.length : 0; };

/* topic stat: {n, p, state, mastered} */
A.topicStat = function (tid, st) {
  st = st || A.store.state; var ids = A.topicSkillIds(tid), num = 0, den = 0, n = 0, corr = [];
  ids.forEach(function (sid) {
    var p = A.skillP(sid, st); var sk = A.skills[sid]; var s = st.skills[sid];
    if (p === null) return; n += s.a.length; num += p * sk.w; den += sk.w;
    s.a.forEach(function (x) { if (x[2] === 1) corr.push(x[1]); });
  });
  if (!n) return { n: 0, p: null, state: 'new', mastered: false };
  var p = num / den, state = p < 0.6 ? 'learning' : (p < 0.85 ? 'shaky' : 'solid');
  var mastered = false;
  if (p >= 0.85 && corr.length >= 3) { corr.sort(function (a, b) { return a - b; }); mastered = (corr[corr.length - 1] - corr[0]) >= 2 * A.HOUR; }
  if (mastered) state = 'mastered';
  return { n: n, p: p, state: state, mastered: mastered };
};
A.stateLabel = { new: 'New', learning: 'Learning', shaky: 'Shaky', solid: 'Solid', mastered: 'Mastered' };

/* predicted score: sum over exam topics of Qs * p (0.25 if New). returns {pts(0-100), lo, hi, qs} */
A.predicted = function () {
  var sc = A.score.now(), n = A.score.events().length, half = 14 / Math.sqrt(1 + n / 25);
  return { pts: sc.pct, lo: Math.max(25, sc.pct - half), hi: Math.min(100, sc.pct + half), ch: sc.ch, n: n };
};

/* ---------- recording answers ---------- */
A.recordAnswer = function (o) {
  /* o: {item, chosen, conf(0..2|null), ms, mode, pretest, fresh} -> {correct, milestone, why} */
  var item = o.item, correct = o.chosen === item.answer, res = { correct: correct, milestone: 0, autoWhy: false };
  var sid = item.skill, now = Date.now();
  if (!o.pretest && A.score) A.score.answer({ item: item, t: now, correct: correct, conf: o.conf, mode: o.mode, retake: !!o.retake });
  A.store.mutate(function (st) {
    st.seen[item.id] = (st.seen[item.id] || 0) + 1;
    if (o.pretest) return;
    var s = st.skills[sid] || (st.skills[sid] = { a: [], seen: 0 });
    var conf = o.conf === null || o.conf === undefined ? 1 : o.conf;
    s.a.unshift([item.id, now, correct ? 1 : 0, conf, Math.round(o.ms || 0), o.fresh === false ? 0 : 1]);
    s.a = s.a.slice(0, 8); s.seen++;
    st.count++;
    // streak: first-try correct only
    if (correct) { st.streak.cur++; if (st.streak.cur > st.streak.best) st.streak.best = st.streak.cur; if ([5, 10, 25, 50, 100].indexOf(st.streak.cur) >= 0) res.milestone = st.streak.cur; }
    else st.streak.cur = 0;
    // misses scheduling
    var m = st.misses[sid], STAGES = [3, 8, 20];
    if (!correct) {
      st.misses[sid] = { skill: sid, at: now, n: st.count, stage: 0, due: st.count + STAGES[0], streak: 0, soft: false, done: false, sure: conf === 0 };
      if (conf === 0) { res.autoWhy = true; st.pins[item.id] = { skill: sid, at: now }; }
    } else if (m && !m.done) {
      if (st.count >= m.due || o.mode === 'misses') {
        m.streak = (m.streak || 0) + 1; m.stage = Math.min((m.stage || 0) + 1, 2); m.at = now;
        if (m.streak >= (m.soft ? 1 : 2)) { m.done = true; } else m.due = st.count + STAGES[m.stage];
      }
    } else if (o.mode !== 'mock' && conf !== 0 && !(m && m.done === false)) {
      // right but unsure/guess -> soft re-check after ~10 items
      st.misses[sid] = { skill: sid, at: now, n: st.count, stage: 1, due: st.count + 10, streak: 0, soft: true, done: false };
    }
  });
  return res;
};
A.activeMisses = function (st) { st = st || A.store.state; return Object.keys(st.misses).map(function (k) { return st.misses[k]; }).filter(function (m) { return !m.done; }); };
A.dueMisses = function (st) { st = st || A.store.state; return A.activeMisses(st).filter(function (m) { return st.count >= m.due; }).sort(function (a, b) { return a.due - b.due; }); };

/* ---------- station progress ---------- */
A.STEPS = ['Warm-up', 'Pretest', 'Lesson', 'Worked', 'Faded', 'Practice', 'Exit ticket'];
A.stationDone = function (id, st) { st = st || A.store.state; var s = st.stations[id]; return !!(s && s.step >= 7); };
A.stationStarted = function (id, st) { st = st || A.store.state; var s = st.stations[id]; return !!(s && s.step > 0); };
A.setStation = function (id, patch) {
  A.store.mutate(function (st) { var s = st.stations[id] || (st.stations[id] = { step: 0, pretest: [0, 0], exit: [0, 0], at: 0 }); Object.assign(s, patch); s.at = Date.now(); });
};
/* topics in the Endless pool: started stations or any attempts */
A.poolTopics = function (st, includeNew) {
  st = st || A.store.state;
  return A.TOPICS.filter(function (t) { return includeNew || A.stationStarted(t.id, st) || A.topicStat(t.id, st).n > 0; });
};

/* ---------- picking the next item ---------- */
/* opts: {topics:[ids], chapter, lastSkill, includeNew, modeDue:true, rng, onlyMisses} */
A.pickSkill = function (opts) {
  var st = A.store.state, rng = opts.rng || Math.random; var r = rng();
  var topics = opts.topics && opts.topics.length ? opts.topics : A.poolTopics(st, opts.includeNew).map(function (t) { return t.id; });
  if (opts.chapter) topics = topics.filter(function (id) { return A.TOPIC[id].ch === opts.chapter; });
  var allowed = {}; topics.forEach(function (id) { allowed[id] = 1; });
  var skills = Object.keys(A.skills).filter(function (k) { return allowed[A.skills[k].topic]; });
  if (!skills.length) return null;
  function weightOf(sid) {
    var sk = A.skills[sid], t = A.TOPIC[sk.topic]; var ts = A.topicStat(t.id, st); var p = ts.p === null ? 0.25 : ts.p;
    var sp = A.skillP(sid, st); var skp = sp === null ? 0.25 : sp;
    var q = (A.SCORE_W && A.SCORE_W[t.id]) || t.exam || 0.8; var wgt = (1 - p) * q * (A.PRI[t.pri] || 1) * (0.4 + (1 - skp)) * sk.w;
    return Math.max(wgt, 0.02);
  }
  function wpick(list) { var tot = 0, ws = list.map(function (s) { var w = weightOf(s); tot += w; return w; }); var x = rng() * tot; for (var i = 0; i < list.length; i++) { x -= ws[i]; if (x <= 0) return list[i]; } return list[list.length - 1]; }
  var noRepeat = function (list) { var f = list.filter(function (s) { return s !== opts.lastSkill; }); return f.length ? f : list; };
  var due = A.dueMisses(st).filter(function (m) { return allowed[A.skills[m.skill] && A.skills[m.skill].topic]; });
  if (opts.onlyMisses) {
    var act = A.activeMisses(st).filter(function (m) { return allowed[A.skills[m.skill] && A.skills[m.skill].topic]; });
    if (!act.length) return null; var pool = noRepeat(act.map(function (m) { return m.skill; })); return pool[Math.floor(rng() * pool.length)];
  }
  if (r < 0.5 && due.length) { var ds = noRepeat(due.map(function (m) { return m.skill; })); return ds[0]; }
  if (r < 0.8) { return wpick(noRepeat(skills)); }
  var any = noRepeat(skills); return any[Math.floor(rng() * any.length)];
};
/* no-repeat cooldown: the same question (bank item or generator seed family) never comes back within the last 15 shown */
A.COOLDOWN = 15; A.recent = [];
A.baseId = function (id) { var m = /^b:([^:]+):(\d+)/.exec(id); return m ? 'b:' + m[1] + ':' + m[2] : id; };
A.noteSeen = function (it) { if (!it || !it.id) return; var b = A.baseId(it.id); A.recent = A.recent.filter(function (x) { return x !== b; }); A.recent.push(b); if (A.recent.length > A.COOLDOWN) A.recent.shift(); };
A.nextItem = function (opts) {
  var rr = A.mulberry32(Math.floor(Math.random() * 4294967296)), best = null;
  opts.rng = rr;
  for (var tries = 0; tries < 10; tries++) {
    var sid = A.pickSkill(opts); if (!sid) return null;
    var seen = Object.assign({}, A.store.state.seen); A.recent.forEach(function (b, i) { seen[b] = (seen[b] || 0) + 1000 * (i + 1); });
    var it = A.freshItem(sid, rr, seen); if (!it) continue;
    if (A.recent.indexOf(A.baseId(it.id)) < 0) { best = it; break; }
    if (!best) best = it;
    opts.lastSkill = sid;
  }
  if (best) A.noteSeen(best);
  return best;
};

/* ---------- the study sequence (built from the course's units and the tier) ---------- */
A.SEQ = [];
(function () {
  var F = A.FEAT, C = A.COURSE;
  var boot = A.TOPICS.filter(function (t) { return t.ch === 0; });
  boot.forEach(function (t) { A.SEQ.push({ type: F.stations ? 'station' : 'drill', id: t.id, unit: 0, mins: t.mins, optional: true, group: 'warm' }); });
  if (boot.length && F.stations && A.FOUNDATION && A.FOUNDATION.length) A.SEQ.push({ type: 'foundation', id: 'foundation', unit: 0, optional: true, group: 'warm', mins: 8, title: 'Foundation check' });
  A.UNITS.forEach(function (u) {
    A.TOPICS.filter(function (t) { return t.ch === u && t.exam; }).forEach(function (t) {
      A.SEQ.push(F.stations ? { type: 'station', id: t.id, unit: u, mins: t.mins } : { type: 'drill', id: t.id, unit: u, mins: Math.max(6, Math.round(t.mins * 0.6)), title: t.title });
    });
    if (F.minimocks) A.SEQ.push({ type: 'minimock', id: 'mm' + u, ch: u, unit: u, mins: 13, title: 'Mini-mock \u00B7 ' + A.unitShort(u) });
  });
  if (F.drills) A.SEQ.push({ type: 'misses', id: 'misses1', mins: 15, title: 'Clear your Misses' });
  if (F.sample && A.SAMPLE_READY) A.SEQ.push({ type: 'sample', id: 'sample', mins: C.format.minutes + 30, title: ((C.sample && C.sample.title) || 'Sample exam') + ' (dress rehearsal)', protect: true });
  else if (F.mocks) A.SEQ.push({ type: 'mock', id: 'mockA', mins: C.format.minutes + 20, title: 'Mock Exam A (dress rehearsal)', protect: true });
  if (F.drills) A.SEQ.push({ type: 'weak', id: 'weak1', mins: 30, title: 'Weak spots' });
  if (F.mocks) { if (F.sample && A.SAMPLE_READY) A.SEQ.push({ type: 'mock', id: 'mockA', mins: C.format.minutes + 20, optional: true, group: 'ahead', title: 'Mock Exam A' }); A.SEQ.push({ type: 'mock', id: 'mockB', mins: C.format.minutes + 20, optional: true, group: 'ahead', title: 'Mock Exam B' }); }
})();
A.OPT_LABEL = { warm: (A.COURSE.bootcamp && A.COURSE.bootcamp.refresher) || 'Optional refresher', ahead: 'Only if you are ahead' };
A.seqDone = function (it, st) {
  st = st || A.store.state;
  if (it.type === 'station') return A.stationDone(it.id, st) || !!(st.settings.skimmed && st.settings.skimmed[it.id] && A.topicStat(it.id, st).n >= 6);
  if (it.type === 'drill') return A.topicStat(it.id, st).n >= 6;
  if (it.type === 'foundation') return !!(st.mocks.foundation && st.mocks.foundation.submittedAt);
  if (it.type === 'minimock' || it.type === 'mock') return !!(st.mocks[it.id] && st.mocks[it.id].submittedAt);
  if (it.type === 'sample') return st.sample.attempts.length > 0;
  if (it.type === 'misses') return A.activeMisses(st).length < 6 && Object.keys(st.misses).length > 0;
  if (it.type === 'weak') return !!(st.settings.weakDone);
  return false;
};
A.nextSeq = function (st, now) {
  st = st || A.store.state; var plan = A.plan ? A.plan(now || Date.now(), st) : null, skip = {};
  if (plan) plan.trimmed.forEach(function (x) { if (x.drop) skip[x.item.type + ':' + x.item.id] = 1; });
  for (var i = 0; i < A.SEQ.length; i++) { var it = A.SEQ[i]; if (!it.optional && !skip[it.type + ':' + it.id] && A.isAvail(it) && !A.seqDone(it, st)) return { item: it, idx: i }; }
  for (var j = 0; j < A.SEQ.length; j++) { var it2 = A.SEQ[j]; if (!it2.optional && A.isAvail(it2) && !A.seqDone(it2, st)) return { item: it2, idx: j }; }
  return null;
};

/* availability: what is built in this version */
A.isAvail = function (it) {
  if (it.type === 'station') return !!A.STATIONS[it.id];
  if (it.type === 'drill') return A.topicSkillIds(it.id).length > 0;
  if (it.type === 'foundation') return !!(A.FOUNDATION && A.FOUNDATION.length);
  if (it.type === 'minimock') return A.chapterHasSkills(it.ch);
  if (it.type === 'misses') return true;
  if (it.type === 'mock') return !!(A.MOCKS_READY && A.MOCKS_READY[it.id]);
  if (it.type === 'sample') return !!A.SAMPLE_READY;
  if (it.type === 'weak') return !!A.WEAK_READY;
  return false;
};
A.chapterHasSkills = function (ch) {
  var tops = A.TOPICS.filter(function (t) { return t.ch === ch && t.exam; }); if (!tops.length) return false;
  return tops.every(function (t) { return A.topicSkillIds(t.id).length > 0; });
};
/* build a blueprint mock: for each exam topic in the chapters, `exam` items drawn across its skills. returns ids */
A.buildMock = function (chapters, seed, o) {
  o = o || {};
  var rng = A.mulberry32(seed || Math.floor(Math.random() * 4294967296)), ids = [], seenIds = {};
  var seenAll = Object.assign({}, o.ignoreSeen ? {} : A.store.state.seen, o.exclude || {}), weak = o.weak || {};
  var total = 0; A.TOPICS.forEach(function (t) { if (t.exam && chapters.indexOf(t.ch) >= 0 && A.topicSkillIds(t.id).length) total += t.exam; });
  var mix = o.mix || null, quota = null;
  if (mix) { quota = { 1: Math.round(mix[0] * total), 2: Math.round(mix[1] * total), 3: 0 }; quota[3] = total - quota[1] - quota[2]; }
  A.TOPICS.forEach(function (t) {
    if (!t.exam || chapters.indexOf(t.ch) < 0) return;
    var sk = A.topicSkillIds(t.id); if (!sk.length) return;
    var made = 0, guard = 0, last = null, isWeak = !!weak[t.id];
    while (made < t.exam && guard++ < 80) {
      var it = null;
      for (var tr = 0; tr < 16; tr++) {
        var pool = sk.filter(function (x) { return x !== last; }); if (!pool.length) pool = sk;
        var wts = pool.map(function (x) { var w = A.skills[x].w; if (isWeak) w *= 1 + 3 * (1 - (A.skillP ? A.skillP(x, A.store.state) : 0.5)); return w; });
        var tot = wts.reduce(function (a, x) { return a + x; }, 0), r = rng() * tot, pick = pool[0];
        for (var i = 0; i < pool.length; i++) { r -= wts[i]; if (r <= 0) { pick = pool[i]; break; } }
        var c = A.freshItem(pick, rng, Object.assign({}, seenAll, seenIds)); if (!c || seenIds[c.id] || seenAll[c.id]) continue;
        var d = c.difficulty || 2;
        if (isWeak && d < 2 && tr < 12) continue;
        if (quota && quota[d] <= 0 && tr < 14) continue;
        it = c; last = pick; break;
      }
      if (!it) continue;
      if (quota) quota[it.difficulty || 2] = (quota[it.difficulty || 2] || 0) - 1;
      seenIds[it.id] = 1; ids.push(it.id); made++;
    }
  });
  return ids;
};
/* named, fixed-seed mocks (A, B, C) */
A.MOCKS = {
  mockA: { title: 'Mock Exam A', seed: 0xA11CE5, mix: [0.4, 0.45, 0.15], weak: 0, blurb: 'The exact blueprint at a normal difficulty mix.' },
  mockB: { title: 'Mock Exam B', seed: 0xB0B5E7, mix: [0.25, 0.5, 0.25], weak: 5, blurb: 'Slightly harder, with extra questions from your five weakest topics.' },
  mockC: { title: 'Mock Exam C', seed: 0xC0DE77, mix: [0.4, 0.45, 0.15], weak: 0, blurb: 'A spare, same shape as A with new questions.' }
};
A.MOCKS_READY = { mockA: true, mockB: true, mockC: true };
A.buildNamedMock = function (key) {
  var m = A.MOCKS[key], o = { ignoreSeen: true, mix: m.mix };
  if (key !== 'mockA') { o.exclude = {}; A.buildMock(A.UNITS, A.MOCKS.mockA.seed, { ignoreSeen: true, mix: A.MOCKS.mockA.mix }).forEach(function (x) { o.exclude[x] = 1; }); }
  if (m.weak) {
    var st = A.store.state, ranked = A.TOPICS.filter(function (t) { return t.exam; }).map(function (t) { var ts = A.topicStat(t.id, st); return [t.id, ts.p === null ? 0.25 : ts.p, ts.n]; }).sort(function (a, b) { return a[1] - b[1]; }).slice(0, m.weak);
    o.weak = {}; ranked.forEach(function (x) { o.weak[x[0]] = 1; });
  }
  return A.buildMock(A.UNITS, m.seed, o);
};
/* sample-exam unlock: a strong full mock, the course's unlock time, or (default) 4 hours before the exam */
A.SAMPLE_UNLOCK_AT = A.COURSE.sample && A.COURSE.sample.unlockAt ? Date.parse(A.COURSE.sample.unlockAt) : A.EXAM_AT - 4 * 3600e3;
A.sampleUnlock = function (st, now) {
  st = st || A.store.state; now = now || Date.now();
  if (st.sample && st.sample.unlocked) return { ok: true, why: 'Unlocked' };
  var best = 0; ['mockA', 'mockB'].forEach(function (k) { var m = st.mocks[k]; if (m && m.submittedAt) best = Math.max(best, m.score / m.total); });
  if (best >= 0.8) return { ok: true, why: 'Mock score of ' + Math.round(best * 100) + '%' };
  var when = new Date(A.SAMPLE_UNLOCK_AT).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  if (now >= A.SAMPLE_UNLOCK_AT) return { ok: true, why: 'It is after ' + when };
  return { ok: false, why: 'Unlocks when you score 80% or more on Mock A or B, or at ' + when + '.' };
};
