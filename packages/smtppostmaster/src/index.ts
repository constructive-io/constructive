import nodemailer, { SendMailOptions } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { getEnvOptions } from '@pgpmjs/env';
import { SmtpOptions } from '@pgpmjs/types';

type SendInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  headers?: Record<string, string>;
  attachments?: SendMailOptions['attachments'];
};

type TransportConfig = SMTPTransport.Options & {
  logger?: boolean;
  debug?: boolean;
  pool?: boolean;
  maxConnections?: number;
  maxMessages?: number;
};

const buildTransportOptions = (smtpOpts: SmtpOptions): TransportConfig => {
  const { host, port, secure, user, pass, requireTLS, tlsRejectUnauthorized, pool, maxConnections, maxMessages, name, logger, debug } = smtpOpts;

  if (!host) {
    throw new Error('Missing SMTP_HOST');
  }

  const resolvedPort = port ?? (secure ? 465 : 587);
  const resolvedSecure = secure ?? resolvedPort === 465;

  const auth = user
    ? {
        user,
        pass: pass ?? ''
      }
    : undefined;

  const options: TransportConfig = {
    host,
    port: resolvedPort,
    secure: resolvedSecure
  };

  if (auth) {
    options.auth = auth;
  }

  if (requireTLS !== undefined) {
    options.requireTLS = requireTLS;
  }

  if (tlsRejectUnauthorized !== undefined) {
    options.tls = {
      rejectUnauthorized: tlsRejectUnauthorized
    };
  }

  if (pool !== undefined) {
    options.pool = pool;
  }

  if (maxConnections !== undefined) {
    options.maxConnections = maxConnections;
  }

  if (maxMessages !== undefined) {
    options.maxMessages = maxMessages;
  }

  if (name) {
    options.name = name;
  }

  if (logger !== undefined) {
    options.logger = logger;
  }

  if (debug !== undefined) {
    options.debug = debug;
  }

  return options;
};

let transport: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | undefined;
let cachedSmtpOpts: SmtpOptions | undefined;

const getTransport = (overrides?: SmtpOptions) => {
  const opts = getEnvOptions(overrides ? { smtp: overrides } : {});
  const smtpOpts = opts.smtp ?? {};

  if (!transport || overrides) {
    transport = nodemailer.createTransport(buildTransportOptions(smtpOpts));
    cachedSmtpOpts = smtpOpts;
  }

  return { transport, smtpOpts: cachedSmtpOpts ?? smtpOpts };
};

const resolveFrom = (from: string | undefined, smtpOpts: SmtpOptions) => {
  const resolved = from ?? smtpOpts.from;
  if (!resolved) {
    throw new Error('Missing from address. Set SMTP_FROM or pass from in send().');
  }
  return resolved;
};

export const send = async (options: SendInput, smtpOverrides?: SmtpOptions) => {
  if (!options.to) {
    throw new Error('Missing "to"');
  }

  if (!options.subject) {
    throw new Error('Missing "subject"');
  }

  if (!options.html && !options.text) {
    throw new Error('Missing "html" or "text"');
  }

  const { transport: mailer, smtpOpts } = getTransport(smtpOverrides);

  const mailOptions: SendMailOptions = {
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    from: resolveFrom(options.from, smtpOpts),
    cc: options.cc,
    bcc: options.bcc,
    replyTo: options.replyTo ?? smtpOpts.replyTo,
    headers: options.headers,
    attachments: options.attachments
  };

  return mailer.sendMail(mailOptions);
};

export const resetTransport = () => {
  transport = undefined;
  cachedSmtpOpts = undefined;
};

export type { SendInput as SendOptions };
