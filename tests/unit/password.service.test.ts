import { describe, it, expect } from 'vitest';
import { PasswordService } from '../../src/services/password.service';

describe('PasswordService', () => {
  it('should hash a password and verify correctly', async () => {
    const rawPassword = 'StrongPassword123!';
    const hash = await PasswordService.hash(rawPassword);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(rawPassword);

    const isValid = await PasswordService.compare(rawPassword, hash);
    expect(isValid).toBe(true);

    const isInvalid = await PasswordService.compare('WrongPassword', hash);
    expect(isInvalid).toBe(false);
  });
});
