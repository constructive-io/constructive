// Re-export test utilities from @inquirerer/test
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
