/* load.mjs — load the engine + a course pack into a Node VM (no DOM) for code-level tests. COURSE env picks the pack. */
import vm from 'vm'; import fs from 'fs'; import path from 'path'; import { ROOT, pack } from '../tools/files.mjs';
export const COURSE_DIR = path.resolve(ROOT, process.env.COURSE || 'courses/acct200-exam2');
export function loadA(extra = []) {
  const ctx = { console, Math, Date, JSON, setTimeout, clearTimeout, Intl, localStorage: { getItem: () => null, setItem: () => {} }, document: { addEventListener() {}, documentElement: { style: { setProperty() {} } } }, window: { addEventListener() {} } };
  vm.createContext(ctx);
  for (const f of [...pack(COURSE_DIR).engineFiles, ...extra]) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
  return vm.runInContext('A', ctx);
}
