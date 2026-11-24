// The port of a generated app's dev server, which a project keeps between servers.

import { createServer } from 'node:net';

const PORT_RETRY_MS = 200;

/** The localhost port of a dev server URL; none for any other URL. */
function portOf(url: string | undefined): number | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'localhost' && parsed.port ? Number(parsed.port) : undefined;
  } catch {
    return undefined;
  }
}

/** The port a project's Preview last used, which its next dev server keeps. */
export function previewPortOf(
  project: Readonly<{ devServerUrl?: string; previewUrl?: string }> | undefined,
): number | undefined {
  return portOf(project?.devServerUrl ?? project?.previewUrl);
}

/**
 * A free port: `preferred` when it can be had, else any. `waitMs` keeps asking
 * for `preferred` that long first, for a port our own server is still letting
 * go of: the Preview's origin carries it, and the database's CORS lists name it.
 */
export async function freePort(preferred?: number, waitMs = 0): Promise<number> {
  const listen = (port: number) =>
    new Promise<number>((resolve, reject) => {
      const server = createServer();
      server.unref();
      server.once('error', reject);
      server.listen(port, () => {
        const address = server.address();
        const chosen = typeof address === 'object' && address ? address.port : port;
        server.close(() => resolve(chosen));
      });
    });
  if (!preferred) return listen(0);
  const deadline = Date.now() + waitMs;
  for (;;) {
    try {
      return await listen(preferred);
    } catch {
      if (Date.now() >= deadline) return listen(0);
      await new Promise((resolve) => setTimeout(resolve, PORT_RETRY_MS));
    }
  }
}
