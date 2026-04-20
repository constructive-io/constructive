#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';

import {
  DEFAULT_BASE_URL,
  DEFAULT_TMP_ROOT,
  ensureRunDirs,
  getArgValue,
  makeRunId,
  writeJson,
} from './common.mjs';

const args = process.argv.slice(2);

const runId = getArgValue(args, '--run-id', makeRunId('business-op-profiles'));
const runDir = path.resolve(getArgValue(args, '--run-dir', path.join(DEFAULT_TMP_ROOT, runId)));
const baseUrl = getArgValue(args, '--base-url', DEFAULT_BASE_URL);

const manifestPath = path.resolve(
  getArgValue(args, '--manifest', path.join(runDir, 'data', 'business-table-manifest.json')),
);
const tokensPath = path.resolve(
  getArgValue(args, '--tokens', path.join(runDir, 'data', 'tokens.json')),
);

const routingMode = getArgValue(args, '--routing-mode', 'private').trim().toLowerCase();
const compatRoutingMode = getArgValue(
  args,
  '--compat-routing-mode',
  routingMode === 'dual' ? 'private' : routingMode,
)
  .trim()
  .toLowerCase();
const publicApiName = getArgValue(args, '--public-api-name', 'app').trim();
const publicSubdomainPrefix = getArgValue(args, '--public-subdomain-prefix', 'app-public-').trim();

const outputPath = path.resolve(
  getArgValue(args, '--output', path.join(runDir, 'data', 'business-op-profiles.json')),
);
const privateOutputPath = path.resolve(
  getArgValue(
    args,
    '--private-output',
    routingMode === 'dual' ? path.join(runDir, 'data', 'business-op-profiles.private.json') : outputPath,
  ),
);
const publicOutputPath = path.resolve(
  getArgValue(
    args,
    '--public-output',
    routingMode === 'dual' ? path.join(runDir, 'data', 'business-op-profiles.public.json') : outputPath,
  ),
);

const pgConfig = {
  host: getArgValue(args, '--pg-host', process.env.PGHOST || 'localhost'),
  port: Number.parseInt(getArgValue(args, '--pg-port', process.env.PGPORT || '5432'), 10),
  database: getArgValue(args, '--pg-database', process.env.PGDATABASE || 'constructive'),
  user: getArgValue(args, '--pg-user', process.env.PGUSER || 'postgres'),
  password: getArgValue(args, '--pg-password', process.env.PGPASSWORD || 'password'),
};

const VALID_ROUTING_MODES = new Set(['private', 'public', 'dual']);

const toPascalCase = (value) =>
  String(value)
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');

const toCamelCase = (pascal) => (pascal.length ? pascal[0].toLowerCase() + pascal.slice(1) : pascal);

const loadJson = async (filePath) => {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

const extractTokenProfiles = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.profiles)) return payload.profiles;
  return [];
};

const buildTokenIndex = (tokenProfiles) => {
  const byTenantKey = new Map();
  const byEmail = new Map();

  for (const profile of tokenProfiles) {
    if (profile?.tenantKey) byTenantKey.set(profile.tenantKey, profile);
    if (profile?.email) byEmail.set(profile.email, profile);
  }

  return {
    byTenantKey,
    byEmail,
    find(manifestRow) {
      if (manifestRow.tenantKey && byTenantKey.has(manifestRow.tenantKey)) {
        return byTenantKey.get(manifestRow.tenantKey);
      }
      if (manifestRow.email && byEmail.has(manifestRow.email)) {
        return byEmail.get(manifestRow.email);
      }
      return null;
    },
  };
};

const unique = (items) => [...new Set(items.filter(Boolean))];

const buildGraphqlNames = (tableName) => {
  const typeName = toPascalCase(tableName);
  const nodeField = toCamelCase(typeName);
  const queryField = `${nodeField}s`;

  return {
    typeName,
    nodeField,
    queryField,
    createMutation: `create${typeName}`,
    updateMutation: `update${typeName}`,
    deleteMutation: `delete${typeName}`,
    createInputType: `Create${typeName}Input`,
    updateInputType: `Update${typeName}Input`,
    patchField: `${nodeField}Patch`,
  };
};

const getRequestedModes = (mode) => {
  if (mode === 'dual') return ['private', 'public'];
  return [mode];
};

const toHost = (domain, subdomain) => (subdomain ? `${subdomain}.${domain}` : domain);

const scorePublicRoute = ({ apiName, subdomain }, { publicApiName: targetApiName, publicSubdomainPrefix: prefix }) => {
  let score = 0;
  if (apiName === targetApiName) score += 20;
  if (typeof subdomain === 'string' && subdomain.length > 0) {
    score += 5;
    if (prefix && subdomain.startsWith(prefix)) score += 10;
  }
  return score;
};

