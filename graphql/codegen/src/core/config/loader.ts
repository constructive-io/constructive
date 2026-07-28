/**
 * Configuration file loading utilities
 *
 * Pure functions for finding and loading graphql-codegen configuration files.
 * These are core utilities that can be used programmatically or by the CLI.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { createJiti } from 'jiti';

export const CONFIG_FILENAME = 'graphql-codegen.config.ts';
export const JSON_CONFIG_FILENAME = 'graphql-codegen.config.json';
export const CONFIG_FILENAMES = [
  JSON_CONFIG_FILENAME,
  CONFIG_FILENAME,
] as const;

export interface LoadConfigFileOptions {
  /** Permit importing executable TypeScript or JavaScript configuration. */
  allowExecutableConfig?: boolean;
}

export type LoadConfigFileErrorCode =
  | 'CODEGEN_CONFIG_INVALID'
  | 'CODEGEN_CONFIG_EXECUTABLE_UNSUPPORTED';

/**
 * Find the nearest config file by walking up directories
 */
export function findConfigFile(
  startDir: string = process.cwd()
): string | null {
  let currentDir = startDir;

  while (true) {
    for (const filename of CONFIG_FILENAMES) {
      const configPath = path.join(currentDir, filename);
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached root
      return null;
    }
    currentDir = parentDir;
  }
}

export interface LoadConfigFileResult {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any;
  error?: string;
  code?: LoadConfigFileErrorCode;
}

/**
 * Load and validate a config file
 *
 * Uses jiti to support TypeScript config files (.ts) in addition to
 * JavaScript (.js, .mjs, .cjs) without requiring the user to have
 * tsx or ts-node installed.
 */
export async function loadConfigFile(
  configPath: string,
  cwd: string = process.cwd(),
  env: Readonly<Record<string, string | undefined>> = {},
  options: LoadConfigFileOptions = {}
): Promise<LoadConfigFileResult> {
  const resolvedPath = path.isAbsolute(configPath)
    ? path.normalize(configPath)
    : path.resolve(cwd, configPath);

  if (!fs.existsSync(resolvedPath)) {
    return {
      success: false,
      code: 'CODEGEN_CONFIG_INVALID',
      error: `Config file not found: ${resolvedPath}`,
    };
  }

  const declarativeJson = path.extname(resolvedPath).toLowerCase() === '.json';
  if (!declarativeJson && options.allowExecutableConfig === false) {
    return {
      success: false,
      code: 'CODEGEN_CONFIG_EXECUTABLE_UNSUPPORTED',
      error:
        'Executable codegen configuration is disabled. Use a declarative JSON config file.',
    };
  }

  try {
    const config = declarativeJson
      ? JSON.parse(fs.readFileSync(resolvedPath, 'utf8'))
      : await createJiti(__filename, {
          interopDefault: true,
          debug: env.JITI_DEBUG === '1',
          // Config discovery is part of dry-run planning, so loading a config
          // must not create node_modules/.cache/jiti or temporary artifacts.
          fsCache: false,
        }).import(resolvedPath, { default: true });

    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return {
        success: false,
        code: 'CODEGEN_CONFIG_INVALID',
        error: 'Config file must export a configuration object',
      };
    }

    return {
      success: true,
      config,
    };
  } catch (err) {
    if (declarativeJson) {
      return {
        success: false,
        code: 'CODEGEN_CONFIG_INVALID',
        error: 'Failed to parse declarative JSON config file.',
      };
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      code: 'CODEGEN_CONFIG_INVALID',
      error: `Failed to load config file: ${message}`,
    };
  }
}
