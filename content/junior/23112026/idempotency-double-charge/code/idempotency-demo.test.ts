import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AMOUNT,
  KEY,
  SQL,
  addUniqueKey,
  chargeIdempotent,
  chargeWithoutKey,
  countPayments,
  createPayments,
  hasKey,
  insertWithKey,
  openShared,
} from './idempotency-demo';

const shared: ReturnType<typeof openShared>[] = [];
const fresh = () => {
  const s = openShared();
  shared.push(s);
  const a = s.open();
  createPayments(a);
  return { a, b: s.open() };
};
afterEach(() => {
  for (const s of shared.splice(0)) s.close();
});

describe('video SQL snippets (used verbatim in video.json)', () => {
  const video = JSON.parse(readFileSync(resolve(__dirname, '../video.json'), 'utf8')) as {
    scenes: { id: string; props: { code?: string | { text: string } } }[];
  };
  const codeOf = (id: string) => {
    const code = video.scenes.find((s) => s.id === id)?.props.code;
    return typeof code === 'string' ? code : code?.text;
  };
  it('are exactly the strings in the scenes', () => {
    expect(codeOf('unique-constraint')).toBe(SQL.addConstraint);
    expect(codeOf('select-then-insert')).toBe(SQL.checkThenInsert);
  });
});

describe('scene 2: retry without a key', () => {
  it('charges twice, the server cannot tell a retry from a new payment', () => {
    const { a } = fresh();
    chargeWithoutKey(a, AMOUNT);
    chargeWithoutKey(a, AMOUNT);
    expect(countPayments(a)).toBe(2);
  });
});

describe('scene 3: idempotency key checked in code', () => {
  it('charges once however many times the same key arrives', () => {
    const { a } = fresh();
    expect(chargeIdempotent(a, KEY, AMOUNT)).toBe('charged');
    for (let i = 0; i < 10; i += 1) expect(chargeIdempotent(a, KEY, AMOUNT)).toBe('replayed');
    expect(countPayments(a)).toBe(1);
  });
});

describe('scene 5: SELECT then INSERT', () => {
  it('lets two requests through when both SELECTs run before either INSERT', () => {
    const { a, b } = fresh();
    const seenByA = hasKey(a, KEY);
    const seenByB = hasKey(b, KEY);
    expect(seenByA).toBe(false);
    expect(seenByB).toBe(false);
    insertWithKey(a, KEY, AMOUNT);
    insertWithKey(b, KEY, AMOUNT);
    expect(countPayments(a)).toBe(2);
  });
});

describe('scene 4: unique constraint on the key', () => {
  it('rejects the second row with the same key even when the code check is bypassed', () => {
    const { a, b } = fresh();
    addUniqueKey(a);
    expect(hasKey(a, KEY)).toBe(false);
    expect(hasKey(b, KEY)).toBe(false);
    insertWithKey(a, KEY, AMOUNT);
    expect(() => insertWithKey(b, KEY, AMOUNT)).toThrow(/UNIQUE constraint failed/);
    expect(countPayments(a)).toBe(1);
  });
});
