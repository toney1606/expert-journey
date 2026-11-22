# Content guide

## Layout

- `content/topics/<slug>/research.md` — raw research notes.
- `content/topics/<slug>/interview-kit.json` — question, follow-ups, key points, weak/strong answer, pitfalls, sources.
- `content/videos/<id>.json` — the script (meta, sources, scenes). File name must equal `meta.id`.

Run `pnpm validate` after every edit.

## Scene shape

Every scene has `id` (slug, unique in the video), `type`, `voice` (narration), `props` (type-specific),
optional `sources`, and `draft.durationSec` (temporary duration until audio drives timing).

## Policy

- Books: ideas only, always cited in `sources`. Every video has a `sources` field.
- Images and music: only clearly licensed sources, recorded in `public/music/LICENSES.md`.
- AI voice label must be on (`meta.aiVoiceLabel`).
- Code shown in a video must run and have a test (`testPath` on `code` scenes).
- Owner reviews every video technically before publishing.

> TODO(owner): tone of voice, script style guide, topic backlog.
