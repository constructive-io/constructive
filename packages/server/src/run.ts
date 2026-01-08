#!/usr/bin/env node

import { parseEnvBoolean } from '@pgpmjs/env';

import { CombinedServer } from './server';
import {
  CombinedServerOptions,
  CombinedServerResult,
  FunctionName,
  FunctionServiceConfig
} from './types';

const parseList = (value?: string): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const parsePortMap = (value?: string): Record<string, number> => {
  if (!value) return {};

  const trimmed = value.trim();
  if (!trimmed) return {};

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, number>;
      return Object.entries(parsed).reduce<Record<string, number>>((acc, [key, port]) => {
        const portNumber = Number(port);
        if (Number.isFinite(portNumber)) {
          acc[key] = portNumber;
        }
        return acc;
      }, {});
    } catch {
      return {};
    }
  }

  return trimmed.split(',').reduce<Record<string, number>>((acc, pair) => {
    const [rawName, rawPort] = pair.split(/[:=]/).map((item) => item.trim());
    const port = Number(rawPort);
    if (rawName && Number.isFinite(port)) {
      acc[rawName] = port;
    }
    return acc;
  }, {});
};

const buildFunctionsOptions = (): CombinedServerOptions['functions'] => {
  const rawFunctions = (process.env.CONSTRUCTIVE_FUNCTIONS || '').trim();
  if (!rawFunctions) return undefined;

  const portMap = parsePortMap(process.env.CONSTRUCTIVE_FUNCTION_PORTS);
  const normalized = rawFunctions.toLowerCase();

  if (normalized === 'all' || normalized === '*') {
    return { enabled: true };
  }

  const names = parseList(rawFunctions) as FunctionName[];
  if (!names.length) return undefined;

  const services: FunctionServiceConfig[] = names.map((name) => ({
    name,
    port: portMap[name]
  }));

  return {
    enabled: true,
    services
  };
};

export const buildCombinedServerOptionsFromEnv = (): CombinedServerOptions => ({
  graphql: {
    enabled: parseEnvBoolean(process.env.CONSTRUCTIVE_GRAPHQL_ENABLED) ?? true
  },
  jobs: {
    enabled: parseEnvBoolean(process.env.CONSTRUCTIVE_JOBS_ENABLED) ?? false
  },
  functions: buildFunctionsOptions()
});

export const startCombinedServerFromEnv = async (): Promise<CombinedServerResult> => {
  const server = new CombinedServer(buildCombinedServerOptionsFromEnv());
  return server.start();
};

if (require.main === module) {
  void startCombinedServerFromEnv().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Combined server failed to start:', error);
    process.exit(1);
  });
}
