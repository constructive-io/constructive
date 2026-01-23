import Mailgun from 'mailgun.js';
import type { MailgunMessageData } from 'mailgun.js';
import FormData from 'form-data';
import { getEnvOptions } from '@pgpmjs/env';
import { MailgunOptions } from '@pgpmjs/types';

type SendInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
};

type MailgunClient = ReturnType<Mailgun['client']>;

let client: MailgunClient | undefined;
let cachedMailgunOpts: MailgunOptions | undefined;

const getClient = (overrides?: MailgunOptions): { client: MailgunClient; mailgunOpts: MailgunOptions } => {
  const opts = getEnvOptions({ mailgun: overrides });
  const mailgunOpts = opts.mailgun ?? {};

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
