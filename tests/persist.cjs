/* persist.cjs — the viewer keeps their place: switching tabs or reloading must not swap the current question,
   lose an answered question, or send a lesson back to card 1. node tests/persist.cjs <courseDir> (build first). */
const { chromium } = require('playwright'); const path = require('path');
const dir = path.resolve(process.argv[2] || 'courses/demo'); const url = 'file://' + path.join(dir, 'dist/index.html');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fails = 0; const log = (ok, m) => { if (!ok) fails++; console.log(ok ? 'ok  ' : 'FAIL', m); };
  const stem = () => p.evaluate(() => { const s = document.querySelector('main .stem'); return s ? s.textContent : null; });
  const go = (v, prm) => p.evaluate(([v, prm]) => U.go(v, prm || undefined), [v, prm]);
  await p.goto(url); await p.waitForTimeout(400);
  const first = await p.evaluate(() => A.TOPICS.find(t => t.exam && A.STATIONS[t.id]).id);

  // Endless: same question after a tab switch
  await go('endless'); await p.waitForTimeout(150);
  await p.evaluate(() => { const c = document.querySelector('main input[type=checkbox]'); if (c && !c.checked) c.click(); }); await p.waitForTimeout(150);
  const s1 = await stem();
  await go('path'); await p.waitForTimeout(100); await go('endless'); await p.waitForTimeout(150);
  log(s1 && (await stem()) === s1, 'Endless keeps the same question after switching tabs');
  // picked (not yet locked) option survives
  await p.evaluate(() => document.querySelectorAll('.opt .optmain')[1].click()); await p.waitForTimeout(50);
  await go('ref'); await go('endless'); await p.waitForTimeout(150);
  log(await p.evaluate(() => document.querySelectorAll('.opt')[1].classList.contains('sel')), 'Endless keeps a picked option after switching tabs');
  // answered question survives a reload, without being counted twice
  await p.evaluate(() => { const c = document.querySelector('.conf:not(.hide) button'); if (c) c.click(); }); await p.waitForTimeout(150);
  const answersBefore = await p.evaluate(() => A.store.state.count);
  await p.reload(); await p.waitForTimeout(500); await go('endless'); await p.waitForTimeout(200);
  log((await stem()) === s1 && await p.evaluate(() => !!document.querySelector('.reveal')), 'Endless keeps an answered question (with its explanation) after a reload');
  log(await p.evaluate(() => A.store.state.count) === answersBefore, 'restoring an answered question does not record it again');
  await p.evaluate(() => { const n = Array.from(document.querySelectorAll('main .btn')).find(x => /next question/i.test(x.textContent)); n.click(); }); await p.waitForTimeout(150);
  const s2 = await stem(); await go('today'); await go('endless'); await p.waitForTimeout(150);
  log(s2 && s2 !== s1 && (await stem()) === s2, 'Next question moves on, and the new question is kept too');

  // Station: lesson card index survives a tab switch and a reload
  await p.evaluate((id) => { delete A.store.state.stations[id]; A.setStation(id, { step: 2 }); U.place.del('station:' + id); U.go('station', { id }); }, first); await p.waitForTimeout(150);
  const cards = await p.evaluate((id) => A.STATIONS[id].cards.length, first);
  if (cards > 1) {
    await p.evaluate(() => Array.from(document.querySelectorAll('main .btn')).find(x => /next card/i.test(x.textContent)).click()); await p.waitForTimeout(80);
    const lab = () => p.evaluate(() => { const e = Array.from(document.querySelectorAll('main .eyebrow')).find(x => /card \d+ of/i.test(x.textContent)); return e ? e.textContent : null; });
    const c2 = await lab(); await go('endless'); await go('station', { id: first }); await p.waitForTimeout(150);
    log(c2 && (await lab()) === c2, 'Lesson stays on the same card after switching tabs (' + c2 + ')');
    await p.reload(); await p.waitForTimeout(500); await go('station', { id: first }); await p.waitForTimeout(150);
    log((await lab()) === c2, 'Lesson stays on the same card after a reload');
  }
  // Station practice: same question after a tab switch
  await p.evaluate((id) => { A.setStation(id, { step: 5 }); U.place.del('station:' + id); U.go('station', { id }); }, first); await p.waitForTimeout(150);
  await p.evaluate(() => { const b = Array.from(document.querySelectorAll('main .stepnav button')).find(x => /practice/i.test(x.textContent)); if (b && !b.classList.contains('cur')) b.click(); }); await p.waitForTimeout(150);
  const s3 = await stem(); await go('drill'); await go('station', { id: first }); await p.waitForTimeout(150);
  log(s3 && (await stem()) === s3, 'Station practice keeps the same question after switching tabs');
  log(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'PASS'); process.exit(fails ? 1 : 0);
})();
