import type { RequestHandler } from 'express';
import { findAndRequirePackageJson } from 'find-and-require-package-json';

let metadata: Promise<{ name: string; version: string }> | undefined;

const loadMetadata = async () => {
  if (typeof __dirname !== 'undefined') return findAndRequirePackageJson(__dirname);
  return (await import('./version-package.mjs')).loadPackageMetadata();
};

/**
 * GET /version: the server package and the commit this process runs, so a run
 * report can say what it tested. The server mounts it before routing, so it
 * answers on every host without a credential or the database.
 */
export const version = (commit: string | undefined): RequestHandler => {
  return async (_req, res, next) => {
    let pkg;
    try {
      pkg = await (metadata ??= loadMetadata());
    } catch (error) {
      return next(error);
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ name: pkg.name, version: pkg.version, commit: commit || null });
  };
};
