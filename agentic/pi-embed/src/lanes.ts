/**
 * Compose a run's lanes into the extension list pi loads.
 *
 * A run's placement — a developer's laptop, a long-running cloud job — is *only*
 * a difference in these options: which store the log appends to, whether the
 * model calls leave through the metered gateway or a local key, and where an
 * approval question is asked. The composed session is otherwise identical, which
 * is the whole point of the package.
 */

import { createGateExtension, type GateExtension, type GateExtensionOptions } from '@agentic-kit/pi-ext-gate';
import {
  createMeteredModelExtension,
  type MeteredIdentity,
  type MeteredModelExtension,
  type MeteredModelExtensionOptions
} from '@agentic-kit/pi-ext-metered-model';
import { createRunLogExtension, type RunLogExtension, type RunLogExtensionOptions } from '@agentic-kit/pi-ext-run-log';
import {
  createUsageReportExtension,
  type UsageReportExtension,
  type UsageReportExtensionOptions
} from '@agentic-kit/pi-ext-usage-report';
import type { ExtensionFactory } from '@earendil-works/pi-coding-agent';

/** Run log lane — `runId` comes from the run, not from here. */
export type RunLogLane = Omit<RunLogExtensionOptions, 'runId'>;

/**
 * Metering lane. `gateway` is authoritative (the gateway meters what it proxies);
 * `self-report` is the own-provider-key lane and is only as trustworthy as the
 * agent reporting it. They are mutually exclusive on purpose: routing through the
 * gateway *and* self-reporting would double-count the same tokens.
 */
export type MeteringLane =
  | ({ mode: 'gateway' } & MeteredModelExtensionOptions)
  | ({ mode: 'self-report' } & UsageReportExtensionOptions);

/** Approval lane — `runId` comes from the run. */
export type GateLane = Omit<GateExtensionOptions, 'runId'>;

export interface ComposeRunOptions {
  runId: string;
  log?: RunLogLane;
  metering?: MeteringLane;
  gate?: GateLane;
  /**
   * The host's own extensions — workspace tools, prompts, UI glue. Loaded after
   * the lanes so a host tool call is already gated and already logged.
   */
  extensions?: readonly ExtensionFactory[];
}

export interface ComposedLanes {
  log?: RunLogExtension;
  meteredModel?: MeteredModelExtension;
  usageReport?: UsageReportExtension;
  gate?: GateExtension;
}

export interface ComposedRun {
  runId: string;
  /** In load order: log, metering, gate, then the host's own. */
  extensions: ExtensionFactory[];
  lanes: ComposedLanes;
  /**
   * Drain every lane that buffers, and throw the first failure. A host calls
   * this before it exits; the extensions also flush themselves on
   * `session_shutdown`, so this is for hosts that end a run without one.
   */
  flush(): Promise<void>;
}

export function composeRun(options: ComposeRunOptions): ComposedRun {
  const lanes: ComposedLanes = {};
  const extensions: ExtensionFactory[] = [];

  if (options.log) {
    lanes.log = createRunLogExtension({ runId: options.runId, ...options.log });
    extensions.push(lanes.log.extension);
  }

  const metering = options.metering;
  if (metering?.mode === 'gateway') {
    const { mode: _mode, ...meteredOptions } = metering;
    lanes.meteredModel = createMeteredModelExtension(meteredOptions);
    extensions.push(lanes.meteredModel.extension);
  } else if (metering?.mode === 'self-report') {
    const { mode: _mode, ...reportOptions } = metering;
    lanes.usageReport = createUsageReportExtension(reportOptions);
    extensions.push(lanes.usageReport.extension);
  }

  if (options.gate) {
    lanes.gate = createGateExtension({ runId: options.runId, ...options.gate });
    extensions.push(lanes.gate.extension);
  }

  if (options.extensions) extensions.push(...options.extensions);

  return {
    runId: options.runId,
    extensions,
    lanes,
    flush: async (): Promise<void> => {
      // Sequential, log first: a usage failure must not cost us the transcript.
      if (lanes.log) await lanes.log.flush();
      if (lanes.usageReport) await lanes.usageReport.flush();
    }
  };
}

/**
 * The identity every metered lane needs. Exported so a host can build it once
 * from its resolved project context and hand the same value to both lanes.
 */
export type { MeteredIdentity };
