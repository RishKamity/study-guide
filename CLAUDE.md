# study-guide repo

- `SKILL.md` is the skill (also linked at `.claude/skills/study-guide/SKILL.md`). Keep it in step with the engine.
- Engine changes must keep `courses/demo` passing: `node tools/build.mjs courses/demo && node tools/validate.mjs courses/demo && node tools/smoke.cjs courses/demo`, plus `COURSE=courses/demo node tests/{score_sim,schedule_plan,palettes}.mjs`.
- Never commit course packs made from real class files (instructor material). `.gitignore` keeps `courses/*` out except the demo.
- No course-specific strings in `engine/` or `ui/`: everything comes from `A.COURSE` (see `docs/CONTENT_FORMAT.md`).
