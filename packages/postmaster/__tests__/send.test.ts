import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { send, resetClient } from '../src';

// Enhanced mock to capture actual arguments passed to messages.create
const mockCreate = jest.fn().mockResolvedValue({ id: 'mock-message-id' });

jest.mock('mailgun.js', () => {
  return jest.fn().mockImplementation(() => ({
    client: jest.fn().mockReturnValue({
      messages: { create: mockCreate }
    })
  }));
});

describe('send', () => {
  const ORIGINAL_ENV = { ...process.env };
  const testDir = join(tmpdir(), 'postmaster-test-' + process.pid);

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    try {
      rmSync(testDir, { recursive: true });
    } catch {
      // ignore cleanup errors
    }
  });

  beforeEach(() => {
    mockCreate.mockClear();
  });

  afterEach(() => {
    resetClient();
    // Remove any env var added during the test
    for (const key of Object.keys(process.env)) {
      if (!(key in ORIGINAL_ENV)) {
        delete process.env[key];
      }
    }
    // Restore original values
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it('should not throw ReferenceError when MAILGUN_DOMAIN is set in env', async () => {
    process.env.MAILGUN_KEY = 'test-api-key';
    process.env.MAILGUN_DOMAIN = 'mg.example.com';
    process.env.MAILGUN_FROM = 'sender@example.com';
    process.env.MAILGUN_REPLY = 'reply@example.com';

    // This should not throw ReferenceError when accessing vars
    // The bug was that secretEnv used varEnv instead of inputEnv
    await expect(
      send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body'
      })
    ).resolves.not.toThrow();
  });

  it('should throw error when "to" is missing', async () => {
    process.env.MAILGUN_KEY = 'test-api-key';
    process.env.MAILGUN_DOMAIN = 'mg.example.com';
    process.env.MAILGUN_FROM = 'sender@example.com';
    process.env.MAILGUN_REPLY = 'reply@example.com';

    await expect(
      send({
        to: '',
        subject: 'Test',
        text: 'Test'
      })
    ).rejects.toThrow('Missing "to"');
  });

  it('should throw error when "subject" is missing', async () => {
    process.env.MAILGUN_KEY = 'test-api-key';
    process.env.MAILGUN_DOMAIN = 'mg.example.com';
    process.env.MAILGUN_FROM = 'sender@example.com';
    process.env.MAILGUN_REPLY = 'reply@example.com';

    await expect(
      send({
        to: 'test@example.com',
        subject: '',
        text: 'Test'
      })
    ).rejects.toThrow('Missing "subject"');
  });

  it('should throw error when both "html" and "text" are missing', async () => {
    process.env.MAILGUN_KEY = 'test-api-key';
    process.env.MAILGUN_DOMAIN = 'mg.example.com';
    process.env.MAILGUN_FROM = 'sender@example.com';
    process.env.MAILGUN_REPLY = 'reply@example.com';

    await expect(
      send({
        to: 'test@example.com',
        subject: 'Test'
      })
    ).rejects.toThrow('Missing "html" or "text"');
  });

  it('should send email when MAILGUN_DEV_EMAIL is set', async () => {
    process.env.MAILGUN_KEY = 'test-api-key';
    process.env.MAILGUN_DOMAIN = 'mg.example.com';
    process.env.MAILGUN_FROM = 'sender@example.com';
    process.env.MAILGUN_REPLY = 'reply@example.com';
    process.env.MAILGUN_DEV_EMAIL = 'dev@example.com';

    await expect(
      send({
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test body'
      })
    ).resolves.not.toThrow();
  });

  describe('file-based secrets', () => {
    it('C1: MAILGUN_KEY_FILE only (no MAILGUN_KEY) → send succeeds', async () => {
      const keyPath = join(testDir, 'mailgun-key');
      writeFileSync(keyPath, 'file-api-key');

      process.env.MAILGUN_KEY_FILE = keyPath;
      process.env.MAILGUN_DOMAIN = 'mg.example.com';
      process.env.MAILGUN_FROM = 'sender@example.com';
      process.env.MAILGUN_REPLY = 'reply@example.com';
      // No MAILGUN_KEY set directly

      await expect(
        send({ to: 'test@example.com', subject: 'Test', text: 'Body' })
      ).resolves.not.toThrow();

      unlinkSync(keyPath);
    });
  });

  describe('resetClient behavior', () => {
    it('C2: resetClient() forces env re-read', async () => {
      process.env.MAILGUN_KEY = 'key1';
      process.env.MAILGUN_DOMAIN = 'domain-a.com';
      process.env.MAILGUN_FROM = 'sender@example.com';
      process.env.MAILGUN_REPLY = 'reply@example.com';

      await send({ to: 'test@example.com', subject: 'Test', text: 'Body' });
      const firstDomain = mockCreate.mock.calls[0][0]; // Capture domain arg

      // Change env and reset
      process.env.MAILGUN_DOMAIN = 'domain-b.com';
      resetClient();

      await send({ to: 'test@example.com', subject: 'Test', text: 'Body' });
      const secondDomain = mockCreate.mock.calls[1][0];

      expect(firstDomain).toBe('domain-a.com');
      expect(secondDomain).toBe('domain-b.com');
    });
  });

  describe('missing configuration errors', () => {
    it('D1: Missing MAILGUN_DOMAIN → throw', async () => {
      process.env.MAILGUN_KEY = 'test-key';
      delete process.env.MAILGUN_DOMAIN;
      process.env.MAILGUN_FROM = 'sender@example.com';
      process.env.MAILGUN_REPLY = 'reply@example.com';

      await expect(
        send({ to: 'test@example.com', subject: 'Test', text: 'Body' })
      ).rejects.toThrow(/MAILGUN_DOMAIN/);
    });

    it('D2: Missing MAILGUN_KEY → throw', async () => {
      delete process.env.MAILGUN_KEY;
      delete process.env.MAILGUN_KEY_FILE;
      process.env.MAILGUN_DOMAIN = 'mg.example.com';
      process.env.MAILGUN_FROM = 'sender@example.com';
      process.env.MAILGUN_REPLY = 'reply@example.com';

      await expect(
        send({ to: 'test@example.com', subject: 'Test', text: 'Body' })
      ).rejects.toThrow(/MAILGUN_KEY/);
    });
  });

  describe('API error propagation', () => {
    it('D3: Mailgun client rejects → error propagates', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Mailgun API error'));

      process.env.MAILGUN_KEY = 'test-key';
      process.env.MAILGUN_DOMAIN = 'mg.example.com';
      process.env.MAILGUN_FROM = 'sender@example.com';
      process.env.MAILGUN_REPLY = 'reply@example.com';

      await expect(
        send({ to: 'test@example.com', subject: 'Test', text: 'Body' })
      ).rejects.toThrow('Mailgun API error');
    });
  });

  describe('dev email rewriting', () => {
    it('D4: MAILGUN_DEV_EMAIL rewrites recipient deterministically', async () => {
      process.env.MAILGUN_KEY = 'test-key';
      process.env.MAILGUN_DOMAIN = 'mg.example.com';
      process.env.MAILGUN_FROM = 'sender@example.com';
      process.env.MAILGUN_REPLY = 'reply@example.com';
      process.env.MAILGUN_DEV_EMAIL = 'dev@example.com';

      await send({ to: 'user@foo.com', subject: 'Test', text: 'Body' });

      // Verify the 'to' field passed to messages.create
      const createCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1];
      expect(createCall[1].to).toContain('dev+user_at_foo.com@example.com');
    });
  });
});
