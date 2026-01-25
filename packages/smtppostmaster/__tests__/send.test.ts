import { send, resetTransport } from '../src/index';
import { createSmtpCatcher } from './smtp-catcher';

describe('send', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    resetTransport();
    // Restore original env vars
    process.env = { ...originalEnv };
  });

  it('sends email via SMTP catcher with overrides', async () => {
    const catcher = await createSmtpCatcher();

    try {
      await send(
        {
          to: 'recipient@example.com',
          subject: 'SMTP postmaster test',
          text: 'Hello from the SMTP test.'
        },
        {
          host: catcher.host,
          port: catcher.port,
          secure: false,
          from: 'no-reply@example.com',
          tlsRejectUnauthorized: false
        }
      );

      const message = await catcher.waitForMessage(5000);

      expect(message.raw).toContain('Subject: SMTP postmaster test');
      expect(message.raw).toContain('Hello from the SMTP test.');
    } finally {
      await catcher.stop();
    }
  }, 10000);

  it('sends email using SMTP config from environment variables', async () => {
    const catcher = await createSmtpCatcher();

    // Set SMTP config via environment variables
    process.env.SMTP_HOST = catcher.host;
    process.env.SMTP_PORT = String(catcher.port);
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_FROM = 'env-sender@example.com';

    // Clear cached transport to pick up new env vars
    resetTransport();

    try {
      // Send without overrides - should use env vars
      await send({
        to: 'recipient@example.com',
        subject: 'Email from env config',
        text: 'This email was sent using env var configuration.'
      });

      const message = await catcher.waitForMessage(5000);

      expect(message.raw).toContain('Subject: Email from env config');
      expect(message.raw).toContain('This email was sent using env var configuration.');
      expect(message.raw).toContain('From: env-sender@example.com');
    } finally {
      await catcher.stop();
    }
  }, 10000);
});
