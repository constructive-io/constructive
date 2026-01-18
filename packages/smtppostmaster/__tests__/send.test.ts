import { send, resetTransport } from '../src/index';
import { createSmtpCatcher } from './smtp-catcher';

describe('send', () => {
  afterEach(() => {
    resetTransport();
  });

  it('sends email via SMTP catcher', async () => {
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
});
