# Handoff: video `25112026-timezone-utc` and moving video production to another machine

Date: 2026-11-25. Commit `e1f520e` (pushed). From now on the machine that wrote this note only does review/study; video production continues on another machine.

## State

- Video 2 (`23112026-idempotency-double-charge`) is published by the owner. Video 1 and 2 are done.
- Video "Bug mà database không có lỗi" (`content/junior/25112026/timezone-utc/`, Day 2 11:30 of the owner's new series, level `junior`, `visibility: private`) is built, approved by the owner and pushed.
  - 5 scenes, all `herocard` (so `src/scenes/HeroCard/` is now used; do not delete it). Content is data only, no scene code changed.
  - MP4 and audio are gitignored and exist only on the old machine: `out/25112026-timezone-utc.mp4` (83.9 s, -14 LUFS), `public/generated/audio-import/25112026-timezone-utc/` (5 mp3 + `index.json` + `*.align.json`). To get them elsewhere, copy by hand or re-import the ElevenLabs mp3s and re-render.
  - Cover (owner approved): `notes/cover.png`. Caption and pinned comment: `notes/script-v1.md`.
- Checks at commit: validate, lint green; `pnpm qa` 0 errors, 4 warnings (total 83.9 s under 120 s, hook 44 words, five scenes same mood, `store-utc` 25.6 s). typecheck/test not rerun (no code change).
- Not verified (owner skipped): V4-V7 (PostgreSQL `timestamptz`, MySQL `TIMESTAMP`/`DATETIME`, the 2038 limit, nonexistent/repeated local time). Listed in `research.md`.

## Workflow that worked (reuse for the next videos)

1. The owner writes the script as `dayN-videoM.md` + `.json` (hero + card per scene, caption, pinned comment, cover). Review it first (facts, length, card fit), agree changes, then build. No tts/render before the owner approves script and cover.
2. Map `hero` + `card` to a `herocard` scene (`rows`, `mono: true` for log lines, `mark: check|cross`, `tone` good/bad). No font glyphs for check/cross, no space-aligned columns.
3. Folder is `content/<level>/<ddmmyyyy>/<slug>/` (date = work date the owner gives, e.g. 25112026), `meta.id = <ddmmyyyy>-<slug>`. Needs `video.json`, `scenes/*.json`, `research.md`, `interview-kit.json`.
4. Voice: owner exports ElevenLabs mp3s by hand. Name them `<sceneId>.mp3` in `public/generated/audio-import/<id>/`, add `index.json` (`[{file, text}]`, text = scene `voice`), delete the old `manifest.json` and stale `*.align.json` when swapping a clip, then `pnpm tts <id> --provider import --voice <dir>`, `pnpm sfx <id>`, `pnpm qa <id>`, `pnpm render <id>`.
   - ElevenLabs downloads come in pairs with the same timestamp. A file with ` (1)` is the owner's preferred take; the timestamp order = scene order (check by size ~ word count).
5. Sync text to speech: every `at` must be a phrase actually spoken, in reveal order (hero lines, code, rows, footer). The scene clamps cues so they never go backwards, so a late `at` on hero line 2 delays every row. Run `spokenFrames` on the manifest words (see `src/lib/cues.ts`) to list each cue time and look for `NOMATCH`/out-of-order items. A phrase reused in one scene is searched after its previous hit.
6. Check layout with `remotion still` (recipe in `docs/qa-checklist.md`) after `pnpm qa`; long mono lines wrap above ~33 characters.
7. Commit with explicit pathspec; push only when the owner asks.

## Open

- Next: Day 2 19:30 video when the owner sends the script. Level/date folders for new videos: ask the owner for the `ddmmyyyy`.
- Video 2 cosmetic items in `2026-11-25-video-2-payment-scenes.md` (scene 4 yellow, empty start, stamps) are still open; the owner approved and published the video as is.
