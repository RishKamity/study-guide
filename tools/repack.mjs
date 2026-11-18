/* repack.mjs — recover a course pack from a published study-guide page, so it can be rebuilt on the current engine.
   node tools/repack.mjs <published index.html> <outCourseDir>
   Every built page keeps each course file whole behind a "/* courses/<id>/<file> *\/" header, plus the flashcards
   and the rendered reference sheet. This writes those files and a pack.json (reference kept as HTML via
   "referenceHtml"). Engine and UI files are dropped: the rebuild takes them from this repo.
   Use it when the original course folder is gone (another session, another machine). Progress is safe: it lives
   under the course's storageKey, which comes back unchanged with course.js. */
import fs from 'fs'; import path from 'path';
const [src, out] = process.argv.slice(2);
if (!src || !out) { console.error('usage: node tools/repack.mjs <index.html> <outCourseDir>'); process.exit(1); }
const html = fs.readFileSync(src, 'utf8');
const a = html.indexOf('(function(){"use strict";\n'), b = html.lastIndexOf('\nwindow.A=A;window.U=U;');
if (a < 0 || b < 0) { console.error('not a study-guide build (no app script found)'); process.exit(1); }
const js = html.slice(a + '(function(){"use strict";\n'.length, b).replace(/<\\\/script/gi, '</script');
/* segment starts: file headers and the two data lines; each segment ends where the next "\n;\n" + start begins */
const re = /(^|\n;\n)(\/\* ((?:engine|ui|courses)\/[^\s]+) \*\/\n|A\.FLASHCARDS = |A\.REF_HTML = )/g;
const marks = []; let m;
while ((m = re.exec(js))) marks.push({ at: m.index + m[1].length, body: m.index + m[0].length, file: m[3] || null, data: m[3] ? null : m[2].slice(2, -3) });
if (!marks.length) { console.error('no file headers found'); process.exit(1); }
const files = [], seg = (i) => js.slice(marks[i].body, i + 1 < marks.length ? marks[i + 1].at - 3 : js.length);
let cards = [], ref = '', id = null;
marks.forEach((k, i) => {
  const body = seg(i);
  if (k.data === 'FLASHCARDS') cards = JSON.parse(body.replace(/;\s*$/, ''));
  else if (k.data === 'REF_HTML') ref = JSON.parse(body.replace(/;\s*$/, ''));
  else if (k.file && k.file.startsWith('courses/')) { const p = k.file.split('/'); id = id || p[1]; files.push([p.slice(2).join('/'), body]); }
});
if (!files.length) { console.error('no course files found (built before course packs had their own folder?)'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
files.forEach(([f, body]) => { const p = path.join(out, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, body); });
fs.writeFileSync(path.join(out, 'flashcards.json'), JSON.stringify(cards, null, 1));
fs.writeFileSync(path.join(out, 'reference.html'), ref);
const names = files.map(x => x[0]), course = names.find(f => f === 'course.js') || names[0], audio = names.find(f => /^audio\/tracks\.js$/.test(f));
const pk = { course, files: names.filter(f => f !== course && f !== audio), flashcards: 'flashcards.json', referenceHtml: 'reference.html', repackedFrom: id };
if (audio) pk.audio = audio;
fs.writeFileSync(path.join(out, 'pack.json'), JSON.stringify(pk, null, 2));
console.log(`repacked ${id}: ${names.length} course files, ${cards.length} flashcards, reference ${ref.length ? 'yes' : 'none'} -> ${out}`);
