import { type ExecutionResult, GraphQLError, parse } from 'graphql';

import { filterMapIterator } from '../src/async-iterator';
import type { ParsedPayload } from '../src/event-gate';
import { filterInaccessibleEvents, realtimeResponseNames } from '../src/subscription-filter';
import { SubscriptionVisibility } from '../src/visibility';

const payload = (event: string, id = 'id'): ParsedPayload => ({ event, rowIds: [id], overflow: false });

describe('per-subscription visibility', () => {
  it.each(['INSERT', 'UPDATE'])('drops invisible %s and subsequent DELETE', event => {
    const state = new SubscriptionVisibility();
    expect(state.allow(payload(event), false)).toBe(false);
    expect(state.allow(payload('DELETE'), false)).toBe(false);
  });
  it.each(['INSERT', 'UPDATE'])('remembers a visible %s for DELETE, then forgets it', event => {
    const state = new SubscriptionVisibility();
    expect(state.allow(payload(event), true)).toBe(true);
    expect(state.allow(payload('DELETE'), false)).toBe(true);
    expect(state.allow(payload('DELETE'), false)).toBe(false);
  });
  it('forgets rows when they move out of visibility', () => {
    const state = new SubscriptionVisibility();
    expect(state.allow(payload('INSERT'), true)).toBe(true);
    expect(state.allow(payload('UPDATE'), false)).toBe(false);
    expect(state.allow(payload('DELETE'), false)).toBe(false);
  });
  it('does not share history between subscriptions', () => {
    const original = new SubscriptionVisibility();
    const fresh = new SubscriptionVisibility();
    expect(original.allow(payload('INSERT'), true)).toBe(true);
    expect(fresh.allow(payload('DELETE'), false)).toBe(false);
    expect(original.allow(payload('DELETE'), false)).toBe(true);
  });
  it('drops unscoped or empty signals even when passed a visible row', () => {
    const state = new SubscriptionVisibility();
    expect(state.allow({ event: 'INVALIDATE', rowIds: [], overflow: true }, true)).toBe(false);
    expect(state.allow({ event: 'UPDATE', rowIds: [], overflow: false }, true)).toBe(false);
  });
  it('bounds remembered IDs by conservatively forgetting the oldest', () => {
    const state = new SubscriptionVisibility();
    for (let i = 0; i <= 10_000; i++) state.allow(payload('INSERT', String(i)), true);
    expect(state.allow(payload('DELETE', '0'), false)).toBe(false);
    expect(state.allow(payload('DELETE', '10000'), false)).toBe(true);
  });
});

describe('subscription result filtering', () => {
  async function* source(...values: any[]) { yield* values; }
  async function collect(values: AsyncIterable<unknown>) {
    const results = [];
    for await (const value of values) results.push(value);
    return results;
  }
  it('drops the entire null-root result, not only its metadata', async () => {
    const allowed = { data: { change: { event: 'INSERT', rowId: 'visible' } } };
    expect(await collect(filterInaccessibleEvents(source({ data: { change: null } }, allowed), ['change']))).toEqual([allowed]);
  });
  it('handles an empty source without emitting a frame', async () => {
    expect(await collect(filterInaccessibleEvents(source(), ['change']))).toEqual([]);
  });
  it('filters pre-serialized root data but preserves incremental patches', async () => {
    const patch = { path: ['change', 'note'], data: 'text' };
    const allowed = { data: '{"change":{"event":"INSERT"}}' };
    expect(await collect(filterInaccessibleEvents(source({ data: '{"change":null}' }, patch, allowed), ['change']))).toEqual([patch, allowed]);
  });
  it('preserves GraphQL errors and results outside the realtime field', async () => {
    const error: ExecutionResult = { data: { change: null }, errors: [new GraphQLError('RLS query failed')] };
    const unrelated: ExecutionResult = { data: { elsewhere: null } };
    expect(await collect(filterInaccessibleEvents(source(error, unrelated), ['change']))).toEqual([error, unrelated]);
  });
  it('does not hide source failures', async () => {
    const error = new Error('LISTEN failed');
    async function* broken() { throw error; }
    await expect(filterInaccessibleEvents(broken(), ['change']).next()).rejects.toBe(error);
  });
  it('closes the source on a transform failure', async () => {
    let closed = false;
    async function* watched() { try { yield 'bad'; } finally { closed = true; } }
    const error = new Error('malformed notification');
    await expect(filterMapIterator(watched(), () => { throw error; }).next()).rejects.toBe(error);
    expect(closed).toBe(true);
  });
  it('cancels an idle next immediately instead of queuing return behind it', async () => {
    let finish!: (value: IteratorResult<string>) => void;
    const iterator = {
      [Symbol.asyncIterator]() { return this; },
      next: () => new Promise<IteratorResult<string>>(resolve => { finish = resolve; }),
      return: jest.fn(async (): Promise<IteratorReturnResult<void>> => { finish({ done: true, value: undefined }); return { done: true, value: undefined }; })
    };
    const filtered = filterMapIterator(iterator, value => value);
    const pending = filtered.next();
    await filtered.return!();
    expect(iterator.return).toHaveBeenCalledTimes(1);
    expect(await pending).toEqual({ done: true, value: undefined });
  });
  it('propagates throw and closes a source that has no throw method', async () => {
    const close = jest.fn(async (): Promise<IteratorReturnResult<void>> => ({ done: true, value: undefined }));
    const iterator = { [Symbol.asyncIterator]() { return this; }, next: close, return: close };
    const error = new Error('cancel');
    await expect(filterMapIterator(iterator, value => value).throw!(error)).rejects.toBe(error);
    expect(close).toHaveBeenCalledTimes(1);
  });
  it('resolves aliased roots through fragments and selects the requested operation', () => {
    const document = parse(`subscription Watch { ...Root }
      fragment Root on Subscription { ... on Subscription { change: onNoteChanged { event } } }
      query Other { __typename }`);
    const fields = new Set(['onNoteChanged']);
    expect(realtimeResponseNames(document, 'Watch', fields)).toEqual(['change']);
    expect(realtimeResponseNames(document, 'Other', fields)).toEqual([]);
    expect(realtimeResponseNames(document, undefined, fields)).toEqual([]);
    expect(realtimeResponseNames(document, 'Watch', new Set())).toEqual([]);
  });
});
