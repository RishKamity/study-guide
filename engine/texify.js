/* texify.js — optional: turn plain-text math written with Unicode (x², √(x + 1), e⁻²ˣ, f′(x), lim h→0, a/b) into
   LaTeX between $…$ so the page can typeset it with KaTeX. Turned on by A.COURSE.math === 'auto'.
   Runs once after the course pack loads: it rewrites the pack's lessons, banks, sample exam, sheet, twins and T/F,
   and wraps A.makeItem so generated questions (stem, options, why, rule, work, table) are converted too.
   Strings that already contain $ are left alone, so a pack can write LaTeX by hand wherever it prefers. */
(function () {
  var SUP = { 'ʸ': 'y', '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-', 'ˣ': 'x', 'ⁿ': 'n', 'ᵗ': 't', 'ʳ': 'r', 'ᵏ': 'k', '⁽': '(', '⁾': ')' };
  var SUB = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
  var SYM = { '−': '-', '·': ' \\cdot ', '×': ' \\times ', '→': ' \\to ', '⇒': ' \\Rightarrow ', '⇔': ' \\Leftrightarrow ', '⇏': ' \\not\\Rightarrow ', '≤': ' \\le ', '≥': ' \\ge ', '≠': ' \\ne ', '±': ' \\pm ', '∪': ' \\cup ', '∩': ' \\cap ', '≈': ' \\approx ', '∞': '\\infty ', 'π': '\\pi ', 'ℝ': '\\mathbb{R}', '…': '\\ldots ', '<': ' < ', '>': ' > ', '=': ' = ', '+': ' + ', '%': '\\%' };
  var FN = ['arcsin', 'arccos', 'arctan', 'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'ln', 'log', 'lim', 'exp', 'max', 'min', 'deg'];
  var UNITS = { ft: 1, in: 1, cm: 1, mph: 1, mi: 1, m: 0 };
  var EN2 = { of: 1, to: 1, in: 1, on: 1, at: 1, is: 1, it: 1, an: 1, as: 1, be: 1, by: 1, do: 1, go: 1, if: 1, no: 1, or: 1, so: 1, up: 1, we: 1, us: 1, me: 1, my: 1, he: 1, am: 1, ok: 1, vs: 1, ie: 1, eg: 1, Ok: 1, No: 1, If: 1, So: 1, On: 1, At: 1, In: 1, Is: 1, It: 1, An: 1, As: 1, By: 1, Do: 1, To: 1, Of: 1, Up: 1, Or: 1 };
  var SUPC = '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ˣⁿᵗʳᵏʸ', SUBC = '₀₁₂₃₄₅₆₇₈₉';
  var OPS = '+−=·×→⇒⇔⇏≤≥≠±∪∩≈<>,;:|';

  /* ---------- math run → LaTeX ---------- */
  function isSup(c) { return SUPC.indexOf(c) >= 0; }
  function isSub(c) { return SUBC.indexOf(c) >= 0; }
  /* atoms: {k:'grp', o, c, kids}, {k:'word', v}, {k:'num', v}, {k:'op', v}, {k:'sp'}, {k:'slash'}, {k:'fn', v}, {k:'sym', v}, {k:'root', n}, {k:'caret'}, {k:'under'}
     every atom may carry sup (string of LaTeX), sub, prime */
  function lex(s, i, close) {
    var out = [];
    while (i < s.length) {
      var c = s[i];
      if (close && (c === close || ((c === ')' || c === ']') && (close === ')' || close === ']')))) return { atoms: out, i: i + 1, closer: c };   /* [0, ∞) and (a, b] close either way */
      if (c === '(' || c === '[' || c === '{') { var cl = { '(': ')', '[': ']', '{': '}' }[c], r = lex(s, i + 1, cl); out.push({ k: 'grp', o: c, c: r.closer || cl, kids: r.atoms }); i = r.i; continue; }
      if (c === ')' || c === ']' || c === '}') { out.push({ k: 'sym', v: c }); i++; continue; }
      if (c === ' ') { if (!out.length || out[out.length - 1].k !== 'sp') out.push({ k: 'sp' }); i++; continue; }
      if (isSup(c)) { var t = ''; while (i < s.length && isSup(s[i])) { t += SUP[s[i]]; i++; } attach(out, 'sup', t); continue; }
      if (isSub(c)) { var u = ''; while (i < s.length && isSub(s[i])) { u += SUB[s[i]]; i++; } attach(out, 'sub', u); continue; }
      if (c === '′' || c === '″' || c === "'") { attach(out, 'prime', c === '″' ? "''" : "'"); i++; continue; }
      if (c === '/') { out.push({ k: 'slash' }); i++; continue; }
      if (c === '^') { out.push({ k: 'caret' }); i++; continue; }
      if (c === '_') { out.push({ k: 'under' }); i++; continue; }
      if (c === '√' || c === '∛') { out.push({ k: 'root', n: c === '∛' ? 3 : 2 }); i++; continue; }
      if (/[0-9.]/.test(c)) { var nm = ''; while (i < s.length && /[0-9.]/.test(s[i])) { nm += s[i]; i++; } out.push({ k: 'num', v: nm }); continue; }
      if (/[A-Za-z]/.test(c)) {
        var w = ''; while (i < s.length && /[A-Za-z]/.test(s[i])) { w += s[i]; i++; }
        /* split a word into function names and single letters: "sinx" is rare; "xy", "fg", "dx" stay letters */
        var f = null; for (var q = 0; q < FN.length; q++) if (w.indexOf(FN[q]) === 0) { f = FN[q]; break; }
        if (f && (w === f)) { out.push({ k: 'fn', v: f }); continue; }
        if (f && w.length > f.length && /[(²³⁻]/.test(s[i] || '')) { out.push({ k: 'fn', v: f }); out.push({ k: 'word', v: w.slice(f.length) }); continue; }
        out.push({ k: 'word', v: w }); continue;
      }
      if (OPS.indexOf(c) >= 0) { out.push({ k: 'op', v: c }); i++; continue; }
      out.push({ k: 'sym', v: c }); i++;
    }
    return { atoms: out, i: i };
  }
  function attach(out, key, val) {
    var a = out[out.length - 1];
    if (!a || a.k === 'sp' || a.k === 'op') { out.push({ k: 'sym', v: '' }); a = out[out.length - 1]; }
    a[key] = (a[key] || '') + val;
  }
  function supTex(t) { return t.replace(/-/g, '-'); }
  function wrapAttach(a, body) {
    var s = body;
    if (a.prime) s += a.prime;
    if (a.sub) s += '_{' + a.sub + '}';
    if (a.sup) s += '^{' + supTex(a.sup) + '}';
    return s;
  }
  function isBreak(a) { return !a || a.k === 'sp' || a.k === 'op'; }
  function hasFrac(atoms) { return atoms.some(function (a) { return a.k === 'slash' || (a.k === 'grp' && hasFrac(a.kids)); }); }
  /* emit a list of atoms */
  function emit(atoms) {
    var chunks = [];            /* {tex, brk} */
    for (var i = 0; i < atoms.length; i++) {
      var a = atoms[i];
      if (a.k === 'slash') {
        var L = []; while (chunks.length && !chunks[chunks.length - 1].brk) L.unshift(chunks.pop());
        /* "cos x/sin x": a function name and its space belong to the left operand */
        if (L.length && chunks.length >= 2 && chunks[chunks.length - 1].tex === ' ' && chunks[chunks.length - 2].fn) { L.unshift(chunks.pop()); L.unshift(chunks.pop()); }
        var R = [], j = i + 1;
        if (atoms[j] && atoms[j].k === 'op' && atoms[j].v === '−' && atoms[j + 1] && !isBreak(atoms[j + 1])) { R.push(atoms[j]); j++; }   /* ∞/−∞ */
        while (j < atoms.length && !isBreak(atoms[j])) {
          if (R.length && atoms[j].k === 'grp' && atoms[j].o === '[') break;
          if (R.length === 1 && R[0].k === 'word' && /^d[a-z]$/.test(R[0].v) && atoms[j].k === 'grp') break;   /* d/dx(…) */
          R.push(atoms[j]); j++;
          if (atoms[j - 1].k === 'fn' && atoms[j] && atoms[j].k === 'sp' && atoms[j + 1] && (atoms[j + 1].k === 'word' || atoms[j + 1].k === 'num')) { R.push(atoms[j]); R.push(atoms[j + 1]); j += 2; }
        }
        if (!L.length || !R.length) { L.forEach(function (c) { chunks.push(c); }); chunks.push({ tex: '/', brk: false }); continue; }
        var lt = L.length === 1 && L[0].strip !== undefined ? L[0].strip : L.map(function (c) { return c.tex; }).join('');
        var rt = R.length === 1 && R[0].k === 'grp' && R[0].o === '(' && !R[0].sup && !R[0].prime ? emit(R[0].kids) : emit(R);
        chunks.push({ tex: '\\frac{' + lt + '}{' + rt + '}', brk: false }); i = j - 1; continue;
      }
      if (a.k === 'sp') { chunks.push({ tex: ' ', brk: true }); continue; }
      if (a.k === 'op') { chunks.push({ tex: (SYM[a.v] !== undefined ? SYM[a.v] : a.v === '|' ? '|' : a.v), brk: a.v !== '|' }); continue; }
      if (a.k === 'grp') {
        var inner = emit(a.kids), tall = hasFrac(a.kids), o = a.o === '{' ? '\\{' : a.o, cl = a.c === '}' ? '\\}' : a.c;
        var body = tall ? '\\left' + o + inner + '\\right' + cl : o + inner + cl;
        /* "(1/2)x", "(−3/4)": a group holding only a numeric fraction drops its parentheses */
        var ks = a.kids.filter(function (z) { return z.k !== 'sp'; });
        if (a.o === '(' && a.c === ')' && !a.sup && !a.prime && (i === 0 || isBreak(atoms[i - 1])) && ks.length >= 3 && ks.length <= 4 && (ks.length === 3 || (ks[0].k === 'op' && ks[0].v === '−')) && ks[ks.length - 3].k === 'num' && ks[ks.length - 2].k === 'slash' && ks[ks.length - 1].k === 'num') body = inner;
        /* "y = √x (x > 0)": a spaced, parenthesized condition is a side note, not a product */
        if (a.o === '(' && i >= 2 && atoms[i - 1].k === 'sp' && a.kids.some(function (z) { return z.k === 'op' && '<>≤≥≠'.indexOf(z.v) >= 0; })) body = '\\quad ' + body;
        chunks.push({ tex: wrapAttach(a, body), brk: false, strip: (a.o === '(' && !a.sup && !a.prime && !a.sub) ? inner : undefined }); continue;
      }
      if (a.k === 'root') {
        var nx = atoms[i + 1]; if (!nx || isBreak(nx)) { chunks.push({ tex: '\\sqrt{\\;}', brk: false }); continue; }
        var arg = nx.k === 'grp' && nx.o === '(' ? emit(nx.kids) : emit([Object.assign({}, nx, { sup: '', prime: '', sub: '' })]);
        var rt2 = (a.n === 3 ? '\\sqrt[3]{' : '\\sqrt{') + arg + '}';
        chunks.push({ tex: wrapAttach(nx, rt2), brk: false }); i++; continue;
      }
      if (a.k === 'caret' || a.k === 'under') {
        var nx2 = atoms[i + 1]; if (!nx2 || isBreak(nx2)) { chunks.push({ tex: a.k === 'caret' ? '\\hat{}' : '\\_', brk: false }); continue; }
        var exA = [nx2]; if ((nx2.k === 'fn' || nx2.k === 'word') && atoms[i + 2] && atoms[i + 2].k === 'grp' && !nx2.sup) { exA.push(atoms[i + 2]); }
        var ex = nx2.k === 'grp' && nx2.o === '(' ? emit(nx2.kids) : emit(exA);
        /* fractions in an exponent stay inline (e^{−1/x}): a stacked fraction there is too small to read */
        ex = ex.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, function (_, a, b) { var w = function (t) { return /[\s+\-]/.test(t.replace(/^-/, '')) ? '(' + t + ')' : t; }; return w(a) + '/' + w(b); });
        if (exA.length > 1) i++;
        var prev = chunks.length ? chunks[chunks.length - 1] : null;
        if (prev && !prev.brk) prev.tex = '{' + prev.tex + '}';
        chunks.push({ tex: (a.k === 'caret' ? '^{' : '_{') + ex + '}', brk: false }); i++; continue;
      }
      if (a.k === 'fn') {
        if (a.v === 'lim') {
          /* lim h→0⁺ …: the next space-separated piece is the subscript when it has an arrow */
          var k = i + 1; if (atoms[k] && atoms[k].k === 'sp') k++;
          var subA = []; while (k < atoms.length && !(atoms[k].k === 'sp')) { subA.push(atoms[k]); k++; }
          if (subA.some(function (z) { return z.k === 'op' && z.v === '→'; })) { chunks.push({ tex: '\\lim_{' + emit(subA).replace(/\s+/g, ' ').trim() + '}', brk: false }); i = k - 1; continue; }
          chunks.push({ tex: '\\lim ', brk: true }); continue;
        }
        var ft = '\\' + a.v;
        chunks.push({ tex: wrapAttach(a, ft) + (atoms[i + 1] && atoms[i + 1].k === 'word' ? ' ' : ''), brk: false, fn: true }); continue;
      }
      if (a.k === 'word') {
        var wv = UNITS[a.v] ? '\\,\\text{' + a.v + '}' : (/^(DNE|IVT|MVT|EVT)$/.test(a.v) ? '\\text{' + a.v + '}' : a.v);
        chunks.push({ tex: wrapAttach(a, wv), brk: false }); continue;
      }
      if (a.k === 'num') { chunks.push({ tex: wrapAttach(a, a.v), brk: false }); continue; }
      /* sym */
      var sv = SYM[a.v] !== undefined ? SYM[a.v] : a.v;
      if (sv === '#' || sv === '&' || sv === '$') sv = '\\' + sv;
      chunks.push({ tex: wrapAttach(a, sv), brk: false });
    }
    return chunks.map(function (c) { return c.tex; }).join('').replace(/\s+/g, ' ').trim();
  }
  A.mathTex = function (s) { s = s.replace(/\s*\/\s*/g, '/'); return emit(lex(s, 0, null).atoms); };
  /* split a run at parentheses that are opened or closed outside it: those stay in the prose */
  function pieces(txt) {
    var depth = 0, bad = {}, opens = [];
    for (var q = 0; q < txt.length; q++) { var c = txt[q]; if (c === '(' || c === '[') opens.push(q); else if (c === ')' || c === ']') { if (opens.length) opens.pop(); else bad[q] = 1; } }
    opens.forEach(function (q) { bad[q] = 1; });
    var out = [], cur = '';
    /* also split at a top-level ", " so a list like "f(a), f(b)" becomes separate formulas that can wrap on a phone */
    for (var r = 0, dp = 0; r < txt.length; r++) {
      var ch = txt[r];
      if (bad[r]) { if (cur) out.push([true, cur]); out.push([false, ch]); cur = ''; continue; }
      if (ch === '(' || ch === '[') dp++; else if (ch === ')' || ch === ']') dp--;
      cur += ch;
      if (ch === ',' && dp === 0 && txt[r + 1] === ' ') { out.push([true, cur]); cur = ''; }
    }
    if (cur) out.push([true, cur]);
    return out;
  }
  function mathPiece(t) {
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(t), body = m[2];
    if (!body) return t;
    var tp = /[.,;:!?]+$/.exec(body), tr = ''; if (tp) { tr = tp[0]; body = body.slice(0, -tr.length); }
    if (!body || !/[0-9A-Za-z²³√′∞π+=−<>≤≥→⇒⇔⇏±≈ℝ∪∩]/.test(body)) return t;
    return m[1] + '$' + A.mathTex(body) + '$' + tr + m[3];
  }

  /* ---------- find the math inside prose ---------- */
  var PUNCT_END = /[.,;:!?”"’)]+$/, PUNCT_START = /^[“"‘(]+/;
  function core(tok) { return tok.replace(/^[“"‘(]+/, '').replace(/[.,;:!?”"’)]+$/, ''); }
  function kind(tok) {
    var c = core(tok), b = c;
    if (!c) return 'prose';
    if (/^(e\.g|i\.e|etc|vs)\.?$/i.test(b)) return 'prose';
    if (/^\d{1,2}:\d{2}$/.test(b) || /^\d+–\d+$/.test(b) || /%$/.test(b) || /^[QPWL]\d+[a-z(]*/.test(b) || /^\d[A-C]$/.test(b) || /^\d+(st|nd|rd|th)$/.test(b)) return 'prose';
    if (/^[A-Za-z]+([-’'][A-Za-z]+)+$/.test(b) && !/^[a-z]′/.test(b)) return 'prose';       /* x-axis, L’Hospital, don’t */
    if (/^[A-Za-z]{2,}(\/[A-Za-z]{2,})+$/.test(b) && !/^d[a-z]\/d[a-z]$/.test(b)) return 'prose';    /* max/min, Rolle/MVT */
    if (/^[A-Za-z]{2,}\(s\)$/.test(tok.replace(/[.,;:!?]+$/, ''))) return 'prose';                     /* interval(s) */
    if (/^[A-Z]{2,}s?$/.test(b)) return 'prose';                                                     /* IVT, MVT, DNE */
    if (/^[A-Za-z]{3,}$/.test(b)) return FN.indexOf(b) >= 0 && b !== 'max' && b !== 'min' ? 'math' : 'prose';
    if (/^[A-Za-z]{2}$/.test(b)) return EN2[b.toLowerCase()] ? 'prose' : (UNITS[b] ? 'unit' : 'math');
    if (/^[aAI]$/.test(b)) return /[,)\]]/.test(tok) ? 'math' : 'weak';
    if (/[’']s$/.test(b)) return 'prose';
    if (/^\d+-[A-Za-z]+$/.test(b)) return 'prose';                                                   /* 24-inch */
    if (/^[A-Za-z]$/.test(b)) return 'math';
    if (/^[−-]?\d+(\.\d+)?$/.test(b)) return 'num';
    if (/^[+−=·×→⇒⇔≤≥≠±<>]$/.test(b)) return 'op';
    return 'math';
  }
  A.texify = function (str) {
    if (typeof str !== 'string' || !str || str.indexOf('$') >= 0) return str;
    if (!/[0-9A-Za-z²³√′∞π]/.test(str)) return str;
    var parts = str.split(/( +)/), toks = [];
    parts.forEach(function (p) { if (p && !/^ +$/.test(p)) toks.push(p); });
    if (!toks.length) return str;
    var kinds = toks.map(kind), out = [], i = 0, ends = toks.map(function (t) { return /[^.][.;:!?]["”’)]*$/.test(t) && !/\.\.\.$/.test(t); });
    /* a unit right after a number belongs to the math run */
    for (var u = 0; u < toks.length; u++) if (kinds[u] === 'unit') kinds[u] = (u > 0 && kinds[u - 1] !== 'prose') ? 'math' : 'prose';
    while (i < toks.length) {
      if (kinds[i] === 'prose') { out.push(toks[i]); i++; continue; }
      var j = i; while (j < toks.length && kinds[j] !== 'prose') { j++; if (ends[j - 1]) break; }
      /* articles at the edges of a run ("a 0/0 form") stay prose */
      while (i < j && kinds[i] === 'weak' && !(i + 1 < j && kinds[i + 1] === 'op')) { out.push(toks[i]); i++; }
      var e = j; while (e > i && kinds[e - 1] === 'weak' && !(e - 2 >= i && kinds[e - 2] === 'op')) e--;
      if (e > i) {
        var run = toks.slice(i, e), rk = kinds.slice(i, e), joined = run.join(' ');
        var strong = rk.some(function (k) { return k === 'math' || k === 'op'; }) || /^\(?[−-]\d/.test(joined) || /^\([^()]*\d[^()]*,[^()]*\)[.,;:]?$/.test(joined) || /^\[[^\]]*\][.,;:]?$/.test(joined);
        if (!strong) out.push(joined);
        else {
          /* peel leading quotes and trailing punctuation that belong to the prose around the run */
          var txt = joined, lead = '', trail = '';
          var lm = /^[“"‘]+/.exec(txt); if (lm) { lead = lm[0]; txt = txt.slice(lead.length); }
          var tm = /[.,;:!?”"’]+$/.exec(txt); if (tm) { trail = tm[0]; txt = txt.slice(0, -trail.length); }
          out.push(txt ? lead + pieces(txt).map(function (pc) { return pc[0] ? mathPiece(pc[1]) : pc[1]; }).join('') + trail : lead + trail);
        }
      }
      for (var w = e; w < j; w++) out.push(toks[w]);
      i = j;
    }
    return out.join(' ');
  };

  /* ---------- apply to the course pack ---------- */
  function deep(v, skip) {
    if (typeof v === 'string') return A.texify(v);
    if (Array.isArray(v)) return v.map(function (x) { return deep(x, skip); });
    if (v && typeof v === 'object') { Object.keys(v).forEach(function (k) { if (!skip || skip.indexOf(k) < 0) v[k] = deep(v[k], skip); }); return v; }
    return v;
  }
  A.texifyItem = function (it) {
    if (!it || it._tex) return it;
    ['stem', 'rule', 'work'].forEach(function (k) { if (it[k]) it[k] = A.texify(it[k]); });
    if (it.options) it.options = it.options.map(A.texify);
    if (it.why) it.why = it.why.map(function (w) { return w ? A.texify(w) : w; });
    if (it.table) it.table = deep(JSON.parse(JSON.stringify(it.table)));
    if (it.check) { var ch = it.check; it.check = function () { var r = ch(); return typeof r === 'string' ? A.texify(r) : r; }; }
    it._tex = true; return it;
  };
  A.texifyPack = function () {
    if (!A.COURSE || A.COURSE.math !== 'auto' || A._texified) return;
    A._texified = true;
    Object.keys(A.STATIONS || {}).forEach(function (id) { deep(A.STATIONS[id], ['label']); });
    Object.keys(A.banks || {}).forEach(function (t) { A.banks[t].forEach(function (b) { deep(b, ['diff', 'general']); }); });
    if (A.SAMPLE) A.SAMPLE.forEach(function (q) { deep(q, ['n', 'topic', 'ans', 'calc']); });
    if (A.SHEET) deep(A.SHEET);
    if (A.TWINS) A.TWINS.forEach(function (t) { deep(t, ['id']); });
    if (A.TF) A.TF.forEach(function (t) { t.t = A.texify(t.t); t.why = A.texify(t.why); });
    A.texifyCards();
    var mk = A.makeItem; A.makeItem = function (id) { return A.texifyItem(mk(id)); };
  };
  /* flashcards arrive after the engine in the built page, so the build calls this again once they exist */
  A.texifyCards = function () {
    if (!A.COURSE || A.COURSE.math !== 'auto' || !A.FLASHCARDS || A.FLASHCARDS._tex) return;
    A.FLASHCARDS.forEach(function (c) { c.front = A.texify(c.front); c.back = A.texify(c.back); }); A.FLASHCARDS._tex = true;
  };
  A.texifyPack();
})();
