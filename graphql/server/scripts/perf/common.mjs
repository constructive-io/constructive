import fs from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_TMP_ROOT = '/Users/zeta/Projects/interweb/src/agents/tmp';
export const DEFAULT_BASE_URL = 'http://localhost:3000';

export const getArgValue = (args, flag, fallback = null) => {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) {
    return fallback;
  }
  return args[index + 1];
};

export const hasFlag = (args, flag) => args.includes(flag);

export const parseIntArg = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const toIsoFileTime = (date = new Date()) =>
  date.toISOString().replace(/[:.]/g, '-');

export const makeRunId = (prefix = 'graphile-cache-leak') =>
  `${prefix}-${toIsoFileTime(new Date())}-pid${process.pid}`;

export const ensureRunDirs = async (runDir) => {
  const dirs = {
    runDir,
    logsDir: path.join(runDir, 'logs'),
    samplerDir: path.join(runDir, 'logs', 'sampler'),
    heapDir: path.join(runDir, 'logs', 'heap'),
    dataDir: path.join(runDir, 'data'),
    reportsDir: path.join(runDir, 'reports'),
    tmpScriptsDir: path.join(runDir, 'tmp-scripts'),
  };

  await Promise.all(Object.values(dirs).map((dir) => fs.mkdir(dir, { recursive: true })));
  return dirs;
};

export const writeJson = async (filePath, payload) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const postJson = async ({ url, payload, headers = {}, timeoutMs = 15000 }) => {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
      json,
      text,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const getJson = async ({ url, headers = {}, timeoutMs = 10000 }) => {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return {
      ok: response.ok,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
      json,
      text,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const stableStringify = (value) => JSON.stringify(value, Object.keys(value).sort());

export const dedupeBy = (items, makeKey) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = makeKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
};
