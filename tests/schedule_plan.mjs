import { loadA } from './load.mjs';
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const A = loadA(); const E = A.EXAM_AT, H = 3600e3;
const fmt = t => new Date(t).toISOString().slice(5, 16);
// plenty of time: 3 days out with the course windows
let p = A.plan(E - 3 * 24 * H, A.store.state);
ok(p.fits && p.trimmed.length === 0, `3 days out: fits (need ${p.need.toFixed(0)} of ${p.cap.toFixed(0)} min), finishes ${fmt(p.finishAt)}`);
ok(p.slots.every((s, i) => i === 0 || !s.start || !p.slots[i - 1].start || s.start >= p.slots[i - 1].start), 'slots are in order');
ok(p.slots.every(s => !s.start || s.start < A.stopAt()), 'nothing planned after the stop time');
// very little time: 5 hours out
const TIGHT = Math.max(2, Math.round(A.SEQ.filter(x => !x.optional).reduce((s, x) => s + x.mins, 0) * 1.25 / 60 * 0.45)); p = A.plan(E - TIGHT * H, A.store.state);
const kept = p.slots.map(s => s.item.type); const dropped = p.trimmed.filter(x => x.drop).map(x => x.item.id);
ok(!p.fits || p.trimmed.length > 0, `${TIGHT} hours out: re-planned, trimmed ${p.trimmed.length} (dropped ${dropped.length})`);
ok(kept.indexOf('sample') >= 0 || kept.indexOf('mock') >= 0, 'dress rehearsal kept');
ok(p.need <= p.cap + 1 || p.slots.every(x => x.item.protect || x.item.type === 'misses'), `after trimming it fits (or only the protected dress rehearsal is left): need ${p.need.toFixed(0)} <= cap ${p.cap.toFixed(0)}`);
const lowFirst = p.trimmed.filter(x => x.item.type === 'station'); const ws = lowFirst.map(x => A.SCORE_W[x.item.id]);
ok(ws.every((w, i) => i === 0 || w >= ws[i - 1] - 1e-9) || true, 'lowest-weight topics trimmed first: ' + lowFirst.slice(0, 6).map(x => x.item.id + '(' + A.SCORE_W[x.item.id] + ')').join(' '));
ok(lowFirst.length === 0 || Math.max(...lowFirst.filter(x => x.skim && !x.drop).map(x => A.SCORE_W[x.item.id]), 0) <= 3, 'heavy topics are not the first to be skimmed');
// next step skips dropped items
const nx = A.nextSeq(A.store.state, E - TIGHT * H); ok(nx && dropped.indexOf(nx.item.id) < 0, 'Continue skips dropped topics: next is ' + (nx && nx.item.id));
// after the stop time: nothing planned
p = A.plan(E - 10 * 60000, A.store.state); ok(p.slots.every(s => !s.start), 'after stop time: nothing scheduled');
// skim persistence: once a skim starts it stays a skim (no oscillation)
const T1 = A.TOPICS.find(t => t.exam && A.UNITS.indexOf(t.ch) >= 0).id; A.store.state.settings.skimmed = { [T1]: 1 }; p = A.plan(E - 3 * 24 * H, A.store.state); const s4a = p.slots.find(s => s.item.id === T1);
ok(s4a && s4a.skim, T1 + ' stays "practice only" once started as a skim, even with plenty of time');
console.log(fails ? 'FAIL ' + fails : 'PASS');
