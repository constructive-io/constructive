// Never call runLog.flush here: the run-log lane exists only once the session
// does, so it throws until then.

import { mkdir } from 'node:fs/promises';

import { configureHost } from '@agentic-kit/db-tools';

import { configureFastAppHost } from '../pipeline/host';
import { headlessExtensions, toolNamesOf } from './extensions';
import { headlessHost } from './host';
import { readRunIdentity } from './launch';
import { checkOptions, type HeadlessAppBuilding, type HeadlessAppBuildingOptions } from './options';
import { headlessSystemPrompt } from './prompt';
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
export { headlessSystemPrompt } from './prompt';


/** Throws HeadlessOptionsError for options it can't use, LaunchError when a key can't be used. */
export async function createHeadlessAppBuilding(
  options: HeadlessAppBuildingOptions
): Promise<HeadlessAppBuilding> {
  const checked = checkOptions(options);
  await mkdir(checked.stateDir, { recursive: true });
  const run = await readRunIdentity(checked);
  configureHost(headlessToolsHost(run));
  const { host, installed, dispose } = headlessHost(run, checked);
  configureFastAppHost(host);
  const extensions = headlessExtensions(installed);
  return {
    extensions,
    toolNames: await toolNamesOf(extensions),
    systemPrompt: await headlessSystemPrompt(),
    dispose
  };
}
