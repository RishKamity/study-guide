/* build.mjs — node tools/build.mjs <courseDir>  →  <courseDir>/dist/index.html (one self-contained page) */
import fs from 'fs'; import path from 'path'; import { ROOT, pack, md } from './files.mjs';
const courseDir = process.argv[2]; if (!courseDir) { console.error('usage: node tools/build.mjs <courseDir>'); process.exit(1); }
const K = pack(courseDir); const rd = f => fs.readFileSync(f, 'utf8'); const safe = s => s.replace(/<\/script/gi, '<\\/script');
const P = K.P, cdir = K.dir;
const title = (rd(path.join(cdir, P.course)).match(/title:\s*'([^']+)'/) || [, 'Study Guide'])[1];
const ref = P.reference && fs.existsSync(path.join(cdir, P.reference)) ? md(rd(path.join(cdir, P.reference))) : '';
const cards = P.flashcards && fs.existsSync(path.join(cdir, P.flashcards)) ? JSON.parse(rd(path.join(cdir, P.flashcards))) : [];
const parts = [];
parts.push('<meta charset="utf-8">\n<title>' + title.replace(/</g, '&lt;') + '</title>\n<meta name="claude:viewport-fit-sides" content="cover">');
parts.push('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Manrope:wght@400;500;600;700&family=Sora:wght@600;700;800&family=Source+Serif+4:wght@400;600&display=swap">');
parts.push('<style>\n' + rd(path.join(ROOT, 'styles/app.css')) + '\n</style>');
/* optional math typesetting: pack.json "math": "katex" inlines KaTeX (script, CSS and woff2 fonts) so $…$ in any course text renders as math */
const MATH = P.math === 'katex';
if (MATH) {
  const kd = path.join(ROOT, 'vendor/katex');
  const css = rd(path.join(kd, 'katex.min.css')).replace(/src:url\(fonts\/([^)]+?)\.woff2\) format\("woff2"\)[^;}]*/g, (m, f) => 'src:url(data:font/woff2;base64,' + fs.readFileSync(path.join(kd, 'fonts', f + '.woff2')).toString('base64') + ') format("woff2")');
  parts.push('<style>\n' + css + '\n</style>');
  parts.push('<script>\n' + safe(rd(path.join(kd, 'katex.min.js'))) + '\n</script>');
}
parts.push('<div id="app"></div>');
const js = [];
K.engineFiles.forEach(f => js.push('/* ' + path.relative(ROOT, f) + ' */\n' + rd(f)));
js.push('A.FLASHCARDS = ' + JSON.stringify(cards) + ';');
js.push('A.REF_HTML = ' + JSON.stringify(ref) + ';');
js.push('A.MATH = ' + (MATH ? 'true' : 'false') + ';');
js.push('if (A.texifyCards) A.texifyCards();');

K.uiFiles.forEach(f => js.push('/* ' + path.relative(ROOT, f) + ' */\n' + rd(f)));
parts.push('<script>\n(function(){"use strict";\n' + safe(js.join('\n;\n')) + '\nwindow.A=A;window.U=U;\n})();\n</script>');
const outDir = path.join(cdir, 'dist'); fs.mkdirSync(outDir, { recursive: true });
const out = parts.join('\n'); fs.writeFileSync(path.join(outDir, 'index.html'), out);
console.log('built', path.relative(process.cwd(), path.join(outDir, 'index.html')), (out.length / 1024).toFixed(0) + ' KB');
