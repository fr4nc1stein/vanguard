/**
 * Unit tests for lib/crypto.ts
 * Tests AES-GCM-256 encryption, decryption, and SHA-256 hashing
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { encryptText, decryptText, hashValue } from '@/lib/crypto';

// Test key: 64 hex characters = 32 bytes
const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('Crypto Module', () => {
  describe('encryptText', () => {
    it('should encrypt plaintext and return ciphertext + iv', async () => {
      const plaintext = 'Hello, World!';
      const result = await encryptText(plaintext, TEST_KEY);

      expect(result).toHaveProperty('ciphertext');
      expect(result).toHaveProperty('iv');
      expect(result.ciphertext).toBeTruthy();
      expect(result.iv).toBeTruthy();
      expect(result.ciphertext).not.toBe(plaintext);
    });

    it('should generate unique IVs for each encryption', async () => {
      const plaintext = 'Same message';
      const result1 = await encryptText(plaintext, TEST_KEY);
      const result2 = await encryptText(plaintext, TEST_KEY);

      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.ciphertext).not.toBe(result2.ciphertext);
    });

    it('should encrypt unicode text correctly', async () => {
      const plaintext = 'こんにちは世界 🔐 émojis & special çhàracters';
      const result = await encryptText(plaintext, TEST_KEY);
      const decrypted = await decryptText(result.ciphertext, result.iv, TEST_KEY);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt empty string', async () => {
      const plaintext = '';
      const result = await encryptText(plaintext, TEST_KEY);
      const decrypted = await decryptText(result.ciphertext, result.iv, TEST_KEY);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt long text (10KB)', async () => {
      const plaintext = 'A'.repeat(10 * 1024);
      const result = await encryptText(plaintext, TEST_KEY);
      const decrypted = await decryptText(result.ciphertext, result.iv, TEST_KEY);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for missing key', async () => {
      // Set invalid key to test error path
      const originalEnv = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      await expect(encryptText('test', undefined as unknown as string))
        .rejects
        .toThrow('ENCRYPTION_KEY environment variable is not set');

      process.env.ENCRYPTION_KEY = originalEnv;
    });

    it('should throw error for invalid key format (too short)', async () => {
      await expect(encryptText('test', 'tooshort'))
        .rejects
        .toThrow('ENCRYPTION_KEY must be a 64-character hex string');
    });

    it('should throw error for invalid key format (odd length)', async () => {
      const invalidKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde';
      await expect(encryptText('test', invalidKey))
        .rejects
        .toThrow('ENCRYPTION_KEY must be a 64-character hex string');
    });

    it('should use environment key when no key provided', async () => {
      const originalEnv = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = TEST_KEY;

      const plaintext = 'Using env key';
      const result = await encryptText(plaintext);
      const decrypted = await decryptText(result.ciphertext, result.iv, TEST_KEY);

      expect(decrypted).toBe(plaintext);

      process.env.ENCRYPTION_KEY = originalEnv;
    });
  });

  describe('decryptText', () => {
    it('should decrypt ciphertext back to original plaintext', async () => {
      const originalText = 'Secret message for decryption';
      const encrypted = await encryptText(originalText, TEST_KEY);
      const decrypted = await decryptText(encrypted.ciphertext, encrypted.iv, TEST_KEY);

      expect(decrypted).toBe(originalText);
    });

    it('should correctly decrypt large payloads', async () => {
      const largeText = 'x'.repeat(50 * 1024);
      const encrypted = await encryptText(largeText, TEST_KEY);
      const decrypted = await decryptText(encrypted.ciphertext, encrypted.iv, TEST_KEY);

      expect(decrypted).toBe(largeText);
    });

    it('should throw error for wrong key', async () => {
      const plaintext = 'Secret';
      const encrypted = await encryptText(plaintext, TEST_KEY);

      const wrongKey = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

      await expect(decryptText(encrypted.ciphertext, encrypted.iv, wrongKey))
        .rejects
        .toThrow();
    });

    it('should throw error for tampered ciphertext', async () => {
      const plaintext = 'Original text';
      const encrypted = await encryptText(plaintext, TEST_KEY);

      // Tamper with the ciphertext
      const tamperedCiphertext = encrypted.ciphertext.slice(0, -4) + '0000';

      await expect(decryptText(tamperedCiphertext, encrypted.iv, TEST_KEY))
        .rejects
        .toThrow();
    });

    it('should throw error for invalid IV', async () => {
      const plaintext = 'Test';
      const encrypted = await encryptText(plaintext, TEST_KEY);

      await expect(decryptText(encrypted.ciphertext, 'invalidivhex00', TEST_KEY))
        .rejects
        .toThrow();
    });

    it('should throw error for truncated IV', async () => {
      const plaintext = 'Test';
      const encrypted = await encryptText(plaintext, TEST_KEY);

      // IV should be 24 hex chars (12 bytes), provide only 12
      const shortIv = encrypted.iv.slice(0, 12);

      await expect(decryptText(encrypted.ciphertext, shortIv, TEST_KEY))
        .rejects
        .toThrow();
    });

    it('should throw error for missing key', async () => {
      delete process.env.ENCRYPTION_KEY;

      await expect(decryptText('ciphertext', 'iv', undefined as unknown as string))
        .rejects
        .toThrow('ENCRYPTION_KEY environment variable is not set');
    });
  });

  describe('hashValue', () => {
    it('should return a 64-character hex string (SHA-256)', async () => {
      const hash = await hashValue('test input');

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent hashes for same input', async () => {
      const input = 'consistent-input';
      const hash1 = await hashValue(input);
      const hash2 = await hashValue(input);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', async () => {
      const hash1 = await hashValue('input1');
      const hash2 = await hashValue('input2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle unicode input', async () => {
      const hash = await hashValue('こんにちは世界 🔐');

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle empty string', async () => {
      const hash = await hashValue('');

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle very long input', async () => {
      const longInput = 'A'.repeat(100_000);
      const hash = await hashValue(longInput);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should hash IP addresses for privacy', async () => {
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';

      const hash1 = await hashValue(ip1);
      const hash2 = await hashValue(ip2);

      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toContain('192');
      expect(hash2).not.toContain('168');
    });
  });

  describe('Encryption Round-trip', () => {
    const testCases = [
      { name: 'basic ASCII', value: 'Hello, World!' },
      { name: 'email-like', value: 'test@example.com' },
      { name: 'JSON-like', value: '{"key":"value","number":123}' },
      { name: 'multiline', value: 'Line 1\nLine 2\nLine 3' },
      { name: 'special chars', value: '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~' },
      { name: 'unicode', value: '你好世界 مرحبا' },
      { name: 'base64-like', value: 'SGVsbG8gV29ybGQhIFRoaXMgaXMgYSB0ZXN0IG1lc3NhZ2U=' },
      { name: 'SQL injection attempt', value: "'; DROP TABLE users; --" },
      { name: 'XSS attempt', value: '<script>alert("XSS")</script>' },
    ];

    testCases.forEach(({ name, value }) => {
      it(`should correctly encrypt and decrypt ${name}`, async () => {
        const encrypted = await encryptText(value, TEST_KEY);
        const decrypted = await decryptText(encrypted.ciphertext, encrypted.iv, TEST_KEY);

        expect(decrypted).toBe(value);
      });
    });
  });

  describe('IV Uniqueness', () => {
    it('should never reuse IVs across multiple encryptions', async () => {
      const plaintext = 'Test message';
      const ivs = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const encrypted = await encryptText(plaintext, TEST_KEY);
        expect(ivs.has(encrypted.iv)).toBe(false);
        ivs.add(encrypted.iv);
      }

      expect(ivs.size).toBe(100);
    });
  });
});
