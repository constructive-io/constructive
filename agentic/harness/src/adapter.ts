/**
 * What Constructive needs from a coding-agent harness.
 *
 * The lanes a run is wrapped in — the run log, the metering gateway, the run
 * gate — are harness-neutral; only their *attachment* is vendor-specific (pi
 * takes extension factories through a resource loader, another harness will take
 * plugins, or a subprocess). An adapter is exactly that attachment plus the
 * identity of the transcript it produces, so a host can start a run without
 * naming a vendor.
 *
 * Deliberately thin: it declares only what a host actually calls on a started
 * run. Prompting, tool registration and event subscription stay on the
 * adapter's own run handle, because those surfaces differ enough between
 * harnesses that a lowest common denominator would be a lie.
 */

export interface HarnessRun {
  /** The run these lanes belong to; the run log's partition key. */
  readonly runId: string;
  /** Drain every lane that buffers (log entries, usage reports). */
  flush(): Promise<void>;
  /** Flush, then release the harness's resources. */
  close(): Promise<void>;
}

export interface HarnessAdapter<TStartOptions, TRun extends HarnessRun = HarnessRun> {
  /** Stable adapter id, e.g. `pi`. */
  readonly id: string;
  /**
   * The `transcriptFormat` the run's entries are recorded under, so a reader can
   * pick the projector that understands them.
   */
  readonly transcriptFormat: string;
  startRun(options: TStartOptions): Promise<TRun>;
}
