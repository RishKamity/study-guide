/* validate.mjs — the accuracy gate every course pack must pass before publishing.
   node tools/validate.mjs <courseDir> [--seeds 300]
   Checks the course config, every generator (determinism, 4 distinct options, key == independent check, no NaN,
   numeric options ascending, JE balance, rule + work present), every bank item, pool sizes (no tiny concept pools),
   stations, the sample-exam leak rule, mock blueprints, the schedule, flashcards and audio scripts. Exit 1 on any FAIL. */
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { pack } from './files.mjs';
const dir = process.argv[2]; if (!dir) { console.error('usage: node tools/validate.mjs <courseDir> [--seeds N]'); process.exit(1); }
const SEEDS = +(process.argv[process.argv.indexOf('--seeds') + 1] || 0) || 300;
const K = pack(dir);
const ctx = { console, Math, Date, JSON, setTimeout, clearTimeout, Intl, localStorage: { getItem: () => null, setItem: () => {} }, document: { addEventListener() {}, documentElement: { style: { setProperty() {} } } }, window: { addEventListener() {} } };
vm.createContext(ctx);
let fails = 0, warns = 0; const out = [];
const FAIL = (m) => { fails++; out.push('FAIL ' + m); }, WARN = (m) => { warns++; out.push('warn ' + m); }, OK = (m) => out.push('ok   ' + m);
try { for (const f of K.engineFiles) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f }); }
catch (e) { console.log('FAIL the pack does not load: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')); process.exit(1); }
const A = vm.runInContext('A', ctx), C = A.COURSE;
if (K.P.flashcards && fs.existsSync(path.join(K.dir, K.P.flashcards))) A.FLASHCARDS = JSON.parse(fs.readFileSync(path.join(K.dir, K.P.flashcards), 'utf8'));

/* ---- course config ---- */
['id', 'title', 'course', 'exam', 'examAt', 'units', 'tier'].forEach(k => { if (C[k] === undefined || C[k] === null || C[k] === '') FAIL('course.js: missing ' + k); });
if (C.examAt && !/^\+\d/.test(C.examAt) && isNaN(Date.parse(C.examAt))) FAIL('course.js: examAt is not a valid date: ' + C.examAt);
if (C.examAt && !/^\+\d/.test(C.examAt) && !/[+-]\d\d:\d\d$|Z$/.test(C.examAt)) WARN('course.js: examAt has no UTC offset; it will be read in the viewer\u2019s timezone');
if (!A.PALETTES[C.accent]) WARN('course.js: accent "' + C.accent + '" is not a palette; using lavender. Options: ' + Object.keys(A.PALETTES).join(', '));
const examTopics = A.TOPICS.filter(t => t.exam && A.UNITS.indexOf(t.ch) >= 0);
const sumExam = examTopics.reduce((s, t) => s + t.exam, 0);
if (sumExam !== C.format.questions) WARN(`blueprint: topic exam counts sum to ${sumExam}, but format.questions is ${C.format.questions} (mocks will have ${sumExam} questions)`); else OK(`blueprint: ${sumExam} questions across ${examTopics.length} topics`);
A.TOPICS.forEach(t => { if (t.ch !== 0 && A.UNITS.indexOf(t.ch) < 0) FAIL(`topic ${t.id}: ch ${t.ch} is not a unit id`); });
const ids = {}; A.TOPICS.forEach(t => { if (ids[t.id]) FAIL('duplicate topic id ' + t.id); ids[t.id] = 1; });

