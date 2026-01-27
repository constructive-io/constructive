import { send, resetTransport } from '../src/index';
import { createSmtpCatcher } from './smtp-catcher';

describe('send', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    resetTransport();
    // Remove any env var added during the test
    for (const key of Object.keys(process.env)) {
      if (!(key in ORIGINAL_ENV)) {
        delete process.env[key];
      }
    }
    // Restore original values
    Object.assign(process.env, ORIGINAL_ENV);
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
    process.env.SMTP_TLS_REJECT_UNAUTHORIZED = 'false';
    process.env.SMTP_REQUIRE_TLS = 'false';

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

  it('overrides take precedence over environment variables', async () => {
    const catcher = await createSmtpCatcher();

    // Set env vars with WRONG port - would fail if used
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = '59999';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_FROM = 'env-sender@example.com';

    // Clear cached transport
    resetTransport();

    try {
      // Send with overrides - should use overrides (correct port), not env vars
      await send(
        {
          to: 'recipient@example.com',
          subject: 'Override test',
          text: 'This email should use override config, not env.'
        },
        {
          host: catcher.host,
          port: catcher.port, // Correct port from catcher
          secure: false,
          from: 'override-sender@example.com',
          tlsRejectUnauthorized: false
        }
      );

      const message = await catcher.waitForMessage(5000);

      expect(message.raw).toContain('Subject: Override test');
      expect(message.raw).toContain('This email should use override config');
      expect(message.raw).toContain('From: override-sender@example.com');
      expect(message.raw).not.toContain('From: env-sender@example.com');
    } finally {
      await catcher.stop();
    }
  }, 10000);
});
