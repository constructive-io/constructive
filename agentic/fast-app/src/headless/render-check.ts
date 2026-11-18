// verify_app's render check in a run with no UI: the desktop's check
// (fast-app-desktop/render-check.ts) in a headless Chromium over the DevTools
// Protocol. It opens each page as the owner and fails on a GraphQL error in an
// answer, an uncaught exception, or the app's error screen
// (`data-app-error="<kind>"`), with the same budgets and lines. The page is
// the agent's code, so it stays on the dev server's origin, opens no other
// page, and its storage lives in memory only (an incognito browser context).

import type { OwnerSession, RenderCheck, RenderCheckResult, RenderFailure } from '../pipeline/host';
import { PAGE_TIMEOUT_MS, RENDER_SETUP_BUDGET_MS, STEP_TIMEOUT_MS } from '../pipeline/render-budget';
import { requestFailureMessage } from '../pipeline/request-failure';
import type { CdpEvent } from './cdp';
import { type Browser, launchChromium } from './chromium';

/** Where the app template keeps its session (the desktop's db-auth/preview-auth.ts). */
export const AUTH_TOKEN_STORAGE_KEY = 'constructive-auth-token:admin';
export const REMEMBER_ME_STORAGE_KEY = 'constructive-remember-me:admin';

export type RenderAccount = { userId: string; token: string; expiresAt: number };

// An owner key has no expiry the run knows of; the page needs one an hour out.
const SESSION_MS = 60 * 60_000;
const QUIET_MS = 1_200;

// The error screen a page shows, if any: its kind and what it says.
const APP_ERROR_PROBE = `(() => {
  const shown = document.querySelector('[data-app-error]');
  if (!shown) return null;
  const text = (shown.innerText || shown.textContent || '').replace(/\\s+/g, ' ').trim();
  return { kind: shown.getAttribute('data-app-error') || 'other', text: text.slice(0, 240) };
})()`;

type Pending = { route: string; url: string };

