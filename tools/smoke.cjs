/* smoke.cjs — click through a built course page like a student, at phone and laptop sizes.
   node tools/smoke.cjs <courseDir>   (build first: node tools/build.mjs <courseDir>)
   Fails on any page error, horizontal scroll, a bottom button hidden under the tab bar, or a flow that gets stuck.
   Screenshots go to <courseDir>/shots/ — look at them before publishing. */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const dir = path.resolve(process.argv[2] || '.'); const url = 'file://' + path.join(dir, 'dist/index.html');
const shots = path.join(dir, 'shots'); fs.mkdirSync(shots, { recursive: true });
(async () => {
  const b = await chromium.launch(); let fails = 0; const log = (ok, m) => { if (!ok) fails++; console.log(ok ? 'ok  ' : 'FAIL', m); };
  for (const [w, h, tag] of [[390, 844, 'phone'], [1280, 800, 'laptop']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900 }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|net::|Failed to load resource|MEDIA/.test(m.text())) errs.push('console: ' + m.text()); });
    await p.goto(url); await p.waitForTimeout(500);
    const info = await p.evaluate(() => ({ tabs: Array.from(document.querySelectorAll('.tabs button')).map(x => x.dataset.tab), first: (A.TOPICS.find(t => t.exam && A.UNITS.indexOf(t.ch) >= 0) || {}).id, unit: A.UNITS[0], F: A.FEAT, title: A.COURSE.title }));
    const noScroll = async (m) => log(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${tag}: no sideways scroll on ${m}`);
    const lastTappable = async (m) => { await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(120); const r = await p.evaluate(() => { const bs = Array.from(document.querySelectorAll('main button')).filter(x => x.offsetParent); if (!bs.length) return true; const last = bs.reduce((a, c) => c.getBoundingClientRect().bottom > a.getBoundingClientRect().bottom ? c : a); const br = last.getBoundingClientRect(); if (br.bottom < 0) return true; const hit = document.elementFromPoint(br.left + br.width / 2, Math.min(br.top + br.height / 2, innerHeight - 1)); return hit === last || last.contains(hit); }); log(r, `${tag}: last button reachable on ${m}`); };
    for (const t of info.tabs) { await p.evaluate((t) => U.go(t === 'endless' ? 'endless' : t), t); await p.waitForTimeout(200); await noScroll(t); await lastTappable(t); await p.screenshot({ path: path.join(shots, `${tag}-${t}.png`) }); }
    // a full station (or a topic drill on Quick)
    if (info.F.stations && info.first) {
      await p.evaluate((id) => U.go('station', { id }), info.first); await p.waitForTimeout(150); let stuck = false;
      for (let i = 0; i < 600; i++) {
        if (await p.evaluate(() => /station complete/i.test(document.querySelector('main').innerText))) break;
        const a = await p.evaluate(() => { const q = s => Array.from(document.querySelectorAll(s)); const conf = q('.conf:not(.hide) button'); if (conf.length) { conf[1].click(); return 1; } const opt = q('.opt:not(.locked) .optmain'); if (opt.length) { opt[0].click(); return 1; } const nx = q('main .btn').filter(b => !b.disabled && !b.classList.contains('ghost') && !b.classList.contains('sm')); if (nx.length) { nx[nx.length - 1].click(); return 1; } return 0; });
        if (!a) { stuck = true; break; } await p.waitForTimeout(25);
      }
      log(!stuck && await p.evaluate(() => /station complete/i.test(document.querySelector('main').innerText)), `${tag}: station ${info.first} runs start to finish`);
      await p.screenshot({ path: path.join(shots, `${tag}-station-done.png`) });
    }
    // Endless: answer one, see the explanation
    await p.evaluate(() => U.go('endless')); await p.waitForTimeout(150);
    const ans = await p.evaluate(() => { const o = document.querySelector('.opt .optmain'); if (!o) return false; o.click(); const c = document.querySelector('.conf button'); if (c) c.click(); return true; }); await p.waitForTimeout(150);
    log(ans && await p.evaluate(() => /Rule|Answer/i.test(document.querySelector('main').innerText)), `${tag}: Endless question answers and explains`);
    await lastTappable('a revealed answer'); await p.screenshot({ path: path.join(shots, `${tag}-endless-reveal.png`), fullPage: true });
    // a mini-mock start to finish
    if (info.F.minimocks) {
      await p.evaluate((u) => U.openSeq({ type: 'minimock', id: 'mm' + u, ch: u, title: 'Mini-mock' }), info.unit); await p.waitForTimeout(150);
      await p.evaluate(() => { const b = document.querySelector('main .btn.block'); if (b) b.click(); }); await p.waitForTimeout(150);
      for (let i = 0; i < 40; i++) { await p.keyboard.press('KeyA'); await p.keyboard.press('ArrowRight'); }
      await p.evaluate(() => { const f = () => Array.from(document.querySelectorAll('main .btn')).find(x => /^(Yes, )?[Ss]ubmit/.test(x.textContent.trim())); let b = f(); if (b) b.click(); b = f(); if (b) b.click(); }); await p.waitForTimeout(250);
      log(await p.evaluate(() => /results/i.test(document.querySelector('main').innerText)), `${tag}: mini-mock submits and shows results`);
      await p.screenshot({ path: path.join(shots, `${tag}-results.png`), fullPage: true });
    }
    log(!errs.length, `${tag}: no page errors${errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''}`);
    await ctx.close();
  }
  console.log(`\n${fails ? 'FAIL' : 'PASS'}: ${fails} problem(s). Screenshots in ${path.relative(process.cwd(), shots)}/`); await b.close(); process.exit(fails ? 1 : 0);
})();
