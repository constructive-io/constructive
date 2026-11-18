// `AppSpec.ui.resources.<table>`, found under whichever spelling the spec uses.

import type { AppSpec, ResourceUiSpec } from '../app-spec/types';
import { normalizeKey } from '../extensions/db-tools/live-meta-index';

/** `ui.resources.<table>`, under the key the spec already spells it with; made when missing. */
export function resourceUi(spec: AppSpec, table: string): ResourceUiSpec {
  const resources = ((spec.ui ??= {}).resources ??= {});
  const key = Object.keys(resources).find((k) => normalizeKey(k) === normalizeKey(table));
  return (resources[key ?? table] ??= {});
}
