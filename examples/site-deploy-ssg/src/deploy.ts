/**
 * Builds the example site and deploys it as a release.
 *
 * ```bash
 * CONSTRUCTIVE_API_URL=https://api.example.com/graphql \
 * CONSTRUCTIVE_TOKEN=$TOKEN \
 * SITE_ID=... DATABASE_ID=... BUCKET_KEY=site-example \
 * PREVIEW=play pnpm deploy
 * ```
 *
 * Nothing here is example-specific except the build step: the same twenty
 * lines are what a CI job or an admin UI runs.
 */

import { type DeployProgress, deploySite, type GraphQLExecutor } from '@constructive-io/site-deploy';
import { join } from 'path';

import { buildSite } from './ssg';

/** Minimal GraphQL executor over `fetch` — any client works here. */
export function fetchExecutor(url: string, token?: string): GraphQLExecutor {
  return async (query, variables) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) {
      throw new Error(`GraphQL HTTP ${response.status}: ${await response.text()}`);
    }
    const payload = (await response.json()) as {
      data?: Record<string, unknown>;
      errors?: { message: string }[];
    };
    if (payload.errors?.length) {
      throw new Error(payload.errors.map((e) => e.message).join('; '));
    }
    return payload.data ?? {};
  };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function logProgress(event: DeployProgress): void {
  switch (event.type) {
  case 'diffed':
    console.log(
      `diffed ${event.files} files: ${event.toUpload} to upload, ${event.skipped} already stored`,
    );
    break;
  case 'uploaded':
    console.log(`uploaded ${event.path} (${event.done}/${event.total})`);
    break;
  case 'manifest':
    console.log(`${event.created ? 'created' : 'updated'} release → commit ${event.commitId}`);
    break;
  case 'preview':
    console.log(`preview ${event.name} → ${event.url ?? event.commitId}`);
    break;
  case 'published':
    console.log(`published ${event.commitId}`);
    break;
  default:
    break;
  }
}

async function main(): Promise<void> {
  const root = join(__dirname, '..');
  const dist = join(root, 'dist-site');
  const files = await buildSite(join(root, 'content'), dist, { banner: process.env.BANNER });
  console.log(`built ${files.length} files into ${dist}`);

  const api = fetchExecutor(required('CONSTRUCTIVE_API_URL'), process.env.CONSTRUCTIVE_TOKEN);
  const result = await deploySite({
    api,
    storage: process.env.CONSTRUCTIVE_STORAGE_URL
      ? fetchExecutor(process.env.CONSTRUCTIVE_STORAGE_URL, process.env.CONSTRUCTIVE_TOKEN)
      : undefined,
    siteId: required('SITE_ID'),
    databaseId: process.env.DATABASE_ID,
    bucketKey: required('BUCKET_KEY'),
    source: dist,
    preview: process.env.PREVIEW,
    previewApex: process.env.PREVIEW_APEX,
    publish: process.env.PUBLISH === '1',
    onProgress: logProgress,
  });

  console.log(
    `release ${result.commitId}: ${result.files} files, ${result.uploaded} uploaded, ` +
      `${result.skipped} deduplicated, published=${result.published}`,
  );
  if (result.previewUrl) console.log(`preview URL: ${result.previewUrl}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
