import { getEnvOptions } from '@pgpmjs/env';
import { SmtpOptions } from '@pgpmjs/types';
import { send } from '../src/index';
import { createSmtpCatcher } from './smtp-catcher';

const parseEnvBoolean = (val?: string): boolean | undefined => {
  if (val === undefined) return undefined;
  return ['true', '1', 'yes'].includes(val.toLowerCase());
};

const main = async () => {
  const useCatcher = parseEnvBoolean(process.env.SMTP_TEST_USE_CATCHER) ?? false;
  const catcher = useCatcher ? await createSmtpCatcher() : null;

  const envOpts = getEnvOptions();
  const smtpFromEnv = envOpts.smtp ?? {};

  const smtpOverrides: SmtpOptions = catcher
    ? {
        host: catcher.host,
        port: catcher.port,
        secure: false,
        tlsRejectUnauthorized: false,
        from: smtpFromEnv.from ?? process.env.SMTP_TEST_FROM ?? 'no-reply@example.com'
      }
    : {};

  const to =
    process.env.SMTP_TEST_TO ??
    (catcher ? 'test-recipient@example.com' : smtpFromEnv.from);
  if (!to) {
    throw new Error('Missing SMTP_TEST_TO');
  }

  const subject = process.env.SMTP_TEST_SUBJECT ?? 'SMTP postmaster test email';
  const html =
    process.env.SMTP_TEST_HTML ??
    '<p>This is a test email from simple-smtp-server.</p>';
  const text =
    process.env.SMTP_TEST_TEXT ??
    'This is a test email from simple-smtp-server.';
  const from = process.env.SMTP_TEST_FROM;

  const start = Date.now();

  try {
    const info = await send(
      {
        to,
        subject,
        html,
        text,
        ...(from ? { from } : {})
      },
      smtpOverrides
    );

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
