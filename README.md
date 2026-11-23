# Expert Journey

Vertical video channel (1080x1920, 30fps) teaching real-world programming from the interviewer's point
of view. Content is JSON validated by zod; videos are rendered with Remotion.

## Requirements

Node 22 (see `.nvmrc`) and pnpm 12 (`corepack enable` picks the version from `package.json`).

## Setup

```bash
pnpm install
```

## Commands

| Command             | What it does                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm dev`          | Open Remotion Studio (compositions `Video` and `FontTest`)                                   |
| `pnpm lint`         | ESLint (no `any`, Remotion rules, CSS animation ban)                                         |
| `pnpm typecheck`    | `tsc --noEmit`                                                                               |
| `pnpm test`         | Vitest                                                                                       |
| `pnpm validate`     | Validate everything in `content/` against the schemas                                        |
| `pnpm plan`         | Curriculum schedule (`--level`, `--from`, `--to`, `--scaffold` creates research.md stubs)    |
| `pnpm sfx <id>`     | Synthesize music bed + SFX into `bed.wav` (after `pnpm tts`)                                 |
| `pnpm qa <id>`      | Automated QA checks incl. script checks (exit 1 on errors)                                   |
| `pnpm render <id>`  | Render `out/<id>.mp4`, normalised to -14 LUFS (`--no-normalize` skips; `--frames 0-89` clip) |
| `pnpm produce <id>` | validate → tts → sfx → qa → render, stops at first failure                                   |
| `pnpm format`       | Prettier                                                                                     |

Render a single frame to check visuals:

```bash
pnpm exec remotion still src/index.ts Video out/hook.png --frame=45
```

## Try it

1. `pnpm dev`, open the `Video` composition. It reads `content/samples/sample/video.json` and shows the safe zone
   outline (`debugSafeZone` prop, editable in the Studio props panel).
2. Open `FontTest` to check stacked Vietnamese diacritics.
3. Edit `content/samples/sample/video.json`, then run `pnpm validate`.
4. Run `pnpm tts sample`, then reload Studio: scene lengths now follow the generated audio and each scene plays its audio.

## Layout

```
content/   curriculum.json, <level>/topics.json, <level>/<ddmmyyyy>/<topic>/{research.md, interview-kit.json, video.json, code/, notes/}, samples/<id>/video.json
docs/      vision, story arc, design system (backdrop, moods, sound), content guide (scenes, cues, script rules), QA checklist
pipeline/  Node CLI via tsx: validate/, plan/, tts/ (providers behind TtsProvider), audio/ (synthesized music + SFX), qa/, render/
public/    fonts/ (OFL), sfx/, music/ (+ LICENSES.md), generated/audio/<id>/ (gitignored)
src/       Remotion layer
  compositions/  Video (reads the script + audio manifest), FontTest
  scenes/        one folder per scene type + registry.tsx:
                 HookCard, Diagram, CodeDiff (type `code`), Terminal, Tradeoff, Summary,
                 Stat, Compare, Callout, EndCard
  components/    SafeZoneFrame, Captions, ScenePlaceholder
  design/        tokens, springs, fonts
  schemas/       zod schemas (video, common, interview-kit, audio-manifest)
  lib/           pure helpers (duration, safe-zone, audio-manifest, clamp), unit-tested
```

Scene types: `hook`, `diagram`, `code`, `terminal`, `tradeoff`, `summary`, `stat`, `compare`, `callout`, `endcard`. Each scene folder has the
component, its zod `schema.ts`, a pure layout/timeline helper and Vitest tests.

## Writing a video

Authors write `content/<level>/<ddmmyyyy>/<topic>/video.json` (video id = `<ddmmyyyy>-<topic>`, e.g. `pnpm produce 20122026-database-index`). The full scene reference (props, limits, examples) is in
`docs/content-guide.md`; the review checklist and the still-image recipe are in `docs/qa-checklist.md`;
tokens, motion and sound rules are in `docs/design-system.md`.

See `CLAUDE.md` for conventions and the definition of done.

## Real Vietnamese voice (edge provider)

The `edge` provider uses the free `edge-tts` Python package (Microsoft Edge read-aloud voices, no API key;
unofficial, so the service may change). One-time setup:

```bash
python3 -m venv .venv && .venv/bin/pip install -r pipeline/tts/providers/requirements.txt
pnpm tts sample --provider edge        # or: TTS_PROVIDER=edge in .env
```

Default voice `vi-VN-HoaiMyNeural` at -10% speed; override with `--voice`, `--speed`, `EDGE_TTS_VOICE`,
`EDGE_TTS_PYTHON`. Live test: `EDGE_TTS_LIVE=1 pnpm test`. Remember the AI voice label when publishing.
