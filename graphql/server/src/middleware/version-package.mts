import { createRequire } from 'node:module';

export const loadPackageMetadata = (): { name: string; version: string } =>
  createRequire(import.meta.url)('#server-package');
