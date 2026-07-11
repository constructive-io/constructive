import fs from 'fs';
import path from 'path';

import {
  PERF_SCHEMA_VERSION,
  type RedactedErrorSample,
  type RunArtifactPaths,
} from './types';

const SENSITIVE_KEY = /(authorization|cookie|token|secret|password|passwd|apikey|api-key|set-cookie)/i;

export const createRunArtifactPaths = (runDir: string): RunArtifactPaths => {
  const resolved = path.resolve(runDir);
  return {
    runDir: resolved,
    summaryPath: path.join(resolved, 'summary.json'),
    casesDir: path.join(resolved, 'cases'),
    preflightDir: path.join(resolved, 'preflight'),
    memoryDir: path.join(resolved, 'memory'),
    errorsDir: path.join(resolved, 'errors'),
  };
};

export const ensureRunDirs = async (paths: RunArtifactPaths): Promise<void> => {
  await Promise.all([
    fs.promises.mkdir(paths.casesDir, { recursive: true }),
    fs.promises.mkdir(paths.preflightDir, { recursive: true }),
    fs.promises.mkdir(paths.memoryDir, { recursive: true }),
    fs.promises.mkdir(paths.errorsDir, { recursive: true }),
  ]);
};

export const caseReportPath = (paths: RunArtifactPaths, caseId: string): string =>
  path.join(paths.casesDir, `${caseId}.json`);

export const preflightReportPath = (paths: RunArtifactPaths, caseId: string): string =>
  path.join(paths.preflightDir, `${caseId}.json`);

export const memoryReportPath = (paths: RunArtifactPaths, caseId: string, phase: 'before' | 'after'): string =>
  path.join(paths.memoryDir, `${caseId}-${phase}.json`);

export const errorsReportPath = (paths: RunArtifactPaths, caseId: string): string =>
  path.join(paths.errorsDir, `${caseId}.json`);

export const redact = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(child);
    }
    return out;
  }
  if (typeof value === 'string') {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
      .replace(/(authorization|token|secret|password|cookie)=([^&\s]+)/gi, '$1=[REDACTED]');
  }
  return value;
};

export const toRedactedErrorSample = (
  error: unknown,
  context: Partial<RedactedErrorSample> = {}
): RedactedErrorSample => {
  const redacted = redact(error);
  let message: string;
  let code: string | undefined;
  let details: unknown;

  if (redacted instanceof Error) {
    message = redacted.message;
    details = redacted.stack;
  } else if (Array.isArray(redacted)) {
    const first = redacted[0] as any;
    message = first?.message ? String(first.message) : JSON.stringify(redacted).slice(0, 2000);
    code = first?.extensions?.code ? String(first.extensions.code) : undefined;
    details = redacted;
  } else if (redacted && typeof redacted === 'object') {
    const obj = redacted as any;
    message = obj.message ? String(obj.message) : JSON.stringify(redacted).slice(0, 2000);
    code = obj.code ? String(obj.code) : obj.extensions?.code ? String(obj.extensions.code) : undefined;
    details = redacted;
  } else {
    message = String(redacted);
  }

  return {
    at: new Date().toISOString(),
    ...context,
    message,
    ...(code && { code }),
    ...(details !== undefined && { details }),
  };
};

export const writeJsonArtifact = async (targetPath: string, value: unknown): Promise<void> => {
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  const payload = redact(value);
  const finalPayload =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : { schemaVersion: PERF_SCHEMA_VERSION, value: payload };
  const tmpPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(tmpPath, `${JSON.stringify(finalPayload, null, 2)}\n`, 'utf8');
  await fs.promises.rename(tmpPath, targetPath);
};
