/**
 * `@agentic-kit/fast-app/headless`: app building for a process with no UI,
 * such as the cloud Job of a Cloud chat (brief 4.7). One call checks the
 * launch values, reads what the run acts as, configures the db tools' host
 * and the pipeline's host, and returns the extensions, their tool names, the
 * prompt section that matches them, and the stop for what they started.
 *
 * It never calls `runLog.flush`: the run-log lane exists only once the
 * session does, so the flushes happen inside the tools' own runs.
 */

import { mkdir } from 'node:fs/promises';

import { configureHost } from '@agentic-kit/db-tools';

import { configureFastAppHost } from '../pipeline/host';
import { appBuildingSection } from '../prompt';
import { headlessExtensions, toolNamesOf } from './extensions';
import { headlessHost } from './host';
import { readRunIdentity } from './launch';
import { checkOptions, type HeadlessAppBuilding, type HeadlessAppBuildingOptions } from './options';
import { headlessToolsHost } from './tools-host';

export { LEFT_OUT_TOOLS } from './extensions';
export { LaunchError } from './launch';
export {
  DEFAULT_APPROVAL_TIMEOUT_MS,
  type HeadlessAppBuilding,
  type HeadlessAppBuildingOptions,
  HeadlessOptionsError
} from './options';
export { STOPPED_REASON } from './plan-card';
export { APP_BUILD_PROGRESS_TYPE } from './progress-watch';

/** The app-building section of the system prompt: these tools are there, so it is the "on" text. */
export const HEADLESS_SYSTEM_PROMPT = appBuildingSection(true).trimEnd();

/**
 * Starts app building for one run. Throws HeadlessOptionsError for options it
 * can't use, and LaunchError when the backend refuses a key or can't be asked.
 */
export async function createHeadlessAppBuilding(
  options: HeadlessAppBuildingOptions
): Promise<HeadlessAppBuilding> {
  const checked = checkOptions(options);
  await mkdir(checked.stateDir, { recursive: true });
  const run = await readRunIdentity(checked);
  configureHost(headlessToolsHost(run));
  const { host, dispose } = headlessHost(run, checked);
  configureFastAppHost(host);
  const extensions = headlessExtensions();
  return {
    extensions,
    toolNames: await toolNamesOf(extensions),
    systemPrompt: HEADLESS_SYSTEM_PROMPT,
    dispose
  };
}
