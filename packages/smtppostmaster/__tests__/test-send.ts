import { parseEnvBoolean } from '@pgpmjs/env';
import { send } from '../src/index';
import { createSmtpCatcher } from './smtp-catcher';

const main = async () => {
  const useCatcher = parseEnvBoolean(process.env.SMTP_TEST_USE_CATCHER) ?? false;
  const catcher = useCatcher ? await createSmtpCatcher() : null;

  if (catcher) {
    process.env.SMTP_HOST = catcher.host;
    process.env.SMTP_PORT = String(catcher.port);
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_TLS_REJECT_UNAUTHORIZED = 'false';

    if (!process.env.SMTP_FROM && !process.env.SMTP_TEST_FROM) {
      process.env.SMTP_FROM = 'no-reply@example.com';
    }
  }

  const to =
    process.env.SMTP_TEST_TO ??
    process.env.SMTP_TO ??
    (catcher ? 'test-recipient@example.com' : undefined);
  if (!to) {
    throw new Error('Missing SMTP_TEST_TO (or SMTP_TO)');
  }

  const subject = process.env.SMTP_TEST_SUBJECT ?? 'SMTP postmaster test email';
  const html =
    process.env.SMTP_TEST_HTML ??
    '<p>This is a test email from @constructive-io/smtppostmaster.</p>';
  const text =
    process.env.SMTP_TEST_TEXT ??
    'This is a test email from @constructive-io/smtppostmaster.';
  const from = process.env.SMTP_TEST_FROM;

  const start = Date.now();

  try {
    const info = await send({
      to,
      subject,
      html,
      text,
      ...(from ? { from } : {})
    });

    if (catcher) {
      const message = await catcher.waitForMessage(5000);
      // eslint-disable-next-line no-console
      console.log('[smtppostmaster] Captured test email', {
        envelope: message.envelope,
        preview: message.raw.slice(0, 200)
      });
    }

    // eslint-disable-next-line no-console
    console.log('[smtppostmaster] Sent test email', {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
      timeMs: Date.now() - start
    });
  } finally {
    if (catcher) {
      await catcher.stop();
    }
  }
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[smtppostmaster] Failed to send test email', error);
  process.exitCode = 1;
});
