/* items.js — item builders, generator registry, authored banks. */
A.STATIONS = A.STATIONS || {};
A.gens = {};     // topic -> { skill: {fn, w, label} }
A.banks = {};    // topic -> [authored item specs]
A.skills = {};   // skillId -> {id, topic, kind, w, label}

/* register a parametric generator skill. fn(rng, ctx) -> item (via A.mc / A.numeric) */
A.defGen = function (topic, skill, label, fn, w) {
  (A.gens[topic] = A.gens[topic] || {})[skill] = { fn: fn, w: w || 1, label: label };
  A.skills[topic + '.' + skill] = { id: topic + '.' + skill, topic: topic, kind: 'gen', w: w || 1, label: label, skill: skill };
};
/* register an authored bank. specs: {q, a, w:[3 wrong], why:[3 reasons], rule, work, table, diff, calc} */
A.defBank = function (topic, specs, label) {
  A.banks[topic] = (A.banks[topic] || []).concat(specs);
  A.skills[topic + '.bank'] = { id: topic + '.bank', topic: topic, kind: 'bank', w: 1, label: label || 'Concept questions', skill: 'bank' };
};

function _key(o) { return typeof o === 'string' ? o : JSON.stringify(o); }

/* Multiple choice builder. o = {rng, topic, skill, stem, table, correct, wrong:[[val,why],...], rule, work, je,
   diff, calc, seconds, fmt, order, noneCorrect, optJe} */
A.mc = function (o) {
  var rng = o.rng, f = o.fmt || (function (v) { return typeof v === 'number' ? A.fmt(v) : v; });
  var cText = o.noneCorrect ? 'None of these answer choices are correct.' : f(o.correct);
  var seen = {}; seen[_key(cText)] = 1;
  var pool = [];
  (o.wrong || []).forEach(function (w) {
    if (typeof w[0] === 'number' && (w[0] < 0 || !isFinite(w[0])) && !o.allowNeg) return;
    var t = f(w[0]); var k = _key(t);
    if (seen[k]) return; seen[k] = 1; pool.push({ t: t, v: w[0], why: w[1] || null });
  });
  if (pool.length < 3) throw new Error('not enough distinct distractors for ' + o.topic + '.' + o.skill + ' (' + pool.length + ')');
  if (o.keepFirst) { pool = pool.slice(0, 3); }
  else if (rng) { pool = rng.shuffle(pool).slice(0, 3); } else pool = pool.slice(0, 3);
  var opts = [{ t: cText, v: o.correct, why: null, ok: true }].concat(pool);
  var numeric = !o.noneCorrect && opts.every(function (x) { return typeof x.v === 'number'; });
  if (o.noneCorrect) {
    var wr = opts.slice(1); wr.sort(function (a, b) { return (typeof a.v === 'number' && typeof b.v === 'number') ? a.v - b.v : 0; });
    opts = wr.concat([opts[0]]);
  } else if (numeric && o.order !== 'shuffle') {
    opts.sort(function (a, b) { return a.v - b.v; });
  } else if (o.order !== 'given') {
    opts = rng ? rng.shuffle(opts) : opts;
  }
  var ans = opts.findIndex(function (x) { return x.ok; });
  return {
    id: o.id || null, topic: o.topic, skill: o.topic + '.' + o.skill, format: o.format || 'mc4',
    stem: o.stem, table: o.table || null, options: opts.map(function (x) { return x.t; }),
    answer: ans, rule: o.rule || '', work: o.work || '', why: opts.map(function (x) { return x.why; }),
    je: o.je || null, difficulty: o.diff || 2, calc: !!o.calc, seconds: o.seconds || (o.calc ? 75 : 45),
    num: numeric ? opts[ans].v : null, optsRaw: o.optJe ? opts.map(function (x) { return x.v; }) : null,
    check: o.check || null
  };
};

/* ---- build any item from its id ----
   g:<topic>:<skill>:<seed>       generator item
   b:<topic>:<idx>:<variant>      authored bank item */
