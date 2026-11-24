import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { measureAll } from './measure';
import {
  buildOrdersDb,
  clusterPendingOldest,
  countPending,
  explain,
  INDEX_NAMES,
  mulberry32,
  objectBytes,
  Q,
  rowsExaminedBackwards,
  SQL,
  squash,
} from './orders-demo';

const ROWS = 20_000;

describe('video SQL snippets (used verbatim in video.json)', () => {
  it('are exactly these strings', () => {
    expect(SQL.query).toBe(
      "SELECT * FROM orders\nWHERE status = 'pending'\nORDER BY created_at DESC\nLIMIT 10;",
    );
    expect(SQL.compositeIndex).toBe(
      'CREATE INDEX idx_orders_status_created\nON orders (status, created_at);',
    );
    expect(SQL.partialIndex).toBe(
      "CREATE INDEX idx_orders_pending\nON orders (created_at)\nWHERE status = 'pending';",
    );
    expect(SQL.offsetPage).toBe(
      'SELECT * FROM orders\nORDER BY created_at DESC\nLIMIT 10 OFFSET 99990;',
    );
  });

  it('multi-line query equals the one-line form once whitespace is normalised', () => {
    expect(squash(SQL.query)).toBe(
      "SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10;",
    );
  });
});

describe('orders table (SQLite via node:sqlite)', () => {
  const db = buildOrdersDb(ROWS);

  it('is deterministic', () => {
    const a = mulberry32(1);
    const b = mulberry32(1);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(countPending(buildOrdersDb(ROWS))).toBe(countPending(db));
  });

  // Collected before the clustering below runs (describe bodies execute at collection time).
  const spreadShare = countPending(db) / ROWS;
  const spreadPlan = explain(db, Q.pending);
  const spreadExamined = rowsExaminedBackwards(db);

  it('spread: about 5% pending, found after few rows', () => {
    expect(spreadShare).toBeGreaterThan(0.04);
    expect(spreadShare).toBeLessThan(0.06);
    expect(spreadPlan).toBe(`SCAN orders USING INDEX ${INDEX_NAMES.created}`);
    expect(spreadExamined).toBeLessThan(1000);
  });

  const pendingBefore = countPending(db);
  clusterPendingOldest(db);

  it('clustered: same pending share, but nearly every other row is examined', () => {
    expect(countPending(db)).toBe(pendingBefore);
    const examined = rowsExaminedBackwards(db);
    expect(examined).toBe(ROWS - pendingBefore + 10);
    expect(examined).toBeGreaterThan(spreadExamined * 20);
    expect(explain(db, Q.pending)).toBe(`SCAN orders USING INDEX ${INDEX_NAMES.created}`);
  });

  it('partial index is much smaller than the full created_at index', () => {
    db.exec(SQL.partialIndex);
    const full = objectBytes(db, INDEX_NAMES.created);
    const partial = objectBytes(db, INDEX_NAMES.partial);
    expect(full / partial).toBeGreaterThan(10);
    db.exec(`DROP INDEX ${INDEX_NAMES.partial}`);
  });

  it('fixed: composite index serves exactly 10 rows', () => {
    db.exec(SQL.compositeIndex);
    expect(explain(db, Q.pending)).toBe(
      `SEARCH orders USING INDEX ${INDEX_NAMES.composite} (status=?)`,
    );
    expect(db.prepare(Q.pending).all()).toHaveLength(10);
    const ids = db
      .prepare(Q.pending)
      .all()
      .map((r) => Number(r.id));
    expect(ids).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((i) => pendingBefore - 10 + i));
  });
});

describe('measurements.json', () => {
  const m = JSON.parse(readFileSync(new URL('measurements.json', import.meta.url), 'utf8')) as {
    rows: number;
    generatedBy: string;
    summary: Record<string, number>;
    spread: { pendingRows: number; rowsExamined: number; queryMs: number };
    clustered: { pendingRows: number; rowsExamined: number; queryMs: number };
    fixed: { rowsExamined: number; plan: string };
    partialIndex: { fullIndexBytes: number; partialIndexBytes: number; ratio: number };
  };
  const s = m.summary;

  it('is internally consistent', () => {
    expect(m.generatedBy).toContain('measure.ts');
    expect(m.spread.pendingRows).toBe(m.clustered.pendingRows);
    expect(s.rowsExaminedSpread).toBe(m.spread.rowsExamined);
    expect(s.rowsExaminedClustered).toBe(m.clustered.rowsExamined);
    expect(s.rowsRemoved).toBe(m.clustered.rowsExamined - 10);
    expect(s.rowsRemoved).toBe(m.rows - m.clustered.pendingRows);
    expect(s.rowsRemoved).toBeGreaterThanOrEqual(0.9 * m.rows);
    expect(s.rowsExaminedFixed).toBe(10);
    expect(m.fixed.plan).toContain('idx_orders_status_created');
    expect(s.fastMs).toBe(m.spread.queryMs);
    expect(s.slowMs).toBe(m.clustered.queryMs);
    expect(s.slowMs).toBeGreaterThan(s.fastMs);
    expect(s.partialIndexRatio).toBeCloseTo(
      m.partialIndex.fullIndexBytes / m.partialIndex.partialIndexBytes,
      1,
    );
    expect(s.partialIndexRatio).toBeGreaterThanOrEqual(15);
    expect(s.page10000Ms).toBeGreaterThan(s.page1Ms);
  });
});

describe('measureAll at small N', () => {
  it('reproduces the shape of the story', () => {
    const r = measureAll(ROWS);
    expect(r.spread.pendingRows).toBe(r.clustered.pendingRows);
    expect(r.clustered.rowsExamined).toBeGreaterThan(r.spread.rowsExamined * 20);
    expect(r.fixed.rowsExamined).toBe(10);
    expect(r.fixed.plan).toContain('idx_orders_status_created');
  });
});
