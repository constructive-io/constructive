import { svcCache } from '@pgpmjs/server-utils';
import type { Express } from 'express';
import { readFileSync } from 'fs';
import { graphileCache } from 'graphile-cache';
import { execFileSync } from 'node:child_process';
import { join } from 'path';
import supertest from 'supertest';

import { Server } from '../../server';

const pkg = JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf8'));

const servers: Server[] = [];

// Port 1 refuses every connection, so a request that reaches the database or
// the routing of a host fails instead of answering.
const appWith = (commit: string | undefined): Express => {
  const previous = process.env.SERVER_COMMIT;
  if (commit === undefined) delete process.env.SERVER_COMMIT;
  else process.env.SERVER_COMMIT = commit;
  try {
    const server = new Server({ pg: { host: '127.0.0.1', port: 1, database: 'version_route_test' } });
    servers.push(server);
    return (server as unknown as { app: Express }).app;
  } finally {
    if (previous === undefined) delete process.env.SERVER_COMMIT;
    else process.env.SERVER_COMMIT = previous;
  }
};

describe('GET /version', () => {
  afterEach(async () => {
    for (const server of servers.splice(0)) await server.close();
    svcCache.clear();
    graphileCache.clear();
  });

  it('answers the package and the commit of SERVER_COMMIT, uncached', async () => {
    const res = await supertest(appWith('0123456789abcdef0123456789abcdef01234567'))
      .get('/version').set('Host', 'api.localhost');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual({ name: pkg.name, version: pkg.version, commit: '0123456789abcdef0123456789abcdef01234567' });
  });

  it.each([
    ['unset', undefined],
    ['empty, as an image built without the argument has it', '']
  ])('answers a null commit when SERVER_COMMIT is %s', async (_what, commit) => {
    const res = await supertest(appWith(commit)).get('/version').set('Host', 'api.localhost');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: pkg.name, version: pkg.version, commit: null });
  });

  it('answers on a host the server does not route, with a bad credential, without the database', async () => {
    const res = await supertest(appWith('abc1234'))
      .get('/version').set('Host', 'nowhere.invalid').set('Authorization', 'Bearer not-a-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: pkg.name, version: pkg.version, commit: 'abc1234' });
  });

  it('reads the package metadata when loaded from the ESM build', () => {
    const result = execFileSync(process.execPath, ['--input-type=module', '--eval', `
      import { version } from './dist/esm/middleware/version.js';
      await version('abc1234')(null, {
        setHeader() {},
        json(body) { console.log(JSON.stringify(body)); }
      }, (error) => { throw error; });
    `], { cwd: join(__dirname, '../../..'), encoding: 'utf8' });

    expect(JSON.parse(result)).toEqual({ name: pkg.name, version: pkg.version, commit: 'abc1234' });
  });
});