/* ---- generators ---- */
let gTotal = 0, gBad = 0;
for (const topic of Object.keys(A.gens)) for (const skill of Object.keys(A.gens[topic])) {
  if (!A.TOPIC[topic]) { FAIL(`generator ${topic}.${skill}: unknown topic`); continue; }
  let bad = 0; const msgs = new Set();
  for (let s = 1; s <= SEEDS; s++) {
    gTotal++;
    try {
      const id = A.genId(topic, skill, s * 7919 + 13), it = A.makeItem(id), same = A.makeItem(id);
      if (JSON.stringify(it.options) !== JSON.stringify(same.options) || it.answer !== same.answer) throw new Error('not deterministic for the same seed');
      if (it.options.length !== 4 || new Set(it.options).size !== 4) throw new Error('needs 4 distinct options');
      if (!(it.answer >= 0 && it.answer < 4)) throw new Error('bad answer index');
      it.options.forEach(o => { if (/NaN|Infinity|undefined|null/.test(o)) throw new Error('bad option text: ' + o); });
      if (/NaN|undefined/.test(it.stem)) throw new Error('bad stem text');
      if (!it.rule || !it.work) throw new Error('missing rule or work');
      if (it.num !== null && it.num !== undefined) {
        if (!it.check) throw new Error('numeric item has no check()');
        const c = it.check(); if (typeof c === 'number' && Math.abs(c - it.num) > 0.005) throw new Error('key ' + it.num + ' disagrees with check() ' + c);
        const arr = it.options.map(o => parseFloat(String(o).replace(/[$,%\s]|units?/g, '')));
        if (arr.every(v => !isNaN(v))) for (let i = 1; i < arr.length; i++) if (arr[i] < arr[i - 1]) throw new Error('numeric options not ascending');
      } else if (it.check) {
        const c = it.check(); if (typeof c === 'string' && it.options[it.answer] !== c) throw new Error('key disagrees with check()');
      }
      if (it.je) { const d = it.je.reduce((t, l) => t + (l[1] || 0), 0), cr = it.je.reduce((t, l) => t + (l[2] || 0), 0); if (Math.abs(d - cr) > 0.005) throw new Error('JE not balanced'); }
    } catch (e) { bad++; msgs.add(e.message); }
  }
  gBad += bad; if (bad) FAIL(`generator ${topic}.${skill}: ${bad}/${SEEDS} bad (${[...msgs].slice(0, 2).join(' | ')})`);
}
OK(`generators: ${gTotal} items checked, ${gBad} bad`);

/* ---- banks ---- */
let bN = 0, bBad = 0; const stemSeen = {};
for (const t of Object.keys(A.banks)) A.banks[t].forEach((s, i) => {
  const key = (s.q || '').trim().toLowerCase(); if (stemSeen[key]) WARN(`bank ${t}#${i}: same question as ${stemSeen[key]}`); stemSeen[key] = t + '#' + i;
  for (let v = 0; v < 3; v++) { bN++;
    try { const it = A.makeItem('b:' + t + ':' + i + ':' + v);
      if (it.options.length !== 4 || new Set(it.options).size !== 4) throw new Error('needs 4 distinct options');
      if (it.options[it.answer] !== s.a) throw new Error('answer text not at the key');
      if (!s.rule) throw new Error('missing rule'); if (s.w.length !== 3) throw new Error('needs exactly 3 wrong options');
      if ((s.why || []).length !== 3) throw new Error('needs 3 reasons (one per wrong option)');
    } catch (e) { bBad++; if (v === 0) FAIL(`bank ${t}#${i}: ${e.message}`); } } });
OK(`banks: ${bN} item variants checked, ${bBad} bad`);

/* ---- pool sizes: concept-only topics loop if their bank is small ---- */
examTopics.forEach(t => {
  const sk = A.topicSkillIds(t.id); if (!sk.length) { FAIL(`topic ${t.id}: no questions at all`); return; }
  const gens = sk.filter(k => A.skills[k].kind === 'gen').length, bank = (A.banks[t.id] || []).length;
  if (!gens && bank < 15) (bank < 8 ? FAIL : WARN)(`topic ${t.id}: only ${bank} hand-written questions and no generator (aim for 15+, or add a generator)`);
});

/* ---- stations ---- */
if (A.FEAT.stations) examTopics.forEach(t => {
  const s = A.STATIONS[t.id]; if (!s) { FAIL(`station ${t.id}: missing (tier ${C.tier} needs a lesson per exam topic)`); return; }
  if (!s.cards || !s.cards.length) FAIL(`station ${t.id}: no cards`);
  (s.cards || []).forEach((c, j) => { if (!c.h || !Array.isArray(c.rule) || !c.rule.length) FAIL(`station ${t.id} card ${j + 1}: needs h and rule[]`); if (c.trap && c.trap.quote && !(c.trap.quote.text && c.trap.quote.lec)) WARN(`station ${t.id} card ${j + 1}: quote needs text and lec`); });
  [s.worked, s.faded].forEach((w, k) => { if (w && (!w.setup || !Array.isArray(w.steps) || !w.steps.length)) FAIL(`station ${t.id}: ${k ? 'faded' : 'worked'} example needs setup and steps`); });
  if (s.faded) s.faded.steps.forEach((st, j) => { if (st.ask && !(st.ask.opts && st.ask.opts[st.ask.ans] !== undefined && st.ask.why)) FAIL(`station ${t.id} faded step ${j + 1}: ask needs opts, ans, why`); });
});

