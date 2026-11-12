/* rewording.mjs — bank `alts`: every wording is reachable, repeats move to a new wording, a missed question comes back
   reworded (never in the wording that was missed), and banks without alts behave exactly as before.
   Run: COURSE=courses/demo node tests/rewording.mjs  (needs a pack with at least one bank item that has 2+ alts) */
import { loadA } from './load.mjs';
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok' : 'FAIL', m); if (!c) fails++; };

const A = loadA();
/* find a bank question with rewordings, and one without */
let T = null, I = -1, N = 0, PT = null, PI = -1;
for (const t of Object.keys(A.banks)) A.banks[t].forEach((s, i) => { const n = A.wordings(s).length; if (n >= 3 && I < 0) { T = t; I = i; N = n; } if (n === 1 && PI < 0) { PT = t; PI = i; } });
ok(I >= 0, `found a reworded bank question (${T}#${I}, ${N} wordings)`);

/* 1. each variant shows wording variant % N, and the key follows the wording */
const stems = new Set();
for (let v = 0; v < N * 2; v++) { const it = A.makeItem(`b:${T}:${I}:${v}`), w = A.wordings(A.banks[T][I])[v % N]; stems.add(it.stem); if (it.stem !== w.q || it.options[it.answer] !== w.a) ok(false, `variant ${v} shows the wrong wording or key`); }
ok(stems.size === N, `all ${N} wordings reachable through variants`);

/* 2. repeated showings cycle through the wordings (least-shown first) */
const seen = {}, shown = [];
for (let k = 0; k < N; k++) { const v = A.bankVariant(T, I, seen); const id = `b:${T}:${I}:${v}`; seen[id] = (seen[id] || 0) + 1; shown.push(A.wordingOf(id)); }
ok(new Set(shown).size === N, `first ${N} showings use ${N} different wordings (${shown.join(',')})`);

/* 3. a missed question comes back reworded, never in the missed wording */
const store = A.store.state; const sid = T + '.bank';
const missed = A.makeItem(`b:${T}:${I}:0`);
A.recordAnswer({ item: missed, chosen: (missed.answer + 1) % 4, conf: 1, ms: 1000, mode: 'endless' });
ok(store.misses[sid] && store.misses[sid].queue && store.misses[sid].queue.length === 1, 'miss is queued with its question id');
store.count = store.misses[sid].due;   // make it due
const rw = A.rewordMiss(sid, {});
ok(rw && rw.idx === I && rw.avoid === 0, 'due miss asks for the same question, avoiding wording 0');
let allNew = true;
for (let k = 0; k < 20; k++) { const it = A.freshItem(sid, A.mulberry32(k + 1), Object.assign({}, store.seen), rw); if (A.baseId(it.id) !== `b:${T}:${I}` || it.wording === 0) allNew = false; }
ok(allNew, 'returning miss is the same idea in a different wording (20 tries)');

/* 4. answering the reworded version right clears it from the queue */
const back = A.freshItem(sid, A.mulberry32(5), Object.assign({}, store.seen), rw);
A.recordAnswer({ item: back, chosen: back.answer, conf: 1, ms: 1000, mode: 'endless' });
ok(!store.misses[sid].queue.length, 'correct answer on the rewording clears it from the queue');

/* 5. banks without alts: same ids as the old rule (option order = shows % 4), wording 0 always */
if (PI >= 0) {
  const s2 = {}; let same = true;
  for (let k = 0; k < 6; k++) { const v = A.bankVariant(PT, PI, s2); if (v !== k % 4) same = false; const id = `b:${PT}:${PI}:${v}`; s2[id] = (s2[id] || 0) + 1; if (A.makeItem(id).wording !== 0) same = false; }
  ok(same, 'questions without alts keep the old option-order rotation');
}

console.log(fails ? `\n${fails} FAILED` : '\nall rewording checks passed'); process.exit(fails ? 1 : 0);
