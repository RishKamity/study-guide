/* schedule.js — auto-replanning study schedule.
   Every render re-plans from "now" through the exam: study windows (course.schedule.windows, local time) are filled
   with the remaining sequence. If it does not fit, low-weight topics are shortened ("skim": practice only) and then
   dropped, never the dress rehearsal. Nothing is ever "behind": the plan simply adapts. */
(function () {
  var C = A.COURSE, S = C.schedule;
  function hm(s) { var p = String(s).split(':'); return [parseInt(p[0], 10) || 0, parseInt(p[1], 10) || 0]; }
  A.fmtWhen = function (t, withDay) {
    var d = new Date(t), now = new Date(), o = { hour: 'numeric', minute: '2-digit' };
    var sameDay = d.toDateString() === now.toDateString();
    return (withDay !== false && !sameDay ? d.toLocaleDateString([], { weekday: 'short' }) + ' ' : '') + d.toLocaleTimeString([], o);
  };
  A.stopAt = function () { return A.EXAM_AT - (S.stopBeforeExam || 0) * 60000; };
  /* study windows between now and the stop time */
  A.windows = function (now) {
    now = now || Date.now(); var stop = A.stopAt(), out = [];
    var d0 = new Date(now); d0.setHours(0, 0, 0, 0); d0.setDate(d0.getDate() - 1);
    for (var day = 0; day < 60; day++) {
      var base = new Date(d0); base.setDate(d0.getDate() + day); if (base.getTime() > stop) break;
      S.windows.forEach(function (w) {
        var a = hm(w[0]), b = hm(w[1]), s = new Date(base), e = new Date(base);
        s.setHours(a[0], a[1], 0, 0); e.setHours(b[0], b[1], 0, 0); if (e <= s) e.setDate(e.getDate() + 1);
        var st = s.getTime(), en = Math.min(e.getTime(), stop);
        if (en > now && st < stop && en > st) out.push({ start: Math.max(st, now), end: en, planned: [st, e.getTime()] });
      });
    }
    out.sort(function (x, y) { return x.start - y.start; });
    /* studying outside a window during the day: treat the next 90 minutes as an extra session */
    var hr = new Date(now).getHours(), inWin = out.length && out[0].start <= now;
    if (!inWin && hr >= 7 && hr < 23 && now < stop) {
      var endX = Math.min(now + 90 * 60000, out.length ? out[0].start : stop, stop);
      if (endX - now > 10 * 60000) out.unshift({ start: now, end: endX, extra: true });
    }
    return out;
  };
  function weightOf(it) { return it.id && A.SCORE_W[it.id] !== undefined ? A.SCORE_W[it.id] : (it.type === 'minimock' ? 1.5 : 1); }
  A.plan = function (now, st) {
    now = now || Date.now(); st = st || A.store.state; var pace = S.pace || 1.25;
    var skimmed = (st.settings && st.settings.skimmed) || {};
    var todo = A.SEQ.filter(function (it) { return !it.optional && A.isAvail(it) && !A.seqDone(it, st); }).map(function (it) {
      var started = it.type === 'station' && A.stationStarted(it.id, st);
      return { item: it, cost: it.mins * pace * (skimmed[it.id] ? 0.4 : 1), skim: !!skimmed[it.id], drop: false, started: started };
    });
    var wins = A.windows(now), cap = wins.reduce(function (s, w) { return s + (w.end - w.start) / 60000; }, 0);
    var need = function () { return todo.reduce(function (s, x) { return s + (x.drop ? 0 : x.cost); }, 0); };
    var trimmed = [];
    if (need() > cap) {
      /* 1) optional-ish review items, 2) shorten low-weight lessons, 3) drop low-weight lessons. Never the dress rehearsal. */
      var order = ['weak', 'misses'];
      order.forEach(function (ty) { todo.forEach(function (x) { if (need() > cap && x.item.type === ty && !x.drop) { x.drop = true; trimmed.push(x); } }); });
      var lessons = todo.filter(function (x) { return (x.item.type === 'station' || x.item.type === 'drill') && !x.started; }).sort(function (a, b) { return weightOf(a.item) - weightOf(b.item); });
      lessons.forEach(function (x) { if (need() > cap && !x.skim && x.item.type === 'station') { x.skim = true; x.cost *= 0.4; trimmed.push(x); } });
      todo.filter(function (x) { return x.item.type === 'minimock'; }).forEach(function (x) { if (need() > cap && !x.drop) { x.drop = true; trimmed.push(x); } });
      lessons.forEach(function (x) { if (need() > cap && !x.drop) { x.drop = true; if (trimmed.indexOf(x) < 0) trimmed.push(x); } });
    }
    /* lay items into windows in order */
    var slots = [], wi = 0, t = wins.length ? wins[0].start : now;
    todo.forEach(function (x) {
      if (x.drop) return; var left = x.cost * 60000, start = null;
      while (left > 0 && wi < wins.length) {
        var w = wins[wi]; if (t < w.start) t = w.start;
        if (start === null) start = t; var room = w.end - t, use = Math.min(room, left); t += use; left -= use;
        if (left > 0) { wi++; }
      }
      slots.push({ item: x.item, start: start === null ? null : start, end: left > 0 ? null : t, skim: x.skim, late: left > 0 });
    });
    var cur = null, next = null; wins.forEach(function (w) { if (!cur && w.start <= now && w.end > now) cur = w; else if (!next && w.start > now) next = w; });
    var last = slots.length ? slots[slots.length - 1] : null;
    return { slots: slots, trimmed: trimmed, windows: wins, cur: cur, next: next, cap: cap, need: need(), fits: need() <= cap, finishAt: last && last.end, stop: A.stopAt(),
      slotOf: function (it) { for (var i = 0; i < slots.length; i++) if (slots[i].item === it) return slots[i]; return null; },
      trimOf: function (it) { for (var i = 0; i < trimmed.length; i++) if (trimmed[i].item === it) return trimmed[i]; return null; } };
  };
  /* remember a skim so the plan does not oscillate once the student starts it */
  A.markSkim = function (id) { A.store.mutate(function (s) { s.settings.skimmed = s.settings.skimmed || {}; s.settings.skimmed[id] = 1; s.settings.updatedAt = Date.now(); }); };
})();
