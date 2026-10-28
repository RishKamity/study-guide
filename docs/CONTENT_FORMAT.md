# Course pack format

A course pack is a folder under `courses/` that holds everything specific to one exam. The engine (`engine/`, `ui/`, `styles/`) never changes per course. Copy `courses/demo/` to start a new pack.

```
courses/<id>/
  pack.json            load order + optional files
  course.js            A.COURSE (exam facts, tier, accent, weights...) and A.TOPICS (the blueprint)
  gens/*.js            number generators (quantitative topics)
  content/*.js         stations (lessons), banks (written questions), sample exam, extras
  content/flashcards.json
  reference.md         formula / concept sheet shown in the Ref tab (markdown tables, lists, headings)
  audio/               narration (Full tier): scripts, lexicon.json, mp3/, tracks.js (generated)
  DECISIONS.md         defaults taken without asking (keep it short)
  CONFLICTS.md         where course files disagree with each other or with the textbook, and what the guide uses
```

Course packs built from real class files contain the instructor's material. Keep them private: `courses/*` is git-ignored except `courses/demo/`.

## pack.json

```json
{
  "course": "course.js",
  "files": ["gens/gens.js", "content/stations.js", "content/banks.js", "content/sample.js", "content/extras.js"],
  "flashcards": "content/flashcards.json",
  "reference": "reference.md",
  "audio": "audio/tracks.js"
}
```
`files` load in order after `course.js`. Generators must load before anything that calls `A.makeItem` at load time.

## course.js

```js
A.COURSE = {
  id: 'chem115-exam3',               // unique, stable. Never change it after publishing (progress is keyed to it).
  storageKey: 'chem3',               // optional prefix for saved progress; defaults to id. Never change after publishing.
  title: 'CHEM 115 Exam 3 Lab',      // app name (2-4 words)
  mark: 'C',                         // one letter for the logo square
  course: 'CHEM 115', exam: 'Exam 3',
  examAt: '2026-12-10T19:00:00-05:00',  // ISO with UTC offset (look up DST!). '+3d' = 3 days from today (demo only)
  where: 'Main Hall 120',
  instructor: 'Dr. Lee',         // used to attribute lecture quotes; null to omit
  facts: ['Thu Dec 10, 7:00 to 8:30 PM', '... format, calculator rules, what to bring ...'],
  format: { questions: 30, options: 5, minutes: 90, points: 4 },   // options = choices per question (sets the guessing floor)
  units: [{ id: 9, short: 'Ch 9', name: 'Thermochemistry' }, ...],        // chapters/units in exam order; id = topic.ch
  bootcamp: { label: 'Boot camp', refresher: 'Optional refresher · only if ... feels shaky' },   // optional, for ch: 0 topics
  tier: 'quick' | 'standard' | 'full',
  accent: 'lavender' | 'teal' | 'sky' | 'green' | 'amber' | 'coral' | 'orange' | 'slate',
  features: { daily: true },         // optional overrides of the tier's feature switches (see engine/course.js)
  weights: { '9A': 2.5, ... },       // optional fractional "expected questions" per topic for the predicted score; default = topic.exam
  skillWeights: { '6C.wa': 0.5 },    // optional: practice emphasis inside a topic (rarely-tested skill < 1 < favorite skill)
  sample: { title: 'Practice Exam 3', unlockAt: '2026-12-09T18:00:00-05:00' },  // unlock time optional (default: 4 h before the exam)
  jeBuilder: true,                   // accounting only: turns on the journal-entry builder drill
  tutor: { context: 'You are a tutor for ...', conventions: 'course-specific rules the AI must follow' },
  walkIn: { title: '... walk-in sheet', travel: 'Play the walk-in sheet track on the way to ...' },
  officeHours: [{ end: '2026-12-09T15:00:00-05:00', text: 'Office hours Wed 1-3 PM, ...' }],
  schedule: { windows: [['09:00', '12:30'], ['13:30', '17:30'], ['18:30', '23:00']], stopBeforeExam: 45, pace: 1.25 }
};
A.TOPICS = [
  // id: short and stable ('9A'); ch: unit id (0 = boot camp); exam: integer questions on the exam (mock blueprint);
  // pri: 'A' | 'B' | 'C' practice priority; calc: needs a calculator; mins: lesson length estimate
  { id: '9A', ch: 9, title: 'Enthalpy and calorimetry', exam: 3, pri: 'A', calc: true, mins: 14 },
];
```

**Tier switches** (`engine/course.js`):

| feature | quick | standard | full |
|---|---|---|---|
| stations (lessons) | | yes | yes |
| mocks, mini-mocks, locked sample | | yes | yes |
| Elo predicted score | | | yes |
| drill extras (weak spots, misses, flashcards, twins, calc sprint, walk-in sheet, T/F) | | | yes |
| audio, AI tutor, cross-device sync | | | yes |
| daily puzzle | opt-in | opt-in | opt-in |

Quick-tier topics appear on the Path as practice drills ("done" after 6 answers).

**Blueprint rule:** the integer `exam` counts of the unit topics should sum to `format.questions`. They drive the mocks. `weights` (fractional) drive the predicted score and practice emphasis; use them when the notes say "4 to 5 questions".

