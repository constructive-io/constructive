import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { isConstructivePackageInstalledForProject } from '../src/agent/extension-manager';

describe('isConstructivePackageInstalledForProject', () => {
  const createTempProject = () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-agent-test-'));
    fs.mkdirSync(path.join(root, '.pi'), { recursive: true });
    return root;
  };

  it('detects matching local package entry in project settings', () => {
    const projectRoot = createTempProject();
    const packagePath = path.join(projectRoot, 'packages', 'constructive-ext');
    fs.mkdirSync(packagePath, { recursive: true });

    const settingsPath = path.join(projectRoot, '.pi', 'settings.json');
    fs.writeFileSync(
      settingsPath,
      JSON.stringify(
        {
          packages: ['../packages/constructive-ext'],
        },
        null,
        2,
      ),
    );

    expect(
      isConstructivePackageInstalledForProject(projectRoot, packagePath),
    ).toBe(true);
  });

  it('returns false when package source is not present', () => {
    const projectRoot = createTempProject();
    const settingsPath = path.join(projectRoot, '.pi', 'settings.json');
    fs.writeFileSync(
      settingsPath,
      JSON.stringify(
        {
          packages: ['npm:@example/package'],
        },
        null,
        2,
      ),
    );

    expect(
      isConstructivePackageInstalledForProject(
        projectRoot,
        path.join(projectRoot, 'missing'),
      ),
    ).toBe(false);
  });
});
