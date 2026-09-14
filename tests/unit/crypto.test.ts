import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, generateRandomToken, timingSafeEqual } from '../../src/utils/crypto';

describe('Crypto Utilities', () => {
  it('should encrypt and decrypt string using AES-256-GCM', () => {
    const sensitiveData = 'whatsapp_session_creds_xyz_12345';
    const encrypted = encrypt(sensitiveData);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(sensitiveData);
    expect(encrypted.split(':')).toHaveLength(3); // iv:authTag:data

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(sensitiveData);
  });

  it('should generate secure random tokens', () => {
    const token1 = generateRandomToken(16);
    const token2 = generateRandomToken(16);

    expect(token1).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(token1).not.toBe(token2);
  });

  it('should perform timing-safe equality checks', () => {
    expect(timingSafeEqual('abcdef', 'abcdef')).toBe(true);
    expect(timingSafeEqual('abcdef', '123456')).toBe(false);
  });
});