const pickBestPublicRoute = (routes, scoringOptions) => {
  if (!Array.isArray(routes) || routes.length === 0) return null;
  const ranked = [...routes]
    .map((row) => ({ row, score: scorePublicRoute(row, scoringOptions) }))
    .sort((a, b) => b.score - a.score || String(a.row.host).localeCompare(String(b.row.host)));
  return ranked[0]?.row ?? null;
};

const resolvePublicHostMap = async ({ databaseIds, pgConfig, publicApiName, publicSubdomainPrefix }) => {
  const hostByDatabaseId = new Map();
  if (!Array.isArray(databaseIds) || databaseIds.length === 0) {
    return hostByDatabaseId;
  }

  const pool = new Pool(pgConfig);
  try {
    const sql = `
      select
        a.database_id::text as database_id,
        a.name as api_name,
        d.domain,
        d.subdomain
      from services_public.apis a
      join services_public.domains d on d.api_id = a.id
      where a.is_public = true
        and a.database_id::text = any($1::text[])
    `;

    const result = await pool.query(sql, [databaseIds]);
    const grouped = new Map();

    for (const row of result.rows ?? []) {
      const databaseId = row.database_id;
      const domain = row.domain;
      const subdomain = row.subdomain;
      const apiName = row.api_name;
      if (!databaseId || !domain) continue;

      const host = toHost(domain, subdomain);
      if (!grouped.has(databaseId)) {
        grouped.set(databaseId, []);
      }

      grouped.get(databaseId).push({
        databaseId,
        apiName,
        domain,
        subdomain,
        host,
      });
    }

    for (const databaseId of databaseIds) {
      const candidates = grouped.get(databaseId) ?? [];
      const best = pickBestPublicRoute(candidates, { publicApiName, publicSubdomainPrefix });
      if (best?.host) {
        hostByDatabaseId.set(databaseId, best.host);
      }
    }

    return hostByDatabaseId;
  } finally {
    await pool.end();
  }
};

const buildHeadersForMode = ({ mode, tokenProfile, row, publicHost }) => {
  const headers = {};

  if (mode === 'private') {
    headers.Host = tokenProfile.headers?.Host || 'localhost';
    headers['X-Database-Id'] = row.databaseId;
    headers['X-Schemata'] = row.physicalSchema;
  } else {
    headers.Host = publicHost;
  }

  if (tokenProfile.headers?.Authorization) {
    headers.Authorization = tokenProfile.headers.Authorization;
  }

  return headers;
};

const buildBaseProfile = ({ mode, row, tokenProfile }) => {
  const gqlNames = buildGraphqlNames(row.tableName);

  const availableSchemas = unique(
    (Array.isArray(row.availableSchemas) ? row.availableSchemas : [])
      .map((item) => (typeof item === 'string' ? item : item?.schemaName))
      .concat([row.physicalSchema]),
  );

  return {
    key: `business:${row.tenantKey ?? row.email ?? row.tableName}`,
    mode: mode === 'private' ? 'business-table-private' : 'business-table-public',
    routingMode: mode,
    tenantKey: row.tenantKey ?? null,
    email: row.email ?? null,
    graphqlUrl: tokenProfile.graphqlUrl || '/graphql',
    table: {
      databaseId: row.databaseId,
      schemaId: row.schemaId ?? null,
      tableId: row.tableId ?? null,
      tableName: row.tableName,
      physicalSchema: row.physicalSchema,
      availableSchemas,
      ...gqlNames,
    },
    seed: {
      rowId: row.seedRowId ?? null,
    },
    operationWeights: {
      create: 0.2,
      getById: 0.4,
      updateById: 0.2,
      listRecent: 0.2,
    },
  };
};

const buildOutputPayload = ({
  routingMode,
  runDir,
  baseUrl,
  manifestPath,
  tokensPath,
  totalManifestRows,
  totalTokenProfiles,
  profiles,
  failures,
  meta,
}) => ({
  createdAt: new Date().toISOString(),
  runDir,
  baseUrl,
  routingMode,
  manifestPath,
  tokensPath,
  totalManifestRows,
  totalTokenProfiles,
  successCount: profiles.length,
  failureCount: failures.length,
  failures,
  meta,
  profiles,
});

