/**
 * A mock of the deploy surface: the bulk upload mutation, the release row and
 * the site pointer, with no database and no network.
 *
 * It models the two server behaviours the pipeline depends on — dedupe (a
 * hash it has already seen comes back `deduplicated: true` with no upload URL)
 * and the versioning trigger (every manifest write stamps a fresh commit id on
 * the row) — so the tests exercise real dedupe and rollback semantics.
 */

import { casKey, hashBytes } from '../src/manifest';
import type { DeployFile, GraphQLExecutor, PutObject, ReleaseManifest } from '../src/types';

export interface MockCall {
  operation: string;
  variables: Record<string, unknown>;
}

export interface MockServerOptions {
  /** Hashes the bucket already holds. */
  existing?: string[];
  /** Seed an existing release row for the site. */
  release?: { id: string; commitId: string; storeId: string; manifest: ReleaseManifest };
  /** Fail a named operation, once per matching call. */
  failOn?: Partial<Record<string, Error>>;
  /** Return a wrong key for this logical filename. */
  corruptKeyFor?: string;
}

export interface MockServer {
  api: GraphQLExecutor;
  putObject: PutObject;
  calls: MockCall[];
  puts: { url: string; size: number; contentType: string }[];
  stored: Set<string>;
  release: { id: string; commitId: string; storeId: string; manifest: ReleaseManifest } | null;
  activeCommitId: string | null;
  previewRefs: Record<string, string>;
  /** How many times a given operation ran. */
  countOf: (operation: string) => number;
  /** Variables of the first call to an operation. */
  firstCall: (operation: string) => Record<string, unknown> | undefined;
}

/** Fail every PUT — used to prove a partial upload never reaches a manifest. */
export const failingPut: PutObject = async () => {
  throw new Error('connection reset');
};

export function createMockServer(options: MockServerOptions = {}): MockServer {
  const stored = new Set(options.existing ?? []);
  const failOn = { ...(options.failOn ?? {}) };
  let commits = 0;

  const server: MockServer = {
    calls: [],
    puts: [],
    stored,
    release: options.release ?? null,
    activeCommitId: null,
    previewRefs: {},
    api: async (query, variables) => {
      const operation = operationName(query);
      server.calls.push({ operation, variables });
      const failure = failOn[operation];
      if (failure) {
        delete failOn[operation];
        throw failure;
      }
      return handle(operation, variables);
    },
    putObject: async (url, body, contentType) => {
      server.puts.push({ url, size: body.byteLength, contentType });
      stored.add(url.slice(url.lastIndexOf('/') + 1));
    },
    countOf: (operation) => server.calls.filter((call) => call.operation === operation).length,
    firstCall: (operation) => server.calls.find((call) => call.operation === operation)?.variables,
  };

  function handle(operation: string, variables: Record<string, unknown>) {
    const input = (variables.input ?? {}) as Record<string, any>;
    switch (operation) {
    case 'uploadFiles':
      return {
        uploadFiles: {
          files: (input.files as any[]).map((file) => {
            const deduplicated = stored.has(file.contentHash);
            const key =
                file.filename === options.corruptKeyFor
                  ? 'uploads/wrong-key'
                  : (file.key as string);
            return {
              fileId: `file-${file.contentHash.slice(0, 8)}`,
              key,
              deduplicated,
              uploadUrl: deduplicated ? null : `https://s3.test/put/${file.contentHash}`,
            };
          }),
        },
      };
    case 'siteReleases':
      return { siteReleases: { nodes: server.release ? [server.release] : [] } };
    case 'createSiteRelease': {
      const row = {
        id: 'release-1',
        commitId: nextCommit(),
        storeId: 'store-1',
        manifest: input.siteRelease.manifest as ReleaseManifest,
      };
      server.release = row;
      return { createSiteRelease: { siteRelease: row } };
    }
    case 'updateSiteRelease': {
      const row = {
        id: input.id as string,
        commitId: nextCommit(),
        storeId: server.release?.storeId ?? 'store-1',
        manifest: input.siteReleasePatch.manifest as ReleaseManifest,
      };
      server.release = row;
      return { updateSiteRelease: { siteRelease: row } };
    }
    case 'updateSite':
      server.activeCommitId = input.sitePatch.activeCommitId as string;
      return {
        updateSite: { site: { id: input.id, activeCommitId: server.activeCommitId } },
      };
    case 'provisionSitePreview':
      server.previewRefs[input.name as string] = input.commitId as string;
      return {
        provisionSitePreview: {
          result: {
            id: 'route-1',
            previewRef: `preview/${input.name}`,
            domain: { hostname: `${input.name}--docs.${input.apex}` },
          },
        },
      };
    case 'setSitePreview':
      server.previewRefs[input.targetName as string] = input.targetCommitId as string;
      return { setSitePreview: { result: input.targetCommitId } };
    default:
      throw new Error(`Unexpected operation: ${operation}`);
    }
  }

  function nextCommit(): string {
    commits += 1;
    return `commit-${commits}`;
  }

  return server;
}

/** The mutation/query field being selected, e.g. `uploadFiles`. */
function operationName(query: string): string {
  const match = query.match(/\{\s*(\w+)\(/);
  if (!match) throw new Error(`Could not read an operation from: ${query}`);
  return match[1];
}

/** A build file from a string body. */
export function file(path: string, body: string): DeployFile {
  return { path, bytes: new TextEncoder().encode(body) };
}

/** The CAS key a body will be stored under. */
export function keyOf(body: string): string {
  return casKey(hashBytes(new TextEncoder().encode(body)));
}

/** The hash of a body, as the bucket's dedupe set records it. */
export function hashOf(body: string): string {
  return hashBytes(new TextEncoder().encode(body));
}
