import assert from 'node:assert/strict';

import { CdpConnection, type CdpTransport } from '../../src/headless/cdp';
import type { Browser } from '../../src/headless/chromium';
import { AUTH_TOKEN_STORAGE_KEY, checkRendering, type RenderAccount } from '../../src/headless/render-check';

const DEV = 'http://localhost:4100';
const SESSION = 'S1';

/** What a page does when it loads: its data requests, a thrown error, its error screen. */
type Script = {
  requests?: Array<{ body?: string; failed?: Record<string, unknown> }>;
  exception?: string;
  errorScreen?: { kind: string; text: string };
  /** The document request goes to this URL instead (a redirect). */
  redirect?: string;
};

// A Chromium that answers the commands the check sends and plays each page's
// script: the document request pauses for the origin guard, then the data
// requests and the load event come as events of the page's session.
class FakeChromium implements CdpTransport {
  sent: Array<{ method: string; params: any; sessionId?: string }> = [];
  stored: string[] = [];
  closed = false;
  private messages: Array<(message: string) => void> = [];
  private bodies = new Map<string, string>();
  private paused = new Map<string, (blocked: boolean) => void>();
  private ids = 0;

  constructor(private readonly pages: Record<string, Script>) {}

  onMessage(listener: (message: string) => void): void {
    this.messages.push(listener);
  }
  onClose(): void {}
  close(): void {
    this.closed = true;
  }

  send(text: string): void {
    const { id, method, params, sessionId } = JSON.parse(text);
    this.sent.push({ method, params, sessionId });
    const reply = (result: unknown): void => void setImmediate(() => this.emit({ id, result }));
    switch (method) {
    case 'Target.createBrowserContext':
      return reply({ browserContextId: 'ctx' });
    case 'Target.createTarget':
      return reply({ targetId: 'page' });
    case 'Target.attachToTarget':
      return reply({ sessionId: SESSION });
    case 'Page.navigate':
      return this.navigate(params.url, reply);
    case 'Fetch.continueRequest':
    case 'Fetch.failRequest':
      this.paused.get(params.requestId)?.(method === 'Fetch.failRequest');
      return reply({});
    case 'Network.getResponseBody':
      return reply({ body: this.bodies.get(params.requestId) ?? '{}', base64Encoded: false });
    case 'Runtime.evaluate': {
      if (params.expression.includes('localStorage.setItem')) {
        this.stored.push(params.expression);
        return reply({ result: { value: true } });
      }
      const path = new URL(this.current).pathname;
      return reply({ result: { value: this.pages[path]?.errorScreen ?? null } });
    }
    default:
      return reply({});
    }
  }

  private current = 'about:blank';

  private event(method: string, params: unknown) {
    this.emit({ method, params, sessionId: SESSION });
  }

  private emit(message: unknown) {
    for (const listener of this.messages) listener(JSON.stringify(message));
  }

  private navigate(url: string, reply: (result: unknown) => void) {
    const script = this.pages[new URL(url).pathname] ?? {};
    const target = script.redirect ?? url;
    const requestId = `doc-${++this.ids}`;
    this.paused.set(requestId, (blocked) => {
      if (blocked) return reply({ frameId: 'f', errorText: 'net::ERR_BLOCKED_BY_CLIENT' });
      this.current = url;
      reply({ frameId: 'f', loaderId: requestId });
      setTimeout(() => this.play(script), 5);
    });
    setImmediate(() =>
      this.event('Fetch.requestPaused', { requestId, request: { url: target }, resourceType: 'Document' })
    );
  }

  private play(script: Script) {
    for (const request of script.requests ?? []) {
      const requestId = `req-${++this.ids}`;
      this.event('Network.requestWillBeSent', { requestId, request: { url: 'http://api-food-bank.localhost/graphql' } });
      if (request.failed) {
        this.event('Network.loadingFailed', { requestId, ...request.failed });
        continue;
      }
      this.bodies.set(requestId, request.body ?? '{"data":{}}');
      this.event('Network.responseReceived', { requestId, response: { status: 200 } });
      this.event('Network.loadingFinished', { requestId });
    }
    if (script.exception) {
      this.event('Runtime.exceptionThrown', { exceptionDetails: { exception: { description: `${script.exception}\n    at page.js:1` } } });
    }
    this.event('Page.loadEventFired', { timestamp: 1 });
  }
}

const account: RenderAccount = { userId: 'user-1', token: 'owner-key', expiresAt: Date.parse('2026-11-18T12:00:00Z') };

function browserOf(fake: FakeChromium) {
  let closes = 0;
  const open = async (): Promise<Browser> => ({
    cdp: new CdpConnection(fake),
    close: async () => {
      closes += 1;
    }
  });
  return { open, closes: () => closes };
}

