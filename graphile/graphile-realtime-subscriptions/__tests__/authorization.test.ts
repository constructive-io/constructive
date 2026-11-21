import { type ExecutionResult, GraphQLError, parse } from 'graphql';

import { filterMapIterator, flatMapIterator } from '../src/async-iterator';
import { createGatedSubscriber, type ParsedPayload } from '../src/event-gate';
import { SubscriptionDelivery } from '../src/delivery';
import { filterInaccessibleEvents, realtimeResponseNames } from '../src/subscription-filter';
import { SubscriptionVisibility } from '../src/visibility';

const payload = (event: string, id = 'id'): ParsedPayload => ({ event, rowIds: [id], overflow: false });

describe('visible-row throttling', () => {
  beforeEach(() => { jest.spyOn(Date, 'now').mockReturnValue(1000); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('delivers 50 owner rows and one id-less overflow for 61 visible changes', () => {
    const state = new SubscriptionDelivery(50);
    const delivered = Array.from({ length: 61 }, (_, i) => state.project(payload('INSERT', String(i)), true)).filter(Boolean);
    expect(delivered).toHaveLength(51);
    expect(delivered.slice(0, 50)).toEqual(Array.from({ length: 50 }, (_, i) => payload('INSERT', String(i))));
    expect(delivered[50]).toEqual({ event: 'INSERT', rowIds: [], overflow: true });
  });

  it('does not spend any budget or emit overflow for invisible changes', () => {
    const state = new SubscriptionDelivery(2);
    for (let i = 0; i < 61; i++) expect(state.project(payload('INSERT', String(i)), false)).toBeNull();
    expect(state.project(payload('INSERT', 'a'), true)).toEqual(payload('INSERT', 'a'));
    expect(state.project(payload('INSERT', 'b'), true)).toEqual(payload('INSERT', 'b'));
  });

  it('counts only visible rows in mixed batches and keeps subscription budgets independent', () => {
    const a = new SubscriptionDelivery(1), b = new SubscriptionDelivery(1);
    expect(a.project(payload('UPDATE', 'private'), false)).toBeNull();
    expect(a.project(payload('UPDATE', 'shared'), true)).toEqual(payload('UPDATE', 'shared'));
    expect(a.project(payload('UPDATE', 'private'), false)).toBeNull();
    expect(a.project(payload('UPDATE', 'next'), true)).toEqual({ event: 'UPDATE', rowIds: [], overflow: true });
    expect(b.project(payload('UPDATE', 'next'), true)).toEqual(payload('UPDATE', 'next'));
  });

  it('resets the visible budget and overflow flag in the next window', () => {
    const state = new SubscriptionDelivery(1);
    state.project(payload('INSERT'), true);
    expect(state.project(payload('INSERT'), true)?.overflow).toBe(true);
    expect(state.project(payload('INSERT'), true)).toBeNull();
    jest.mocked(Date.now).mockReturnValue(2001);
    expect(state.project(payload('INSERT'), true)).toEqual(payload('INSERT'));
    expect(state.project(payload('INSERT'), true)?.overflow).toBe(true);
  });

  it('uses observed visibility for DELETE and does not charge empty input', () => {
    const state = new SubscriptionDelivery(2);
    expect(state.project({ event: 'UPDATE', rowIds: [], overflow: false }, true)).toBeNull();
    expect(state.project(payload('DELETE'), false)).toBeNull();
    expect(state.project(payload('INSERT'), true)).toEqual(payload('INSERT'));
    expect(state.project(payload('DELETE'), false)).toEqual(payload('DELETE'));
  });

  it('rejects an unexpanded batch before charging any row', () => {
    const state = new SubscriptionDelivery(1);
    expect(() => state.project({ event: 'UPDATE', rowIds: ['a', 'b'], overflow: false }, true)).toThrow('single-row');
    expect(state.project(payload('UPDATE'), true)).toEqual(payload('UPDATE'));
  });
});

describe('per-row batch authorization', () => {
  it('rejects an unexpanded batch rather than silently authorizing only its first row', () => {
    const state = new SubscriptionVisibility();
    expect(() => state.allow({ event: 'UPDATE', rowIds: ['a', 'b'], overflow: false }, true)).toThrow('single-row events');
    expect(state.allow(payload('DELETE', 'a'), false)).toBe(false);
  });
  it.each(['INSERT', 'UPDATE', 'DELETE'])('splits every %s batch before applying visibility', async event => {
    const state = new SubscriptionVisibility();
    if (event === 'DELETE') state.allow(payload('INSERT', 'visible'), true);
    const gate = createGatedSubscriber({ async *subscribe() { yield `${event}:hidden,visible`; } }, {});
    const accepted = [];
    for await (const row of await gate.subscribe('topic')) {
      expect(row.rowIds).toHaveLength(1);
      if (state.allow(row, row.rowIds[0] === 'visible')) accepted.push(row);
    }
    expect(accepted).toEqual([payload(event, 'visible')]);
  });
  it('does not yield buffered rows after cancellation', async () => {
    let closed = false;
    async function* source() { try { yield [1, 2, 3]; } finally { closed = true; } }
    const expanded = flatMapIterator(source(), values => values);
    expect(await expanded.next()).toEqual({ done: false, value: 1 });
    await expanded.return();
    expect(closed).toBe(true);
    expect(await expanded.next()).toEqual({ done: true, value: undefined });
  });
});

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

  it.each(['@skip(if: true)', '@include(if: false)'])('ignores excluded aliases when filtering inaccessible events: %s', async directive => {
    const document = parse(`subscription { change: onNoteChanged { event } skipped: onNoteChanged ${directive} { event } }`);
    const names = realtimeResponseNames(document, undefined, new Set(['onNoteChanged']));
    expect(names).toEqual(['change']);
    const allowed = { data: { change: { event: 'INSERT' } } };
    expect(await collect(filterInaccessibleEvents(source({ data: { change: null } }, allowed), names))).toEqual([allowed]);
  });

  it('honors variable values and defaults on fields, spreads and inline fragments', () => {
    const document = parse(`subscription Watch($skip: Boolean! = true, $include: Boolean! = false) {
      excluded: onNoteChanged @skip(if: $skip) { event }
      ...Root @include(if: $include)
      ... on Subscription @skip(if: $skip) { inline: onNoteChanged { event } }
      ...Root
    }
    fragment Root on Subscription { change: onNoteChanged @include(if: true) { event } }`);
    const fields = new Set(['onNoteChanged']);
    expect(realtimeResponseNames(document, 'Watch', fields)).toEqual(['change']);
    expect(realtimeResponseNames(document, 'Watch', fields, { skip: false, include: true })).toEqual(['excluded', 'change', 'inline']);
    const skipped = parse('subscription { onNoteChanged @include(if: false) { event } }');
    expect(realtimeResponseNames(skipped, undefined, fields)).toEqual([]);
  });
});
