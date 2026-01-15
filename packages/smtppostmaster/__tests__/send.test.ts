import { send } from '../src/index';
import { createSmtpCatcher } from './smtp-catcher';

const applyEnv = (overrides: Record<string, string | undefined>) => {
  const previous: Record<string, string | undefined> = {};

  Object.keys(overrides).forEach((key) => {
    previous[key] = process.env[key];
    const value = overrides[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });

  return () => {
    Object.keys(overrides).forEach((key) => {
      const value = previous[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  };
};

describe('send', () => {
  it('sends email via SMTP catcher', async () => {
    const catcher = await createSmtpCatcher();
    const restoreEnv = applyEnv({
      SMTP_HOST: catcher.host,
      SMTP_PORT: String(catcher.port),
      SMTP_SECURE: 'false',
      SMTP_FROM: 'no-reply@example.com',
      SMTP_USER: undefined,
      SMTP_PASS: undefined,
      SMTP_REQUIRE_TLS: undefined,
      SMTP_TLS_REJECT_UNAUTHORIZED: 'false'
    });

    try {
      await send({
        to: 'recipient@example.com',
        subject: 'SMTP postmaster test',
        text: 'Hello from the SMTP test.'
      });

      const message = await catcher.waitForMessage(5000);

      expect(message.raw).toContain('Subject: SMTP postmaster test');
      expect(message.raw).toContain('Hello from the SMTP test.');
    } finally {
      restoreEnv();
      await catcher.stop();
    }
  }, 10000);
});
