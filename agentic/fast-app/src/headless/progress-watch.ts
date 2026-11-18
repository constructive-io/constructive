// The lane is flushed after each entry: the run log gets a tool's entries only
// when the tool ends unless the host flushes.

import type { AppBuildDetails } from '../pipeline/app-plan';
import type { ProgressWatch } from '../pipeline/host';

/** The desktop's Cloud UI reads this type, with `data` as `{ toolCallId, details }`. */
export const APP_BUILD_PROGRESS_TYPE = 'constructive.app-build.progress';

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

const changeKey = (details: AppBuildDetails): string =>
  JSON.stringify([details.stage, details.name, details.phases.map((phase) => phase.status)]);

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
