import { findAndRequirePackageJson } from 'find-and-require-package-json';
import { Logger } from '@pgpmjs/logger';
import fs from 'fs';
import path from 'path';
import os from 'os';

const log = new Logger('update-check');

const UPDATE_CHECK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

export interface CheckForUpdatesOptions {
  pkgName?: string;
  pkgVersion?: string;
  command?: string;
  now?: number;
  updateCommand?: string;
  toolName?: string;
  key?: string;
}

interface UpdateCheckConfig {
  lastCheckedAt: number;
  latestKnownVersion: string;
}

const shouldSkip = (command?: string): boolean => {
  if (process.env.PGPM_SKIP_UPDATE_CHECK) return true;
  if (process.env.CI === 'true') return true;
  return false;
};

function getConfigPath(toolName: string, key: string): string {
  const configDir = path.join(os.homedir(), `.${toolName}`);
  return path.join(configDir, `${key}.json`);
}

function readConfig(toolName: string, key: string): UpdateCheckConfig | null {
  try {
    const configPath = getConfigPath(toolName, key);
    if (!fs.existsSync(configPath)) return null;
    const content = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function writeConfig(toolName: string, key: string, config: UpdateCheckConfig): void {
  try {
    const configPath = getConfigPath(toolName, key);
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch {
    // Ignore write errors
  }
}

async function fetchLatestVersion(pkgName: string): Promise<string | null> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${pkgName}/latest`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.version || null;
  } catch {
    return null;
  }
}

function compareVersions(current: string, latest: string): number {
  const currentParts = current.replace(/^v/, '').split('.').map(Number);
  const latestParts = latest.replace(/^v/, '').split('.').map(Number);
  
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const c = currentParts[i] || 0;
    const l = latestParts[i] || 0;
    if (c < l) return -1;
    if (c > l) return 1;
  }
  return 0;
}

export async function checkForUpdates(options: CheckForUpdatesOptions = {}): Promise<UpdateCheckConfig | null> {
  const {
    pkgName = '@constructive-io/cli',
    pkgVersion = findAndRequirePackageJson(__dirname).version,
    command,
    now = Date.now(),
    key = 'update-check',
    toolName = 'constructive'
  } = options;

  if (shouldSkip(command)) {
    return null;
  }

  try {
    const existing = readConfig(toolName, key);
    let latestKnownVersion = existing?.latestKnownVersion ?? pkgVersion;

    const needsCheck = !existing?.lastCheckedAt || (now - existing.lastCheckedAt) > UPDATE_CHECK_TTL_MS;

    if (needsCheck) {
      const fetched = await fetchLatestVersion(pkgName);
      if (fetched) {
        latestKnownVersion = fetched;
      }

      writeConfig(toolName, key, {
        lastCheckedAt: now,
        latestKnownVersion
      });
    }

    const comparison = compareVersions(pkgVersion, latestKnownVersion);
    const isOutdated = comparison < 0;

    if (isOutdated) {
      const updateInstruction = options.updateCommand ?? `Run npm i -g ${pkgName}@latest to upgrade.`;

      log.warn(
        `A new version of ${pkgName} is available (current ${pkgVersion}, latest ${latestKnownVersion}). ${updateInstruction}`
      );

      writeConfig(toolName, key, {
        lastCheckedAt: now,
        latestKnownVersion
      });
    }

    return {
      lastCheckedAt: now,
      latestKnownVersion
    };
  } catch (error) {
    log.debug('Update check skipped due to error:', error);
    return null;
  }
}
