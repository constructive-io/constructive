interface ReleasablePresetService {
  release?: () => void | PromiseLike<void>;
}

/**
 * Own and release the unique pgServices for one resolved preset generation.
 * Success means the public release calls returned successfully (including any
 * promise they expose). Upstream may continue subscriber UNLISTEN/client return
 * in the background; this does not promise that the pool is already idle.
 */
export const createPresetServicesReleaser = (resolvedPreset: {
  pgServices?: readonly ReleasablePresetService[];
}): (() => Promise<void>) => {
  const services = [...new Set(resolvedPreset.pgServices ?? [])];
  let releasePromise: Promise<void> | null = null;

  return (): Promise<void> => {
    if (releasePromise) return releasePromise;
    releasePromise = (async () => {
      let firstError: unknown;
      let failed = false;
      for (const service of [...services].reverse()) {
        try {
          await service.release?.();
        } catch (error) {
          if (!failed) firstError = error;
          failed = true;
        }
      }
      if (failed) throw firstError;
    })();
    return releasePromise;
  };
};
