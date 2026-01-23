import Mailgun from 'mailgun.js';
import type { MailgunMessageData } from 'mailgun.js';
import FormData from 'form-data';
import { str, email, host, env } from '12factor-env';

/**
 * Mailgun configuration options
 */
export interface MailgunOptions {
  /** Mailgun API key */
  key?: string;
  /** Mailgun domain (e.g., 'mg.example.com') */
  domain?: string;
  /** Default sender email address */
  from?: string;
  /** Default reply-to email address */
  replyTo?: string;
  /** Development email address - when set, all emails are redirected to this address */
  devEmail?: string;
}

type SendInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
};

type MailgunClient = ReturnType<Mailgun['client']>;

// Validate environment variables at module load time (like the original @launchql/postmaster)
// This ensures env vars are validated once when the module is first imported
const envConfig = env(
  process.env,
  {
    MAILGUN_KEY: str()
  },
  {
    MAILGUN_DOMAIN: host(),
    MAILGUN_FROM: email(),
    MAILGUN_REPLY: email()
  }
);

// MAILGUN_DEV_EMAIL is read directly from process.env (not validated by 12factor-env)
// to match the original behavior where it was accessed but not in the env validation
const getEnvOptions = (): MailgunOptions => ({
  key: envConfig.MAILGUN_KEY,
  domain: envConfig.MAILGUN_DOMAIN,
  from: envConfig.MAILGUN_FROM,
  replyTo: envConfig.MAILGUN_REPLY,
  devEmail: process.env.MAILGUN_DEV_EMAIL
});

let client: MailgunClient | undefined;
let cachedMailgunOpts: MailgunOptions | undefined;

const getClient = (overrides?: MailgunOptions): { client: MailgunClient; mailgunOpts: MailgunOptions } => {
  const envOpts = getEnvOptions();
  const mailgunOpts: MailgunOptions = {
    ...envOpts,
    ...overrides
  };

  if (!client || overrides) {
    if (!mailgunOpts.key) {
      throw new Error('Missing MAILGUN_KEY');
    }
    if (!mailgunOpts.domain) {
      throw new Error('Missing MAILGUN_DOMAIN');
    }

    const mailgun = new Mailgun(FormData);
    client = mailgun.client({
      username: 'api',
      key: mailgunOpts.key
    });
    cachedMailgunOpts = mailgunOpts;
  }

  return { client, mailgunOpts: cachedMailgunOpts ?? mailgunOpts };
};

const resolveFrom = (from: string | undefined, mailgunOpts: MailgunOptions): string => {
  const resolved = from ?? mailgunOpts.from;
  if (!resolved) {
    throw new Error('Missing from address. Set MAILGUN_FROM or pass from in send().');
  }
  return resolved;
};

const resolveRecipient = (to: string | string[], mailgunOpts: MailgunOptions): string | string[] => {
  const devEmail = mailgunOpts.devEmail;
  if (!devEmail) {
    return to;
  }

  const [localPart, domainPart] = devEmail.split('@');
  const recipients = Array.isArray(to) ? to : [to];
  
  return recipients.map(recipient => {
    const encodedRecipient = recipient.replace('@', '_at_');
    return `${localPart}+${encodedRecipient}@${domainPart}`;
  });
};

export const send = async (options: SendInput, mailgunOverrides?: MailgunOptions): Promise<void> => {
  if (!options.to) {
    throw new Error('Missing "to"');
  }

  if (!options.subject) {
    throw new Error('Missing "subject"');
  }

  if (!options.html && !options.text) {
    throw new Error('Missing "html" or "text"');
  }

  const { client: mailgunClient, mailgunOpts } = getClient(mailgunOverrides);

  const to = resolveRecipient(options.to, mailgunOpts);
  const from = resolveFrom(options.from, mailgunOpts);
  const replyTo = options.replyTo ?? mailgunOpts.replyTo;

  const messageData: MailgunMessageData = {
    to: Array.isArray(to) ? to.join(',') : to,
    from,
    subject: options.subject,
    ...(options.html && { html: options.html }),
    ...(options.text && { text: options.text }),
    ...(replyTo && { 'h:Reply-To': replyTo })
  };

  await mailgunClient.messages.create(mailgunOpts.domain!, messageData);
};

export const resetClient = (): void => {
  client = undefined;
  cachedMailgunOpts = undefined;
};

export type { SendInput as SendOptions };
