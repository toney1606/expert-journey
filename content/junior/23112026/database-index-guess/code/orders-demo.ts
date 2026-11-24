import { DatabaseSync } from 'node:sqlite';

/** Deterministic orders table backed by SQLite (node:sqlite, no dependency). */
export const PENDING_SHARE = 0.05;
export const LIMIT = 10;
const BASE_TIME = 1_700_000_000;
const PADDING = 'order-payload-0123456789';

/** SQL shown verbatim in the video (multi-line form). */
export const SQL = {
  query: "SELECT * FROM orders\nWHERE status = 'pending'\nORDER BY created_at DESC\nLIMIT 10;",
  compositeIndex: 'CREATE INDEX idx_orders_status_created\nON orders (status, created_at);',
  partialIndex:
    "CREATE INDEX idx_orders_pending\nON orders (created_at)\nWHERE status = 'pending';",
  offsetPage: 'SELECT * FROM orders\nORDER BY created_at DESC\nLIMIT 10 OFFSET 99990;',
} as const;

export const squash = (text: string): string => text.replace(/\s+/g, ' ').trim();

const SQL_PAGE1 = 'SELECT * FROM orders ORDER BY created_at DESC LIMIT 10 OFFSET 0';
export const Q = {
  pending: squash(SQL.query).replace(/;$/, ''),
  countPending: "SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'",
  newestStatuses: 'SELECT status FROM orders ORDER BY created_at DESC',
  page1: SQL_PAGE1,
  page10000: squash(SQL.offsetPage).replace(/;$/, ''),
} as const;

export const INDEX_NAMES = {
  created: 'idx_orders_created_at',
  composite: 'idx_orders_status_created',
  partial: 'idx_orders_pending',
} as const;

/** Seeded PRNG (mulberry32): deterministic, no Math.random. */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) as number;
  };
};

export const openDb = (file = ':memory:'): DatabaseSync => new DatabaseSync(file);

/**
 * Orders with created_at strictly increasing with id. ~5% are 'pending', spread
 * uniformly at random (seeded). The index on created_at is created after the bulk insert.
 */
export const buildOrdersDb = (rows: number, seed = 42): DatabaseSync => {
  const db = openDb();
  db.exec(
    'CREATE TABLE orders(id INTEGER PRIMARY KEY, status TEXT NOT NULL, created_at INTEGER NOT NULL, padding TEXT)',
  );
  const rand = mulberry32(seed);
  const stmt = db.prepare('INSERT INTO orders VALUES (?, ?, ?, ?)');
  db.exec('BEGIN');
  for (let id = 1; id <= rows; id += 1) {
    stmt.run(id, rand() < PENDING_SHARE ? 'pending' : 'done', BASE_TIME + id * 2, PADDING);
  }
  db.exec('COMMIT');
  db.exec(`CREATE INDEX ${INDEX_NAMES.created} ON orders (created_at)`);
  return db;
};

export const countPending = (db: DatabaseSync): number =>
  Number(db.prepare(Q.countPending).get()?.n ?? 0);

/**
 * "Auto-approve": the SAME number of pending rows, but now all of them are the oldest
 * ones; everything newer is 'done'. Returns the pending count.
 */
export const clusterPendingOldest = (db: DatabaseSync): number => {
  const pending = countPending(db);
  db.prepare("UPDATE orders SET status = CASE WHEN id <= ? THEN 'pending' ELSE 'done' END").run(
    pending,
  );
  return pending;
};

export const explain = (db: DatabaseSync, sql: string): string =>
  db
    .prepare(`EXPLAIN QUERY PLAN ${sql}`)
    .all()
    .map((row) => squash(String(row.detail)))
    .join('\n');

/**
 * Rows visited while walking the created_at index backwards (newest first) until `limit`
 * pending rows are found: exactly the work the video query does when it uses that index.
 */
export const rowsExaminedBackwards = (db: DatabaseSync, limit = LIMIT): number => {
  let examined = 0;
  let found = 0;
  for (const row of db.prepare(Q.newestStatuses).iterate()) {
    examined += 1;
    if (row.status === 'pending') found += 1;
    if (found === limit) break;
  }
  return examined;
};

/** Rows examined by walking an index on (status, created_at): only matching rows are read. */
export const rowsReturned = (db: DatabaseSync): number => db.prepare(Q.pending).all().length;

/** Bytes used by one index (or the table) via the dbstat virtual table. */
export const objectBytes = (db: DatabaseSync, name: string): number =>
  Number(
    db.prepare('SELECT SUM(pgsize) AS bytes FROM dbstat WHERE name = ?').get(name)?.bytes ?? 0,
  );

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

/** Median wall time (ms) of `runs` executions of fn. */
export const medianMs = (fn: () => void, runs = 7): number => {
  const times: number[] = [];
  for (let i = 0; i < runs; i += 1) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  return median(times);
};

/** Median ms of one execution of `sql` (all rows fetched). */
export const queryMs = (db: DatabaseSync, sql: string, runs = 7, reps = 1): number => {
  const stmt = db.prepare(sql);
  return (
    medianMs(() => {
      for (let i = 0; i < reps; i += 1) stmt.all();
    }, runs) / reps
  );
};
