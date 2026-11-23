import { describe, expect, it } from 'vitest';
import { ComparePropsSchema } from './schema';

const base = { title: 'T', left: { label: 'A' }, right: { label: 'B' } };

describe('ComparePropsSchema', () => {
  it('accepts verdictAt together with verdict, and neither', () => {
    expect(ComparePropsSchema.safeParse({ ...base, verdict: 'V', verdictAt: 'v' }).success).toBe(
      true,
    );
    expect(ComparePropsSchema.safeParse(base).success).toBe(true);
  });

  it('rejects verdictAt without verdict, naming the field', () => {
    const result = ComparePropsSchema.safeParse({ ...base, verdictAt: 'v' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['verdictAt']);
    expect(result.error?.issues[0]?.message).toContain('verdict');
  });
});
