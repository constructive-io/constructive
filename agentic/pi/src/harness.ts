/**
 * pi as a `HarnessAdapter`.
 *
 * The adapter is thin by design: everything a run actually does — gating, run
 * log, metering — already lives behind neutral contracts, so all that is left
 * here is pi's identity, the transcript it writes, and its way of attaching
 * extensions (a resource loader). A second harness implements the same three
 * things against its own plugin surface, and hosts keep calling `startRun`.
 */

import type { HarnessAdapter, HarnessRun } from '@agentic-kit/harness';
import { PI_TRANSCRIPT_FORMAT } from '@agentic-kit/run-log';

import { type EmbeddedRun, startRun, type StartRunOptions } from './embed/session';

export const PI_HARNESS_ID = 'pi';

export interface PiHarnessRun extends EmbeddedRun, HarnessRun {
  readonly runId: string;
}

export const piHarness: HarnessAdapter<StartRunOptions, PiHarnessRun> = {
  id: PI_HARNESS_ID,
  transcriptFormat: PI_TRANSCRIPT_FORMAT,
  async startRun(options: StartRunOptions): Promise<PiHarnessRun> {
    const embedded = await startRun(options);
    return {
      ...embedded,
      runId: embedded.run.runId,
      flush: (): Promise<void> => embedded.run.flush()
    };
  }
};
