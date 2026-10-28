/* files.mjs — the load order shared by the build and the tests. */
import fs from 'fs'; import path from 'path';
export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const ENGINE_PRE = ['engine/rng.js', 'engine/items.js'];
export const ENGINE_MID = ['engine/course.js', 'engine/store.js'];
export const ENGINE_POST = ['engine/adaptive.js', 'engine/schedule.js', 'engine/score.js'];
export const UI = ['ui/core.js', 'ui/visuals.js', 'ui/question.js', 'ui/station.js', 'ui/exam.js', 'ui/session.js', 'ui/views.js', 'ui/drill2.js', 'ui/ai.js', 'ui/listen.js', 'ui/daily.js', 'ui/main.js'];
export function pack(courseDir) {
  const dir = path.resolve(courseDir); const P = JSON.parse(fs.readFileSync(path.join(dir, 'pack.json'), 'utf8'));
  const abs = f => path.join(dir, f);
  return { dir, P,
    engineFiles: [...ENGINE_PRE.map(f => path.join(ROOT, f)), abs(P.course), ...ENGINE_MID.map(f => path.join(ROOT, f)), ...P.files.map(abs), ...(P.audio && fs.existsSync(abs(P.audio)) ? [abs(P.audio)] : []), ...ENGINE_POST.map(f => path.join(ROOT, f))],
    uiFiles: UI.map(f => path.join(ROOT, f)).filter(f => fs.existsSync(f)) };
}
