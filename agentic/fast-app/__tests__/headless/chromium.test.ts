// Runs only when a Chromium binary is found: CHROMIUM_PATH, else the usual places.

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { launchChromium } from '../../src/headless/chromium';
import { chromiumRenderCheck } from '../../src/headless/render-check';
import type { OwnerSession } from '../../src/pipeline/host';

const CANDIDATES = [
  process.env.CHROMIUM_PATH,
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
];
const chromium = CANDIDATES.find((candidate) => candidate && existsSync(candidate));

function listen(host: string, handle: (req: IncomingMessage, res: ServerResponse) => void): Promise<Server> {
  const server = createServer(handle);
  return new Promise((resolve) => server.listen(0, host, () => resolve(server)));
}

const portOf = (server: Server) => (server.address() as AddressInfo).port;

const html = (res: ServerResponse, body: string) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!doctype html><html><body>${body}</body></html>`);
};

const describeChromium = chromium ? describe : describe.skip;

describeChromium(`the render check in Chromium (${chromium ?? 'skipped: no Chromium binary; set CHROMIUM_PATH'})`, () => {
  let app: Server;
  let api: Server;
  let stateDir: string;

  beforeAll(async () => {
    // Another origin than the app's, with no CORS headers, as the app's API is to a pod.
    api = await listen('127.0.0.1', (req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (req.url?.includes('fail')) return res.end('{"errors":[{"message":"boom"}]}');
      const signedIn = req.headers.authorization === 'Bearer owner-key';
      res.end(signedIn ? '{"data":{"ok":true}}' : '{"errors":[{"message":"not signed in"}]}');
    });
    const apiUrl = `http://127.0.0.1:${portOf(api)}/graphql`;
    const call = (query: string) => `
      <script>
        const stored = JSON.parse(localStorage.getItem('constructive-auth-token:admin') || 'null');
        if (!stored) throw new Error('no session in storage');
        fetch('${apiUrl}${query}', { method: 'POST', headers: { Authorization: 'Bearer ' + stored.accessToken, 'Content-Type': 'application/json' }, body: '{}' });
      </script>`;
    app = await listen('localhost', (req, res) => {
      switch (req.url) {
      case '/sign-in':
        return html(res, 'sign in');
      case '/':
        return html(res, `home${call('')}`);
      case '/broken':
        return html(res, `broken${call('?fail=1')}`);
      case '/crash':
        return html(res, "<script>setTimeout(() => { throw new Error('kaboom'); });</script>");
      case '/error-screen':
        return html(res, '<div data-app-error="render">Something went wrong</div>');
      case '/leave':
        res.writeHead(302, { Location: `http://127.0.0.1:${portOf(api)}/` });
        return res.end();
      default:
        res.writeHead(404);
        return res.end();
      }
    });
    stateDir = mkdtempSync(path.join(tmpdir(), 'headless-chromium-'));
  });

  afterAll(async () => {
    await new Promise((resolve) => app.close(resolve));
    await new Promise((resolve) => api.close(resolve));
    rmSync(stateDir, { recursive: true, force: true });
  });

  test('the browser runs in a process group of its own, and close leaves no process of it', async () => {
    const browser = await launchChromium({ chromiumPath: chromium as string, stateDir, startTimeoutMs: 20_000 });
    const group = -(browser.pid as number);
    // Signal 0 only asks whether the group exists.
    assert.doesNotThrow(() => process.kill(group, 0));
    await browser.close();
    assert.throws(() => process.kill(group, 0), /ESRCH/);
  }, 60_000);

  test('opens each page as the owner and reports what failed, then leaves no profile behind', async () => {
    const devUrl = `http://localhost:${portOf(app)}`;
    const owner: OwnerSession = {
      databaseId: 'db',
      databaseName: 'food-bank',
      endpoint: 'http://api-food-bank.localhost/graphql',
      token: 'owner-key',
      userId: 'user-1'
    };
    const { renderCheck, dispose } = chromiumRenderCheck({ chromiumPath: chromium as string, stateDir });
    const result = await renderCheck(devUrl, ['/', '/broken', '/crash', '/error-screen', '/leave'], owner);
    await dispose();
    assert.equal(result.skipped, undefined);
    assert.equal(result.pages, 5);
    assert.deepEqual(
      result.failures.map((f) => [f.route, f.message.replace(/\s+at .*$/s, '')]),
      [
        ['/broken', 'GraphQL error: boom'],
        ['/crash', 'uncaught exception: Error: kaboom'],
        ['/error-screen', "the page shows the app's error screen (render): Something went wrong"],
        ['/leave', 'did not load: net::ERR_BLOCKED_BY_CLIENT']
      ]
    );
    // readdirSync builds its array in the node realm, so count it rather than compare it.
    assert.equal(readdirSync(stateDir).length, 0);
  }, 120_000);
});
