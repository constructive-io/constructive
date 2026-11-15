import { svcCache } from '@pgpmjs/server-utils';
import { graphileCache } from 'graphile-cache';

// A handler build that started before an eviction must not be admitted after
// it: the build read the pre-eviction service entry. Each eviction advances
// the key's generation, and the build compares the generation it started
// under with the one it sees at admission time.
const generations = new Map<string, number>();
let sequence = 0;
let globalGeneration = 0;

export const generationOf = (key: string): number => generations.get(key) ?? globalGeneration;

export const evictServiceKey = (key: string): void => {
  generations.set(key, ++sequence);
  graphileCache.delete(key);
  svcCache.delete(key);
};

// Advance even keys absent from both caches: they may have a build in flight.
export const evictAllServiceKeys = (): void => {
  globalGeneration = ++sequence;
  generations.clear();
  graphileCache.clear();
  svcCache.clear();
};

export const clearGenerations = (): void => {
  sequence = 0;
  globalGeneration = 0;
  generations.clear();
};
