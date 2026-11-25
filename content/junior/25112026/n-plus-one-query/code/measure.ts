import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { countQueries } from './n-plus-one-demo';

export const ORDER_COUNTS = [10, 100, 200] as const;

export const measure = async () => ({
  note: 'Statements counted through the recording SQLite handle (node:sqlite, in memory). Counts are exact and deterministic; no timings are quoted in the video.',
  engine: 'node:sqlite (SQLite via DatabaseSync, in-memory)',
  generatedBy: 'pnpm exec tsx content/junior/25112026/n-plus-one-query/code/measure.ts',
  counts: await Promise.all(ORDER_COUNTS.map((n) => countQueries(n))),
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = fileURLToPath(new URL('measurements.json', import.meta.url));
  writeFileSync(out, `${JSON.stringify(await measure(), null, 2)}\n`);
  console.log(`wrote ${out}`);
}
