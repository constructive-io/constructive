interface ReleasablePresetService {
  release?: () => void | Promise<void>;
}

/**
 * Own the pgServices created for one resolved PostGraphile preset.
 *
 * PostGraphile 5.0.3 releases Grafserv but does not release pgServices. Cached
 * generations therefore have to do this explicitly or an evicted
 * PgSubscriber can retain its LISTEN checkout in the next generation's pool.
 */
export const createPresetServicesReleaser = (
  resolvedPreset: { pgServices?: readonly ReleasablePresetService[] }
): (() => Promise<void>) => {
  const services = [...new Set(resolvedPreset.pgServices ?? [])];
  let releasePromise: Promise<void> | null = null;

  return (): Promise<void> => {
    if (releasePromise) return releasePromise;
    releasePromise = (async () => {
      let firstError: unknown;
      for (const service of [...services].reverse()) {
        try {
          await service.release?.();
        } catch (error) {
          firstError ??= error;
        }
      }
      if (firstError) throw firstError;
    })();
    return releasePromise;
  };
};
