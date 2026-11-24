// The fast app path's tools: plan_app (the one approval card and the
// deterministic build) and verify_app (the checks, again, after a repair).
// The app pipeline they run is in ../pipeline/, and what it takes from its
// host is in ../pipeline/host.ts.

import type { ExtensionFactory } from '@earendil-works/pi-coding-agent';

import { registerPlanAppTool } from './plan-app-tool';
import { registerVerifyAppTool } from './verify-app-tool';

export const fastAppTools: ExtensionFactory = (pi) => {
  registerPlanAppTool(pi);
  registerVerifyAppTool(pi);
};
