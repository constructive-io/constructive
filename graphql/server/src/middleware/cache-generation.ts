import { svcCache } from '@pgpmjs/server-utils';
import { graphileCache } from 'graphile-cache';

// A handler build that started before an eviction must not be admitted after
// it: the build read the pre-eviction service entry. Each eviction advances
// the key's generation, and the build compares the generation it started
// under with the one it sees at admission time.
const generations = new Map<string, number>();

export const generationOf = (key: string): number => generations.get(key) ?? 0;

export const evictServiceKey = (key: string): void => {
  generations.set(key, generationOf(key) + 1);
  graphileCache.delete(key);
  svcCache.delete(key);
};

export const clearGenerations = (): void => {
  generations.clear();
};
