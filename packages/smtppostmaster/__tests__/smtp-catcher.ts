import { AddressInfo } from 'net';
import { SMTPServer } from 'smtp-server';
import type { SMTPServerSession } from 'smtp-server';

export type CapturedMessage = {
  envelope: SMTPServerSession['envelope'];
  raw: string;
};

export type SmtpCatcher = {
  host: string;
  port: number;
  messages: CapturedMessage[];
  waitForMessage: (timeoutMs?: number) => Promise<CapturedMessage>;
  stop: () => Promise<void>;
};

const readStream = (stream: NodeJS.ReadableStream) =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    stream.on('error', (error) => {
      reject(error);
    });

    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });

export const createSmtpCatcher = async (options?: {
  host?: string;
  port?: number;
}): Promise<SmtpCatcher> => {
  const host = options?.host ?? '127.0.0.1';
  const messages: CapturedMessage[] = [];

  const server = new SMTPServer({
    disabledCommands: ['AUTH'],
    onData(stream, session, callback) {
      readStream(stream)
        .then((buffer) => {
          messages.push({
            envelope: session.envelope,
            raw: buffer.toString('utf8')
          });
          callback();
        })
        .catch((error) => callback(error));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(options?.port ?? 0, host, (error?: Error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

  const addressInfo = (
    server as unknown as { server?: { address: () => AddressInfo | string | null } }
  ).server?.address();

  if (!addressInfo || typeof addressInfo === 'string') {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    throw new Error('Failed to resolve SMTP catcher port');
  }

  const waitForMessage = (timeoutMs = 2000) =>
    new Promise<CapturedMessage>((resolve, reject) => {
      if (messages.length > 0) {
        resolve(messages[messages.length - 1]);
        return;
      }

      const interval = setInterval(() => {
        if (messages.length > 0) {
          clearInterval(interval);
          clearTimeout(timeout);
          resolve(messages[messages.length - 1]);
        }
      }, 20);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        reject(new Error('Timed out waiting for SMTP message'));
      }, timeoutMs);
    });

  const stop = () =>
    new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

  return {
    host,
    port: addressInfo.port,
    messages,
    waitForMessage,
    stop
  };
};
