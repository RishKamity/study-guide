/* files.mjs — the load order shared by the build and the tests. */
import fs from 'fs'; import path from 'path';
export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const ENGINE_PRE = ['engine/rng.js', 'engine/items.js'];
export const ENGINE_MID = ['engine/course.js', 'engine/store.js'];
export const ENGINE_POST = ['engine/texify.js', 'engine/adaptive.js', 'engine/schedule.js', 'engine/score.js'];
export const UI = ['ui/core.js', 'ui/visuals.js', 'ui/question.js', 'ui/station.js', 'ui/exam.js', 'ui/session.js', 'ui/views.js', 'ui/drill2.js', 'ui/ai.js', 'ui/listen.js', 'ui/daily.js', 'ui/main.js'];
export function pack(courseDir) {
  const dir = path.resolve(courseDir); const P = JSON.parse(fs.readFileSync(path.join(dir, 'pack.json'), 'utf8'));
  const abs = f => path.join(dir, f);
  return { dir, P,
    engineFiles: [...ENGINE_PRE.map(f => path.join(ROOT, f)), abs(P.course), ...ENGINE_MID.map(f => path.join(ROOT, f)), ...P.files.map(abs), ...(P.audio && fs.existsSync(abs(P.audio)) ? [abs(P.audio)] : []), ...ENGINE_POST.map(f => path.join(ROOT, f))],
    uiFiles: UI.map(f => path.join(ROOT, f)).filter(f => fs.existsSync(f)) };
}

/* md: the small Markdown subset used for reference sheets (headings, tables, lists, bold/italic/code) → HTML */
export function md(src) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/`(.+?)`/g, '<code>$1</code>');
  const L = src.split('\n'); const out = []; let i = 0;
  while (i < L.length) {
    const l = L[i];
    if (/^Sources:/.test(l)) { i++; continue; }
    if (/^### /.test(l)) { out.push('<h4>' + inl(l.slice(4)) + '</h4>'); i++; }
    else if (/^## /.test(l)) { out.push('<h3>' + inl(l.slice(3)) + '</h3>'); i++; }
    else if (/^# /.test(l) || /^---/.test(l)) { i++; }
    else if (/^\|/.test(l)) {
      const rows = []; while (i < L.length && /^\|/.test(L[i])) { rows.push(L[i]); i++; }
      const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(rows[0]); const body = rows.slice(2).map(cells);
      out.push('<table><thead><tr>' + head.map(c => '<th>' + inl(c) + '</th>').join('') + '</tr></thead><tbody>' + body.map(r => '<tr>' + r.map(c => '<td>' + inl(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>');
    }
    else if (/^[-*] /.test(l)) { const it = []; while (i < L.length && /^[-*] /.test(L[i])) { it.push('<li>' + inl(L[i].slice(2)) + '</li>'); i++; } out.push('<ul>' + it.join('') + '</ul>'); }
    else if (l.trim() === '') i++;
    else { out.push('<p>' + inl(l) + '</p>'); i++; }
  }
  return out.join('\n');
}
