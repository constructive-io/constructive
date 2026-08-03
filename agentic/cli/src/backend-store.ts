import * as fs from 'fs';
import * as path from 'path';

export interface BackendConfig {
  apiEndpoint: string;
  authEndpoint: string;
  modulesEndpoint: string;
}

export const BACKEND_PRESETS: Record<string, BackendConfig> = {
  localnet: {
    apiEndpoint: 'http://api.localhost:3000/graphql',
    authEndpoint: 'http://auth.localhost:3000/graphql',
    modulesEndpoint: 'http://modules.localhost:3000/graphql'
  },
  devnet: {
    apiEndpoint: 'https://api.launchql.dev/graphql',
    authEndpoint: 'https://auth.launchql.dev/graphql',
    modulesEndpoint: 'https://modules.launchql.dev/graphql'
  }
};

export function loadBackendConfig(file: string): BackendConfig | null {
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err: any) {
    if (err?.code === 'ENOENT') return null;
    throw err;
  }
  let parsed: BackendConfig;
  try {
    parsed = JSON.parse(raw) as BackendConfig;
  } catch {
    return null;
  }
  if (!parsed?.apiEndpoint || !parsed?.authEndpoint || !parsed?.modulesEndpoint) {
    return null;
  }
  return parsed;
}

export function saveBackendConfig(file: string, config: BackendConfig): void {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(file)}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2) + '\n');
  fs.renameSync(tmp, file);
}