test('each page fails on a GraphQL error, an uncaught exception or the error screen; a clean page passes', async () => {
  const fake = new FakeChromium({
    '/': { requests: [{ body: '{"data":{"volunteers":[]}}' }] },
    '/volunteers': { requests: [{ body: '{"errors":[{"message":"Cannot query field \\"nme\\""}]}' }] },
    '/shifts': { exception: 'TypeError: x is undefined' },
    '/reports': { errorScreen: { kind: 'render', text: 'Something went wrong' } }
  });
  const { open, closes } = browserOf(fake);
  const result = await checkRendering(open, DEV, ['/', '/volunteers', '/shifts', '/reports'], account);
  assert.deepEqual(result, {
    failures: [
      { route: '/volunteers', message: 'GraphQL error: Cannot query field "nme"' },
      { route: '/shifts', message: 'uncaught exception: TypeError: x is undefined' },
      { route: '/reports', message: "the page shows the app's error screen (render): Something went wrong" }
    ],
    pages: 4,
    opened: ['/', '/volunteers', '/shifts', '/reports']
  });
  assert.equal(closes(), 1);
});

test('the owner session goes into the storage of the dev server origin, before the first page', async () => {
  const fake = new FakeChromium({});
  await checkRendering(browserOf(fake).open, DEV, ['/'], account);
  const navigations = fake.sent.filter((c) => c.method === 'Page.navigate').map((c) => c.params.url);
  assert.deepEqual(navigations, [`${DEV}/sign-in`, `${DEV}/`]);
  assert.equal(fake.stored.length, 1);
  assert.ok(fake.stored[0].includes(JSON.stringify(AUTH_TOKEN_STORAGE_KEY)));
  const stored = JSON.parse(JSON.parse(/setItem\("[^"]+", ("(?:[^"\\]|\\.)*")\)/.exec(fake.stored[0])![1]));
  assert.deepEqual(stored, {
    id: 'user-1',
    userId: 'user-1',
    accessToken: 'owner-key',
    accessTokenExpiresAt: '2026-11-18T12:00:00.000Z'
  });
  // The page's own commands go to its session; its storage is a context of its own.
  assert.ok(fake.sent.some((c) => c.method === 'Target.createBrowserContext'));
  assert.ok(fake.sent.filter((c) => c.method.startsWith('Network.') || c.method.startsWith('Page.')).every((c) => c.sessionId === SESSION));
});

test('a document from another origin is refused, so the page stays on the dev server', async () => {
  const fake = new FakeChromium({ '/leave': { redirect: 'https://elsewhere.example/' } });
  const result = await checkRendering(browserOf(fake).open, DEV, ['/leave'], account);
  assert.deepEqual(result.failures, [{ route: '/leave', message: 'did not load: net::ERR_BLOCKED_BY_CLIENT' }]);
});

test("a data request the browser blocked says which API and why, in the desktop's words", async () => {
  const fake = new FakeChromium({
    '/': { requests: [{ failed: { errorText: 'net::ERR_FAILED', corsErrorStatus: { corsError: 'MissingAllowOriginHeader' } } }] }
  });
  const result = await checkRendering(browserOf(fake).open, DEV, ['/'], account);
  assert.deepEqual(result.failures, [
    {
      route: '/',
      message:
        "the browser blocked the page's call to api-food-bank.localhost/graphql: the API didn't allow this page's address (CORS: MissingAllowOriginHeader)"
    }
  ]);
});

test('a browser that does not start skips the check with the reason', async () => {
  const result = await checkRendering(
    async () => {
      throw new Error('Chromium at /usr/bin/chromium did not start: spawn ENOENT');
    },
    DEV,
    ['/'],
    account
  );
  assert.deepEqual(result, {
    failures: [],
    pages: 0,
    skipped: 'Chromium at /usr/bin/chromium did not start: spawn ENOENT'
  });
});

test('a stopped check ends with the pages it got to, and says it was stopped', async () => {
  const stop = new AbortController();
  const fake = new FakeChromium({ '/': {}, '/two': {} });
  const { open } = browserOf(fake);
  const running = checkRendering(open, DEV, ['/', '/two'], account, stop.signal);
  // Stops while the first page settles.
  setTimeout(() => stop.abort(), 300);
  assert.deepEqual(await running, { failures: [], pages: 1, opened: ['/'], skipped: 'the check was stopped' });
});

test('no routes: no browser', async () => {
  let opened = false;
  const result = await checkRendering(
    async () => {
      opened = true;
      throw new Error('unused');
    },
    DEV,
    [],
    account
  );
  assert.deepEqual(result, { failures: [], pages: 0 });
  assert.equal(opened, false);
});