/* ---- sample exam: sealed, and never leaked into practice ---- */
if (A.SAMPLE_READY) {
  A.SAMPLE.forEach((q, i) => { try { const it = A.sampleItem(q.n || i + 1); if (it.options.length < 2 || !(it.answer >= 0)) throw new Error('bad key'); if (!A.TOPIC[it.topic]) throw new Error('unknown topic ' + it.topic); } catch (e) { FAIL(`sample Q${q.n || i + 1}: ${e.message}`); } });
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9$ ]/g, ' ').replace(/\s+/g, ' ').trim();
  const N = 10, grams = s => { const w = norm(s).split(' '), g = new Set(); for (let i = 0; i + N <= w.length; i++) g.add(w.slice(i, i + N).join(' ')); return g; };
  const sampleGrams = new Set(); A.SAMPLE.forEach(q => grams(q.stem).forEach(g => sampleGrams.add(g)));
  /* distinctive numbers per sample question (>= 1,000 and not a round 500); two of them together elsewhere = a leak */
  const distinct = v => { const x = parseFloat(v); return isFinite(x) && x >= 1000 && x % 500 !== 0 && !(x >= 1900 && x <= 2100 && x === Math.round(x)); };
  const numsOf = txt => new Set((String(txt).match(/\$?\d[\d,]{3,}(\.\d+)?/g) || []).map(n => n.replace(/[$,]/g, '')).filter(distinct));
  const perQ = A.SAMPLE.map(q => numsOf(q.stem + ' ' + (q.table ? JSON.stringify(q.table) : '')));
  const texts = [];
  for (const t of Object.keys(A.banks)) A.banks[t].forEach((s, i) => texts.push(['bank ' + t + '#' + i, s.q + ' ' + s.a + ' ' + (s.w || []).join(' ') + ' ' + (s.work || '')]));
  for (const [id, s] of Object.entries(A.STATIONS)) texts.push(['station ' + id, JSON.stringify(s)]);
  (A.FLASHCARDS || []).forEach(c => { if (!c.sample) texts.push(['flashcard ' + c.id, c.front + ' ' + c.back]); });
  let leaks = 0;
  texts.forEach(([where, txt]) => {
    const g = grams(txt); for (const x of g) if (sampleGrams.has(x)) { leaks++; if (leaks <= 8) FAIL(`sample leak: ${where} repeats sample wording "${x}"`); break; }
    const mine = numsOf(txt); perQ.forEach((nq, qi) => { const hit = [...nq].filter(n => mine.has(n)); if (hit.length >= 2) { leaks++; if (leaks <= 8) FAIL(`sample leak: ${where} reuses numbers ${hit.join(', ')} from sample Q${qi + 1}`); } });
  });
  if (!leaks) OK(`sample exam: ${A.SAMPLE.length} questions sealed, no wording or number leaks found`);
}

/* ---- mocks ---- */
if (A.FEAT.mocks) {
  ['mockA', 'mockB', 'mockC'].forEach(k => {
    try { const idsM = A.buildNamedMock(k), per = {}; idsM.forEach(id => { const it = A.makeItem(id); per[it.topic] = (per[it.topic] || 0) + 1; });
      const off = examTopics.filter(t => (per[t.id] || 0) !== t.exam).map(t => `${t.id} ${per[t.id] || 0}/${t.exam}`);
      if (idsM.length !== sumExam) FAIL(`${k}: ${idsM.length} questions, blueprint says ${sumExam}`); else if (off.length) WARN(`${k}: topic counts off (${off.join(', ')})`); else OK(`${k}: ${idsM.length} questions on the blueprint`);
    } catch (e) { FAIL(`${k}: ${e.message}`); }
  });
}

/* ---- schedule ---- */
try { const p = A.plan(A.EXAM_AT - 2 * 864e5, A.store.state); OK(`schedule: ${A.SEQ.length} steps; 2 days out it ${p.fits ? 'fits' : 'needs trimming'} (${Math.round(p.need)} of ${Math.round(p.cap)} min)`); }
catch (e) { FAIL('schedule: ' + e.message); }

/* ---- flashcards and audio ---- */
(A.FLASHCARDS || []).forEach((c, i) => { if (!c.id || !c.front || !c.back) FAIL(`flashcard #${i}: needs id, front, back`); });
if (A.FEAT.audio && (A.AUDIO || []).length) { A.AUDIO.forEach(t => { if (!t.id || !t.title || !Array.isArray(t.raw) || !t.spoken) FAIL(`audio ${t.id}: needs id, title, raw[], spoken`); }); OK(`audio: ${A.AUDIO.length} tracks`); }
else if (A.FEAT.audio) WARN('tier has audio but there are no tracks yet (run tools/audio)');

out.forEach(l => console.log(l));
console.log(`\n${fails ? 'FAIL' : 'PASS'}: ${fails} failure(s), ${warns} warning(s) for ${C.title}`);
process.exit(fails ? 1 : 0);
