/* review_export.mjs — prepare the independent review (SKILL.md Phase 7).
   node tools/review_export.mjs <courseDir> <outDir> [perTopic=2]
   Writes <outDir>/items_blind.json (no keys) and <outDir>/lessons.md for the reviewers, and the key to
   <courseDir>/qa/items_key.json (keep reviewers away from it). */
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { pack } from './files.mjs';
const [dirArg, outArg, perArg] = process.argv.slice(2); if (!dirArg || !outArg) { console.error('usage: node tools/review_export.mjs <courseDir> <outDir> [perTopic]'); process.exit(1); }
const K = pack(dirArg), out = path.resolve(outArg), per = +perArg || 2; fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(path.join(K.dir, 'qa'), { recursive: true });
const ctx = { console, Math, Date, JSON, Intl, setTimeout, clearTimeout, localStorage: { getItem: () => null, setItem() {} }, document: { addEventListener() {}, documentElement: { style: { setProperty() {} } } }, window: { addEventListener() {} } };
vm.createContext(ctx); for (const f of K.engineFiles) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
const A = vm.runInContext('A', ctx), L = 'ABCD', rng = A.mulberry32(Date.now() % 1e9), items = [], key = [], used = {};
A.TOPICS.filter(t => t.exam).forEach(t => { const sk = A.topicSkillIds(t.id); for (let i = 0; i < per && sk.length; i++) { let it = null;
  for (let tr = 0; tr < 20 && !it; tr++) { const c = A.freshItem(sk[(i + tr) % sk.length], rng, used); if (c && !used[A.baseId(c.id)]) it = c; }
  if (!it) continue; used[A.baseId(it.id)] = 1; const n = items.length + 1, opt = j => it.optsRaw && Array.isArray(it.optsRaw[j]) ? A.jeStr(it.optsRaw[j]) : it.options[j];
  items.push({ n, stem: it.stem, table: it.table || undefined, options: it.options.map((_, j) => L[j] + '. ' + opt(j)) }); key.push({ n, id: it.id, topic: t.id, answer: L[it.answer], rule: it.rule, work: it.work }); } });
fs.writeFileSync(path.join(out, 'items_blind.json'), JSON.stringify(items, null, 1)); fs.writeFileSync(path.join(K.dir, 'qa/items_key.json'), JSON.stringify(key, null, 1));
let md = '# Lessons to audit against the course files\n\n';
for (const [id, s] of Object.entries(A.STATIONS)) { const T = A.TOPIC[id]; if (!T) continue; md += `## ${id} ${T.title}\nIntro: ${s.intro}\n`;
  (s.cards || []).forEach(c => { md += `### ${c.h}${c.general ? ' (marked: not from course files)' : ''}\n` + [].concat(c.rule || []).map(r => '- ' + r).join('\n') + '\n'; if (c.analogy) md += 'Analogy: ' + c.analogy + '\n'; if (c.trap) md += 'Trap: ' + c.trap.t + (c.trap.quote ? ` [quote L${c.trap.quote.lec} ${c.trap.quote.ts || ''}: "${c.trap.quote.text}"]` : '') + '\n'; });
  [['Worked', s.worked], ['Faded', s.faded]].forEach(([k, w]) => { if (w) md += `${k}: ${w.title}. ${w.setup}\n` + w.steps.map((x, i) => `${i + 1}. ${x.action} ${x.math || ''} ${x.why || ''}`).join('\n') + '\n'; }); md += '\n'; }
fs.writeFileSync(path.join(out, 'lessons.md'), md);
console.log(`${items.length} blind items and ${Object.keys(A.STATIONS).length} lessons written to ${out}; key in ${path.join(K.dir, 'qa/items_key.json')}`);
