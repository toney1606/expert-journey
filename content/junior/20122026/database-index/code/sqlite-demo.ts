import { DatabaseSync } from 'node:sqlite';

/** Deterministic users table backed by SQLite (node:sqlite, no dependency). */
export const DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com', 'company.vn'];

const BASE_TIME = Date.UTC(2024, 0, 1);

export const emailFor = (id: number): string => {
  // Knuth multiplicative hash: scatters ids so emails are not sorted by id.
  const scattered = Math.imul(id, 2654435761) >>> 0;
  return `u${scattered.toString(36)}@${DOMAINS[id % DOMAINS.length]}`;
};

export const createdAtFor = (id: number): string =>
  new Date(BASE_TIME + ((Math.imul(id, 40503) >>> 0) % 31_536_000) * 1000)
    .toISOString()
    .slice(0, 19);

export const openDb = (file = ':memory:'): DatabaseSync => new DatabaseSync(file);

export const createUsersTable = (db: DatabaseSync): void => {
  db.exec(
    'CREATE TABLE users(id INTEGER PRIMARY KEY, email TEXT, name TEXT, active INTEGER, created_at TEXT)',
  );
};

export const insertUsers = (db: DatabaseSync, from: number, to: number): void => {
  const stmt = db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)');
  db.exec('BEGIN');
  for (let id = from; id < to; id += 1) {
    stmt.run(id, emailFor(id), `User ${id}`, id % 10 < 7 ? 1 : 0, createdAtFor(id));
  }
  db.exec('COMMIT');
};

export const buildUsersDb = (rows: number, file = ':memory:'): DatabaseSync => {
  const db = openDb(file);
  createUsersTable(db);
  insertUsers(db, 1, rows + 1);
  // One known, unique, existing email so the terminal scene can show a literal query.
  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(DEMO_EMAIL, Math.floor(rows / 2));
  return db;
};

export const squash = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** Real EXPLAIN QUERY PLAN detail text, whitespace-normalised, one line per plan row. */
export const explain = (db: DatabaseSync, sql: string, ...params: (string | number)[]): string =>
  db
    .prepare(`EXPLAIN QUERY PLAN ${sql}`)
    .all(...params)
    .map((row) => squash(String(row.detail)))
    .join('\n');

export const DEMO_EMAIL = 'minh@gmail.com';

export const Q = {
  byDemoEmail: `SELECT * FROM users WHERE email = '${DEMO_EMAIL}'`,
  byEmail: 'SELECT * FROM users WHERE email = ?',
  byLowerEmail: 'SELECT * FROM users WHERE lower(email) = ?',
  likeSuffix: "SELECT * FROM users WHERE email LIKE '%@gmail.com'",
  activeRecent: 'SELECT * FROM users WHERE active = 1 AND created_at > ?',
  recent: 'SELECT * FROM users WHERE created_at > ?',
  active: 'SELECT * FROM users WHERE active = 1',
  byLowerDemoEmail: `SELECT * FROM users WHERE lower(email) = '${DEMO_EMAIL}'`,
} as const;

export const INDEX_SQL = {
  email: 'CREATE INDEX idx_users_email ON users(email)',
  name: 'CREATE INDEX idx_users_name ON users(name)',
  created: 'CREATE INDEX idx_users_created ON users(created_at)',
  composite: 'CREATE INDEX idx_users_active_created ON users(active, created_at)',
  active: 'CREATE INDEX idx_users_active ON users(active)',
  lowerEmail: 'CREATE INDEX idx_users_lower_email ON users(lower(email))',
} as const;

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

/** Median ms per execution of the demo lookup; each run executes it `reps` times. */
export const lookupMs = (db: DatabaseSync, reps: number, runs = 9): number => {
  const stmt = db.prepare(Q.byDemoEmail);
  return (
    medianMs(() => {
      for (let i = 0; i < reps; i += 1) stmt.get();
    }, runs) / reps
  );
};

export const insertMs = (indexes: (keyof typeof INDEX_SQL)[], rows: number): number => {
  const db = openDb();
  createUsersTable(db);
  for (const key of indexes) db.exec(INDEX_SQL[key]);
  const start = performance.now();
  insertUsers(db, 1, rows + 1);
  const ms = performance.now() - start;
  db.close();
  return ms;
};

export type MeasuredLookup = {
  rows: number;
  scanMs: number;
  createIndexMs: number;
  indexedMs: number;
};
