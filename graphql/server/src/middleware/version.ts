import type { RequestHandler } from 'express';
import { findAndRequirePackageJson } from 'find-and-require-package-json';

const pkg = findAndRequirePackageJson(__dirname);

/**
 * GET /version: the server package and the commit this process runs, so a run
 * report can say what it tested. The server mounts it before routing, so it
 * answers on every host without a credential or the database.
 */
export const version = (commit: string | undefined): RequestHandler => {
  const body = { name: pkg.name, version: pkg.version, commit: commit || null };
  return (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(body);
  };
};
