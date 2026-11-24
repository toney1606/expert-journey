import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  buildOrdersDb,
  clusterPendingOldest,
  countPending,
  explain,
  INDEX_NAMES,
  objectBytes,
  Q,
  queryMs,
  rowsExaminedBackwards,
  SQL,
} from './orders-demo';

const here = (name: string): string => fileURLToPath(new URL(name, import.meta.url));
const round = (x: number, digits: number): number => Number(x.toFixed(digits));

const LIMIT = 10;

export const measureScenario = (
  db: ReturnType<typeof buildOrdersDb>,
  rows: number,
  runs: number,
  reps = 1,
) => {
  const pending = countPending(db);
  const examined = rowsExaminedBackwards(db);
  return {
    pendingRows: pending,
    pendingShare: round(pending / rows, 4),
    rowsExamined: examined,
    rowsRemovedByFilter: examined - LIMIT,
    queryMs: round(queryMs(db, Q.pending, runs, reps), 4),
    plan: explain(db, Q.pending),
  };
};

export const measureAll = (rows: number) => {
  const t0 = performance.now();
  const db = buildOrdersDb(rows);
  const buildMs = performance.now() - t0;

  const spread = measureScenario(db, rows, 15, 200);
  clusterPendingOldest(db);
  const clustered = measureScenario(db, rows, 5);

  const fullIndexBytes = objectBytes(db, INDEX_NAMES.created);
  db.exec(SQL.partialIndex);
  const partialIndexBytes = objectBytes(db, INDEX_NAMES.partial);
  const partialPlan = explain(db, Q.pending);
  db.exec(`DROP INDEX ${INDEX_NAMES.partial}`);

  db.exec(SQL.compositeIndex);
  const fixedExamined = db.prepare(Q.pending).all().length;
  const fixed = {
    ...measureScenario(db, rows, 15, 200),
    rowsExamined: fixedExamined,
    rowsRemovedByFilter: 0,
  };

  const page1Ms = queryMs(db, Q.page1, 15, 200);
  const page10000Ms = queryMs(db, Q.page10000, 9, 1);
  const pagePlan = explain(db, Q.page10000);
  db.close();

  return {
    rows,
    buildMs: round(buildMs, 0),
    spread,
    clustered,
    fixed,
    partialIndex: {
      fullIndexBytes,
      partialIndexBytes,
      ratio: round(fullIndexBytes / partialIndexBytes, 1),
      plan: partialPlan,
    },
    pagination: { page1Ms: round(page1Ms, 4), page10000Ms: round(page10000Ms, 3), plan: pagePlan },
  };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = Number(process.env.ORDERS_ROWS ?? 10_000_000);
  const start = performance.now();
  const m = measureAll(rows);
  const out = {
    note: 'Raw ms are machine dependent; quote ratios. All numbers are SQLite (node:sqlite), not Postgres: Postgres EXPLAIN ANALYZE "Rows Removed by Filter" is a different engine output of the same mechanism. rowsRemoved = rows skipped by the status filter while walking idx_orders_created_at (examined - 10).',
    engine: 'node:sqlite (SQLite via DatabaseSync, in-memory)',
    generatedBy: 'pnpm exec tsx content/junior/23112026/database-index-guess/code/measure.ts',
    sizeMethod: 'SUM(pgsize) FROM dbstat WHERE name = <index>',
    rows: m.rows,
    summary: {
      fastMs: m.spread.queryMs,
      slowMs: m.clustered.queryMs,
      slowToFastRatio: round(m.clustered.queryMs / m.spread.queryMs, 0),
      rowsExaminedSpread: m.spread.rowsExamined,
      rowsRemoved: m.clustered.rowsRemovedByFilter,
      rowsExaminedClustered: m.clustered.rowsExamined,
      rowsExaminedFixed: m.fixed.rowsExamined,
      fixedMs: m.fixed.queryMs,
      page1Ms: m.pagination.page1Ms,
      page10000Ms: m.pagination.page10000Ms,
      partialIndexRatio: m.partialIndex.ratio,
    },
    ...m,
    measureSeconds: round((performance.now() - start) / 1000, 0),
  };
  writeFileSync(here('measurements.json'), `${JSON.stringify(out, null, 2)}\n`);
  console.log(JSON.stringify(out, null, 2));
}
