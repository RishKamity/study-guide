---
name: study-guide
description: Build an interactive, adaptive exam study guide (lessons, generated practice, mocks, a sealed sample exam, predicted score, audio) from a folder of class files. Use when someone wants a study guide, study app, or exam prep from their course materials.
---

# study-guide

Turn a folder of class material (slides, notes packets, lecture transcripts, solutions, syllabus, past or sample exams, an LMS export) into a published study app for one exam. The engine is fixed and tested; your job is to read the course, write the **course pack** (blueprint, questions, lessons) for this exam, prove it is correct, and publish it.

The engine lives in the repo **https://github.com/RishKamity/study-guide**. Read `README.md` and `docs/CONTENT_FORMAT.md` there before writing any content; `courses/demo/` is a complete small pack to copy.

**The one rule above all others: a wrong answer key costs more than a missing feature.** Every number comes from code, every key is checked twice, and course files beat the textbook.

---

## Phase 0: Set up (silently)

1. Get the engine: `git clone --depth 1 https://github.com/RishKamity/study-guide` into the working directory (skip if it is already there; `git pull` if it is old).
2. Check tools: `node -v` (18+), `python3`, `ffmpeg` (audio only), and Playwright with Chromium for `tools/smoke.cjs` (`npm i playwright && npx playwright install chromium` if `require('playwright')` fails; many Claude environments have it preinstalled).
3. Find the course files. They may be attached, on the student's computer (stage them in through the device tools), in a connected drive, or an LMS export (Brightspace/Canvas HTML). If you cannot reach them, ask for them; do not invent a course.
4. Create the task list (TaskCreate, one task per phase below) so the student can follow along.

## Phase 1: Intake (ask before building)

Ask these in one round (use AskUserQuestion when available; each has a sensible default if the student is away):

| Question | Default if unanswered |
|---|---|
| Which exam, and its date, time, room and format (number of questions, choices per question, minutes, calculator/notes rules)? | Read from the syllabus/exam info files; confirm in the plan |
| Hours available and when they start studying (now? tomorrow 9 AM?) | Study windows 9:00-12:30, 13:30-17:30, 18:30-23:00 from now. Turn "about N hours total" into `schedule.hoursPerDay` = N / days left, and a later start into `schedule.start` |
| Confidence or last exam grade | Medium; include a boot camp only if a prerequisite gap is obvious |
| Tier: **Quick** (~30-45 min build: question bank + cheat sheet + practice), **Standard** (+ lessons, mocks, sealed sample exam), **Full** (+ Elo predicted score, drills, narrated audio, AI tutor, sync, independent review; several hours) | Standard |
| Full only: accent color (lavender, teal, sky, green, amber, coral, orange, slate) | lavender |
| Daily puzzle with a push reminder each day until the exam? | No |

If the student is not answering (scheduled run, or a question already went unanswered), take the defaults, write them in `DECISIONS.md`, and say which you took in one line at the top of your next update.

## Phase 2: Inventory the folder

- List every file and classify it: syllabus, exam info, **review worksheet / exam blueprint**, announcements (corrections live here), lecture transcripts/summaries, slides, notes packets, activities, extra-practice + solutions, flashcards, formula sheet, past exams, **sample/practice exam (+ key)**.
- Rank sources and say so in `CONFLICTS.md` when they disagree: (1) the instructor's own documents and announcements (a correction beats the original), (2) lecture transcripts, then lecture summaries, (3) the student's own class notes, (4) anything third-party or AI-generated (study guides, flashcard decks someone made). Rank 4 can suggest what to cover but never overrides 1-3.
- Extract text (pdftotext / python-docx / python-pptx / markdown). Keep extracts in a scratch folder, not in the pack.
- Pull out: exam date/time/room/format; chapters or units covered; the instructor's own conventions and wording ("on this exam a credit card sale counts as cash"); every explicit "this will be on the exam" remark with its lecture and timestamp; worked examples with their official solutions.
- Note conflicts between files (a solution typo, a slide that disagrees with a lecture) in `CONFLICTS.md` with your resolution. The course's own files win over the textbook; a correction announcement wins over the original.

## Phase 3: Blueprint (infer, then confirm)