function within<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} took over ${ms / 1000} s`)), ms);
  });
  return Promise.race([work, late]).finally(() => clearTimeout(timer));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const STOPPED = 'the check was stopped';

/** `work`, or a rejection as soon as `signal` aborts. */
function untilStopped<T>(work: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (!signal) return work;
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new Error(STOPPED));
    if (signal.aborted) return onAbort();
    signal.addEventListener('abort', onAbort, { once: true });
    work.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

/** The page: one target in its own browser context, attached flat. */
type Page = {
  send<T = any>(method: string, params?: Record<string, unknown>): Promise<T>;
  /** Events of this page only. */
  onEvent(listener: (event: CdpEvent) => void): () => void;
  navigate(url: string, what: string): Promise<void>;
};

async function openPage(browser: Browser, origin: string): Promise<Page> {
  const { cdp } = browser;
  const step = <T = any>(method: string, params: Record<string, unknown>) =>
    within(cdp.send<T>(method, params), STEP_TIMEOUT_MS, method);
  const { browserContextId } = await step<{ browserContextId: string }>('Target.createBrowserContext', {
    disposeOnDetach: true
  });
  const { targetId } = await step<{ targetId: string }>('Target.createTarget', {
    url: 'about:blank',
    browserContextId
  });
  // A page the agent's code opens is closed at once.
  cdp.onEvent(({ method, params }) => {
    const info = params?.targetInfo;
    if (method !== 'Target.targetCreated' || info?.type !== 'page') return;
    if (info.browserContextId !== browserContextId || info.targetId === targetId) return;
    cdp.send('Target.closeTarget', { targetId: info.targetId }).catch(() => {});
  });
  await step('Target.setDiscoverTargets', { discover: true });
  const { sessionId } = await step<{ sessionId: string }>('Target.attachToTarget', {
    targetId,
    flatten: true
  });
  const send = <T = any>(method: string, params: Record<string, unknown> = {}) =>
    cdp.send<T>(method, params, sessionId);
  const onEvent = (listener: (event: CdpEvent) => void) =>
    cdp.onEvent((event) => {
      if (event.sessionId === sessionId) listener(event);
    });
  // A document from another origin is refused: the page stays on the dev server.
  onEvent(({ method, params }) => {
    if (method !== 'Fetch.requestPaused') return;
    const answer = offOrigin(params.request?.url, origin)
      ? send('Fetch.failRequest', { requestId: params.requestId, errorReason: 'BlockedByClient' })
      : send('Fetch.continueRequest', { requestId: params.requestId });
    answer.catch(() => {});
  });
  await within(send('Page.enable'), STEP_TIMEOUT_MS, 'Page.enable');
  await within(
    send('Fetch.enable', { patterns: [{ urlPattern: '*', resourceType: 'Document', requestStage: 'Request' }] }),
    STEP_TIMEOUT_MS,
    'Fetch.enable'
  );
  const navigate = async (url: string, what: string) => {
    const load = cdp.waitFor((event) => event.sessionId === sessionId && event.method === 'Page.loadEventFired');
    try {
      await within(
        (async () => {
          const result = await send<{ errorText?: string }>('Page.navigate', { url });
          if (result.errorText) throw new Error(result.errorText);
          await load.event;
        })(),
        PAGE_TIMEOUT_MS,
        what
      );
    } finally {
      load.cancel();
    }
  };
  return { send, onEvent, navigate };
}

function offOrigin(url: unknown, origin: string): boolean {
  try {
    return new URL(String(url)).origin !== origin;
  } catch {
    return true;
  }
}

function bodyText(body: { body?: string; base64Encoded?: boolean }): string {
  if (!body.body) return '{}';
  return body.base64Encoded ? Buffer.from(body.body, 'base64').toString('utf8') : body.body;
}

export type RenderCheckOptions = {
  /**
   * The longest the set-up may take: Chromium's start, the page, the sign-in
   * page and the session. The CRUD check holds its test rows for the record
   * pages for this long plus their pages (verify-crud.ts), so a set-up never
   * outlasts the hold: a slower one skips the check with the reason.
   */
  setupMs?: number;
};

export async function checkRendering(
  open: () => Promise<Browser>,
  devUrl: string,
  routes: readonly string[],
  account: RenderAccount,
  signal?: AbortSignal,
  options: RenderCheckOptions = {}
): Promise<RenderCheckResult> {
  if (!routes.length) return { failures: [], pages: 0 };
  const origin = new URL(devUrl).origin;
  const failures: RenderFailure[] = [];
  const graphql = new Map<string, Pending>();
  // The status each data request was answered with, for the failure line.
  const statuses = new Map<string, number>();
  // The response bodies still being read: a GraphQL error in one is a failure too.
  const bodies = new Set<Promise<void>>();
  let route = '/';
  let lastActivity = Date.now();
  let pages = 0;
  const opened: string[] = [];
  let browser: Browser | null = null;
  // Set once the set-up is given up: a browser that starts after it is closed.
  let gaveUp = false;
  const setUp = async (): Promise<Page> => {
    const started = await open();
    if (gaveUp) {
      await started.close();
      throw new Error('the set-up was given up');
    }
    browser = started;
    const page = await openPage(started, origin);
    // The app reads its session from storage on load: a page of the origin
    // goes in first, then the session, then the pages under check.
    await page.navigate(new URL('/sign-in', devUrl).toString(), 'sign-in');
    page.onEvent(({ method, params }) => {
      if (method === 'Network.requestWillBeSent' && /\/graphql\b/.test(params.request?.url ?? '')) {
        graphql.set(params.requestId, { route, url: params.request.url });
        lastActivity = Date.now();
      } else if (
        (method === 'Network.responseReceived' || method === 'Network.responseReceivedExtraInfo') &&
        graphql.has(params.requestId)
      ) {
        const status = params.response?.status ?? params.statusCode;
        if (typeof status === 'number') statuses.set(params.requestId, status);
      } else if (method === 'Network.loadingFinished' || method === 'Network.loadingFailed') {
        const request = graphql.get(params.requestId);
        if (!request) return;
        graphql.delete(params.requestId);
        const status = statuses.get(params.requestId);
        statuses.delete(params.requestId);
        lastActivity = Date.now();
        if (method === 'Network.loadingFailed') {
          if (!params.canceled) {
            failures.push({
              route: request.route,
              message: requestFailureMessage({ ...params, url: request.url, status })
            });
          }
          return;
        }
        const read = page
          .send<{ body?: string; base64Encoded?: boolean }>('Network.getResponseBody', { requestId: params.requestId })
          .then((body) => {
            const errors = (JSON.parse(bodyText(body)) as { errors?: Array<{ message?: string }> }).errors;
            if (errors?.length) {
              failures.push({ route: request.route, message: `GraphQL error: ${errors[0].message}` });
            }
          })
          .catch(() => {});
        bodies.add(read);
        void read.finally(() => bodies.delete(read));
      } else if (method === 'Runtime.exceptionThrown') {
        const detail = params.exceptionDetails;
        const text = detail?.exception?.description ?? detail?.text ?? 'uncaught exception';
        failures.push({ route, message: `uncaught exception: ${String(text).split('\n')[0]}` });
      }
    });
    await within(page.send('Network.enable'), STEP_TIMEOUT_MS, 'Network.enable');
    await within(page.send('Runtime.enable'), STEP_TIMEOUT_MS, 'Runtime.enable');
    const stored = JSON.stringify({
      id: account.userId,
      userId: account.userId,
      accessToken: account.token,
      accessTokenExpiresAt: new Date(account.expiresAt).toISOString()
    });
    const set = await within(
      page.send<{ exceptionDetails?: { text?: string } }>('Runtime.evaluate', {
        expression: `localStorage.setItem(${JSON.stringify(AUTH_TOKEN_STORAGE_KEY)}, ${JSON.stringify(stored)});
          localStorage.setItem(${JSON.stringify(REMEMBER_ME_STORAGE_KEY)}, 'true'); true`,
        returnByValue: true
      }),
      STEP_TIMEOUT_MS,
      'storing the session'
    );
    if (set.exceptionDetails) throw new Error(`storing the session failed: ${set.exceptionDetails.text ?? 'exception'}`);
    return page;
  };
  let page: Page;
  try {
    page = await within(untilStopped(setUp(), signal), options.setupMs ?? RENDER_SETUP_BUDGET_MS, 'setting up the page');
  } catch (err) {
    gaveUp = true;
    // The check can't run without a page and its session; the route and CRUD
    // checks still stand, so verify goes on without it.
    const reason = signal?.aborted ? STOPPED : (err as Error).message;
    console.warn(`[fast-app] render check skipped: ${reason}`);
    await browser?.close();
    return { failures: [], pages: 0, skipped: reason };
  }
  try {
    for (const next of routes) {
      if (signal?.aborted) break;
      route = next;
      pages += 1;
      opened.push(next);
      lastActivity = Date.now();
      const started = Date.now();
      try {
        await page.navigate(new URL(next, devUrl).toString(), 'the page');
      } catch (err) {
        failures.push({ route: next, message: `did not load: ${(err as Error).message}` });
        continue;
      }
      // Done once no data request has been open for a moment.
      while (Date.now() - started < PAGE_TIMEOUT_MS) {
        await sleep(200);
        const open = [...graphql.values()].some((p) => p.route === next);
        if (!open && Date.now() - lastActivity > QUIET_MS) break;
      }
      const shown = await within(
        page.send<{ result?: { value?: { kind: string; text: string } | null } }>('Runtime.evaluate', {
          expression: APP_ERROR_PROBE,
          returnByValue: true
        }),
        STEP_TIMEOUT_MS,
        'reading the page'
      )
        .then((answer) => answer.result?.value ?? null)
        .catch((): null => null);
      if (shown) {
        failures.push({
          route: next,
          message: `the page shows the app's error screen (${shown.kind}): ${shown.text}`
        });
      }
    }
    // Response bodies are read asynchronously: the last ones land before the result.
    await within(Promise.allSettled([...bodies]), STEP_TIMEOUT_MS, 'the answers').catch(() => {});
  } finally {
    await browser.close();
  }
  const seen = new Set<string>();
  const unique = failures.filter((f) => {
    const key = `${f.route}\n${f.message}`;
    return !seen.has(key) && seen.add(key);
  });
  // A check stopped part way says so: its count is only of the pages it got to.
  if (signal?.aborted) return { failures: unique, pages, opened, skipped: STOPPED };
  return { failures: unique, pages, opened };
}

/** The account the page signs in as: the owner's session, for an hour. */
export const renderAccount = (owner: OwnerSession, now = Date.now()): RenderAccount => ({
  userId: owner.userId,
  token: owner.token,
  expiresAt: now + SESSION_MS
});

/** The host's render check on a Chromium binary, and the stop for a browser still open. */
export function chromiumRenderCheck(options: { chromiumPath: string; stateDir: string }): {
  renderCheck: RenderCheck;
  dispose(): Promise<void>;
} {
  const live = new Set<Browser>();
  const open = async (): Promise<Browser> => {
    const browser = await launchChromium({ ...options, startTimeoutMs: PAGE_TIMEOUT_MS });
    live.add(browser);
    return {
      cdp: browser.cdp,
      close: async () => {
        live.delete(browser);
        await browser.close();
      }
    };
  };
  return {
    renderCheck: (devUrl, routes, owner, signal) =>
      checkRendering(open, devUrl, routes, renderAccount(owner), signal),
    dispose: async () => {
      await Promise.all([...live].map((browser) => browser.close()));
      live.clear();
    }
  };
}
