jest.setTimeout(30000);

import fs from 'fs';
import os from 'os';
import path from 'path';

import { scaffoldTemplate } from '@pgpmjs/core';

import { TEST_TEMPLATE_REPO } from '../test-utils/fixtures';

describe('Template scaffolding', () => {
  it('processes workspace template from default repo', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'constructive-workspace-'));

    await scaffoldTemplate({
      type: 'workspace',
      outputDir: outDir,
      templateRepo: TEST_TEMPLATE_REPO,
      branch: 'main',
      templatePath: 'default/workspace',
      answers: { 
        name: 'demo-workspace',
        fullName: 'Tester',
        email: 'tester@example.com',
        moduleName: 'demo-module',
        username: 'tester',
        repoName: 'demo-module',
        license: 'MIT'
      },
      noTty: true
    });

    expect(fs.existsSync(outDir)).toBe(true);
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  it('processes module template from default repo', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'constructive-module-'));

    await scaffoldTemplate({
      type: 'module',
      outputDir: outDir,
      templateRepo: TEST_TEMPLATE_REPO,
      branch: 'main',
      templatePath: 'default/module',
      answers: { 
        name: 'demo-module',
        description: 'demo module',
        author: 'tester',
        fullName: 'Tester',
        email: 'tester@example.com',
        moduleDesc: 'demo module',
        moduleName: 'demo-module',
        repoName: 'demo-module',
        access: 'public',
        license: 'MIT',
        username: 'tester',
        packageIdentifier: 'demo-module'
      },
      noTty: true
    });

    expect(fs.existsSync(outDir)).toBe(true);
    fs.rmSync(outDir, { recursive: true, force: true });
  });
});
