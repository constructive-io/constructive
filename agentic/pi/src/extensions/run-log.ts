/**
 * The pi side of the run log: drain the neutral session mirror after anything
 * that can append an entry. Every listed event is a point where pi has just
 * written to the session, so the run log trails the session by at most one event.
 */

import {
  PI_TRANSCRIPT_FORMAT,
  type RunEventRecord,
  type RunLogAppendStore,
  type SessionEntrySource,
  SessionMirror
} from '@agentic-kit/run-log';
import type { ExtensionAPI, ExtensionFactory } from '@earendil-works/pi-coding-agent';

/**
 * Events after which the session may have grown. `session_start` also covers
 * resume (pi replays the file before the first event), so a resumed run
 * re-appends its history and the store's idempotency discards the duplicates.
 */
export const MIRROR_EVENTS = [
  'session_start',
  'session_compact',
  'session_tree',
  'session_shutdown',
  'input',
  'before_agent_start',
  'message_end',
  'tool_execution_end',
  'turn_end',
  'agent_end',
  'model_select',
  'thinking_level_select'
] as const;

export type MirrorEvent = (typeof MIRROR_EVENTS)[number];

export interface RunLogExtensionOptions {
  /** The run this session belongs to. Local and cloud runs differ only here. */
  runId: string;
  store: RunLogAppendStore;
  /** pi session format version the entries are produced under. */
  transcriptVersion?: number;
  events?: readonly MirrorEvent[];
  /**
   * Called when a drain fails. Without it the failure is rethrown into pi's
   * event dispatch: a run log that silently stops recording is worse than a
   * loud one, so losing entries is never the default.
   */
  onError?: (error: unknown) => void;
}

export interface RunLogExtension {
  extension: ExtensionFactory;
  /** Drain now — for a host that wants the log flushed before it exits. */
  flush(): Promise<RunEventRecord[]>;
  mirror: SessionMirror;
}

export function createRunLogExtension(options: RunLogExtensionOptions): RunLogExtension {
  const mirror = new SessionMirror({
    runId: options.runId,
    store: options.store,
    transcriptFormat: PI_TRANSCRIPT_FORMAT,
    ...(options.transcriptVersion === undefined ? {} : { transcriptVersion: options.transcriptVersion })
  });
  const events = options.events ?? MIRROR_EVENTS;

  const drain = async (): Promise<RunEventRecord[]> => {
    try {
      return await mirror.drain();
    } catch (error) {
      if (!options.onError) throw error;
      options.onError(error);
      return [];
    }
  };

  const extension: ExtensionFactory = (pi: ExtensionAPI) => {
    for (const event of events) {
      // Each overload of `on` is typed for its own handler; the handler here
      // ignores the event and only reads the context, so one cast at the
      // registration boundary keeps the loop.
      (pi.on as (name: MirrorEvent, handler: (event: unknown, ctx: { sessionManager: unknown }) => Promise<void>) => void)(
        event,
        async (_event, ctx) => {
          mirror.bind(ctx.sessionManager as SessionEntrySource);
          await drain();
        }
      );
    }
  };

  return { extension, flush: drain, mirror };
}
