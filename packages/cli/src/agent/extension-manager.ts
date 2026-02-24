import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';

import { runCommand } from './process-utils';

const requireFromHere = createRequire(__filename);

interface PiPackageFilter {
  source?: string;
}

interface PiSettingsFile {
  packages?: Array<string | PiPackageFilter>;
}

export interface ConstructivePiExtensionResolution {
  packageRootPath: string;
  packageSourcePath: string;
  extensionEntryPath: string;
}

export interface EnsureConstructiveExtensionInstalledOptions {
  piBinaryPath: string;
  cwd: string;
  packageSourcePath: string;
  verbose?: boolean;
}

export interface EnsureConstructiveExtensionInstalledResult {
  installed: boolean;
  packageSourcePath: string;
}

const normalizeString = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const readProjectSettings = (cwd: string): {
  settingsPath: string;
  settingsDir: string;
  settings: PiSettingsFile | null;
} => {
  const settingsPath = path.join(cwd, '.pi', 'settings.json');
  const settingsDir = path.dirname(settingsPath);
  if (!fs.existsSync(settingsPath)) {
    return {
      settingsPath,
      settingsDir,
      settings: null,
    };
  }

  try {
    const raw = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(raw) as PiSettingsFile;
    return {
      settingsPath,
      settingsDir,
      settings,
    };
  } catch {
    return {
      settingsPath,
      settingsDir,
      settings: null,
    };
  }
};

const extractPackageSources = (
  settings: PiSettingsFile | null,
): string[] => {
  if (!settings?.packages || !Array.isArray(settings.packages)) {
    return [];
  }

  const sources: string[] = [];
  for (const item of settings.packages) {
    if (typeof item === 'string') {
      sources.push(item);
      continue;
    }
    if (item && typeof item === 'object' && typeof item.source === 'string') {
      sources.push(item.source);
    }
  }

  return sources;
};

const isRemoteSource = (source: string): boolean => {
  return (
    source.startsWith('npm:') ||
    source.startsWith('git:') ||
    /^[a-z]+:\/\//i.test(source)
  );
};

const normalizeSourcePath = (
  source: string,
  settingsDir: string,
): string | null => {
  const trimmed = normalizeString(source);
  if (!trimmed || isRemoteSource(trimmed)) {
    return null;
  }

  return path.resolve(settingsDir, trimmed);
};

const resolvePackageSourcePath = (packageRootPath: string): string => {
  const distPath = path.join(packageRootPath, 'dist');
  const distPackageJson = path.join(distPath, 'package.json');
  if (fs.existsSync(distPackageJson)) {
    return distPath;
  }
  return packageRootPath;
};

const resolveExtensionEntryPath = (
  packageRootPath: string,
  packageSourcePath: string,
): string => {
  const candidates = [
    path.join(packageSourcePath, 'extension.js'),
    path.join(packageRootPath, 'extension.js'),
    path.join(packageRootPath, 'src', 'extension.ts'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Unable to resolve Constructive PI extension entrypoint from ${packageRootPath}.`,
  );
};

export function resolveConstructivePiExtension(): ConstructivePiExtensionResolution {
  let packageJsonPath: string;
  try {
    packageJsonPath = requireFromHere.resolve(
      '@constructive-io/constructive-agent-pi-extension/package.json',
    );
  } catch {
    throw new Error(
      'Missing dependency: @constructive-io/constructive-agent-pi-extension. Install/update @constructive-io/cli dependencies first.',
    );
  }

  const packageRootPath = path.dirname(packageJsonPath);
  const packageSourcePath = resolvePackageSourcePath(packageRootPath);
  const sourcePackageJson = path.join(packageSourcePath, 'package.json');

  if (!fs.existsSync(sourcePackageJson)) {
    throw new Error(
      `Resolved Constructive PI package source has no package.json: ${packageSourcePath}.`,
    );
  }

  const extensionEntryPath = resolveExtensionEntryPath(
    packageRootPath,
    packageSourcePath,
  );

  return {
    packageRootPath,
    packageSourcePath,
    extensionEntryPath,
  };
}

export function isConstructivePackageInstalledForProject(
  cwd: string,
  packageSourcePath: string,
): boolean {
  const { settingsDir, settings } = readProjectSettings(cwd);
  const expectedPath = path.resolve(packageSourcePath);
  const sources = extractPackageSources(settings);

  for (const source of sources) {
    const normalized = normalizeSourcePath(source, settingsDir);
    if (normalized && path.resolve(normalized) === expectedPath) {
      return true;
    }
  }

  return false;
}

export async function ensureConstructiveExtensionInstalled(
  options: EnsureConstructiveExtensionInstalledOptions,
): Promise<EnsureConstructiveExtensionInstalledResult> {
  if (
    isConstructivePackageInstalledForProject(
      options.cwd,
      options.packageSourcePath,
    )
  ) {
    return {
      installed: false,
      packageSourcePath: options.packageSourcePath,
    };
  }

  const result = await runCommand(
    options.piBinaryPath,
    ['install', options.packageSourcePath, '-l'],
    {
      cwd: options.cwd,
      inheritStdio: Boolean(options.verbose),
      env: process.env,
    },
  );

  if (result.exitCode !== 0) {
    const stderr = result.stderr.trim();
    const stdout = result.stdout.trim();
    const details = stderr || stdout || `exit=${result.exitCode}`;
    throw new Error(`Failed to install Constructive PI package: ${details}`);
  }

  return {
    installed: true,
    packageSourcePath: options.packageSourcePath,
  };
}
