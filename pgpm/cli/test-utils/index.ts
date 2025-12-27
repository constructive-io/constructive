export * from './CLIDeployTestFixture';
export * from './fixtures';
export * from './init-argv';
export * from './TestDatabase';

// Re-export test utilities from @inquirerer/test for backwards compatibility
export {
  KEY_SEQUENCES,
  setupTests,
  createTestEnvironment,
  normalizePackageJsonForSnapshot,
  cleanAnsi
} from '@inquirerer/test';

export type {
  TestEnvironment,
  InputResponse,
  NormalizeOptions
} from '@inquirerer/test';
