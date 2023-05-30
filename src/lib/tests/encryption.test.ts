import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { decrypt, encrypt } from '../encryption';

describe('encryption module encrypts and decrypts data', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // clears the cache
    process.env = { ...OLD_ENV }; // Make a copy of the current environment
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore old environment
  });

  it('encrypts and decrypts string successfully', () => {
    process.env.ENCRYPTION_SECRET_KEY = 'TestSecretKey';
    process.env.ENCRYPTION_SECRET_INITIALIZATION_VECTOR = 'TestSecretInitializationVector';
    process.env.ENCRYPTION_METHOD = 'aes-256-cbc';

    const testString = 'TestString';
    const encryptedString = encrypt(testString);
    expect(encryptedString).not.toBe(testString);
    const decryptedString = decrypt(encryptedString);
    expect(decryptedString).toBe(testString);
  });
});
