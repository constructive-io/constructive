/**
 * Config store for the csdk CLI — manages named contexts (endpoint + credentials).
 * Uses appstash for XDG-compliant directory resolution.
 */

import * as fs from 'fs';
import * as path from 'path';
import { appstash, resolve } from 'appstash';

interface ContextConfig {
  name: string;
  endpoint: string;
  createdAt?: string;
  updatedAt?: string;
}

interface GlobalSettings {
  currentContext?: string;
}

interface ContextCredentials {
  token: string;
  expiresAt?: string;
  refreshToken?: string;
}

interface Credentials {
  tokens: Record<string, ContextCredentials>;
}

interface ConfigStore {
  loadSettings(): GlobalSettings;
  createContext(name: string, opts: { endpoint: string }): void;
  listContexts(): ContextConfig[];
  setCurrentContext(name: string): void;
  getCurrentContext(): (ContextConfig & { name: string }) | null;
  deleteContext(name: string): void;
  hasValidCredentials(name: string): boolean;
}

export function getConfigStore(toolName: string): ConfigStore {
  const dirs = appstash(toolName, { ensure: true });

  function configPath(filename: string): string {
    return resolve(dirs, 'config', filename);
  }

  function contextsDir(): string {
    const dir = resolve(dirs, 'config', 'contexts');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  function loadSettings(): GlobalSettings {
    const p = configPath('settings.json');
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch {
        return {};
      }
    }
    return {};
  }

  function saveSettings(settings: GlobalSettings): void {
    const p = configPath('settings.json');
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(p, JSON.stringify(settings, null, 2));
  }

  function loadCredentials(): Credentials {
    const p = configPath('credentials.json');
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch {
        return { tokens: {} };
      }
    }
    return { tokens: {} };
  }

  return {
    loadSettings,

    createContext(name: string, opts: { endpoint: string }): void {
      const now = new Date().toISOString();
      const ctx: ContextConfig = { name, endpoint: opts.endpoint, createdAt: now, updatedAt: now };
      const p = path.join(contextsDir(), `${name}.json`);
      fs.writeFileSync(p, JSON.stringify(ctx, null, 2));
    },

    listContexts(): ContextConfig[] {
      const dir = contextsDir();
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
      const contexts: ContextConfig[] = [];
      for (const file of files) {
        try {
          contexts.push(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
        } catch {
          // skip
        }
      }
      return contexts;
    },

    setCurrentContext(name: string): void {
      const settings = loadSettings();
      settings.currentContext = name;
      saveSettings(settings);
    },

    getCurrentContext(): (ContextConfig & { name: string }) | null {
      const settings = loadSettings();
      if (!settings.currentContext) return null;
      const p = path.join(contextsDir(), `${settings.currentContext}.json`);
      if (!fs.existsSync(p)) return null;
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch {
        return null;
      }
    },

    deleteContext(name: string): void {
      const p = path.join(contextsDir(), `${name}.json`);
      if (fs.existsSync(p)) fs.unlinkSync(p);
      const settings = loadSettings();
      if (settings.currentContext === name) {
        delete settings.currentContext;
        saveSettings(settings);
      }
    },

    hasValidCredentials(name: string): boolean {
      const creds = loadCredentials();
      const ctx = creds.tokens[name];
      if (!ctx || !ctx.token) return false;
      if (ctx.expiresAt && new Date(ctx.expiresAt) <= new Date()) return false;
      return true;
    },
  };
}
