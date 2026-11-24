#!/usr/bin/env node
'use strict';

/**
 * Paired-change gate for constructive PRs.
 *
 * Activates when either:
 *   1. The PR adds or modifies a SQL statement in the API server sources
 *      (graphql/server/src, graphile, packages/express-context/src — excluding
 *      tests/fixtures/scripts), OR
 *   2. The PR body declares a `Paired-DB:` reference (anything other than `none`).
 *
 * When active, requires:
 *   - A completed, green `storage-integration.yml` (`scenario=all`) run in
 *     `constructive-io/constructive-db-integration-tests` whose summary artifact
 *     resolves to this PR's current head SHA and the paired constructive-db SHA.
 *   - When `Paired-DB:` names a constructive-db PR, that DB PR must already be
 *     merged (DB-first merge order). Both its head SHA and merge commit SHA are
 *     accepted so merging the DB PR does not invalidate a green paired run.
 *
 * Dependency-free: runs from a bare checkout on ubuntu-latest in a few seconds
 * with no pnpm install and no slow checks on unrelated PRs.
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');

const INTEGRATION_REPO = 'constructive-io/constructive-db-integration-tests';
const DB_REPO = 'constructive-io/constructive-db';
const WORKFLOW_FILE = 'storage-integration.yml';

const API_SQL_SOURCES = [
  'graphql/server/src/',
  'graphile/',
  'packages/express-context/src/',
];
const NOT_API =
  /(^|\/)(__tests__|__fixtures__|test|tests)\/|\.(test|spec)\.ts$|\.d\.ts$|^graphile\/graphile-(realtime-)?test\/|\/(src\/)?scripts\//;

const PAIRED_DB_LINE = /^\s*Paired-DB:\s*(.+?)\s*$/im;
const RUN_LINE = /^\s*Kitchen-sink-run:\s*(.+?)\s*$/im;
const SHA40 = /^[0-9a-f]{40}$/i;
const SUMMARY_PAIR_RE =
  /constructive-db\s+`([0-9a-f]{40})`\s*·\s*constructive\s+`([0-9a-f]{40})`/i;

function isApiSqlFile(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  if (!normalized.endsWith('.ts')) return false;
  if (!API_SQL_SOURCES.some(prefix => normalized.startsWith(prefix))) return false;
  return !NOT_API.test(normalized);
}

/**
 * Extract normalized SQL statement literals from TypeScript source.
 * Mirrors constructive-db-integration-tests/harness/column-contract.ts.
 */
