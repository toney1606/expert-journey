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
- `pnpm tts <videoId> [--provider name]` — synthesize scene audio into `public/generated/audio/<id>/` (+ `manifest.json`); default provider `fake` (silent WAV)
- `pnpm format` — Prettier
- `pnpm exec remotion still src/index.ts Video out/x.png --frame=45` — render one frame to check visuals

## Architecture

- One package, two layers: `src/` (render, React/Remotion) and `pipeline/` (Node CLI via tsx). They
  talk only through JSON files and audio files.
- Data (`content/*.json`) is separate from UI. The single source of truth for schemas is zod in
  `src/schemas/` (scene schemas live next to their scene in `src/scenes/<Scene>/schema.ts`).
- Feature-based layout: each scene is a folder with component + schema + test.
- Design tokens (colors, spacing, spring presets, safe zone) only in `src/design/`.
  Non-UI logic = pure functions in `src/lib/`, tested with Vitest.
- TTS sits behind `TtsProvider` (`pipeline/tts/types.ts`); providers are registered in `pipeline/tts/registry.ts` and chosen by `--provider` or `TTS_PROVIDER`. A provider must return `durationSec` itself. Swapping provider must not touch the rest of the pipeline.

## Conventions

- TypeScript strict; `any` is a lint error. Function components and hooks only.
- Animate only with `useCurrentFrame()`, `spring()`, `interpolate()`. No CSS transition/animation
  (lint-enforced best effort). Durations come from audio via `calculateMetadata`, never hardcoded frame
  counts (until audio exists, scenes declare `draft.durationSec`).
- Fonts are local files in `public/fonts/` (OFL), loaded via `useFonts()`. Test stacked Vietnamese diacritics.
- Do not add dependencies outside the approved list without asking the owner.
- Conventional commits, small steps. Never push without being asked.
- Content policy: books are ideas + cited (`sources` on every video); images/music only from clear
  sources recorded in `public/music/LICENSES.md`; AI voice label on; code in videos must run and have a
  test; owner reviews every video before publishing.

## Definition of done

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm validate` are green; `pnpm dev` opens Studio showing the
sample composition with the safe-zone outline; README is up to date; changes committed.

## Docs

`docs/`: vision, story-arc, design-system, content-guide, qa-checklist.
