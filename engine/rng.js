/* rng.js — seeded RNG + helpers. Global namespace A. */
var A = (typeof A !== 'undefined') ? A : {};
A.mulberry32 = function (seed) {
  var a = seed >>> 0;
  var f = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.int = function (lo, hi) { return lo + Math.floor(f() * (hi - lo + 1)); };           // inclusive
  f.step = function (lo, hi, st) { return lo + st * Math.floor(f() * (Math.floor((hi - lo) / st) + 1)); };
  f.pick = function (arr) { return arr[Math.floor(f() * arr.length)]; };
  f.chance = function (p) { return f() < p; };
  f.shuffle = function (arr) { var r = arr.slice(); for (var i = r.length - 1; i > 0; i--) { var j = Math.floor(f() * (i + 1)); var t = r[i]; r[i] = r[j]; r[j] = t; } return r; };
  f.sample = function (arr, n) { return f.shuffle(arr).slice(0, n); };
  return f;
};
A.hash = function (s) { var h = 2166136261 >>> 0; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
A.rid = function (n) { var c = 'abcdefghijklmnopqrstuvwxyz0123456789', s = ''; for (var i = 0; i < (n || 6); i++) s += c[Math.floor(Math.random() * c.length)]; return s; };
/* money formatting */
A.fmt = function (n, dec) {
  if (typeof n !== 'number' || !isFinite(n)) return String(n);
  var neg = n < 0; var v = Math.abs(n);
  var s = (dec === undefined ? (Math.abs(v - Math.round(v)) < 0.005 ? 0 : 2) : dec);
  var str = v.toLocaleString('en-US', { minimumFractionDigits: s, maximumFractionDigits: s });
  return (neg ? '-$' : '$') + str;
};
A.num = function (n) { return n.toLocaleString('en-US'); };
A.round2 = function (x) { return Math.round(x * 100) / 100; };
/* canonical JSON (sorted keys) for stable comparisons */
A.canon = function (o) {
  if (o === null || typeof o !== 'object') return JSON.stringify(o);
  if (Array.isArray(o)) return '[' + o.map(A.canon).join(',') + ']';
  return '{' + Object.keys(o).sort().filter(function (k) { return o[k] !== undefined; }).map(function (k) { return JSON.stringify(k) + ':' + A.canon(o[k]); }).join(',') + '}';
};