1. Split each unit into 4-8 testable **topics** (one idea a question can target). Give each an id like `8A`.
2. Count questions per topic from, in order: an official review worksheet or blueprint with counts (use it exactly), the instructor's explicit statements in lecture, the student's notes from class, the sample/past exams' distribution, then lecture time. One topic per worksheet line keeps the mapping obvious. Integer `exam` counts must sum to the exam's question count; put the uncertainty in fractional `weights` (e.g. "4-5 internal control questions" -> 2.5 + 1.5 + 0.5 across three topics).
3. Show the student a compact table (unit, topic, questions) and ask them to correct it. Their notes from class beat your inference. If they are away, proceed and flag it.

## Phase 4: Short plan (one screen)

Send one message: topics + counts, tier and features, the study schedule shape (from now to the exam, sleep included), what is in the sample exam lock, anything you are filling from general knowledge, and the build time. Build after a yes, or immediately if the student is away.

## Phase 5: Write the course pack

Copy `courses/demo/` to `courses/<id>/` and follow `docs/CONTENT_FORMAT.md` (it says which extras each tier shows; don't spend time on Full-only extras in Standard). Copy the `B()` helper at the top of the demo's `banks.js`. Order of work: `course.js` -> generators -> banks -> stations -> sample exam -> flashcards/reference/extras. Validate as you go (`node tools/validate.mjs courses/<id>`).

**Generators** (any topic with numbers): parameters from `rng` only; calculator-friendly values; every wrong option is a real mistake with its reason; `check()` recomputes the key a second way; `rule` + `work` always filled. Read the distractor and rounding rules in `docs/CONTENT_FORMAT.md` first (they save a round of failures). Reproduce the official course examples exactly in `qa/course_examples.mjs` (template in the docs) and run it with validate.

**Banks** (concept questions): **15+ per topic that has no generator.** One clearly best answer; three wrong options that each encode a common misconception with a reason; a one-sentence rule. Use the course's own terms and account/term names exactly.

**Stations** (Standard/Full): per exam topic: an intro naming how many exam questions it carries, 2-4 cards (heading, rule sentences, a visual where it helps, a memory hook, an analogy only if it clarifies, the exam trap), a worked example taken from the course's solutions (numbers changed if they appear in the sample exam), and a faded example for calculation topics. Keep topic titles to 48 characters and tables to 4 columns (phones). Don't start worked/faded titles with "Worked example" or "Your turn" (the app adds those). Lecture quotes must be **verbatim**: a transcript fragment, or words a lecture summary itself puts in quotation marks, with lecture number and timestamp. A paraphrase gets `quote: null`.

**Sample exam**: copy it verbatim with its key and write a short why for each option. It is sealed until the student reaches the dress rehearsal on their plan, a mock scores 80%+, or the unlock time, and nothing from it may appear anywhere else (validate checks wording and numbers in banks, generators, lessons, flashcards and the reference sheet). If other course files quote the sample (lecture summaries that walk through it, a review session), treat those passages as sample material: build practice from the notes packets and solutions instead, and if the key looks wrong, note it in `CONFLICTS.md` rather than changing it.

**Thin topics**: if the exam covers something the files barely mention, write it from standard textbook knowledge, mark it `general: true`, and list it in `CONFLICTS.md` under "Filled from general knowledge".

**Quick tier**: skip stations and mocks; put the effort into 15+ questions per topic, generators for calculation topics, `reference.md` and `A.SHEET`.

## Phase 6: Build and check (every tier)

```
node tools/build.mjs courses/<id>          # -> courses/<id>/dist/index.html
node tools/validate.mjs courses/<id>       # must PASS (fix every FAIL; read every warn)
node tools/smoke.cjs courses/<id>          # must PASS; then LOOK at courses/<id>/shots/*.png
```
Smoke walks every lesson on a phone-size screen. Treat its warnings (tables that scroll inside a card, titles that wrap to 3 lines) as fixes to make, then look at the screenshots, including the `station-<id>-worked.png` shots of every worked example, and re-run.

## Phase 7: Independent review (Full tier; recommended for Standard)

Spawn two fresh agents that have not seen your work, giving them only the course files and exported content (never your answer key):
`node tools/review_export.mjs courses/<id> <scratchDir> 3` writes the keyless questions (`items_blind.json`) and the lessons (`lessons.md`); the key stays in `courses/<id>/qa/`.
1. **Blind answers.** The agent answers each question from the course files, flags ambiguous items, and writes `[{n, answer, confidence, flag}]` JSON. Run `node tools/review_compare.mjs courses/<id> <answers.json>` and investigate every mismatch and every flag.
2. **Lesson audit.** Give the agent `lessons.md`; the agent checks every rule, number, worked step (in Python) and quote against the course files and returns a table: topic | quoted text | what the course file says | HIGH/MED/LOW | fix.
Fix all HIGH and MED findings and re-run validate + smoke. (In the ACCT 200 build this caught a lesson that contradicted the notes packet.)

## Phase 8: Audio (Full tier)

`bash tools/audio/render.sh courses/<id>` (voice am_michael). Scripts come from the stations, so audio can never contradict the lessons. On a machine with an NVIDIA GPU (the student's own PC, through the device tools, if it has one) it installs onnxruntime-gpu and takes minutes. On CPU it runs one part per core and takes roughly the audio's length on 2 cores (about an hour for 70 minutes), less with more cores. Run it in the background while you do Phase 7, and re-run it for any station you change afterwards (finished tracks are skipped; delete a track's `audio/wav/<id>.wav` to redo it). Then add `"audio": "audio/tracks.js"` to `pack.json` and rebuild.

## Phase 9: Publish

- In claude.ai, publish `courses/<id>/dist/index.html` with the Artifact tool, icon `book` (first publish only).
  - Quick/Standard: `capabilities: {downloads: true}`.
  - Full: `capabilities: {db: {}, user: {}, sample: {}, downloads: true}` (sync, AI tutor, export). Load the `artifact-capabilities` skill if you change runtime code.
  - Full with audio: pass `files` mapping `audio/<id>.mp3` -> `courses/<id>/audio/mp3/<id>.mp3` (one publish holds up to 64 MB).
- Elsewhere, deliver `dist/index.html` (and the `audio/` folder) as files.
- Republish to the **same URL** for every later fix. Never change `A.COURSE.id` or `storageKey` after the first publish (that would orphan the student's progress). Updates are safe while the student studies: progress lives in their browser and synced storage, not in the page.

## Phase 10: Daily puzzle (if chosen)

Create one one-shot scheduled task per day from tomorrow until the day before the exam, at the time the student picked (default 8:31 AM local), with push notifications on. Prompt: "Reply with exactly one line: Today's <course> <exam> puzzle is ready: <artifact url>#daily". Set `features: { daily: true }` in `course.js`. Tell the student how many reminders you created.

## Rebuilding later

When new files arrive (new lecture transcripts, a released review sheet): re-run Phases 2-3 for the affected units, update the pack, validate, smoke, re-render changed audio tracks, and republish to the same URL. Progress carries over.

## Finish

Tell the student in 3-6 lines: what the guide has (tier, number of topics, questions available, lessons, mocks, audio minutes), the plan's first step, what is sealed and when it unlocks, what was filled from general knowledge, and point to `DECISIONS.md` / `CONFLICTS.md`. Do not recap your steps.

---

## Lessons from the first build (do not repeat these)

- **Small question pools loop.** 7 written questions behind a 12-question station meant repeats every few minutes. 15+ per concept topic, or a generator.
- **Fixed calendar blocks break** the moment the student starts late. The engine re-plans from "now"; never hard-code dates into the content.
- **A lesson contradicted the notes packet** (freight-out) until an independent reviewer caught it. Always run Phase 7 on Full.
- **A practice question nearly copied a sample exam question.** Validate's leak check exists for this; never write questions while looking at the sample.
- **Class notes overrode the official worksheet.** The ACCT 200 build re-weighted topics from the student's notes when the instructor's review worksheet already had exact counts. The worksheet wins; notes fill gaps.
- **Paraphrases were labeled as quotes.** Only verbatim transcript fragments go in quote marks.
- **Answers you cannot verify in code get checked by hand against the official solution**, and disagreements go in `CONFLICTS.md` with your reasoning.
- **Look at the screenshots.** A layout bug hid every bottom button under the tab bar on phones; tests that only read text did not catch it.
- **Start the audio render early.** It is the slowest step and runs fine in the background.
