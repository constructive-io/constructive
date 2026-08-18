export interface GraphileBuildReadiness {
  schemaResult: PromiseLike<unknown> | unknown;
  addTo(): PromiseLike<unknown> | unknown;
  ready(): PromiseLike<unknown> | unknown;
  release(): PromiseLike<unknown> | unknown;
  onReleaseError?(error: unknown): void;
}

/**
 * Resolve only after schema gathering and the HTTP adapter are ready. A failed
 * generation reaches its release terminal state before the failure escapes.
 */
export const awaitGraphileBuildReadiness = async (
  build: GraphileBuildReadiness
): Promise<void> => {
  const schemaOutcome = Promise.resolve(build.schemaResult).then(
    () => ({ ready: true as const }),
    (error: unknown) => ({ ready: false as const, error })
  );
  try {
    await build.addTo();
    const [schema] = await Promise.all([schemaOutcome, build.ready()]);
    if ('error' in schema) throw schema.error;
  } catch (error) {
    try {
      await build.release();
    } catch (releaseError) {
      build.onReleaseError?.(releaseError);
    }
    throw error;
  }
};
