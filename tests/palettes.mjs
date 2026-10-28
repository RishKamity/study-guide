import { loadA } from './load.mjs';
const A = loadA(); let fails = 0;
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const BG = { dark: ['#0B0D10', '#14171C', '#1B1F26'], light: ['#F7F6FB', '#FFFFFF', '#F0EEF8'] };
for (const [name, p] of Object.entries(A.PALETTES)) for (const th of ['dark', 'light']) {
  const [acc, , on, ai, aifill] = p[th]; const r = [Math.min(...BG[th].map(b => cr(acc, b))), cr(on, acc), cr(ai, aifill)];
  const ok = r[0] >= 4.5 && r[1] >= 4.5 && r[2] >= 4.5; if (!ok) fails++;
  console.log(ok ? 'ok  ' : 'FAIL', name.padEnd(9), th.padEnd(5), 'accent/bg', r[0].toFixed(2), ' on-accent', r[1].toFixed(2), ' ai', r[2].toFixed(2));
}
console.log(fails ? 'FAIL ' + fails : 'PASS');
