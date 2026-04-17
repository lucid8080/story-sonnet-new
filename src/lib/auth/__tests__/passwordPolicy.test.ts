import { describe, expect, it } from 'vitest';
import { MIN_PASSWORD_LENGTH, validatePasswordPolicy } from '../passwordPolicy';

describe('validatePasswordPolicy', () => {
  it('accepts valid passwords', () => {
    expect(validatePasswordPolicy('abcd1234')).toBeNull();
    expect(validatePasswordPolicy('Password1')).toBeNull();
    expect(validatePasswordPolicy('a1bbbbbb')).toBeNull();
  });

  it('rejects passwords shorter than minimum length', () => {
    const msg = validatePasswordPolicy('ab1');
    expect(msg).toContain(`${MIN_PASSWORD_LENGTH}`);
    expect(msg).toContain('Password');
  });

  it('rejects passwords with no digit', () => {
    const msg = validatePasswordPolicy('abcdefgh');
    expect(msg).toContain('letter');
    expect(msg).toContain('number');
  });

  it('rejects passwords with no letter', () => {
    const msg = validatePasswordPolicy('12345678');
    expect(msg).toContain('letter');
    expect(msg).toContain('number');
  });

  it('uses change mode label for change', () => {
    expect(validatePasswordPolicy('short', 'change')).toContain('New password');
  });
});
