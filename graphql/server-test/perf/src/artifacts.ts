import fs from 'fs/promises';
import path from 'path';

import { type PerfRunConfig, type RunArtifactPaths } from './types';

const SECRET_KEY_PATTERN = /(secret|token|cookie|password|authorization|api[-_]?key|private[-_]?key|session)/i;
const AUTH_VALUE_PATTERN = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+\-/]+=*/gi;

export const redactSecrets = (value: unknown, parentKey = ''): unknown => {
  if (value == null) return value;

  if (typeof value === 'string') {
    if (SECRET_KEY_PATTERN.test(parentKey)) return '[REDACTED]';
    return value.replace(AUTH_VALUE_PATTERN, '$1 [REDACTED]');
  }

  if (typeof value !== 'object') return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactSecrets(value.message, 'message'),
      stack: value.stack ? String(redactSecrets(value.stack, 'stack')) : undefined,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item, parentKey));
  }

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(input)) {
    output[key] = SECRET_KEY_PATTERN.test(key) ? '[REDACTED]' : redactSecrets(child, key);
  }
  return output;
};

export const createRunArtifacts = async (config: PerfRunConfig): Promise<RunArtifactPaths> => {
  const runDir = path.resolve(config.runDir);
  const paths: RunArtifactPaths = {
    runDir,
    summaryPath: path.join(runDir, 'summary.json'),
    casesDir: path.join(runDir, 'cases'),
    preflightDir: path.join(runDir, 'preflight'),
    memoryDir: path.join(runDir, 'memory'),
    errorsDir: path.join(runDir, 'errors'),
  };

  await Promise.all([
    fs.mkdir(paths.casesDir, { recursive: true }),
    fs.mkdir(paths.preflightDir, { recursive: true }),
    fs.mkdir(paths.memoryDir, { recursive: true }),
    fs.mkdir(paths.errorsDir, { recursive: true }),
  ]);

  return paths;
};

export const caseReportPath = (artifacts: RunArtifactPaths, caseId: string): string =>
  path.join(artifacts.casesDir, `${caseId}.json`);

export const preflightReportPath = (artifacts: RunArtifactPaths, caseId: string): string =>
  path.join(artifacts.preflightDir, `${caseId}.json`);

export const memoryReportPath = (artifacts: RunArtifactPaths, caseId: string, phase: 'before' | 'after'): string =>
  path.join(artifacts.memoryDir, `${caseId}-${phase}.json`);

export const errorsReportPath = (artifacts: RunArtifactPaths, caseId: string): string =>
  path.join(artifacts.errorsDir, `${caseId}.json`);

export const writeJsonArtifact = async <T>(filePath: string, value: T): Promise<string> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const redacted = redactSecrets(value);
  await fs.writeFile(tmp, `${JSON.stringify(redacted, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, filePath);
  return filePath;
};

export const toRedactedErrorSample = (
  error: unknown,
  input: { operation?: string; requestProfileId?: string; status?: number; code?: string } = {}
) => {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(redactSecrets(error));
  return {
    at: new Date().toISOString(),
    operation: input.operation,
    requestProfileId: input.requestProfileId,
    status: input.status,
    code: input.code,
    message: String(redactSecrets(message)),
    details: error instanceof Error ? redactSecrets({ name: error.name, stack: error.stack }) : redactSecrets(error),
  };
};
