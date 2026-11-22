# Expert Journey

Vertical video channel (TikTok / Facebook Reels, 1080x1920, 30fps, 2-4 min) teaching real-world
programming from the **interviewer's** point of view, intern to senior fullstack. Each video answers
one real interview question. Pipeline goal: topic + notes in → script JSON, TTS, Remotion render, auto QA,
review queue → human approves before publishing. Narration is Vietnamese; English tech terms stay English.

**Always check the official Remotion docs for the installed version (see `package.json`) before using
any Remotion API or `@remotion/*` package. Never write Remotion code from memory.**

## Commands

- `pnpm dev` — Remotion Studio (compositions `Video`, `FontTest`)
- `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm validate` — all must pass
- `pnpm tts <videoId> [--provider fake|edge]` — synthesize scene audio into `public/generated/audio/<id>/` (+ `manifest.json`); default `fake` (silent WAV), `edge` = real Vietnamese voice (needs `.venv`, see README)
- `pnpm qa <videoId>` — automated QA checks (exit 1 on errors); `pnpm render <videoId>` — MP4 to `out/`; `pnpm produce <videoId>` — validate → tts → qa → render, stops at the first failure
- `pnpm format` — Prettier
- `pnpm exec remotion still src/index.ts Video out/x.png --frame=45` — render one frame to check visuals

## Architecture

- One package, two layers: `src/` (render, React/Remotion) and `pipeline/` (Node CLI via tsx). They
  talk only through JSON files and audio files.
- Data (`content/*.json`) is separate from UI. The single source of truth for schemas is zod in
  `src/schemas/` (scene schemas live next to their scene in `src/scenes/<Scene>/schema.ts`).
- Feature-based layout, scene folder pattern: `src/scenes/<Scene>/` = component + `schema.ts` (zod) + a pure layout and/or
  timeline helper (no React) + Vitest tests. Scenes are wired in `src/scenes/registry.tsx`. Scene types: `hook`
  (HookCard), `diagram`, `code` (CodeDiff), `terminal`, `tradeoff`, `summary`.
- Reveal timelines are derived from `durationInFrames` (audio length), never hardcoded frame numbers.
- Content must fit: layout helpers expose a `fits` (or `wraps`) flag and pick the largest font that fits the 780x770
  `CONTENT_BOX` (safe box minus the caption band); do not add a scene that overflows silently.
- Design tokens (colors, spacing, spring presets, safe zone) only in `src/design/`.
  Non-UI logic = pure functions in `src/lib/`, tested with Vitest.
- TTS sits behind `TtsProvider` (`pipeline/tts/types.ts`); providers are registered in `pipeline/tts/registry.ts` and chosen by `--provider` or `TTS_PROVIDER`. A provider must return `durationSec` itself. Swapping provider must not touch the rest of the pipeline.

## Conventions

- TypeScript strict; `any` is a lint error. Function components and hooks only.
- Animate only with `useCurrentFrame()`, `spring()`, `interpolate()`. No CSS transition/animation
  (lint-enforced best effort). Durations come from audio via `calculateMetadata`, never hardcoded frame
  counts. `calculateMetadata` reads `public/generated/audio/<id>/manifest.json` (from `pnpm tts`) and uses real audio length + 0.4s tail per scene; without a manifest it falls back to `draft.durationSec`. Re-run `pnpm tts <id>` after editing any `voice`.
- Fonts are local files in `public/fonts/` (OFL), loaded via `useFonts()`. Test stacked Vietnamese diacritics.
- Do not add dependencies outside the approved list without asking the owner.
- Conventional commits, small steps. Never push without being asked.
- Content policy: books are ideas + cited (`sources` on every video); images/music only from clear
  sources recorded in `public/music/LICENSES.md`; AI voice label on; code in videos must run and have a
  test; owner reviews every video before publishing.

## Working rules

Shared with the owner's other repos (backend, web-app, xlvm, ...), trimmed to what fits a solo Remotion project.

- Chat with the owner in **Vietnamese** (with full diacritics); code, identifiers, commands, log text, commit
  messages in **English**. Do not translate comments already in a file; quote tool/log errors verbatim, then explain.
- Keep answers short: conclusion first, plain words, no dense tables/headings. Ask for decisions separately,
  numbered, with what is gained/lost and a default recommendation.
- Prefer `rg` over `grep`. Never use `rg -rn` as "recursive": `-r` is `--replace` and mangles output.
- **Autonomy:** small technical choices (file names, internal structure, constants) are yours — state them in the
  report. Ask first for paid providers/API keys, dependencies outside the approved list, and any push.
- **Surgical changes:** touch the minimum, reuse existing patterns and scene-folder layout, no unrelated refactor.
  If old code or a failing test that you did not touch blocks the task, stop and report; do not skip or rewrite it.
- **Verify before reporting:** run the checks yourself (`pnpm lint/typecheck/test/validate`; `remotion still` for
  visuals). A green build or reading the code is not verification. Never claim PASS without running it.
- **Secrets:** never put keys/tokens in prompts, chat or commits; point to the `.env` path only (`.env.example` stays
  placeholder-only).
- **Git:** commit only when asked, with explicit paths (`git commit -- <paths>`, never `git add .` / `-u`) after
  `git status --short`. `git pull` (merge) before editing; no rebase, no force-push. Push/merge needs approval.
- **Parallel windows/agents:** other Claude windows may edit this repo. A temporarily broken build can be their
  in-progress work — don't "fix" it; stop if files would be overwritten. Run important fixes in the foreground,
  verify agent output yourself, use 4-7 independent agents split by folder (owner decision for this project), shared scaffolding (stub/registry/sample) first.
- Kill dev processes by port (`ss -ltnp`) after checking cwd, never `pkill` by name; don't kill a Studio/dev server
  the owner started — ask them to restart it.
- Finish each task with a short status: what changed, real test result, what is pending, next step.

## Definition of done

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm validate` are green; `pnpm dev` opens Studio showing the
sample composition with the safe-zone outline; README is up to date; changes committed.

## Docs

`docs/`: vision, story-arc, design-system (tokens, motion), content-guide (scene reference and limits), qa-checklist
(includes the `remotion still --props` recipe for eyeballing one scene).
