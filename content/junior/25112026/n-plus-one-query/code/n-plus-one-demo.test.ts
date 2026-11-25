import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { measure } from './measure';
import {
  LOG_LINES,
  SNIPPETS,
  countQueries,
  countingDb,
  namesWithIn,
  namesWithJoin,
  runLazyLoop,
  seed,
} from './n-plus-one-demo';

type Row = { label?: string; text: string };
type Scene = { id: string; props: { code?: { text: string }; rows?: Row[] } };
const video = JSON.parse(readFileSync(resolve(__dirname, '../video.json'), 'utf8')) as {
  scenes: Scene[];
};
const scene = (id: string): Scene => {
  const found = video.scenes.find((s) => s.id === id);
  if (!found) throw new Error(`scene ${id} missing`);
  return found;
};

const run = async (orderCount: number) => {
  const db = seed(orderCount);
  const cdb = countingDb(db);
  const names = await runLazyLoop(cdb);
  db.close();
  return { cdb, names };
};

describe('code shown in the video (used verbatim in video.json)', () => {
  it('lazy loop and JOIN are exactly the strings in the scenes', () => {
    expect(scene('lazy-loading').props.code?.text).toBe(SNIPPETS.lazyLoop);
    expect(scene('eager-fix').props.code?.text).toBe(SNIPPETS.join);
  });

  it('scene 1 log lines are the statements the lazy loop really runs', async () => {
    const { cdb } = await run(100);
    const rows = scene('slow-page').props.rows ?? [];
    // The video joins `id = N` with no-break spaces so a wrapped line never leaves `= N` alone.
    const shown = (label: string) =>
      rows.find((r) => r.label === label)?.text.replaceAll('\u00a0', ' ');
    expect(shown('Query 1')).toBe(LOG_LINES.orders);
    expect(shown('Query 2')).toBe(LOG_LINES.user(1));
    expect(shown('Query 3')).toBe(LOG_LINES.user(2));
    expect(shown('Query 101')).toBe(LOG_LINES.user(100));
    expect(cdb.log[0]).toBe(LOG_LINES.orders);
    expect(cdb.log[1]).toBe(LOG_LINES.user(1));
    expect(cdb.log[2]).toBe(LOG_LINES.user(2));
    expect(cdb.log[100]).toBe(LOG_LINES.user(100));
  });
});

describe('scene 2: lazy loading', () => {
  it('runs the displayed snippet and prints every user name', async () => {
    const { names } = await run(100);
    expect(names).toHaveLength(100);
    expect(names[0]).toBe('user-1');
    expect(names[99]).toBe('user-100');
  });

  it('one query for the orders plus one per order: 100 orders -> 101 queries', async () => {
    const { cdb } = await run(100);
    expect(cdb.log).toHaveLength(101);
  });

  it('grows with the page: 10 orders -> 11 queries, 200 orders -> 201 queries', async () => {
    expect((await run(10)).cdb.log).toHaveLength(11);
    expect((await run(200)).cdb.log).toHaveLength(201);
  });
});

describe('scene 3: the fixes', () => {
  it('JOIN returns the same names in one query', async () => {
    const db = seed(100);
    const cdb = countingDb(db);
    const names = namesWithJoin(cdb);
    expect(cdb.log).toHaveLength(1);
    expect(names).toEqual((await run(100)).names);
    db.close();
  });

  it('IN returns the same names in two queries', async () => {
    const db = seed(100);
    const cdb = countingDb(db);
    const names = namesWithIn(cdb);
    expect(cdb.log).toHaveLength(2);
    expect(names).toEqual((await run(100)).names);
    db.close();
  });

  it('the number of fixed queries does not grow with the number of orders', async () => {
    for (const n of [10, 100, 200]) {
      const counts = await countQueries(n);
      expect(counts.join).toBe(1);
      expect(counts.inBatch).toBe(2);
    }
  });
});

describe('scene 4 and 5 numbers', () => {
  it('200 orders -> 201 queries (scene 4), 10 orders -> 11 (interview answer)', async () => {
    expect((await countQueries(200)).lazy).toBe(201);
    expect((await countQueries(10)).lazy).toBe(11);
  });
});

describe('measurements.json', () => {
  it('matches a fresh measurement', async () => {
    const saved = JSON.parse(readFileSync(resolve(__dirname, 'measurements.json'), 'utf8'));
    expect(saved).toEqual(await measure());
  });
});
