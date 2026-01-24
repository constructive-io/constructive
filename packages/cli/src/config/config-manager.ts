/**
 * Configuration manager for the CNC execution engine
 * Uses appstash for directory resolution
 */

import * as fs from 'fs';
import * as path from 'path';
import { appstash, resolve } from 'appstash';
import type {
  ProjectConfig,
  GlobalSettings,
  Credentials,
  ProjectCredentials,
  ApiType,
} from './types';
import { DEFAULT_SETTINGS, generateEndpoints } from './types';

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
 * Get path to a project config file
 */
function getProjectConfigPath(projectName: string): string {
  const dirs = getAppDirs();
  const projectsDir = resolve(dirs, 'config', 'projects');
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }
  return path.join(projectsDir, `${projectName}.json`);
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
 * Load a project configuration
 */
export function loadProject(projectName: string): ProjectConfig | null {
  const projectPath = getProjectConfigPath(projectName);
  if (fs.existsSync(projectPath)) {
    try {
      const content = fs.readFileSync(projectPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Save a project configuration
 */
export function saveProject(project: ProjectConfig): void {
  const projectPath = getProjectConfigPath(project.name);
  fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
}

/**
 * Delete a project configuration
 */
export function deleteProject(projectName: string): boolean {
  const projectPath = getProjectConfigPath(projectName);
  if (fs.existsSync(projectPath)) {
    fs.unlinkSync(projectPath);
    return true;
  }
  return false;
}

/**
 * List all project configurations
 */
export function listProjects(): ProjectConfig[] {
  const dirs = getAppDirs();
  const projectsDir = resolve(dirs, 'config', 'projects');
  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  const files = fs.readdirSync(projectsDir).filter(f => f.endsWith('.json'));
  const projects: ProjectConfig[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(projectsDir, file), 'utf8');
      projects.push(JSON.parse(content));
    } catch {
      // Skip invalid files
    }
  }

  return projects;
}

/**
 * Get the current active project
 */
export function getCurrentProject(): ProjectConfig | null {
  const settings = loadSettings();
  if (settings.currentProject) {
    return loadProject(settings.currentProject);
  }
  return null;
}

/**
 * Set the current active project
 */
export function setCurrentProject(projectName: string): boolean {
  const project = loadProject(projectName);
  if (!project) {
    return false;
  }
  const settings = loadSettings();
  settings.currentProject = projectName;
  saveSettings(settings);
  return true;
}

/**
 * Create a new project configuration
 */
export function createProject(
  name: string,
  subdomain: string,
  domain: string,
  options?: {
    databaseId?: string;
    ownerId?: string;
    defaultApi?: ApiType;
  }
): ProjectConfig {
  const settings = loadSettings();
  const now = new Date().toISOString();

  const project: ProjectConfig = {
    name,
    domain,
    subdomain,
    endpoints: generateEndpoints(
      subdomain,
      domain,
      settings.useHttps,
      settings.graphqlPath
    ),
    defaultApi: options?.defaultApi || 'public',
    databaseId: options?.databaseId,
    ownerId: options?.ownerId,
    createdAt: now,
    updatedAt: now,
  };

  saveProject(project);
  return project;
}

/**
 * Get credentials for a project
 */
export function getProjectCredentials(
  projectName: string
): ProjectCredentials | null {
  const credentials = loadCredentials();
  return credentials.tokens[projectName] || null;
}

/**
 * Set credentials for a project
 */
export function setProjectCredentials(
  projectName: string,
  token: string,
  options?: {
    expiresAt?: string;
    refreshToken?: string;
  }
): void {
  const credentials = loadCredentials();
  credentials.tokens[projectName] = {
    token,
    expiresAt: options?.expiresAt,
    refreshToken: options?.refreshToken,
  };
  saveCredentials(credentials);
}

/**
 * Remove credentials for a project
 */
export function removeProjectCredentials(projectName: string): boolean {
  const credentials = loadCredentials();
  if (credentials.tokens[projectName]) {
    delete credentials.tokens[projectName];
    saveCredentials(credentials);
    return true;
  }
  return false;
}

/**
 * Check if a project has valid credentials
 */
export function hasValidCredentials(projectName: string): boolean {
  const creds = getProjectCredentials(projectName);
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
