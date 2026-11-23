import { describe, expect, it } from 'vitest';
import { CalloutPropsSchema } from './schema';

const base = { kind: 'fact', statement: 'S' };

describe('CalloutPropsSchema', () => {
  it('accepts explanationAt together with explanation, and neither', () => {
    expect(
      CalloutPropsSchema.safeParse({ ...base, explanation: 'E', explanationAt: 'e' }).success,
    ).toBe(true);
    expect(CalloutPropsSchema.safeParse(base).success).toBe(true);
  });

  it('rejects explanationAt without explanation, naming the field', () => {
    const result = CalloutPropsSchema.safeParse({ ...base, explanationAt: 'e' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['explanationAt']);
    expect(result.error?.issues[0]?.message).toContain('explanation');
  });
});
