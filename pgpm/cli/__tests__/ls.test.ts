import fs from 'fs';
import path from 'path';

import { TestFixture } from '../test-utils';

describe('pgpm ls', () => {
  let fixture: TestFixture;

  beforeEach(() => {
    fixture = new TestFixture();
  });

  afterEach(() => {
    fixture.cleanup();
  });

  const createWorkspace = (modules: Array<{
    name: string;
    version: string;
    requires?: string[];
  }> = []) => {
    const workspaceDir = path.join(fixture.tempDir, 'workspace');
    fs.mkdirSync(path.join(workspaceDir, 'packages'), { recursive: true });
    fs.writeFileSync(
      path.join(workspaceDir, 'pgpm.json'),
      JSON.stringify({ packages: ['packages/*'] }, null, 2)
    );

    for (const module of modules) {
      const moduleDir = path.join(workspaceDir, 'packages', module.name);
      fs.mkdirSync(moduleDir, { recursive: true });
      fs.writeFileSync(
        path.join(moduleDir, 'pgpm.plan'),
        '%syntax-version=1.0.0\n'
      );
      fs.writeFileSync(
        path.join(moduleDir, `${module.name}.control`),
        [
          `# ${module.name} extension`,
          `default_version = '${module.version}'`,
          module.requires && module.requires.length > 0
            ? `requires = '${module.requires.join(',')}'`
            : ''
        ].filter(Boolean).join('\n') + '\n'
      );
    }

    return workspaceDir;
  };

  const runLs = async (argv: Record<string, unknown>) => {
    const output: string[] = [];
    const write = jest.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
      output.push(String(chunk));
      return true;
    });
    try {
      await fixture.runCmd(argv);
    } finally {
      write.mockRestore();
    }
    return output.join('');
  };

  it('prints module objects as JSON sorted by name', async () => {
    const workspaceDir = createWorkspace([
      { name: 'b', version: '2.0.0', requires: ['plpgsql'] },
      { name: 'a', version: '1.0.0' }
    ]);

    const output = await runLs({
      _: ['ls'],
      cwd: workspaceDir,
      json: true
    });

    expect(output).toBe(`[
  {
    "name": "a",
    "version": "1.0.0",
    "path": "packages/a",
    "requires": []
  },
  {
    "name": "b",
    "version": "2.0.0",
    "path": "packages/b",
    "requires": [
      "plpgsql"
    ]
  }
]
`);
  });

  it('prints sorted names as a single-line JSON array', async () => {
    const workspaceDir = createWorkspace([
      { name: 'b', version: '2.0.0' },
      { name: 'a', version: '1.0.0' }
    ]);

    const output = await runLs({
      _: ['ls'],
      cwd: workspaceDir,
      names: true,
      json: true
    });

    expect(output).toBe('["a","b"]');
  });

  it('prints workspace-relative paths as a single-line JSON array', async () => {
    const workspaceDir = createWorkspace([
      { name: 'b', version: '2.0.0' },
      { name: 'a', version: '1.0.0' }
    ]);

    const output = await runLs({
      _: ['ls'],
      cwd: workspaceDir,
      paths: true,
      json: true
    });

    expect(output).toBe('["packages/a","packages/b"]');
  });

  it('prints human-readable module listings', async () => {
    const workspaceDir = createWorkspace([
      { name: 'b', version: '2.0.0' },
      { name: 'a', version: '1.0.0' }
    ]);

    const output = await runLs({
      _: ['ls'],
      cwd: workspaceDir
    });

    expect(output).toContain('a');
    expect(output).toContain('b');
    expect(output).toContain('1.0.0');
    expect(output).toContain('packages/a');
  });

  it('prints an empty JSON array for an empty workspace', async () => {
    const workspaceDir = createWorkspace();

    const output = await runLs({
      _: ['ls'],
      cwd: workspaceDir,
      names: true,
      json: true
    });

    expect(output).toBe('[]');
  });

  it('fails outside a workspace', async () => {
    const exit = jest.spyOn(process, 'exit').mockImplementation((code?: string | number) => {
      throw new Error(`process.exit(${code})`);
    });
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(fixture.runCmd({
      _: ['ls'],
      cwd: fixture.tempDir,
      json: true
    })).rejects.toThrow('process.exit(1)');

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('Not inside a pgpm workspace')
    );

    error.mockRestore();
    exit.mockRestore();
  });
});