A.parseId = function (id) { var p = id.split(':'); return { kind: p[0], topic: p[1], skill: p[2], seed: parseInt(p[3], 10) || 0, idx: parseInt(p[2], 10), variant: parseInt(p[3], 10) || 0 }; };
A.makeItem = function (id) {
  if (id.charAt(0) === 's' && id.charAt(1) === ':') return A.sampleItem(parseInt(id.slice(2), 10));
  var p = A.parseId(id), item;
  if (p.kind === 'g') {
    var g = A.gens[p.topic] && A.gens[p.topic][p.skill];
    if (!g) throw new Error('unknown generator ' + id);
    var rng = A.mulberry32(p.seed);
    item = g.fn(rng, { seed: p.seed });
    item.id = id;
  } else {
    var spec = (A.banks[p.topic] || [])[p.idx];
    if (!spec) throw new Error('unknown bank item ' + id);
    item = A.bankItem(p.topic, p.idx, spec, p.variant);
    item.id = id;
  }
  return item;
};
A.bankItem = function (topic, idx, s, variant) {
  var rng = A.mulberry32(A.hash('b' + topic + idx + ':' + (variant || 0)));
  var opts = [{ t: s.a, ok: true, why: null }];
  s.w.forEach(function (w, i) { opts.push({ t: w, ok: false, why: (s.why && s.why[i]) || null }); });
  if (!s.fixed) opts = rng.shuffle(opts);
  return {
    id: null, topic: topic, skill: topic + '.bank', format: 'mc4', stem: s.q, table: s.table || null,
    options: opts.map(function (o) { return o.t; }), answer: opts.findIndex(function (o) { return o.ok; }),
    rule: s.rule || '', work: s.work || '', why: opts.map(function (o) { return o.why; }), je: s.je || null,
    difficulty: s.diff || 1, calc: !!s.calc, general: !!s.general, seconds: s.seconds || (s.calc ? 75 : 40), num: null, src: s.src || null, twin: s.twin || null
  };
};
/* pick N random generator ids for a topic (optionally a skill) */
A.genId = function (topic, skill, seed) { return 'g:' + topic + ':' + skill + ':' + seed; };
A.topicSkillIds = function (topic) { return Object.keys(A.skills).filter(function (k) { return A.skills[k].topic === topic; }); };
/* make a fresh item for a skill id; avoid seeds/ids in `seen` */
A.freshItem = function (skillId, rng, seen) {
  var sk = A.skills[skillId]; if (!sk) return null;
  seen = seen || {};
  if (sk.kind === 'gen') {
    for (var t = 0; t < 12; t++) { var seed = Math.floor(rng() * 1e9); var id = A.genId(sk.topic, sk.skill, seed); if (!seen[id]) return A.makeItem(id); }
    return A.makeItem(A.genId(sk.topic, sk.skill, Math.floor(rng() * 1e9)));
  }
  var bank = A.banks[sk.topic] || []; if (!bank.length) return null;
  var idxs = []; for (var i = 0; i < bank.length; i++) idxs.push(i);
  idxs = rng.shuffle(idxs);
  var best = idxs[0], bestN = 1e9;
  /* how often each bank question was shown, across all its option-order variants (ids are b:topic:idx:variant) */
  var cnt = {}, pre = 'b:' + sk.topic + ':';
  Object.keys(seen).forEach(function (key) { if (key.indexOf(pre) === 0) { var ix = parseInt(key.slice(pre.length), 10); if (!isNaN(ix)) cnt[ix] = (cnt[ix] || 0) + (seen[key] || 0); } });
  for (var k = 0; k < idxs.length; k++) { var n = cnt[idxs[k]] || 0; if (n < bestN) { bestN = n; best = idxs[k]; if (n === 0) break; } }
  return A.makeItem('b:' + sk.topic + ':' + best + ':' + ((bestN % 1000) % 4));
};

/* journal-entry lines [[account, debit|null, credit|null], ...] as one string (used by JE options, the JE builder and the AI) */
A.jeStr = A.jeStr || function (lines) {
  return lines.map(function (l) { return (l[1] != null ? 'Dr ' + l[0] + ' ' + A.num(l[1]) : 'Cr ' + l[0] + ' ' + A.num(l[2])); }).join('; ');
};

/* official sample / practice exam: kept locked until the unlock rule, never mixed into practice.
   list: [{n, topic, stem, options:[4], answer:'A'..'D', why:[4, null for the key], rule, work, table, je, optsRaw, calc}] */
A.defSample = function (list) {
  var L = ['A', 'B', 'C', 'D', 'E'];
  A.SAMPLE = list.map(function (q, i) { return { n: q.n || i + 1, topic: q.topic, stem: q.stem, opts: q.options, ans: typeof q.answer === 'number' ? q.answer : L.indexOf(q.answer), why: q.why || q.options.map(function () { return null; }), rule: q.rule || '', work: q.work || '', table: q.table || null, je: q.je || null, optsRaw: q.optsRaw || null, calc: !!q.calc }; });
  A.sampleItem = function (n) {
    var q = A.SAMPLE[n - 1]; if (!q) throw new Error('no sample question ' + n);
    return { id: 's:' + n, topic: q.topic, skill: (A.skills[q.topic + '.bank'] ? q.topic + '.bank' : A.topicSkillIds(q.topic)[0]), format: q.optsRaw ? 'je-pick' : 'mc4',
      stem: q.stem, table: q.table, options: q.opts.slice(), answer: q.ans, rule: q.rule, work: q.work, why: q.why.slice(), je: q.je, difficulty: 2, calc: q.calc, seconds: q.calc ? 80 : 45, num: null, optsRaw: q.optsRaw, sample: true, n: q.n };
  };
  A.SAMPLE_READY = A.SAMPLE.length > 0;
};

/* ---- helpers for course generators ---- */
/* numeric question with extra padded distractors: o = {stem, table, ans, wrong:[[v, why]], pad, rule, work, diff, sec, check} */
A.numItem = function (rng, topic, skill, o) {
  var st = o.pad || 100, w = (o.wrong || []).slice(); w.push([o.ans + st, null], [o.ans + 2 * st, null], [o.ans - st, null], [o.ans * 2, null]);
  return A.mc({ rng: rng, topic: topic, skill: skill, stem: o.stem, table: o.table || null, correct: o.ans, wrong: w, fmt: o.fmt, rule: o.rule, work: o.work, je: o.je || null, calc: true, diff: o.diff || 2, seconds: o.sec || 60, check: o.check || function () { return o.ans; } });
};
/* journal-entry pick (accounting): o = {stem, good:[[acct, dr, cr]...], bad:[[lines, why]...] (3+), rule, diff} — every entry must balance */
A.jePick = function (rng, topic, skill, o) {
  return A.mc({ rng: rng, topic: topic, skill: skill, format: 'je-pick', optJe: true, fmt: function (v) { return A.jeStr(v); }, stem: o.stem, table: o.table || null, correct: o.good, keepFirst: true, wrong: o.bad, rule: o.rule, work: o.work || A.jeStr(o.good), je: o.good, diff: o.diff || 2, seconds: o.sec || 50, calc: !!o.calc, check: function () { return A.jeStr(o.good); } });
};