function extractSqlStatements(source) {
  const found = new Set();
  if (!source) return found;
  const literalRe = /`((?:[^`\\]|\\.)*)`|'((?:[^'\\\n]|\\.)*)'/g;
  for (const m of source.matchAll(literalRe)) {
    const raw = m[1] ?? m[2];
    if (!/^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)\s+\S+\s+\S/i.test(raw)) continue;
    found.add(raw.replace(/\s+/g, ' ').trim());
  }
  return found;
}

function parsePairedDb(body) {
  const match = PAIRED_DB_LINE.exec(body ?? '');
  if (!match) return null;
  const raw = match[1].trim();
  if (!raw || /^none$/i.test(raw)) return { kind: 'none', raw };

  const prUrl = raw.match(
    /^https:\/\/github\.com\/constructive-io\/constructive-db\/pull\/(\d+)(?:[/?#].*)?$/i,
  );
  if (prUrl) return { kind: 'pr', number: Number(prUrl[1]), raw };

  const prShort = raw.match(/^(?:constructive-io\/)?constructive-db#(\d+)$/i);
  if (prShort) return { kind: 'pr', number: Number(prShort[1]), raw };

  if (SHA40.test(raw)) return { kind: 'sha', sha: raw.toLowerCase(), raw };

  if (/^[A-Za-z0-9._/-]+$/.test(raw)) return { kind: 'ref', ref: raw, raw };

  return { kind: 'invalid', raw };
}

function parseKitchenSinkRun(body) {
  const match = RUN_LINE.exec(body ?? '');
  if (!match) return null;
  const raw = match[1].trim();
  if (!raw || /^none$/i.test(raw)) return null;

  const urlMatch = raw.match(
    /^https:\/\/github\.com\/constructive-io\/constructive-db-integration-tests\/actions\/runs\/(\d+)(?:[/?#].*)?$/i,
  );
  if (urlMatch) return { runId: urlMatch[1], raw };
  if (/^\d+$/.test(raw)) return { runId: raw, raw };
  return { kind: 'invalid', raw };
}

/**
 * Minimal dependency-free ZIP reader (stored + deflated entries) for GitHub
 * Actions summary artifacts (`pair.json` and `summary.md`).
 */
function readZipEntries(buffer) {
  const entries = new Map();
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) return entries;

  const cdOffset = buffer.readUInt32LE(eocd + 16);
  const cdCount = buffer.readUInt16LE(eocd + 10);
  let pos = cdOffset;
  for (let i = 0; i < cdCount; i += 1) {
    if (buffer.readUInt32LE(pos) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(pos + 10);
    const compSize = buffer.readUInt32LE(pos + 20);
    const nameLen = buffer.readUInt16LE(pos + 28);
    const extraLen = buffer.readUInt16LE(pos + 30);
    const commentLen = buffer.readUInt16LE(pos + 32);
    const localOffset = buffer.readUInt32LE(pos + 42);
    const name = buffer.toString('utf8', pos + 46, pos + 46 + nameLen);
    pos += 46 + nameLen + extraLen + commentLen;

    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) continue;
    const lNameLen = buffer.readUInt16LE(localOffset + 26);
    const lExtraLen = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const raw = buffer.subarray(dataStart, dataStart + compSize);
    if (method === 0) entries.set(name, raw);
    else if (method === 8) entries.set(name, zlib.inflateRawSync(raw));
  }
  return entries;
}

function parsePairFromArtifact(zipBuffer) {
  const entries = readZipEntries(zipBuffer);
  for (const [name, content] of entries.entries()) {
    if (name === 'pair.json' || name.endsWith('/pair.json')) {
      const parsed = JSON.parse(content.toString('utf8'));
      if (parsed.constructiveDb && parsed.constructive) {
        return {
          constructiveDb: String(parsed.constructiveDb).toLowerCase(),
          constructive: String(parsed.constructive).toLowerCase(),
          scenario: parsed.scenario || null,
        };
      }
    }
  }
  for (const [name, content] of entries.entries()) {
    if (name === 'summary.md' || name.endsWith('/summary.md')) {
      const m = SUMMARY_PAIR_RE.exec(content.toString('utf8'));
      if (m) {
        return {
          constructiveDb: m[1].toLowerCase(),
          constructive: m[2].toLowerCase(),
          scenario: null,
        };
      }
    }
  }
  return null;
}

function findChangedApiSqlFiles(baseRef, cwd = process.cwd()) {
  const diffOut = execFileSync(
    'git',
    ['diff', '--name-only', `${baseRef}...HEAD`, '--', 'graphql/server/src', 'graphile', 'packages/express-context/src'],
    { cwd, encoding: 'utf8', maxBuffer: 32 << 20 },
  );
  const candidates = diffOut
    .split(/\r?\n/)
    .filter(Boolean)
    .filter(isApiSqlFile);

  const changed = [];
  for (const relPath of candidates) {
    const absPath = path.join(cwd, relPath);
    if (!fs.existsSync(absPath)) continue;
    const headSrc = fs.readFileSync(absPath, 'utf8');
    let baseSrc = '';
    try {
      baseSrc = execFileSync('git', ['show', `${baseRef}:${relPath}`], {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        maxBuffer: 32 << 20,
      });
    } catch {
      baseSrc = '';
    }
    const baseSql = extractSqlStatements(baseSrc);
    const headSql = extractSqlStatements(headSrc);
    const added = [...headSql].filter(stmt => !baseSql.has(stmt));
    if (added.length > 0) {
      changed.push({ file: relPath, addedCount: added.length });
    }
  }
  return changed;
}

function makeGitHubClient(token, fetchImpl = fetch) {
  async function apiJson(apiPath) {
    const res = await fetchImpl(`https://api.github.com${apiPath}`, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GitHub API ${apiPath} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  async function apiBuffer(url) {
    const res = await fetchImpl(url, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
      },
      redirect: 'follow',
    });
    if (!res.ok) {
      throw new Error(`Artifact download failed (${res.status}) for ${url}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  return { apiJson, apiBuffer };
}

async function resolveExpectedDb(pairedDb, gh) {
  const errors = [];
  if (pairedDb && pairedDb.kind === 'pr') {
    const pr = await gh.apiJson(`/repos/${DB_REPO}/pulls/${pairedDb.number}`);
    const shas = [pr.head?.sha, pr.merge_commit_sha]
      .filter(s => typeof s === 'string' && SHA40.test(s))
      .map(s => s.toLowerCase());
    if (!pr.merged_at) {
      errors.push(
        `Paired DB PR ${DB_REPO}#${pairedDb.number} is still ${pr.state}; merge constructive-db first (DB-first order) before merging this API PR.`,
      );
    }
    return {
      shas: [...new Set(shas)],
      displayRef: pr.head?.sha || `${DB_REPO}#${pairedDb.number}`,
      errors,
    };
  }
  if (pairedDb && pairedDb.kind === 'sha') {
    return { shas: [pairedDb.sha], displayRef: pairedDb.sha, errors };
  }
  if (pairedDb && pairedDb.kind === 'ref') {
    const commit = await gh.apiJson(
      `/repos/${DB_REPO}/commits/${encodeURIComponent(pairedDb.ref)}`,
    );
    return { shas: [commit.sha.toLowerCase()], displayRef: commit.sha.toLowerCase(), errors };
  }

  // Unpaired API SQL change: accept the integration suite's pinned DB sha or DB main HEAD.
  const shas = [];
  const pinsRes = await gh.apiJson(`/repos/${INTEGRATION_REPO}/contents/pins.json`);
  const pins = JSON.parse(Buffer.from(pinsRes.content, 'base64').toString('utf8'));
  if (pins.constructiveDb && SHA40.test(pins.constructiveDb)) {
    shas.push(pins.constructiveDb.toLowerCase());
  }
  try {
    const dbMain = await gh.apiJson(`/repos/${DB_REPO}/commits/main`);
    if (dbMain.sha && SHA40.test(dbMain.sha)) shas.push(dbMain.sha.toLowerCase());
  } catch {
    // pins.json alone is sufficient if DB main cannot be read
  }
  return {
    shas: [...new Set(shas)],
    displayRef: shas[0] || 'main',
    errors,
  };
}

