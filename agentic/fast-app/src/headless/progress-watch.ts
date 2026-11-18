// A cloud build's progress (FastAppHost.progress, brief 4.4): at each phase
// change the running card's details go into the session as a custom entry,
// and the lane is flushed, so another client sees the card move while the
// tool still runs. The tool's result replaces the last one.

import type { AppBuildDetails } from '../pipeline/app-plan';
import type { ProgressWatch } from '../pipeline/host';

/** The custom entry a cloud build writes; `data` is `{ toolCallId, details }`. */
export const APP_BUILD_PROGRESS_TYPE = 'constructive.app-build.progress';

/**
 * The details another client gets: no command output, which can be long and
 * is the pod's. They carry no `previewUrl` either: the host's `preview: false`
 * keeps the pipeline from setting one.
 */
export function cloudDetails(details: AppBuildDetails): AppBuildDetails {
  return {
    ...details,
    phases: details.phases.map((phase) =>
      phase.activity
        ? { ...phase, activity: phase.activity.map(({ output: _output, ...item }) => item) }
        : phase
    )
  };
}

// What makes a new entry: the stage, the name, and each step's status. A note,
// or a command that started inside a step, waits for the next change.
const changeKey = (details: AppBuildDetails): string =>
  JSON.stringify([details.stage, details.name, details.phases.map((phase) => phase.status)]);

/** The progress watch: an entry at each phase change, then a flush. */
export function runLogProgress(flush: () => Promise<void>): ProgressWatch {
  return (toolCallId, append) => {
    let last: string | null = null;
    return {
      update: (details) => {
        const key = changeKey(details);
        if (key === last) return;
        last = key;
        append(APP_BUILD_PROGRESS_TYPE, { toolCallId, details: cloudDetails(details) });
        void flush();
      }
    };
  };
}
