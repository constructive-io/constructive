import { EventEmitter } from 'node:events';

import type { Request, Response } from 'express';

import {
  retireGraphileEntry,
  withGraphileEntryUsage,
} from '../runtime-entry-usage';

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: Error): void;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

interface FakeRequest extends EventEmitter {
  aborted: boolean;
  destroyed: boolean;
  socket: { destroyed: boolean };
  destroy: jest.Mock;
}

interface FakeResponse extends EventEmitter {
  destroyed: boolean;
  writableEnded: boolean;
  destroy: jest.Mock;
}

const makeRequest = (): Request => {
  const req = new EventEmitter() as FakeRequest;
  req.aborted = false;
  req.destroyed = false;
  req.socket = { destroyed: false };
  req.destroy = jest.fn();
  return req as unknown as Request;
};

const makeResponse = (): Response => {
  const res = new EventEmitter() as FakeResponse;
  res.destroyed = false;
  res.writableEnded = false;
  res.destroy = jest.fn();
  return res as unknown as Response;
};

const finish = (res: Response): void => {
  (res as unknown as FakeResponse).writableEnded = true;
  res.emit('finish');
};

const close = (res: Response): void => {
  res.emit('close');
};

const abort = (req: Request): void => {
  (req as unknown as FakeRequest).aborted = true;
  req.emit('aborted');
};

describe('Graphile cache entry request usage', () => {
  it('holds an aborted request until its deferred handler settles', async () => {
    const entry = {};
    const req = makeRequest();
    const res = makeResponse();
    const work = deferred<void>();
    const handler = jest.fn(() => work.promise);

    const request = withGraphileEntryUsage(entry, req, res, handler);
    expect(handler).toHaveBeenCalledWith(req, res);

    const retiring = retireGraphileEntry(entry);
    let drained = false;
    void retiring.then(() => {
      drained = true;
    });
    abort(req);
    expect((req as unknown as FakeRequest).destroy).toHaveBeenCalledTimes(1);
    expect((res as unknown as FakeResponse).destroy).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(drained).toBe(false);

    work.resolve(undefined);
    await request;
    await retiring;
    expect(drained).toBe(true);
  });

  it('destroys once for an abnormal response close and tolerates repeated signals', async () => {
    const entry = {};
    const req = makeRequest();
    const res = makeResponse();
    const handler = jest.fn(async (): Promise<void> => undefined);

    const request = withGraphileEntryUsage(entry, req, res, handler);
    close(res);
    close(res);
    abort(req);
    await request;
    await retireGraphileEntry(entry);

    expect((req as unknown as FakeRequest).destroy).toHaveBeenCalledTimes(1);
    expect((res as unknown as FakeResponse).destroy).toHaveBeenCalledTimes(1);
  });

  it('keeps the use while finish precedes handler settlement without destroying', async () => {
    const entry = {};
    const req = makeRequest();
    const res = makeResponse();
    const work = deferred<void>();
    const request = withGraphileEntryUsage(entry, req, res, () => work.promise);

    finish(res);
    const retiring = retireGraphileEntry(entry);
    let drained = false;
    void retiring.then(() => {
      drained = true;
    });
    await Promise.resolve();
    expect(drained).toBe(false);
    expect((req as unknown as FakeRequest).destroy).not.toHaveBeenCalled();
    expect((res as unknown as FakeResponse).destroy).not.toHaveBeenCalled();

    work.resolve(undefined);
    await request;
    await retiring;
  });

  it('keeps the use after handler settlement until response finish', async () => {
    const entry = {};
    const req = makeRequest();
    const res = makeResponse();
    const request = withGraphileEntryUsage(
      entry,
      req,
      res,
      async (): Promise<void> => undefined
    );

    await request;
    const retiring = retireGraphileEntry(entry);
    let drained = false;
    void retiring.then(() => {
      drained = true;
    });
    await Promise.resolve();
    expect(drained).toBe(false);

    finish(res);
    await retiring;
  });

  it('counts concurrent users and resolves the shared last-use drain', async () => {
    const entry = {};
    const req1 = makeRequest();
    const res1 = makeResponse();
    const req2 = makeRequest();
    const res2 = makeResponse();
    const work1 = deferred<void>();
    const work2 = deferred<void>();
    const first = withGraphileEntryUsage(entry, req1, res1, () => work1.promise);
    const second = withGraphileEntryUsage(entry, req2, res2, () => work2.promise);
    const retiring = retireGraphileEntry(entry);

    work1.resolve(undefined);
    await first;
    finish(res1);
    let drained = false;
    void retiring.then(() => {
      drained = true;
    });
    await Promise.resolve();
    expect(drained).toBe(false);

    work2.resolve(undefined);
    await second;
    finish(res2);
    await retiring;
  });

  it('shares repeated retirement calls and rejects late entrants', async () => {
    const entry = {};
    const first = retireGraphileEntry(entry);
    const second = retireGraphileEntry(entry);
    expect(second).toBe(first);

    await expect(
      withGraphileEntryUsage(entry, makeRequest(), makeResponse(), async () => {
        throw new Error('must not run');
      })
    ).rejects.toThrow('retiring');
  });

  it('skips a request that has already ended without retaining the entry', async () => {
    const entry = {};
    const req = makeRequest();
    const res = makeResponse();
    (req as unknown as FakeRequest).aborted = true;
    const handler = jest.fn(async (): Promise<void> => undefined);

    await withGraphileEntryUsage(entry, req, res, handler);
    expect(handler).not.toHaveBeenCalled();
    await retireGraphileEntry(entry);
  });

  it('does not treat an auto-destroyed request as ended while its socket is live', async () => {
    const entry = {};
    const req = makeRequest();
    const res = makeResponse();
    (req as unknown as FakeRequest).destroyed = true;
    const handler = jest.fn(async (): Promise<void> => undefined);

    await withGraphileEntryUsage(entry, req, res, handler);
    expect(handler).toHaveBeenCalledWith(req, res);

    const retiring = retireGraphileEntry(entry);
    finish(res);
    await retiring;
  });

  it('propagates the exact handler error and releases after response end', async () => {
    const entry = {};
    const req = makeRequest();
    const res = makeResponse();
    const failure = new Error('handler failed');

    const request = withGraphileEntryUsage(entry, req, res, async () => {
      throw failure;
    });
    await expect(request).rejects.toBe(failure);

    const retiring = retireGraphileEntry(entry);
    let drained = false;
    void retiring.then(() => {
      drained = true;
    });
    await Promise.resolve();
    expect(drained).toBe(false);

    finish(res);
    await retiring;
  });
});
