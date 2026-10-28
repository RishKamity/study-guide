# study-guide

A Claude skill plus the engine it uses to turn a folder of class files into an adaptive study app for one exam.

Give Claude your course folder (slides, notes, lecture transcripts, solutions, syllabus, a sample exam) and say *"make me a study guide for Exam 3."* It asks a few questions, proposes how many exam questions each topic carries, and builds and publishes a single-page app with:

- **Lessons** for every exam topic (rule cards, worked examples, "your turn" steps, exam traps)
- **Practice that never runs out**: number generators make fresh calculation questions; written banks cover concepts. Misses come back on a spaced schedule, and the same question never repeats within 15
- **Mocks** on the exact exam blueprint, plus the instructor's **sample exam sealed** as a timed dress rehearsal
- A **schedule that re-plans from now**. If you start late, it trims the least-tested topics instead of telling you that you're behind
- **Full tier extras**: a live predicted score (Elo-style, two decimals, +/− after every answer), weak spots, flashcards, calc sprint, walk-in sheet, narrated audio, an AI tutor, phone ↔ laptop sync, and an optional daily puzzle with a push reminder

| Tier | Build time | What you get |
|---|---|---|
| Quick | ~30-45 min | Question bank, cheat sheet, practice by topic |
| Standard | a few hours | + lessons, mocks, sealed sample exam |
| Full | several hours | + predicted score, drills, audio, AI tutor, sync, independent review |

## Use it

**Claude Code / Claude with a workspace:** clone this repo. The skill is at `.claude/skills/study-guide/SKILL.md` (same file as `SKILL.md`), so Claude picks it up in this folder. Or copy `SKILL.md` into your own skills folder (`~/.claude/skills/study-guide/SKILL.md`). Then ask for a study guide and point Claude at your course files.

**claude.ai:** add the skill (paste `SKILL.md` as a new skill). When it runs, Claude clones this repo for the engine.

## How it works

```
engine/   adaptive picker, misses, Elo score, schedule, storage + sync   (never changes per course)
ui/       the app screens
styles/   one stylesheet, 8 accent palettes, light/dark
tools/    build.mjs, validate.mjs (accuracy gate), smoke.cjs (click-through test), review_*.mjs, audio/
courses/  one folder per exam ("course pack"); only courses/demo is committed
docs/CONTENT_FORMAT.md   everything a course pack can contain
```

```
node tools/build.mjs courses/demo        # -> courses/demo/dist/index.html (open it in a browser)
node tools/validate.mjs courses/demo     # answer keys, pool sizes, sample-exam leaks, mocks, schedule
node tools/smoke.cjs courses/demo        # needs Playwright + Chromium; writes screenshots to courses/demo/shots/
```

`courses/demo/` is a small, complete, original intro-economics midterm. Copy it to start a new pack.

## Privacy and course materials

Course packs built from real classes contain your instructor's material (notes, lecture quotes, sample exams). **Do not commit them to a public repo.** `.gitignore` excludes everything in `courses/` except the demo. Published guides are private to you on claude.ai until you share them.

## Requirements

Node 18+. Playwright + Chromium for `smoke.cjs`. For audio: Python 3, ffmpeg, and `kokoro-onnx` (installed by `tools/audio/render.sh`, which downloads the ~350 MB voice model from GitHub releases on first run).

## Tests (engine development)

```
COURSE=courses/demo node tests/score_sim.mjs        # Elo model converges, resists farming, decays, calibrates
COURSE=courses/demo node tests/schedule_plan.mjs    # re-plan + trimming + dress rehearsal protected
COURSE=courses/demo node tests/palettes.mjs         # every accent passes WCAG AA in both themes
```
The browser tests in `tests/*.cjs` target a full accounting pack and are kept as references.
