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

| Command          | What it does                                               |
| ---------------- | ---------------------------------------------------------- |
| `pnpm dev`       | Open Remotion Studio (compositions `Video` and `FontTest`) |
| `pnpm lint`      | ESLint (no `any`, Remotion rules, CSS animation ban)       |
| `pnpm typecheck` | `tsc --noEmit`                                             |
| `pnpm test`      | Vitest                                                     |
| `pnpm validate`  | Validate everything in `content/` against the schemas      |
| `pnpm format`    | Prettier                                                   |

Render a single frame to check visuals:

```bash
pnpm exec remotion still src/index.ts Video out/hook.png --frame=45
```

## Try it

1. `pnpm dev`, open the `Video` composition. It reads `content/videos/sample.json` and shows the safe zone
   outline (`debugSafeZone` prop, editable in the Studio props panel).
2. Open `FontTest` to check stacked Vietnamese diacritics.
3. Edit `content/videos/sample.json`, then run `pnpm validate`.
4. Run `pnpm tts sample`, then reload Studio: scene lengths now follow the generated audio and each scene plays its audio.

## Layout

```
content/   topics/<slug>/{research.md, interview-kit.json}, videos/<id>.json
docs/      vision, story arc, design system, content guide, QA checklist
pipeline/  Node CLI (validate now; TTS, align, qa, render, publish later)
public/    fonts/ (OFL), sfx/, music/ (+ LICENSES.md), generated/ (gitignored)
src/       Remotion layer: compositions/, scenes/, components/, design/, schemas/, lib/
```

See `CLAUDE.md` for conventions and the definition of done.
