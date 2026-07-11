jest.setTimeout(60000);
process.env.PGPM_SKIP_UPDATE_CHECK = 'true';

import { PgpmPackage } from '@pgpmjs/core';
import { readFileSync, writeFileSync } from 'fs';
import { sync as glob } from 'glob';
import { Inquirerer, ParsedArgs } from 'inquirerer';
import * as path from 'path';

import { commands } from '../src/commands';
import {
  setupTests,
  TestEnvironment,
  TestFixture,
  withInitDefaults
} from '../test-utils';

const beforeEachSetup = setupTests();

describe('cmds:extension', () => {
  let environment: TestEnvironment;
  let fixture: TestFixture;

  beforeEach(() => {
    environment = beforeEachSetup();
    fixture = new TestFixture(); // empty fixture
  });

  afterEach(() => {
    fixture.cleanup();
  });

  const runCommand = async (argv: ParsedArgs) => {
    const prompter = new Inquirerer({
      input: environment.mockInput,
      output: environment.mockOutput,
      noTty: true
    });

    const isInit = Array.isArray(argv._) && argv._.includes('init');
    if (isInit) {
      argv = withInitDefaults(argv);
    }

    // @ts-ignore
    return commands(argv, prompter, {});
  };

  it('runs `extension` command after workspace and module setup', async () => {
    const workspacePath = fixture.fixturePath('my-workspace');
    const modulePath = path.join(workspacePath, 'packages', 'my-module');

    // Step 1: Initialize workspace
    await runCommand({
      _: ['init', 'workspace'],
      cwd: fixture.tempDir,
      name: 'my-workspace',
      workspace: true
    });

    // Step 2: Initialize module inside workspace
    await runCommand({
      _: ['init'],
      cwd: workspacePath,
      name: 'my-module',
      moduleName: 'my-module',
      extensions: ['mod-1', 'mod2']
    });

    // Step 2b: Snapshot initial control file and module dependencies
    const initialProject = new PgpmPackage(modulePath);

    expect(initialProject.getModuleControlFile()).toMatchSnapshot('initial - control file');
    expect(initialProject.getModuleDependencies('my-module')).toMatchSnapshot('initial - module dependencies');
    expect(initialProject.getRequiredModules()).toMatchSnapshot('initial - required modules');

    // Step 3: Run `extension` command to update module
    const extensionResult = await runCommand({
      _: ['extension'],
      cwd: modulePath,
      extensions: ['plpgsql', 'module-c']
    });

    // Clean `cwd` for stable snapshot
    extensionResult.cwd = '<CWD>';

    const allFiles = glob('**/*', {
      cwd: modulePath,
      dot: true,
      nodir: true,
      absolute: true
    });

    const relativeFiles = allFiles.map(file => path.relative(modulePath, file));

    expect(extensionResult).toMatchSnapshot('extension-update - result');
    expect(relativeFiles).toMatchSnapshot('extension-update - files');

    // Step 4: Re-init package and validate changes
    const updatedProject = new PgpmPackage(modulePath);

    expect(updatedProject.getModuleControlFile()).toMatchSnapshot('updated - control file');
    expect(updatedProject.getModuleDependencies('my-module')).toMatchSnapshot('updated - module dependencies');
    expect(updatedProject.getRequiredModules()).toMatchSnapshot('updated - required modules');
  });

  // Helper: scaffold a workspace + module with a starting set of extensions.
  const scaffoldModule = async (extensions: string[]) => {
    const workspacePath = fixture.fixturePath('ws');
    const modulePath = path.join(workspacePath, 'packages', 'my-module');
    await runCommand({
      _: ['init', 'workspace'],
      cwd: fixture.tempDir,
      name: 'ws',
      workspace: true
    });
    await runCommand({
      _: ['init'],
      cwd: workspacePath,
      name: 'my-module',
      moduleName: 'my-module',
      extensions
    });
    return modulePath;
  };

  it('adds a dependency non-interactively with --add', async () => {
    const modulePath = await scaffoldModule(['citext']);

    await runCommand({ _: ['extension'], cwd: modulePath, add: 'uuid-ossp' });

    expect(new PgpmPackage(modulePath).getRequiredModules()).toEqual([
      'citext',
      'uuid-ossp'
    ]);
  });

  it('removes a dependency non-interactively with --remove', async () => {
    const modulePath = await scaffoldModule(['citext', 'uuid-ossp']);

    await runCommand({ _: ['extension'], cwd: modulePath, remove: 'uuid-ossp' });

    expect(new PgpmPackage(modulePath).getRequiredModules()).toEqual(['citext']);
  });

  it('replaces the dependency set non-interactively with --set', async () => {
    const modulePath = await scaffoldModule(['citext', 'uuid-ossp']);

    await runCommand({ _: ['extension'], cwd: modulePath, set: 'plpgsql,hstore' });

    expect(new PgpmPackage(modulePath).getRequiredModules()).toEqual([
      'plpgsql',
      'hstore'
    ]);
  });

  it('preserves custom .control fields when changing dependencies', async () => {
    const modulePath = await scaffoldModule(['citext']);
    const project = new PgpmPackage(modulePath);
    const controlPath = path.join(modulePath, `${project.getModuleName()}.control`);

    // Hand-tune a custom field that init does not emit.
    const original = readFileSync(controlPath, 'utf8');
    writeFileSync(controlPath, `${original}schema = my_schema\n`);

    await runCommand({ _: ['extension'], cwd: modulePath, add: 'uuid-ossp' });

    const updated = readFileSync(controlPath, 'utf8');
    expect(updated).toMatch(/schema = my_schema/);
    expect(new PgpmPackage(modulePath).getRequiredModules()).toEqual([
      'citext',
      'uuid-ossp'
    ]);
  });
});
