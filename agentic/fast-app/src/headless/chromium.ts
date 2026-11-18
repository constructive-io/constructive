// A headless Chromium for the render check, driven over its debugging pipe
// (`--remote-debugging-pipe`: commands on fd 3, answers on fd 4, each message
// ended by a NUL byte). A pipe opens no port, so no other process in the pod
// can reach the browser, or the owner's session in its page.

import { type ChildProcess, spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import type { Readable, Writable } from 'node:stream';

import { childEnv, killTree } from '../pipeline/command';
import { CdpConnection, type CdpTransport } from './cdp';

export type Browser = {
  cdp: CdpConnection;
  /** The browser's pid, which is also its process group's id. */
  pid?: number;
  /** Closes the browser and removes its profile. */
  close(): Promise<void>;
};

export type LaunchOptions = {
  chromiumPath: string;
  /** Where the browser's profile folder is made; it is removed on close. */
  stateDir: string;
  /** How long the browser may take to answer its first command. */
  startTimeoutMs: number;
};

const CLOSE_GRACE_MS = 2_000;
const STDERR_TAIL = 2_000;

/**
 * The flags of a browser that runs in a pod: as root with no user namespace
 * (`--no-sandbox`), with a 64 MB /dev/shm (`--disable-dev-shm-usage`). The
 * page calls the app's API on another origin, whose CORS lists name the
 * desktop's Preview and not the pod's dev server, so web security is off: a
 * refusal there would say nothing about the app.
 */
export const CHROMIUM_FLAGS = [
  '--headless=new',
  '--remote-debugging-pipe',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-web-security',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-sync',
  '--mute-audio',
  '--window-size=1280,800'
];

/** The pipe as a CDP transport: one message per NUL-ended chunk. */
export function pipeTransport(child: ChildProcess, toBrowser: Writable, fromBrowser: Readable): CdpTransport {
  const messages = new Set<(message: string) => void>();
  const closes = new Set<(reason: string) => void>();
  let buffer = '';
  let ended = false;
  const end = (reason: string) => {
    if (ended) return;
    ended = true;
    for (const listener of closes) listener(reason);
  };
  fromBrowser.setEncoding('utf8');
  fromBrowser.on('data', (chunk: string) => {
    buffer += chunk;
    let at = buffer.indexOf('\0');
    while (at !== -1) {
      const message = buffer.slice(0, at);
      buffer = buffer.slice(at + 1);
      for (const listener of messages) listener(message);
      at = buffer.indexOf('\0');
    }
  });
  fromBrowser.on('close', () => end('Chromium closed its debugging pipe'));
  child.on('exit', (code, signal) => end(`Chromium exited (${signal ?? `code ${code}`})`));
  toBrowser.on('error', () => end('Chromium closed its debugging pipe'));
  return {
    send: (message) => {
      if (ended) throw new Error('Chromium is not running');
      toBrowser.write(`${message}\0`);
    },
    onMessage: (listener) => void messages.add(listener),
    onClose: (listener) => void closes.add(listener),
    close: () => {
      toBrowser.end();
      end('the connection was closed');
    }
  };
}

function within<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} took over ${ms / 1000} s`)), ms);
  });
  return Promise.race([work, late]).finally(() => clearTimeout(timer));
}

/** Starts Chromium and resolves once it answers; rejects with why it didn't start. */
export async function launchChromium(options: LaunchOptions): Promise<Browser> {
  const profile = await mkdtemp(path.join(options.stateDir, 'chromium-'));
  const child = spawn(options.chromiumPath, [...CHROMIUM_FLAGS, `--user-data-dir=${profile}`, 'about:blank'], {
    // fd 3 carries commands to Chromium and fd 4 its answers.
    stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'],
    env: childEnv(),
    // Its own process group, so a kill reaches its zygote, renderer and GPU
    // helpers too, and none is left in the pod.
    detached: process.platform !== 'win32'
  });
  let stderr = '';
  child.stderr?.setEncoding('utf8');
  child.stderr?.on('data', (chunk: string) => {
    stderr = (stderr + chunk).slice(-STDERR_TAIL);
  });
  const exited = new Promise<void>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) resolve();
    else child.once('exit', () => resolve());
  });
  const failedToSpawn = new Promise<never>((_, reject) => {
    child.once('error', (err) => reject(new Error(`Chromium at ${options.chromiumPath} did not start: ${err.message}`)));
  });
  failedToSpawn.catch(() => {});
  const cdp = new CdpConnection(
    pipeTransport(child, child.stdio[3] as Writable, child.stdio[4] as Readable)
  );
  let closing: Promise<void> | null = null;
  const close = () => {
    closing ??= (async () => {
      await within(cdp.send('Browser.close'), CLOSE_GRACE_MS, 'closing Chromium').catch(() => {});
      cdp.close();
      // The whole group, also after a clean exit: a helper can outlive the browser.
      killTree(child.pid, 'SIGKILL');
      await within(exited, CLOSE_GRACE_MS, 'Chromium exiting').catch(() => {});
      await rm(profile, { recursive: true, force: true }).catch(() => {});
    })();
    return closing;
  };
  try {
    await within(Promise.race([cdp.send('Browser.getVersion'), failedToSpawn]), options.startTimeoutMs, 'starting Chromium');
  } catch (err) {
    await close();
    const tail = stderr.trim().split('\n').slice(-3).join('\n');
    throw new Error(`${(err as Error).message}${tail ? `\n${tail}` : ''}`);
  }
  return { cdp, pid: child.pid, close };
}
