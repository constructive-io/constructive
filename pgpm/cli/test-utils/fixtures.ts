import path from 'path';
import { DEFAULT_TEMPLATE_REPO } from '@pgpmjs/core';
import { createTestFixture, TestFixture as BaseTestFixture, TestFixtureOptions } from '@inquirerer/test';
import { ParsedArgs } from 'inquirerer';

import { commands } from '../src/commands';
import { withInitDefaults } from './init-argv';

export const FIXTURES_PATH = path.resolve(__dirname, '../../../__fixtures__');

export const getFixturePath = (...paths: string[]) =>
  path.join(FIXTURES_PATH, ...paths);

const createFixture = (...fixturePath: string[]) =>
  createTestFixture(
    {
      commands: commands as unknown as TestFixtureOptions['commands'],
      fixtureRoot: FIXTURES_PATH,
      tmpPrefix: 'pgpm-test-',
      cliOptions: { version: '1.0.0' },
      argvTransform: (argv) => withInitDefaults(argv as ParsedArgs, DEFAULT_TEMPLATE_REPO)
    },
    ...fixturePath
  );

export { createFixture as createTestFixture };

export class TestFixture {
  private fixture: BaseTestFixture;

  constructor(...fixturePath: string[]) {
    this.fixture = createFixture(...fixturePath);
  }

  get tempDir() {
    return this.fixture.tempDir;
  }

  get tempFixtureDir() {
    return this.fixture.tempFixtureDir;
  }

  getFixturePath(...paths: string[]) {
    return this.fixture.getFixturePath(...paths);
  }

  fixturePath(...paths: string[]) {
    return this.fixture.fixturePath(...paths);
  }

  cleanup() {
    this.fixture.cleanup();
  }

  async runCmd(argv: Parameters<BaseTestFixture['runCmd']>[0]) {
    return this.fixture.runCmd(argv);
  }
}
