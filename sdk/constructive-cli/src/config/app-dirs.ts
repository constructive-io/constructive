/**
 * Application directory management using appstash.
 *
 * Provides a standardized way to manage CLI tool configuration directories,
 * including config, cache, data, and log directories following XDG conventions.
 */

import { appstash, createConfigStore } from 'appstash';

/**
 * Options for initializing application directories.
 */
export interface AppDirOptions {
  /** Ensure directories are created if they don't exist */
  ensure?: boolean;
}

/**
 * Get the application directory paths for a CLI tool.
 * Creates directories under ~/.toolName/ with standard subdirectories.
 *
 * @param toolName - The name of the CLI tool (e.g. 'my-cli')
 * @param options - Options for directory initialization
 * @returns Object with paths to config, cache, data, and log directories
 */
export function getAppDirs(toolName: string, options: AppDirOptions = {}) {
  return appstash(toolName, { ensure: options.ensure ?? true });
}

/**
 * Create a config store for a CLI tool.
 * The config store manages contexts, credentials, and settings
 * persisted to the filesystem.
 *
 * @param toolName - The name of the CLI tool
 * @returns A config store instance with context and credential management
 */
export function getConfigStore(toolName: string) {
  return createConfigStore(toolName);
}
