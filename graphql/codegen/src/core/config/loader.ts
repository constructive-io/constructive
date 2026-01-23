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

/**
 * Find the nearest config file by walking up directories
 */
export function findConfigFile(
  startDir: string = process.cwd()
): string | null {
  let currentDir = startDir;

  while (true) {
    const configPath = path.join(currentDir, CONFIG_FILENAME);
    if (fs.existsSync(configPath)) {
      return configPath;
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
}

/**
 * Load and validate a config file
 *
 * Uses jiti to support TypeScript config files (.ts) in addition to
 * JavaScript (.js, .mjs, .cjs) without requiring the user to have
 * tsx or ts-node installed.
 */
export async function loadConfigFile(
  configPath: string
): Promise<LoadConfigFileResult> {
  const resolvedPath = path.resolve(configPath);

  if (!fs.existsSync(resolvedPath)) {
    return {
      success: false,
      error: `Config file not found: ${resolvedPath}`,
    };
  }

  try {
    // Use jiti to load TypeScript/ESM config files seamlessly
    // jiti handles .ts, .js, .mjs, .cjs and ESM/CJS interop
    const jiti = createJiti(__filename, {
      interopDefault: true,
      debug: process.env.JITI_DEBUG === '1',
    });

    // jiti.import() with { default: true } returns mod?.default ?? mod
    const config = await jiti.import(resolvedPath, { default: true });

    if (!config || typeof config !== 'object') {
      return {
        success: false,
        error: 'Config file must export a configuration object',
      };
    }

    const hasEndpoint = 'endpoint' in config;
    const hasSchema = 'schema' in config;
    const hasTargets = 'targets' in config;

    if (!hasEndpoint && !hasSchema && !hasTargets) {
      return {
        success: false,
        error: 'Config file must define "endpoint", "schema", or "targets".',
      };
    }

    if (hasTargets) {
      const targets = config.targets as unknown;
      if (!targets || typeof targets !== 'object' || Array.isArray(targets)) {
        return {
          success: false,
          error: 'Config file "targets" must be an object of named configs.',
        };
      }
    }

    return {
      success: true,
      config,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to load config file: ${message}`,
    };
  }
}
