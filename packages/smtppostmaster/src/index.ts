import nodemailer, { SendMailOptions } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { parseEnvBoolean, parseEnvNumber } from '@pgpmjs/env';

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

const parseNumberFromEnv = (name: string) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return undefined;
  }

  const parsed = parseEnvNumber(raw);
  if (parsed === undefined) {
    throw new Error(`${name} must be a number`);
  }

  return parsed;
};

const buildTransportOptions = (): TransportConfig => {
  const host = process.env.SMTP_HOST;
  if (!host) {
    throw new Error('Missing SMTP_HOST');
  }

  const portFromEnv = parseNumberFromEnv('SMTP_PORT');
  const secureFromEnv = parseEnvBoolean(process.env.SMTP_SECURE);

  const resolvedPort = portFromEnv ?? (secureFromEnv ? 465 : 587);
  const resolvedSecure = secureFromEnv ?? resolvedPort === 465;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const auth = user
    ? {
        user,
        pass: pass ?? ''
      }
    : undefined;

  const requireTLS = parseEnvBoolean(process.env.SMTP_REQUIRE_TLS);
  const tlsRejectUnauthorized = parseEnvBoolean(process.env.SMTP_TLS_REJECT_UNAUTHORIZED);
  const pool = parseEnvBoolean(process.env.SMTP_POOL);
  const maxConnections = parseNumberFromEnv('SMTP_MAX_CONNECTIONS');
  const maxMessages = parseNumberFromEnv('SMTP_MAX_MESSAGES');
  const name = process.env.SMTP_NAME;
  const logger = parseEnvBoolean(process.env.SMTP_LOGGER);
  const debug = parseEnvBoolean(process.env.SMTP_DEBUG);

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

const getTransport = () => {
  if (!transport) {
    transport = nodemailer.createTransport(buildTransportOptions());
  }

  return transport;
};

const resolveFrom = (from?: string) => {
  const resolved = from ?? process.env.SMTP_FROM;
  if (!resolved) {
    throw new Error('Missing from address. Set SMTP_FROM or pass from in send().');
  }
  return resolved;
};

export const send = async (options: SendInput) => {
  if (!options.to) {
    throw new Error('Missing "to"');
  }

  if (!options.subject) {
    throw new Error('Missing "subject"');
  }

  if (!options.html && !options.text) {
    throw new Error('Missing "html" or "text"');
  }

  const mailOptions: SendMailOptions = {
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    from: resolveFrom(options.from),
    cc: options.cc,
    bcc: options.bcc,
    replyTo: options.replyTo ?? process.env.SMTP_REPLY_TO,
    headers: options.headers,
    attachments: options.attachments
  };

  return getTransport().sendMail(mailOptions);
};

export type { SendInput as SendOptions };
