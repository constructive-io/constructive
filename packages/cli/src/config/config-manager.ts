/**
 * Configuration manager for the CNC execution engine
 * Uses appstash for directory resolution
 */

import * as fs from 'fs';
import * as path from 'path';
import { appstash, resolve } from 'appstash';
import type {
  ContextConfig,
  GlobalSettings,
  Credentials,
  ContextCredentials,
} from './types';
import { DEFAULT_SETTINGS } from './types';

const TOOL_NAME = 'cnc';

/**
 * Get the appstash directories for cnc
 */
export function getAppDirs() {
  return appstash(TOOL_NAME, { ensure: true });
}

/**
 * Get path to a config file
 */
function getConfigPath(filename: string): string {
  const dirs = getAppDirs();
  return resolve(dirs, 'config', filename);
}

/**
 * Get path to a context config file
 */
function getContextConfigPath(contextName: string): string {
  const dirs = getAppDirs();
  const contextsDir = resolve(dirs, 'config', 'contexts');
  if (!fs.existsSync(contextsDir)) {
    fs.mkdirSync(contextsDir, { recursive: true });
  }
  return path.join(contextsDir, `${contextName}.json`);
}

/**
 * Load global settings
 */
export function loadSettings(): GlobalSettings {
  const settingsPath = getConfigPath('settings.json');
  if (fs.existsSync(settingsPath)) {
    try {
      const content = fs.readFileSync(settingsPath, 'utf8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save global settings
 */
export function saveSettings(settings: GlobalSettings): void {
  const settingsPath = getConfigPath('settings.json');
  const configDir = path.dirname(settingsPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

/**
 * Load credentials
 */
export function loadCredentials(): Credentials {
  const credentialsPath = getConfigPath('credentials.json');
  if (fs.existsSync(credentialsPath)) {
    try {
      const content = fs.readFileSync(credentialsPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return { tokens: {} };
    }
  }
  return { tokens: {} };
}

/**
 * Save credentials
 */
export function saveCredentials(credentials: Credentials): void {
  const credentialsPath = getConfigPath('credentials.json');
  const configDir = path.dirname(credentialsPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2), {
    mode: 0o600, // Read/write for owner only
  });
}

/**
 * Load a context configuration
 */
export function loadContext(contextName: string): ContextConfig | null {
  const contextPath = getContextConfigPath(contextName);
  if (fs.existsSync(contextPath)) {
    try {
      const content = fs.readFileSync(contextPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Save a context configuration
 */
export function saveContext(context: ContextConfig): void {
  const contextPath = getContextConfigPath(context.name);
  fs.writeFileSync(contextPath, JSON.stringify(context, null, 2));
}

/**
 * Delete a context configuration
 */
export function deleteContext(contextName: string): boolean {
  const contextPath = getContextConfigPath(contextName);
  if (fs.existsSync(contextPath)) {
    fs.unlinkSync(contextPath);
    return true;
  }
  return false;
}

/**
 * List all context configurations
 */
export function listContexts(): ContextConfig[] {
  const dirs = getAppDirs();
  const contextsDir = resolve(dirs, 'config', 'contexts');
  if (!fs.existsSync(contextsDir)) {
    return [];
  }

  const files = fs.readdirSync(contextsDir).filter(f => f.endsWith('.json'));
  const contexts: ContextConfig[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(contextsDir, file), 'utf8');
      contexts.push(JSON.parse(content));
    } catch {
      // Skip invalid files
    }
  }

  return contexts;
}

/**
 * Get the current active context
 */
export function getCurrentContext(): ContextConfig | null {
  const settings = loadSettings();
  if (settings.currentContext) {
    return loadContext(settings.currentContext);
  }
  return null;
}

/**
 * Set the current active context
 */
export function setCurrentContext(contextName: string): boolean {
  const context = loadContext(contextName);
  if (!context) {
    return false;
  }
  const settings = loadSettings();
  settings.currentContext = contextName;
  saveSettings(settings);
  return true;
}

/**
 * Create a new context configuration
 */
export function createContext(
  name: string,
  endpoint: string
): ContextConfig {
  const now = new Date().toISOString();

  const context: ContextConfig = {
    name,
    endpoint,
    createdAt: now,
    updatedAt: now,
  };

  saveContext(context);
  return context;
}

/**
 * Get credentials for a context
 */
export function getContextCredentials(
  contextName: string
): ContextCredentials | null {
  const credentials = loadCredentials();
  return credentials.tokens[contextName] || null;
}

/**
 * Set credentials for a context
 */
export function setContextCredentials(
  contextName: string,
  token: string,
  options?: {
    expiresAt?: string;
    refreshToken?: string;
  }
): void {
  const credentials = loadCredentials();
  credentials.tokens[contextName] = {
    token,
    expiresAt: options?.expiresAt,
    refreshToken: options?.refreshToken,
  };
  saveCredentials(credentials);
}

/**
 * Remove credentials for a context
 */
export function removeContextCredentials(contextName: string): boolean {
  const credentials = loadCredentials();
  if (credentials.tokens[contextName]) {
    delete credentials.tokens[contextName];
    saveCredentials(credentials);
    return true;
  }
  return false;
}

/**
 * Check if a context has valid credentials
 */
export function hasValidCredentials(contextName: string): boolean {
  const creds = getContextCredentials(contextName);
  if (!creds || !creds.token) {
    return false;
  }
  if (creds.expiresAt) {
    const expiresAt = new Date(creds.expiresAt);
    if (expiresAt <= new Date()) {
      return false;
    }
  }
  return true;
}
