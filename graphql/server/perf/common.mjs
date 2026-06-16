import fs from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';

export const DEFAULT_TMP_ROOT = '/tmp/constructive-perf';
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

const hasHostHeader = (headers = {}) =>
  Object.keys(headers || {}).some((key) => key.toLowerCase() === 'host');

const requestJsonViaNodeHttp = async ({ url, method, headers = {}, body = null, timeoutMs = 15000 }) => {
  const startedAt = Date.now();

  return await new Promise((resolve) => {
    const target = new URL(url);
    const client = target.protocol === 'https:' ? https : http;
    const requestHeaders = { ...headers };
    if (body != null && requestHeaders['Content-Length'] == null && requestHeaders['content-length'] == null) {
      requestHeaders['Content-Length'] = Buffer.byteLength(body);
    }

    const req = client.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        method,
        headers: requestHeaders,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {
            json = null;
          }
          resolve({
            ok: Number(res.statusCode ?? 0) >= 200 && Number(res.statusCode ?? 0) < 300,
            status: Number(res.statusCode ?? 0),
            elapsedMs: Date.now() - startedAt,
            json,
            text,
          });
        });
      },
    );

    req.on('error', (error) => {
      resolve({
        ok: false,
        status: 0,
        elapsedMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timeout after ${timeoutMs}ms`));
    });

    if (body != null) {
      req.write(body);
    }
    req.end();
  });
};

export const postJson = async ({ url, payload, headers = {}, timeoutMs = 15000 }) => {
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (hasHostHeader(mergedHeaders)) {
    return await requestJsonViaNodeHttp({
      url,
      method: 'POST',
      headers: mergedHeaders,
      body: JSON.stringify(payload),
      timeoutMs,
    });
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: mergedHeaders,
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
  if (hasHostHeader(headers)) {
    return await requestJsonViaNodeHttp({
      url,
      method: 'GET',
      headers,
      timeoutMs,
    });
  }

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