async function inspectRunForPair(run, expectedConstructiveSha, acceptedDbShas, gh) {
  if (run.status !== 'completed' || run.conclusion !== 'success') {
    return { ok: false, reason: `run ${run.id} is ${run.status}/${run.conclusion}` };
  }
  const jobsRes = await gh.apiJson(
    `/repos/${INTEGRATION_REPO}/actions/runs/${run.id}/jobs?per_page=100`,
  );
  const summaryAll = (jobsRes.jobs || []).find(
    j => j.name === 'summary · all' && j.conclusion === 'success',
  );
  if (!summaryAll) {
    return { ok: false, reason: `run ${run.id} did not complete 'summary · all' cleanly` };
  }
  const artifactsRes = await gh.apiJson(
    `/repos/${INTEGRATION_REPO}/actions/runs/${run.id}/artifacts?per_page=100`,
  );
  const summaryArtifact = (artifactsRes.artifacts || []).find(
    a => a.name === `storage-integration-summary-${run.id}` && !a.expired,
  );
  if (!summaryArtifact) {
    return { ok: false, reason: `run ${run.id} has no summary artifact` };
  }
  const zip = await gh.apiBuffer(summaryArtifact.archive_download_url);
  const pair = parsePairFromArtifact(zip);
  if (!pair) {
    return { ok: false, reason: `run ${run.id} summary artifact has no pair metadata` };
  }
  if (pair.scenario && pair.scenario !== 'all') {
    return { ok: false, reason: `run ${run.id} ran scenario=${pair.scenario}, not all` };
  }
  if (pair.constructive !== expectedConstructiveSha) {
    return {
      ok: false,
      reason: `run ${run.id} tested constructive ${pair.constructive}, expected ${expectedConstructiveSha}`,
    };
  }
  if (!acceptedDbShas.includes(pair.constructiveDb)) {
    return {
      ok: false,
      reason: `run ${run.id} tested constructive-db ${pair.constructiveDb}, expected ${acceptedDbShas.join(' or ')}`,
    };
  }
  return { ok: true, runUrl: run.html_url, pair };
}

