import { errors } from '@constructive-io/errors';
import { createHmac, randomBytes } from 'crypto';

/** A per-process key prevents cache fingerprints from exposing config values. */
const fingerprintSecret = randomBytes(32);

const referenceIds = new WeakMap<object, number>();
const symbolIds = new Map<symbol, number>();
let nextReferenceId = 1;

export interface GraphileBuildReference<T extends object | Function> {
  readonly value: T;
}

class GraphileBuildReferenceToken<T extends object | Function> implements GraphileBuildReference<T> {
  constructor(readonly value: T) {}
}

/** Compare a value by identity even when it is a plain object. */
export const referenceGraphileBuildValue = <T extends object | Function>(
  value: T
): GraphileBuildReference<T> => Object.freeze(new GraphileBuildReferenceToken(value));

const invalidIdentity = (): never => {
  throw errors.INTERNAL_FAILURE({ details: 'Invalid Graphile build identity' });
};

const referenceId = (value: object | Function): number => {
  let id = referenceIds.get(value as object);
  if (id === undefined) {
    id = nextReferenceId++;
    referenceIds.set(value as object, id);
  }
  return id;
};

const symbolId = (value: symbol): number => {
  let id = symbolIds.get(value);
  if (id === undefined) {
    id = nextReferenceId++;
    symbolIds.set(value, id);
  }
  return id;
};

const numberValue = (value: number): string | number => {
  if (Number.isNaN(value)) return 'NaN';
  if (value === Infinity) return '+Infinity';
  if (value === -Infinity) return '-Infinity';
  if (Object.is(value, -0)) return '-0';
  return value;
};

const isArrayIndex = (key: string, length: number): boolean => {
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < length && String(index) === key;
};

const canonicalObjectEntries = (
  value: object,
  active: Set<object>,
  omit: (key: PropertyKey) => boolean = () => false
): Array<[unknown, unknown]> => {
  const entries: Array<[unknown, unknown]> = [];
  for (const key of Reflect.ownKeys(value)) {
    if (omit(key)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable) continue;
    if (!('value' in descriptor)) return invalidIdentity();
    const canonicalKey = typeof key === 'symbol'
      ? ['symbol-key', symbolId(key)]
      : ['string-key', key];
    entries.push([canonicalKey, canonicalize(descriptor.value, active)]);
  }
  entries.sort((left, right) => {
    const leftKey = JSON.stringify(left[0]);
    const rightKey = JSON.stringify(right[0]);
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
  return entries;
};

const canonicalize = (value: unknown, active: Set<object>): unknown => {
  if (value === undefined) return ['undefined'];
  if (value === null) return ['null'];

  switch (typeof value) {
    case 'boolean': return ['boolean', value];
    case 'string': return ['string', value];
    case 'number': return ['number', numberValue(value)];
    case 'bigint': return ['bigint', value.toString()];
    case 'symbol': return ['symbol', symbolId(value)];
    case 'function': return ['function', referenceId(value)];
    case 'object': break;
    default: return invalidIdentity();
  }

  const object = value as object;
  if (value instanceof GraphileBuildReferenceToken) {
    return ['explicit-reference', referenceId(value.value)];
  }
  if (active.has(object)) return invalidIdentity();

  if (Array.isArray(value)) {
    active.add(object);
    try {
      const items = Array.from({ length: value.length }, (_, index) =>
        index in value ? canonicalize(value[index], active) : ['array-hole']
      );
      const extraEntries = canonicalObjectEntries(value, active, (key) =>
        key === 'length' || (typeof key === 'string' && isArrayIndex(key, value.length))
      );
      return ['array', value.length, items, extraEntries];
    } finally {
      active.delete(object);
    }
  }

  if (Object.getPrototypeOf(value) === Date.prototype) {
    const time = Date.prototype.getTime.call(value);
    return ['date', Number.isNaN(time) ? 'Invalid Date' : time];
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return ['object-reference', referenceId(object)];
  }

  active.add(object);
  try {
    const entries = canonicalObjectEntries(value, active);
    return [prototype === null ? 'null-prototype-object' : 'plain-object', entries];
  } finally {
    active.delete(object);
  }
};

/**
 * Create a process-local, secret fingerprint for an exact Graphile build.
 * Plain objects compare by sorted enumerable data properties, arrays retain
 * order, and functions, symbols, and opaque instances compare by identity.
 */
export const createGraphileBuildCacheKey = (
  domain: 'server' | 'explorer',
  snapshot: unknown
): string => {
  try {
    const canonical = JSON.stringify(['graphile-build', domain, canonicalize(snapshot, new Set())]);
    const fingerprint = createHmac('sha256', fingerprintSecret).update(canonical).digest('hex');
    return `graphile:${domain}:${fingerprint}`;
  } catch {
    return invalidIdentity();
  }
};

const cloneSnapshotValue = (value: unknown, active: Set<object>): unknown => {
  if (value === null || typeof value !== 'object') return value;

  const object = value as object;
  if (active.has(object)) return invalidIdentity();

  if (Object.getPrototypeOf(value) === Date.prototype) {
    const snapshot = new Date(Date.prototype.getTime.call(value));
    const mutators = [
      'setTime', 'setMilliseconds', 'setUTCMilliseconds', 'setSeconds', 'setUTCSeconds',
      'setMinutes', 'setUTCMinutes', 'setHours', 'setUTCHours', 'setDate', 'setUTCDate',
      'setMonth', 'setUTCMonth', 'setFullYear', 'setUTCFullYear', 'setYear'
    ];
    for (const name of mutators) {
      Object.defineProperty(snapshot, name, {
        value: invalidIdentity,
        configurable: false,
        writable: false
      });
    }
    return Object.freeze(snapshot);
  }

  if (Array.isArray(value)) {
    active.add(object);
    try {
      const result = new Array(value.length) as unknown[] & Record<PropertyKey, unknown>;
      for (let index = 0; index < value.length; index++) {
        if (index in value) result[index] = cloneSnapshotValue(value[index], active);
      }
      for (const key of Reflect.ownKeys(value)) {
        if (key === 'length' || (typeof key === 'string' && isArrayIndex(key, value.length))) continue;
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor?.enumerable) continue;
        if (!('value' in descriptor)) return invalidIdentity();
        Object.defineProperty(result, key, {
          value: cloneSnapshotValue(descriptor.value, active),
          enumerable: true,
          configurable: false,
          writable: false
        });
      }
      return Object.freeze(result);
    } finally {
      active.delete(object);
    }
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;

  active.add(object);
  try {
    const result = Object.create(prototype) as Record<PropertyKey, unknown>;
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable) continue;
      if (!('value' in descriptor)) return invalidIdentity();
      Object.defineProperty(result, key, {
        value: cloneSnapshotValue(descriptor.value, active),
        enumerable: true,
        configurable: false,
        writable: false
      });
    }
    return Object.freeze(result);
  } finally {
    active.delete(object);
  }
};

/** Clone and freeze the plain data used by both fingerprinting and the build. */
export const snapshotGraphileBuildValue = <T>(value: T): Readonly<T> => {
  try {
    return cloneSnapshotValue(value, new Set()) as Readonly<T>;
  } catch {
    return invalidIdentity();
  }
};
