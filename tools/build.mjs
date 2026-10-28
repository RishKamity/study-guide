/* build.mjs — node tools/build.mjs <courseDir>  →  <courseDir>/dist/index.html (one self-contained page) */
import fs from 'fs'; import path from 'path'; import { ROOT, pack } from './files.mjs';
const courseDir = process.argv[2]; if (!courseDir) { console.error('usage: node tools/build.mjs <courseDir>'); process.exit(1); }
const K = pack(courseDir); const rd = f => fs.readFileSync(f, 'utf8'); const safe = s => s.replace(/<\/script/gi, '<\\/script');
function md(src) {
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
const P = K.P, cdir = K.dir;
const title = (rd(path.join(cdir, P.course)).match(/title:\s*'([^']+)'/) || [, 'Study Guide'])[1];
const ref = P.reference && fs.existsSync(path.join(cdir, P.reference)) ? md(rd(path.join(cdir, P.reference))) : '';
const cards = P.flashcards && fs.existsSync(path.join(cdir, P.flashcards)) ? JSON.parse(rd(path.join(cdir, P.flashcards))) : [];
const parts = [];
parts.push('<title>' + title.replace(/</g, '&lt;') + '</title>\n<meta name="claude:viewport-fit-sides" content="cover">');
parts.push('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Manrope:wght@400;500;600;700&family=Sora:wght@600;700;800&family=Source+Serif+4:wght@400;600&display=swap">');
parts.push('<style>\n' + rd(path.join(ROOT, 'styles/app.css')) + '\n</style>');
parts.push('<div id="app"></div>');
const js = [];
K.engineFiles.forEach(f => js.push('/* ' + path.relative(ROOT, f) + ' */\n' + rd(f)));
js.push('A.FLASHCARDS = ' + JSON.stringify(cards) + ';');
js.push('A.REF_HTML = ' + JSON.stringify(ref) + ';');

K.uiFiles.forEach(f => js.push('/* ' + path.relative(ROOT, f) + ' */\n' + rd(f)));
parts.push('<script>\n(function(){"use strict";\n' + safe(js.join('\n;\n')) + '\nwindow.A=A;window.U=U;\n})();\n</script>');
const outDir = path.join(cdir, 'dist'); fs.mkdirSync(outDir, { recursive: true });
const out = parts.join('\n'); fs.writeFileSync(path.join(outDir, 'index.html'), out);
console.log('built', path.relative(process.cwd(), path.join(outDir, 'index.html')), (out.length / 1024).toFixed(0) + ' KB');
