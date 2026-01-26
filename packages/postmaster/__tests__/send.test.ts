import { send, resetClient } from '../src';

// Mock mailgun.js to avoid actual API calls
jest.mock('mailgun.js', () => {
  return jest.fn().mockImplementation(() => ({
    client: jest.fn().mockReturnValue({
      messages: {
        create: jest.fn().mockResolvedValue({ id: 'mock-message-id' })
      }
    })
  }));
});

describe('send', () => {
  const ORIGINAL_ENV = { ...process.env };

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
});
