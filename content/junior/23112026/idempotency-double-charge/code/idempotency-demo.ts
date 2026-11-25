import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/** SQL shown verbatim in the video (PostgreSQL syntax, laid out to fit the 830 px card without wrapping). */
export const SQL = {
  addConstraint:
    'ALTER TABLE payments\nADD CONSTRAINT\n  uq_payments_idem_key\nUNIQUE (idempotency_key);',
  checkThenInsert:
    "SELECT 1 FROM payments\nWHERE idempotency_key =\n  'a1b2-c3d4';\n-- không có dòng nào?\n-- → INSERT ...",
} as const;

export const KEY = 'a1b2-c3d4';
export const AMOUNT = 500_000;

/** Throwaway SQLite file shared by several connections (node:sqlite, no dependency). */
export const openShared = (): { open: () => DatabaseSync; close: () => void } => {
  const dir = mkdtempSync(join(tmpdir(), 'idem-'));
  const file = join(dir, 'payments.db');
  const handles: DatabaseSync[] = [];
  return {
    open: () => {
      const db = new DatabaseSync(file);
      handles.push(db);
      return db;
    },
    close: () => {
      for (const db of handles) db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
};

export const createPayments = (db: DatabaseSync): void => {
  db.exec(
    'CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY, idempotency_key TEXT, amount INTEGER NOT NULL)',
  );
};

/**
 * The effect of the PostgreSQL `ADD CONSTRAINT ... UNIQUE (idempotency_key)` in SQLite, which has no
 * `ALTER TABLE ... ADD CONSTRAINT`: a unique index on the same column.
 */
export const addUniqueKey = (db: DatabaseSync): void => {
  db.exec('CREATE UNIQUE INDEX uq_payments_idem_key ON payments (idempotency_key)');
};

export const countPayments = (db: DatabaseSync): number =>
  Number((db.prepare('SELECT COUNT(*) AS n FROM payments').get() as { n: number }).n);

/** The server of scene 2: it only sees "a new payment request", so every retry charges again. */
export const chargeWithoutKey = (db: DatabaseSync, amount: number): void => {
  db.prepare('INSERT INTO payments (idempotency_key, amount) VALUES (NULL, ?)').run(amount);
};

export const hasKey = (db: DatabaseSync, key: string): boolean =>
  db.prepare('SELECT 1 FROM payments WHERE idempotency_key = ?').get(key) !== undefined;

export const insertWithKey = (db: DatabaseSync, key: string, amount: number): void => {
  db.prepare('INSERT INTO payments (idempotency_key, amount) VALUES (?, ?)').run(key, amount);
};

/** Scene 3 fix, checked in code only: a known key returns the first result and charges nothing. */
export const chargeIdempotent = (
  db: DatabaseSync,
  key: string,
  amount: number,
): 'charged' | 'replayed' => {
  if (hasKey(db, key)) return 'replayed';
  insertWithKey(db, key, amount);
  return 'charged';
};
