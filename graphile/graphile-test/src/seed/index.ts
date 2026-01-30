import { compose, fn, sqlfile } from './adapters.js';

export * from './types.js';

export const seed = {
  sqlfile,
  fn,
  compose
};
