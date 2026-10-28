/* review_compare.mjs — compare a blind reviewer's answers with the key.
   node tools/review_compare.mjs <courseDir> <blind_answers.json>   (answers: [{n, answer, confidence, flag}]) */
import fs from 'fs'; import path from 'path';
const [dir, file] = process.argv.slice(2); const key = JSON.parse(fs.readFileSync(path.join(dir, 'qa/items_key.json'), 'utf8')), ans = JSON.parse(fs.readFileSync(file, 'utf8'));
const byN = {}; ans.forEach(a => byN[a.n] = a); let mism = 0, flags = 0;
key.forEach(k => { const a = byN[k.n]; if (!a) { console.log(`MISSING  #${k.n} ${k.id}`); mism++; return; }
  if (String(a.answer).toUpperCase() !== k.answer) { mism++; console.log(`MISMATCH #${k.n} ${k.id}: key ${k.answer}, reviewer ${a.answer} (conf ${a.confidence})${a.flag ? ' flag: ' + a.flag : ''}\n         rule: ${k.rule}\n         work: ${k.work}`); }
  else if (a.flag) { flags++; console.log(`FLAG     #${k.n} ${k.id}: ${a.flag}`); } });
console.log(`\n${key.length} items: ${key.length - mism} agree, ${mism} disagree, ${flags} flagged. Investigate every disagreement against the course files before trusting either side.`);
process.exit(mism ? 1 : 0);
