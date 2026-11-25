# Handoff: video 2 (idempotency-double-charge) and the payment scenes

Date: 2026-11-25. Commits: `7c91b75` (scenes + wiring), `554aaf4` (content). Not pushed.

## What changed (structural)

- Six new scene types, each in `src/scenes/<Scene>/` (schema, layout with `fits`, timeline, component, tests):
  `paymenthook`, `timeoutflow`, `idemkey`, `uniquekey`, `racegap`, plus the generic `herocard` (no video uses it now).
  Reference: `docs/content-guide.md` ("Payment story scenes", "herocard").
- Additive wiring only: `src/schemas/video.ts` (union), `src/scenes/registry.tsx`, `src/design/mood.ts`
  (all new types default `neutral`; `herocard` defaults `concept`), `pipeline/qa/check-layout.ts`.
- QA whitelist changes: `check-structure.ts` lets the first scene be `herocard` or `paymenthook` and the last be
  `herocard` or `racegap`; `check-script.ts` `hookOf` accepts `herocard` and `paymenthook`.
- `CLAUDE.md` scene-type list gained `herocard` and the five payment scenes.
- Video 1 and its audio were not touched.

## Video 2

- Content: `content/junior/23112026/idempotency-double-charge/` (`video.json` assembled from `scenes/*.json`,
  `research.md`, `interview-kit.json`, `code/idempotency-demo.ts` + test on `node:sqlite`).
  SQLite has no `ADD CONSTRAINT`, so the test uses `CREATE UNIQUE INDEX` and only string-compares the ALTER statement (noted in `research.md`).
- Voice: ElevenLabs mp3s exported by hand, imported with `pnpm tts <id> --provider import --voice <dir>`
  (files in `public/generated/audio-import/<id>/`, gitignored). Word timings are cached as `*.mp3.align.json`; the API key lives only in `.env`.
- Output: `out/23112026-idempotency-double-charge.mp4` (83.4 s, -14 LUFS). `visibility: private` until the owner approves.
- Checks at the time of the commit: lint, typecheck, validate green; test 629 passed; `pnpm qa` 0 errors, 4 warnings
  (total under 120 s; `timeout-flow` voice 417 chars and 25.5 s; five scenes with the same mood).

## To do

1. Owner: listen to the MP4 (music/SFX level; pronunciation of "idempotency key", "SELECT", "INSERT"; respellings if misread:
   "ai đem pô tần xi ki", "xi lếch", "in sớt"), then decide on cutting scene 2 and on the 83 s length.
2. Cosmetic: scene 4 uses yellow in several places (rule: one per screen); the first ~2.5 s of scene 4 are nearly empty;
   the stamps hide most of the duplicate row text (scene 4) and "Server" (scene 3); scene 3 layout is ~1114 of 1130 px.
3. Decide whether to delete `src/scenes/HeroCard/` (unused).
4. Push needs the owner's approval.
