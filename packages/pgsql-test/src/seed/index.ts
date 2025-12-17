import { compose, fn, sqlfile } from './adapters';
import { csv } from './csv';
import { json } from './json';
import { pgpm } from './pgpm';
export * from './csv';
export * from './types';

export const seed = {
  pgpm,
  json,
  csv,
  compose,
  fn,
  sqlfile
};