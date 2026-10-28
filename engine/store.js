/* store.js — local-first state, merge, and db sync. */
A.STORAGE_KEY = A.KEY('state');
A.newState = function () {
  return { v: 1, updatedAt: 0, device: A.rid(6), skills: {}, stations: {}, misses: {}, mocks: {}, sample: { unlocked: false, attempts: [] },
    settings: { sound: true, theme: 'dark', phoneNew: false, speed: 1, updatedAt: 0 }, cards: {}, seen: {}, count: 0, streak: { cur: 0, best: 0 }, office: [], pins: {}, firstOpen: Date.now() };
};
A.store = (function () {
  var st = A.newState(), listeners = [], status = 'local', db = null, userId = null, ref = null, writing = false, pending = false, wTimer = null, unsub = null, lastRemoteWrite = 0, lastSerial = '';
  var listenersStatus = [];
  function lsGet() { try { return localStorage.getItem(A.STORAGE_KEY); } catch (e) { return null; } }
  function lsSet(s) { try { localStorage.setItem(A.STORAGE_KEY, s); return true; } catch (e) { return false; } }
  function load() {
    var raw = lsGet();
    if (raw) { try { var o = JSON.parse(raw); if (o && o.v === 1) { st = A.fillState(o); } } catch (e) {} }
    return st;
  }
  function notify() { listeners.forEach(function (f) { try { f(st); } catch (e) { console.error(e); } }); }
  function setStatus(s) { status = s; listenersStatus.forEach(function (f) { try { f(s); } catch (e) {} }); }
  function touch() { st.updatedAt = Date.now(); lsSet(JSON.stringify(st)); scheduleWrite(); }
  function mutate(fn) { fn(st); touch(); notify(); }
  function quiet(fn) { fn(st); touch(); }
  function scheduleWrite(now) {
    if (!ref) return; pending = true;
    clearTimeout(wTimer);
    wTimer = setTimeout(flush, now ? 50 : 20000);
  }
  async function flush() {
    if (!ref || writing || !pending) return;
    var s = A.canon(st); if (s === lastSerial) { pending = false; return; }
    writing = true; pending = false; setStatus('syncing');
    try {
      await ref.set(JSON.parse(s));
      lastSerial = s; setStatus('synced');
    } catch (e) {
      console.warn('sync write failed', e); pending = true; setStatus(e && e.code === 'unavailable' ? 'offline' : 'error');
      clearTimeout(wTimer); wTimer = setTimeout(flush, 30000);
    }
    writing = false;
  }
  async function initSync() {
    try {
      if (!(window.claude && window.claude.use)) { setStatus('local'); return; }
      var dbm = await window.claude.use('db'); var um = await window.claude.use('user');
      if (!dbm || !um) { setStatus('local'); return; }
      var id = await um.id(); if (!id) { setStatus('local'); return; }
      db = dbm; userId = id;
      ref = db.doc('data/users/' + id + '/state');
      setStatus('syncing');
      var first = true;
      unsub = ref.onSnapshot(function (snap) {
        if (snap.hasPendingWrites || (snap.metadata && snap.metadata.hasPendingWrites)) return;
        if (snap.exists) {
          var remote = snap.data();
          var merged = A.mergeState(st, remote);
          var changed = A.canon(merged) !== A.canon(st);
          if (changed) { st = merged; lsSet(JSON.stringify(st)); notify(); }
          var ms = A.canon(merged);
          if (ms !== A.canon(remote)) scheduleWrite(first); else { lastSerial = ms; setStatus('synced'); }
        } else { scheduleWrite(true); }
        first = false;
      }, function (e) { console.warn('snapshot error', e); setStatus(e && e.code === 'revoked' ? 'local' : 'offline'); });
    } catch (e) { console.warn('sync init failed', e); setStatus('local'); }
  }
  async function writeRound(id, data) {
    if (!ref) return false;
    try { await ref.collection('rounds').doc(id).set(data); return true; } catch (e) { console.warn('round write failed', e); return false; }
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden && ref) { clearTimeout(wTimer); flush(); } });
  window.addEventListener('pagehide', function () { if (ref) flush(); });
  return {
    get state() { return st; }, load: load, mutate: mutate, quiet: quiet, notify: notify, initSync: initSync, flushNow: function () { clearTimeout(wTimer); return flush(); },
    onChange: function (f) { listeners.push(f); }, onStatus: function (f) { listenersStatus.push(f); f(status); }, get status() { return status; },
    writeRound: writeRound, replace: function (s) { st = A.fillState(s); lsSet(JSON.stringify(st)); scheduleWrite(true); notify(); },
    get hasSync() { return !!ref; }
  };
})();
A.fillState = function (o) {
  var d = A.newState(); Object.keys(d).forEach(function (k) { if (o[k] === undefined) o[k] = d[k]; });
  ['sound', 'theme', 'phoneNew', 'speed'].forEach(function (k) { if (o.settings[k] === undefined) o.settings[k] = d.settings[k]; });
  return o;
};
/* ---- merge two states (commutative enough; mastery is derived) ---- */
A.mergeState = function (a, b) {
  a = A.fillState(JSON.parse(JSON.stringify(a))); b = A.fillState(JSON.parse(JSON.stringify(b)));
  var out = a.updatedAt >= b.updatedAt ? a : b; var other = out === a ? b : a;
  var res = JSON.parse(JSON.stringify(out));
  // skills
  var ks = {}; Object.keys(a.skills).concat(Object.keys(b.skills)).forEach(function (k) { ks[k] = 1; });
  res.skills = {};
  Object.keys(ks).forEach(function (k) {
    var sa = a.skills[k] || { a: [], seen: 0 }, sb = b.skills[k] || { a: [], seen: 0 }, map = {};
    sa.a.concat(sb.a).forEach(function (x) { map[x[0] + '|' + x[1]] = x; });
    var arr = Object.keys(map).map(function (q) { return map[q]; }).sort(function (x, y) { return y[1] - x[1]; }).slice(0, 8);
    res.skills[k] = { a: arr, seen: Math.max(sa.seen || 0, sb.seen || 0) };
  });
  // stations: furthest step
  var sts = {}; Object.keys(a.stations).concat(Object.keys(b.stations)).forEach(function (k) { sts[k] = 1; });
  res.stations = {};
  Object.keys(sts).forEach(function (k) {
    var x = a.stations[k], y = b.stations[k];
    if (!x) res.stations[k] = y; else if (!y) res.stations[k] = x;
    else { var win = (x.step || 0) > (y.step || 0) ? x : ((y.step || 0) > (x.step || 0) ? y : ((x.at || 0) >= (y.at || 0) ? x : y)); res.stations[k] = win; }
  });
  // misses: latest change wins (tombstones keep resolved ones from resurrecting)
  var ms = {}; Object.keys(a.misses).concat(Object.keys(b.misses)).forEach(function (k) { ms[k] = 1; });
  res.misses = {};
  Object.keys(ms).forEach(function (k) {
    var x = a.misses[k], y = b.misses[k];
    if (!x) res.misses[k] = y; else if (!y) res.misses[k] = x;
    else res.misses[k] = ((x.at || 0) > (y.at || 0)) ? x : (((y.at || 0) > (x.at || 0)) ? y : ((x.streak || 0) >= (y.streak || 0) ? x : y));
  });
  // mocks: submitted wins, else later updatedAt
  var mk = {}; Object.keys(a.mocks).concat(Object.keys(b.mocks)).forEach(function (k) { mk[k] = 1; });
  res.mocks = {};
  Object.keys(mk).forEach(function (k) {
    var x = a.mocks[k], y = b.mocks[k];
    if (!x) res.mocks[k] = y; else if (!y) res.mocks[k] = x;
    else if (x.submittedAt && !y.submittedAt) res.mocks[k] = x; else if (y.submittedAt && !x.submittedAt) res.mocks[k] = y;
    else res.mocks[k] = ((x.updatedAt || 0) >= (y.updatedAt || 0)) ? x : y;
  });
  // sample
  var sm = {}; (a.sample.attempts || []).concat(b.sample.attempts || []).forEach(function (x) { sm[x.id] = x; });
  res.sample = { unlocked: !!(a.sample.unlocked || b.sample.unlocked), attempts: Object.keys(sm).map(function (k) { return sm[k]; }).sort(function (x, y) { return x.at - y.at; }) };
  // cards
  var cs = {}; Object.keys(a.cards).concat(Object.keys(b.cards)).forEach(function (k) { cs[k] = 1; });
  res.cards = {}; Object.keys(cs).forEach(function (k) { var x = a.cards[k], y = b.cards[k]; res.cards[k] = !x ? y : (!y ? x : ((x.at || 0) >= (y.at || 0) ? x : y)); });
  // seen
  var se = {}; Object.keys(a.seen).concat(Object.keys(b.seen)).forEach(function (k) { se[k] = Math.max(a.seen[k] || 0, b.seen[k] || 0); });
  res.seen = se;
  res.count = Math.max(a.count || 0, b.count || 0);
  res.streak = { cur: out.streak.cur, best: Math.max(a.streak.best || 0, b.streak.best || 0) };
  var of = {}; (a.office || []).concat(b.office || []).forEach(function (x) { of[x.q] = x; }); res.office = Object.keys(of).map(function (k) { return of[k]; });
  res.pins = Object.assign({}, other.pins, out.pins);
  res.firstOpen = Math.min(a.firstOpen || Date.now(), b.firstOpen || Date.now());
  res.updatedAt = Math.max(a.updatedAt, b.updatedAt);
  res.device = a.device;
  return res;
};
