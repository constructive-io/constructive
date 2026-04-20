#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_BASE_URL,
  DEFAULT_TMP_ROOT,
  ensureRunDirs,
  getArgValue,
  makeRunId,
  postJson,
  writeJson,
} from './common.mjs';

const args = process.argv.slice(2);

const runId = getArgValue(args, '--run-id', makeRunId());
const runDir = path.resolve(getArgValue(args, '--run-dir', path.join(DEFAULT_TMP_ROOT, runId)));
const baseUrl = getArgValue(args, '--base-url', DEFAULT_BASE_URL);
const inputPath = path.resolve(getArgValue(args, '--input', path.join(runDir, 'data', 'tokens.json')));
const outputPath = path.resolve(
  getArgValue(args, '--output', path.join(runDir, 'data', 'tokens.keyspace.json')),
);
const readyProfilesPath = path.resolve(
  getArgValue(args, '--ready-profiles', path.join(runDir, 'data', 'request-profiles.ready.json')),
);

const mode = getArgValue(args, '--mode', 'schemata');
const targetRouteKeys = Number.parseInt(getArgValue(args, '--target-route-keys', '20'), 10);
const maxSchemaWidth = Math.max(1, Number.parseInt(getArgValue(args, '--max-schema-width', '3'), 10));
const maxProfiles = Math.max(1, Number.parseInt(getArgValue(args, '--max-profiles', '5000'), 10));
const noSmokeCheck = args.includes('--no-smoke-check');
const smokeQuery = getArgValue(args, '--smoke-query', '{ __typename }');

const schemaPool = getArgValue(
  args,
  '--schema-pool',
  'constructive_public,constructive_auth_public,constructive_users_public,constructive_memberships_public,services_public',
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const uniqueBy = (items, keyFn) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
};

const routeKeyFromHeaders = (headers = {}) => {
  const apiName = headers['X-Api-Name'];
  const databaseId = headers['X-Database-Id'];
  const schemata = headers['X-Schemata'];
  const metaSchema = headers['X-Meta-Schema'];
  const host = headers.Host || 'localhost';

  if (apiName && databaseId) return `api:${databaseId}:${apiName}`;
  if (schemata && databaseId) return `schemata:${databaseId}:${schemata}`;
  if (metaSchema && databaseId) return `metaschema:api:${databaseId}`;
  return host;
};

const normalizeRoutingHeaders = (headers = {}) => {
  const out = {};
  if (headers.Host) out.Host = headers.Host;
  if (headers['X-Api-Name']) out['X-Api-Name'] = headers['X-Api-Name'];
  if (headers['X-Database-Id']) out['X-Database-Id'] = headers['X-Database-Id'];
  if (headers['X-Schemata']) out['X-Schemata'] = headers['X-Schemata'];
  if (headers['X-Meta-Schema']) out['X-Meta-Schema'] = headers['X-Meta-Schema'];
  return out;
};

const generateSchemaCombinations = (schemas, maxWidth, hardLimit) => {
  const out = [];

  const walk = (startIndex, prefix) => {
    if (out.length >= hardLimit) return;
    if (prefix.length > 0) {
      out.push([...prefix]);
    }
    if (prefix.length === maxWidth) return;
    for (let i = startIndex; i < schemas.length; i += 1) {
      prefix.push(schemas[i]);
      walk(i + 1, prefix);
      prefix.pop();
      if (out.length >= hardLimit) return;
    }
  };

  walk(0, []);
  return out;
};

const extractTokenProfiles = async (filePath) => {
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const profiles = Array.isArray(parsed) ? parsed : parsed?.profiles;
  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new Error(`No profiles found in ${filePath}`);
  }
  return { raw: parsed, profiles };
};

const readReadyProfiles = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const buildCandidateRoutes = async ({ baseProfiles }) => {
  const candidates = [];

  for (const profile of baseProfiles) {
    const headers = normalizeRoutingHeaders(profile.headers);
    const routeKey = routeKeyFromHeaders(headers);
    candidates.push({
      type: 'existing',
      routeKey,
      headers,
    });
  }

  const wantApi = mode === 'api' || mode === 'mixed';
  const wantSchemata = mode === 'schemata' || mode === 'mixed';

  if (wantApi) {
    const readyProfiles = await readReadyProfiles(readyProfilesPath);
    for (const profile of readyProfiles) {
      if (profile?.mode !== 'private-header-routing') continue;
      const headers = normalizeRoutingHeaders(profile.headers);
      if (!headers['X-Api-Name'] || !headers['X-Database-Id']) continue;
      candidates.push({
        type: 'api',
        routeKey: routeKeyFromHeaders(headers),
        headers,
      });
    }
  }

  if (wantSchemata) {
    const dbToHost = new Map();
    for (const profile of baseProfiles) {
      const db = profile.headers?.['X-Database-Id'];
      if (!db) continue;
      if (!dbToHost.has(db)) {
        dbToHost.set(db, profile.headers?.Host || 'localhost');
      }
    }

    const combos = generateSchemaCombinations(schemaPool, maxSchemaWidth, targetRouteKeys * 4);
    for (const [databaseId, host] of dbToHost.entries()) {
      for (const combo of combos) {
        const headers = {
          Host: host,
          'X-Database-Id': databaseId,
          'X-Schemata': combo.join(','),
        };
        candidates.push({
          type: 'schemata',
          routeKey: routeKeyFromHeaders(headers),
          headers,
        });
      }
    }
  }

  return uniqueBy(candidates, (route) => route.routeKey);
};