const main = async () => {
  if (!VALID_ROUTING_MODES.has(routingMode)) {
    throw new Error(`Invalid --routing-mode=${routingMode}; expected private|public|dual`);
  }

  if (!VALID_ROUTING_MODES.has(compatRoutingMode) || compatRoutingMode === 'dual') {
    throw new Error(`Invalid --compat-routing-mode=${compatRoutingMode}; expected private|public`);
  }

  await ensureRunDirs(runDir);

  const manifest = await loadJson(manifestPath);
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error(`No manifest rows found in ${manifestPath}`);
  }

  const tokenPayload = await loadJson(tokensPath);
  const tokenProfiles = extractTokenProfiles(tokenPayload);
  if (tokenProfiles.length === 0) {
    throw new Error(`No token profiles found in ${tokensPath}`);
  }

  const tokenIndex = buildTokenIndex(tokenProfiles);
  const requestedModes = getRequestedModes(routingMode);
  const profileSets = {
    private: [],
    public: [],
  };
  const failureSets = {
    private: [],
    public: [],
  };

  const manifestDatabaseIds = unique(manifest.map((row) => row?.databaseId).filter(Boolean));
  const publicHostByDatabaseId = requestedModes.includes('public')
    ? await resolvePublicHostMap({
        databaseIds: manifestDatabaseIds,
        pgConfig,
        publicApiName,
        publicSubdomainPrefix,
      })
    : new Map();

  for (const row of manifest) {
    const tokenProfile = tokenIndex.find(row);
    const baseFailure = {
      tenantKey: row?.tenantKey ?? null,
      email: row?.email ?? null,
    };

    if (!tokenProfile) {
      for (const mode of requestedModes) {
        failureSets[mode].push({ ...baseFailure, reason: 'matching token profile not found' });
      }
      continue;
    }

    if (!row.databaseId || !row.physicalSchema || !row.tableName) {
      for (const mode of requestedModes) {
        failureSets[mode].push({
          ...baseFailure,
          reason: 'manifest row missing databaseId/physicalSchema/tableName',
        });
      }
      continue;
    }

    for (const mode of requestedModes) {
      const baseProfile = buildBaseProfile({ mode, row, tokenProfile });

      if (mode === 'public') {
        const publicHost = publicHostByDatabaseId.get(row.databaseId);
        if (!publicHost) {
          failureSets.public.push({
            ...baseFailure,
            databaseId: row.databaseId,
            reason: `public host not found (api=${publicApiName})`,
          });
          continue;
        }

        baseProfile.headers = buildHeadersForMode({
          mode,
          tokenProfile,
          row,
          publicHost,
        });
        profileSets.public.push(baseProfile);
      } else {
        baseProfile.headers = buildHeadersForMode({
          mode,
          tokenProfile,
          row,
          publicHost: null,
        });
        profileSets.private.push(baseProfile);
      }
    }
  }

  const privatePayload = buildOutputPayload({
    routingMode: 'private',
    runDir,
    baseUrl,
    manifestPath,
    tokensPath,
    totalManifestRows: manifest.length,
    totalTokenProfiles: tokenProfiles.length,
    profiles: profileSets.private,
    failures: failureSets.private,
    meta: {
      publicApiName,
      publicSubdomainPrefix,
    },
  });

  const publicPayload = buildOutputPayload({
    routingMode: 'public',
    runDir,
    baseUrl,
    manifestPath,
    tokensPath,
    totalManifestRows: manifest.length,
    totalTokenProfiles: tokenProfiles.length,
    profiles: profileSets.public,
    failures: failureSets.public,
    meta: {
      publicApiName,
      publicSubdomainPrefix,
      resolvedPublicHosts: publicHostByDatabaseId.size,
    },
  });

  const writtenPaths = [];

  if (requestedModes.includes('private')) {
    await writeJson(privateOutputPath, privatePayload);
    writtenPaths.push({ mode: 'private', path: privateOutputPath, successCount: privatePayload.successCount });
  }

  if (requestedModes.includes('public')) {
    await writeJson(publicOutputPath, publicPayload);
    writtenPaths.push({ mode: 'public', path: publicOutputPath, successCount: publicPayload.successCount });
  }

  const compatPayload = compatRoutingMode === 'public' ? publicPayload : privatePayload;
  const compatSupported = requestedModes.includes(compatRoutingMode);

  if (!compatSupported) {
    throw new Error(
      `compat routing mode (${compatRoutingMode}) not generated in --routing-mode=${routingMode}; ` +
        'set --compat-routing-mode to one of the generated modes',
    );
  }

  await writeJson(outputPath, compatPayload);

  console.log(
    JSON.stringify(
      {
        outputPath,
        routingMode,
        compatRoutingMode,
        privateOutputPath: requestedModes.includes('private') ? privateOutputPath : null,
        publicOutputPath: requestedModes.includes('public') ? publicOutputPath : null,
        writtenPaths,
        counts: {
          privateSuccess: privatePayload.successCount,
          privateFailure: privatePayload.failureCount,
          publicSuccess: publicPayload.successCount,
          publicFailure: publicPayload.failureCount,
        },
      },
      null,
      2,
    ),
  );

  if (compatPayload.successCount === 0) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
