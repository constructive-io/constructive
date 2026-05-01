export * from './authz';
export * from './blueprint-types.generated';
export * from './data';
export * from './module-presets';
export * from './relation';
export type { JSONSchema,NodeTypeDefinition } from './types';
export * from './view';

import * as authz from './authz';
import * as data from './data';
import * as relation from './relation';
import type { NodeTypeDefinition } from './types';
import * as view from './view';

export const allNodeTypes: NodeTypeDefinition[] = [
  ...Object.values(authz),
  ...Object.values(data),
  ...Object.values(relation),
  ...Object.values(view)
];
