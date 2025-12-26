import * as fs from 'fs';
import * as path from 'path';

export const loadEnvFixture = (
  fixtureDir: string,
  name: string
): Record<string, string> => {
  const filePath = path.join(fixtureDir, name);
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, string>;
};

export const loadEnvKeys = (fixtureDir: string, name: string): string[] => {
  const filePath = path.join(fixtureDir, name);
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as string[];
};

export const snapshotAndClearEnv = (
  keys: string[]
): Record<string, string | undefined> => {
  const snapshot: Record<string, string | undefined> = {};
  for (const key of keys) {
    snapshot[key] = process.env[key];
    delete process.env[key];
  }
  return snapshot;
};

export const applyEnvFixture = (
  fixture: Record<string, string>
): Record<string, string | undefined> => {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(fixture)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
  return previous;
};

export const restoreEnv = (snapshot: Record<string, string | undefined>): void => {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
};
