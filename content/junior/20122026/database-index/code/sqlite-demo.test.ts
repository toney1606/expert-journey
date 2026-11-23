import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findByEmailIndexed, findByEmailScan } from './lookup';
import { buildTerminalScenes } from './scenes';
import {
  buildUsersDb,
  DEMO_EMAIL,
  emailFor,
  explain,
  INDEX_SQL,
  insertMs,
  lookupMs,
  objectBytes,
  Q,
} from './sqlite-demo';
import { columnsFor, pickFontSize, totalRows } from '../../../../../src/scenes/Terminal/timeline';

const ROWS = 200_000;
const read = <T>(name: string): T =>
  JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8')) as T;

describe('users table (SQLite via node:sqlite)', () => {
  const db = buildUsersDb(ROWS);
  const recent = '2024-06-01T00:00:00';

  it('is deterministic and has the requested number of rows', () => {
    expect(db.prepare('SELECT COUNT(*) AS n FROM users').get()?.n).toBe(ROWS);
    expect(emailFor(12345)).toBe(emailFor(12345));
    const again = buildUsersDb(1000);
    expect(again.prepare('SELECT email FROM users WHERE id = 7').get()?.email).toBe(emailFor(7));
  });

  it('the demo email is unique and found', () => {
    expect(db.prepare(Q.byDemoEmail).all()).toHaveLength(1);
  });

  // The planner steps run in order on one database, mirroring the video.
  it('a) no index: SCAN', () => {
    expect(explain(db, Q.byDemoEmail)).toBe('SCAN users');
  });

  it('b) after CREATE INDEX: SEARCH ... USING INDEX', () => {
    db.exec(INDEX_SQL.email);
    expect(explain(db, Q.byDemoEmail)).toBe('SEARCH users USING INDEX idx_users_email (email=?)');
  });

  it('c) lower(email) with the plain index still SCANs; an expression index fixes it', () => {
    expect(explain(db, Q.byLowerDemoEmail)).toBe('SCAN users');
    db.exec(INDEX_SQL.lowerEmail);
    expect(explain(db, Q.byLowerDemoEmail)).toMatch(
      /^SEARCH users USING INDEX idx_users_lower_email/,
    );
  });

  it('d) leading wildcard LIKE still SCANs', () => {
    expect(explain(db, Q.likeSuffix)).toBe('SCAN users');
  });

  it('e) composite (active, created_at): leftmost prefix', () => {
    db.exec(INDEX_SQL.composite);
    expect(explain(db, Q.activeRecent, recent)).toBe(
      'SEARCH users USING INDEX idx_users_active_created (active=? AND created_at>?)',
    );
    expect(explain(db, Q.recent, recent)).toBe('SCAN users');
  });

  it('index takes real space (dbstat)', () => {
    const table = objectBytes(db, 'users');
    const index = objectBytes(db, 'idx_users_email');
    expect(table).toBeGreaterThan(0);
    expect(index).toBeGreaterThan(table * 0.1);
  });

  it('indexed lookup is much faster than a scan (loose bound)', () => {
    const fresh = buildUsersDb(ROWS);
    const scan = lookupMs(fresh, 1, 5);
    fresh.exec(INDEX_SQL.email);
    const indexed = lookupMs(fresh, 500, 5);
    expect(scan / indexed).toBeGreaterThan(5);
  });
});

describe('insert cost', () => {
  it('more indexes make inserts slower (loose bound)', () => {
    const none = Math.min(insertMs([], 20_000), insertMs([], 20_000));
    const three = Math.min(
      insertMs(['email', 'name', 'created'], 20_000),
      insertMs(['email', 'name', 'created'], 20_000),
    );
    expect(three).toBeGreaterThan(none);
  });
});

describe('lookup.ts matches the code scene', () => {
  const scene = read<{ before: string; after: string }>('code-scene.json');
  it('is tiny and uses real lookup.ts functions', () => {
    for (const code of [scene.before, scene.after]) {
      const lines = code.split('\n');
      expect(lines.length).toBeLessThanOrEqual(6);
      for (const line of lines) expect(line.length).toBeLessThanOrEqual(36);
    }
    expect(scene.before).toContain(findByEmailScan.name);
    expect(scene.after).toContain(findByEmailIndexed.name);
    expect(scene.after).toContain('buildEmailIndex');
  });
});

describe('terminal-scenes.json', () => {
  const saved =
    read<Record<string, { command: string; output?: string }[]>>('terminal-scenes.json');
  const measured = read<{
    primary: { rows: number; scanMs: number; createIndexMs: number; indexedMs: number };
  }>('measurements.json');

  it('matches freshly generated plan text (timings come from measurements.json)', () => {
    const fresh = buildTerminalScenes(measured.primary);
    expect(saved).toEqual(fresh);
    expect(JSON.stringify(saved['stakes-scan'])).toContain('SCAN users');
    expect(JSON.stringify(saved['explain-proof'])).toContain('SEARCH users USING INDEX');
    expect(saved['pitfall-lower']?.[0]?.output).toBe('SCAN users');
    expect(DEMO_EMAIL).toBe('minh@gmail.com');
  });

  it('fit the Terminal scene without scrolling', () => {
    for (const lines of Object.values(saved)) {
      expect(lines.length).toBeLessThanOrEqual(4);
      const size = pickFontSize(lines, 732, 666);
      expect(totalRows(lines, columnsFor(732, size)) * size * 1.45).toBeLessThanOrEqual(666);
    }
  });
});

describe('measurements.json', () => {
  const m = read<{
    safeSpeedupFloor: number;
    primary: { speedup: number };
    insert: { oneIndexRatio: number; threeIndexesRatio: number };
  }>('measurements.json');
  it('records conservative, consistent ratios', () => {
    expect(m.safeSpeedupFloor).toBeLessThanOrEqual(m.primary.speedup);
    expect(m.safeSpeedupFloor).toBeGreaterThan(5);
    expect(m.insert.threeIndexesRatio).toBeGreaterThan(m.insert.oneIndexRatio);
    expect(m.insert.oneIndexRatio).toBeGreaterThan(1);
  });
});
