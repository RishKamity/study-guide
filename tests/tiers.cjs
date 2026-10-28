/* builds the ACCT pack as quick / standard / full (+accent, +daily) and checks what each shows */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..'); const SRC = path.resolve(ROOT, process.env.COURSE || 'courses/demo');
const TMP = path.join(require('os').tmpdir(), 'sg-tiers');
function variant(name, edit) { const d = path.join(TMP, name); fs.rmSync(d, { recursive: true, force: true }); fs.cpSync(SRC, d, { recursive: true, filter: s => !/\/dist(\/|$)/.test(s) }); const f = path.join(d, 'course.js'); fs.writeFileSync(f, edit(fs.readFileSync(f, 'utf8'))); execSync(`node ${ROOT}/tools/build.mjs ${d}`); return 'file://' + path.join(d, 'dist/index.html'); }
const setTier = (t, extra) => s => s.replace(/tier: '\w+'/, `tier: '${t}'`).replace(/accent: '\w+'/, `accent: '${(extra && extra.accent) || 'lavender'}'`).replace(/features: \{[^}]*\},?/, '').replace("storageKey:", (t === 'full' ? ((extra && extra.daily) ? 'features: { daily: true, audio: true }, ' : 'features: { audio: true }, ') : '') + 'storageKey:');
(async () => {
  const b = await chromium.launch(); let ok = true; const chk = (c, m) => { if (!c) ok = false; console.log(c ? 'ok  ' : 'FAIL', m); };
  const NOW = '2026-10-26T10:00:00-04:00';
  for (let [tier, expectTabs, extra] of [['quick', ['today', 'path', 'endless', 'drill', 'ref'], {}], ['standard', ['today', 'path', 'endless', 'drill', 'mock', 'ref'], { accent: 'teal' }], ['full', ['today', 'path', 'endless', 'drill', 'listen', 'mock', 'ref'], { accent: 'coral', daily: true }]]) {
    const url = variant(tier, setTier(tier, extra));
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.clock.install({ time: new Date(NOW) }); await p.goto(url); await p.waitForTimeout(400);
    const tabs = await p.evaluate(() => Array.from(document.querySelectorAll('.tabs button')).map(x => x.dataset.tab)); if (!(await p.evaluate(() => (A.AUDIO || []).length))) expectTabs = expectTabs.filter(x => x !== 'listen');
    chk(JSON.stringify(tabs) === JSON.stringify(expectTabs), `${tier}: tabs ${tabs.join(',')}`);
    const chip = await p.evaluate(() => !!document.querySelector('.chip-score'));
    chk(chip === (tier === 'full'), `${tier}: score chip ${chip ? 'shown' : 'hidden'}`);
    const acc = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
    chk(acc.toLowerCase() === { lavender: '#c4b5fd', teal: '#5eead4', coral: '#fda4af' }[extra.accent || 'lavender'], `${tier}: accent ${extra.accent || 'lavender'} applied (${acc})`);
    const t = await p.evaluate(() => document.querySelector('main').innerText);
    chk(/Study until|Extra session|Break|Sleep/i.test(t), `${tier}: Today shows the live plan`);
    chk(tier === 'full' ? /Predicted score/i.test(t) : /Recent accuracy/i.test(t), `${tier}: right score card`);
    chk(/Misses queue/i.test(t) === (tier === 'full'), `${tier}: misses card only in full`);
    if (tier === 'full') chk(/Daily puzzle/i.test(t), 'full+daily: daily puzzle card on Today');
    // Continue opens the right thing
    await p.evaluate(() => { const b = Array.from(document.querySelectorAll('main button')).find(x => x.textContent.trim() === 'Continue'); b.click(); }); await p.waitForTimeout(300);
    const cur = await p.evaluate(() => U.curName); chk(tier === 'quick' ? cur === 'session' : cur === 'station', `${tier}: Continue opens ${cur}`);
    // drill menu contents
    await p.evaluate(() => U.go('drill')); await p.waitForTimeout(150); const dt = await p.evaluate(() => document.querySelector('main').innerText);
    chk(/Weak spots/i.test(dt) === (tier === 'full') && /Topic drill/i.test(dt), `${tier}: drill extras ${tier === 'full' ? 'shown' : 'hidden'}`);
    if (tier !== 'quick') {
      // station step navigation: jump straight to Practice, then back to Lesson
      await p.evaluate(() => U.go('station', { id: A.TOPICS.find(t => t.exam && A.UNITS.indexOf(t.ch) >= 0).id })); await p.waitForTimeout(150);
      await p.evaluate(() => { const b = Array.from(document.querySelectorAll('main button')).find(x => /Start station/.test(x.textContent)); if (b) b.click(); }); await p.waitForTimeout(150);
      const navs = await p.evaluate(() => Array.from(document.querySelectorAll('.stepnav button')).map(x => x.textContent));
      chk(navs.indexOf('Practice') >= 0 && navs.indexOf('Lesson') >= 0, `${tier}: step nav ${navs.join(' | ')}`);
      await p.evaluate(() => Array.from(document.querySelectorAll('.stepnav button')).find(x => x.textContent.indexOf('Practice') >= 0).click()); await p.waitForTimeout(150);
      chk(/Practice 1\/6/i.test(await p.evaluate(() => document.querySelector('main').innerText)), `${tier}: jumped forward to Practice`);
      await p.evaluate(() => Array.from(document.querySelectorAll('.stepnav button')).find(x => x.textContent.indexOf('Lesson') >= 0).click()); await p.waitForTimeout(150);
      chk(/Lesson .* card 1 of/i.test(await p.evaluate(() => document.querySelector('main').innerText)), `${tier}: jumped back to the Lesson`);
      if (tier === 'standard') await p.screenshot({ path: __dirname + '/shots/stepnav_m.png' });
    }
    // Endless skip + cooldown: skip 20 times in a bank-only topic; no repeat inside any window of 7 (pool is 7)
    const POOL = await p.evaluate(() => { var t = A.TOPICS.filter(t => t.exam && (A.banks[t.id] || []).length && !A.topicSkillIds(t.id).some(k => A.skills[k].kind === 'gen'))[0]; return t ? [t.id, A.banks[t.id].length] : null; }); await p.evaluate((id) => U.go('session', { title: 'x', topics: [id], noFilter: true }), POOL[0]); await p.waitForTimeout(150);
    const stems = [];
    for (let i = 0; i < 14; i++) { stems.push(await p.evaluate(() => document.querySelector('main .stem').textContent)); await p.evaluate(() => Array.from(document.querySelectorAll('main button')).find(x => /^Skip/.test(x.textContent.trim())).click()); await p.waitForTimeout(40); }
    let rep = 0; for (let i = 0; i < stems.length; i++) for (let j = Math.max(0, i - Math.min(POOL[1], 15) + 1); j < i; j++) if (stems[i] === stems[j]) rep++;
    chk(rep === 0, `${tier}: Skip works and no repeats inside the cooldown in a ${POOL[1]}-question topic (${new Set(stems).size} unique of ${stems.length})`);
    const evs = await p.evaluate(() => (A.score.events() || []).length); chk(evs === 0, `${tier}: skipping records nothing`);
    if (tier === 'full') { await p.evaluate(() => U.go('daily')); await p.waitForTimeout(150); await p.keyboard.press('a'); await p.keyboard.press('s'); await p.waitForTimeout(100); const d = await p.evaluate(() => A.store.state.settings.daily); chk(d && d.streak === 1, 'daily puzzle records a 1-day streak'); }
    chk(!errs.length, `${tier}: no page errors ${errs.join('|')}`); await ctx.close();
  }
  console.log(ok ? 'PASS' : 'FAIL'); await b.close();
})();
