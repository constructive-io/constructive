jest.setTimeout(30000);

import fs from 'fs';
import os from 'os';
import path from 'path';

import { PgpmPackage } from '@pgpmjs/core';

const TEMPLATE_REPO = 'https://github.com/constructive-io/pgpm-boilerplates.git';

describe('Template scaffolding', () => {
  it('processes workspace template from default repo', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'constructive-workspace-'));

    await PgpmPackage.initWorkspace({
      name: 'demo-workspace',
      outputDir: outDir,
      templateRepo: TEMPLATE_REPO,
      branch: 'main',
      templatePath: 'default/workspace',
      answers: { 
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

  it('processes module template from default repo via initModule', async () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'constructive-workspace-for-module-'));
    
    await PgpmPackage.initWorkspace({
      name: 'test-workspace',
      outputDir: workspaceDir,
      templateRepo: TEMPLATE_REPO,
      branch: 'main',
      templatePath: 'default/workspace',
      answers: { 
        fullName: 'Tester',
        email: 'tester@example.com',
        moduleName: 'demo-module',
        username: 'tester',
        repoName: 'demo-module',
        license: 'MIT'
      },
      noTty: true
    });

    const pgpm = new PgpmPackage(workspaceDir);
    
    await pgpm.initModule({
      name: 'demo-module',
      description: 'demo module',
      author: 'tester',
      extensions: [],
      templateRepo: TEMPLATE_REPO,
      branch: 'main',
      templatePath: 'default/module',
      answers: { 
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

    const moduleDir = path.join(workspaceDir, 'packages', 'demo-module');
    expect(fs.existsSync(moduleDir)).toBe(true);
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  });
});
