import upgradeModulesCommand from '../commands/upgrade-modules';
import { PgpmPackage } from '@pgpmjs/core';

jest.mock('@pgpmjs/core', () => ({
  PgpmPackage: jest.fn()
}));

jest.mock('../utils/npm-version', () => ({
  fetchLatestVersion: jest.fn()
}));

const mockPgpmPackage = PgpmPackage as jest.MockedClass<typeof PgpmPackage>;
const { fetchLatestVersion } = require('../utils/npm-version') as { fetchLatestVersion: jest.Mock };

const createMockPrompter = (answers: Record<string, any> = {}) => ({
  prompt: jest.fn().mockResolvedValue(answers),
  close: jest.fn()
});

describe('upgrade-modules command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows help when --help flag is provided', async () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await expect(
      upgradeModulesCommand({ help: true }, createMockPrompter() as any, {} as any)
    ).rejects.toThrow('process.exit called');

    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls[0][0]).toContain('Upgrade Modules Command');

    mockExit.mockRestore();
    consoleSpy.mockRestore();
  });

  it('throws error when not in a module', async () => {
    mockPgpmPackage.mockImplementation(() => ({
      isInModule: jest.fn().mockReturnValue(false)
    } as any));

    await expect(
      upgradeModulesCommand({ cwd: '/test' }, createMockPrompter() as any, {} as any)
    ).rejects.toThrow('You must run this command inside a PGPM module');
  });

  it('handles no installed modules gracefully', async () => {
    mockPgpmPackage.mockImplementation(() => ({
      isInModule: jest.fn().mockReturnValue(true),
      getInstalledModules: jest.fn().mockReturnValue({
        installed: [],
        installedVersions: {}
      })
    } as any));

    await upgradeModulesCommand({ cwd: '/test' }, createMockPrompter() as any, {} as any);
  });

  it('handles all modules up to date', async () => {
    mockPgpmPackage.mockImplementation(() => ({
      isInModule: jest.fn().mockReturnValue(true),
      getInstalledModules: jest.fn().mockReturnValue({
        installed: ['@pgpm/base32'],
        installedVersions: { '@pgpm/base32': '1.0.0' }
      })
    } as any));

    fetchLatestVersion.mockResolvedValue('1.0.0');

    await upgradeModulesCommand({ cwd: '/test' }, createMockPrompter() as any, {} as any);
  });

  it('performs dry run without making changes', async () => {
    const mockUpgradeModules = jest.fn();
    mockPgpmPackage.mockImplementation(() => ({
      isInModule: jest.fn().mockReturnValue(true),
      getInstalledModules: jest.fn().mockReturnValue({
        installed: ['@pgpm/base32'],
        installedVersions: { '@pgpm/base32': '1.0.0' }
      }),
      upgradeModules: mockUpgradeModules
    } as any));

    fetchLatestVersion.mockResolvedValue('2.0.0');

    await upgradeModulesCommand(
      { cwd: '/test', 'dry-run': true }, 
      createMockPrompter() as any, 
      {} as any
    );

    expect(mockUpgradeModules).not.toHaveBeenCalled();
  });

  it('upgrades all modules when --all flag is provided', async () => {
    const mockUpgradeModules = jest.fn().mockResolvedValue({ updates: [] });
    mockPgpmPackage.mockImplementation(() => ({
      isInModule: jest.fn().mockReturnValue(true),
      getInstalledModules: jest.fn().mockReturnValue({
        installed: ['@pgpm/base32'],
        installedVersions: { '@pgpm/base32': '1.0.0' }
      }),
      upgradeModules: mockUpgradeModules
    } as any));

    fetchLatestVersion.mockResolvedValue('2.0.0');

    await upgradeModulesCommand(
      { cwd: '/test', all: true }, 
      createMockPrompter() as any, 
      {} as any
    );

    expect(mockUpgradeModules).toHaveBeenCalledWith({ modules: ['@pgpm/base32'] });
  });

  it('upgrades specific modules when --modules flag is provided', async () => {
    const mockUpgradeModules = jest.fn().mockResolvedValue({ updates: [] });
    mockPgpmPackage.mockImplementation(() => ({
      isInModule: jest.fn().mockReturnValue(true),
      getInstalledModules: jest.fn().mockReturnValue({
        installed: ['@pgpm/base32', '@pgpm/faker'],
        installedVersions: { 
          '@pgpm/base32': '1.0.0',
          '@pgpm/faker': '1.0.0'
        }
      }),
      upgradeModules: mockUpgradeModules
    } as any));

    fetchLatestVersion.mockResolvedValue('2.0.0');

    await upgradeModulesCommand(
      { cwd: '/test', modules: '@pgpm/base32' }, 
      createMockPrompter() as any, 
      {} as any
    );

    expect(mockUpgradeModules).toHaveBeenCalledWith({ modules: ['@pgpm/base32'] });
  });
});
