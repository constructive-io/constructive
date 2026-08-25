/**
 * A mock of the deploy surface — bulk upload, the release row, the site
 * pointer and preview refs — so the example's deploy path is exercised with no
 * database and no network.
 *
 * It models the two server behaviours the pipeline leans on: dedupe (a hash the
 * bucket already holds comes back `deduplicated: true` with no upload URL) and
 * the versioning trigger (every manifest write stamps a fresh commit id).
 */

import type { GraphQLExecutor, PutObject, ReleaseManifest } from '@constructive-io/site-deploy';

interface ReleaseRow {
  id: string;
  commitId: string;
  storeId: string;
  manifest: ReleaseManifest;
}

export interface MockServer {
  api: GraphQLExecutor;
  putObject: PutObject;
  /** CAS keys whose bytes the bucket holds. */
  storedKeys: string[];
  /** Hashes the bucket holds, as dedupe sees them. */
  storedHashes: Set<string>;
  release: ReleaseRow | null;
  activeCommitId: string | null;
  previewRefs: Record<string, string>;
  /** The manifest of each commit, so a rollback can be checked. */
  commits: Record<string, ReleaseManifest>;
}

export function createMockServer(): MockServer {
  let commitCount = 0;
  const hashes = new Set<string>();

  const server: MockServer = {
    storedKeys: [],
    storedHashes: hashes,
    release: null,
    activeCommitId: null,
    previewRefs: {},
    commits: {},
    api: async (query, variables) => handle(operationName(query), variables),
    putObject: async (url, body, contentType) => {
      const hash = url.slice(url.lastIndexOf('/') + 1);
      hashes.add(hash);
      server.storedKeys.push(`cas/sha256/${hash}`);
      void body;
      void contentType;
    },
  };

  function handle(operation: string, variables: Record<string, unknown>) {
    const input = (variables.input ?? {}) as Record<string, any>;
    switch (operation) {
    case 'uploadFiles':
      return {
        uploadFiles: {
          files: (input.files as any[]).map((file) => {
            const deduplicated = hashes.has(file.contentHash);
            return {
              fileId: `file-${file.contentHash.slice(0, 8)}`,
              key: file.key as string,
              deduplicated,
              uploadUrl: deduplicated ? null : `https://s3.test/put/${file.contentHash}`,
            };
          }),
        },
      };
    case 'siteReleases':
      return { siteReleases: { nodes: server.release ? [server.release] : [] } };
    case 'createSiteRelease': {
      server.release = commit('release-1', 'store-1', input.siteRelease.manifest);
      return { createSiteRelease: { siteRelease: server.release } };
    }
    case 'updateSiteRelease': {
      server.release = commit(
        input.id as string,
        server.release?.storeId ?? 'store-1',
        input.siteReleasePatch.manifest,
      );
      return { updateSiteRelease: { siteRelease: server.release } };
    }
    case 'updateSite':
      server.activeCommitId = input.sitePatch.activeCommitId as string;
      return { updateSite: { site: { id: input.id, activeCommitId: server.activeCommitId } } };
    case 'provisionSitePreview':
      server.previewRefs[input.name as string] = input.commitId as string;
      return {
        provisionSitePreview: {
          result: {
            id: 'route-1',
            previewRef: `preview/${input.name}`,
            domain: { hostname: `${input.name}--example.${input.apex}` },
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

  function commit(id: string, storeId: string, manifest: ReleaseManifest): ReleaseRow {
    commitCount += 1;
    const commitId = `commit-${commitCount}`;
    server.commits[commitId] = manifest;
    return { id, commitId, storeId, manifest };
  }

  return server;
}

function operationName(query: string): string {
  const match = query.match(/\{\s*(\w+)\(/);
  if (!match) throw new Error(`Could not read an operation from: ${query}`);
  return match[1];
}
