import type { Request, Response } from 'express';

/**
 * The direct request handler returned by Grafserv's public `createHandler()`.
 *
 * Grafserv's Node declaration historically says `void` because the function is
 * also suitable for an HTTP server callback, but its implementation is async
 * and returns the request promise. This contract deliberately accepts that
 * direct handler rather than an Express application.
 */
export type GraphilePublicRequestHandler = (
  req: Request,
  res: Response
) => Promise<unknown>;

interface EntryUsageState {
  activeUses: number;
  retiring: boolean;
  drain: Promise<void> | null;
  resolveDrain: (() => void) | null;
}

interface Destroyable {
  destroy?: () => unknown;
}

/**
 * Runtime state is keyed by entry object identity. A cache key is not enough:
 * two generations may intentionally share one key while having different
 * pools and Grafserv services.
 */
const entryUsage = new WeakMap<object, EntryUsageState>();

const getEntryUsage = (entry: object): EntryUsageState => {
  let state = entryUsage.get(entry);
  if (!state) {
    state = {
      activeUses: 0,
      retiring: false,
      drain: null,
      resolveDrain: null,
    };
    entryUsage.set(entry, state);
  }
  return state;
};

const settleDrainIfIdle = (state: EntryUsageState): void => {
  if (state.retiring && state.activeUses === 0 && state.resolveDrain) {
    const resolveDrain = state.resolveDrain;
    state.resolveDrain = null;
    resolveDrain();
  }
};

const getRetirementDrain = (state: EntryUsageState): Promise<void> => {
  if (!state.drain) {
    state.drain = new Promise<void>((resolve) => {
      state.resolveDrain = resolve;
    });
  }
  settleDrainIfIdle(state);
  return state.drain;
};

const isAlreadyEnded = (req: Request, res: Response): boolean =>
  Boolean(
    req.aborted ||
      req.socket?.destroyed ||
      res.destroyed ||
      res.writableEnded
  );

const destroyOnce = (
  req: Request,
  res: Response,
  destroyed: { value: boolean }
): void => {
  if (destroyed.value) return;
  destroyed.value = true;

  // These are the native Node request/response destroy methods. Calling each
  // at most once is important because abort and close can race.
  const requestDestroy = (req as unknown as Destroyable).destroy;
  if (typeof requestDestroy === 'function') {
    requestDestroy.call(req);
  }
  const responseDestroy = (res as unknown as Destroyable).destroy;
  if (typeof responseDestroy === 'function') {
    responseDestroy.call(res);
  }
};

const removeListener = (
  target: Request | Response,
  event: string,
  listener: () => void
): void => {
  target.removeListener(event, listener);
};

/**
 * Tracks one direct Grafserv request against one exact cache entry.
 *
 * A use is retained until both independent conditions hold:
 * - the Grafserv handler's promise has settled; and
 * - the response has finished, closed, or the request has aborted.
 *
 * The returned promise follows the handler. In particular, handler errors are
 * rethrown as the same value immediately so the caller's error handling can
 * complete the response while the entry remains protected by the latch.
 */
export async function withGraphileEntryUsage(
  entry: object,
  req: Request,
  res: Response,
  handler: GraphilePublicRequestHandler
): Promise<void> {
  // Do this before acquiring state: a request which is already over must not
  // keep a retiring entry alive, and its handler must never be invoked.
  if (isAlreadyEnded(req, res)) return;

  const state = getEntryUsage(entry);
  if (state.retiring) {
    throw new Error('Graphile cache entry is retiring; new requests are denied');
  }

  state.activeUses += 1;

  let handlerSettled = false;
  let terminal = false;
  let responseFinished = false;
  let released = false;
  const destroyed = { value: false };

  let onFinish: () => void;
  let onClose: () => void;
  let onAbort: () => void;

  const releaseIfReady = (): void => {
    if (!handlerSettled || !terminal || released) return;
    released = true;
    removeListener(res, 'finish', onFinish);
    removeListener(res, 'close', onClose);
    removeListener(req, 'aborted', onAbort);
    state.activeUses -= 1;
    settleDrainIfIdle(state);
  };

  onFinish = () => {
    if (terminal) return;
    responseFinished = true;
    terminal = true;
    releaseIfReady();
  };

  onClose = () => {
    if (terminal) return;
    terminal = true;
    if (!responseFinished) {
      destroyOnce(req, res, destroyed);
    }
    releaseIfReady();
  };

  onAbort = () => {
    if (terminal) return;
    terminal = true;
    destroyOnce(req, res, destroyed);
    releaseIfReady();
  };

  res.once('finish', onFinish);
  res.once('close', onClose);
  req.once('aborted', onAbort);

  try {
    await handler(req, res);
  } finally {
    handlerSettled = true;
    releaseIfReady();
  }
}

/**
 * Marks an exact cache entry as retiring synchronously, then waits for every
 * request whose two-part latch is still open. Repeated calls share one drain.
 */
export function retireGraphileEntry(entry: object): Promise<void> {
  const state = getEntryUsage(entry);
  if (!state.retiring) {
    state.retiring = true;
  }
  return getRetirementDrain(state);
}
