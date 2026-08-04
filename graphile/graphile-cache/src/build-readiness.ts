export interface GraphileBuildReadiness {
  schemaResult: PromiseLike<unknown> | unknown;
  addTo(): PromiseLike<unknown> | unknown;
  ready(): PromiseLike<unknown> | unknown;
  release(): PromiseLike<unknown> | unknown;
  onReleaseError?(error: unknown): void;
}

/**
 * Keep the build coordinator occupied until both schema gathering and the
 * HTTP adapter are ready. Failed generations are released before returning.
 */
export const awaitGraphileBuildReadiness = async (
  build: GraphileBuildReadiness
): Promise<void> => {
  try {
    await build.addTo();
    await Promise.all([build.schemaResult, build.ready()]);
  } catch (error) {
    try {
      await build.release();
    } catch (releaseError) {
      build.onReleaseError?.(releaseError);
    }
    throw error;
  }
};