async function evaluateGate(options) {
  const {
    prBody = '',
    headSha = '',
    changedSqlFiles = [],
    token = '',
    fetchImpl = fetch,
  } = options;

  const pairedDb = parsePairedDb(prBody);
  const kitchenSinkRun = parseKitchenSinkRun(prBody);

  if (pairedDb && pairedDb.kind === 'invalid') {
    return {
      ok: false,
      errors: [
        `Invalid Paired-DB value "${pairedDb.raw}". Use constructive-io/constructive-db#<pr>, a 40-hex SHA, a branch name, or "none".`,
      ],
    };
  }
  if (kitchenSinkRun && kitchenSinkRun.kind === 'invalid') {
    return {
      ok: false,
      errors: [
        `Invalid Kitchen-sink-run value "${kitchenSinkRun.raw}". Use https://github.com/${INTEGRATION_REPO}/actions/runs/<id> or a numeric run ID.`,
      ],
    };
  }

  const isPaired = Boolean(pairedDb && pairedDb.kind !== 'none');
  if (!isPaired && changedSqlFiles.length === 0) {
    return {
      ok: true,
      skipped: true,
      message: 'Paired-change gate: no API SQL changes or Paired-DB declared.',
    };
  }

  const normalizedHead = headSha.toLowerCase();
  if (!SHA40.test(normalizedHead)) {
    return { ok: false, errors: [`Missing or invalid PR_HEAD_SHA: "${headSha}"`] };
  }
  if (!token) {
    return {
      ok: false,
      errors: [
        'Paired-change gate requires GH_SUBMODULE_PAT to verify a green kitchen-sink run (unavailable on fork PRs).',
      ],
    };
  }

  const gh = makeGitHubClient(token, fetchImpl);
  const expectedDb = await resolveExpectedDb(isPaired ? pairedDb : null, gh);
  const errors = [...expectedDb.errors];

  let matched = null;
  let lastReason = '';
  if (kitchenSinkRun) {
    const run = await gh.apiJson(
      `/repos/${INTEGRATION_REPO}/actions/runs/${kitchenSinkRun.runId}`,
    );
    const result = await inspectRunForPair(run, normalizedHead, expectedDb.shas, gh);
    if (result.ok) matched = result;
    else lastReason = result.reason;
  } else {
    const list = await gh.apiJson(
      `/repos/${INTEGRATION_REPO}/actions/workflows/${WORKFLOW_FILE}/runs?status=success&per_page=30`,
    );
    for (const run of list.workflow_runs || []) {
      const result = await inspectRunForPair(run, normalizedHead, expectedDb.shas, gh);
      if (result.ok) {
        matched = result;
        break;
      }
    }
    if (!matched) {
      lastReason = `no green ${WORKFLOW_FILE} (scenario=all) run in the last 30 successes matched this pair`;
    }
  }

  if (!matched) {
    const triggerReason = isPaired
      ? `Paired-DB (${pairedDb.raw})`
      : `API SQL changed in ${changedSqlFiles.map(f => f.file).join(', ')}`;
    errors.push(
      `Paired-change gate triggered by ${triggerReason}, but ${lastReason}.`,
      `Run: gh workflow run ${WORKFLOW_FILE} -R ${INTEGRATION_REPO} -f constructive_ref=${normalizedHead} -f constructive_db_ref=${expectedDb.displayRef} -f scenario=all`,
      `Once green, add "Kitchen-sink-run: <run-url>" (and "Paired-DB: ${DB_REPO}#<pr>" if pairing with a DB PR) to this PR body.`,
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    skipped: false,
    message: `Paired-change gate passed: ${matched.runUrl} (constructive ${matched.pair.constructive}, constructive-db ${matched.pair.constructiveDb})`,
  };
}

module.exports = {
  isApiSqlFile,
  extractSqlStatements,
  parsePairedDb,
  parseKitchenSinkRun,
  readZipEntries,
  parsePairFromArtifact,
  findChangedApiSqlFiles,
  evaluateGate,
};

if (require.main === module) {
  (async () => {
    const baseRef = process.env.PR_BASE_REF || 'origin/main';
    const changedSqlFiles = findChangedApiSqlFiles(baseRef);
    const result = await evaluateGate({
      prBody: process.env.PR_BODY || '',
      headSha: process.env.PR_HEAD_SHA || '',
      changedSqlFiles,
      token: process.env.GH_TOKEN || '',
    });
    if (!result.ok) {
      for (const err of result.errors) console.log(`::error::${err}`);
      process.exit(1);
    }
    console.log(result.message);
  })().catch(err => {
    console.log(`::error::${err.message}`);
    process.exit(1);
  });
}