## Generators (`A.defGen`)

```js
A.defGen('1B', 'eqp', 'Equilibrium price from equations', function (rng) {
  var m = market(rng);                              // pick parameters with rng only (rng.int, rng.step, rng.pick, rng.sample, rng.shuffle, rng.chance)
  return A.mc({ rng: rng, topic: '1B', skill: 'eqp',
    stem: '...', table: { head: [...], rows: [[...]] },          // optional data table
    correct: m.P,                                                // number or string
    wrong: [[value, 'why a student picks this'], ...],           // at least 3 DISTINCT, each encoding a real mistake
    fmt: function (v) { ... },                                   // optional formatter (default: $ money)
    rule: 'the one-sentence rule', work: 'the computation with this item’s numbers',
    calc: true, diff: 1 | 2 | 3,
    check: function () { return /* the answer recomputed a second, independent way */; } });
});
```
- Numbers come from code, never typed by hand. Keep them calculator-friendly (round intermediate values).
- `check()` must recompute the key independently; `validate.mjs` fails any seed where they disagree.
- Numeric options are sorted ascending automatically (like a printed exam).
- Helpers: `A.numItem(rng, topic, skill, {stem, ans, wrong, pad, rule, work})` pads numeric distractors; `A.jePick(rng, topic, skill, {stem, good, bad, rule})` builds a pick-the-journal-entry item (accounting) where every entry must balance; set `jeBuilder: true` in course.js to unlock the JE builder drill.
- Never use the sample exam's numbers or wording.

## Banks (`A.defBank`)

```js
A.defBank('1A', [
  B(question, answer, [3 wrong], [3 reasons each wrong one tempts], rule, { diff: 1, general: false, work: '...' }),
], 'label for the skill');
```
- **15+ questions for any topic without a generator.** Fewer makes stations and Endless loop (validate fails under 8, warns under 15).
- Each wrong answer encodes a real mistake, and its reason says why it is tempting and why it is wrong.
- `general: true` marks content written from standard textbook knowledge because the course files barely cover it; the app shows "Not from your course files".

## Stations (`A.STATIONS[id]`)

```js
A.STATIONS['1B'] = {
  intro: 'how many exam questions and what the key skill is',
  cards: [{ h: 'heading', rule: ['short sentences'], visual: {...} | null, hook: 'memory line' | null, analogy: '...' | null,
            trap: { t: 'the exam trap', quote: { text: 'VERBATIM lecture words', lec: 15, ts: '20:48' } | null }, general: false }],
  worked: { title, setup, steps: [{ label, action, math, why, je }] } | null,
  faded: { title, setup, steps: [{ label, action, math, ask: { q, opts: [...], ans: 0, why } }] } | null
};
```
Visual types: `table {head, rows}`, `twocol {left:{title,items}, right:{...}}`, `flow {steps, note}`, `stack {tiers}`, `je {rows:[[acct, dr, cr]], note}`, `tacct {name, left, right, end}`, `recon {bank, book, adj}`, `layers {layers:[{n,u,sold}]}`, `icons {items:[{k,t,d}]}`, `tri {corners:[{t,d,hl}]}`.

Quotes must be verbatim fragments from a transcript. If you only have a paraphrase, set `quote: null`.

## Sample exam (`A.defSample`)

```js
A.defSample([{ topic: '4B', stem: '...', options: ['...', '...', '...', '...'], answer: 'D', why: ['...', null, ...], rule: '...', work: '...', table: {...}, calc: true }]);
```
Copy the instructor's sample exam **verbatim** with its key. It stays sealed until a mock scores 80%+ or the unlock time, is taken once as a timed dress rehearsal, and nothing from it may appear in generators, banks, stations or flashcards. `validate.mjs` checks for copied wording (10-word runs) and reused distinctive numbers.

## Extras (`content/extras.js`)

```js
A.SHEET = { FORMULAS: [[name, formula]], JES: [[transaction, entry]], JES_TITLE: '...', TRAPS: ['...'] };   // walk-in sheet
A.TWINS = [{ id, title, diff, L: { name, pts: [] }, R: { name, pts: [] }, q: [[statement, 'L' | 'R']] }];      // look-alike concepts
A.TF = [{ id, t: 'claim', a: true | false, why, topic }];                                                       // true/false traps
A.FOUNDATION = ['g:B2:skill:seed', ...];   // optional fixed boot-camp check (item ids)
```

## Flashcards (`content/flashcards.json`)

`[{ "id": "4.1", "ch": 4, "front": "...", "back": "...", "sample": false }]`. Cards drawn from the sample exam get `"sample": true` and stay hidden until it unlocks.

## Audio (Full tier)

`bash tools/audio/render.sh courses/<id>`: writes scripts from the stations, normalizes them for speech, renders MP3s with Kokoro (voice am_michael), and writes `audio/tracks.js`. Add `"audio": "audio/tracks.js"` to `pack.json`, rebuild, and publish each `audio/mp3/<id>.mp3` as `audio/<id>.mp3` beside the page. Add `audio/lexicon.json` for course acronyms (`{"PCAOB": "P-C-A-O-B"}`).
