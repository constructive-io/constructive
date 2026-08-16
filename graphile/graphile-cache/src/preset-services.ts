interface ReleasablePresetService {
  release?: () => void | Promise<void>;
}

/** Own and release the unique pgServices for one resolved preset generation. */
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
