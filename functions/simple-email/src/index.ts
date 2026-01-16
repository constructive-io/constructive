import { createJobApp } from '@constructive-io/knative-job-fn';
import { send as sendSmtp } from '@constructive-io/smtppostmaster';
import { parseEnvBoolean } from '@pgpmjs/env';
import { createLogger } from '@pgpmjs/logger';

type SimpleEmailPayload = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
};

export type SimpleEmailFunctionConfig = {
  dryRun?: boolean;
  useSmtp?: boolean;
  mailgunFrom?: string;
  smtpFrom?: string;
  envConfig?: NodeJS.ProcessEnv;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const getRequiredField = (
  payload: SimpleEmailPayload,
  field: keyof SimpleEmailPayload
) => {
  const value = payload[field];
  if (!isNonEmptyString(value)) {
    throw new Error(`Missing required field '${String(field)}'`);
  }
  return value;
};

const logger = createLogger('simple-email');
let cachedPostmasterSend: typeof sendSmtp | null = null;

const getPostmasterSend = (): typeof sendSmtp => {
  if (!cachedPostmasterSend) {
    const postmaster = require('@launchql/postmaster') as { send: typeof sendSmtp };
    cachedPostmasterSend = postmaster.send;
  }
  return cachedPostmasterSend;
};

const createSimpleEmailApp = (
  simpleEmailConfig: SimpleEmailFunctionConfig = {}
) => {
  const envConfig = simpleEmailConfig.envConfig ?? process.env;
  const isDryRun =
    typeof simpleEmailConfig.dryRun === 'boolean'
      ? simpleEmailConfig.dryRun
      : parseEnvBoolean(envConfig.SIMPLE_EMAIL_DRY_RUN) ?? false;
  const useSmtp =
    typeof simpleEmailConfig.useSmtp === 'boolean'
      ? simpleEmailConfig.useSmtp
      : parseEnvBoolean(envConfig.EMAIL_SEND_USE_SMTP) ?? false;
  const smtpFrom = simpleEmailConfig.smtpFrom ?? envConfig.SMTP_FROM;
  const mailgunFrom =
    simpleEmailConfig.mailgunFrom ?? envConfig.MAILGUN_FROM;

  const app = createJobApp();

  app.post('/', async (req: any, res: any, next: any) => {
    try {
      const payload = (req.body || {}) as SimpleEmailPayload;

      const to = getRequiredField(payload, 'to');
      const subject = getRequiredField(payload, 'subject');

      const html = isNonEmptyString(payload.html) ? payload.html : undefined;
      const text = isNonEmptyString(payload.text) ? payload.text : undefined;

      if (!html && !text) {
        throw new Error("Either 'html' or 'text' must be provided");
      }

      const fromEnv = useSmtp ? smtpFrom : mailgunFrom;
      const from = isNonEmptyString(payload.from)
        ? payload.from
        : isNonEmptyString(fromEnv)
          ? fromEnv
          : undefined;

      const replyTo = isNonEmptyString(payload.replyTo)
        ? payload.replyTo
        : undefined;

      const logContext = {
        to,
        subject,
        from,
        replyTo,
        hasHtml: Boolean(html),
        hasText: Boolean(text)
      };

      if (isDryRun) {
        logger.info('DRY RUN email (no send)', logContext);
      } else {
        // Send via the Postmaster package (Mailgun or configured provider)
        const sendEmail = useSmtp ? sendSmtp : getPostmasterSend();
        await sendEmail({
          to,
          subject,
          ...(html && { html }),
          ...(text && { text }),
          ...(from && { from }),
          ...(replyTo && { replyTo })
        });

        logger.info('Sent email', logContext);
      }

      res.status(200).json({ complete: true });
    } catch (err) {
      next(err);
    }
  });

  return app;
};

const app = createSimpleEmailApp();

export { createSimpleEmailApp };
export default app;

// When executed directly (e.g. `node dist/index.js` in Knative),
// start an HTTP server on the provided PORT (default 8080).
if (require.main === module) {
  const port = Number(process.env.PORT ?? 8080);
  // @constructive-io/knative-job-fn exposes a .listen method that delegates to the underlying Express app
  (app as any).listen(port, () => {
    logger.info(`listening on port ${port}`);
  });
}
