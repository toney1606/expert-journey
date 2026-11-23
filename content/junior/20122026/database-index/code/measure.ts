import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildTerminalScenes } from './scenes';
import {
  buildUsersDb,
  explain,
  INDEX_SQL,
  insertMs,
  lookupMs,
  medianMs,
  objectBytes,
  Q,
} from './sqlite-demo';

const here = (name: string): string => fileURLToPath(new URL(name, import.meta.url));
const floor1 = (x: number): number => Math.floor(x * 10) / 10;
const round = (x: number, digits: number): number => Number(x.toFixed(digits));

export const measureLookup = (rows: number) => {
  const db = buildUsersDb(rows);
  const plan = { noIndex: explain(db, Q.byDemoEmail) };
  const scanMs = lookupMs(db, 1);
  const createIndexMs = medianMs(() => db.exec(INDEX_SQL.email), 1);
  const indexedMs = lookupMs(db, 2000);
  const result = {
    rows,
    scanMs: round(scanMs, 3),
    createIndexMs: round(createIndexMs, 1),
    indexedMs: round(indexedMs, 5),
    speedup: round(scanMs / indexedMs, 0),
    tableBytes: objectBytes(db, 'users'),
    emailIndexBytes: objectBytes(db, 'idx_users_email'),
    plan: { ...plan, withIndex: explain(db, Q.byDemoEmail) },
  };
  db.close();
  return result;
};

export const measureInsert = (rows: number, runs = 3) => {
  const sets = { none: [], one: ['email'], three: ['email', 'name', 'created'] } as const;
  const ms = (keys: readonly (keyof typeof INDEX_SQL)[]): number =>
    medianMs(() => void insertMs([...keys], rows), runs);
  const none = ms(sets.none);
  const one = ms(sets.one);
  const three = ms(sets.three);
  return {
    rows,
    noneMs: round(none, 0),
    oneIndexMs: round(one, 0),
    threeIndexesMs: round(three, 0),
    oneIndexRatio: round(one / none, 2),
    threeIndexesRatio: round(three / none, 2),
  };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sizes = [200_000, 1_000_000];
  const lookups = sizes.map((n) => measureLookup(n));
  const primary = lookups[lookups.length - 1];
  if (!primary) throw new Error('no lookup result');
  const insert = measureInsert(100_000);
  const out = {
    note: 'Raw ms are machine dependent; quote ratios. safeSpeedupFloor is rounded down for narration.',
    engine: 'node:sqlite (SQLite via DatabaseSync, in-memory)',
    sizeMethod: 'SUM(pgsize) FROM dbstat WHERE name = <table or index>',
    primary,
    safeSpeedupFloor: 10 ** Math.floor(Math.log10(primary.speedup)),
    indexToTableSizeRatio: round(primary.emailIndexBytes / primary.tableBytes, 2),
    allLookups: lookups,
    insert,
    insertRatioFloor: {
      one: floor1(insert.oneIndexRatio),
      three: floor1(insert.threeIndexesRatio),
    },
  };
  writeFileSync(here('measurements.json'), `${JSON.stringify(out, null, 2)}\n`);
  const scenes = buildTerminalScenes(primary);
  writeFileSync(here('terminal-scenes.json'), `${JSON.stringify(scenes, null, 2)}\n`);
  console.log(JSON.stringify(out, null, 2), JSON.stringify(scenes, null, 2));
}
