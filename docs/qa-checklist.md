# QA checklist

Before a video enters the publish queue:

- [ ] `pnpm validate` is green.
- [ ] Content is technically correct (owner review).
- [ ] Code shown runs and its test passes.
- [ ] All content sits inside the safe zone (check with debug outline on).
- [ ] Vietnamese diacritics render without clipping.
- [ ] Sources listed; images/music recorded in `public/music/LICENSES.md`.
- [ ] AI voice label enabled.
- [ ] Re-hooks near 0:45 and 1:40; final line loops into the hook.

> TODO(owner): automated QA checks (audio levels, caption sync, duration bounds).
