import { graphileBuildCoordinator } from './build-coordinator';

import {
  disposeUncachedEntry,
  graphileCache,
  type GraphileCacheEntry,
  reserveGraphileCapacity
} from './graphile-cache';

export interface GraphileBuildMetadata {
  cacheKey: string;
  serviceKey: string;
  databaseId?: string | null;
  poolKey: string;
}

/** Reserve capacity before allocating preset services or starting a build. */
export const buildAdmittedGraphileInstance = (
  metadata: GraphileBuildMetadata,
  create: () => Promise<GraphileCacheEntry>,
  assertCurrent: () => void = () => undefined
): Promise<GraphileCacheEntry> => graphileBuildCoordinator.run(async (lease) => {
  // Admission itself may await an evicted generation's release. It belongs
  // inside the bounded, watched work rather than an unbounded queue before it.
  assertCurrent();
  lease.assertCurrent();
  const reservation = await reserveGraphileCapacity();
  let entry: GraphileCacheEntry | undefined;
  try {
    lease.assertCurrent();
    assertCurrent();
    entry = await create();
    reservation.assertPublishable();
    lease.assertCurrent();
    assertCurrent();
    Object.assign(entry, metadata);
    graphileCache.set(metadata.cacheKey, entry);
    return entry;
  } catch (error) {
    if (entry) {
      if (graphileCache.peek(metadata.cacheKey) === entry) graphileCache.delete(metadata.cacheKey);
      try {
        await disposeUncachedEntry(entry);
      } catch (releaseError) {
        throw new AggregateError([error, releaseError], 'Schema build and release failed');
      }
    }
    throw error;
  } finally {
    reservation.release();
  }
});
