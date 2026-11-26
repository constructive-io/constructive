const mockCheckForUpdates = jest.fn(async (_options: unknown) => ({
  hasUpdate: true,
  currentVersion: '1.0.0',
  latestVersion: '2.0.0',
  message: 'Update available: 1.0.0 -> 2.0.0'
}));

jest.mock('@inquirerer/utils', () => ({ checkForUpdates: (options: unknown) => mockCheckForUpdates(options) }));

import { updateNotice } from '../src/index';

describe('the update notice', () => {
  beforeEach(() => mockCheckForUpdates.mockClear());

  // checkForUpdates is the only code here that asks the registry and writes the cache under the home
  // directory, so not calling it means that no request leaves and nothing is written there.
  it('does not check the registry, nor write its cache, when CONSTRUCTIVE_STASH_DIR is set', async () => {
    expect(await updateNotice({ CONSTRUCTIVE_STASH_DIR: '/tmp/an-isolated-stash' })).toBeNull();
    expect(mockCheckForUpdates).not.toHaveBeenCalled();
  });

  it('checks, and names the upgrade command, when no stash directory is set', async () => {
    expect(await updateNotice({})).toContain('Update available: 1.0.0 -> 2.0.0');
    expect(mockCheckForUpdates).toHaveBeenCalledTimes(1);
  });
});
