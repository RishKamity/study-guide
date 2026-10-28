/* scripts.mjs — step 1 of the audio pipeline: write a narration script for every track from the course's own lessons
   (so audio can never contradict them). node tools/audio/scripts.mjs <courseDir>  →  <courseDir>/audio/scripts_raw.json
   Tracks: 00 Start here, boot camp topics, one per exam-topic lesson (unit order), WALK (walk-in sheet) if the pack has one.
   A pack may add audio/intro.json (array of paragraphs) to replace the generated intro. */
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { pack } from '../files.mjs';
const dir = path.resolve(process.argv[2] || '.'); const K = pack(dir);
const ctx = { console, Math, Date, JSON, Intl, setTimeout, clearTimeout, localStorage: { getItem: () => null, setItem() {} }, document: { addEventListener() {}, documentElement: { style: { setProperty() {} } } }, window: { addEventListener() {} } };
vm.createContext(ctx); for (const f of K.engineFiles.filter(f => !/audio\/tracks\.js$/.test(f))) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
const A = vm.runInContext('A', ctx), C = A.COURSE, S = A.STATIONS;
const end = t => { t = String(t || '').trim(); return !t ? '' : /[.!?:]$/.test(t) ? t : t + '.'; };
const wc = t => String(t).split(/\s+/).filter(Boolean).length;
function stationScript(id) {
  const T = A.TOPIC[id], s = S[id], out = [end(T.title)]; if (s.intro) out.push(end(s.intro));
  (s.cards || []).forEach(c => { out.push(end(c.h)); [].concat(c.rule || []).forEach(r => out.push(end(r))); if (c.analogy) out.push('Think of it this way. ' + end(c.analogy)); if (c.trap && c.trap.t) out.push('Watch the trap. ' + end(c.trap.t)); });
  if (s.worked) { out.push('Now a worked example. ' + end(s.worked.title)); out.push(end(s.worked.setup)); (s.worked.steps || []).slice(0, 6).forEach((st, i) => out.push('Step ' + (i + 1) + '. ' + end(st.action) + ' ' + end(st.math) + (st.why ? ' ' + end(st.why) : ''))); }
  out.push('Pause here and do the practice set for this topic.'); return out;
}
const when = new Date(A.EXAM_AT).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const introFile = path.join(dir, 'audio/intro.json');
const intro = fs.existsSync(introFile) ? JSON.parse(fs.readFileSync(introFile, 'utf8')) : [
  `Welcome to the ${C.course} ${C.exam} audio guide.`,
  `It covers ${A.UNITS.map(u => A.CHAPTERS[u]).join(', ')}. Each track is a few minutes long. Listen while you walk or eat, then do the practice set for that topic.`,
  `The exam is ${when}${C.where ? ', in ' + C.where : ''}. ${C.format.questions} questions in ${C.format.minutes} minutes.`,
  'Your plan re-builds itself every time you open the guide, so if you fall behind it trims the least-tested topics instead of piling up.',
  'Listening is not studying by itself. After each track, pause and do its practice set. If you miss something, the guide brings it back.'];
const tracks = [{ id: '00', title: 'Start here', group: 'Intro', raw: intro }];
A.TOPICS.filter(t => t.ch === 0 && S[t.id]).forEach(t => tracks.push({ id: t.id, title: t.title, group: A.CHAPTERS[0], raw: stationScript(t.id) }));
A.UNITS.forEach(u => A.TOPICS.filter(t => t.ch === u && t.exam && S[t.id]).forEach(t => tracks.push({ id: t.id, title: t.title, group: A.CHAPTERS[u], raw: stationScript(t.id) })));
const SH = A.SHEET;
if (SH && ((SH.FORMULAS || []).length || (SH.TRAPS || []).length)) tracks.push({ id: 'WALK', title: 'Walk-in sheet', group: 'Review', raw: ['This is the walk-in sheet, read aloud. Listen on the way to the exam.']
  .concat((SH.FORMULAS || []).length ? ['Formulas.'] : [], (SH.FORMULAS || []).map(f => end(f[0] + '. ' + f[1])), (SH.JES || []).length ? [(SH.JES_TITLE || 'Journal entry templates') + '.'] : [], (SH.JES || []).map(j => end(j[0] + '. ' + j[1])),
    (SH.TRAPS || []).length ? ['The traps.'] : [], (SH.TRAPS || []).map((t, i) => 'Number ' + (i + 1) + '. ' + end(t)), ['That is the sheet. Breathe. Read each question twice.']) });
let tot = 0; tracks.forEach(t => { t.words = wc(t.raw.join(' ')); tot += t.words; });
fs.mkdirSync(path.join(dir, 'audio'), { recursive: true });
fs.writeFileSync(path.join(dir, 'audio/scripts_raw.json'), JSON.stringify(tracks, null, 1));
console.log(tracks.length + ' tracks, ' + tot + ' words, about ' + Math.round(tot / 150) + ' minutes of audio');
