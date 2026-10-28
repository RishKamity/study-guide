/* listen.js — Listen tab and the fixed bottom player. MP3s ship beside the page (audio/<id>.mp3);
   if one fails to load, that track is read with the device voice (speechSynthesis). */
(function () {
  var h = U.h, SPEEDS = [0.8, 1, 1.25, 1.5, 1.75, 2], LSK = A.KEY('audio');
  var mem = { pos: {}, played: {}, speed: 1 };
  try { var raw = localStorage.getItem(LSK); if (raw) { var o = JSON.parse(raw); if (o && typeof o === 'object') mem = Object.assign(mem, o); } } catch (e) {}
  function save() { try { localStorage.setItem(LSK, JSON.stringify(mem)); } catch (e) {} }
  var P = { id: null, audio: null, bar: null, els: {}, fallback: false, utter: null, lastSave: 0, listeners: [] };
  function track(id) { var l = A.AUDIO || []; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function idx(id) { var l = A.AUDIO || []; for (var i = 0; i < l.length; i++) if (l[i].id === id) return i; return -1; }
  function fmt(s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function practiceTopic(id) { return A.TOPIC[id] && A.topicSkillIds(id).length ? id : null; }

  function ensure() {
    if (P.bar) return;
    var a = new Audio(); a.preload = 'none'; P.audio = a;
    var els = P.els = {};
    els.title = h('div', { class: 'ptitle' }); els.sub = h('div', { class: 'psub' });
    els.play = h('button', { class: 'pbtn main', type: 'button', 'aria-label': 'Play or pause', onclick: toggle }, '▶');
    els.back = h('button', { class: 'pbtn', type: 'button', 'aria-label': 'Back 15 seconds', onclick: function () { seek(-15); } }, '↺15');
    els.next = h('button', { class: 'pbtn', type: 'button', 'aria-label': 'Next track', onclick: function () { step(1); } }, '⏭');
    els.speed = h('button', { class: 'pbtn sp', type: 'button', 'aria-label': 'Playback speed', onclick: cycleSpeed }, mem.speed + '×');
    els.close = h('button', { class: 'pbtn', type: 'button', 'aria-label': 'Close player', onclick: closePlayer }, '✕');
    els.bar = h('input', { type: 'range', min: 0, max: 1000, value: 0, 'aria-label': 'Position', class: 'pseek', oninput: function () { if (P.fallback || !a.duration) return; a.currentTime = a.duration * (els.bar.value / 1000); } });
    els.time = h('div', { class: 'ptime' }, '0:00');
    els.practice = h('button', { class: 'btn sm', type: 'button', hidden: true, onclick: function () { var t = practiceTopic(P.id); if (t) U.go('session', { title: A.TOPIC[t].title, topics: [t], noFilter: true }); } }, 'Practice set');
    els.note = h('div', { class: 'pnote', hidden: true });
    P.bar = h('div', { class: 'player', role: 'region', 'aria-label': 'Audio player' }, h('div', { class: 'pinfo' }, h('div', { class: 'ptxt' }, els.title, els.sub), els.practice), els.bar, h('div', { class: 'prow' }, els.time, els.back, els.play, els.next, els.speed, els.close), els.note);
    P.bar.hidden = true; document.body.appendChild(P.bar);
    a.addEventListener('timeupdate', function () {
      if (!a.duration) return; els.bar.value = Math.round(1000 * a.currentTime / a.duration); els.time.textContent = fmt(a.currentTime) + ' / ' + fmt(a.duration);
      var now = Date.now(); if (now - P.lastSave > 3000) { P.lastSave = now; mem.pos[P.id] = a.currentTime; save(); }
    });
    a.addEventListener('play', paintPlay); a.addEventListener('pause', paintPlay);
    a.addEventListener('ended', function () { markPlayed(P.id); delete mem.pos[P.id]; save(); paintPlay(); step(1, true); });
    a.addEventListener('error', function () { if (P.id) useFallback(); });
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', function () { if (P.fallback) fbPlay(); else a.play(); });
        navigator.mediaSession.setActionHandler('pause', function () { if (P.fallback) fbPause(); else a.pause(); });
        navigator.mediaSession.setActionHandler('seekbackward', function () { seek(-15); });
        navigator.mediaSession.setActionHandler('seekforward', function () { seek(15); });
        navigator.mediaSession.setActionHandler('nexttrack', function () { step(1); });
        navigator.mediaSession.setActionHandler('previoustrack', function () { step(-1); });
      } catch (e) {}
    }
    document.addEventListener('keydown', function (e) { if (!P.bar || P.bar.hidden) return; var tag = e.target && e.target.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return; if (e.key === 'k' && !U.keyFn) toggle(); });
  }
  function markPlayed(id) { mem.played[id] = Date.now(); save(); notify(); }
  function notify() { P.listeners.forEach(function (f) { try { f(); } catch (e) {} }); }
  function paintPlay() { var playing = P.fallback ? !!(window.speechSynthesis && speechSynthesis.speaking && !speechSynthesis.paused) : !P.audio.paused; P.els.play.textContent = playing ? '❚❚' : '▶'; P.els.play.setAttribute('aria-pressed', playing ? 'true' : 'false'); notify(); }
  function toggle() { if (P.fallback) { if (window.speechSynthesis && speechSynthesis.speaking && !speechSynthesis.paused) fbPause(); else fbPlay(); return; } if (!P.id) return; if (P.audio.paused) P.audio.play().catch(function () { useFallback(); }); else P.audio.pause(); }
  function seek(d) { if (P.fallback || !P.audio.duration) return; P.audio.currentTime = Math.max(0, Math.min(P.audio.duration - 0.5, P.audio.currentTime + d)); }
  function cycleSpeed() { var i = SPEEDS.indexOf(mem.speed); mem.speed = SPEEDS[(i + 1) % SPEEDS.length]; P.audio.playbackRate = mem.speed; P.els.speed.textContent = mem.speed + '×'; save(); if (P.fallback && window.speechSynthesis && speechSynthesis.speaking) { var id = P.id; fbStop(); fbPlay(); } }
  function step(d, auto) { var l = A.AUDIO || [], i = idx(P.id) + d; if (i < 0 || i >= l.length) { if (auto) { paintPlay(); } return; } play(l[i].id, auto); }
  function closePlayer() { try { P.audio.pause(); } catch (e) {} fbStop(); P.fallback = false; P.bar.hidden = true; document.body.classList.remove('hasplayer'); P.id = null; notify(); }
  /* ---- device-voice fallback ---- */
  function fbStop() { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} P.utter = null; }
  function fbPlay() {
    var t = track(P.id); if (!t || !window.speechSynthesis) { P.els.note.hidden = false; P.els.note.textContent = 'Audio is not available on this device.'; return; }
    if (speechSynthesis.paused) { speechSynthesis.resume(); paintPlay(); return; }
    speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(t.spoken); u.rate = Math.min(mem.speed, 1.6); u.onend = function () { P.utter = null; markPlayed(P.id); paintPlay(); }; u.onerror = function () { paintPlay(); };
    P.utter = u; speechSynthesis.speak(u); setTimeout(paintPlay, 100);
  }
  function fbPause() { try { speechSynthesis.pause(); } catch (e) {} paintPlay(); }
  function useFallback() {
    if (P.fallback) return; P.fallback = true; P.els.note.hidden = false; P.els.note.textContent = 'Audio file unavailable. Reading with your device voice.'; P.els.bar.disabled = true; P.els.back.disabled = true;
    fbPlay();
  }
  function play(id, auto) {
    ensure(); var t = track(id); if (!t) return; fbStop(); P.fallback = false; P.els.bar.disabled = false; P.els.back.disabled = false; P.els.note.hidden = true; P.id = id;
    var a = P.audio; a.src = 'audio/' + id + '.mp3'; a.playbackRate = mem.speed; a.preload = 'auto';
    var pos = mem.pos[id] || 0; if (pos > 3) a.addEventListener('loadedmetadata', function f() { a.removeEventListener('loadedmetadata', f); if (a.duration && pos < a.duration - 5) a.currentTime = pos; });
    P.els.title.textContent = t.id + ' · ' + t.title; P.els.sub.textContent = t.group + ' · ' + fmt(t.dur); P.els.bar.value = 0; P.els.time.textContent = '0:00 / ' + fmt(t.dur);
    var pt = practiceTopic(id); P.els.practice.hidden = !pt; P.bar.hidden = false; document.body.classList.add('hasplayer');
    if ('mediaSession' in navigator && window.MediaMetadata) { try { navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: A.COURSE.title, album: t.group }); } catch (e) {} }
    var pr = a.play(); if (pr && pr.catch) pr.catch(function (e) { if (e && e.name === 'NotAllowedError') { paintPlay(); } else useFallback(); });
    notify();
  }
  U.listenPlay = play;

  U.views.listen = { tab: 'listen', hash: 'listen', render: function (main) {
    var list = h('div', { class: 'stack' }), L = A.AUDIO || [], open = {};
    function chip(t) {
      var st = A.store.state, practiced = A.TOPIC[t.id] && A.topicStat(t.id, st).n > 0, played = !!mem.played[t.id];
      return h('span', { class: 'pill ' + (practiced ? 'solid' : played ? 'shaky' : '') }, practiced ? 'practiced' : played ? 'played' : 'not started');
    }
    function paint() {
      U.clear(list); var group = null, total = 0; L.forEach(function (t) { total += t.dur; });
      L.forEach(function (t) {
        if (t.group !== group) { group = t.group; list.appendChild(h('div', { class: 'eyebrow', style: { marginTop: '8px' } }, group)); }
        var playing = P.id === t.id && P.bar && !P.bar.hidden && (P.fallback ? true : !P.audio.paused);
        var row = h('div', { class: 'card trk' + (P.id === t.id ? ' cur' : '') },
          h('div', { class: 'row', style: { justifyContent: 'space-between', gap: '10px', flexWrap: 'nowrap' } },
            h('button', { class: 'tplay', type: 'button', 'aria-label': (playing ? 'Pause ' : 'Play ') + t.title, onclick: function () { if (P.id === t.id) toggle(); else play(t.id); } }, playing ? '❚❚' : '▶'),
            h('div', { class: 'tinfo' }, h('div', { class: 'ttl' }, t.id + ' · ' + t.title), h('div', { class: 'small muted' }, fmt(t.dur), ' ', chip(t)))),
          h('details', { class: 'small', open: open[t.id] ? true : null, ontoggle: function (e) { open[t.id] = e.target.open; } }, h('summary', { class: 'muted' }, 'Transcript'), h('div', { class: 'stack', style: { marginTop: '6px' } }, t.raw.map(function (p) { return h('p', { style: { margin: 0 } }, p); }))));
        list.appendChild(row);
      });
      hdr.textContent = L.length + ' tracks, about ' + Math.round(total / 60) + ' minutes. Listen, then do the practice set.';
    }
    var hdr = h('p', { class: 'muted' });
    main.appendChild(h('div', { class: 'stack' }, h('h1', { class: 'h1' }, 'Listen'), hdr, L.length ? list : h('div', { class: 'card' }, 'Audio is not available in this build.')));
    if (L.length) { paint(); P.listeners.push(paint); }
    return function () { var i = P.listeners.indexOf(paint); if (i >= 0) P.listeners.splice(i, 1); };
  } };
})();