const smokeRoute = async ({ route, probeProfile }) => {
  const headers = {
    Authorization: probeProfile.headers?.Authorization,
    ...route.headers,
  };
  const result = await postJson({
    url: `${baseUrl}${probeProfile.graphqlUrl ?? '/graphql'}`,
    headers,
    payload: { query: smokeQuery },
    timeoutMs: 15000,
  });

  const hasErrors = Array.isArray(result.json?.errors) && result.json.errors.length > 0;
  const ok =
    result.ok &&
    !hasErrors &&
    (result.json?.data?.__typename === 'Query' || result.json?.data != null);

  return {
    ok,
    status: result.status,
    elapsedMs: result.elapsedMs,
    error: result.error ?? result.json?.errors?.[0]?.message ?? null,
  };
};

const pickRouteSet = async ({ baseProfiles, candidates }) => {
  const selected = [];
  const diagnostics = [];

  const probeByDb = new Map();
  for (const profile of baseProfiles) {
    const db = profile.headers?.['X-Database-Id'] || '__host__';
    if (!probeByDb.has(db)) {
      probeByDb.set(db, profile);
    }
  }

  for (const route of candidates) {
    if (selected.length >= targetRouteKeys) break;

    if (noSmokeCheck) {
      selected.push(route);
      continue;
    }

    const db = route.headers?.['X-Database-Id'] || '__host__';
    const probeProfile = probeByDb.get(db) ?? baseProfiles[0];
    const smoke = await smokeRoute({ route, probeProfile });
    diagnostics.push({ routeKey: route.routeKey, type: route.type, ...smoke });
    if (smoke.ok) {
      selected.push(route);
    }
  }

  return { selected, diagnostics };
};

const mergeRouteHeaders = (baseHeaders = {}, routeHeaders = {}) => {
  const out = { ...baseHeaders };
  delete out['X-Api-Name'];
  delete out['X-Database-Id'];
  delete out['X-Schemata'];
  delete out['X-Meta-Schema'];

  return {
    ...out,
    ...routeHeaders,
  };
};

const expandProfiles = ({ baseProfiles, routes }) => {
  const out = [];
  for (const profile of baseProfiles) {
    const baseDb = profile.headers?.['X-Database-Id'] ?? null;
    for (const route of routes) {
      const routeDb = route.headers?.['X-Database-Id'] ?? null;
      if (routeDb && baseDb && routeDb !== baseDb) {
        continue;
      }
      out.push({
        ...profile,
        key: `${profile.key}|${route.routeKey}`,
        routeKey: route.routeKey,
        routeType: route.type,
        headers: mergeRouteHeaders(profile.headers, route.headers),
      });
      if (out.length >= maxProfiles) {
        return out;
      }
    }
  }
  return out;
};

const main = async () => {
  await ensureRunDirs(runDir);
  const { raw: inputPayload, profiles: baseProfiles } = await extractTokenProfiles(inputPath);

  const candidates = await buildCandidateRoutes({ baseProfiles });
  const { selected, diagnostics } = await pickRouteSet({ baseProfiles, candidates });

  if (selected.length === 0) {
    throw new Error(
      'No valid routes selected for keyspace expansion. Try --no-smoke-check or adjust --schema-pool.',
    );
  }

  const expandedProfiles = expandProfiles({ baseProfiles, routes: selected });
  if (expandedProfiles.length === 0) {
    throw new Error('Expanded profile set is empty.');
  }

  const payload = {
    createdAt: new Date().toISOString(),
    baseUrl,
    inputPath,
    mode,
    targetRouteKeys,
    selectedRouteKeys: selected.length,
    schemaPool,
    noSmokeCheck,
    smokeQuery,
    totalInputProfiles: baseProfiles.length,
    totalOutputProfiles: expandedProfiles.length,
    selectedRoutes: selected,
    diagnostics,
    profiles: expandedProfiles,
    source: inputPayload,
  };

  await writeJson(outputPath, payload);

  console.log(
    JSON.stringify(
      {
        outputPath,
        mode,
        selectedRouteKeys: selected.length,
        totalInputProfiles: baseProfiles.length,
        totalOutputProfiles: expandedProfiles.length,
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
