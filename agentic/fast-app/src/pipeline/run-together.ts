// Steps of a build that run side by side (codegen and the seed). The build's
// lock covers everything a run started, so the run returns only once every
// step has ended, even one that can't stop at once.

/**
 * Runs the steps together. The first to fail aborts `run`, which the other
 * steps watch, and the call rejects with that first failure once all of them
 * have settled.
 */
export async function runTogether(
  run: AbortController,
  steps: ReadonlyArray<() => Promise<unknown>>,
): Promise<void> {
  const failures: unknown[] = [];
  await Promise.allSettled(
    steps.map((step) =>
      step().catch((error: unknown) => {
        failures.push(error);
        run.abort(error);
        throw error;
      }),
    ),
  );
  if (failures.length) throw failures[0];
}
