/* course.js (engine) — derives everything the engine needs from the course pack's A.COURSE and A.TOPICS.
   A course pack must define A.COURSE (see docs/CONTENT_FORMAT.md) and A.TOPICS before this file loads. */
(function () {
  var C = A.COURSE || {};
  /* ---- tier → features ---- */
  var TIERS = {
    quick: { stations: false, mocks: false, minimocks: false, sample: false, score: false, drills: false, audio: false, ai: false, sync: false, daily: false },
    standard: { stations: true, mocks: true, minimocks: true, sample: true, score: false, drills: false, audio: false, ai: false, sync: false, daily: false },
    full: { stations: true, mocks: true, minimocks: true, sample: true, score: true, drills: true, audio: true, ai: true, sync: true, daily: false }
  };
  C.tier = TIERS[C.tier] ? C.tier : 'standard';
  A.FEAT = Object.assign({}, TIERS[C.tier], C.features || {});
  /* ---- exam ---- */
  C.format = Object.assign({ questions: 40, options: 4, minutes: 50, points: null }, C.format || {});
  var rel = /^\+(\d+(?:\.\d+)?)d$/.exec(C.examAt || '');
  A.EXAM_AT = rel ? (function () { var d = new Date(Date.now() + parseFloat(rel[1]) * 864e5); d.setHours(18, 0, 0, 0); return d.getTime(); })() : (C.examAt ? Date.parse(C.examAt) : Date.now() + 7 * 864e5);
  A.EXAM_TOTAL = C.format.questions;
  /* ---- topics ---- */
  A.TOPIC = {}; (A.TOPICS || []).forEach(function (t, i) { A.TOPIC[t.id] = t; t.order = i; if (t.mins === undefined) t.mins = 10; if (!t.pri) t.pri = 'B'; });
  A.PRI = A.PRI || { A: 1.3, B: 1.0, C: 0.7 };
  C.units = C.units || [];
  A.UNITS = C.units.map(function (u) { return u.id; });
  A.UNIT = {}; C.units.forEach(function (u) { A.UNIT[u.id] = u; });
  A.CHAPTERS = { 0: (C.bootcamp && C.bootcamp.label) || 'Boot camp' };
  C.units.forEach(function (u) { A.CHAPTERS[u.id] = u.short + (u.name ? ' · ' + u.name : ''); });
  A.unitShort = function (id) { return id === 0 ? A.CHAPTERS[0] : (A.UNIT[id] ? A.UNIT[id].short : String(id)); };
  /* score weights: expected exam questions per topic (defaults to the integer blueprint) */
  A.SCORE_W = {};
  A.TOPICS.forEach(function (t) { var w = C.weights && C.weights[t.id] !== undefined ? C.weights[t.id] : t.exam; if (w) A.SCORE_W[t.id] = w; });
  /* storage keys: one prefix per course (each published guide also has its own origin) */
  var pre = C.storageKey || C.id || 'guide';
  A.KEY = function (name) { return pre + '-' + name + '-v1'; };
  /* ---- accent palettes (dark + light values, contrast-checked against the app's surfaces) ---- */
  A.PALETTES = {
    lavender: { dark: ['#C4B5FD', '#A78BFA', '#0B0D10', '#DDD6FE', '#241F38'], light: ['#6D4FD6', '#5B3FC4', '#FFFFFF', '#4C32B0', '#EDE9FE'] },
    teal: { dark: ['#5EEAD4', '#2DD4BF', '#0B0D10', '#99F6E4', '#0F2A2A'], light: ['#0F766E', '#115E59', '#FFFFFF', '#115E59', '#E0F7F4'] },
    sky: { dark: ['#93C5FD', '#60A5FA', '#0B0D10', '#BFDBFE', '#15233A'], light: ['#1D4ED8', '#1E40AF', '#FFFFFF', '#1E40AF', '#E5EEFF'] },
    green: { dark: ['#86EFAC', '#4ADE80', '#0B0D10', '#BBF7D0', '#132A1C'], light: ['#166534', '#14532D', '#FFFFFF', '#166534', '#E3F6E9'] },
    amber: { dark: ['#FCD34D', '#FBBF24', '#0B0D10', '#FDE68A', '#2E2610'], light: ['#8A5306', '#713F12', '#FFFFFF', '#854D0E', '#FBF1D9'] },
    coral: { dark: ['#FDA4AF', '#FB7185', '#0B0D10', '#FECDD3', '#33181D'], light: ['#BE123C', '#9F1239', '#FFFFFF', '#9F1239', '#FCE7EA'] },
    orange: { dark: ['#FDBA74', '#FB923C', '#0B0D10', '#FED7AA', '#33210F'], light: ['#C2410C', '#9A3412', '#FFFFFF', '#9A3412', '#FDEBDD'] },
    slate: { dark: ['#CBD5E1', '#94A3B8', '#0B0D10', '#E2E8F0', '#1E242E'], light: ['#334155', '#1E293B', '#FFFFFF', '#1E293B', '#E9EDF2'] }
  };
  A.accent = A.PALETTES[C.accent] ? C.accent : 'lavender';
  A.applyAccent = function (theme) {
    var p = A.PALETTES[A.accent][theme === 'light' ? 'light' : 'dark'], de = document.documentElement.style;
    de.setProperty('--accent', p[0]); de.setProperty('--accent-h', p[1]); de.setProperty('--on-accent', p[2]); de.setProperty('--ai', p[3]); de.setProperty('--ai-fill', p[4]);
  };
  /* ---- schedule defaults ---- */
  C.schedule = Object.assign({ windows: [['09:00', '12:30'], ['13:30', '17:30'], ['18:30', '23:00']], stopBeforeExam: 45, pace: 1.25 }, C.schedule || {});
  C.storageKey = pre;
})();
