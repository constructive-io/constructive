import type { NextFunction, Request, Response } from 'express';
import type { GraphileCacheEntry } from 'graphile-cache';

import { BuildRefusedError, clearInFlightMap, graphile, setInFlightForTest } from '../graphile';

/**
 * Regression test for the Phase C re-coalesce load-shed hole.
 *
 * Contract (commit 46636d4b4): BuildRefusedError maps to 503 SERVICE_OVERLOADED +
 * Retry-After "for the requester and every coalesced waiter." A re-coalescing
 * waiter awaits a fresh in-flight build at the Phase C re-coalesce await. Pre-fix
 * that await was unguarded, so a BuildRefusedError surfacing there escaped to the
 * outer catch and became a generic 500 INTERNAL_ERROR with no Retry-After —
 * contradicting the contract on the exact memory-pressure path the error exists for.
 *
 * The re-coalesce await is reached before the request-time pressure gate, so the
 * real (empty) cache naturally misses and no build machinery runs; seeding the
 * in-flight map with a rejecting promise drives the path deterministically.
 */
describe('graphile dispatcher — Phase C re-coalesce refusal mapping', () => {
  const key = 'svc-recoalesce-test';

  const makeRes = () => {
    const headers: Record<string, string> = {};
    const res: any = { headersSent: false };
    res.setHeader = jest.fn((name: string, value: string) => {
      headers[name] = value;
    });
    res.status = jest.fn((code: number) => {
      res.statusCode = code;
      return res;
    });
    res.json = jest.fn((payload: unknown) => {
      res.body = payload;
      return res;
    });
    return { res: res as Response, headers };
  };

  const makeReq = (): Request =>
    ({
      requestId: 'test-req',
      svc_key: key,
      api: {
        dbname: 'constructive',
        anonRole: 'anon',
        roleName: 'authenticated',
        schema: ['app-public']
      }
    } as unknown as Request);

  afterEach(() => {
    clearInFlightMap();
  });

  it('maps a BuildRefusedError on the re-coalesce await to 503 SERVICE_OVERLOADED + Retry-After', async () => {
    // A rejecting in-flight promise that is NOT self-deleting, so it survives from
    // Phase B (which falls through on the rejection) into the Phase C re-coalesce
    // read — mirroring a fresh owner's build that refuses under late heap pressure.
    const refused: Promise<GraphileCacheEntry> = Promise.reject(new BuildRefusedError(0.98));
    refused.catch(() => { /* guard: both awaits inside the dispatcher handle it */ });
    setInFlightForTest(key, refused);

    const handler = graphile({} as never);
    const { res, headers } = makeRes();
    const next = jest.fn() as unknown as NextFunction;

    await handler(makeReq(), res, next);

    expect((res.status as jest.Mock)).toHaveBeenCalledWith(503);
    expect(headers['Retry-After']).toBe('15');
    expect((res.json as jest.Mock).mock.calls[0][0]).toEqual({
      error: { code: 'SERVICE_OVERLOADED', message: 'Server is at critical memory pressure; retry shortly' }
    });
    // The pre-fix defect: a generic 500 with no Retry-After from the outer catch.
    expect((res.status as jest.Mock)).not.toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });
});
