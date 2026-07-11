import fs from 'fs';
import os from 'os';
import path from 'path';

import { DEFAULT_TEMPLATE_REPO, PGLITE_TEMPLATE_REPO } from '@pgpmjs/core';

import {
  persistBoilerplateSource,
  readBoilerplateSource,
  resolveInitTemplateRepo,
} from '../src/commands/init/boilerplate';

describe('resolveInitTemplateRepo', () => {
  it('defaults to the pgpm boilerplates repo (not explicit)', () => {
    expect(resolveInitTemplateRepo({})).toEqual({
      templateRepo: DEFAULT_TEMPLATE_REPO,
      repoWasExplicit: false,
    });
  });

  it('maps --pglite to the pglite boilerplates repo (explicit)', () => {
    expect(resolveInitTemplateRepo({ pglite: true })).toEqual({
      templateRepo: PGLITE_TEMPLATE_REPO,
      repoWasExplicit: true,
    });
  });

  it('lets --repo win over --pglite', () => {
    const custom = 'https://github.com/acme/my-boilerplates.git';
    expect(resolveInitTemplateRepo({ repo: custom, pglite: true })).toEqual({
      templateRepo: custom,
      repoWasExplicit: true,
    });
  });
});

describe('persist/read boilerplate source', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pgpm-boilerplate-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('records the source into an existing pgpm.json and reads it back', () => {
    fs.writeFileSync(
      path.join(dir, 'pgpm.json'),
      `${JSON.stringify({ packages: ['packages/*'] }, null, 2)}\n`
    );

    persistBoilerplateSource(dir, { repo: PGLITE_TEMPLATE_REPO });

    const config = JSON.parse(fs.readFileSync(path.join(dir, 'pgpm.json'), 'utf8'));
    expect(config.packages).toEqual(['packages/*']);
    expect(config.boilerplates).toEqual({ repo: PGLITE_TEMPLATE_REPO });

    expect(readBoilerplateSource(dir)).toEqual({
      repo: PGLITE_TEMPLATE_REPO,
      branch: undefined,
      dir: undefined,
    });
  });

  it('persists optional branch and dir when provided', () => {
    fs.writeFileSync(
      path.join(dir, 'pgpm.json'),
      `${JSON.stringify({ packages: ['packages/*'] }, null, 2)}\n`
    );

    persistBoilerplateSource(dir, {
      repo: PGLITE_TEMPLATE_REPO,
      branch: 'main',
      dir: 'pglite',
    });

    expect(readBoilerplateSource(dir)).toEqual({
      repo: PGLITE_TEMPLATE_REPO,
      branch: 'main',
      dir: 'pglite',
    });
  });

  it('is a no-op when there is no pgpm.json (does not create one)', () => {
    persistBoilerplateSource(dir, { repo: PGLITE_TEMPLATE_REPO });
    expect(fs.existsSync(path.join(dir, 'pgpm.json'))).toBe(false);
  });

  it('returns undefined when the workspace has no recorded source', () => {
    fs.writeFileSync(
      path.join(dir, 'pgpm.json'),
      `${JSON.stringify({ packages: ['packages/*'] }, null, 2)}\n`
    );
    expect(readBoilerplateSource(dir)).toBeUndefined();
  });
});
