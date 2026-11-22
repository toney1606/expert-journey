# Design system

Source of truth in code: `src/design/`.

- Canvas: 1080x1920 @ 30fps.
- **Safe zone** (starting values, to be tuned): top ~150px, bottom ~420px, right ~170px, left ~60px.
  Enable the debug outline with `debugSafeZone` (on by default in the sample composition).
- **Palette (Catppuccin Mocha):** background `#1e1e2e`, card `#313244`, text `#cdd6f4`,
  muted text `#a6adc8`, accent `#f9e2af`, correct `#a6e3a1`, wrong `#f38ba8`, diagram `#89b4fa`.
- **Fonts:** Be Vietnam Pro (titles; 400/700/800) and JetBrains Mono (code; 400/700), local OFL files in
  `public/fonts/`. Use line-height >= 1.3 for titles so stacked Vietnamese diacritics are not clipped.
  The `FontTest` composition shows them.
- **Motion:** only `useCurrentFrame()`, `spring()`, `interpolate()`. Presets in `src/design/springs.ts`.

> TODO(owner): typography scale, component catalog, motion guidelines.
