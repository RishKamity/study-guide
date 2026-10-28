import { loadA } from './load.mjs';
const T0 = (() => { const A = loadA(); return Object.keys(A.SCORE_W); })(); const [TA, TB, TC] = [T0[0], T0[1 % T0.length], T0[2 % T0.length]];
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok' : 'FAIL', m); if (!c) fails++; };
function sim(trueR, nAns, opts = {}) {
  const A = loadA(); const C = A.SCORE; const tops = Object.keys(A.SCORE_W); let t = Date.UTC(2026, 9, 27, 5);
  const rnd = A.mulberry32(opts.seed || 7);
  const TW = tops.reduce((s, k) => s + A.SCORE_W[k], 0); const truth = 100 * tops.reduce((s, k) => s + A.SCORE_W[k] * A.pCorrect((trueR[k] ?? trueR._), C.E), 0) / TW;
  for (let i = 0; i < nAns; i++) {
    const k = opts.only ? opts.only : tops[Math.floor(rnd() * tops.length)];
    const d = opts.easy ? 1150 : [1150, 1300, 1450][Math.floor(rnd() * 3)];
    const p = A.pCorrect((trueR[k] ?? trueR._), d); const o = rnd() < p ? 1 : 0; t += 40000;
    A.score.raw(['sim' + i, t, k, d, o, 1]);
  }
  return { A, pred: A.score.now(t).pct, truth };
}
let r = sim({ _: 1400 }, 600); ok(Math.abs(r.pred - r.truth) < 4, `strong student: pred ${r.pred.toFixed(2)} vs truth ${r.truth.toFixed(2)}`);
r = sim({ _: 1150 }, 600, { seed: 3 }); ok(Math.abs(r.pred - r.truth) < 4, `average student: pred ${r.pred.toFixed(2)} vs truth ${r.truth.toFixed(2)}`);
r = sim({ _: 1100, [TA]: 1500, [TB]: 1500 }, 800, { seed: 9 }); ok(Math.abs(r.pred - r.truth) < 4, `mixed student: pred ${r.pred.toFixed(2)} vs truth ${r.truth.toFixed(2)}`);
// farming: 300 easy questions all correct in one small topic
{ const A = loadA(); let t = Date.UTC(2026, 9, 27, 5); const p0 = A.score.now(t).pct; for (let i = 0; i < 300; i++) { t += 20000; A.score.raw(['f' + i, t, TA, 1150, 1, 1]); } const p1 = A.score.now(t).pct; const share = 100 * A.SCORE_W[TA] / Object.values(A.SCORE_W).reduce((a, b) => a + b, 0); ok(p1 - p0 < share * 0.75 + 3, `farming 300 easy answers in one topic moves score only ${(p1 - p0).toFixed(2)} pts`); }
// one hard correct beats one easy correct
{ const A = loadA(); const t = Date.UTC(2026, 9, 27, 5); const p0 = A.score.now(t).pct; A.score.raw(['h', t, TA, 1450, 1, 1]); const ph = A.score.now(t).pct - p0;
  const B = loadA(); B.score.raw(['e', t, TA, 1150, 1, 1]); const pe = B.score.now(t).pct - p0; ok(ph > pe && pe > 0, `hard right +${ph.toFixed(2)} > easy right +${pe.toFixed(2)}`); }
// decay: after 3 idle days score drops a little, capped
{ const A = loadA(); let t = Date.UTC(2026, 9, 27, 5); for (let i = 0; i < 40; i++) { t += 30000; A.score.raw(['d' + i, t, TA, 1300, 1, 1]); } const p0 = A.score.now(t).pct, p1 = A.score.now(t + 3 * 864e5).pct, p2 = A.score.now(t + 30 * 864e5).pct; ok(p1 < p0 && p0 - p1 < 2 && p2 <= p1 && p0 - p2 < 3, `decay: ${p0.toFixed(2)} -> ${p1.toFixed(2)} (3 days) -> ${p2.toFixed(2)} (30 days)`); }
// merge order-independence: same events in two orders -> same score
{ const A = loadA(), B = loadA(); const t = Date.UTC(2026, 9, 27, 5); const evs = []; for (let i = 0; i < 50; i++) evs.push(['m' + i, t + i * 1000, [TA, TB, TC][i % 3], 1300, i % 4 ? 1 : 0, 1]);
  A.score.merge(evs); B.score.merge(evs.slice().reverse()); B.score.merge(evs.slice(10, 20)); ok(Math.abs(A.score.now(t + 1e6).pct - B.score.now(t + 1e6).pct) < 1e-9 && B.score.events().length === 50, 'merge is order-independent and dedupes'); }
// calibration moves halfway toward the actual mock score
{ const A = loadA(); const t = Date.UTC(2026, 9, 27, 5); const p0 = A.score.now(t).pct; A.score.calibrate('cal:x', t, 80); const p1 = A.score.now(t).pct; ok(Math.abs(p1 - (p0 + 0.5 * (80 - p0))) < 0.05, `calibration ${p0.toFixed(2)} -> ${p1.toFixed(2)} (target ${(p0 + 0.5 * (80 - p0)).toFixed(2)})`); }
console.log(fails ? 'FAIL ' + fails : 'PASS');
