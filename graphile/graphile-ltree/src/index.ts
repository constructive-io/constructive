/**
 * graphile-ltree — PostGraphile v5 ltree Plugin
 *
 * File-path syntax for ltree columns. The LTree scalar auto-converts between
 * slash-delimited file paths ("/projects/alpha/docs") in the GraphQL API and
 * dot-delimited ltree ("projects.alpha.docs") in PostgreSQL.
 *
 * @example
 * ```typescript
 * import { GraphileLtreePreset } from 'graphile-ltree';
 * ```
 */

// Presets
export { GraphileFolderPreset, GraphileLtreePreset } from './preset';

// Individual plugins
export type { LtreeExtensionInfo } from './plugins/detect-ltree';
export { LtreeExtensionDetectionPlugin } from './plugins/detect-ltree';
export { LTREE_SCALAR_NAME, LtreeCodecPlugin, ltreeToSlash, slashToLtree } from './plugins/ltree-codec';

// Connection filter operator factories
export { createFolderOperatorFactory } from './plugins/folder-filter-operators';

// Deprecated — folder field plugin is no longer needed (scalar handles conversion)
export { LtreeFolderFieldPlugin } from './plugins/folder-field';
// Deprecated — use createFolderOperatorFactory instead (better operator names)
export { createLtreeOperatorFactory } from './plugins/connection-filter-operators';
